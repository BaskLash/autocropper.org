"use client";

import { motion } from "framer-motion";
import { Cpu, Lock, ShieldCheck } from "lucide-react";

const items = [
  {
    icon: ShieldCheck,
    title: "Your images never leave your device",
    desc: "Every step — from background detection to PNG export — runs in your browser tab.",
  },
  {
    icon: Lock,
    title: "No uploads. No tracking. No storage.",
    desc: "Nothing to leak. Nothing to scrape. We don't even have a server endpoint to receive your image.",
  },
  {
    icon: Cpu,
    title: "Pure Canvas, pure JavaScript",
    desc: "No WASM blobs, no third-party AI APIs. The pipeline is open-spec and inspectable.",
  },
];

export function Privacy() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {items.map((it, i) => (
        <motion.div
          key={it.title}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: i * 0.08 }}
          className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-6"
        >
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
            <it.icon className="h-4 w-4" />
          </span>
          <h3 className="mt-5 text-base font-semibold tracking-tight">{it.title}</h3>
          <p className="mt-2 text-sm text-[var(--color-fg-muted)]">{it.desc}</p>
        </motion.div>
      ))}
    </div>
  );
}
