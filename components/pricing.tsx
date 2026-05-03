"use client";

import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { track } from "@/lib/analytics";

const tiers = [
  {
    id: "free",
    name: "Free",
    price: "0",
    cadence: "forever",
    blurb: "Perfect for the occasional logo.",
    features: [
      "5 logos per day",
      "All preset icon sizes (16 → 512)",
      "Bulk ZIP export",
      "On-device processing",
    ],
    ctaLabel: "Use free",
    primary: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "5",
    cadence: "/ month",
    blurb: "For agencies, founders and anyone shipping fast.",
    features: [
      "Unlimited logos",
      "Custom icon sizes",
      "Bulk export (coming soon)",
      "Priority improvements & roadmap input",
    ],
    ctaLabel: "Subscribe – 5 CHF/month",
    primary: true,
  },
];

export function Pricing() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {tiers.map((t, i) => (
        <motion.div
          key={t.id}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: i * 0.08 }}
          className={[
            "relative rounded-2xl border p-7",
            t.primary
              ? "border-[var(--color-accent)]/50 bg-gradient-to-b from-[var(--color-accent-soft)] to-[var(--color-bg-elev)]"
              : "border-[var(--color-border)] bg-[var(--color-bg-elev)]",
          ].join(" ")}
        >
          {t.primary ? (
            <span className="absolute -top-3 right-6 rounded-full border border-[var(--color-accent)]/40 bg-[var(--color-bg-elev)] px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--color-accent)]">
              Most popular
            </span>
          ) : null}
          <p className="text-sm font-medium text-[var(--color-fg-muted)]">{t.name}</p>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-5xl font-semibold tracking-tight">
              {t.primary ? "5 CHF" : t.price}
            </span>
            <span className="text-sm text-[var(--color-fg-muted)]">{t.cadence}</span>
          </div>
          <p className="mt-2 text-sm text-[var(--color-fg-muted)]">{t.blurb}</p>
          <ul className="mt-6 space-y-2.5 text-sm">
            {t.features.map((f) => (
              <li key={f} className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--color-accent)]" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <a
            href="#hero-tool"
            onClick={() => {
              track("pricing_cta_click", {
                tier: t.id,
                label: t.ctaLabel,
                price: t.primary ? 5 : 0,
              });
              if (t.primary) {
                track("subscribe_click", { source: "pricing", tier: t.id });
              }
            }}
            className={[
              "mt-7 block rounded-full px-4 py-2.5 text-center text-sm font-medium transition-opacity",
              t.primary
                ? "bg-[var(--color-fg)] text-[var(--color-bg)] hover:opacity-90"
                : "border border-[var(--color-border)] hover:border-[var(--color-fg-muted)]",
            ].join(" ")}
          >
            {t.ctaLabel}
          </a>
        </motion.div>
      ))}
    </div>
  );
}
