"use client";

import { useTimeMilestones } from "@/lib/analytics";

export function TimeTracker() {
  useTimeMilestones();
  return null;
}
