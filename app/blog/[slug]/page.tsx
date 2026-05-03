import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getPost, listPosts, renderMarkdown } from "@/lib/blog";
import { TrackedLink } from "@/components/tracked-link";

export function generateStaticParams() {
  return listPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.publishedAt,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const html = renderMarkdown(post.body);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-5 pt-12 pb-24 sm:pt-20">
          <TrackedLink
            href="/blog"
            event="blog_back_click"
            params={{ from_slug: slug }}
            className="inline-flex items-center gap-1.5 text-sm text-[var(--color-fg-muted)] transition-colors hover:text-[var(--color-fg)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All posts
          </TrackedLink>
          <header className="mt-8">
            <div className="flex items-center gap-3 text-xs text-[var(--color-fg-subtle)]">
              <time dateTime={post.publishedAt}>
                {new Date(post.publishedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
              <span aria-hidden>·</span>
              <span>{post.readingMinutes} min read</span>
            </div>
            <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              {post.title}
            </h1>
            <p className="mt-4 text-pretty text-lg text-[var(--color-fg-muted)]">
              {post.description}
            </p>
          </header>
          <div
            className="prose-content mt-10"
            dangerouslySetInnerHTML={{ __html: html }}
          />
          <div className="mt-16 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-6">
            <h3 className="text-lg font-semibold tracking-tight">
              Try it on your own logo.
            </h3>
            <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
              Drop a logo into Autocropper and see the difference in seconds.
            </p>
            <TrackedLink
              href="/#hero-tool"
              event="blog_cta_click"
              params={{ slug, cta: "open_tool" }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-fg)] px-4 py-2 text-sm font-medium text-[var(--color-bg)] hover:opacity-90"
            >
              Open Autocropper
            </TrackedLink>
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
