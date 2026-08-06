import React from "react";
import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { useLang } from "../i18n.jsx";

function Stat({ target, suffix, label }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [val, setVal] = useState(0);
  
  useEffect(() => {
    if (!inView) return;
    let start = null;
    let raf;
    const duration = 1500;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.floor(p * target));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, target]);

  return (
    <div ref={ref} className="text-center">
      <div className="font-display text-3xl md:text-4xl font-bold gold-text drop-shadow-[0_0_12px_rgba(212,175,55,0.6)]">
        {val}
        {suffix}
      </div>
      <div className="text-xs md:text-sm text-white font-bold mt-1 tracking-wide drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] group-hover:text-gold transition-colors">
        {label}
      </div>
    </div>
  );
}

export default function About() {
  const { t } = useLang();

  return (
    <section id="about" className="section bg-matte py-24 relative overflow-hidden">
      <div className="section-inner max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-14 items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7 }}
        >
          <p className="eyebrow text-gold tracking-widest uppercase text-sm mb-2 font-semibold">{t.about.eyebrow}</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold mt-2 mb-6 gold-text">{t.about.title}</h2>
          <p className="text-white/70 leading-relaxed text-sm md:text-base mb-4">{t.about.desc1}</p>
          <p className="text-white/70 leading-relaxed text-sm md:text-base">{t.about.desc2}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7 }}
          className="glass rounded-2xl p-8 grid grid-cols-3 gap-6 bg-charcoal/40 border border-gold/20 shadow-[0_0_25px_rgba(212,175,55,0.15)] group"
        >
          <Stat target={25} suffix="+" label={t.about.stat1} />
          <Stat target={25} suffix="k+" label={t.about.stat2} />
          <Stat target={100} suffix="%" label={t.about.stat3} />
        </motion.div>
      </div>
    </section>
  );
}