"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useTranslation } from "@/lib/i18n";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";

export default function LandingPage() {
  const { t } = useTranslation();
  const revealRefs = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            setTimeout(() => entry.target.classList.add("visible"), i * 80);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 },
    );
    revealRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const addRevealRef = (el: HTMLDivElement | null) => {
    if (el && !revealRefs.current.includes(el)) revealRefs.current.push(el);
  };

  return (
    <div className="min-h-screen bg-[#06050F] text-[#EEE9FF] font-[family-name:var(--font-inter)]" style={{ overflowX: "hidden" }}>
      {/* ── Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-6 py-5 md:px-12 bg-[#06050F]/85 backdrop-blur-xl border-b border-[#2A2550]">
        <span className="grad-logo font-[family-name:var(--font-outfit)] font-black text-[26px]">creet.ai</span>
        <ul className="hidden md:flex items-center gap-9 list-none">
          <li><a href="#how" className="text-[#A89EC9] text-[15px] font-medium no-underline hover:text-[#EEE9FF] transition-colors">{t("landing.ctaSecondary").replace("→", "").trim() === t("landing.ctaSecondary").replace("→", "").trim() ? t("landing.ctaSecondary") : "How it works"}</a></li>
          <li><a href="#features" className="text-[#A89EC9] text-[15px] font-medium no-underline hover:text-[#EEE9FF] transition-colors">Features</a></li>
          <li><a href="#formats" className="text-[#A89EC9] text-[15px] font-medium no-underline hover:text-[#EEE9FF] transition-colors">Formats</a></li>
          <li className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </li>
          <li><Link href="/login" className="text-[#EEE9FF] text-[15px] font-medium no-underline hover:text-white transition-colors">{t("nav.signIn")}</Link></li>
          <li>
            <Link href="/login" className="btn-hero-gradient inline-flex items-center gap-2 px-6 py-3 rounded-full text-white text-[15px] font-semibold no-underline">
              {t("landing.ctaPrimary")}
            </Link>
          </li>
        </ul>
        <div className="flex md:hidden items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
          <Link href="/login" className="btn-hero-gradient inline-flex items-center px-4 py-2 rounded-full text-white text-sm font-semibold no-underline">
            {t("nav.signIn")}
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-[120px] pb-20 relative overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 800px 600px at 65% 0%, rgba(124,58,237,0.28) 0%, transparent 70%), radial-gradient(ellipse 600px 500px at 15% 85%, rgba(240,51,138,0.22) 0%, transparent 70%), radial-gradient(ellipse 400px 400px at 80% 75%, rgba(0,212,255,0.14) 0%, transparent 70%)"
        }} />
        {/* Grid overlay */}
        <div className="absolute inset-0 pointer-events-none landing-grid-bg" />

        <div className="animate-fade-up inline-flex items-center gap-2 bg-[rgba(124,58,237,0.15)] border border-[rgba(124,58,237,0.4)] text-[#B58AFF] px-4 py-1.5 rounded-full text-[13px] font-semibold mb-8 relative">
          <span className="w-[7px] h-[7px] bg-[#9D5FFF] rounded-full animate-pulse-dot" />
          {t("landing.badge")}
        </div>

        <h1 className="animate-fade-up-1 font-[family-name:var(--font-outfit)] font-black text-[clamp(52px,8vw,96px)] leading-[1.05] tracking-tight max-w-[900px] mb-7 relative">
          {t("landing.headline1")}<br />
          <span className="grad-text">{t("landing.headline2")}</span><br />
          {t("landing.headline3")}
        </h1>

        <p className="animate-fade-up-2 text-[clamp(17px,2vw,21px)] text-[#A89EC9] max-w-[520px] mb-11 leading-relaxed relative">
          {t("landing.subtitle")}
        </p>

        <div className="animate-fade-up-3 flex items-center gap-4 flex-wrap justify-center relative">
          <Link href="/login" className="btn-hero-gradient inline-flex items-center gap-2 text-white text-[17px] px-9 py-4 rounded-full font-bold no-underline">
            {t("landing.ctaPrimary")}
          </Link>
          <a href="#how" className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-[15px] font-semibold text-[#EEE9FF] border-[1.5px] border-[#2A2550] hover:border-[#9D5FFF] hover:text-[#9D5FFF] transition-all no-underline">
            {t("landing.ctaSecondary")}
          </a>
        </div>

        <p className="animate-fade-up-4 text-[13px] text-[#A89EC9] mt-4 relative">{t("landing.heroNote")}</p>

        {/* Preview mockup */}
        <div className="animate-fade-up-5 mt-20 w-full max-w-[900px] relative">
          <div className="bg-[#0F0D20] border border-[#2A2550] rounded-[20px] overflow-hidden" style={{ boxShadow: "0 0 0 1px rgba(124,58,237,0.2), 0 32px 80px rgba(0,0,0,0.7), 0 0 80px rgba(124,58,237,0.12)" }}>
            <div className="bg-[#171430] px-5 py-3.5 flex items-center gap-2 border-b border-[#2A2550]">
              <div className="w-[11px] h-[11px] rounded-full bg-[#FF5F57]" />
              <div className="w-[11px] h-[11px] rounded-full bg-[#FFBD2E]" />
              <div className="w-[11px] h-[11px] rounded-full bg-[#28CA41]" />
              <span className="ml-3 text-[13px] text-[#A89EC9] font-medium">{t("landing.previewTitle")}</span>
            </div>
            <div className="p-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-[10px] overflow-hidden aspect-video">
                <div className="w-full h-full flex items-end p-2.5" style={{ background: "linear-gradient(135deg,#3D1C8A,#7C3AED)" }}>
                  <span className="text-[11px] font-semibold text-white/85 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-md">{t("landing.previewScene1")}</span>
                </div>
              </div>
              <div className="rounded-[10px] overflow-hidden aspect-video">
                <div className="w-full h-full flex items-end p-2.5" style={{ background: "linear-gradient(135deg,#8A1C5A,#F0338A)" }}>
                  <span className="text-[11px] font-semibold text-white/85 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-md">{t("landing.previewScene2")}</span>
                </div>
              </div>
              <div className="rounded-[10px] overflow-hidden aspect-video">
                <div className="w-full h-full flex items-end p-2.5" style={{ background: "linear-gradient(135deg,#0A3A5A,#00D4FF)" }}>
                  <span className="text-[11px] font-semibold text-white/85 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-md">{t("landing.previewScene3")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Social Proof ── */}
      <div className="px-6 md:px-12 py-7 border-t border-b border-[#2A2550] flex items-center justify-center gap-12 flex-wrap bg-[#0F0D20]">
        {[
          { emoji: "🎬", text: t("landing.proofVideos") },
          { emoji: "🌍", text: t("landing.proofCountries") },
          { emoji: "⚡", text: t("landing.proofSpeed") },
          { emoji: "📱", text: t("landing.proofPlatforms") },
        ].map((item) => (
          <div key={item.text} className="flex items-center gap-2.5 text-[#A89EC9] text-sm font-medium">
            <span>{item.emoji}</span> {item.text}
          </div>
        ))}
      </div>

      {/* ── How It Works ── */}
      <section id="how" className="py-24 px-6 md:px-12 max-w-[1100px] mx-auto">
        <div ref={addRevealRef} className="reveal-on-scroll">
          <span className="grad-label text-xs font-bold tracking-[2px] uppercase mb-4 inline-block">{t("landing.howLabel")}</span>
          <h2 className="font-[family-name:var(--font-outfit)] font-black text-[clamp(36px,5vw,56px)] leading-[1.1] tracking-tight mb-5">
            {t("landing.howTitle1")}<br /><span className="grad-text">{t("landing.howTitle2")}</span>
          </h2>
          <p className="text-lg text-[#A89EC9] max-w-[520px] leading-relaxed mb-16">{t("landing.howSub")}</p>
        </div>
        <div ref={addRevealRef} className="reveal-on-scroll grid grid-cols-1 md:grid-cols-3 gap-[2px] bg-[#2A2550] border border-[#2A2550] rounded-[20px] overflow-hidden">
          {[
            { num: t("landing.step1Num"), title: t("landing.step1Title"), desc: t("landing.step1Desc") },
            { num: t("landing.step2Num"), title: t("landing.step2Title"), desc: t("landing.step2Desc") },
            { num: t("landing.step3Num"), title: t("landing.step3Title"), desc: t("landing.step3Desc") },
          ].map((step) => (
            <div key={step.num} className="bg-[#0F0D20] p-10 md:p-12 transition-colors hover:bg-[#171430]">
              <div className="font-[family-name:var(--font-outfit)] font-black text-[72px] leading-none mb-5 select-none grad-step-num">{step.num}</div>
              <h3 className="font-[family-name:var(--font-outfit)] font-extrabold text-[22px] mb-3 text-[#EEE9FF]">{step.title}</h3>
              <p className="text-[#A89EC9] text-[15px] leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-6 md:px-12 max-w-[1100px] mx-auto">
        <div ref={addRevealRef} className="reveal-on-scroll">
          <span className="grad-label text-xs font-bold tracking-[2px] uppercase mb-4 inline-block">{t("landing.featuresLabel")}</span>
          <h2 className="font-[family-name:var(--font-outfit)] font-black text-[clamp(36px,5vw,56px)] leading-[1.1] tracking-tight mb-5">
            {t("landing.featuresTitle1")}<br /><span className="grad-text">{t("landing.featuresTitle2")}</span>
          </h2>
          <p className="text-lg text-[#A89EC9] max-w-[520px] leading-relaxed mb-16">{t("landing.featuresSub")}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            { emoji: "✍️", title: t("landing.feat1Title"), desc: t("landing.feat1Desc") },
            { emoji: "🎨", title: t("landing.feat2Title"), desc: t("landing.feat2Desc") },
            { emoji: "🎙️", title: t("landing.feat3Title"), desc: t("landing.feat3Desc") },
            { emoji: "💬", title: t("landing.feat4Title"), desc: t("landing.feat4Desc") },
          ].map((feat) => (
            <div key={feat.title} ref={addRevealRef} className="reveal-on-scroll group bg-[#0F0D20] border border-[#2A2550] rounded-[20px] p-10 transition-all relative overflow-hidden hover:border-[rgba(157,95,255,0.5)] hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_30px_rgba(124,58,237,0.12)]">
              <div className="absolute inset-0 bg-gradient-to-br from-[rgba(124,58,237,0.07)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="text-[32px] mb-5 block relative">{feat.emoji}</span>
              <h3 className="font-[family-name:var(--font-outfit)] font-extrabold text-[21px] mb-2.5 text-[#EEE9FF] relative">{feat.title}</h3>
              <p className="text-[#A89EC9] text-[15px] leading-relaxed relative">{feat.desc}</p>
            </div>
          ))}

          {/* Large spanning feature */}
          <div ref={addRevealRef} className="reveal-on-scroll group col-span-1 md:col-span-2 bg-[#0F0D20] border border-[#2A2550] rounded-[20px] p-10 transition-all relative overflow-hidden hover:border-[rgba(157,95,255,0.5)] hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_30px_rgba(124,58,237,0.12)]">
            <div className="absolute inset-0 bg-gradient-to-br from-[rgba(124,58,237,0.07)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center relative">
              <div>
                <span className="text-[32px] mb-5 block">🔁</span>
                <h3 className="font-[family-name:var(--font-outfit)] font-extrabold text-[21px] mb-2.5 text-[#EEE9FF]">{t("landing.feat5Title")}</h3>
                <p className="text-[#A89EC9] text-[15px] leading-relaxed">{t("landing.feat5Desc")}</p>
                <p className="text-[#A89EC9] text-[15px] mt-4">{t("landing.feat5Note")}</p>
              </div>
              <div className="rounded-2xl p-10 border border-[rgba(124,58,237,0.3)]" style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.15),rgba(240,51,138,0.08))" }}>
                <p className="text-lg italic leading-relaxed text-[#EEE9FF]">{t("landing.feat5Quote")}</p>
                <div className="mt-5 text-sm font-semibold text-[#A89EC9]">{t("landing.feat5Author")}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Formats ── */}
      <section id="formats" className="pb-24 px-6 md:px-12 max-w-[1100px] mx-auto">
        <div ref={addRevealRef} className="reveal-on-scroll">
          <span className="grad-label text-xs font-bold tracking-[2px] uppercase mb-4 inline-block">{t("landing.formatsLabel")}</span>
          <h2 className="font-[family-name:var(--font-outfit)] font-black text-[clamp(36px,5vw,56px)] leading-[1.1] tracking-tight mb-5">
            {t("landing.formatsTitle1")}<br /><span className="grad-text">{t("landing.formatsTitle2")}</span>
          </h2>
          <p className="text-lg text-[#A89EC9] max-w-[520px] leading-relaxed mb-12">{t("landing.formatsSub")}</p>
        </div>
        <div ref={addRevealRef} className="reveal-on-scroll flex gap-3.5 flex-wrap">
          {[
            { emoji: "▶️", label: t("landing.formatYoutube") },
            { emoji: "📱", label: t("landing.formatShorts") },
            { emoji: "🎵", label: t("landing.formatTiktok") },
            { emoji: "📸", label: t("landing.formatInstagram") },
            { emoji: "🎬", label: t("landing.formatReels") },
          ].map((fmt) => (
            <div key={fmt.label} className="bg-[#0F0D20] border border-[#2A2550] rounded-full px-6 py-3.5 flex items-center gap-2.5 text-[15px] font-semibold text-[#EEE9FF] transition-all hover:border-[#9D5FFF] hover:bg-[rgba(124,58,237,0.15)] hover:text-[#B58AFF] hover:shadow-[0_0_20px_rgba(124,58,237,0.2)] cursor-default">
              <span>{fmt.emoji}</span> {fmt.label}
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-24 px-6 md:px-12 max-w-[1100px] mx-auto">
        <div ref={addRevealRef} className="reveal-on-scroll">
          <span className="grad-label text-xs font-bold tracking-[2px] uppercase mb-4 inline-block">{t("landing.testimonialsLabel")}</span>
          <h2 className="font-[family-name:var(--font-outfit)] font-black text-[clamp(36px,5vw,56px)] leading-[1.1] tracking-tight mb-16">
            {t("landing.testimonialsTitle1")}<br /><span className="grad-text">{t("landing.testimonialsTitle2")}</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { text: t("landing.testimonial1"), name: t("landing.testimonial1Name"), handle: t("landing.testimonial1Handle"), initial: "S", grad: "linear-gradient(135deg,#7C3AED,#F0338A)" },
            { text: t("landing.testimonial2"), name: t("landing.testimonial2Name"), handle: t("landing.testimonial2Handle"), initial: "M", grad: "linear-gradient(135deg,#00D4FF,#7C3AED)" },
            { text: t("landing.testimonial3"), name: t("landing.testimonial3Name"), handle: t("landing.testimonial3Handle"), initial: "J", grad: "linear-gradient(135deg,#F0338A,#FF8C42)" },
          ].map((item) => (
            <div key={item.name} ref={addRevealRef} className="reveal-on-scroll bg-[#0F0D20] border border-[#2A2550] rounded-[20px] p-8 transition-colors hover:border-[rgba(157,95,255,0.4)]">
              <p className="text-base leading-relaxed mb-6 text-[#EEE9FF] italic">{item.text}</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[15px] text-white" style={{ background: item.grad }}>{item.initial}</div>
                <div>
                  <div className="font-semibold text-sm text-[#EEE9FF]">{item.name}</div>
                  <div className="text-[13px] text-[#A89EC9]">{item.handle}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="px-6 md:px-12 max-w-[1100px] mx-auto pb-24">
        <div ref={addRevealRef} className="reveal-on-scroll bg-[#0F0D20] border border-[#2A2550] rounded-[28px] py-20 px-6 md:px-20 text-center relative overflow-hidden">
          <div className="absolute top-[-150px] left-1/2 -translate-x-1/2 w-[700px] h-[500px] pointer-events-none" style={{ background: "radial-gradient(ellipse, rgba(124,58,237,0.3) 0%, rgba(240,51,138,0.12) 40%, transparent 70%)" }} />
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: "linear-gradient(rgba(124,58,237,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.05) 1px, transparent 1px)",
            backgroundSize: "40px 40px"
          }} />
          <h2 className="font-[family-name:var(--font-outfit)] font-black text-[clamp(36px,5vw,56px)] leading-[1.1] tracking-tight mb-5 relative z-10">
            <span className="grad-text">{t("landing.ctaTitle")}</span>
          </h2>
          <p className="text-[#A89EC9] text-lg max-w-[440px] mx-auto mb-12 relative z-10">{t("landing.ctaDesc")}</p>
          <Link href="/login" className="btn-hero-gradient inline-flex items-center gap-2 text-white text-[17px] px-9 py-4 rounded-full font-bold no-underline relative z-10">
            {t("landing.ctaButton")}
          </Link>
          <span className="block text-[#A89EC9] text-[13px] mt-4 relative z-10">{t("landing.ctaNote")}</span>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-6 md:px-12 py-12 border-t border-[#2A2550] max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6 flex-wrap">
        <span className="grad-logo font-[family-name:var(--font-outfit)] font-black text-[22px]">creet.ai</span>
        <ul className="flex gap-8 list-none">
          <li><Link href="/terms" className="text-[#A89EC9] text-sm no-underline hover:text-[#EEE9FF] transition-colors">{t("footer.terms")}</Link></li>
          <li><Link href="/privacy" className="text-[#A89EC9] text-sm no-underline hover:text-[#EEE9FF] transition-colors">{t("footer.privacy")}</Link></li>
          <li><Link href="/gdpr" className="text-[#A89EC9] text-sm no-underline hover:text-[#EEE9FF] transition-colors">{t("footer.gdpr")}</Link></li>
          <li><Link href="/cookies" className="text-[#A89EC9] text-sm no-underline hover:text-[#EEE9FF] transition-colors">{t("footer.cookies")}</Link></li>
        </ul>
        <p className="text-[#A89EC9] text-sm w-full text-center md:text-left">{t("footer.copyright")}</p>
      </footer>
    </div>
  );
}
