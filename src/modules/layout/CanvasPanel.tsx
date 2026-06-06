import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { useAppState } from '../../state/StateContext';
import { makeChild } from '../../state/defaults';
import type { AlignItems, JustifyContent, LayoutChild } from '../../state/types';
import { createPointerDrag } from '../../lib/usePointerDrag';
import { GripIcon, PlusIcon, MinusIcon } from '../../components/icons';

interface CanvasPanelProps {
  onFlash: (prop: string) => void;
}

export function CanvasPanel({ onFlash }: CanvasPanelProps) {
  const { state, updateLayout } = useAppState();
  const ls = state.layoutState;
  const isFlex = ls.display === 'flex';
  const isRow = ls.flexDirection.startsWith('row');

  const childRefs = useRef<Map<string, HTMLElement>>(new Map());
  const parentRef = useRef<HTMLDivElement>(null);
  const prevRects = useRef<Map<string, DOMRect>>(new Map());
  const childrenRef = useRef(ls.children);
  childrenRef.current = ls.children;
  const [drag, setDrag] = useState<DragInfo | null>(null);
  const dragId = drag?.id ?? null;

  // FLIP: when the child order changes mid-drag, slide every (non-dragged) box
  // smoothly from its previous position to its new one so the layout feels like
  // pieces sliding around the lifted piece rather than snapping.
  const orderSig = ls.children.map((c) => c.id).join(',');
  useLayoutEffect(() => {
    if (!dragId) return;
    childRefs.current.forEach((el, id) => {
      if (id === dragId) return;
      const oldR = prevRects.current.get(id);
      if (!oldR) return;
      const newR = el.getBoundingClientRect();
      const dx = oldR.left - newR.left;
      const dy = oldR.top - newR.top;
      if (dx || dy) {
        el.style.transition = 'none';
        el.style.transform = `translate(${dx}px, ${dy}px)`;
        void el.offsetWidth; // force reflow so the inverse transform applies
        requestAnimationFrame(() => {
          el.style.transition = 'transform 0.26s cubic-bezier(0.16,1,0.3,1)';
          el.style.transform = '';
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderSig, dragId]);

  const captureRects = () => {
    const m = new Map<string, DOMRect>();
    childRefs.current.forEach((el, id) => m.set(id, el.getBoundingClientRect()));
    prevRects.current = m;
  };

  // --- Parent resize handles -------------------------------------------------
  const startSize = useRef({ w: 0, h: 0 });
  const parentResize = (axis: 'w' | 'h' | 'both') =>
    createPointerDrag({
      onStart: () => {
        startSize.current = { w: ls.parentWidth, h: ls.parentHeight };
      },
      onMove: ({ dx, dy }) => {
        const patch: Partial<typeof ls> = {};
        if (axis !== 'h') patch.parentWidth = clamp(startSize.current.w + dx * 2, 160, 900);
        if (axis !== 'w') patch.parentHeight = clamp(startSize.current.h + dy, 140, 620);
        updateLayout(patch);
      },
    });

  // --- Child resize ----------------------------------------------------------
  const childStart = useRef({ w: 0, h: 0, basis: 0 });
  const makeChildResize = (child: LayoutChild) =>
    createPointerDrag({
      onStart: () => {
        childStart.current = { w: child.width, h: child.height, basis: child.flexBasis };
      },
      onMove: ({ dx, dy }) => {
        updateLayout((prev) => ({
          ...prev,
          children: prev.children.map((c) =>
            c.id === child.id
              ? {
                  ...c,
                  width: clamp(childStart.current.w + dx, 20, 400),
                  height: clamp(childStart.current.h + dy, 20, 400),
                  flexBasis: clamp(
                    childStart.current.basis + (isRow ? dx : dy),
                    20,
                    400,
                  ),
                }
              : c,
          ),
        }));
      },
    });

  // --- Child reorder (lifted piece + live sliding neighbours) ---------------
  // The dragged box lifts out as a floating ghost; its in-flow slot becomes an
  // empty socket. As the cursor moves, the array reorders live so the other
  // boxes slide (via FLIP above) to make room around the cursor position.
  const rowBased = !isFlex || isRow; // grid + flex-row read left→right per row

  const reorderTo = (id: string, px: number, py: number) => {
    const current = childrenRef.current;
    const dragged = current.find((c) => c.id === id);
    if (!dragged) return;
    const others = current
      .filter((c) => c.id !== id)
      .map((c) => ({ id: c.id, rect: childRefs.current.get(c.id)?.getBoundingClientRect() }))
      .filter((o): o is { id: string; rect: DOMRect } => !!o.rect);

    let idx = 0;
    for (const o of others) {
      if (isBeforeCursor(o.rect, px, py, rowBased)) idx++;
    }
    idx = clamp(idx, 0, others.length);

    const rest = current.filter((c) => c.id !== id);
    const newOrder = [...rest.slice(0, idx), dragged, ...rest.slice(idx)];
    const newSig = newOrder.map((c) => c.id).join(',');
    if (newSig === current.map((c) => c.id).join(',')) return;

    captureRects(); // snapshot positions BEFORE the reorder for FLIP
    updateLayout((s) => {
      const map = new Map(s.children.map((c) => [c.id, c] as const));
      const reordered = newOrder.map((c) => map.get(c.id)).filter((c): c is LayoutChild => !!c);
      return { ...s, children: reordered };
    });
  };

  const reorderHandle = (child: LayoutChild) =>
    createPointerDrag({
      onStart: (e) => {
        const el = childRefs.current.get(child.id);
        const rect = el?.getBoundingClientRect();
        if (!rect) return;
        captureRects(); // fresh baseline so the first frame doesn't spuriously slide
        setDrag({
          id: child.id,
          w: rect.width,
          h: rect.height,
          color: child.color,
          label: child.label,
          ox: e.clientX - rect.left,
          oy: e.clientY - rect.top,
          ghostX: e.clientX,
          ghostY: e.clientY,
        });
      },
      onMove: ({ x, y }) => {
        setDrag((prev) => (prev ? { ...prev, ghostX: x, ghostY: y } : prev));
        reorderTo(child.id, x, y);
      },
      onEnd: () => {
        // Clear any lingering FLIP inline styles so CSS classes take over again.
        childRefs.current.forEach((el) => {
          el.style.transition = '';
          el.style.transform = '';
        });
        setDrag(null);
      },
    });

  const addChild = () => {
    if (ls.children.length >= 6) return;
    updateLayout((prev) => ({ ...prev, children: [...prev.children, makeChild(prev.children.length)] }));
  };
  const removeChild = () => {
    if (ls.children.length <= 1) return;
    updateLayout((prev) => ({ ...prev, children: prev.children.slice(0, -1) }));
  };

  const setAlign = (value: AlignItems) => {
    updateLayout({ alignItems: value });
    onFlash('align-items');
  };

  const parentStyle: CSSProperties = {
    width: ls.parentWidth,
    height: ls.parentHeight,
    display: ls.display,
    gap: ls.gap,
    ...(isFlex
      ? {
          flexDirection: ls.flexDirection,
          justifyContent: ls.justifyContent,
          alignItems: ls.alignItems,
          flexWrap: ls.flexWrap,
        }
      : {
          gridTemplateColumns: `repeat(${ls.gridColumns}, 1fr)`,
          alignItems: ls.alignItems,
          justifyItems: 'stretch',
        }),
  };

  return (
    <div className="relative flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
        <span className="font-mono text-xs text-slate-500">canvas · {ls.children.length} boxes</span>
        <div className="flex items-center gap-1.5">
          <button className="btn-ghost !px-2 !py-1.5" onClick={removeChild} title="Remove box">
            <MinusIcon width={15} height={15} />
          </button>
          <button className="btn-ghost !px-2 !py-1.5" onClick={addChild} title="Add box">
            <PlusIcon width={15} height={15} />
          </button>
        </div>
      </div>

      {/* Stage */}
      <div className="relative min-h-0 flex-1 overflow-auto p-10">
        <div className="grid min-h-full place-items-center">
          <div className="relative">
            {/* Justify-content activator — top edge */}
            <div className="absolute -top-11 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-white/5 bg-ink-800/80 p-1 backdrop-blur">
              <span className="px-1 font-mono text-[10px] text-slate-500">justify</span>
              {(['flex-start', 'center', 'flex-end', 'space-between'] as JustifyContent[]).map((j) => (
                <AlignChip
                  key={j}
                  active={ls.justifyContent === j}
                  onClick={() => {
                    updateLayout({ justifyContent: j });
                    onFlash('justify-content');
                  }}
                  title={`justify-content: ${j}`}
                >
                  {JUSTIFY_GLYPH[j]}
                </AlignChip>
              ))}
            </div>

            {/* Align-items activator — left edge */}
            <div className="absolute -left-11 top-1/2 flex -translate-y-1/2 flex-col items-center gap-1 rounded-xl border border-white/5 bg-ink-800/80 p-1 backdrop-blur">
              <span className="font-mono text-[10px] text-slate-500">align</span>
              {(['flex-start', 'center', 'flex-end', 'stretch'] as AlignItems[]).map((a) => (
                <AlignChip
                  key={a}
                  active={ls.alignItems === a}
                  onClick={() => setAlign(a)}
                  title={`align-items: ${a}`}
                >
                  {ALIGN_GLYPH[a]}
                </AlignChip>
              ))}
            </div>

            {/* Parent container */}
            <div
              ref={parentRef}
              className="group/parent relative rounded-2xl border border-dashed border-layout/40 bg-layout/[0.06]"
              style={parentStyle}
            >

              {ls.children.map((c) => {
                const dragging = dragId === c.id;
                const childStyle: CSSProperties = isFlex
                  ? {
                      flexGrow: c.flexGrow,
                      flexShrink: c.flexShrink,
                      flexBasis: c.flexBasis,
                      alignSelf: c.alignSelf,
                      width: isRow ? undefined : c.width,
                      height: isRow ? c.height : undefined,
                      minWidth: 24,
                      minHeight: 24,
                    }
                  : {
                      alignSelf: c.alignSelf,
                      height: c.height,
                      minWidth: 24,
                    };
                return (
                  <div
                    key={c.id}
                    ref={(el) => {
                      if (el) childRefs.current.set(c.id, el);
                      else childRefs.current.delete(c.id);
                    }}
                    className="group/box relative grid place-items-center rounded-xl text-lg font-bold text-ink-900 shadow-lg transition-[box-shadow,opacity] duration-200 ease-spring"
                    style={{
                      ...childStyle,
                      background: dragging ? `${c.color}1f` : c.color,
                      color: dragging ? 'transparent' : undefined,
                      outline: dragging ? `2px dashed ${c.color}80` : undefined,
                      outlineOffset: dragging ? '-3px' : undefined,
                      zIndex: 1,
                      boxShadow: dragging ? 'none' : '0 6px 18px -8px rgba(0,0,0,0.6)',
                    }}
                  >
                    {c.label}

                    {/* Reorder grip */}
                    <button
                      onPointerDown={reorderHandle(c)}
                      className="absolute left-1 top-1 cursor-grab rounded-md bg-black/15 p-0.5 text-ink-900/70 opacity-0 transition-opacity duration-150 hover:bg-black/25 active:cursor-grabbing group-hover/box:opacity-100"
                      title="Drag to reorder"
                    >
                      <GripIcon width={14} height={14} />
                    </button>

                    {/* Resize corner */}
                    <span
                      onPointerDown={makeChildResize(c)}
                      className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize opacity-0 transition-opacity duration-150 group-hover/box:opacity-100"
                      title="Drag to resize"
                    >
                      <span className="absolute bottom-1 right-1 h-2 w-2 rounded-sm border-b-2 border-r-2 border-ink-900/70" />
                    </span>
                  </div>
                );
              })}

              {/* Parent resize handles */}
              <Handle onPointerDown={parentResize('w')} className="right-[-5px] top-1/2 h-10 w-2.5 -translate-y-1/2 cursor-ew-resize" />
              <Handle onPointerDown={parentResize('h')} className="bottom-[-5px] left-1/2 h-2.5 w-10 -translate-x-1/2 cursor-ns-resize" />
              <Handle onPointerDown={parentResize('both')} className="bottom-[-6px] right-[-6px] h-3.5 w-3.5 cursor-nwse-resize rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Detached floating ghost (follows the cursor) */}
      {drag && (
        <div
          className="pointer-events-none fixed z-50 grid place-items-center rounded-xl text-lg font-bold text-ink-900"
          style={{
            left: drag.ghostX - drag.ox,
            top: drag.ghostY - drag.oy,
            width: drag.w,
            height: drag.h,
            background: drag.color,
            transform: 'scale(1.05) rotate(-1.5deg)',
            boxShadow: `0 26px 60px -14px ${drag.color}, 0 0 0 1px rgba(255,255,255,0.1)`,
          }}
        >
          {drag.label}
        </div>
      )}
    </div>
  );
}

interface DragInfo {
  id: string;
  w: number;
  h: number;
  color: string;
  label: string;
  ox: number;
  oy: number;
  ghostX: number;
  ghostY: number;
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

/**
 * Reading-order test: is a box positioned "before" the cursor? For row/grid we
 * compare by row band then x; for columns we compare by column band then y.
 */
function isBeforeCursor(rect: DOMRect, px: number, py: number, rowBased: boolean): boolean {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  if (rowBased) {
    if (cy < py - rect.height / 2) return true; // earlier row
    if (cy > py + rect.height / 2) return false; // later row
    return cx < px; // same row → compare x
  }
  if (cx < px - rect.width / 2) return true; // earlier column
  if (cx > px + rect.width / 2) return false; // later column
  return cy < py; // same column → compare y
}

function Handle({
  onPointerDown,
  className,
}: {
  onPointerDown: (e: React.PointerEvent) => void;
  className: string;
}) {
  return (
    <span
      onPointerDown={onPointerDown}
      className={`absolute z-20 rounded-full bg-layout/70 opacity-0 ring-2 ring-ink-900 transition-opacity duration-150 hover:bg-layout group-hover/parent:opacity-100 ${className}`}
    />
  );
}

const JUSTIFY_GLYPH: Record<JustifyContent, string> = {
  'flex-start': '⫷',
  center: '⟺',
  'flex-end': '⫸',
  'space-between': '⇹',
  'space-around': '⇶',
  'space-evenly': '⇵',
};

const ALIGN_GLYPH: Record<AlignItems, string> = {
  'flex-start': '⤒',
  center: '⊜',
  'flex-end': '⤓',
  stretch: '↕',
  baseline: '_',
};

function AlignChip({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`grid h-6 w-6 place-items-center rounded-lg text-sm transition-all duration-200 ease-spring ${
        active
          ? 'bg-layout/20 text-layout ring-1 ring-layout/50'
          : 'text-slate-500 hover:bg-white/5 hover:text-layout'
      }`}
    >
      {children}
    </button>
  );
}
