import React from "react";
import { motion } from "framer-motion";
import { useLang } from "../i18n.jsx";

const items = [
  { key: "genuine", icon: "✓" },
  { key: "warranty", icon: "🛡" },
  { key: "expert", icon: "🔧" },
  { key: "fast", icon: "⚡" },
  { key: "price", icon: "₹" },
  { key: "delivery", icon: "🚚" },
];

export default function WhyChooseUs() {
  const { t } = useLang();

  return (
    <section id="why" className="section bg-charcoal">
      <div className="section-inner">
        <div className="text-center mb-12">
          <p className="eyebrow">{t.why.eyebrow}</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold mt-2 gold-text">{t.why.title}</h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item, i) => (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.07 }}
              className="glass rounded-2xl p-6 flex items-start gap-4 hover:shadow-goldGlow transition-shadow duration-300"
            >
              <span className="w-11 h-11 flex-shrink-0 rounded-full bg-gold/10 flex items-center justify-center text-gold text-lg">
                {item.icon}
              </span>
              <div>
                <h3 className="font-semibold text-white mb-1">{t.why.items[item.key].title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{t.why.items[item.key].desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
