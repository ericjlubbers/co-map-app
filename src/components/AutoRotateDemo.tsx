import { useState, useEffect, useRef, useCallback } from "react";
import { getCategoryInfo } from "../config";

interface AutoRotateDemoProps {
  /** Ordered list of category names to cycle through */
  categories: string[];
  /** Milliseconds each category is shown before advancing */
  intervalMs: number;
  /** Called with a category name to spotlight, or null to show all */
  onCategoryChange: (category: string | null) => void;
}

type DemoState = "running" | "paused";

/** Milliseconds of inactivity before the demo auto-resumes after a pause */
const AUTO_RESUME_DELAY_MS = 10_000;
/** Milliseconds for the category name overlay fade transition */
const FADE_TRANSITION_MS = 400;

/**
 * AutoRotateDemo — cycles through map categories one at a time, showing
 * an overlay with the category name. Pauses on user interaction and
 * provides a "Resume" button. Activated by the `?demo=1` embed query param.
 */
export default function AutoRotateDemo({
  categories,
  intervalMs,
  onCategoryChange,
}: AutoRotateDemoProps) {
  const [demoState, setDemoState] = useState<DemoState>("running");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(true); // controls overlay fade
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
    if (transitionRef.current) {
      clearTimeout(transitionRef.current);
      transitionRef.current = null;
    }
  }, []);

  // Advance to the next category with a fade transition
  const advanceCategory = useCallback(
    (idx: number) => {
      const nextIdx = (idx + 1) % categories.length;
      // Fade out
      setVisible(false);
      transitionRef.current = setTimeout(() => {
        setCurrentIndex(nextIdx);
        setVisible(true);
      }, FADE_TRANSITION_MS); // fade duration
    },
    [categories.length]
  );

  // Pause rotation on user interaction, resume after 10 s of inactivity
  const handleInteraction = useCallback(() => {
    if (demoState === "running") {
      clearTimers();
      setDemoState("paused");
      resumeTimerRef.current = setTimeout(() => {
        setDemoState("running");
      }, AUTO_RESUME_DELAY_MS);
    }
  }, [demoState, clearTimers]);

  const handleResume = useCallback(() => {
    clearTimers();
    setDemoState("running");
  }, [clearTimers]);

  // Notify parent of current category
  useEffect(() => {
    if (categories.length === 0) return;
    onCategoryChange(categories[currentIndex]);
  }, [currentIndex, categories, onCategoryChange]);

  // Advance timer when running
  useEffect(() => {
    if (demoState !== "running" || categories.length === 0) return;
    timerRef.current = setTimeout(() => {
      advanceCategory(currentIndex);
    }, intervalMs);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [demoState, currentIndex, intervalMs, categories.length, advanceCategory]);

  // Attach interaction listeners
  useEffect(() => {
    const opts = { passive: true };
    window.addEventListener("click", handleInteraction, opts);
    window.addEventListener("touchstart", handleInteraction, opts);
    window.addEventListener("wheel", handleInteraction, opts);
    window.addEventListener("keydown", handleInteraction);
    return () => {
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
      window.removeEventListener("wheel", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };
  }, [handleInteraction]);

  // Clean up on unmount — show all categories
  useEffect(() => {
    return () => {
      clearTimers();
      onCategoryChange(null);
    };
  }, [clearTimers, onCategoryChange]);

  if (categories.length === 0) return null;

  const currentCategory = categories[currentIndex];
  const info = getCategoryInfo(currentCategory);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-6 z-[1000] flex justify-center px-4">
      <div
        className="pointer-events-auto flex items-center gap-3 rounded-2xl px-5 py-3 shadow-xl"
        style={{
          backgroundColor: info.bgColor,
          opacity: visible ? 1 : 0,
          transition: "opacity 0.4s ease",
        }}
      >
        {/* Category dot */}
        <span
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: info.color }}
        />
        {/* Category name */}
        <span
          className="text-sm font-semibold"
          style={{ color: info.color }}
        >
          {currentCategory}
        </span>

        {/* Progress dots */}
        <div className="flex items-center gap-1">
          {categories.map((_, i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full transition-colors"
              style={{
                backgroundColor: i === currentIndex ? info.color : "#d1d5db",
              }}
            />
          ))}
        </div>

        {/* Pause indicator / Resume button */}
        {demoState === "paused" ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleResume();
            }}
            className="ml-1 rounded-full px-2.5 py-0.5 text-xs font-medium text-white transition-opacity hover:opacity-80"
            style={{ backgroundColor: info.color }}
          >
            Resume
          </button>
        ) : (
          <span className="ml-1 text-xs" style={{ color: info.color, opacity: 0.6 }}>
            ▶
          </span>
        )}
      </div>
    </div>
  );
}
