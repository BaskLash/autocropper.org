import { ImageIcon } from "lucide-react";
import { TrackedLink } from "./tracked-link";
import { ExternalTrackedLink } from "./external-tracked-link";

export function SiteFooter() {
  const productLinks = [
    { href: "#how-it-works", label: "How it works" },
    { href: "#pricing", label: "Pricing" },
    { href: "#faq", label: "FAQ" },
    { href: "/blog", label: "Blog" },
  ];
  const companyLinks = [
    { href: "/blog/why-your-icons-look-blurry", label: "Field notes" },
  ];

  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg-soft)]">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <TrackedLink
            href="/"
            event="logo_click"
            params={{ location: "footer" }}
            className="flex items-center gap-2 font-semibold tracking-tight"
          >
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--color-fg)] text-[var(--color-bg)]">
              <ImageIcon className="h-4 w-4" />
            </span>
            Autocropper
          </TrackedLink>
          <p className="mt-3 max-w-sm text-sm text-[var(--color-fg-muted)]">
            Turn any logo into a perfect icon set in seconds. Pixel-perfect.
            Pure browser. No uploads.
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--color-fg-subtle)]">
            Product
          </p>
          <ul className="mt-3 space-y-2 text-sm text-[var(--color-fg-muted)]">
            {productLinks.map((l) => (
              <li key={l.href}>
                <TrackedLink
                  href={l.href}
                  event="footer_link_click"
                  params={{ link: l.href, label: l.label, group: "product" }}
                  className="hover:text-[var(--color-fg)]"
                >
                  {l.label}
                </TrackedLink>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--color-fg-subtle)]">
            Company
          </p>
          <ul className="mt-3 space-y-2 text-sm text-[var(--color-fg-muted)]">
            {companyLinks.map((l) => (
              <li key={l.href}>
                <TrackedLink
                  href={l.href}
                  event="footer_link_click"
                  params={{ link: l.href, label: l.label, group: "company" }}
                  className="hover:text-[var(--color-fg)]"
                >
                  {l.label}
                </TrackedLink>
              </li>
            ))}
            <li>
              <ExternalTrackedLink
                href="mailto:hello@autocropper.app"
                label="Contact"
                location="footer"
                className="hover:text-[var(--color-fg)]"
              />
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[var(--color-border)]">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 px-5 py-5 text-xs text-[var(--color-fg-subtle)] sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} Autocropper. All rights reserved.</p>
          <p>Built with Next.js, Tailwind, and a single &lt;canvas&gt;.</p>
        </div>
      </div>
    </footer>
  );
}
