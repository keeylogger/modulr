export type Cmd = 'M' | 'L' | 'C' | 'Q' | 'Z';

export interface Point {
  x: number;
  y: number;
}

export interface Segment {
  cmd: Cmd;
  points: Point[]; // M/L: [end]; C: [cp1, cp2, end]; Q: [cp, end]; Z: []
}

const POINTS_PER_CMD: Record<Cmd, number> = { M: 1, L: 1, C: 3, Q: 2, Z: 0 };

export const COMMAND_NAMES: Record<Cmd, string> = {
  M: 'Move To',
  L: 'Line To',
  C: 'Cubic Bezier',
  Q: 'Quadratic Bezier',
  Z: 'Close Path',
};

/**
 * Parse an SVG path `d` string into structured segments. Supports M, L, C, Q
 * and Z (both absolute and relative variants — relatives are normalized into
 * absolute coordinates so editing stays predictable).
 */
export function parsePath(d: string): Segment[] {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi);
  if (!tokens) return [];

  const segments: Segment[] = [];
  let i = 0;
  let cursor: Point = { x: 0, y: 0 };
  let startPoint: Point = { x: 0, y: 0 };

  const num = () => parseFloat(tokens[i++]);

  while (i < tokens.length) {
    const raw = tokens[i];
    if (!/[a-zA-Z]/.test(raw)) break; // malformed, stop gracefully
    i++;
    const upper = raw.toUpperCase() as Cmd;
    const relative = raw !== raw.toUpperCase();
    if (!(upper in POINTS_PER_CMD)) continue; // skip unsupported commands

    const rel = (p: Point): Point => (relative ? { x: cursor.x + p.x, y: cursor.y + p.y } : p);

    if (upper === 'Z') {
      segments.push({ cmd: 'Z', points: [] });
      cursor = { ...startPoint };
      continue;
    }

    // A command may be followed by multiple coordinate sets.
    do {
      const pts: Point[] = [];
      for (let p = 0; p < POINTS_PER_CMD[upper]; p++) {
        if (i + 1 >= tokens.length) break;
        const x = num();
        const y = num();
        if (Number.isNaN(x) || Number.isNaN(y)) return segments;
        pts.push(rel({ x, y }));
      }
      if (pts.length < POINTS_PER_CMD[upper]) break;
      segments.push({ cmd: upper, points: pts });
      cursor = pts[pts.length - 1];
      if (upper === 'M') startPoint = { ...cursor };
    } while (i < tokens.length && !/[a-zA-Z]/.test(tokens[i]));
  }

  return segments;
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function serializePath(segments: Segment[]): string {
  return segments
    .map((s) => {
      if (s.cmd === 'Z') return 'Z';
      const coords = s.points.map((p) => `${fmt(p.x)} ${fmt(p.y)}`).join(' ');
      return `${s.cmd} ${coords}`;
    })
    .join(' ');
}

export interface Handle {
  segIndex: number;
  pointIndex: number;
  cmd: Cmd;
  kind: 'anchor' | 'control';
  point: Point;
  controlNumber?: number; // 1-based, for HUD readouts
}

/** Flatten segments into individual draggable handles with metadata. */
export function getHandles(segments: Segment[]): Handle[] {
  const handles: Handle[] = [];
  segments.forEach((seg, segIndex) => {
    seg.points.forEach((point, pointIndex) => {
      let kind: Handle['kind'] = 'anchor';
      let controlNumber: number | undefined;
      if (seg.cmd === 'C') {
        if (pointIndex === 0) {
          kind = 'control';
          controlNumber = 1;
        } else if (pointIndex === 1) {
          kind = 'control';
          controlNumber = 2;
        }
      } else if (seg.cmd === 'Q') {
        if (pointIndex === 0) {
          kind = 'control';
          controlNumber = 1;
        }
      }
      handles.push({ segIndex, pointIndex, cmd: seg.cmd, kind, point, controlNumber });
    });
  });
  return handles;
}

/** Return guide lines (anchor → control) for visualizing bezier arms. */
export interface Guide {
  from: Point;
  to: Point;
}

export function getGuides(segments: Segment[]): Guide[] {
  const guides: Guide[] = [];
  let prevAnchor: Point | null = null;
  for (const seg of segments) {
    if (seg.cmd === 'C') {
      const [cp1, cp2, end] = seg.points;
      if (prevAnchor) guides.push({ from: prevAnchor, to: cp1 });
      guides.push({ from: end, to: cp2 });
      prevAnchor = end;
    } else if (seg.cmd === 'Q') {
      const [cp, end] = seg.points;
      if (prevAnchor) guides.push({ from: prevAnchor, to: cp });
      guides.push({ from: end, to: cp });
      prevAnchor = end;
    } else if (seg.cmd === 'M' || seg.cmd === 'L') {
      prevAnchor = seg.points[0];
    }
  }
  return guides;
}

export function updateHandle(
  segments: Segment[],
  segIndex: number,
  pointIndex: number,
  next: Point,
): Segment[] {
  return segments.map((seg, i) =>
    i === segIndex
      ? { ...seg, points: seg.points.map((p, j) => (j === pointIndex ? next : p)) }
      : seg,
  );
}

function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** The last "pen position" — the endpoint the next command would start from. */
export function lastAnchor(segments: Segment[]): Point | null {
  let start: Point | null = null;
  let anchor: Point | null = null;
  for (const s of segments) {
    if (s.cmd === 'M') {
      anchor = s.points[0];
      start = s.points[0];
    } else if (s.cmd === 'L') {
      anchor = s.points[0];
    } else if (s.cmd === 'C') {
      anchor = s.points[2];
    } else if (s.cmd === 'Q') {
      anchor = s.points[1];
    } else if (s.cmd === 'Z') {
      anchor = start;
    }
  }
  return anchor;
}

export type PenTool = 'move' | 'line' | 'curve' | 'quad';

/** Append a new command of the given pen type ending at point `p`. */
export function appendNode(segments: Segment[], tool: PenTool, p: Point): Segment[] {
  if (segments.length === 0) return [{ cmd: 'M', points: [p] }];
  const prev = lastAnchor(segments) ?? p;
  if (tool === 'line') return [...segments, { cmd: 'L', points: [p] }];
  if (tool === 'curve') {
    return [...segments, { cmd: 'C', points: [lerp(prev, p, 1 / 3), lerp(prev, p, 2 / 3), p] }];
  }
  // quadratic — control point biased above the midpoint for a natural arc
  const mid = lerp(prev, p, 0.5);
  return [...segments, { cmd: 'Q', points: [{ x: mid.x, y: mid.y - 40 }, p] }];
}

/** Remove a segment, keeping the path valid (always starts with a Move). */
export function deleteSegment(segments: Segment[], segIndex: number): Segment[] {
  if (segments.length <= 1) return segments;
  const next = segments.filter((_, i) => i !== segIndex);
  const first = next[0];
  if (first && first.cmd !== 'M') {
    const endpoint = first.points[first.points.length - 1] ?? { x: 0, y: 0 };
    next[0] = { cmd: 'M', points: [endpoint] };
  }
  return next;
}

/** Toggle a trailing Z (close path) on/off. */
export function toggleClose(segments: Segment[]): Segment[] {
  if (segments.length === 0) return segments;
  if (segments[segments.length - 1].cmd === 'Z') return segments.slice(0, -1);
  return [...segments, { cmd: 'Z', points: [] }];
}
