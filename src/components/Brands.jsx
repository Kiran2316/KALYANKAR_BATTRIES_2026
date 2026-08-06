import React from "react";
import { useLang } from "../i18n.jsx";

const brands = [
  { id: 1, name: "Exide", logo: "/img/Exide.png" },
  { id: 2, name: "Amaron", logo: "/img/Amaron.png" },
  { id: 3, name: "Sf-sonic", logo: "/img/Sf-sonic.png" },
  { id: 4, name: "Powerzone", logo: "/img/Powerzone.png" },
  { id: 5, name: "Tata green", logo: "/img/Tata green.png" },
  { id: 6, name: "Bosch", logo: "/img/Bosch.png" },
  { id: 7, name: "Luminous", logo: "/img/Luminous.jpeg" },
  { id: 8, name: "Microtek", logo: "/img/Microtek.png" },
];

export default function Brands() {
  const { t } = useLang();
  const loop = [...brands, ...brands];

  return (
    <section id="brands" className="section bg-charcoal overflow-hidden">
      <div className="section-inner max-w-6xl mx-auto px-4 mb-12">
        <div className="text-center">
          <p className="eyebrow">{t.brands?.eyebrow || "OUR PARTNERS"}</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold mt-2 gold-text">{t.brands?.title || "Trusted Brands"}</h2>
        </div>
      </div>

      <div className="relative overflow-hidden group">
        <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-charcoal to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-charcoal to-transparent z-10" />
        <div className="flex gap-10 w-max animate-scrollX group-hover:[animation-play-state:paused] items-center">
          {loop.map((b, i) => (
            <div
              key={i}
              className="glass rounded-xl px-6 py-4 flex items-center justify-center min-w-[180px] h-24 hover:shadow-goldGlow transition-shadow duration-300 bg-matte/50 border border-gold/20"
            >
              <img
                src={b.logo}
                alt={b.name}
                className={`object-contain transition-transform duration-300 hover:scale-105 ${
                  b.name === "Amaron"
                    ? "max-h-24 max-w-[190px]"
                    : ["Sf-sonic", "Microtek"].includes(b.name)
                    ? "max-h-20 max-w-[160px]"
                    : "max-h-14 max-w-[130px]"
                }`}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}