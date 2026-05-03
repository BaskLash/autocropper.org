/**
 * Static blog content. Source-controlled so the marketing pages stay
 * fully prerenderable with no CMS dependency.
 */

export interface Post {
  slug: string;
  title: string;
  description: string;
  publishedAt: string; // ISO date
  readingMinutes: number;
  body: string; // markdown-ish, rendered by a tiny inline renderer
}

export const POSTS: Post[] = [
  {
    slug: "why-your-icons-look-blurry",
    title: "Why Your Icons Look Blurry (and How to Fix Them)",
    description:
      "Most blurry icons aren't a Retina problem — they're a downscaling problem. Here's what actually fixes them.",
    publishedAt: "2026-04-12",
    readingMinutes: 6,
    body: `## The myth of "Retina makes everything sharp"

If your 32×32 icon looks fuzzy on a 4K display, the culprit is almost never the screen — it's the source asset. Browsers and operating systems don't perform high-quality resampling at runtime. They use bilinear filtering at best, which is fast but soft.

## The two failure modes

Blurry icons usually fall into one of two buckets:

1. **The asset was upscaled at runtime.** A 16×16 favicon is being shown at 64 logical pixels. The browser fills in the gaps with linear interpolation and the result looks like watercolor.
2. **The asset was downscaled in a single jump.** A 1024×1024 export was scaled to 32×32 once, and the resampler didn't have enough information to preserve thin strokes.

## The fix: ship the right size, downsample multi-step

Generate your icons at every size you need, and produce each size with **multi-step downscaling** — halve, halve, halve, then a final adjustment to the target. That's what Autocropper does internally. Each halving step preserves more high-frequency detail than a single jump from 1024 → 32 ever will.

## Bonus: kill the halo

The other "blurry" effect that isn't actually blur — a faint colored halo around the icon — is decontamination drift. When you cut out a non-white background, the edge pixels still mix the foreground with the original background color. Solving \`C = α·F + (1−α)·BG\` for \`F\` recovers the true foreground color and your icon stops glowing.

This is exactly the math Autocropper runs on every pixel along the edge.`,
  },
  {
    slug: "how-to-generate-perfect-app-icons",
    title: "How to Generate Perfect App Icons",
    description:
      "A practical checklist for icons that look right on the web, on iOS, on Android — and on the App Store screenshot.",
    publishedAt: "2026-03-30",
    readingMinutes: 5,
    body: `## Start with a square master

Always start from a square master at the largest size you'll ever need — 1024×1024 is the safe ceiling. Every smaller size is a downsample of that master. Never resize a small icon to a large one.

## Pad like the platforms expect

iOS clips icons to a rounded rectangle and applies a glossy mask. Android Adaptive Icons crop a square to a circle, square or rounded square depending on the launcher. **Always leave 6–10% safe-area padding** around the visual mark so the system mask doesn't bite into it.

## Check the halo on white

The most embarrassing icon bug is a near-invisible halo on white screens. Always preview your final icon **on a pure white background** before shipping. If you see a faint color outline, your background removal didn't decontaminate the edge.

## Generate every size, ship the ones you need

It's cheap to generate every preset size at once. It's expensive to discover three weeks later that your favicon is a stretched 16×16 favicon.ico instead of a clean 32×32 PNG.

Autocropper outputs 16, 32, 48, 64, 128, 256 and 512 by default. Drag and drop, hit "Download all", done.`,
  },
  {
    slug: "the-hidden-cost-of-manual-image-processing",
    title: "The Hidden Cost of Manual Image Processing",
    description:
      "Twelve minutes per logo doesn't sound like much. Compounded across a year, it's a salary's worth of time.",
    publishedAt: "2026-02-18",
    readingMinutes: 4,
    body: `## The visible cost

You see the bill: $9/month for the background removal tool, $12/month for the cropping suite, the occasional one-off purchase of an icon generator. Maybe $30 a month if you total it.

## The invisible cost

Twelve minutes per logo, distributed across:

- Switching to remove.bg, uploading, waiting, downloading.
- Re-importing into Photoshop or Figma to crop and pad.
- Exporting at every size your platform requires.
- Spotting the halo on white, going back, redoing it.

Multiply by the volume your team actually ships and the time bill dwarfs the dollar bill. A team processing 200 logos a month is burning **40 hours of focused work per month** on what should be a 5-second operation.

## The fix is structural, not motivational

You can't speed up the manual workflow by being more disciplined. The bottleneck is tab-switching and re-encoding, not effort. The only real fix is collapsing the chain into one tool that does the whole pipeline locally — which is what Autocropper exists to do.`,
  },
];

export function getPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}

export function listPosts(): Post[] {
  return [...POSTS].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

/**
 * Tiny markdown-ish renderer.
 * Supports: ## heading, paragraphs separated by blank lines, **bold**, `code`,
 * 1./2./3. ordered lists, - unordered lists. Enough for our blog posts;
 * keeps the bundle from including a real markdown library.
 */
export function renderMarkdown(src: string): string {
  const blocks = src.trim().split(/\n\n+/);
  const out: string[] = [];
  for (const block of blocks) {
    const trimmed = block.trim();
    if (trimmed.startsWith("## ")) {
      out.push(
        `<h2 class="mt-10 text-2xl font-semibold tracking-tight">${escape(trimmed.slice(3))}</h2>`,
      );
      continue;
    }
    if (/^\d+\.\s/.test(trimmed)) {
      const items = trimmed
        .split(/\n/)
        .map((l) => l.replace(/^\d+\.\s/, ""))
        .map((l) => `<li>${inline(l)}</li>`)
        .join("");
      out.push(`<ol class="mt-4 list-decimal space-y-2 pl-5">${items}</ol>`);
      continue;
    }
    if (/^-\s/.test(trimmed)) {
      const items = trimmed
        .split(/\n/)
        .map((l) => l.replace(/^-\s/, ""))
        .map((l) => `<li>${inline(l)}</li>`)
        .join("");
      out.push(`<ul class="mt-4 list-disc space-y-2 pl-5">${items}</ul>`);
      continue;
    }
    out.push(`<p class="mt-4 leading-7 text-[var(--color-fg-muted)]">${inline(trimmed)}</p>`);
  }
  return out.join("\n");
}

function escape(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
}

function inline(s: string): string {
  return escape(s)
    .replace(/`([^`]+)`/g, '<code class="rounded bg-[var(--color-bg-soft)] px-1 py-0.5 text-[0.85em]">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-[var(--color-fg)]">$1</strong>');
}
