import type { LightingState } from '../../state/types';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

function rgbStr({ r, g, b }: RGB, alpha = 1): string {
  return alpha >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const BLACK: RGB = { r: 0, g: 0, b: 0 };
const WHITE: RGB = { r: 255, g: 255, b: 255 };

export interface LightVector {
  /** Unit vector from card center toward the light orb. */
  ux: number;
  uy: number;
  /** Raw delta in px (for HUD readouts). */
  dx: number;
  dy: number;
  angleDeg: number;
  distancePx: number;
}

export function computeLightVector(
  orbX: number,
  orbY: number,
  stageW: number,
  stageH: number,
): LightVector {
  const orbPxX = orbX * stageW;
  const orbPxY = orbY * stageH;
  const cx = stageW / 2;
  const cy = stageH / 2;
  const dx = orbPxX - cx;
  const dy = orbPxY - cy;
  const len = Math.hypot(dx, dy) || 1;
  return {
    ux: dx / len,
    uy: dy / len,
    dx,
    dy,
    angleDeg: (Math.atan2(dy, dx) * 180) / Math.PI,
    distancePx: len,
  };
}

export interface GeneratedStyle {
  style: React.CSSProperties;
  /** Pretty-printed CSS for the code panel. */
  css: Record<string, string>;
}

export function computeNeumorphism(s: LightingState, v: LightVector): GeneratedStyle {
  const base = hexToRgb(s.baseColor);
  const dark = mix(base, BLACK, 0.4 + s.intensity * 0.4);
  const light = mix(base, WHITE, 0.3 + s.intensity * 0.5);

  // Shadow opposes the light; highlight follows it.
  const darkX = +(-v.ux * s.distance).toFixed(1);
  const darkY = +(-v.uy * s.distance).toFixed(1);
  const lightX = +(v.ux * s.distance).toFixed(1);
  const lightY = +(v.uy * s.distance).toFixed(1);

  const boxShadow =
    `${darkX}px ${darkY}px ${s.blur}px ${s.spread}px ${rgbStr(dark)}, ` +
    `${lightX}px ${lightY}px ${s.blur}px ${s.spread}px ${rgbStr(light)}`;

  const css = {
    background: rgbStr(base),
    'border-radius': `${s.radius}px`,
    'box-shadow': boxShadow,
  };

  return {
    style: {
      background: css.background,
      borderRadius: css['border-radius'],
      boxShadow,
    },
    css,
  };
}

export function computeGlassmorphism(s: LightingState, v: LightVector): GeneratedStyle {
  const tint = hexToRgb(s.glassTint);
  // Specular highlight tracks the incoming ray angle.
  const highlightAngle = (v.angleDeg + 180).toFixed(0);
  const spotX = (50 + v.ux * 40).toFixed(0);
  const spotY = (50 + v.uy * 40).toFixed(0);

  // Reflection size is driven by the light source radius — a bigger orb casts
  // a broader specular highlight across the glass surface.
  const refl = Math.round(s.orbRadius * 0.9);
  const background =
    `radial-gradient(${refl}px ${refl}px at ${spotX}% ${spotY}%, rgba(255,255,255,${(0.35 + s.intensity * 0.25).toFixed(2)}), transparent 65%), ` +
    `linear-gradient(${highlightAngle}deg, ${rgbStr(tint, s.glassAlpha + 0.06)}, ${rgbStr(tint, Math.max(0, s.glassAlpha - 0.04))})`;

  const backdropFilter = `blur(${s.glassBlur}px) saturate(160%)`;
  const border = `1px solid rgba(255,255,255,${s.borderAlpha.toFixed(2)})`;

  const css = {
    background,
    'backdrop-filter': backdropFilter,
    'border-radius': `${s.radius}px`,
    border,
    'box-shadow': '0 12px 40px -12px rgba(0,0,0,0.5)',
  };

  return {
    style: {
      background,
      backdropFilter,
      WebkitBackdropFilter: backdropFilter,
      borderRadius: `${s.radius}px`,
      border,
      boxShadow: css['box-shadow'],
    },
    css,
  };
}

export function formatCss(css: Record<string, string>): string {
  return Object.entries(css)
    .map(([k, val]) => `  ${k}: ${val};`)
    .join('\n');
}
