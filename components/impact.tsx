"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const rows = [
  { before: "15 minutes", after: "5 seconds", label: "per logo" },
  { before: "5 tools", after: "1 tool", label: "in your stack" },
  { before: "Quality loss", after: "Pixel perfect", label: "every time" },
];

export function Impact() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {rows.map((r, i) => (
        <motion.div
          key={r.label}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-6"
        >
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-fg-subtle)]">
            {r.label}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-base text-[var(--color-fg-muted)] line-through">
              {r.before}
            </span>
            <ArrowRight className="h-4 w-4 text-[var(--color-fg-subtle)]" />
            <span className="text-2xl font-semibold tracking-tight text-[var(--color-fg)]">
              {r.after}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
