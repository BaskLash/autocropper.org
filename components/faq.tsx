"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { track } from "@/lib/analytics";

const items = [
  {
    id: "vs-removebg",
    q: "How is this different from remove.bg?",
    a: "remove.bg is great at one thing: cutting people and products out of photos. Autocropper is built for vector-style logos and graphic marks: it samples the actual background, builds a soft mask, decontaminates edge color, then crops, squares and downscales — all in your browser, with no API calls.",
  },
  {
    id: "complex-backgrounds",
    q: "Does it handle complex or photographic backgrounds?",
    a: "It works best on flat or near-flat backgrounds (white, light gray, brand colors, soft gradients). Photo-realistic or busy backgrounds aren't the target — for those, use a segmentation tool first and feed the result back in.",
  },
  {
    id: "supported-sizes",
    q: "Which sizes are supported?",
    a: "16, 32, 48, 64, 128, 256 and 512 pixels by default. The Pro tier adds custom sizes for app store presets, favicons and OG images.",
  },
  {
    id: "privacy",
    q: "Is anything sent to a server?",
    a: "No. The entire pipeline runs locally — image decode, mask building, BFS connected components, decontamination, downscaling and PNG export. There is no upload endpoint.",
  },
  {
    id: "retina-blur",
    q: "Why does the result look blurry on Retina screens?",
    a: "It probably isn't — your browser is upscaling a small icon. Use the 2× zoom preview in the result viewer to verify edge quality, and download the size that matches your final use case.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="mx-auto max-w-3xl divide-y divide-[var(--color-border)] rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev)]">
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={it.id}>
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => {
                const next = isOpen ? null : i;
                setOpen(next);
                if (next !== null) {
                  track("faq_open", {
                    question_id: it.id,
                    position: i,
                  });
                }
              }}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold sm:text-base"
            >
              <span>{it.q}</span>
              <ChevronDown
                className={[
                  "h-4 w-4 flex-shrink-0 text-[var(--color-fg-muted)] transition-transform",
                  isOpen ? "rotate-180" : "rotate-0",
                ].join(" ")}
              />
            </button>
            {isOpen ? (
              <div className="px-5 pb-5 text-sm text-[var(--color-fg-muted)]">
                {it.a}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
