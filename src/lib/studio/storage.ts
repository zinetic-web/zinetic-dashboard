import { promises as fs } from "fs";
import path from "path";
import { DeleteObjectCommand, DeleteObjectsCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Customer media (generated audio and video, avatar photos). With the R2_* settings present it lives
// in a private Cloudflare R2 bucket, which is what production uses. Without them it falls back to
// the local disk, which only works in development: the serverless filesystem on Vercel is read-only
// and ephemeral. Every caller goes through the functions below.

const R2 = {
  endpoint: process.env.R2_ENDPOINT ?? (process.env.R2_ACCOUNT_ID ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : ""),
  accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  bucket: process.env.R2_BUCKET ?? "",
};

/** True when media is kept in R2. */
export const usesR2 = Boolean(R2.endpoint && R2.accessKeyId && R2.secretAccessKey && R2.bucket);

let client: S3Client | null = null;
const s3 = () =>
  (client ??= new S3Client({
    region: "auto",
    endpoint: R2.endpoint,
    // R2 does not take the newer automatic checksums, and they would break browser uploads
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    credentials: { accessKeyId: R2.accessKeyId, secretAccessKey: R2.secretAccessKey },
  }));

const ROOT = path.resolve(process.env.STUDIO_STORAGE_DIR ?? ".studio-storage");

function resolveKey(key: string) {
  const full = path.resolve(ROOT, key);
  if (!full.startsWith(ROOT + path.sep)) throw new Error("Invalid storage key");
  return full;
}

/** Keys are "<userId>/<file>", never absolute and never climbing out of the folder. */
function safeKey(key: string) {
  if (!key || key.startsWith("/") || key.split("/").includes("..")) throw new Error("Invalid storage key");
  return key;
}

export async function saveFile(key: string, data: Buffer, contentType?: string) {
  if (usesR2) {
    await s3().send(new PutObjectCommand({ Bucket: R2.bucket, Key: safeKey(key), Body: data, ContentType: contentType }));
    return key;
  }
  const full = resolveKey(key);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, data);
  return key;
}

export async function readFile(key: string) {
  if (usesR2) {
    const res = await s3().send(new GetObjectCommand({ Bucket: R2.bucket, Key: safeKey(key) }));
    return Buffer.from(await res.Body!.transformToByteArray());
  }
  return fs.readFile(resolveKey(key));
}

/**
 * A short-lived private link a browser can play or download straight from R2, so large videos never
 * pass through a serverless function. Only for R2; returns null when media is on local disk.
 */
export async function signedUrl(key: string, opts: { contentType?: string; seconds?: number } = {}) {
  if (!usesR2) return null;
  return getSignedUrl(s3(), new GetObjectCommand({ Bucket: R2.bucket, Key: safeKey(key), ResponseContentType: opts.contentType }), {
    expiresIn: opts.seconds ?? 600,
  });
}

/**
 * A short-lived private link a browser can upload one file to, straight into the bucket.
 * The size and type are part of the signature, so the browser cannot send anything else.
 */
export async function signedUploadUrl(key: string, opts: { contentType: string; size: number; seconds?: number }) {
  if (!usesR2) return null;
  return getSignedUrl(s3(), new PutObjectCommand({ Bucket: R2.bucket, Key: safeKey(key), ContentType: opts.contentType, ContentLength: opts.size }), {
    expiresIn: opts.seconds ?? 900,
  });
}

export async function deleteFile(key: string) {
  if (usesR2) {
    await s3().send(new DeleteObjectCommand({ Bucket: R2.bucket, Key: safeKey(key) }));
    return;
  }
  await fs.rm(resolveKey(key), { force: true });
}

/** Removes every file a customer made (their whole folder). Used when an account is deleted. */
export async function deleteUserFiles(userId: string) {
  try {
    if (usesR2) {
      const prefix = `${safeKey(userId)}/`;
      let token: string | undefined;
      do {
        const page = await s3().send(new ListObjectsV2Command({ Bucket: R2.bucket, Prefix: prefix, ContinuationToken: token }));
        const keys = (page.Contents ?? []).flatMap((o) => (o.Key ? [{ Key: o.Key }] : []));
        if (keys.length) await s3().send(new DeleteObjectsCommand({ Bucket: R2.bucket, Delete: { Objects: keys, Quiet: true } }));
        token = page.IsTruncated ? page.NextContinuationToken : undefined;
      } while (token);
      return;
    }
    await fs.rm(resolveKey(userId), { recursive: true, force: true });
  } catch {}
}
