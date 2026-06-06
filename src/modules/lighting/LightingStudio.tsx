import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppState } from '../../state/StateContext';
import { createPointerDrag } from '../../lib/usePointerDrag';
import type { LightingMode } from '../../state/types';
import {
  computeGlassmorphism,
  computeLightVector,
  computeNeumorphism,
  formatCss,
} from './lightingMath';
import { CopyIcon, CheckIcon } from '../../components/icons';

export function LightingStudio() {
  const { state, updateLighting } = useAppState();
  const ls = state.lightingState;
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ w: 800, h: 600 });
  const isGlass = ls.mode === 'glassmorphism';

  const vector = useMemo(
    () => computeLightVector(ls.orbX, ls.orbY, stageSize.w, stageSize.h),
    [ls.orbX, ls.orbY, stageSize],
  );

  const generated = useMemo(
    () => (isGlass ? computeGlassmorphism(ls, vector) : computeNeumorphism(ls, vector)),
    [ls, vector, isGlass],
  );

  const measure = () => {
    const r = stageRef.current?.getBoundingClientRect();
    if (r) setStageSize({ w: r.width, h: r.height });
  };

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setStageSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const dragOrb = createPointerDrag({
    onStart: measure,
    onMove: ({ x, y }) => {
      const r = stageRef.current?.getBoundingClientRect();
      if (!r) return;
      updateLighting({
        orbX: clamp((x - r.left) / r.width, 0, 1),
        orbY: clamp((y - r.top) / r.height, 0, 1),
      });
    },
  });

  // Drag the edge node to grow/shrink the light source (and its reflection).
  const dragOrbRadius = createPointerDrag({
    onStart: measure,
    onMove: ({ x, y }) => {
      const r = stageRef.current?.getBoundingClientRect();
      if (!r) return;
      const cx = r.left + ls.orbX * r.width;
      const cy = r.top + ls.orbY * r.height;
      const dist = Math.hypot(x - cx, y - cy);
      updateLighting({ orbRadius: clamp(Math.round(dist * 2), 50, 360) });
    },
  });

  return (
    <div className="grid h-full grid-cols-1 gap-4 p-4 lg:grid-cols-[1.3fr_minmax(330px,0.7fr)]">
      {/* Spatial light stage */}
      <section className="panel relative min-h-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
          <span className="font-mono text-xs text-slate-500">light-stage</span>
          <div className="flex gap-1 rounded-lg border border-white/5 bg-ink-800 p-0.5">
            {(['neumorphism', 'glassmorphism'] as LightingMode[]).map((m) => (
              <button
                key={m}
                onClick={() => updateLighting({ mode: m })}
                className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-all duration-200 ease-spring ${
                  ls.mode === m ? 'bg-lighting/20 text-lighting' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div
          ref={stageRef}
          className="relative h-[calc(100%-3rem)] overflow-hidden"
          style={{
            background: isGlass ? undefined : ls.baseColor,
            transition: 'background 0.3s ease',
          }}
        >
          {/* Glass backdrop blobs (only relevant for glassmorphism) */}
          {isGlass && (
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-[10%] top-[15%] h-56 w-56 rounded-full bg-fuchsia-500/50 blur-3xl" />
              <div className="absolute right-[12%] top-[20%] h-64 w-64 rounded-full bg-sky-500/50 blur-3xl" />
              <div className="absolute bottom-[10%] left-[30%] h-72 w-72 rounded-full bg-emerald-400/40 blur-3xl" />
              <div className="absolute bottom-[18%] right-[24%] h-52 w-52 rounded-full bg-amber-400/40 blur-3xl" />
            </div>
          )}

          {/* Showcase card (centered) */}
          <div className="absolute inset-0 grid place-items-center p-8">
            <div
              className="relative w-[280px] max-w-full p-6"
              style={{
                ...generated.style,
                transition:
                  'box-shadow 0.12s ease, background 0.12s ease, border-radius 0.2s ease',
              }}
            >
              <DemoCardContent glass={isGlass} />
            </div>
          </div>

          {/* Light source orb — size scales with orbRadius (glass only) */}
          <div
            className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${ls.orbX * 100}%`,
              top: `${ls.orbY * 100}%`,
              width: isGlass ? ls.orbRadius : 120,
              height: isGlass ? ls.orbRadius : 120,
            }}
          >
            {/* Glow halo */}
            <span className="absolute inset-0 rounded-full bg-amber-200/25 blur-2xl animate-pulse-soft" />
            <span className="absolute inset-[18%] rounded-full bg-amber-100/15 blur-xl" />
            {/* Reach ring (shows adjustable radius in glass mode) */}
            {isGlass && <span className="absolute inset-0 rounded-full border border-amber-200/20" />}

            {/* Move handle (centre) */}
            <button
              onPointerDown={dragOrb}
              className="pointer-events-auto absolute left-1/2 top-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 cursor-grab place-items-center rounded-full active:cursor-grabbing"
              title="Drag to move the light source"
            >
              <span className="h-5 w-5 rounded-full bg-gradient-to-br from-white to-amber-200 shadow-[0_0_24px_6px_rgba(255,224,150,0.75)]" />
            </button>

            {/* Resize node (edge) — only meaningful for the glass reflection */}
            {isGlass && (
              <button
                onPointerDown={dragOrbRadius}
                className="pointer-events-auto absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 translate-x-1/2 cursor-ew-resize rounded-full border-2 border-ink-900 bg-amber-200 shadow-md transition-transform duration-150 hover:scale-125"
                title="Drag to resize the light (reflection size)"
              />
            )}
          </div>

          {/* Vector readout */}
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-white/5 bg-ink-900/70 px-2.5 py-1.5 font-mono text-[11px] text-slate-400 backdrop-blur">
            <span className="text-lighting">vector</span> · dX:{vector.dx.toFixed(0)} dY:
            {vector.dy.toFixed(0)} · {vector.angleDeg.toFixed(0)}°
          </div>
        </div>
      </section>

      {/* Controls + code */}
      <section className="panel flex min-h-0 flex-col overflow-hidden">
        <div className="border-b border-white/5 px-4 py-2.5 font-mono text-xs text-slate-500">
          {isGlass ? 'glass.controls' : 'neumorph.controls'}
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4">
          {isGlass ? (
            <>
              <Slider label="backdrop blur" value={ls.glassBlur} min={0} max={40} suffix="px" onChange={(v) => updateLighting({ glassBlur: v })} />
              <Slider label="background alpha" value={ls.glassAlpha} min={0} max={0.6} step={0.01} onChange={(v) => updateLighting({ glassAlpha: v })} />
              <Slider label="border alpha" value={ls.borderAlpha} min={0} max={0.6} step={0.01} onChange={(v) => updateLighting({ borderAlpha: v })} />
              <Slider label="specular intensity" value={ls.intensity} min={0} max={1} step={0.01} onChange={(v) => updateLighting({ intensity: v })} />
              <Slider label="reflection size" value={ls.orbRadius} min={50} max={360} suffix="px" onChange={(v) => updateLighting({ orbRadius: v })} />
              <Slider label="corner radius" value={ls.radius} min={0} max={48} suffix="px" onChange={(v) => updateLighting({ radius: v })} />
              <ColorRow label="glass tint" value={ls.glassTint} onChange={(v) => updateLighting({ glassTint: v })} />
            </>
          ) : (
            <>
              <Slider label="shadow blur" value={ls.blur} min={0} max={80} suffix="px" onChange={(v) => updateLighting({ blur: v })} />
              <Slider label="spread" value={ls.spread} min={-10} max={20} suffix="px" onChange={(v) => updateLighting({ spread: v })} />
              <Slider label="light distance" value={ls.distance} min={2} max={60} suffix="px" onChange={(v) => updateLighting({ distance: v })} />
              <Slider label="contrast" value={ls.intensity} min={0} max={1} step={0.01} onChange={(v) => updateLighting({ intensity: v })} />
              <Slider label="corner radius" value={ls.radius} min={0} max={60} suffix="px" onChange={(v) => updateLighting({ radius: v })} />
              <ColorRow label="base color" value={ls.baseColor} onChange={(v) => updateLighting({ baseColor: v })} />
            </>
          )}

          <CodeBox css={formatCss(generated.css)} />
        </div>
      </section>
    </div>
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function DemoCardContent({ glass }: { glass: boolean }) {
  const textColor = glass ? 'text-white' : 'text-slate-200';
  return (
    <div className={textColor}>
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-lighting to-sky-500 font-bold text-ink-900">
          M
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">Modulr Card</div>
          <div className="text-[11px] opacity-60">spatial lighting demo</div>
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed opacity-75">
        Drag the glowing orb to relight this surface. Readability shifts as the
        rays move around the card.
      </p>
      <div className="mt-4 flex gap-2">
        <button
          className="flex-1 rounded-lg bg-lighting/90 py-1.5 text-xs font-semibold text-ink-900 transition-transform duration-150 hover:scale-[1.03]"
        >
          Action
        </button>
        <button className="flex-1 rounded-lg border border-white/20 py-1.5 text-xs font-medium transition-colors hover:bg-white/10">
          Cancel
        </button>
      </div>
    </div>
  );
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
}

function Slider({ label, value, min, max, step = 1, suffix, onChange }: SliderProps) {
  return (
    <div style={{ ['--accent' as string]: '#2dd4bf' }}>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="font-mono text-lighting">
          {step < 1 ? value.toFixed(2) : value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono text-slate-300">{value}</span>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-9 cursor-pointer rounded-md border border-white/10 bg-transparent p-0.5"
        />
      </div>
    </div>
  );
}

function CodeBox({ css }: { css: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);
  const text = `.card {\n${css}\n}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
    setCopied(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="rounded-xl border border-white/5 bg-ink-900/60">
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
        <span className="font-mono text-[11px] text-slate-500">output.css</span>
        <button
          onClick={copy}
          className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition-all duration-200 ${
            copied ? 'text-emerald-300' : 'text-slate-400 hover:text-white'
          }`}
        >
          {copied ? <CheckIcon width={13} height={13} /> : <CopyIcon width={13} height={13} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-auto p-3 font-mono text-[11.5px] leading-relaxed text-lighting/90">
        <code>{text}</code>
      </pre>
    </div>
  );
}
