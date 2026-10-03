"use client";

import * as React from "react";
import Link from "next/link";
import { signIn } from "@/app/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LuArrowRight, LuLoaderCircle, LuLock, LuMail, LuTriangleAlert } from "react-icons/lu";
import { SocialAuthRow } from "@/components/social-auth-row";
import { PasswordInput } from "@/components/password-input";
import { useAuthBrand } from "@/components/auth-brand";

const fieldClass = "h-12 rounded-xl border-border/80 bg-muted/40 pl-11 text-base transition-colors focus-visible:bg-background";

export default function LoginPage() {
  const brand = useAuthBrand();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const formData = new FormData(e.currentTarget);
    try {
      const result = await signIn(formData);
      if (result?.error) {
        setError(result.error);
        setPending(false);
      }
    } catch (err) {
      // NEXT_REDIRECT throws by design on success, let it propagate
      if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
      setError("Something went wrong. Please try again.");
      setPending(false);
    }
  }

  return (
    <div className="w-full">
      <div className="mb-9">
        <h1 className="font-heading text-4xl leading-tight font-bold tracking-tight sm:text-[2.6rem]">Welcome back</h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">{brand.signIn}</p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        {error && (
          <Alert variant="destructive">
            <LuTriangleAlert className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="email" className="text-sm font-medium">
            Email
          </Label>
          <div className="relative">
            <LuMail className="pointer-events-none absolute top-1/2 left-3.5 size-[1.15rem] -translate-y-1/2 text-muted-foreground" />
            <Input id="email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" className={fieldClass} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <Link href="/forgot-password" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <LuLock className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-[1.15rem] -translate-y-1/2 text-muted-foreground" />
            <PasswordInput id="password" name="password" required autoComplete="current-password" placeholder="Your password" className={fieldClass} />
          </div>
        </div>

        <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm text-muted-foreground select-none">
          <Checkbox name="rememberMe" defaultChecked />
          Keep me signed in
        </label>

        <button
          type="submit"
          disabled={pending}
          className="group mt-1 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7c3aed] via-[#c026d3] to-[#ec4899] text-base font-semibold text-white shadow-lg shadow-fuchsia-500/20 transition-all hover:shadow-xl hover:shadow-fuchsia-500/30 hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? <LuLoaderCircle className="size-5 animate-spin" /> : null}
          {pending ? "Signing in" : "Sign in"}
          {!pending && <LuArrowRight className="size-5 transition-transform group-hover:translate-x-0.5" />}
        </button>
      </form>

      <div className="mt-7">
        <SocialAuthRow />
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/register" className="font-semibold text-foreground underline decoration-[#ec4899] decoration-2 underline-offset-4">
          Create an account
        </Link>
      </p>
    </div>
  );
}
