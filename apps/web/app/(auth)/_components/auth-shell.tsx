"use client";

import * as React from "react";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { type LucideIcon, ShieldCheck, Sparkles } from "lucide-react";
import { ModeToggle } from "@/components/dashboard/ModeToggle";
import { cn } from "@/components/ui/utils";

gsap.registerPlugin(useGSAP);

type Highlight = {
  icon: LucideIcon;
  title: string;
  description: string;
};

type Metric = {
  icon: LucideIcon;
  label: string;
  value: string;
};

export function AuthShell({
  eyebrow,
  title,
  description,
  heroTitle,
  heroDescription,
  highlights,
  metrics,
  children,
  footer,
  hideHeroOnMobile = false,
  contentClassName,
}: {
  eyebrow: string;
  title: string;
  description: string;
  heroTitle: string;
  heroDescription: string;
  highlights: Highlight[];
  metrics: Metric[];
  children: React.ReactNode;
  footer?: React.ReactNode;
  hideHeroOnMobile?: boolean;
  contentClassName?: string;
}) {
  const scope = React.useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          reduce: "(prefers-reduced-motion: reduce)",
          noReduce: "(prefers-reduced-motion: no-preference)",
        },
        (context) => {
          const { reduce } = context.conditions as { reduce?: boolean };

          if (reduce) {
            gsap.set(
              ".auth-shell__content, .auth-shell__hero, .auth-shell__trust, .auth-shell__signal",
              {
                opacity: 1,
                clearProps: "transform",
              },
            );
            return;
          }

          gsap.set(".auth-shell__hero", { y: 28, opacity: 0 });
          gsap.set(".auth-shell__content", { y: 20, opacity: 0 });
          gsap.set(".auth-shell__trust", { y: 18, opacity: 0 });
          gsap.set(".auth-shell__signal", { y: 12, opacity: 0 });

          const tl = gsap.timeline({
            defaults: { ease: "power3.out", duration: 0.9 },
          });

          tl.to(".auth-shell__hero", { y: 0, opacity: 1 }, 0.08)
            .to(".auth-shell__content", { y: 0, opacity: 1 }, 0.18)
            .to(".auth-shell__trust", { y: 0, opacity: 1 }, 0.24)
            .to(".auth-shell__signal", { y: 0, opacity: 1, stagger: 0.06 }, 0.32);
        },
      );

      return () => mm.revert();
    },
    { scope },
  );

  return (
    <div
      ref={scope}
      className="auth-shell relative min-h-[100dvh] overflow-hidden bg-[#f3f7ff] text-slate-950 dark:bg-[#020617] dark:text-white lg:h-[100dvh] lg:min-h-[100dvh]"
    >
      <div className="pointer-events-none absolute inset-0 auth-noise opacity-30 dark:opacity-20" />
      <div className="absolute inset-0 auth-grid opacity-60 dark:opacity-40" />
      <div className="pointer-events-none absolute inset-y-0 left-[-8%] w-[42%] -skew-x-12 bg-[linear-gradient(145deg,rgba(2,19,89,0.08),transparent_55%)] dark:bg-[linear-gradient(145deg,rgba(14,165,233,0.08),transparent_55%)]" />
      <div className="pointer-events-none absolute bottom-0 right-[-12%] h-[55%] w-[48%] skew-x-[-18deg] bg-[linear-gradient(120deg,transparent,rgba(15,91,215,0.10),transparent_70%)] dark:bg-[linear-gradient(120deg,transparent,rgba(14,165,233,0.08),transparent_70%)]" />

      <div className="fixed right-5 top-5 z-50 sm:right-8 sm:top-8">
        <ModeToggle />
      </div>

      <div className="relative z-10 mx-auto grid min-h-[100dvh] w-full max-w-[1600px] gap-4 px-4 py-3 sm:px-6 sm:py-4 lg:h-[100dvh] lg:min-h-[100dvh] lg:grid-cols-[1.05fr_minmax(0,0.95fr)] lg:gap-6 lg:px-8 lg:py-5 xl:px-10 xl:py-6">
        <section
          className={cn(
            "auth-shell__hero relative flex flex-col justify-between rounded-[2.25rem] border border-slate-800 bg-[linear-gradient(137deg,#020617_0%,#041d79_42%,#000000_100%)] p-6 text-white shadow-[0_30px_120px_rgba(2,19,89,0.28)] sm:p-8 lg:h-full lg:min-h-0 lg:p-7 xl:p-8",
            hideHeroOnMobile ? "hidden lg:flex" : "",
          )}
        >
          <div className="pointer-events-none absolute inset-0 auth-noise opacity-25" />
          <div className="pointer-events-none absolute inset-x-0 top-[18%] h-px bg-gradient-to-r from-transparent via-sky-400/35 to-transparent" />
          <div className="space-y-8 lg:space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Link
                href="/"
                className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-4 py-2 transition hover:bg-white/10"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-950 shadow-lg">
                  <Sparkles className="h-5 w-5" />
                </span>
                <span className="text-lg font-black tracking-[-0.04em]">Tenaxis</span>
              </Link>

              <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-300/8 px-3 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.28em] text-sky-100">
                <ShieldCheck className="h-3.5 w-3.5" />
                B2B Multitenant
              </div>
            </div>

            <div className="space-y-4 lg:space-y-3">
              <p className="text-[0.72rem] font-black uppercase tracking-[0.38em] text-sky-200/80">
                {eyebrow}
              </p>
              <h2 className="max-w-2xl text-balance text-5xl font-black tracking-[-0.06em] text-white sm:text-6xl xl:text-[4.25rem]">
                {heroTitle}
              </h2>
              <p className="max-w-xl text-base leading-7 text-slate-200 sm:text-lg lg:text-base lg:leading-6">
                {heroDescription}
              </p>
            </div>

            <div className="auth-shell__trust grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-[1.65rem] border border-white/12 bg-black/20 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[0.68rem] font-black uppercase tracking-[0.28em] text-sky-200/75">
                      Trust signals
                    </p>
                    <p className="mt-3 text-3xl font-black tracking-[-0.05em] text-white">
                      {metrics[0]?.value ?? "99.98%"}
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      disponibilidad observada durante las últimas 24 horas
                    </p>
                  </div>
                  <div className="rounded-full border border-white/12 px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.24em] text-emerald-300">
                    estable
                  </div>
                </div>

                <div className="mt-6 flex h-16 items-end gap-2">
                  {[38, 64, 52, 78, 74, 82, 68, 88, 84, 90, 86, 92].map((height, index) => (
                    <span
                      key={index}
                      className="w-full rounded-t-full bg-[linear-gradient(180deg,rgba(56,189,248,0.95),rgba(14,165,233,0.24))]"
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
              </div>

              <div className="grid gap-3 lg:gap-2.5">
                {metrics.slice(1).map((metric) => (
                  <div
                    key={metric.label}
                    className="auth-shell__signal rounded-[1.35rem] border border-white/12 bg-white/6 px-4 py-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[0.62rem] uppercase tracking-[0.28em] text-white/55">
                          {metric.label}
                        </p>
                        <p className="mt-2 text-xl font-black tracking-[-0.04em] text-white">
                          {metric.value}
                        </p>
                      </div>
                      <metric.icon className="h-5 w-5 text-sky-200" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-5 lg:space-y-4">
            <div className="grid gap-4 lg:gap-3">
              {highlights.map(({ icon: Icon, title, description: itemDescription }, index) => (
                <div key={title} className="auth-shell__signal flex items-start gap-4">
                  <div className="relative flex h-full flex-col items-center">
                    <div className="mt-0.5 rounded-full border border-white/20 bg-white/8 p-2 text-sky-200">
                      <Icon className="h-4 w-4" />
                    </div>
                    {index < highlights.length - 1 ? (
                      <span className="mt-2 h-10 w-px bg-gradient-to-b from-white/30 to-transparent lg:h-7" />
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/92">
                      {title}
                    </p>
                    <p className="max-w-xl text-sm leading-6 text-slate-200/78 lg:leading-5">
                      {itemDescription}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5 text-xs uppercase tracking-[0.28em] text-white/55">
              <div className="flex flex-wrap gap-4">
                <Link href="/privacidad" className="transition hover:text-white">
                  Privacidad
                </Link>
                <Link href="/terminos" className="transition hover:text-white">
                  Términos
                </Link>
              </div>
              <span>Tenaxis © 2026</span>
            </div>
          </div>
        </section>

        <section
          className={cn(
            "auth-shell__content flex min-h-0 flex-col justify-center lg:h-full lg:min-h-0",
            hideHeroOnMobile ? "min-h-[calc(100dvh-1.5rem)] lg:min-h-0" : "",
            contentClassName,
          )}
        >
          <div className="mx-auto flex w-full max-w-2xl flex-col justify-center space-y-5 lg:h-full lg:max-h-full lg:space-y-4">
            <div className="space-y-3 px-1 lg:space-y-2">
              <p className="text-[0.72rem] font-black uppercase tracking-[0.34em] text-sky-700 dark:text-sky-300">
                {eyebrow}
              </p>
              <h1 className="text-balance text-4xl font-black tracking-[-0.05em] text-slate-950 dark:text-white sm:text-5xl xl:text-[3.5rem]">
                {title}
              </h1>
              <p className="max-w-2xl text-pretty text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base lg:leading-6">
                {description}
              </p>
            </div>

            {children}

            {footer ? <div className="px-1">{footer}</div> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
