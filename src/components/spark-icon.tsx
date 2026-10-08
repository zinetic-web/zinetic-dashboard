import type { IconBaseProps } from "react-icons";

/** A solid four-point star with curved sides, like Gemini's. Used wherever AI is meant. */
export function SparkIcon({ className, size, style, ...rest }: IconBaseProps) {
  const dim = size ?? "1em";
  return (
    <svg viewBox="0 0 24 24" width={dim} height={dim} fill="currentColor" aria-hidden className={className} style={style} {...(rest as React.SVGProps<SVGSVGElement>)}>
      <path d="M12 1.5C12.75 7.9 16.1 11.25 22.5 12C16.1 12.75 12.75 16.1 12 22.5C11.25 16.1 7.9 12.75 1.5 12C7.9 11.25 11.25 7.9 12 1.5Z" />
    </svg>
  );
}
