"use client";

import Link, { type LinkProps } from "next/link";
import { track, type TrackEvent, type TrackParams } from "@/lib/analytics";
import type { AnchorHTMLAttributes, ReactNode } from "react";

type Props = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    event: TrackEvent;
    params?: TrackParams;
    children: ReactNode;
  };

/**
 * Link that fires a GA4 event on click. Use from server components where an
 * `onClick` handler isn't possible (e.g. blog index list).
 */
export function TrackedLink({ event, params, onClick, ...rest }: Props) {
  return (
    <Link
      {...rest}
      onClick={(e) => {
        track(event, params);
        onClick?.(e);
      }}
    />
  );
}
