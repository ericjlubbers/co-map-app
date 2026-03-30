import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { PointData, DemoRotationMode, DemoRotationOrder } from "../types";

/** Milliseconds of inactivity before the demo auto-resumes after a pause */
const AUTO_RESUME_DELAY_MS = 10_000;

export interface UseAutoRotateOptions {
  /** All available categories */
  categories: string[];
  /** All points (needed for by-point mode) */
  points: PointData[];
  /** Whether demo mode is active */
  enabled: boolean;
  /** Rotation mode */
  mode: DemoRotationMode;
  /** Order */
  order: DemoRotationOrder;
  /** Interval for category rotation (ms) */
  categoryIntervalMs: number;
  /** Interval for point rotation (ms) */
  pointIntervalMs: number;
  /** Transition speed in ms (controls fade duration) */
  transitionSpeed: number;
}

export interface UseAutoRotateResult {
  /** Current demo state */
  demoState: "running" | "paused";
  /** Currently highlighted category (or null for all) */
  activeCategory: string | null;
  /** Currently highlighted point ID (or null) — only in by-point mode */
  activePointId: string | null;
  /** Current index in the rotation (for progress indicators) */
  currentIndex: number;
  /** Total items in rotation */
  totalItems: number;
  /** Whether the overlay/content is visible (false during fade-out) */
  visible: boolean;
  /** Pause the rotation */
  pause: () => void;
  /** Resume the rotation */
  resume: () => void;
  /** Register an interaction event (pauses + schedules auto-resume) */
  handleInteraction: () => void;
}

/**
 * Fisher-Yates shuffle: returns a new shuffled index array [0..length-1].
 */
function fisherYatesShuffle(length: number): number[] {
  const arr = Array.from({ length }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function useAutoRotate({
  categories,
  points,
  enabled,
  mode,
  order,
  categoryIntervalMs,
  pointIntervalMs,
  transitionSpeed,
}: UseAutoRotateOptions): UseAutoRotateResult {
  const [demoState, setDemoState] = useState<"running" | "paused">("running");
  const [stepIndex, setStepIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Items list depends on mode — exclude upcoming points from rotation
  const items = useMemo(() => {
    if (mode === "by-category") return categories;
    return points.filter((p) => p.status !== "upcoming");
  }, [mode, categories, points]);
  const itemCount = items.length;

  // Shuffled order array — regenerated when items change or when we complete a cycle
  const shuffledRef = useRef<number[]>([]);
  const cycleCountRef = useRef(0); // tracks how many items we've shown this cycle

  // Re-generate shuffle when items change
  useEffect(() => {
    if (order === "shuffled" && itemCount > 0) {
      shuffledRef.current = fisherYatesShuffle(itemCount);
      cycleCountRef.current = 0;
    }
  }, [order, itemCount]);

  // Reset state when mode/order/enabled changes
  useEffect(() => {
    setStepIndex(0);
    setVisible(true);
    if (enabled) {
      setDemoState("running");
    }
    cycleCountRef.current = 0;
    if (order === "shuffled" && itemCount > 0) {
      shuffledRef.current = fisherYatesShuffle(itemCount);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, order, enabled]);

  const clearTimers = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (resumeTimerRef.current) { clearTimeout(resumeTimerRef.current); resumeTimerRef.current = null; }
    if (transitionRef.current) { clearTimeout(transitionRef.current); transitionRef.current = null; }
  }, []);

  // Resolve the actual item index from stepIndex (handles shuffled order)
  const resolvedIndex = useMemo(() => {
    if (itemCount === 0) return 0;
    if (order === "sequential") return stepIndex % itemCount;
    // Shuffled: use the shuffled array
    const shuffled = shuffledRef.current;
    if (shuffled.length === 0) return 0;
    return shuffled[stepIndex % shuffled.length];
  }, [stepIndex, itemCount, order]);

  // Derive activeCategory and activePointId from resolved index
  const activeCategory = useMemo(() => {
    if (!enabled || itemCount === 0 || demoState !== "running") return null;
    if (mode === "by-category") {
      return categories[resolvedIndex] ?? null;
    }
    // by-point: derive category from the filtered items array (excludes upcoming)
    const pt = (items as PointData[])[resolvedIndex];
    return pt?.category ?? null;
  }, [enabled, itemCount, demoState, mode, categories, items, resolvedIndex]);

  const activePointId = useMemo(() => {
    if (!enabled || itemCount === 0 || demoState !== "running") return null;
    if (mode === "by-point") {
      const pt = (items as PointData[])[resolvedIndex];
      return pt?.id ?? null;
    }
    return null;
  }, [enabled, itemCount, demoState, mode, items, resolvedIndex]);

  // Current interval depends on mode
  const intervalMs = mode === "by-category" ? categoryIntervalMs : pointIntervalMs;

  // Advance to next step with fade transition
  const advance = useCallback(() => {
    setVisible(false);
    transitionRef.current = setTimeout(() => {
      setStepIndex((prev) => {
        const next = prev + 1;
        // Check if we completed a full cycle in shuffled mode
        if (order === "shuffled" && itemCount > 0) {
          cycleCountRef.current += 1;
          if (cycleCountRef.current >= itemCount) {
            // Re-shuffle for next cycle
            shuffledRef.current = fisherYatesShuffle(itemCount);
            cycleCountRef.current = 0;
            return 0;
          }
        }
        return next;
      });
      setVisible(true);
    }, transitionSpeed);
  }, [order, itemCount, transitionSpeed]);

  // Track whether this is the first tick after enable — skip delay for immediate first item
  const isFirstTickRef = useRef(true);

  // Reset first-tick flag when enabled/mode/order changes
  useEffect(() => {
    isFirstTickRef.current = true;
  }, [enabled, mode, order]);

  // Advance timer when running
  useEffect(() => {
    if (!enabled || demoState !== "running" || itemCount === 0) return;

    // First tick: show the current item immediately, then start the interval timer
    if (isFirstTickRef.current) {
      isFirstTickRef.current = false;
      setVisible(true);
      // Schedule next advance after full interval
      timerRef.current = setTimeout(advance, intervalMs);
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }

    timerRef.current = setTimeout(advance, intervalMs);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [enabled, demoState, stepIndex, intervalMs, itemCount, advance]);

  // Pause on interaction, auto-resume after 10s
  const handleInteraction = useCallback(() => {
    if (!enabled || demoState !== "running") return;
    clearTimers();
    setDemoState("paused");
    resumeTimerRef.current = setTimeout(() => {
      setDemoState("running");
    }, AUTO_RESUME_DELAY_MS);
  }, [enabled, demoState, clearTimers]);

  const pause = useCallback(() => {
    clearTimers();
    setDemoState("paused");
  }, [clearTimers]);

  const resume = useCallback(() => {
    clearTimers();
    setDemoState("running");
  }, [clearTimers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  return {
    demoState,
    activeCategory,
    activePointId,
    currentIndex: resolvedIndex,
    totalItems: itemCount,
    visible,
    pause,
    resume,
    handleInteraction,
  };
}
