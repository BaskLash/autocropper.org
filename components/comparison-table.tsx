"use client";

import { Check, Minus, X } from "lucide-react";

const rows = [
  {
    label: "Time per logo",
    auto: "≈ 5 seconds",
    manual: "10–15 minutes across tools",
    autoIcon: "good" as const,
    manualIcon: "bad" as const,
  },
  {
    label: "Edge quality",
    auto: "Pixel perfect, decontaminated edges",
    manual: "Halos, jagged anti-aliasing",
    autoIcon: "good" as const,
    manualIcon: "bad" as const,
  },
  {
    label: "Cost",
    auto: "Free · 5 CHF/mo unlimited",
    manual: "$ remove.bg + crop tool + cleaner",
    autoIcon: "good" as const,
    manualIcon: "neutral" as const,
  },
  {
    label: "Privacy",
    auto: "On-device, zero uploads",
    manual: "Images sent to 3rd-party servers",
    autoIcon: "good" as const,
    manualIcon: "bad" as const,
  },
  {
    label: "Ease of use",
    auto: "Drag, drop, done",
    manual: "Switch tabs, re-import, re-export",
    autoIcon: "good" as const,
    manualIcon: "bad" as const,
  },
];

function StateIcon({ kind }: { kind: "good" | "bad" | "neutral" }) {
  if (kind === "good")
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
        <Check className="h-3 w-3" />
      </span>
    );
  if (kind === "bad")
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500/15 text-red-500">
        <X className="h-3 w-3" />
      </span>
    );
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-bg-soft)] text-[var(--color-fg-muted)]">
      <Minus className="h-3 w-3" />
    </span>
  );
}

export function ComparisonTable() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev)]">
      <div className="grid grid-cols-[1.1fr_1.4fr_1.4fr] divide-x divide-[var(--color-border)] border-b border-[var(--color-border)] bg-[var(--color-bg-soft)] text-xs uppercase tracking-[0.16em] text-[var(--color-fg-subtle)]">
        <div className="px-5 py-3" />
        <div className="px-5 py-3 font-semibold text-[var(--color-fg)]">Autocropper</div>
        <div className="px-5 py-3">Manual workflow</div>
      </div>
      {rows.map((r) => (
        <div
          key={r.label}
          className="grid grid-cols-[1.1fr_1.4fr_1.4fr] divide-x divide-[var(--color-border)] border-b border-[var(--color-border)] last:border-b-0"
        >
          <div className="px-5 py-4 text-sm font-medium">{r.label}</div>
          <div className="flex items-start gap-3 px-5 py-4 text-sm">
            <StateIcon kind={r.autoIcon} />
            <span>{r.auto}</span>
          </div>
          <div className="flex items-start gap-3 px-5 py-4 text-sm text-[var(--color-fg-muted)]">
            <StateIcon kind={r.manualIcon} />
            <span>{r.manual}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
