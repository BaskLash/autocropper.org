/**
 * Autocropper analytics layer.
 *
 * Thin wrapper around the GA4 `gtag` global that's injected by
 * `<GoogleAnalytics />` from `@next/third-parties/google`.
 *
 * Designed as a typed event taxonomy so dashboards stay tidy:
 *   - All event names are snake_case GA4 conventions.
 *   - Params use stable keys (`location`, `label`, `section`, `tier`, …) so
 *     "tab the events to see what users hit" works in the GA explorer.
 *   - Section visibility is funneled through one `section_view` event with a
 *     `section` param. This is what answers "which features do users see /
 *     not see?" without spamming a different event per section.
 *   - Tool funnel events follow the order: `upload_attempt → upload_success`
 *     (or `upload_error`) → `download_click` / `zip_download_click` →
 *     `zip_download_complete` → `tool_reset`.
 *
 * Safe to call when GA isn't configured (no `NEXT_PUBLIC_GA_ID`); the
 * underlying `gtag` is just absent and `track()` no-ops.
 */

type Gtag = (
  command: "event" | "config" | "set",
  ...args: unknown[]
) => void;

declare global {
  interface Window {
    gtag?: Gtag;
    dataLayer?: unknown[];
  }
}

/* ------------------------------------------------------------------ */
/* Event taxonomy                                                      */
/* ------------------------------------------------------------------ */

export type TrackEvent =
  // Site engagement
  | "section_view"
  | "nav_click"
  | "logo_click"
  | "footer_link_click"
  | "external_link_click"
  | "cta_click"
  | "theme_toggle"
  | "scroll_depth"
  | "time_milestone"

  // Tool funnel
  | "upload_attempt"
  | "upload_click" // file picker opened
  | "upload_drop" // dropped onto zone
  | "upload_paste" // pasted from clipboard
  | "upload_success"
  | "upload_error"
  | "tool_reset"
  | "before_after_interact"
  | "preview_zoom_view"
  | "download_click"
  | "zip_download_click"
  | "zip_download_complete"
  | "free_limit_hit"

  // Pricing
  | "pricing_cta_click"
  | "subscribe_click"

  // FAQ
  | "faq_open"

  // Calculator
  | "calculator_change"

  // Blog
  | "blog_post_click"
  | "blog_back_click"
  | "blog_cta_click"
  | "blog_share_click";

export type TrackParams = Record<
  string,
  string | number | boolean | undefined | null
>;

/** Send an event to GA4. No-op if `gtag` isn't present. */
export function track(event: TrackEvent, params?: TrackParams) {
  if (typeof window === "undefined") return;
  const fn = window.gtag;
  if (typeof fn !== "function") return;
  // Strip undefined / null so the GA debugger view is clean.
  const clean: Record<string, string | number | boolean> = {};
  if (params) {
    for (const k in params) {
      const v = params[k];
      if (v === undefined || v === null) continue;
      clean[k] = v;
    }
  }
  fn("event", event, clean);
}

/* ------------------------------------------------------------------ */
/* React helpers                                                       */
/* ------------------------------------------------------------------ */

import { useEffect } from "react";

/**
 * Fires `section_view` exactly once per mount when the element scrolls into
 * view. Use on every marketing section to measure feature visibility breadth.
 */
export function useSectionView(
  ref: React.RefObject<HTMLElement | null>,
  section: string,
) {
  useEffect(() => {
    let fired = false;
    const el = ref.current;
    if (!el) return;
    const fire = () => {
      if (fired) return;
      fired = true;
      track("section_view", { section });
    };
    if (typeof IntersectionObserver === "undefined") {
      fire();
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            fire();
            obs.disconnect();
            break;
          }
        }
      },
      { threshold: 0.35 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, section]);
}

/**
 * Fires `time_milestone` at 10s / 30s / 60s / 120s / 300s of a single
 * page session. Independent of scroll depth.
 */
const TIME_MILESTONES = [10, 30, 60, 120, 300] as const;

export function useTimeMilestones() {
  useEffect(() => {
    const fired = new Set<number>();
    const timers = TIME_MILESTONES.map((s) =>
      setTimeout(() => {
        if (fired.has(s)) return;
        fired.add(s);
        track("time_milestone", { seconds: s });
      }, s * 1000),
    );
    return () => timers.forEach(clearTimeout);
  }, []);
}
