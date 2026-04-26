import Link from "next/link";
import { CommunityOptionalScreenshot } from "@/components/community-optional-screenshot";

/** Public Painted Tree vendor community group */
export const PAINTED_TREE_FB_GROUP = "https://www.facebook.com/groups/1482251463621586";

/** Facebook search to discover more painted tree groups and pages */
export const PAINTED_TREE_FACEBOOK_SEARCH =
  "https://www.facebook.com/search/top?q=painted%20tree%20survivors";

const HERO = "/community/hero.jpg";
const POSTS = ["/community/post-1.jpg", "/community/post-2.jpg", "/community/post-3.jpg", "/community/post-4.jpg"] as const;

const INSIDE = [
  "Peer advice and shop-floor reality checks",
  "Resource drops and what’s working in markets now",
  "Community voices, comebacks, and shared wins",
  "Inventory, logistics, and navigating the movement together",
] as const;

function JoinCta() {
  return (
    <Link
      href={PAINTED_TREE_FB_GROUP}
      target="_blank"
      rel="noreferrer"
      className="inline-flex w-full min-w-[14rem] items-center justify-center rounded-lg bg-[#1877F2] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#166FE5] sm:w-auto"
      data-event="facebook_group_join"
    >
      Open group on Facebook
    </Link>
  );
}

/**
 * No iframe: Meta does not support embedding Facebook Groups. This section is a
 * full-width hub with CTAs and optional local screenshots in /public/community.
 */
export function FacebookGroupEmbed() {
  return (
    <section
      className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen overflow-x-auto border-y border-black/10 py-12"
      style={{
        background:
          "linear-gradient(180deg, rgba(24, 119, 242, 0.09) 0%, rgba(240, 241, 242, 0.95) 28%, var(--background) 100%)",
      }}
    >
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight text-[var(--vrr-ink)] sm:text-3xl">
          Painted Tree community on Facebook
        </h2>
        <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-black/75 sm:text-lg">
          The main public group for the movement — about{" "}
          <strong className="font-semibold text-[var(--vrr-ink)]">3.7K+ painted tree people</strong> sharing{" "}
          <strong className="font-semibold text-[var(--vrr-ink)]">peer advice</strong>,{" "}
          <strong className="font-semibold text-[var(--vrr-ink)]">resources</strong>, and practical{" "}
          <strong className="font-semibold text-[var(--vrr-ink)]">information</strong> as we navigate markets,
          inventory, and comebacks together.
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-5xl px-4 sm:px-6">
        <div className="grid items-start gap-10 md:grid-cols-2 md:gap-12">
          <div className="text-left">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-black/45">What you&apos;ll find</h3>
            <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-black/80 sm:text-base">
              {INSIDE.map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="mt-0.5 shrink-0 text-[#1877F2]" aria-hidden>
                    &bull;
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-col items-stretch gap-3 sm:items-start">
              <JoinCta />
              <div className="text-sm text-black/55 sm:text-left">
                Public group &middot; join or browse on Facebook
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-black/65">
              <Link
                href={PAINTED_TREE_FACEBOOK_SEARCH}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-[#1877F2] underline decoration-[#1877F2]/35 underline-offset-2 transition hover:text-[#166FE5] hover:decoration-[#1877F2]/60"
                data-event="facebook_search_more_groups"
              >
                Find more painted tree groups and pages on Facebook
              </Link>{" "}
              — if you use search, you can surface additional communities beyond this hub.
            </p>
          </div>
          <div>
            <CommunityOptionalScreenshot
              src={HERO}
              alt="Preview of the Painted Tree Facebook group (optional screenshot)"
              aspectClassName="aspect-[4/3] rounded-lg"
            />
          </div>
        </div>
      </div>

      <div className="mx-auto mt-10 flex max-w-2xl flex-wrap items-center justify-center gap-2 px-4 sm:px-6">
        {(
          [
            { label: "3.7K+ members" },
            { label: "Public group" },
            { label: "Active daily" },
          ] as const
        ).map((pill) => (
          <span
            key={pill.label}
            className="rounded-full border border-black/10 bg-white/70 px-3.5 py-1.5 text-xs font-medium text-black/70 shadow-sm"
          >
            {pill.label}
          </span>
        ))}
      </div>

      <p className="mx-auto mt-3 max-w-2xl px-4 text-center text-xs text-black/50 sm:px-6">
        Screenshot cards below are optional. Drop JPGs in{" "}
        <code className="rounded bg-black/5 px-1 py-0.5 text-[0.7rem]">public/community/</code> to show your own
        captures; nothing here loads from a Facebook iframe.
      </p>

      <div className="mx-auto mt-8 grid max-w-5xl grid-cols-1 gap-4 px-2 sm:grid-cols-2 sm:px-4 lg:grid-cols-4">
        {POSTS.map((path, i) => (
          <CommunityOptionalScreenshot
            key={path}
            src={path}
            alt={`Optional Facebook community capture ${i + 1}`}
            aspectClassName="aspect-[4/3] rounded-lg"
          />
        ))}
      </div>

      <div className="mx-auto mt-12 max-w-2xl space-y-4 border-t border-black/10 pt-8 text-center sm:px-4">
        <p className="text-base font-medium text-[var(--vrr-ink)]">Join the room where vendors trade real answers.</p>
        <div className="mx-auto w-full sm:w-auto">
          <JoinCta />
        </div>
        <p className="text-xs text-black/45">Opens Facebook in a new tab. No embed required.</p>
      </div>
    </section>
  );
}
