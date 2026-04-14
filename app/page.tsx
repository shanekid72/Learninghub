"use client"

import * as React from "react"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { BrandLogo } from "@/components/brand-logo"

const trending = [
  { n: 1, title: "Product Landscape", thumbnail: "/trending/product-landscape.svg" },
  { n: 2, title: "Journey of Your Money", thumbnail: "/trending/journey-money.svg" },
  { n: 3, title: "Remittance as a Service", thumbnail: "/trending/remittance-service.svg" },
  { n: 4, title: "API Auth", thumbnail: "/trending/api-auth.svg" },
  { n: 5, title: "CDP Onboarding", thumbnail: "/trending/cdp-onboarding.svg" },
  { n: 6, title: "worldAPI Authentication", thumbnail: "/trending/worldapi-authentication.svg" },
]

const faqs = [
  {
    q: "What is Learning Hub?",
    a: "An internal portal for onboarding, product/domain learning, and updates.",
  },
  {
    q: "Who is it for?",
    a: "New hires and existing teams needing refreshers and program updates.",
  },
  {
    q: "How do I access Learning Hub?",
    a: "Sign in with your approved Google Workspace account to open the protected hub.",
  },
  {
    q: "Can I watch on mobile?",
    a: "Yes - it's a responsive web portal. Videos and resources open from the module hub.",
  },
  {
    q: "Is this secure?",
    a: "Yes - access now uses verified Google sign-in with domain restrictions instead of email-only gating.",
  },
]

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  auth_domain_not_allowed: "Your Google account is not allowed to access Learning Hub.",
  auth_domain_not_configured:
    "Google sign-in is not configured correctly yet. Ask an administrator to finish the auth setup.",
  auth_exchange_failed: "We couldn't finish Google sign-in. Please try again.",
  auth_missing_code: "Google sign-in did not return an authorization code. Please try again.",
  auth_oauth_start_failed: "We couldn't start Google sign-in. Please try again.",
  auth_session_missing: "We couldn't verify your Google session. Please try again.",
  oauth_access_denied: "Google sign-in was canceled before completion.",
}

export default function Page() {
  return (
    <React.Suspense fallback={<LandingPageContent />}>
      <LandingPage />
    </React.Suspense>
  )
}

function LandingPage() {
  const searchParams = useSearchParams()
  const authError = searchParams.get("error")
  const errorMessage = authError ? AUTH_ERROR_MESSAGES[authError] || "Sign-in failed. Please try again." : null

  return <LandingPageContent errorMessage={errorMessage} />
}

function LandingPageContent({ errorMessage = null }: { errorMessage?: string | null }) {
  const [isRedirecting, setIsRedirecting] = React.useState(false)

  const handleGoogleSignIn = () => {
    setIsRedirecting(true)
    window.location.assign("/api/auth/login")
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="relative min-h-[85vh]">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),rgba(0,0,0,0.92))]" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/60 to-black" />
          <div className="absolute inset-0 opacity-[0.14] bg-[linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:120px_120px]" />
        </div>

        <div className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12">
          <BrandLogo className="h-9 w-auto md:h-10" />

          <div className="flex items-center gap-3">
            <select className="rounded border border-white/20 bg-black/50 px-3 py-2 text-sm">
              <option>English</option>
            </select>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isRedirecting}
              className="rounded bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-500 disabled:opacity-60"
            >
              {isRedirecting ? "Redirecting..." : "Continue with Google"}
            </button>
          </div>
        </div>

        <div className="relative z-10 flex flex-col items-center px-6 pt-20 text-center md:px-12 md:pt-28">
          <h1 className="max-w-4xl text-4xl font-extrabold leading-tight md:text-6xl">
            Unlimited product training, onboarding, and updates
          </h1>
          <p className="mt-4 max-w-2xl text-base text-white/80 md:text-lg">
            Protected by verified Google sign-in for internal teams.
          </p>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isRedirecting}
            className="mt-8 flex w-full max-w-md items-center justify-center gap-2 rounded bg-red-600 px-6 py-4 font-semibold hover:bg-red-500 disabled:opacity-60"
          >
            {isRedirecting ? "Redirecting to Google..." : "Continue with Google"}
          </button>

          {errorMessage && (
            <div className="mt-4 w-full max-w-2xl rounded border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {errorMessage}
            </div>
          )}

          <p className="mt-4 max-w-2xl text-sm text-white/60">
            Use your approved company Google account. Access is restricted to allowed internal domains.
          </p>
        </div>
      </section>

      <section className="relative z-20 -mt-16 px-6 md:px-12">
        <h2 className="mb-4 text-xl font-semibold">Trending Now</h2>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {trending.map((t) => (
            <div
              key={t.n}
              className="group relative h-[120px] min-w-[180px] overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900"
            >
              <Image
                src={t.thumbnail}
                alt={t.title}
                fill
                sizes="180px"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/15" />
              <div className="absolute bottom-2 left-3 text-[72px] font-extrabold leading-none text-white/25">
                {t.n}
              </div>
              <div className="relative z-10 flex h-full items-end p-3">
                <div className="text-sm font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.75)]">
                  {t.title}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 py-14 md:px-12">
        <h2 className="mb-8 text-2xl font-bold md:text-3xl">More Reasons to Join</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <FeatureCard
            title="Role-based paths"
            desc="Organize learning by teams (QA, Infra, Mobile, BA...) and keep updates flowing."
          />
          <FeatureCard
            title="No new tools"
            desc="Content stays in Drive. Tracking stays in Sheets. Dashboards via Looker Studio."
          />
          <FeatureCard
            title="Mark Complete + My Learning"
            desc="Completion writes to your secure app backend and shows up in My Learning instantly."
          />
          <FeatureCard
            title="Fast to update"
            desc="Add a new video, publish the module, and ship updates to the right learners quickly."
          />
        </div>
      </section>

      <section className="px-6 pb-16 md:px-12">
        <h2 className="mb-6 text-2xl font-bold md:text-3xl">Frequently Asked Questions</h2>
        <div className="max-w-3xl">
          {faqs.map((f) => (
            <details key={f.q} className="mb-2 rounded bg-neutral-800/70">
              <summary className="flex cursor-pointer select-none items-center justify-between px-5 py-4 font-semibold">
                {f.q}
                <span className="text-xl">+</span>
              </summary>
              <div className="px-5 pb-4 text-white/80">{f.a}</div>
            </details>
          ))}
        </div>

        <div className="mt-10 max-w-2xl">
          <p className="mb-3 text-white/80">Ready to watch? Sign in with Google to continue.</p>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isRedirecting}
            className="rounded bg-red-600 px-6 py-4 font-semibold hover:bg-red-500 disabled:opacity-60"
          >
            {isRedirecting ? "Redirecting..." : "Continue with Google"}
          </button>
        </div>
      </section>

      <footer className="px-6 pb-12 text-sm text-white/60 md:px-12">
        <div className="border-t border-white/10 pt-8">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <a className="hover:text-white" href="#">
              FAQ
            </a>
            <a className="hover:text-white" href="#">
              Help Center
            </a>
            <a className="hover:text-white" href="#">
              Privacy
            </a>
            <a className="hover:text-white" href="#">
              Terms
            </a>
          </div>
          <div className="mt-6">Learning Hub | Internal</div>
        </div>
      </footer>
    </main>
  )
}

function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-br from-indigo-950/60 to-neutral-900 p-6">
      <div className="mb-2 text-lg font-semibold">{title}</div>
      <div className="text-white/75">{desc}</div>
    </div>
  )
}
