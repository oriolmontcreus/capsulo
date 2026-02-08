import { ArrowRight } from "lucide-react";
import { lazy, Suspense, useState } from "react";

const Dithering = lazy(() =>
  import("@paper-design/shaders-react").then((mod) => ({
    default: mod.Dithering,
  }))
);

interface ShaderHeroProps {
  badge?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  ctaText?: string;
  ctaHref?: string;
}

export default function ShaderHero({
  badge = "AI-Powered Platform",
  title = "Your words,",
  subtitle = "delivered perfectly.",
  description = "Join 2,847 founders using the only AI that understands the nuance of your voice. Clean, precise, and uniquely yours.",
  ctaText = "Get Started",
  ctaHref = "/",
}: ShaderHeroProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <section className="flex w-full items-center justify-center">
      <div
        className="relative w-full"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden border-0 bg-card duration-500">
          <Suspense fallback={<div className="absolute inset-0 bg-muted/20" />}>
            <div className="pointer-events-none absolute inset-0 z-0 opacity-40 mix-blend-multiply dark:opacity-30 dark:mix-blend-screen">
              <Dithering
                className="size-full"
                colorBack="#00000000"
                colorFront="rgb(43, 127, 255)"
                minPixelRatio={1}
                shape="warp"
                speed={isHovered ? 0.6 : 0.2}
                type="4x4"
              />
            </div>
          </Suspense>

          <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 text-center">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/5 px-4 py-1.5 font-medium text-primary text-sm backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              {badge}
            </div>

            <h2 className="mb-8 font-medium font-serif text-5xl text-foreground leading-[1.05] tracking-tight md:text-7xl lg:text-8xl">
              {title} <br />
              <span className="text-foreground/80">{subtitle}</span>
            </h2>

            <p className="mb-12 max-w-2xl text-lg text-muted-foreground leading-relaxed md:text-xl">
              {description}
            </p>

            <a
              className="group relative inline-flex h-14 items-center justify-center gap-3 overflow-hidden rounded-full bg-primary px-12 font-medium text-base text-primary-foreground transition-all duration-300 hover:scale-105 hover:bg-primary/90 hover:ring-4 hover:ring-primary/20 active:scale-95"
              href={ctaHref}
            >
              <span className="relative z-10">{ctaText}</span>
              <ArrowRight className="relative z-10 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
