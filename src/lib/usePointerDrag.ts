export interface DragState {
  /** Pointer position in client coordinates. */
  x: number;
  y: number;
  /** Delta from the drag start, in client pixels. */
  dx: number;
  dy: number;
  /** Pointer position captured at drag start. */
  startX: number;
  startY: number;
}

export interface PointerDragOptions {
  onStart?: (e: PointerEvent) => void;
  onMove: (state: DragState, e: PointerEvent) => void;
  onEnd?: (state: DragState, e: PointerEvent) => void;
}

/**
 * Builds an `onPointerDown` handler that tracks a drag gesture. Movement is
 * coalesced into a single requestAnimationFrame callback per frame so heavy
 * state updates stay locked to the display refresh (60fps+) without jank.
 *
 * This is a plain factory (not a hook) so it can be created dynamically inside
 * lists / loops without violating the rules of hooks.
 */
export function createPointerDrag({ onStart, onMove, onEnd }: PointerDragOptions) {
  return (downEvent: React.PointerEvent) => {
    downEvent.preventDefault();
    downEvent.stopPropagation();

    const start = { x: downEvent.clientX, y: downEvent.clientY };
    (downEvent.target as Element).setPointerCapture?.(downEvent.pointerId);
    onStart?.(downEvent.nativeEvent);

    let frame: number | null = null;
    let latest: { state: DragState; e: PointerEvent } | null = null;

    const flush = () => {
      frame = null;
      if (latest) onMove(latest.state, latest.e);
    };

    const toState = (e: PointerEvent): DragState => ({
      x: e.clientX,
      y: e.clientY,
      dx: e.clientX - start.x,
      dy: e.clientY - start.y,
      startX: start.x,
      startY: start.y,
    });

    const handleMove = (e: PointerEvent) => {
      latest = { state: toState(e), e };
      if (frame === null) frame = requestAnimationFrame(flush);
    };

    const handleUp = (e: PointerEvent) => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      if (frame !== null) cancelAnimationFrame(frame);
      onEnd?.(toState(e), e);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };
}
