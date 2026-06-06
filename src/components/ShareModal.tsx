import { useEffect, useRef, useState } from 'react';
import { useAppState } from '../state/StateContext';
import { buildShareUrl } from '../state/serialize';
import { CheckIcon, CloseIcon, CopyIcon, ShareIcon } from './icons';

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
}

export function ShareModal({ open, onClose }: ShareModalProps) {
  const { state } = useAppState();
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const copyTimer = useRef<number | null>(null);

  const url = open ? buildShareUrl(state) : '';

  useEffect(() => {
    if (!open) return;
    setCopied(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    // Pre-select the link for quick manual copy.
    const t = window.setTimeout(() => inputRef.current?.select(), 60);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  useEffect(() => {
    return () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      inputRef.current?.select();
      document.execCommand('copy');
    }
    setCopied(true);
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 1800);
  };

  if (!open) return null;

  const tokenLength = url.split('#state=')[1]?.length ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      onMouseDown={onClose}
    >
      <div className="absolute inset-0 bg-ink-900/70 backdrop-blur-sm" />
      <div
        className="panel relative w-full max-w-lg p-6 animate-scale-in"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          className="btn-ghost absolute right-3 top-3 !px-2 !py-2"
          onClick={onClose}
          aria-label="Close"
        >
          <CloseIcon width={16} height={16} />
        </button>

        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-layout/30 via-svg/30 to-lighting/30 text-white">
            <ShareIcon />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Share your work</h2>
            <p className="text-sm text-slate-400">
              Your entire session is baked into this link — no account, no server.
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-stretch gap-2">
          <input
            ref={inputRef}
            readOnly
            value={url}
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-ink-800 px-3 py-2.5 font-mono text-xs text-slate-300 outline-none focus:border-white/25"
          />
          <button
            className={`btn min-w-[7.5rem] font-semibold transition-all duration-200 ease-spring ${
              copied
                ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/40'
                : 'bg-white/10 text-white hover:bg-white/15 active:scale-95'
            }`}
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <CheckIcon width={16} height={16} /> Copied!
              </>
            ) : (
              <>
                <CopyIcon width={16} height={16} /> Copy Link
              </>
            )}
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500">
          <span className="font-mono">payload · {tokenLength} chars</span>
          <span>defaults are stripped for a compact, shareable token</span>
        </div>
      </div>
    </div>
  );
}
