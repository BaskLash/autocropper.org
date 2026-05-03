"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Clock, CreditCard, Layers, Sparkles } from "lucide-react";

const points = [
  {
    icon: Layers,
    title: "Tab-juggling, all day",
    desc: "remove.bg → Photoshop → an online cropper → an enhancer → an icon generator. One file, five tools.",
  },
  {
    icon: AlertTriangle,
    title: "Quality bleeds at every step",
    desc: "Each export re-encodes JPEG, smudges edges and leaves halo around the logo on white backgrounds.",
  },
  {
    icon: Clock,
    title: "10–15 minutes per logo",
    desc: "Cropping, removing the background, resizing to every store-required size — manual, repetitive, slow.",
  },
  {
    icon: CreditCard,
    title: "Stacked subscriptions",
    desc: "$9 here, $12 there, $39 for the bundle. You're paying for things one focused tool should just do.",
  },
  {
    icon: Sparkles,
    title: "Final result is still rough",
    desc: "Dirty edges, anti-aliased fringe, off-center crops, asymmetric padding. Icons that look amateur.",
  },
];

export function PainPoints() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {points.map((p, i) => (
        <motion.div
          key={p.title}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.45, delay: i * 0.05 }}
          className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-5"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-red-500/10 text-red-500">
              <p.icon className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-semibold tracking-tight">{p.title}</h3>
          </div>
          <p className="mt-3 text-sm text-[var(--color-fg-muted)]">{p.desc}</p>
        </motion.div>
      ))}
    </div>
  );
}
