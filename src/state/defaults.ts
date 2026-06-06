import type { AppState, LayoutChild } from './types';

export const CHILD_PALETTE = ['#3b82f6', '#a855f7', '#2dd4bf', '#f59e0b', '#ef4444', '#22c55e'];

function makeChild(index: number): LayoutChild {
  return {
    id: `c${index + 1}`,
    label: String(index + 1),
    color: CHILD_PALETTE[index % CHILD_PALETTE.length],
    flexGrow: 0,
    flexShrink: 1,
    flexBasis: 96,
    alignSelf: 'auto',
    order: 0,
    width: 96,
    height: 96,
  };
}

export const DEFAULT_CHILDREN: LayoutChild[] = [0, 1, 2].map(makeChild);

export const defaultState: AppState = {
  activeTab: 'layout',
  layoutState: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'nowrap',
    gap: 16,
    gridColumns: 3,
    parentWidth: 560,
    parentHeight: 360,
    children: DEFAULT_CHILDREN,
  },
  svgState: {
    path: 'M 80 220 C 80 120 200 120 200 220 C 200 320 320 320 320 220 L 420 220',
    showGrid: true,
    snap: true,
    stroke: '#a855f7',
    fill: false,
  },
  lightingState: {
    mode: 'neumorphism',
    orbX: 0.26,
    orbY: 0.2,
    orbRadius: 140,
    baseColor: '#1c2030',
    blur: 34,
    spread: 2,
    distance: 22,
    intensity: 0.65,
    radius: 28,
    glassBlur: 16,
    glassAlpha: 0.1,
    glassTint: '#9bb4ff',
    borderAlpha: 0.22,
  },
};

export { makeChild };
