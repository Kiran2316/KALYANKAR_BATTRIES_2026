import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "../i18n.jsx";
import logoImg from "../assets/kbgremove.png"; 

const links = [
  { key: "home", href: "#home" },
  { key: "workshop", href: "#workshop" },
  { key: "certificates", href: "#certificates" },
  { key: "brands", href: "#brands" },
  { key: "products", href: "#products" },
  { key: "why", href: "#why" },
  { key: "about", href: "#about" },
  { key: "contact", href: "#contact" },
];

export default function Navbar({ onOpenLogin, showLoginBtn, onLogoClick }) {
  const { lang, t, toggleLang } = useLang();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-matte/90 backdrop-blur-md shadow-goldGlow py-2" : "bg-transparent py-4"
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 md:px-8">
        {/* लोगोची साईज मोठी ठेवली आहे पण ग्लो काढून टाकला आहे */}
        <button onClick={onLogoClick} className="flex items-center select-none bg-transparent border-0 p-0" aria-label="Kalyankar Group logo">
          <img 
            src={logoImg} 
            alt="Kalyankar Group Logo" 
            className="h-16 md:h-24 w-auto object-contain" 
          />
        </button>

        <nav className="hidden lg:flex items-center gap-6">
          {links.map((l) => (
            <a key={l.key} href={l.href} className="text-sm text-white/80 hover:text-gold transition-colors duration-300 relative group">
              {t.nav[l.key]}
              <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-gold transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1 glass rounded-full p-1">
            <button onClick={() => toggleLang("en")} className={`px-3 py-1 rounded-full text-xs transition-all duration-300 ${lang === "en" ? "bg-gold text-matte font-semibold" : "bg-transparent text-white/90"}`}>
              🇬🇧 English
            </button>
            <button onClick={() => toggleLang("mr")} className={`landing-language-marathi px-3 py-1 rounded-full text-xs transition-all duration-300 ${lang === "mr" ? "bg-gold text-matte font-semibold" : "bg-transparent text-white/90"}`}>
              🇮🇳 मराठी
            </button>
          </div>

          <AnimatePresence>
            {showLoginBtn && (
              <motion.button
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                onClick={onOpenLogin}
                className="hidden sm:inline-block btn-ripple px-4 py-1.5 rounded-full border border-gold text-gold text-xs font-semibold hover:bg-gold hover:text-matte transition-colors duration-300"
              >
                {t.nav.login}
              </motion.button>
            )}
          </AnimatePresence>

          <button className="lg:hidden text-gold text-2xl leading-none" onClick={() => setMenuOpen((v) => !v)} aria-label="Toggle menu">
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="lg:hidden overflow-hidden bg-matte/95 backdrop-blur-md border-t border-gold/20 mt-3"
          >
            <div className="flex flex-col px-6 py-4 gap-4">
              {links.map((l) => (
                <a key={l.key} href={l.href} onClick={() => setMenuOpen(false)} className="text-white/85 hover:text-gold text-sm">
                  {t.nav[l.key]}
                </a>
              ))}
              <div className="flex gap-2 pt-2 border-t border-white/10">
                <button onClick={() => toggleLang("en")} className={`px-3 py-1 rounded-full text-xs ${lang === "en" ? "bg-gold text-matte" : "bg-transparent text-white/90 border border-white/20"}`}>🇬🇧 English</button>
                <button onClick={() => toggleLang("mr")} className={`landing-language-marathi px-3 py-1 rounded-full text-xs ${lang === "mr" ? "bg-gold text-matte" : "bg-transparent text-white/90 border border-white/20"}`}>🇮🇳 मराठी</button>
              </div>
              {showLoginBtn && (
                <button onClick={onOpenLogin} className="mt-1 px-4 py-2 rounded-full border border-gold text-gold text-xs font-semibold text-left">
                  {t.nav.login}
                </button>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
