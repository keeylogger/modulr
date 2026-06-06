import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppState } from '../../state/StateContext';
import { createPointerDrag } from '../../lib/usePointerDrag';
import {
  COMMAND_NAMES,
  appendNode,
  deleteSegment,
  getGuides,
  getHandles,
  lastAnchor,
  parsePath,
  serializePath,
  toggleClose,
  updateHandle,
  type Handle,
  type PenTool,
  type Point,
} from './svgPath';

const VW = 500;
const VH = 400;

const PRESETS: { name: string; d: string }[] = [
  { name: 'Wave', d: 'M 80 220 C 80 120 200 120 200 220 C 200 320 320 320 320 220 L 420 220' },
  { name: 'Heart', d: 'M 250 330 C 120 240 140 120 250 170 C 360 120 380 240 250 330 Z' },
  { name: 'Arc', d: 'M 80 300 Q 250 60 420 300' },
  { name: 'Bolt', d: 'M 260 60 L 180 220 L 250 220 L 200 340 L 330 180 L 260 180 Z' },
];

interface Hud {
  handle: Handle;
  clientX: number;
  clientY: number;
}

export function SvgExplorer() {
  const { state, updateSvg } = useAppState();
  const svg = state.svgState;
  const svgRef = useRef<SVGSVGElement>(null);
  const [hud, setHud] = useState<Hud | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [tool, setTool] = useState<PenTool>('move');
  const [selected, setSelected] = useState<string[]>([]); // handle keys (anchors)

  const segments = useMemo(() => parsePath(svg.path), [svg.path]);
  const handles = useMemo(() => getHandles(segments), [segments]);
  const guides = useMemo(() => getGuides(segments), [segments]);

  // Keep at most two selected anchors (FIFO).
  const toggleSelect = (key: string) =>
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key].slice(-2),
    );

  // Clear selection on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected([]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const anchorPointForKey = (key: string): Point | null => {
    const h = handles.find((hd) => `${hd.segIndex}.${hd.pointIndex}` === key);
    return h ? h.point : null;
  };

  // Project a viewBox point to client coordinates (for the floating Join chip).
  const toClient = (p: Point): { x: number; y: number } | null => {
    const el = svgRef.current;
    const ctm = el?.getScreenCTM();
    if (!el || !ctm) return null;
    const pt = el.createSVGPoint();
    pt.x = p.x;
    pt.y = p.y;
    const s = pt.matrixTransform(ctm);
    return { x: s.x, y: s.y };
  };

  const joinSelected = () => {
    if (selected.length !== 2) return;
    const a = anchorPointForKey(selected[0]);
    const b = anchorPointForKey(selected[1]);
    if (!a || !b) return;
    const segs = parsePath(svg.path);
    const start = segs[0]?.points[0];
    const end = lastAnchor(segs);
    const near = (p1: Point, p2: Point) => Math.hypot(p1.x - p2.x, p1.y - p2.y) < 1;
    const involvesStart = (start && (near(a, start) || near(b, start))) || false;
    const involvesEnd = (end && (near(a, end) || near(b, end))) || false;
    // Closing the loop end→start collapses to a clean Z.
    if (involvesStart && involvesEnd) {
      updateSvg({ path: serializePath(toggleClose(segs)) });
    } else {
      // Otherwise draw a line from the pen tip to the other selected anchor.
      const target = end && near(b, end) ? a : b;
      updateSvg({ path: serializePath([...segs, { cmd: 'L', points: [target] }]) });
    }
    setSelected([]);
  };

  // Map a client point into viewBox coordinates using the live screen CTM.
  // This stays pixel-accurate regardless of aspect ratio / letterboxing, so
  // handles track the cursor exactly.
  const toSvgCoords = (clientX: number, clientY: number, doSnap: boolean): Point => {
    const el = svgRef.current;
    if (!el) return { x: 0, y: 0 };
    const ctm = el.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const pt = el.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const loc = pt.matrixTransform(ctm.inverse());
    let { x, y } = loc;
    if (doSnap) {
      x = Math.round(x / 10) * 10;
      y = Math.round(y / 10) * 10;
    }
    return { x: clamp(x, 0, VW), y: clamp(y, 0, VH) };
  };

  const dragHandle = (h: Handle) =>
    createPointerDrag({
      onStart: () => setActiveKey(`${h.segIndex}.${h.pointIndex}`),
      onMove: ({ x, y }) => {
        // Follow the cursor freely (no snap) for smooth, true-to-pointer motion.
        const p = toSvgCoords(x, y, false);
        const next = updateHandle(parsePath(svg.path), h.segIndex, h.pointIndex, p);
        updateSvg({ path: serializePath(next) });
        setHud({ handle: { ...h, point: p }, clientX: x, clientY: y });
      },
      onEnd: ({ x, y }) => {
        // Settle onto the grid when snapping is enabled.
        if (svg.snap) {
          const p = toSvgCoords(x, y, true);
          updateSvg({ path: serializePath(updateHandle(parsePath(svg.path), h.segIndex, h.pointIndex, p)) });
        }
        setActiveKey(null);
        setHud(null);
      },
    });

  // Click on empty canvas to add a node when a pen tool is active.
  const onCanvasPointerDown = (e: React.PointerEvent) => {
    if (tool === 'move') {
      setSelected([]); // clicking empty space deselects
      return;
    }
    const p = toSvgCoords(e.clientX, e.clientY, svg.snap);
    updateSvg({ path: serializePath(appendNode(parsePath(svg.path), tool, p)) });
  };

  const deleteNode = (segIndex: number) => {
    updateSvg({ path: serializePath(deleteSegment(parsePath(svg.path), segIndex)) });
  };

  return (
    <div className="grid h-full grid-cols-1 gap-4 p-4 lg:grid-cols-[1.25fr_minmax(340px,0.75fr)]">
      {/* Vector view window */}
      <section className="panel relative min-h-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 px-4 py-2.5">
          <div className="flex items-center gap-1 rounded-lg border border-white/5 bg-ink-800 p-0.5">
            {(
              [
                ['move', 'Move'],
                ['line', '+ Line'],
                ['curve', '+ Curve'],
                ['quad', '+ Quad'],
              ] as [PenTool, string][]
            ).map(([t, label]) => (
              <button
                key={t}
                onClick={() => setTool(t)}
                className={`rounded-md px-2.5 py-1 font-mono text-[11px] transition-all duration-200 ease-spring ${
                  tool === t ? 'bg-svg/20 text-svg' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateSvg({ path: serializePath(toggleClose(segments)) })}
              className="rounded-md border border-white/5 bg-ink-700 px-2 py-1 font-mono text-[11px] text-slate-400 transition-all duration-200 hover:text-svg"
              title="Toggle close path (Z)"
            >
              Z
            </button>
            <Toggle label="grid" on={svg.showGrid} onClick={() => updateSvg({ showGrid: !svg.showGrid })} />
            <Toggle label="snap" on={svg.snap} onClick={() => updateSvg({ snap: !svg.snap })} />
            <Toggle label="fill" on={svg.fill} onClick={() => updateSvg({ fill: !svg.fill })} />
          </div>
        </div>

        <div className="relative h-[calc(100%-3.25rem)] p-4">
          {tool !== 'move' && (
            <div className="pointer-events-none absolute left-6 top-6 z-10 rounded-md border border-svg/30 bg-ink-800/90 px-2 py-1 font-mono text-[11px] text-svg backdrop-blur">
              click to add {tool} · right-click a node to delete
            </div>
          )}
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VW} ${VH}`}
            onPointerDown={onCanvasPointerDown}
            className="h-full w-full touch-none select-none rounded-xl bg-ink-900/60"
            style={{
              boxShadow: 'inset 0 0 0 1px rgba(168,85,247,0.12)',
              cursor: tool === 'move' ? 'default' : 'crosshair',
            }}
          >
            {svg.showGrid && <Grid />}

            {/* The path itself */}
            <path
              d={svg.path}
              fill={svg.fill ? 'rgba(168,85,247,0.18)' : 'none'}
              stroke={svg.stroke}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: 'drop-shadow(0 0 8px rgba(168,85,247,0.4))' }}
            />

            {/* Control arms */}
            {guides.map((g, i) => (
              <line
                key={i}
                x1={g.from.x}
                y1={g.from.y}
                x2={g.to.x}
                y2={g.to.y}
                stroke="#2dd4bf"
                strokeWidth={1}
                strokeDasharray="4 4"
                opacity={0.6}
              />
            ))}

            {/* Handles */}
            {handles.map((h) => {
              const key = `${h.segIndex}.${h.pointIndex}`;
              const isControl = h.kind === 'control';
              const active = activeKey === key;
              const selectedThis = selected.includes(key);
              const r = active ? 9 : 7;
              return (
                <g
                  key={key}
                  onPointerDown={(e) => {
                    // Shift-click an anchor to (de)select it for joining.
                    if (e.shiftKey && h.kind === 'anchor') {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleSelect(key);
                      return;
                    }
                    setSelected([]);
                    dragHandle(h)(e);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    deleteNode(h.segIndex);
                  }}
                  style={{ cursor: 'grab' }}
                >
                  {/* hit area */}
                  <circle cx={h.point.x} cy={h.point.y} r={16} fill="transparent" />
                  {isControl ? (
                    <rect
                      x={h.point.x - r}
                      y={h.point.y - r}
                      width={r * 2}
                      height={r * 2}
                      rx={3}
                      fill="#0c0e13"
                      stroke={selectedThis ? '#fde047' : '#2dd4bf'}
                      strokeWidth={selectedThis ? 3.5 : 2.5}
                    />
                  ) : (
                    <circle
                      cx={h.point.x}
                      cy={h.point.y}
                      r={r}
                      fill={h.cmd === 'M' ? '#a855f7' : '#fff'}
                      stroke={selectedThis ? '#fde047' : '#a855f7'}
                      strokeWidth={selectedThis ? 3.5 : 2.5}
                    />
                  )}
                  {selectedThis && (
                    <circle
                      cx={h.point.x}
                      cy={h.point.y}
                      r={r + 6}
                      fill="none"
                      stroke="#fde047"
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* Tracking HUD */}
          {hud && (
            <div
              className="pointer-events-none fixed z-50 -translate-y-full rounded-lg border border-svg/40 bg-ink-800/95 px-2.5 py-1.5 font-mono text-[11px] text-slate-200 shadow-glow backdrop-blur"
              style={{ left: hud.clientX + 14, top: hud.clientY - 10 }}
            >
              <div className="text-svg">
                {COMMAND_NAMES[hud.handle.cmd]} ({hud.handle.cmd})
              </div>
              <div className="text-slate-400">
                {hud.handle.kind === 'control'
                  ? `Control Point ${hud.handle.controlNumber}`
                  : 'Anchor'}
                : X:{hud.handle.point.x.toFixed(1)}, Y:{hud.handle.point.y.toFixed(1)}
              </div>
            </div>
          )}

          {/* Floating Join chip — appears when two anchors are selected */}
          {selected.length === 2 &&
            (() => {
              const p = anchorPointForKey(selected[1]) ?? anchorPointForKey(selected[0]);
              const c = p ? toClient(p) : null;
              if (!c) return null;
              return (
                <button
                  onClick={joinSelected}
                  className="fixed z-50 flex items-center gap-1 rounded-lg border border-yellow-300/50 bg-ink-800/95 px-2.5 py-1.5 text-xs font-semibold text-yellow-200 shadow-glow backdrop-blur transition-transform duration-150 hover:scale-105"
                  style={{ left: c.x + 16, top: c.y - 14 }}
                >
                  ⛓ Join ends
                </button>
              );
            })()}

          {/* Selection hint */}
          {selected.length > 0 && (
            <div className="pointer-events-none absolute bottom-3 left-3 rounded-md border border-yellow-300/30 bg-ink-800/90 px-2 py-1 font-mono text-[11px] text-yellow-200/90 backdrop-blur">
              {selected.length === 1
                ? 'shift-click another anchor to join · esc to clear'
                : 'click “Join ends” to connect · esc to clear'}
            </div>
          )}
        </div>
      </section>

      {/* Compiler / inspector panel */}
      <section className="panel flex min-h-0 flex-col overflow-hidden">
        <div className="border-b border-white/5 px-4 py-2.5 font-mono text-xs text-slate-500">
          path-compiler.svg
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4">
          <div>
            <div className="mb-1.5 flex items-center gap-2 text-[11px] uppercase tracking-wider text-slate-500">
              <span className="text-svg">&lt;path</span> d=
            </div>
            <textarea
              value={svg.path}
              spellCheck={false}
              onChange={(e) => updateSvg({ path: e.target.value })}
              className="h-28 w-full resize-none rounded-xl border border-white/10 bg-ink-900/70 p-3 font-mono text-[12.5px] leading-relaxed text-svg outline-none transition-colors focus:border-svg/50"
            />
          </div>

          <div>
            <div className="mb-2 text-[11px] uppercase tracking-wider text-slate-500">Presets</div>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => updateSvg({ path: p.d })}
                  className="rounded-lg border border-white/5 bg-ink-700 px-3 py-2 text-sm text-slate-300 transition-all duration-200 ease-spring hover:border-svg/40 hover:bg-svg/10 hover:text-white active:scale-95"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-[11px] uppercase tracking-wider text-slate-500">
              Legend
            </div>
            <div className="space-y-2 rounded-xl border border-white/5 bg-ink-900/40 p-3 text-xs text-slate-300">
              <LegendRow swatch={<span className="h-3 w-3 rounded-full" style={{ background: '#a855f7' }} />} label="Move anchor (M)" />
              <LegendRow swatch={<span className="h-3 w-3 rounded-full border-2 border-svg bg-white" />} label="Vertex anchor (L / curve end)" />
              <LegendRow swatch={<span className="h-3 w-3 rounded-sm border-2 border-lighting bg-ink-900" />} label="Control handle (C / Q arms)" />
              <LegendRow swatch={<span className="h-0 w-4 border-t-2 border-dashed border-lighting" />} label="Anchor → control guide" />
            </div>
          </div>

          <div className="rounded-xl border border-white/5 bg-ink-900/40 p-3">
            <div className="mb-1.5 text-[11px] uppercase tracking-wider text-slate-500">Parsed</div>
            <div className="flex flex-wrap gap-1.5">
              {segments.map((s, i) => (
                <span
                  key={i}
                  className="rounded-md bg-svg/10 px-1.5 py-0.5 font-mono text-[11px] text-svg"
                >
                  {s.cmd}
                </span>
              ))}
              {segments.length === 0 && (
                <span className="text-xs text-slate-500">No valid commands parsed.</span>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function Grid() {
  const xs = Array.from({ length: VW / 10 + 1 }, (_, k) => k * 10);
  const ys = Array.from({ length: VH / 10 + 1 }, (_, k) => k * 10);
  return (
    <g>
      {xs.map((x) => (
        <line key={`vx${x}`} x1={x} y1={0} x2={x} y2={VH} stroke="rgba(255,255,255,0.035)" strokeWidth={x % 50 === 0 ? 1 : 0.5} />
      ))}
      {ys.map((y) => (
        <line key={`hy${y}`} x1={0} y1={y} x2={VW} y2={y} stroke="rgba(255,255,255,0.035)" strokeWidth={y % 50 === 0 ? 1 : 0.5} />
      ))}
    </g>
  );
}

function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md border px-2 py-1 font-mono text-[11px] transition-all duration-200 ease-spring ${
        on
          ? 'border-svg/50 bg-svg/15 text-svg'
          : 'border-white/5 bg-ink-700 text-slate-500 hover:text-slate-300'
      }`}
    >
      {label}
    </button>
  );
}

function LegendRow({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid w-4 place-items-center">{swatch}</span>
      <span>{label}</span>
    </div>
  );
}
