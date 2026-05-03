"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";
import { track } from "@/lib/analytics";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={() => {
        // Capture the *next* theme so the event tells the truth.
        track("theme_toggle", { to: theme === "dark" ? "light" : "dark" });
        toggle();
      }}
      aria-label="Toggle color theme"
      title="Toggle color theme"
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elev)] text-[var(--color-fg)] transition-colors hover:bg-[var(--color-bg-soft)] hover:border-[var(--color-border-strong)]"
    >
      <Sun className="h-4 w-4 hidden dark:inline" />
      <Moon className="h-4 w-4 inline dark:hidden" />
    </button>
  );
}
