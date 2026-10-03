import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCarousel, type CarouselSlide } from "@/api/carousel";
import { cn } from "@/lib/utils";

const AUTOPLAY_MS = 5000;

function SlideInner({ slide }: { slide: CarouselSlide }) {
  return (
    <>
      <img
        src={slide.image_url}
        alt={slide.title ?? ""}
        className="h-full w-full object-cover"
        loading="lazy"
      />
      {(slide.title || slide.subtitle) && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/80 via-slate-900/40 to-transparent p-5 sm:p-8">
          {slide.title && (
            <h2 className="text-lg font-semibold text-white sm:text-2xl">
              {slide.title}
            </h2>
          )}
          {slide.subtitle && (
            <p className="mt-1 max-w-2xl text-sm text-white/85 sm:text-base">
              {slide.subtitle}
            </p>
          )}
        </div>
      )}
    </>
  );
}

export function Carousel() {
  const { data: slides } = useCarousel();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides?.length ?? 0;

  const go = useCallback(
    (next: number) => {
      if (count === 0) return;
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  // index taşmasını engelle (slide silinince)
  const clampRef = useRef(index);
  clampRef.current = index;
  useEffect(() => {
    if (count > 0 && clampRef.current >= count) setIndex(0);
  }, [count]);

  useEffect(() => {
    if (paused || count <= 1) return;
    const t = window.setInterval(() => go(index + 1), AUTOPLAY_MS);
    return () => window.clearInterval(t);
  }, [index, paused, count, go]);

  if (!slides || count === 0) return null;

  const current = slides[Math.min(index, count - 1)];

  return (
    <section
      className="group relative aspect-[16/7] w-full overflow-hidden rounded-2xl border bg-muted"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      {current.link_url ? (
        <a
          href={current.link_url}
          className="absolute inset-0"
          aria-label={current.title ?? "Slide"}
        >
          <SlideInner slide={current} />
        </a>
      ) : (
        <SlideInner slide={current} />
      )}

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Önceki"
            className="absolute left-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-slate-800 opacity-0 shadow transition-opacity hover:bg-white group-hover:opacity-100 focus-visible:opacity-100"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Sonraki"
            className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-slate-800 opacity-0 shadow transition-opacity hover:bg-white group-hover:opacity-100 focus-visible:opacity-100"
          >
            <ChevronRight className="size-5" />
          </button>

          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`${i + 1}. görsele git`}
                aria-current={i === index}
                className={cn(
                  "size-2 rounded-full bg-white/60 transition-all",
                  i === index && "w-5 bg-white",
                )}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
