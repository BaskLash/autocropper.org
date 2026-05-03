"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Calculator, Clock, DollarSign, Wallet } from "lucide-react";
import { track } from "@/lib/analytics";

const MINUTES_MANUAL = 12;
const MINUTES_AUTO = 0.1;
const MONTHLY_TOOL_COSTS_USD = 19;

function fmtTime(minutes: number): string {
  if (minutes < 60) return `${minutes.toFixed(0)} min`;
  const h = minutes / 60;
  if (h < 40) return `${h.toFixed(1)} h`;
  return `${(h / 8).toFixed(1)} workdays`;
}

function fmtCurrency(usd: number): string {
  return usd.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function SavingsCalculator() {
  const [logos, setLogos] = useState(40);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track whether the user has *engaged* with the slider this session, so we
  // can fire one `calculator_engagement` event on the first interaction —
  // useful for funnels where you want "started" vs "settled" separately.
  const engaged = useRef(false);

  const data = useMemo(() => {
    const monthlyMinutes = logos * (MINUTES_MANUAL - MINUTES_AUTO);
    const yearlyMinutes = monthlyMinutes * 12;
    const proCostMonthly = 5;
    const moneyMonthly = MONTHLY_TOOL_COSTS_USD - proCostMonthly;
    const moneyYearly = moneyMonthly * 12;
    return { monthlyMinutes, yearlyMinutes, moneyMonthly, moneyYearly };
  }, [logos]);

  // Debounced "settled" event — fires 600ms after the user stops dragging.
  useEffect(() => {
    if (!engaged.current) return;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      track("calculator_change", {
        logos,
        time_saved_minutes: Math.round(data.monthlyMinutes),
        money_saved_usd: data.moneyMonthly,
      });
    }, 600);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [logos, data.monthlyMinutes, data.moneyMonthly]);

  function onSlider(v: number) {
    setLogos(v);
    engaged.current = true;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1.4fr]">
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-6">
        <div className="mb-4 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-[var(--color-fg-subtle)]">
          <Calculator className="h-3.5 w-3.5" /> Inputs
        </div>
        <label htmlFor="logos" className="block text-sm font-medium">
          Logos processed per month
        </label>
        <div className="mt-3 flex items-baseline gap-3">
          <span className="text-5xl font-semibold tabular-nums tracking-tight">{logos}</span>
          <span className="text-sm text-[var(--color-fg-muted)]">logos / month</span>
        </div>
        <input
          id="logos"
          type="range"
          min={1}
          max={500}
          step={1}
          value={logos}
          onChange={(e) => onSlider(Number(e.target.value))}
          className="mt-5 w-full accent-[var(--color-accent)]"
          aria-valuemin={1}
          aria-valuemax={500}
          aria-valuenow={logos}
        />
        <div className="mt-2 flex justify-between text-xs text-[var(--color-fg-subtle)]">
          <span>1</span>
          <span>500</span>
        </div>
        <p className="mt-5 text-xs text-[var(--color-fg-subtle)]">
          Based on a {MINUTES_MANUAL}-minute manual workflow vs ~6&nbsp;s end-to-end with Autocropper, plus replacing $
          {MONTHLY_TOOL_COSTS_USD}/mo of background-removal & icon tools.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Stat
          icon={<Clock className="h-4 w-4" />}
          label="Time saved / month"
          value={fmtTime(data.monthlyMinutes)}
          tone="indigo"
        />
        <Stat
          icon={<Clock className="h-4 w-4" />}
          label="Time saved / year"
          value={fmtTime(data.yearlyMinutes)}
          tone="indigo"
        />
        <Stat
          icon={<Wallet className="h-4 w-4" />}
          label="Money saved / month"
          value={fmtCurrency(data.moneyMonthly)}
          tone="emerald"
        />
        <Stat
          icon={<DollarSign className="h-4 w-4" />}
          label="Money saved / year"
          value={fmtCurrency(data.moneyYearly)}
          tone="emerald"
        />
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "indigo" | "emerald";
}) {
  const dot =
    tone === "indigo"
      ? "bg-indigo-500/15 text-indigo-400"
      : "bg-emerald-500/15 text-emerald-500";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="flex flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-5"
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[var(--color-fg-subtle)]">
        <span className={["inline-flex h-6 w-6 items-center justify-center rounded-md", dot].join(" ")}>{icon}</span>
        {label}
      </div>
      <p className="mt-4 text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
    </motion.div>
  );
}
