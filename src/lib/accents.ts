import type { TabId } from '../state/types';

export interface AccentConfig {
  id: TabId;
  name: string;
  tagline: string;
  color: string;
  soft: string; // rgba string for subtle fills
  border: string;
}

export const ACCENTS: Record<TabId, AccentConfig> = {
  layout: {
    id: 'layout',
    name: 'Layout Engine',
    tagline: 'Two-way flexbox & box modeling',
    color: '#3b82f6',
    soft: 'rgba(59,130,246,0.14)',
    border: 'rgba(59,130,246,0.45)',
  },
  svg: {
    id: 'svg',
    name: 'SVG Anatomy',
    tagline: 'Drag the math behind vector paths',
    color: '#a855f7',
    soft: 'rgba(168,85,247,0.14)',
    border: 'rgba(168,85,247,0.45)',
  },
  lighting: {
    id: 'lighting',
    name: 'Lighting Studio',
    tagline: 'Spatial glass & neumorphic shadows',
    color: '#2dd4bf',
    soft: 'rgba(45,212,191,0.14)',
    border: 'rgba(45,212,191,0.45)',
  },
};

export const TAB_ORDER: TabId[] = ['layout', 'svg', 'lighting'];
