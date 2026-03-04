"use client";

import Link from "next/link";
import {
  PenLine,
  SlidersHorizontal,
  Download,
  PenTool,
  Mic,
  MonitorSmartphone,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";

const steps = [
  { key: "one" as const, icon: PenLine },
  { key: "two" as const, icon: SlidersHorizontal },
  { key: "three" as const, icon: Download },
];

const features = [
  { key: "script" as const, icon: PenTool },
  { key: "voice" as const, icon: Mic },
  { key: "format" as const, icon: MonitorSmartphone },
];

export default function LandingPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="text-xl font-bold tracking-tight">
            Creet
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <Link href="/login">
              <Button variant="outline" size="sm">
                {t("nav.signIn")}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(262_80%_60%_/_0.15),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(263_70%_50%_/_0.2),transparent)]" />
          <div className="container mx-auto px-4 py-28 text-center sm:py-36 lg:py-44">
            <h1 className="mx-auto max-w-3xl text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl">
              {t("landing.tagline")}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              {t("landing.subtitle")}
            </p>
            <div className="mt-10">
              <Link href="/login">
                <Button size="lg" className="gap-2 text-base px-8 py-6">
                  {t("landing.ctaButton")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* ── Empathy ── */}
        <section className="py-24 sm:py-32">
          <div className="container mx-auto px-4 text-center">
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              {t("landing.empathy")}
            </p>
            <p className="mt-8 text-xl font-semibold text-foreground sm:text-2xl">
              {t("landing.turn")}
            </p>
          </div>
        </section>

        {/* ── How It Works ── */}
        <section className="relative py-24 sm:py-32">
          <div className="absolute inset-0 -z-10 bg-muted/30" />
          <div className="container mx-auto px-4">
            <h2 className="mb-16 text-center text-3xl font-bold tracking-tight sm:text-4xl">
              {t("landing.howItWorks")}
            </h2>
            <div className="mx-auto grid max-w-4xl gap-8 sm:grid-cols-3 sm:gap-4">
              {steps.map((step, i) => (
                <div key={step.key} className="relative flex flex-col items-center text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <step.icon className="h-7 w-7" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">
                    {t(`landing.steps.${step.key}`)}
                  </h3>
                  {i < steps.length - 1 && (
                    <ChevronRight className="absolute -right-4 top-5 hidden h-6 w-6 text-muted-foreground/40 sm:block" />
                  )}
                </div>
              ))}
            </div>
            <p className="mt-12 text-center text-muted-foreground">
              {t("landing.stepsSubtitle")}
            </p>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="py-24 sm:py-32">
          <div className="container mx-auto px-4">
            <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
              {features.map((feat) => (
                <div
                  key={feat.key}
                  className="group rounded-2xl border border-border/50 bg-card p-8 transition-colors hover:border-primary/30 hover:bg-accent/50"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                    <feat.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">
                    {t(`landing.features.${feat.key}.title`)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {t(`landing.features.${feat.key}.description`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Social Proof ── */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl rounded-2xl bg-primary/5 px-8 py-10 text-center ring-1 ring-primary/10">
              <p className="text-lg font-medium text-foreground sm:text-xl">
                {t("landing.socialProof")}
              </p>
            </div>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="relative py-24 sm:py-32">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_120%,hsl(262_80%_60%_/_0.1),transparent)] dark:bg-[radial-gradient(ellipse_60%_50%_at_50%_120%,hsl(263_70%_50%_/_0.15),transparent)]" />
          <div className="container mx-auto px-4 text-center">
            <p className="mx-auto max-w-xl text-2xl font-semibold leading-snug sm:text-3xl">
              {t("landing.cta")}
            </p>
            <div className="mt-10">
              <Link href="/login">
                <Button size="lg" className="gap-2 text-base px-8 py-6">
                  {t("landing.ctaButton")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t py-10">
        <div className="container mx-auto flex flex-col items-center gap-4 px-4 sm:flex-row sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {t("footer.copyright")}
          </p>
          <nav className="flex items-center gap-6">
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t("footer.terms")}
            </Link>
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t("footer.privacy")}
            </Link>
            <Link href="/cookies" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t("footer.cookies")}
            </Link>
            <Link href="/gdpr" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t("footer.gdpr")}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
