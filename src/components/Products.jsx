import React from "react";
import { motion } from "framer-motion";
import { useLang } from "../i18n.jsx";

const products = [
  { id: 1, key: "twowheeler", en: "Two Wheelers", mr: "दुचाकी वाहने" },
  { id: 2, key: "threewheeler", en: "Three Wheelers", mr: "तीन चाकी वाहने" },
  { id: 3, key: "passenger", en: "Passenger Vehicles", mr: "पॅसेंजर वाहने" },
  { id: 4, key: "commercial", en: "Commercial Vehicles", mr: "कमर्शियल वाहने" },
  { id: 5, key: "farm", en: "Farm Vehicles", mr: "शेतीची वाहने" },
  { id: 6, key: "inverter", en: "Inverters & Batteries", mr: "इन्व्हर्टर आणि बॅटरी" },
  { id: 7, key: "ev", en: "E-Vehicles", mr: "इलेक्ट्रिक वाहने" },
  { id: 8, key: "other", en: "Other Applications", mr: "इतर अनुप्रयोग" },
];

const icons = {
  twowheeler: (
    <svg className="w-10 h-10 stroke-gold transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3" fill="none" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 16l3-8h5l2 4h4M5 16a3 3 0 100 6 3 3 0 000-6zm11 0a3 3 0 100 6 3 3 0 000-6z" />
    </svg>
  ),
  threewheeler: (
    <svg className="w-10 h-10 stroke-gold transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3" fill="none" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16h14m-2 0a2 2 0 11-4 0m4 0a2 2 0 10-4 0M5 8h8l3 8H5V8z" />
    </svg>
  ),
  passenger: (
    <svg className="w-10 h-10 stroke-gold transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3" fill="none" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13l2-5h12l2 5v5H3v-5zm3 5a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000-4z" />
    </svg>
  ),
  commercial: (
    <svg className="w-10 h-10 stroke-gold transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3" fill="none" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 8h11v9H2V8zm11 3h5l3 3v3h-8v-6zM6 18a2 2 0 100-4 2 2 0 000 4zm11 0a2 2 0 100-4 2 2 0 000 4z" />
    </svg>
  ),
  farm: (
    <svg className="w-10 h-10 stroke-gold transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3" fill="none" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16h10V9H9L4 13v3zm10 0h3a2 2 0 002-2v-2l-5-3v7zM6 18a2 2 0 100-4 2 2 0 000 4zm11 0a2 2 0 100-4 2 2 0 000 4z" />
    </svg>
  ),
  inverter: (
    <svg className="w-10 h-10 stroke-gold transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3" fill="none" strokeWidth="1.5" viewBox="0 0 24 24">
      <rect x="3" y="6" width="18" height="12" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 10h10M7 14h6" />
    </svg>
  ),
  ev: (
    <svg className="w-10 h-10 stroke-gold transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3" fill="none" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 15h12l2-4H7L4 15zm3 3a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4z" />
    </svg>
  ),
  other: (
    <svg className="w-10 h-10 stroke-gold transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3" fill="none" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 18h18M6 18V9l6-4 6 4v9" />
    </svg>
  ),
};

export default function Products() {
  const { lang, t } = useLang(); // lang मध्ये वर्तमान भाषा ('en' किंवा 'mr') असते

  return (
    <section id="products" className="section bg-matte py-24 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gold/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="section-inner max-w-7xl mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <p className="eyebrow text-gold tracking-widest uppercase text-sm mb-2 font-semibold">
            {lang === "mr" ? "आमची उत्पादने" : (t.products?.eyebrow || "OUR RANGE")}
          </p>
          <h2 className="font-display text-3xl md:text-5xl font-bold mt-2 gold-text tracking-wide">
            {lang === "mr" ? "येथे प्रत्येक गरजेसाठी बॅटरी उपलब्ध आहे." : "Here's a Battery for Every Need"}
          </h2>
          <div className="w-24 h-1 bg-gold/50 mx-auto mt-4 rounded-full" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-6">
          {products.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              whileHover={{ y: -8, scale: 1.03 }}
              className="relative glass rounded-2xl p-5 flex flex-col items-center text-center group overflow-hidden bg-gradient-to-b from-charcoal/80 to-matte/90 border border-gold/20 hover:border-gold/80 hover:shadow-[0_0_25px_rgba(212,175,55,0.25)] transition-all duration-300 h-48 justify-center"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="w-14 h-14 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center mb-4 group-hover:bg-gold/20 group-hover:border-gold/50 transition-all duration-300 shadow-inner">
                {icons[item.key]}
              </div>

              <h3 className="font-display text-xs md:text-sm text-white font-bold tracking-wide drop-shadow-[0_0_10px_rgba(255,255,255,0.7)] group-hover:drop-shadow-[0_0_15px_rgba(255,255,255,1)] group-hover:text-gold transition-all duration-300 leading-snug">
                {lang === "mr" ? item.mr : item.en}
              </h3>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}