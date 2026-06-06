import { useAppState } from '../../state/StateContext';
import type {
  AlignItems,
  AlignSelf,
  DisplayMode,
  FlexDirection,
  FlexWrap,
  JustifyContent,
} from '../../state/types';
import { CodeNumber, CodeSelect } from './CodeControls';

const DISPLAY: readonly DisplayMode[] = ['flex', 'grid'];
const DIRECTIONS: readonly FlexDirection[] = ['row', 'row-reverse', 'column', 'column-reverse'];
const JUSTIFY: readonly JustifyContent[] = [
  'flex-start',
  'center',
  'flex-end',
  'space-between',
  'space-around',
  'space-evenly',
];
const ALIGN: readonly AlignItems[] = ['stretch', 'flex-start', 'center', 'flex-end', 'baseline'];
const WRAP: readonly FlexWrap[] = ['nowrap', 'wrap', 'wrap-reverse'];
const SELF: readonly AlignSelf[] = ['auto', 'flex-start', 'center', 'flex-end', 'stretch'];

interface CodePanelProps {
  flashProp: string | null;
}

function Line({
  children,
  prop,
  flashProp,
}: {
  children: React.ReactNode;
  prop?: string;
  flashProp: string | null;
}) {
  const flashing = prop && prop === flashProp;
  return (
    <div
      className={`-mx-2 rounded px-2 leading-[2] ${flashing ? 'animate-flash-line' : ''}`}
    >
      {children}
    </div>
  );
}

const sel = 'text-sky-300';
const prop = 'text-slate-400';
const punct = 'text-slate-600';

export function CodePanel({ flashProp }: CodePanelProps) {
  const { state, updateLayout } = useAppState();
  const ls = state.layoutState;
  const isFlex = ls.display === 'flex';

  return (
    <div className="flex h-full flex-col">
      {/* Faux IDE title bar */}
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2.5">
        <span className="h-3 w-3 rounded-full bg-red-400/80" />
        <span className="h-3 w-3 rounded-full bg-amber-400/80" />
        <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
        <span className="ml-2 font-mono text-xs text-slate-500">layout.css</span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4 font-mono text-[12.5px] leading-relaxed">
        {/* .parent */}
        <Line flashProp={flashProp}>
          <span className={sel}>.parent</span> <span className={punct}>{'{'}</span>
        </Line>
        <div className="pl-4">
          <Line prop="display" flashProp={flashProp}>
            <span className={prop}>display</span>
            <span className={punct}>: </span>
            <CodeSelect
              value={ls.display}
              options={DISPLAY}
              onChange={(v) => updateLayout({ display: v })}
            />
            <span className={punct}>;</span>
          </Line>

          {isFlex ? (
            <>
              <Line prop="flex-direction" flashProp={flashProp}>
                <span className={prop}>flex-direction</span>
                <span className={punct}>: </span>
                <CodeSelect
                  value={ls.flexDirection}
                  options={DIRECTIONS}
                  onChange={(v) => updateLayout({ flexDirection: v })}
                />
                <span className={punct}>;</span>
              </Line>
              <Line prop="flex-wrap" flashProp={flashProp}>
                <span className={prop}>flex-wrap</span>
                <span className={punct}>: </span>
                <CodeSelect
                  value={ls.flexWrap}
                  options={WRAP}
                  onChange={(v) => updateLayout({ flexWrap: v })}
                />
                <span className={punct}>;</span>
              </Line>
            </>
          ) : (
            <Line prop="grid-template-columns" flashProp={flashProp}>
              <span className={prop}>grid-template-columns</span>
              <span className={punct}>: repeat(</span>
              <CodeNumber
                value={ls.gridColumns}
                min={1}
                max={6}
                onChange={(v) => updateLayout({ gridColumns: v })}
              />
              <span className={punct}>, 1fr);</span>
            </Line>
          )}

          <Line prop="justify-content" flashProp={flashProp}>
            <span className={prop}>justify-content</span>
            <span className={punct}>: </span>
            <CodeSelect
              value={ls.justifyContent}
              options={JUSTIFY}
              onChange={(v) => updateLayout({ justifyContent: v })}
            />
            <span className={punct}>;</span>
          </Line>
          <Line prop="align-items" flashProp={flashProp}>
            <span className={prop}>align-items</span>
            <span className={punct}>: </span>
            <CodeSelect
              value={ls.alignItems}
              options={ALIGN}
              onChange={(v) => updateLayout({ alignItems: v })}
            />
            <span className={punct}>;</span>
          </Line>
          <Line prop="gap" flashProp={flashProp}>
            <span className={prop}>gap</span>
            <span className={punct}>: </span>
            <CodeNumber value={ls.gap} min={0} max={120} onChange={(v) => updateLayout({ gap: v })} suffix="px" />
            <span className={punct}>;</span>
          </Line>
          <Line prop="width" flashProp={flashProp}>
            <span className={prop}>width</span>
            <span className={punct}>: </span>
            <CodeNumber
              value={ls.parentWidth}
              min={160}
              max={900}
              onChange={(v) => updateLayout({ parentWidth: v })}
              suffix="px"
            />
            <span className={punct}>;</span>
          </Line>
          <Line prop="height" flashProp={flashProp}>
            <span className={prop}>height</span>
            <span className={punct}>: </span>
            <CodeNumber
              value={ls.parentHeight}
              min={140}
              max={620}
              onChange={(v) => updateLayout({ parentHeight: v })}
              suffix="px"
            />
            <span className={punct}>;</span>
          </Line>
        </div>
        <Line flashProp={flashProp}>
          <span className={punct}>{'}'}</span>
        </Line>

        {/* children */}
        {ls.children.map((c) => (
          <div key={c.id} className="mt-2">
            <Line flashProp={flashProp}>
              <span className={sel}>.child-{c.label}</span> <span className={punct}>{'{'}</span>
            </Line>
            <div className="pl-4">
              {isFlex && (
                <Line prop={`flex-${c.id}`} flashProp={flashProp}>
                  <span className={prop}>flex</span>
                  <span className={punct}>: </span>
                  <CodeNumber
                    value={c.flexGrow}
                    min={0}
                    max={10}
                    onChange={(v) => patchChild(updateLayout, c.id, { flexGrow: v })}
                  />{' '}
                  <CodeNumber
                    value={c.flexShrink}
                    min={0}
                    max={10}
                    onChange={(v) => patchChild(updateLayout, c.id, { flexShrink: v })}
                  />{' '}
                  <CodeNumber
                    value={c.flexBasis}
                    min={20}
                    max={400}
                    onChange={(v) => patchChild(updateLayout, c.id, { flexBasis: v })}
                    suffix="px"
                  />
                  <span className={punct}>;</span>
                </Line>
              )}
              {!isFlex && (
                <>
                  <Line prop={`w-${c.id}`} flashProp={flashProp}>
                    <span className={prop}>width</span>
                    <span className={punct}>: </span>
                    <CodeNumber
                      value={c.width}
                      min={20}
                      max={400}
                      onChange={(v) => patchChild(updateLayout, c.id, { width: v })}
                      suffix="px"
                    />
                    <span className={punct}>;</span>
                  </Line>
                  <Line prop={`h-${c.id}`} flashProp={flashProp}>
                    <span className={prop}>height</span>
                    <span className={punct}>: </span>
                    <CodeNumber
                      value={c.height}
                      min={20}
                      max={400}
                      onChange={(v) => patchChild(updateLayout, c.id, { height: v })}
                      suffix="px"
                    />
                    <span className={punct}>;</span>
                  </Line>
                </>
              )}
              <Line prop={`self-${c.id}`} flashProp={flashProp}>
                <span className={prop}>align-self</span>
                <span className={punct}>: </span>
                <CodeSelect
                  value={c.alignSelf}
                  options={SELF}
                  onChange={(v) => patchChild(updateLayout, c.id, { alignSelf: v })}
                />
                <span className={punct}>;</span>
              </Line>
            </div>
            <Line flashProp={flashProp}>
              <span className={punct}>{'}'}</span>
            </Line>
          </div>
        ))}
      </div>
    </div>
  );
}

function patchChild(
  updateLayout: ReturnType<typeof useAppState>['updateLayout'],
  id: string,
  patch: Partial<import('../../state/types').LayoutChild>,
) {
  updateLayout((prev) => ({
    ...prev,
    children: prev.children.map((c) => (c.id === id ? { ...c, ...patch } : c)),
  }));
}
