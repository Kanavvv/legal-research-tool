import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "./motion";

// A muted background video that fades in once it can play, loads only when
// it comes near the screen, and pauses when it scrolls away. With reduced
// motion it stays on its first frame.
export default function FadeVideo({ src, className = "" }) {
  const ref = useRef(null);
  const [near, setNear] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setNear(true);
        if (!el.src) return;
        if (entry.isIntersecting && !prefersReducedMotion()) el.play().catch(() => {});
        else el.pause();
      },
      { rootMargin: "300px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near]);

  return (
    <video
      ref={ref}
      className={`fade-video${ready ? " fade-video--in" : ""} ${className}`}
      src={near ? src : undefined}
      muted
      loop
      playsInline
      autoPlay={!prefersReducedMotion()}
      preload="metadata"
      aria-hidden="true"
      tabIndex={-1}
      onLoadedData={() => setReady(true)}
    />
  );
}
