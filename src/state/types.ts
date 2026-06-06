export type TabId = 'layout' | 'svg' | 'lighting';

// ---------------------------------------------------------------------------
// Module 1 — Layout Engine
// ---------------------------------------------------------------------------
export type FlexDirection = 'row' | 'row-reverse' | 'column' | 'column-reverse';
export type JustifyContent =
  | 'flex-start'
  | 'flex-end'
  | 'center'
  | 'space-between'
  | 'space-around'
  | 'space-evenly';
export type AlignItems = 'stretch' | 'flex-start' | 'center' | 'flex-end' | 'baseline';
export type FlexWrap = 'nowrap' | 'wrap' | 'wrap-reverse';
export type AlignSelf = 'auto' | 'flex-start' | 'center' | 'flex-end' | 'stretch';
export type DisplayMode = 'flex' | 'grid';

export interface LayoutChild {
  id: string;
  label: string;
  color: string;
  flexGrow: number;
  flexShrink: number;
  flexBasis: number; // px
  alignSelf: AlignSelf;
  order: number;
  width: number; // px (used when basis auto / grid)
  height: number; // px
}

export interface LayoutState {
  display: DisplayMode;
  flexDirection: FlexDirection;
  justifyContent: JustifyContent;
  alignItems: AlignItems;
  flexWrap: FlexWrap;
  gap: number;
  gridColumns: number;
  parentWidth: number; // px
  parentHeight: number; // px
  children: LayoutChild[];
}

// ---------------------------------------------------------------------------
// Module 2 — SVG Path Anatomy
// ---------------------------------------------------------------------------
export interface SvgState {
  path: string;
  showGrid: boolean;
  snap: boolean;
  stroke: string;
  fill: boolean;
}

// ---------------------------------------------------------------------------
// Module 3 — Lighting Studio
// ---------------------------------------------------------------------------
export type LightingMode = 'neumorphism' | 'glassmorphism';

export interface LightingState {
  mode: LightingMode;
  // Orb position normalised to the stage (0..1, origin top-left).
  orbX: number;
  orbY: number;
  // Light source size in px — drives the glow halo and the glass reflection.
  orbRadius: number;
  // Neumorphism
  baseColor: string;
  blur: number;
  spread: number;
  distance: number;
  intensity: number; // 0..1 highlight/shadow contrast
  radius: number;
  // Glassmorphism
  glassBlur: number;
  glassAlpha: number; // 0..1
  glassTint: string;
  borderAlpha: number; // 0..1
}

export interface AppState {
  activeTab: TabId;
  layoutState: LayoutState;
  svgState: SvgState;
  lightingState: LightingState;
}
