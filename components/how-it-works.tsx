"use client";

import { motion } from "framer-motion";
import { Download, ImagePlus, Wand2 } from "lucide-react";

const steps = [
  {
    n: "01",
    title: "Upload your logo",
    desc: "Drag any PNG or JPG into your browser. SVGs, dark backgrounds, photos — it all works.",
    icon: ImagePlus,
  },
  {
    n: "02",
    title: "Process instantly",
    desc: "Background detection, edge cleanup, decontamination and multi-step downscaling — under half a second.",
    icon: Wand2,
  },
  {
    n: "03",
    title: "Download icons",
    desc: "Grab a single size or the full set as a zip. 16 px to 512 px, ready for your app, site or store.",
    icon: Download,
  },
];

export function HowItWorks() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {steps.map((s, i) => (
        <motion.div
          key={s.n}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: i * 0.08 }}
          className="relative rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-6"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium tabular-nums tracking-[0.18em] text-[var(--color-fg-subtle)]">
              {s.n}
            </span>
            <span className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-soft)] text-[var(--color-accent)]">
              <s.icon className="h-4 w-4" />
            </span>
          </div>
          <h3 className="mt-6 text-lg font-semibold tracking-tight">{s.title}</h3>
          <p className="mt-2 text-sm text-[var(--color-fg-muted)]">{s.desc}</p>
        </motion.div>
      ))}
    </div>
  );
}
