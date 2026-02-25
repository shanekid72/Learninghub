"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";

const trending = [
  { n: 1, title: "Product Landscape", thumbnail: "/trending/product-landscape.svg" },
  { n: 2, title: "Journey of Your Money", thumbnail: "/trending/journey-money.svg" },
  { n: 3, title: "Remittance as a Service", thumbnail: "/trending/remittance-service.svg" },
  { n: 4, title: "API Auth", thumbnail: "/trending/api-auth.svg" },
  { n: 5, title: "CDP Onboarding", thumbnail: "/trending/cdp-onboarding.svg" },
  { n: 6, title: "worldAPI Authentication", thumbnail: "/trending/worldapi-authentication.svg" },
];

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
    q: "How do I complete a module?",
    a: "Open a module and click Mark as Complete (tracked in Sheets).",
  },
  {
    q: "Can I watch on mobile?",
    a: "Yes — it’s a responsive web portal. Videos are embedded from Drive.",
  },
  {
    q: "Is this secure?",
    a: "For demo we use email-gate. Production can use Google SSO + domain restriction.",
  },
];

export default function Page() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();

    if (!clean || !clean.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: clean }),
      });
      const data = await res.json();

      if (!data.ok) {
        setError(data.error || "Login failed");
        return;
      }

      router.push("/hub");
    } catch {
      setError("Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white">
      {/* HERO */}
      <section className="relative min-h-[85vh]">
        {/* background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),rgba(0,0,0,0.92))]" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/60 to-black" />
          {/* subtle “poster wall” vibe */}
          <div className="absolute inset-0 opacity-[0.14] bg-[linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:120px_120px]" />
        </div>

        {/* top nav */}
        <div className="relative z-10 flex items-center justify-between px-6 md:px-12 py-6">
          <BrandLogo className="h-9 md:h-10 w-auto" />

          <div className="flex items-center gap-3">
            <select className="bg-black/50 border border-white/20 text-sm rounded px-3 py-2">
              <option>English</option>
            </select>
            <button
              onClick={() => {
                document
                  .getElementById("get-started")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded text-sm font-semibold"
            >
              Sign In
            </button>
          </div>
        </div>

        {/* hero content */}
        <div className="relative z-10 flex flex-col items-center text-center px-6 md:px-12 pt-20 md:pt-28">
          <h1 className="text-4xl md:text-6xl font-extrabold max-w-4xl leading-tight">
            Unlimited product training, onboarding, and updates
          </h1>
          <p className="mt-4 text-base md:text-lg text-white/80 max-w-2xl">
            Built on Google Drive + Sheets. Minimal dev. Real tracking.
          </p>

          <form
            id="get-started"
            onSubmit={onSubmit}
            className="mt-8 w-full max-w-2xl flex flex-col md:flex-row gap-3"
          >
            <input
              className="flex-1 rounded bg-black/60 border border-white/20 px-4 py-4 outline-none"
              placeholder="Email address"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-red-600 hover:bg-red-500 disabled:opacity-60 rounded px-6 py-4 font-semibold flex items-center justify-center gap-2"
            >
              Get Started <span aria-hidden>›</span>
            </button>
          </form>

          {error && <div className="mt-3 text-red-400 text-sm">{error}</div>}
        </div>
      </section>

      {/* TRENDING */}
      <section className="px-6 md:px-12 -mt-16 relative z-20">
        <h2 className="text-xl font-semibold mb-4">Trending Now</h2>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {trending.map((t) => (
            <div
              key={t.n}
              className="group relative min-w-[180px] h-[120px] rounded-lg bg-neutral-900 border border-neutral-800 overflow-hidden"
            >
              <Image
                src={t.thumbnail}
                alt={t.title}
                fill
                sizes="180px"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/15" />
              <div className="absolute left-3 bottom-2 text-[72px] font-extrabold text-white/25 leading-none">
                {t.n}
              </div>
              <div className="relative z-10 p-3 flex h-full items-end">
                <div className="text-sm font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.75)]">
                  {t.title}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="px-6 md:px-12 py-14">
        <h2 className="text-2xl md:text-3xl font-bold mb-8">
          More Reasons to Join
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
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
            desc="Completion writes to your Apps Script API and shows up in My Learning instantly."
          />
          <FeatureCard
            title="Fast to update"
            desc="Add a new video in Drive → register it in the module sheet → it appears in the portal."
          />
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 md:px-12 pb-16">
        <h2 className="text-2xl md:text-3xl font-bold mb-6">
          Frequently Asked Questions
        </h2>
        <div className="max-w-3xl">
          {faqs.map((f) => (
            <details key={f.q} className="mb-2 bg-neutral-800/70 rounded">
              <summary className="cursor-pointer select-none px-5 py-4 font-semibold flex items-center justify-between">
                {f.q}
                <span className="text-xl">+</span>
              </summary>
              <div className="px-5 pb-4 text-white/80">{f.a}</div>
            </details>
          ))}
        </div>

        {/* bottom email CTA */}
        <div className="mt-10 max-w-2xl">
          <p className="text-white/80 mb-3">
            Ready to watch? Enter your email to continue.
          </p>
          <form onSubmit={onSubmit} className="flex flex-col md:flex-row gap-3">
            <input
              className="flex-1 rounded bg-black/60 border border-white/20 px-4 py-4 outline-none"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit"
              disabled={loading}
              className="bg-red-600 hover:bg-red-500 disabled:opacity-60 rounded px-6 py-4 font-semibold">
              Get Started <span aria-hidden>›</span>
            </button>
          </form>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-6 md:px-12 pb-12 text-white/60 text-sm">
        <div className="border-t border-white/10 pt-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
          <div className="mt-6">Learning Hub • Internal</div>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl bg-gradient-to-br from-indigo-950/60 to-neutral-900 border border-white/10 p-6">
      <div className="text-lg font-semibold mb-2">{title}</div>
      <div className="text-white/75">{desc}</div>
    </div>
  );
}
