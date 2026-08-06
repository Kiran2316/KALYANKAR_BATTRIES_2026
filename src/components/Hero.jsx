import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { useLang } from "../i18n.jsx";
import secondLogoImg from "../assets/kbremove.png";
import batteryImg from "../assets/battery.png"; // येथे बॅटरी इम्पोर्ट केली आहे (तुमच्या फाईलचे नाव तपासून घ्या)

function Particles() {
  const particles = useMemo(
    () =>
      Array.from({ length: 35 }).map((_, i) => ({
        id: i,
        size: 2 + Math.random() * 3.5,
        top: Math.random() * 100,
        left: Math.random() * 100,
        duration: 4 + Math.random() * 5,
        delay: Math.random() * 4,
      })),
    []
  );
  return (
    <div className="particles absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="particle absolute rounded-full bg-gold shadow-[0_0_10px_rgba(212,175,55,0.9)]"
          style={{ width: p.size, height: p.size, top: `${p.top}%`, left: `${p.left}%` }}
          animate={{
            y: [0, -50, 0],
            opacity: [0.15, 0.9, 0.15],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

function BatteryGraphic() {
  return (
    <div className="relative mx-auto flex items-center justify-center w-full">
      <div className="relative flex justify-center items-center w-full">
        <img 
          src={batteryImg} 
          alt="Inverter Battery" 
          className="w-[340px] sm:w-[520px] md:w-[680px] lg:w-[900px] xl:w-[1100px] max-w-none h-auto object-contain filter drop-shadow-[0_0_35px_rgba(212,175,55,0.6)] contrast-125 brightness-110 animate-pulse"
        />
      </div>
    </div>
  );
}

export default function Hero() {
  const { t } = useLang();

  return (
    <section id="home" className="relative min-h-screen flex items-center overflow-hidden bg-[#000000] pt-24 md:pt-28 pb-16">
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 30%, rgba(212,175,55,0.12) 0%, transparent 60%), #000000",
        }}
      />
      
      <Particles />

      <div className="section-inner relative z-10 grid md:grid-cols-2 gap-12 items-center px-4 md:px-12 w-full max-w-7xl mx-auto">
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-4 inline-flex items-center px-5 py-2 rounded-full border border-gold/40 bg-black/60 backdrop-blur-xl shadow-[0_0_15px_rgba(212,175,55,0.2)]"
          >
            <span className="text-xs sm:text-sm font-semibold tracking-widest text-gold uppercase">
              ✨ Since 1998 • Trusted Quality
            </span>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ duration: 0.7, delay: 0.2 }} 
            className="mb-6 flex justify-center w-full md:justify-start"
          >
            <img 
              src={secondLogoImg} 
              alt="Kalyankar Batteries Logo" 
              className="h-40 sm:h-52 md:h-64 w-auto object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.9)] filter brightness-110" 
            />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35 }}
            className="text-base sm:text-lg md:text-xl text-white/90 font-light max-w-lg leading-relaxed"
          >
            {t.hero.subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-8 flex flex-wrap justify-center md:justify-start gap-4 w-full"
          >
            <a
              href="tel:9420007273"
              className="btn-ripple px-8 py-3.5 rounded-full bg-gradient-to-r from-gold via-yellow-400 to-yellow-500 text-black font-bold text-sm sm:text-base shadow-[0_0_25px_rgba(212,175,55,0.4)] hover:shadow-[0_0_35px_rgba(212,175,55,0.7)] hover:scale-105 transition-all duration-300 flex items-center gap-2"
            >
              📞 {t.hero.callNow}
            </a>
            <a
              href="https://wa.me/917745047273"
              target="_blank"
              rel="noreferrer"
              className="btn-ripple px-8 py-3.5 rounded-full bg-black/60 border border-gold/40 text-white font-semibold text-sm sm:text-base backdrop-blur-xl hover:bg-gold/20 hover:border-gold hover:scale-105 transition-all duration-300 flex items-center gap-2 shadow-xl"
            >
              💬 {t.hero.whatsapp}
            </a>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.3 }}
          className="flex justify-center"
        >
          <BatteryGraphic />
        </motion.div>
      </div>

      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 1.8, repeat: Infinity }}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 text-gold/80 text-xs tracking-[0.4em] font-medium"
      >
        SCROLL
      </motion.div>
    </section>
  );
}