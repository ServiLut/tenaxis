"use client";

import Link from "next/link";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  CalendarClock,
  ChevronRight,
  ShieldCheck,
  Smartphone,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const pillars = [
  {
    icon: Workflow,
    label: "Orquestación",
    title: "Una sola capa para coordinar empresas, zonas y equipos.",
    description:
      "Tenaxis concentra la operación en un sistema claro, sin depender de flujos dispersos entre áreas o herramientas aisladas.",
  },
  {
    icon: CalendarClock,
    label: "Trazabilidad",
    title: "Cada servicio se sigue desde la programación hasta el cierre.",
    description:
      "La operación deja de sentirse opaca: agenda, ejecución, evidencia y estado viven en una misma línea de tiempo.",
  },
  {
    icon: ShieldCheck,
    label: "Escala B2B",
    title: "Estructura premium para una operación que necesita orden real.",
    description:
      "Pensado para crecer con control administrativo, visibilidad transversal y una base sólida para movilidad futura.",
  },
];

const operatorSteps = [
  "Recibe servicios y prioridades desde la coordinación central.",
  "Actualiza estado, evidencias y novedades sin romper el flujo operativo.",
  "Sincroniza trabajo móvil con la capa administrativa y de control.",
];

const metrics = [
  { value: "24/7", label: "visibilidad operacional" },
  { value: "Multiempresa", label: "estructura lista para escalar" },
  { value: "App móvil", label: "siguiente capa para operadores" },
];

export function HomeLandingClient() {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(
          [
            ".js-hero-kicker",
            ".js-hero-line",
            ".js-hero-copy",
            ".js-hero-actions",
            ".js-hero-note",
            ".js-metric-card",
            ".js-reveal",
            ".js-showcase-dashboard",
            ".js-showcase-phone",
            ".js-showcase-copy",
          ],
          { autoAlpha: 1, x: 0, y: 0, scale: 1 },
        );
      });

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const intro = gsap.timeline({ defaults: { ease: "power3.out", duration: 1 } });

        intro
          .from(".js-hero-kicker", { autoAlpha: 0, y: 24, duration: 0.65 })
          .from(".js-hero-line", { autoAlpha: 0, y: 54, stagger: 0.14 }, "<0.08")
          .from(".js-hero-copy", { autoAlpha: 0, y: 28, duration: 0.75 }, "<0.2")
          .from(".js-hero-actions", { autoAlpha: 0, y: 24, duration: 0.65 }, "<0.2")
          .from(".js-hero-note", { autoAlpha: 0, y: 20, duration: 0.55 }, "<0.18")
          .from(
            ".js-metric-card",
            { autoAlpha: 0, y: 26, stagger: 0.1, duration: 0.65 },
            "<0.1",
          );

        gsap.to(".js-glow-a", {
          x: 40,
          y: -30,
          duration: 8,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });

        gsap.to(".js-glow-b", {
          x: -36,
          y: 24,
          duration: 10,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });

        gsap.to(".js-float-phone", {
          y: -16,
          duration: 3.2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });

        gsap.utils.toArray<HTMLElement>(".js-reveal").forEach((element) => {
          gsap.from(element, {
            autoAlpha: 0,
            y: 60,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: element,
              start: "top 82%",
              toggleActions: "play none none reverse",
            },
          });
        });

        gsap.from(".js-pillar-card", {
          autoAlpha: 0,
          y: 70,
          stagger: 0.14,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".js-pillars-grid",
            start: "top 78%",
            toggleActions: "play none none reverse",
          },
        });

        gsap.from(".js-operator-step", {
          autoAlpha: 0,
          x: 28,
          stagger: 0.12,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".js-operator-copy",
            start: "top 78%",
            toggleActions: "play none none reverse",
          },
        });

        mm.add("(min-width: 1024px)", () => {
          const showcaseTl = gsap.timeline({
            defaults: { ease: "power2.out" },
            scrollTrigger: {
              trigger: ".js-showcase-pin",
              start: "top top",
              end: "+=1100",
              scrub: 0.9,
              pin: true,
            },
          });

          showcaseTl
            .fromTo(
              ".js-showcase-dashboard",
              { x: -90, autoAlpha: 0.65, scale: 0.92 },
              { x: 0, autoAlpha: 1, scale: 1, duration: 1 },
              0,
            )
            .fromTo(
              ".js-showcase-phone",
              { x: 80, y: 50, autoAlpha: 0.45, rotate: 7 },
              { x: 0, y: 0, autoAlpha: 1, rotate: 0, duration: 1 },
              0.08,
            )
            .fromTo(
              ".js-showcase-copy",
              { y: 50, autoAlpha: 0.4 },
              { y: 0, autoAlpha: 1, duration: 0.7 },
              0.1,
            )
            .to(".js-showcase-dashboard", { y: -18, duration: 1 }, 0.55)
            .to(".js-showcase-phone", { y: -34, duration: 1 }, 0.55);
        });
      });

      return () => {
        mm.revert();
      };
    },
    { scope: rootRef },
  );

  return (
    <main
      ref={rootRef}
      className="relative isolate overflow-hidden bg-background text-foreground selection:bg-sky-300 selection:text-slate-950 dark:selection:bg-sky-400 dark:selection:text-slate-950"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(1,173,251,0.12),transparent_28%),radial-gradient(circle_at_85%_18%,rgba(2,19,89,0.08),transparent_26%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(1,173,251,0.18),transparent_24%),radial-gradient(circle_at_82%_12%,rgba(56,189,248,0.10),transparent_22%),linear-gradient(180deg,rgba(2,6,23,0.98),rgba(3,11,27,0.98))]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.045] [background-image:linear-gradient(rgba(2,19,89,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(2,19,89,0.22)_1px,transparent_1px)] [background-size:40px_40px] dark:opacity-[0.08] dark:[background-image:linear-gradient(rgba(148,163,184,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.14)_1px,transparent_1px)]" />
      <div className="js-glow-a pointer-events-none absolute left-[-10rem] top-8 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,_rgba(1,173,251,0.24),_transparent_65%)] blur-3xl dark:bg-[radial-gradient(circle,_rgba(56,189,248,0.24),_transparent_62%)]" />
      <div className="js-glow-b pointer-events-none absolute right-[-8rem] top-[26rem] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,_rgba(2,19,89,0.18),_transparent_68%)] blur-3xl dark:bg-[radial-gradient(circle,_rgba(14,165,233,0.16),_transparent_68%)]" />

      <section className="relative flex min-h-[100svh] items-center px-6 pb-20 pt-28 sm:px-8 lg:px-12">
        <div className="mx-auto grid w-full max-w-[92rem] gap-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(28rem,0.9fr)] lg:items-end">
          <div className="max-w-4xl">
            <div className="js-hero-kicker inline-flex items-center gap-3 rounded-full border border-slate-200/80 bg-white/80 px-5 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-700 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.18)] backdrop-blur dark:border-sky-400/20 dark:bg-slate-950/70 dark:text-sky-100 dark:shadow-[0_24px_90px_-46px_rgba(14,165,233,0.32)]">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              Plataforma operativa para servicios en campo
            </div>

            <h1 className="mt-8 max-w-5xl text-5xl font-semibold tracking-[-0.07em] text-balance sm:text-6xl lg:text-[6.6rem] lg:leading-[0.94] dark:text-slate-50">
              <span className="js-hero-line block">La operación puede</span>
              <span className="js-hero-line block">verse más clara,</span>
              <span className="js-hero-line block text-slate-400 dark:text-sky-200/70">más serena y más precisa.</span>
            </h1>

            <p className="js-hero-copy mt-8 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl dark:text-slate-300">
              Tenaxis concentra coordinación, seguimiento y control administrativo en una experiencia
              amplia, limpia y confiable. Hoy desde la web; después, conectada con una app móvil para
              operadores en campo.
            </p>

            <div className="js-hero-actions mt-10 flex flex-col gap-4 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-14 rounded-full bg-slate-950 px-8 text-white hover:bg-slate-800 dark:bg-sky-400 dark:text-slate-950 dark:shadow-[0_22px_60px_-28px_rgba(56,189,248,0.65)] dark:hover:bg-sky-300"
              >
                <Link href="/iniciar-sesion">
                  Iniciar sesión
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-14 rounded-full border-slate-300 bg-white/80 px-8 text-slate-900 hover:bg-white dark:border-slate-700/80 dark:bg-slate-950/70 dark:text-slate-100 dark:hover:bg-slate-900/90"
              >
                <Link href="/registro">Registrarse</Link>
              </Button>
            </div>

            <p className="js-hero-note mt-6 text-sm tracking-[0.02em] text-slate-500 dark:text-slate-400">
              Diseño para operación B2B con visión web ahora y movilidad para operadores como siguiente capa.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="js-metric-card rounded-[2rem] border border-white/80 bg-white/90 p-7 shadow-[0_30px_80px_-48px_rgba(15,23,42,0.28)] backdrop-blur will-change-transform dark:border-slate-800/80 dark:bg-slate-900/70 dark:shadow-[0_36px_100px_-54px_rgba(2,12,27,0.95)]"
              >
                <div className="text-2xl font-semibold tracking-[-0.05em] text-slate-950 dark:text-slate-50">
                  {metric.value}
                </div>
                <p className="mt-2 max-w-[14rem] text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {metric.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="js-reveal px-6 pb-10 sm:px-8 lg:px-12 lg:pb-24">
        <div className="mx-auto max-w-[92rem] rounded-[2.75rem] border border-white/80 bg-white/85 px-8 py-8 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.3)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/65 dark:shadow-[0_42px_140px_-72px_rgba(2,12,27,0.95)] lg:px-10 lg:py-10">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.26em] text-slate-400 dark:text-sky-200/60">Tenaxis</p>
              <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-[-0.05em] text-balance sm:text-4xl lg:text-5xl dark:text-slate-50">
                Un dashboard que se siente como una sala de control, no como una pantalla saturada.
              </h2>
            </div>
            <p className="max-w-2xl text-base leading-8 text-slate-600 sm:text-lg dark:text-slate-300">
              La homepage ahora presenta el producto con más aire, más jerarquía visual y un ritmo mucho más
              editorial. El objetivo es que la plataforma inspire confianza antes de entrar, no solo que muestre botones.
            </p>
          </div>
        </div>
      </section>

      <section className="js-showcase-pin relative px-6 py-12 sm:px-8 lg:px-12 lg:py-20">
        <div className="mx-auto max-w-[92rem]">
          <div className="grid min-h-[78vh] gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div className="js-showcase-copy max-w-xl will-change-transform">
              <p className="text-sm uppercase tracking-[0.26em] text-slate-400 dark:text-sky-200/60">Control hub</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-balance sm:text-5xl lg:text-6xl dark:text-slate-50">
                Menos ruido visual. Más foco en lo que sí mueve la operación.
              </h2>
              <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-300">
                Usamos GSAP para acompañar la narrativa: la plataforma entra con calma, se abre con scroll y da
                protagonismo a la futura experiencia móvil sin meter todo en un solo bloque comprimido.
              </p>
              <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white/85 px-4 py-2 text-sm text-slate-700 dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-200">
                Operación web hoy
                <ChevronRight className="h-4 w-4" />
                movilidad conectada después
              </div>
            </div>

            <div className="relative min-h-[34rem] lg:min-h-[40rem]">
              <div className="js-showcase-dashboard absolute left-0 top-6 w-full max-w-[46rem] rounded-[2.8rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(255,255,255,0.82))] p-5 shadow-[0_50px_140px_-70px_rgba(15,23,42,0.42)] backdrop-blur will-change-transform dark:border-slate-800/80 dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.92),rgba(15,23,42,0.90))] dark:shadow-[0_56px_140px_-72px_rgba(0,0,0,0.92)] lg:p-7">
                <div className="flex items-center justify-between border-b border-slate-200/70 pb-4 dark:border-white/10">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600 dark:text-sky-300">
                      Centro de mando
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] dark:text-slate-50">Tenaxis Control Hub</h3>
                  </div>
                  <div className="rounded-full bg-emerald-500/10 px-4 py-2 text-xs font-medium text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
                    Operación estable
                  </div>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                  <div className="rounded-[2rem] bg-slate-950 p-6 text-white">
                    <p className="text-xs uppercase tracking-[0.24em] text-sky-300">Visión operativa</p>
                    <h4 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">
                      Servicios listos para ejecutarse
                    </h4>
                    <div className="mt-6 grid gap-3">
                      {[
                        "12 servicios programados para hoy",
                        "4 coordinadores operando simultáneamente",
                        "3 empresas sincronizadas en una misma vista",
                      ].map((item) => (
                        <div
                          key={item}
                          className="rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-200"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 grid h-32 grid-cols-7 items-end gap-2">
                      {[42, 58, 64, 76, 68, 88, 79].map((height) => (
                        <div
                          key={height}
                          className="rounded-t-[1rem] bg-[linear-gradient(180deg,#7dd3fc,#01adfb)]"
                          style={{ height: `${height}%` }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <div className="rounded-[2rem] border border-slate-200/70 bg-slate-50/90 p-5 dark:border-slate-800/80 dark:bg-slate-900/80">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Estado</p>
                      <div className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950 dark:text-slate-50">
                        24/7
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        Visibilidad transversal para coordinación y control administrativo.
                      </p>
                    </div>
                    <div className="rounded-[2rem] border border-slate-200/70 bg-slate-50/90 p-5 dark:border-slate-800/80 dark:bg-slate-900/80">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Escala</p>
                      <div className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950 dark:text-slate-50">
                        Multiempresa
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        Una base sobria para operar varias estructuras sin perder claridad.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="js-showcase-phone js-float-phone absolute bottom-0 right-2 w-[14rem] rounded-[2.8rem] border border-slate-200/80 bg-[linear-gradient(180deg,#0f172a,#1e3a8a)] p-3 shadow-[0_40px_100px_-55px_rgba(1,173,251,0.5)] will-change-transform dark:border-white/10 lg:right-10 lg:w-[16rem]">
                <div className="mx-auto h-1.5 w-16 rounded-full bg-white/15" />
                <div className="mt-3 rounded-[2.2rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(1,173,251,0.16))] p-4 text-white">
                  <div className="rounded-[1.4rem] bg-white/10 p-4">
                    <p className="text-[0.65rem] uppercase tracking-[0.24em] text-cyan-100">Operador</p>
                    <p className="mt-2 text-xl font-semibold tracking-[-0.04em] text-white">En ruta</p>
                  </div>
                  <div className="mt-4 space-y-3">
                    <div className="h-14 rounded-[1.2rem] bg-white/10" />
                    <div className="h-28 rounded-[1.4rem] bg-cyan-300/18" />
                    <div className="rounded-[1.2rem] bg-white/10 px-3 py-3 text-xs uppercase tracking-[0.22em] text-cyan-50">
                      Evidencia y estado sincronizados
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="js-reveal px-6 py-14 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-[92rem]">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.26em] text-slate-400 dark:text-sky-200/60">Capacidades</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-balance sm:text-5xl lg:text-6xl dark:text-slate-50">
              Una presentación más amplia para un producto que no debería sentirse apretado.
            </h2>
          </div>

          <div className="js-pillars-grid mt-14 grid gap-6 lg:grid-cols-3">
            {pillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <article
                  key={pillar.title}
                  className="js-pillar-card rounded-[2.4rem] border border-white/80 bg-white/90 p-8 shadow-[0_35px_100px_-60px_rgba(15,23,42,0.24)] backdrop-blur will-change-transform dark:border-slate-800/80 dark:bg-slate-900/70 dark:shadow-[0_38px_120px_-70px_rgba(2,12,27,0.95)]"
                >
                  <div className="inline-flex rounded-[1.2rem] bg-slate-950 p-3 text-white dark:bg-sky-400 dark:text-slate-950">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-6 text-xs uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">{pillar.label}</p>
                  <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-balance dark:text-slate-50">
                    {pillar.title}
                  </h3>
                  <p className="mt-4 text-base leading-8 text-slate-600 dark:text-slate-300">
                    {pillar.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="js-reveal px-6 pb-20 pt-6 sm:px-8 lg:px-12 lg:pb-28">
        <div className="mx-auto grid max-w-[92rem] gap-8 rounded-[3rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(244,247,252,0.9))] px-8 py-10 shadow-[0_45px_120px_-70px_rgba(15,23,42,0.28)] backdrop-blur dark:border-slate-800/80 dark:bg-[linear-gradient(180deg,rgba(3,10,24,0.96),rgba(7,23,48,0.92))] dark:shadow-[0_50px_130px_-72px_rgba(0,0,0,0.92)] lg:grid-cols-[0.95fr_1.05fr] lg:px-12 lg:py-14">
          <div className="js-operator-copy max-w-2xl">
            <p className="text-sm uppercase tracking-[0.26em] text-slate-400 dark:text-sky-200/60">Futuro móvil</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-balance sm:text-5xl lg:text-[3.7rem] lg:leading-[1.02] dark:text-slate-50">
              La próxima fase es llevar esta claridad a la mano del operador.
            </h2>
            <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-300">
              No como una app aislada, sino como una extensión natural del sistema: lo que coordinación define,
              el operador lo ejecuta y lo devuelve al control central en tiempo real.
            </p>
          </div>

          <div className="space-y-4">
            {operatorSteps.map((step, index) => (
              <div
                key={step}
                className="js-operator-step flex items-start gap-4 rounded-[2rem] border border-slate-200/70 bg-white/90 px-5 py-5 will-change-transform dark:border-slate-800/80 dark:bg-slate-950/65"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white dark:bg-sky-400 dark:text-slate-950">
                  0{index + 1}
                </div>
                <div>
                  <p className="text-base leading-7 text-slate-700 dark:text-slate-200">{step}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="js-reveal px-6 pb-16 sm:px-8 lg:px-12 lg:pb-24">
        <div className="mx-auto flex max-w-[92rem] flex-col gap-8 rounded-[3rem] bg-slate-950 px-8 py-10 text-white shadow-[0_60px_140px_-80px_rgba(2,19,89,0.8)] lg:flex-row lg:items-end lg:justify-between lg:px-12 lg:py-14 dark:border dark:border-sky-400/15 dark:bg-[linear-gradient(135deg,#07101f,#041d49)] dark:shadow-[0_60px_160px_-85px_rgba(2,132,199,0.38)]">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.26em] text-sky-300/75">Entrar a Tenaxis</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-balance sm:text-5xl lg:text-6xl text-white">
              Una homepage más silenciosa, más abierta y mucho más alineada con una marca premium.
            </h2>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-14 rounded-full bg-white px-8 text-slate-950 hover:bg-slate-100"
            >
              <Link href="/iniciar-sesion">Entrar ahora</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-14 rounded-full border-white/25 bg-white/10 px-8 text-white hover:bg-white/16 dark:border-sky-200/30 dark:text-sky-50"
            >
              <Link href="/registro">
                Crear cuenta
                <Smartphone className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
