import { useEffect, useRef, useState } from "react";

// Fades and lifts its content in once, when it first scrolls into view.
// The rest state is visible: without JS or with reduced motion nothing hides.
export default function Reveal({ as: Tag = "div", className = "", children, ...rest }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag ref={ref} className={`reveal${shown ? " reveal--in" : ""} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}
