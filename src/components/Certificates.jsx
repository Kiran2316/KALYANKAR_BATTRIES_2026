import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "../i18n.jsx";

const certificates = [
  { id: 0, src: "/img/cert1.PNG" },
  { id: 1, src: "/img/cert2.PNG" },
  { id: 2, src: "/img/cert3.PNG" },
];

export default function Certificates() {
  const { t } = useLang();
  const [active, setActive] = useState(null);

  return (
    <section id="certificates" className="section bg-charcoal relative">
      <div className="section-inner max-w-5xl mx-auto px-4">
        <div className="text-center mb-12">
          <p className="eyebrow">{t.certificates?.eyebrow || "RECOGNITION"}</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold mt-2 gold-text">{t.certificates?.title || "Our Certificates"}</h2>
          <p className="text-white/60 max-w-xl mx-auto mt-4 text-sm md:text-base">
            {t.certificates?.desc || "Authorized certifications and awards for our quality service and dealership."}
          </p>
        </div>

        {/* ३ फोटोंची थेट ग्रीड (कोणतीही कार्ड बॉर्डर किंवा फ्रेम न ठेवता) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {certificates.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              whileHover={{ scale: 1.03 }}
              onClick={() => setActive(c)}
              className="cursor-pointer overflow-hidden rounded-xl shadow-xl group relative bg-matte"
            >
              <div className="h-72 w-full overflow-hidden flex items-center justify-center p-2">
                <img
                  src={c.src}
                  alt={c.title}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-3 text-center bg-matte/80 border-t border-gold/10">
                <span className="text-xs md:text-sm text-gold font-display font-semibold">{c.title}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* लाईटबॉक्स (फोटोवर क्लिक केल्यावर मोठा दिसेल) */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActive(null)}
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative rounded-2xl w-full max-w-3xl h-[75vh] bg-charcoal border border-gold/40 flex items-center justify-center p-4"
            >
              <img src={active.src} alt={active.title} className="w-full h-full object-contain" />
              <span className="absolute bottom-4 left-6 text-gold font-display text-base bg-matte/90 px-4 py-1 rounded-full border border-gold/30">
                {active.title}
              </span>
              <button
                onClick={() => setActive(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-matte border border-gold/30 text-white flex items-center justify-center hover:bg-gold hover:text-matte transition-colors"
              >
                ✕
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}