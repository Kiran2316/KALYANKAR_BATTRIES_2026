import React from "react";
import { useLang } from "../i18n.jsx";

const links = [
  { key: "home", href: "#home" },
  { key: "workshop", href: "#workshop" },
  { key: "products", href: "#products" },
  { key: "about", href: "#about" },
  { key: "contact", href: "#contact" },
];

const socials = [
  { 
    icon: "/img/facebooklogo.png", 
    label: "Facebook", 
    href: "https://www.facebook.com/share/1ELxNekiX2/" 
  },
  { 
    icon: "/img/instalogo.png", 
    label: "Instagram", 
    href: "https://www.instagram.com/kalyankar_batteries_7273?igsh=NDJtYmE3eXhibXpy" 
  },
  { 
    icon: "/img/WhatsApplogo.png", 
    label: "WhatsApp", 
    href: "https://wa.me/917745047273" 
  },
];

export default function Footer({ onOpenLogin }) {
  const { t } = useLang();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-matte border-t border-gold/15 pt-16 pb-8 px-4 md:px-8">
      <div className="section-inner grid md:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-9 h-9 rounded-full border border-gold flex items-center justify-center text-gold font-display">K</span>
            <span className="font-display text-lg gold-text">Kalyankar Batteries</span>
          </div>
          <p className="text-white/50 text-sm leading-relaxed">{t.footer.desc}</p>
        </div>

        <div>
          <h4 className="text-gold text-sm tracking-widest mb-4">{t.footer.quickLinks.toUpperCase()}</h4>
          <ul className="space-y-2">
            {links.map((l) => (
              <li key={l.key}>
                <a href={l.href} className="text-white/60 text-sm hover:text-gold transition-colors">
                  {t.nav[l.key]}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-gold text-sm tracking-widest mb-4">{t.footer.contactInfo.toUpperCase()}</h4>
          <ul className="space-y-2 text-sm text-white/60">
            <li>Gargoti-Kolhapur Main Road, Gargoti - 416209</li>
            <li><a href="tel:9420007273" className="hover:text-gold">9420007273</a></li>
            <li><a href="mailto:kalyankarbatteries7273@gmail.com" className="hover:text-gold break-all">kalyankarbatteries7273@gmail.com</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-gold text-sm tracking-widest mb-4">SOCIAL</h4>
          <div className="flex gap-3 mb-6">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                aria-label={s.label}
                className="w-10 h-10 rounded-full glass flex items-center justify-center hover:border-gold hover:shadow-goldGlow transition-all duration-300 overflow-hidden p-2"
              >
                <img src={s.icon} alt={s.label} className="w-full h-full object-contain" />
              </a>
            ))}
          </div>
          <button
            onClick={onOpenLogin}
            className="px-4 py-2 rounded-full border border-gold text-gold text-xs font-semibold hover:bg-gold hover:text-matte transition-colors duration-300"
          >
            {t.footer.login}
          </button>
        </div>
      </div>

      <div className="section-inner mt-12 pt-6 border-t border-white/10 text-center text-white/40 text-xs">
        © {year} Kalyankar Batteries. {t.footer.rights}
      </div>
    </footer>
  );
}
