/**
 * Public announcement rail: banner slider + running-text ticker.
 *
 * Data comes from the admin-managed tables through `getPublicAnnouncements`,
 * which already filters out inactive, not-yet-started and expired rows.
 * Notifications published by admins are pushed into the notification store so
 * the bell badge always reflects real data.
 */
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight, Megaphone } from "lucide-react";
import { getPublicAnnouncements } from "@/lib/public-content.functions";
import { setRemoteNotifications } from "@/lib/notification-store";
import { useSettings } from "@/lib/app-settings";

export function useAnnouncements() {
  const { lang } = useSettings();
  const fetchContent = useServerFn(getPublicAnnouncements);

  const query = useQuery({
    queryKey: ["public-announcements", lang],
    queryFn: () => fetchContent({ data: { lang } }),
    staleTime: 60_000,
    retry: false,
  });

  useEffect(() => {
    if (query.data) setRemoteNotifications(query.data.notifications);
  }, [query.data]);

  return query;
}

const AUTOPLAY_MS = 5000;

export function AnnouncementRail() {
  const { data } = useAnnouncements();
  const banners = data?.banners ?? [];
  const ticker = data?.runningText ?? [];

  if (banners.length === 0 && ticker.length === 0) return null;

  return (
    <div className="space-y-3">
      {ticker.length > 0 && <RunningTicker messages={ticker.map((t) => t.message)} />}
      {banners.length > 0 && <BannerSlider banners={banners} />}
    </div>
  );
}

function RunningTicker({ messages }: { messages: string[] }) {
  const text = messages.join("   •   ");
  return (
    <div className="glass-card flex items-center gap-3 overflow-hidden px-3 py-2">
      <Megaphone className="h-4 w-4 shrink-0" style={{ color: "#FFD76A" }} />
      <div className="relative min-w-0 flex-1 overflow-hidden">
        <div className="whitespace-nowrap text-xs text-emerald-100/85 anim-marquee">
          {text}
          <span className="mx-6 opacity-40">|</span>
          {text}
        </div>
      </div>
    </div>
  );
}

type Banner = {
  id: string;
  title: string | null;
  description: string | null;
  image: string | null;
  link: string | null;
};

export function BannerSlider({ banners }: { banners: Banner[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const startX = useRef<number | null>(null);
  const count = banners.length;

  const go = (dir: number) => setIndex((i) => (i + dir + count) % count);

  useEffect(() => {
    if (paused || count < 2) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [paused, count]);

  const current = banners[Math.min(index, count - 1)];
  if (!current) return null;

  const body = (
    <>
      {current.image ? (
        <img
          src={current.image}
          alt={current.title ?? "Announcement banner"}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(120deg,#0B1A12,#12351D)" }}
        />
      )}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(90deg, rgba(5,8,6,.9), rgba(5,8,6,.25) 70%)" }}
      />
      <div className="relative grid min-h-[128px] content-end gap-1 p-4 sm:min-h-[160px]">
        {current.title && (
          <h3 className="truncate font-display text-lg gold-shimmer sm:text-xl">{current.title}</h3>
        )}
        {current.description && (
          <p className="line-clamp-2 text-xs text-emerald-100/75 sm:text-sm">{current.description}</p>
        )}
      </div>
    </>
  );

  return (
    <div
      className="glass-card relative overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        setPaused(true);
        startX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const x0 = startX.current;
        const x1 = e.changedTouches[0]?.clientX ?? null;
        if (x0 !== null && x1 !== null && Math.abs(x1 - x0) > 40) go(x1 < x0 ? 1 : -1);
        startX.current = null;
        setPaused(false);
      }}
      role="region"
      aria-label="Announcements"
    >
      {current.link ? (
        <a href={current.link} target="_blank" rel="noopener noreferrer" className="block">
          {body}
        </a>
      ) : (
        body
      )}

      {count > 1 && (
        <>
          <button
            onClick={() => go(-1)}
            aria-label="Previous banner"
            className="absolute left-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full glass-card active:scale-95"
          >
            <ChevronLeft className="h-4 w-4" style={{ color: "#FFD76A" }} />
          </button>
          <button
            onClick={() => go(1)}
            aria-label="Next banner"
            className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full glass-card active:scale-95"
          >
            <ChevronRight className="h-4 w-4" style={{ color: "#FFD76A" }} />
          </button>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
            {banners.map((b, i) => (
              <button
                key={b.id}
                onClick={() => setIndex(i)}
                aria-label={`Go to banner ${i + 1}`}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: i === index ? 18 : 6,
                  background: i === index ? "#FFD76A" : "rgba(230,255,235,.35)",
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
