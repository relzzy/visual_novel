import { useState, useEffect, type ReactNode } from 'react';

// ─── Orientation Guard ───────────────────────────────────────────────────────
// Blocks the game UI in portrait mode on mobile devices.
// Automatically dismisses when the user rotates to landscape.

function isPortrait(): boolean {
  // Prefer the Screen Orientation API
  if (screen.orientation?.type) {
    return screen.orientation.type.startsWith('portrait');
  }
  // Fallback: compare dimensions
  return window.innerHeight > window.innerWidth;
}

function isMobileDevice(): boolean {
  // Check for touch capability AND a reasonably small screen dimension
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const smallScreen = Math.min(window.innerWidth, window.innerHeight) < 820;
  return hasTouch && smallScreen;
}

export default function OrientationGuard({ children }: { children: ReactNode }) {
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    const check = () => {
      setShowOverlay(isMobileDevice() && isPortrait());
    };

    // Initial check
    check();

    // Listen to all orientation-related events
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    screen.orientation?.addEventListener('change', check);

    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
      screen.orientation?.removeEventListener('change', check);
    };
  }, []);

  return (
    <>
      {/* Overlay — blocks interaction in portrait */}
      {showOverlay && (
        <div
          id="orientation-overlay"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/[0.97] backdrop-blur-xl"
          style={{ touchAction: 'none' }}
        >
          {/* ── Rotation Icon (pure CSS/Tailwind) ── */}
          <div className="relative mb-10 animate-[rotateHint_2.4s_ease-in-out_infinite]">
            {/* Phone body */}
            <div className="w-16 h-28 rounded-xl border-2 border-white/30 bg-white/[0.04] relative flex flex-col items-center justify-between py-2">
              {/* Earpiece */}
              <div className="w-6 h-1 rounded-full bg-white/15" />
              {/* Screen area */}
              <div className="w-[calc(100%-12px)] flex-1 my-1.5 rounded-md border border-white/10 bg-white/[0.03]" />
              {/* Home button / bar */}
              <div className="w-8 h-1 rounded-full bg-white/15" />
            </div>

            {/* Curved rotation arrow */}
            <svg
              className="absolute -right-8 top-1/2 -translate-y-1/2 w-7 h-7 text-white/40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12a9 9 0 1 1-3-6.7" />
              <polyline points="21 3 21 9 15 9" />
            </svg>
          </div>

          {/* ── Message ── */}
          <p className="text-white/70 text-sm sm:text-base text-center leading-relaxed tracking-wide font-light px-8 max-w-xs">
            This game is best experienced in Landscape mode. Please rotate your device.
          </p>
        </div>
      )}

      {/* Game content — always mounted, just visually hidden behind overlay */}
      {children}
    </>
  );
}
