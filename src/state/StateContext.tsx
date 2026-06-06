import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { AppState, LayoutState, LightingState, SvgState, TabId } from './types';
import { defaultState } from './defaults';
import { readStateFromHash, writeStateToHash } from './serialize';

interface StateContextValue {
  state: AppState;
  setActiveTab: (tab: TabId) => void;
  updateLayout: (patch: Partial<LayoutState> | ((prev: LayoutState) => LayoutState)) => void;
  updateSvg: (patch: Partial<SvgState> | ((prev: SvgState) => SvgState)) => void;
  updateLighting: (patch: Partial<LightingState> | ((prev: LightingState) => LightingState)) => void;
  resetAll: () => void;
}

const StateContext = createContext<StateContextValue | null>(null);

function initialState(): AppState {
  return readStateFromHash() ?? structuredClone(defaultState);
}

export function StateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const hashTimer = useRef<number | null>(null);
  const ignoreHashChange = useRef(false);

  // Persist to the URL hash, debounced so rapid drags don't thrash history.
  useEffect(() => {
    if (hashTimer.current) window.clearTimeout(hashTimer.current);
    hashTimer.current = window.setTimeout(() => {
      ignoreHashChange.current = true;
      writeStateToHash(state);
      // Release the guard after the hashchange event has had a chance to fire.
      window.setTimeout(() => (ignoreHashChange.current = false), 0);
    }, 120);
    return () => {
      if (hashTimer.current) window.clearTimeout(hashTimer.current);
    };
  }, [state]);

  // Respond to external hash changes (pasted link, back/forward).
  useEffect(() => {
    const onHashChange = () => {
      if (ignoreHashChange.current) return;
      const next = readStateFromHash();
      if (next) setState(next);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const setActiveTab = useCallback((tab: TabId) => {
    setState((prev) => (prev.activeTab === tab ? prev : { ...prev, activeTab: tab }));
  }, []);

  const updateLayout = useCallback<StateContextValue['updateLayout']>((patch) => {
    setState((prev) => ({
      ...prev,
      layoutState:
        typeof patch === 'function' ? patch(prev.layoutState) : { ...prev.layoutState, ...patch },
    }));
  }, []);

  const updateSvg = useCallback<StateContextValue['updateSvg']>((patch) => {
    setState((prev) => ({
      ...prev,
      svgState: typeof patch === 'function' ? patch(prev.svgState) : { ...prev.svgState, ...patch },
    }));
  }, []);

  const updateLighting = useCallback<StateContextValue['updateLighting']>((patch) => {
    setState((prev) => ({
      ...prev,
      lightingState:
        typeof patch === 'function'
          ? patch(prev.lightingState)
          : { ...prev.lightingState, ...patch },
    }));
  }, []);

  const resetAll = useCallback(() => {
    setState((prev) => ({ ...structuredClone(defaultState), activeTab: prev.activeTab }));
  }, []);

  const value = useMemo<StateContextValue>(
    () => ({ state, setActiveTab, updateLayout, updateSvg, updateLighting, resetAll }),
    [state, setActiveTab, updateLayout, updateSvg, updateLighting, resetAll],
  );

  return <StateContext.Provider value={value}>{children}</StateContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppState(): StateContextValue {
  const ctx = useContext(StateContext);
  if (!ctx) throw new Error('useAppState must be used within a StateProvider');
  return ctx;
}
