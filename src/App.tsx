import { useState } from 'react';
import { useAppState } from './state/StateContext';
import { ACCENTS, TAB_ORDER } from './lib/accents';
import { LayoutIcon, SvgIcon, LightingIcon, ShareIcon, ResetIcon, GithubIcon } from './components/icons';
import { ShareModal } from './components/ShareModal';
import { LayoutEngine } from './modules/layout/LayoutEngine';
import { SvgExplorer } from './modules/svg/SvgExplorer';
import { LightingStudio } from './modules/lighting/LightingStudio';
import type { TabId } from './state/types';

const TAB_ICONS: Record<TabId, typeof LayoutIcon> = {
  layout: LayoutIcon,
  svg: SvgIcon,
  lighting: LightingIcon,
};

const REPO_URL = 'https://github.com/mtssilva/modulr';

export default function App() {
  const { state, setActiveTab, resetAll } = useAppState();
  const [shareOpen, setShareOpen] = useState(false);
  const active = state.activeTab;
  const accent = ACCENTS[active];

  return (
    <div
      className="flex h-full flex-col"
      style={{ ['--accent' as string]: accent.color }}
    >
      <header className="z-20 flex shrink-0 items-center gap-4 border-b border-white/5 bg-ink-900/60 px-4 py-3 backdrop-blur-xl sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-layout via-svg to-lighting shadow-glow">
            <span className="text-base font-bold tracking-tight text-ink-900">M</span>
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
              Modulr
              <span className="hidden rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 sm:inline">
                playground
              </span>
            </div>
            <div className="hidden text-[11px] text-slate-500 sm:block">{accent.tagline}</div>
          </div>
        </div>

        {/* Segmented tab switcher */}
        <nav className="mx-auto flex items-center gap-1 rounded-2xl border border-white/5 bg-ink-800/80 p-1">
          {TAB_ORDER.map((id) => {
            const Icon = TAB_ICONS[id];
            const cfg = ACCENTS[id];
            const isActive = id === active;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className="relative flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 ease-spring sm:px-4"
                style={{
                  color: isActive ? '#fff' : 'rgb(148 163 184)',
                  background: isActive ? cfg.soft : 'transparent',
                  boxShadow: isActive ? `inset 0 0 0 1px ${cfg.border}` : 'none',
                }}
              >
                <Icon
                  width={17}
                  height={17}
                  style={{ color: isActive ? cfg.color : 'currentColor' }}
                />
                <span className="hidden sm:inline">{cfg.name}</span>
              </button>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <button className="btn-ghost !px-2.5" onClick={resetAll} title="Reset to defaults">
            <ResetIcon width={16} height={16} />
            <span className="hidden md:inline">Reset</span>
          </button>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost !px-2.5"
            title="View source on GitHub"
          >
            <GithubIcon width={17} height={17} />
          </a>
          <button
            className="btn font-semibold text-ink-900 active:scale-95"
            style={{ background: accent.color, boxShadow: `0 8px 30px -10px ${accent.color}` }}
            onClick={() => setShareOpen(true)}
          >
            <ShareIcon width={16} height={16} />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </header>

      <main className="relative min-h-0 flex-1 overflow-hidden">
        <div key={active} className="absolute inset-0 animate-fade-in">
          {active === 'layout' && <LayoutEngine />}
          {active === 'svg' && <SvgExplorer />}
          {active === 'lighting' && <LightingStudio />}
        </div>
      </main>

      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  );
}
