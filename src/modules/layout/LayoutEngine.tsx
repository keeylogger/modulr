import { useCallback, useRef, useState } from 'react';
import { CodePanel } from './CodePanel';
import { CanvasPanel } from './CanvasPanel';

export function LayoutEngine() {
  const [flashProp, setFlashProp] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  const onFlash = useCallback((prop: string) => {
    setFlashProp(null);
    // Reset on the next tick so re-triggering the same prop re-runs the animation.
    requestAnimationFrame(() => setFlashProp(prop));
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setFlashProp(null), 1000);
  }, []);

  return (
    <div className="grid h-full grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(380px,0.85fr)_1.15fr]">
      <section className="panel min-h-0 overflow-hidden">
        <CodePanel flashProp={flashProp} />
      </section>
      <section className="panel min-h-0 overflow-hidden">
        <CanvasPanel onFlash={onFlash} />
      </section>
    </div>
  );
}
