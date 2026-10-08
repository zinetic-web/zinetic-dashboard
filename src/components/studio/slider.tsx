"use client";

/** A range control with a filled track, a value badge and labelled ends. */
export function Slider({
  label,
  hint,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  left,
  right,
  format,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  left?: string;
  right?: string;
  format?: (v: number) => string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        <span className="min-w-12 rounded-md bg-white/[0.07] px-2 py-0.5 text-center text-xs font-medium tabular-nums">{format ? format(value) : Math.round(value * 100) / 100}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="zs-range"
        style={{ backgroundImage: "linear-gradient(90deg, #7c3aed, #3b82f6), linear-gradient(rgb(255 255 255 / 0.1), rgb(255 255 255 / 0.1))", backgroundSize: `${pct}% 100%, 100% 100%`, backgroundRepeat: "no-repeat" }}
      />
      {(left || right) && (
        <div className="flex justify-between text-[0.7rem] text-white/40">
          <span>{left}</span>
          <span>{right}</span>
        </div>
      )}
      {hint && <p className="text-xs text-white/45">{hint}</p>}
    </div>
  );
}
