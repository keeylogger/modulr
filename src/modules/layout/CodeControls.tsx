import { useEffect, useRef, useState } from 'react';

interface CodeSelectProps<T extends string> {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}

/** A select rendered to look like a highlighted code value token. */
export function CodeSelect<T extends string>({ value, options, onChange }: CodeSelectProps<T>) {
  return (
    <span className="relative inline-flex items-center">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="cursor-pointer appearance-none rounded-md border border-layout/30 bg-layout/10 px-1.5 pr-4 py-0.5 font-mono text-[12.5px] text-layout outline-none transition-all duration-150 hover:border-layout/60 hover:bg-layout/20 focus:border-layout"
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-ink-700 text-white">
            {o}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-1 text-[8px] text-layout/70">▼</span>
    </span>
  );
}

interface CodeNumberProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}

/** A draggable numeric token: scrub horizontally or type to edit. */
export function CodeNumber({ value, onChange, min = -999, max = 9999, step = 1, suffix }: CodeNumberProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const dragging = useRef(false);
  const startX = useRef(0);
  const startVal = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);

  const clamp = (v: number) => Math.min(max, Math.max(min, v));

  const onPointerDown = (e: React.PointerEvent) => {
    if (editing) return;
    dragging.current = true;
    startX.current = e.clientX;
    startVal.current = value;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const delta = Math.round((e.clientX - startX.current) / 3) * step;
    if (delta !== 0) onChange(clamp(startVal.current + delta));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    // A click with no movement enters edit mode.
    if (Math.abs(e.clientX - startX.current) < 3) {
      setEditing(true);
      setTimeout(() => inputRef.current?.select(), 0);
    }
  };

  const commit = () => {
    const n = parseFloat(draft);
    if (!Number.isNaN(n)) onChange(clamp(n));
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') setEditing(false);
        }}
        className="w-12 rounded-md border border-amber-400/60 bg-amber-400/10 px-1 py-0.5 text-center font-mono text-[12.5px] text-amber-300 outline-none"
      />
    );
  }

  return (
    <span
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      title="Drag to scrub · click to type"
      className="cursor-ew-resize select-none rounded-md border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 font-mono text-[12.5px] text-amber-300 transition-colors duration-150 hover:border-amber-400/60 hover:bg-amber-400/20"
    >
      {value}
      {suffix}
    </span>
  );
}
