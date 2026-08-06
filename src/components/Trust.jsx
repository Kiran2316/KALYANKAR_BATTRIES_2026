import React, { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useLang } from "../i18n.jsx";

function useCountUp(target, inView, duration = 1800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let start = null;
    let raf;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setValue(Math.floor(progress * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, duration]);
  return value;
}

export default function Trust() {
  const { t } = useLang();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const count = useCountUp(25, inView);
  const circumference = 2 * Math.PI * 90;
  const progress = Math.min(count / 25, 1);

  return (
    <section className="section bg-matte relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{ background: "radial-gradient(circle at 50% 50%, rgba(212,175,55,0.15), transparent 60%)" }}
      />
      <div className="section-inner grid md:grid-cols-2 gap-14 items-center relative z-10" ref={ref}>
        <div className="flex justify-center">
          <div className="relative w-64 h-64">
            <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
              <circle cx="100" cy="100" r="90" stroke="rgba(255,255,255,0.08)" strokeWidth="10" fill="none" />
              <motion.circle
                cx="100"
                cy="100"
                r="90"
                stroke="#D4AF37"
                strokeWidth="10"
                strokeLinecap="round"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress)}
                style={{ filter: "drop-shadow(0 0 8px rgba(212,175,55,0.7))" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-5xl font-bold gold-text">{count}+</span>
              <span className="text-xs tracking-[0.3em] text-white/60 mt-2">{t.trust.title.toUpperCase()}</span>
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7 }}
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-5 gold-text">{t.trust.title}</h2>
          <p className="text-white/70 leading-relaxed text-sm md:text-base">{t.trust.desc}</p>
        </motion.div>
      </div>
    </section>
  );
}
