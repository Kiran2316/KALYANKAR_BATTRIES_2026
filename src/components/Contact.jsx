import React from "react";
import { motion } from "framer-motion";
import { useLang } from "../i18n.jsx";

export default function Contact() {
  const { t } = useLang();

  return (
    <section id="contact" className="section bg-charcoal py-24 relative overflow-hidden">
      <div className="section-inner max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <p className="eyebrow text-gold tracking-widest uppercase text-sm mb-2 font-semibold">{t.contact.eyebrow}</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold mt-2 gold-text">{t.contact.title}</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-10 items-stretch">
          {/* डावी बाजू: दुकानची माहिती आणि थेट कॉल/व्हॉट्सॲप बटन्स */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="glass rounded-2xl p-7 space-y-5 flex flex-col justify-between border border-gold/20 shadow-[0_0_25px_rgba(212,175,55,0.15)]"
          >
            <div className="space-y-4">
              {/* दुकानचे नाव */}
              <div>
                <p className="text-xs text-gold tracking-widest mb-1 uppercase font-semibold">STORE NAME</p>
                <h3 className="text-white text-xl md:text-2xl font-bold font-display gold-text drop-shadow-[0_0_10px_rgba(212,175,55,0.4)]">
                  Kalyankar Batteries
                </h3>
              </div>

              {/* पत्ता */}
              <div>
  <p className="text-xs text-gold tracking-widest mb-1 uppercase font-semibold">
    {t.contact.address || "ADDRESS"}
  </p>
  <p className="text-white/80 text-sm leading-relaxed whitespace-pre-line">
    {t.contact.addressValue}
  </p>
</div>
              {/* मोबाईल नंबर */}
              <div>
                <p className="text-xs text-gold tracking-widest mb-1 uppercase font-semibold">{t.contact.mobile || "MOBILE NO"}</p>
                <a href="tel:9420007273" className="text-white/90 text-sm hover:text-gold font-semibold transition-colors">
                  9420007273
                </a>
              </div>

              {/* व्हॉट्सॲप नंबर */}
              <div>
                <p className="text-xs text-gold tracking-widest mb-1 uppercase font-semibold">{t.contact.whatsapp || "WHATSAPP NO"}</p>
                <a href="https://wa.me/917745047273" target="_blank" rel="noreferrer" className="text-white/90 text-sm hover:text-gold font-semibold transition-colors">
                  7745047273
                </a>
              </div>

              {/* ईमेल */}
              <div>
                <p className="text-xs text-gold tracking-widest mb-1 uppercase font-semibold">{t.contact.email || "EMAIL"}</p>
                <a href="mailto:kalyankarbatteries7273@gmail.com" className="text-white/90 text-sm hover:text-gold font-semibold transition-colors break-all">
                  kalyankarbatteries7273@gmail.com
                </a>
              </div>

              {/* वेळ */}
              <div>
                <p className="text-xs text-gold tracking-widest mb-1 uppercase font-semibold">{t.contact.timing || "TIMING"}</p>
                <p className="text-white/80 text-sm">{t.contact.timingValue || "Mon - Sat: 9:00 AM - 8:00 PM"}</p>
                <p className="text-white/50 text-xs mt-0.5">{t.contact.saturday || "Sunday: Open"}</p>
              </div>
            </div>

            {/* कॉल आणि व्हॉट्सॲप थेट जोडणी करणारे बटन्स */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-white/10">
              <a
                href="tel:9420007273"
                className="btn-ripple flex-1 text-center px-5 py-3 rounded-xl bg-gold text-matte text-xs md:text-sm font-bold shadow-[0_0_15px_rgba(212,175,55,0.4)] hover:scale-[1.02] transition-transform"
              >
                📞 Call Now
              </a>
              <a
                href="https://wa.me/917745047273?text=Hello%20Kalyankar%20Batteries,%20I%20want%20to%20know%20more%20about%20your%20batteries."
                target="_blank"
                rel="noreferrer"
                className="btn-ripple flex-1 text-center px-5 py-3 rounded-xl bg-green-600 text-white text-xs md:text-sm font-bold shadow-[0_0_15px_rgba(34,197,94,0.4)] hover:scale-[1.02] transition-transform"
              >
                💬 WhatsApp Chat
              </a>
            </div>
          </motion.div>

          {/* उजवी बाजू: अचूक गुगल मॅप जोडलेला आहे */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="glass rounded-2xl p-4 flex flex-col border border-gold/20 shadow-[0_0_25px_rgba(212,175,55,0.15)] overflow-hidden min-h-[400px]"
          >
            <div className="mb-3 px-2 flex justify-between items-center">
              <p className="text-xs text-gold tracking-widest uppercase font-semibold">OUR LOCATION</p>
              <a
                href="https://maps.app.goo.gl/8gCd9e1RgJzAPevr7?g_st=ac"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-white/80 hover:text-gold underline font-medium"
              >
                Open in Google Maps 📍
              </a>
            </div>
            
            {/* Google Map Embed iframe */}
            <div className="w-full h-full flex-1 rounded-xl overflow-hidden border border-white/10">
              <iframe
                title="Kalyankar Batteries Location Map"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3829.119583775185!2d74.13948797592526!3d16.3168329327603!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bc05e17337bc12d%3A0x82ec18ddc457796f!2sKALYANKAR%20BATTERIES!5e0!3m2!1sen!2sin!4v1784632075200!5m2!1sen!2sin"
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: "380px" }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              ></iframe>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}