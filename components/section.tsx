"use client";

import { motion } from "framer-motion";
import { useRef, type ReactNode } from "react";
import { useSectionView } from "@/lib/analytics";

interface Props {
  id?: string;
  /** Identifier reported as `section` param on `section_view`. */
  trackId?: string;
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Section({
  id,
  trackId,
  eyebrow,
  title,
  description,
  children,
  className,
}: Props) {
  const ref = useRef<HTMLElement>(null);
  useSectionView(ref, trackId ?? id ?? "unknown");

  return (
    <section
      id={id}
      ref={ref}
      className={["relative py-20 sm:py-28", className || ""].join(" ")}
    >
      <div className="mx-auto max-w-6xl px-5">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-2xl text-center"
        >
          {eyebrow ? (
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-accent)]">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            {title}
          </h2>
          {description ? (
            <p className="mt-4 text-pretty text-[var(--color-fg-muted)] sm:text-lg">
              {description}
            </p>
          ) : null}
        </motion.div>
        <div className="mt-12">{children}</div>
      </div>
    </section>
  );
}
