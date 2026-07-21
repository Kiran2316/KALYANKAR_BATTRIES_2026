import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import AOS from "aos";
import "aos/dist/aos.css";
import i18n from "i18next";
import { initReactI18next, useTranslation } from "react-i18next";
import {
  FaBatteryFull,
  FaCar,
  FaMotorcycle,
  FaTruck,
  FaTractor,
  FaBolt,
  FaWhatsapp,
  FaPhoneAlt,
  FaShieldAlt,
  FaTools,
  FaHandshake,
  FaMapMarkerAlt,
  FaTimes,
  FaCheckCircle,
  FaChargingStation,
  FaHome,
  FaCertificate,
} from "react-icons/fa";

const API_BASE = "https://your-existing-backend.com/api";
const LOGIN_ENDPOINT = `${API_BASE}/login`;
const GALLERY_ENDPOINT = `${API_BASE}/gallery`;
const CERTIFICATES_ENDPOINT = `${API_BASE}/certificates`;
const DASHBOARD_ROUTE = "/dashboard";

i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: {
        navHome: "Home",
        navAbout: "About",
        navBrands: "Brands",
        navProducts: "Products",
        navGallery: "Gallery",
        navContact: "Contact",
        heroTitle: "Kalyankar Batteries",
        heroSub: "Certified with Excellent Quality Since 1998",
        aboutText:
          "Kalyankar Batteries has proudly served customers for more than 25 years by providing genuine batteries, trusted brands, expert guidance, affordable pricing, and dependable after-sales support. Customer satisfaction and quality service have always been our highest priorities.",
      },
    },
    mr: {
      translation: {
        navHome: "मुख्यपृष्ठ",
        navAbout: "आमच्याबद्दल",
        navBrands: "ब्रँड्स",
        navProducts: "उत्पादने",
        navGallery: "गॅलरी",
        navContact: "संपर्क",
        heroTitle: "कल्याणकर बॅटरीज",
        heroSub: "1998 पासून उत्कृष्ट गुणवत्तेसह प्रमाणित",
        aboutText:
          "कल्याणकर बॅटरीजने 25 वर्षांहून अधिक काळ ग्राहकांना खरी उत्पादने, विश्वासार्ह ब्रँड्स, योग्य मार्गदर्शन, योग्य किंमत आणि उत्तम विक्रीनंतरची सेवा दिली आहे. ग्राहक समाधान आणि गुणवत्तापूर्ण सेवा ही आमची सर्वोच्च प्राथमिकता आहे.",
      },
    },
  },
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

const brands = [
  {
    name: "Exide",
    logo: "/assets/brands/exide.png",
    desc: "Reliable batteries for automotive, inverter, commercial and industrial needs.",
    categories: ["Two Wheeler", "Four Wheeler", "Commercial", "Inverter"],
  },
  {
    name: "Amaron",
    logo: "/assets/brands/amaron.png",
    desc: "Premium long-life batteries with strong performance and trusted service.",
    categories: ["Two Wheeler", "Four Wheeler", "Farm Vehicle", "Commercial"],
  },
  {
    name: "Powerzone",
    logo: "/assets/brands/powerzone.png",
    desc: "Affordable and dependable battery solutions for everyday applications.",
    categories: ["Automotive", "Inverter", "Other Applications"],
  },
  {
    name: "SF Sonic",
    logo: "/assets/brands/sf-sonic.png",
    desc: "Strong automotive and commercial batteries backed by dependable technology.",
    categories: ["Four Wheeler", "Truck", "Commercial", "Two Wheeler"],
  },
  {
    name: "Bosch",
    logo: "/assets/brands/bosch.png",
    desc: "Global-quality battery solutions for modern vehicles and high performance needs.",
    categories: ["Car", "Commercial", "Two Wheeler"],
  },
  {
    name: "Tata Green",
    logo: "/assets/brands/tata-green.png",
    desc: "Trusted Indian battery brand for automotive, inverter and tubular applications.",
    categories: ["Automotive", "Inverter", "Tubular", "Two Wheeler"],
  },
  {
    name: "Luminous",
    logo: "/assets/brands/luminous.png",
    desc: "Power backup solutions for homes, shops and offices.",
    categories: ["Inverter", "Inverter Batteries", "Home Backup"],
  },
];

const categories = [
  ["Two Wheeler Batteries", FaMotorcycle],
  ["Three Wheeler Batteries", FaBolt],
  ["Four Wheeler Batteries", FaCar],
  ["Commercial Vehicle Batteries", FaTruck],
  ["Farm Vehicle Batteries", FaTractor],
  ["Inverter & Inverter Batteries", FaBatteryFull],
  ["E-Vehicle Batteries", FaChargingStation],
  ["Other Applications", FaTools],
];

const features = [
  ["Quality Guarantee", FaShieldAlt],
  ["Quality Assurance", FaCheckCircle],
  ["Expert Guidance", FaTools],
  ["Trusted Partnership", FaHandshake],
];

const services = [
  ["Battery Sales", FaBatteryFull],
  ["Battery Replacement", FaTools],
  ["Battery Checkup", FaCheckCircle],
  ["Battery Charging", FaChargingStation],
  ["Battery Installation", FaBolt],
  ["Home Service", FaHome],
  ["Warranty Support", FaCertificate],
];

const whyChoose = [
  "Genuine Products",
  "Best Brands",
  "Affordable Prices",
  "Experienced Team",
  "Fast Service",
  "Customer Satisfaction",
];

function Counter({ to, suffix = "" }) {
  const ref = useRef(null);

  useEffect(() => {
    const obj = { value: 0 };
    gsap.to(obj, {
      value: to,
      duration: 2.2,
      ease: "power3.out",
      onUpdate: () => {
        if (ref.current) ref.current.textContent = `${Math.floor(obj.value)}${suffix}`;
      },
    });
  }, [to, suffix]);

  return <span ref={ref}>0{suffix}</span>;
}

export default function Home() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [logoClicks, setLogoClicks] = useState(0);
  const [loginOpen, setLoginOpen] = useState(false);
  const [gallery, setGallery] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [slide, setSlide] = useState(0);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });

  const fallbackGallery = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => ({
        id: i + 1,
        title: `Showroom Photo ${i + 1}`,
        image: `/assets/gallery/showroom-${i + 1}.jpg`,
      })),
    []
  );

  const fallbackCertificates = useMemo(
    () =>
      Array.from({ length: 3 }, (_, i) => ({
        id: i + 1,
        title: `Certificate ${i + 1}`,
        image: `/assets/certificates/certificate-${i + 1}.jpg`,
      })),
    []
  );

  useEffect(() => {
    AOS.init({ duration: 900, once: true, offset: 80 });

    const timer = setTimeout(() => setLoading(false), 1400);

    fetch(GALLERY_ENDPOINT)
      .then((r) => r.json())
      .then((data) => setGallery(Array.isArray(data) ? data : fallbackGallery))
      .catch(() => setGallery(fallbackGallery));

    fetch(CERTIFICATES_ENDPOINT)
      .then((r) => r.json())
      .then((data) => setCertificates(Array.isArray(data) ? data : fallbackCertificates))
      .catch(() => setCertificates(fallbackCertificates));

    return () => clearTimeout(timer);
  }, [fallbackGallery, fallbackCertificates]);

  useEffect(() => {
    const list = gallery.length ? gallery : fallbackGallery;
    const interval = setInterval(() => {
      setSlide((s) => (s + 1) % list.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [gallery, fallbackGallery]);

  function handleLogoClick() {
    const next = logoClicks + 1;
    setLogoClicks(next);
    if (next >= 3) {
      setLoginOpen(true);
      setLogoClicks(0);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();

    try {
      const res = await fetch(LOGIN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });

      if (!res.ok) throw new Error("Login failed");

      const data = await res.json();
      if (data.token) localStorage.setItem("token", data.token);
      window.location.href = DASHBOARD_ROUTE;
    } catch {
      alert("Login failed. Please check existing backend login API.");
    }
  }

  const activeGallery = gallery.length ? gallery : fallbackGallery;
  const activeCertificates = certificates.length ? certificates : fallbackCertificates;

  return (
    <>
      <style>{css}</style>

      <AnimatePresence>
        {loading && (
          <motion.div
            className="kb-loader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="loader-ring"></div>
            <h2>Kalyankar Batteries</h2>
            <p>Powering Trust Since 1998</p>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="kb-site">
        <nav className="kb-nav">
          <button className="brand-mark" onClick={handleLogoClick}>
            <span>KB</span>
            <strong>Kalyankar Batteries</strong>
          </button>

          <div className="nav-links">
            <a href="#home">{t("navHome")}</a>
            <a href="#about">{t("navAbout")}</a>
            <a href="#brands">{t("navBrands")}</a>
            <a href="#products">{t("navProducts")}</a>
            <a href="#gallery">{t("navGallery")}</a>
            <a href="#contact">{t("navContact")}</a>
          </div>

          <select
            className="lang-switch"
            defaultValue="en"
            onChange={(e) => i18n.changeLanguage(e.target.value)}
          >
            <option value="en">English</option>
            <option value="mr">मराठी</option>
          </select>
        </nav>

        <section id="home" className="hero">
          <div className="particles">
            {Array.from({ length: 32 }).map((_, i) => (
              <span key={i} style={{ "--i": i }} />
            ))}
          </div>

          <motion.div
            className="hero-copy"
            initial={{ opacity: 0, y: 35 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9 }}
          >
            <p className="eyebrow">Premium Battery Solutions</p>
            <h1>{t("heroTitle")}</h1>
            <h2>{t("heroSub")}</h2>
            <div className="hero-actions">
              <a className="gold-btn" href="tel:+919420007273">
                <FaPhoneAlt /> Call Now
              </a>
              <a className="glass-btn" href="#products">
                Explore Products
              </a>
            </div>
          </motion.div>

          <motion.div
            className="battery-visual"
            animate={{ y: [0, -18, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <div className="inverter">
              <div className="screen"></div>
              <div className="vents"></div>
            </div>
            <div className="battery">
              <FaBatteryFull />
              <span>100%</span>
            </div>
            <div className="gold-orbit"></div>
          </motion.div>
        </section>

        <section id="about" className="section about-grid">
          <div className="trust-card" data-aos="zoom-in">
            <strong><Counter to={25} suffix="+" /></strong>
            <span>Years</span>
            <p>Trusted</p>
          </div>

          <div className="glass-panel" data-aos="fade-up">
            <p className="eyebrow">About Us</p>
            <h2>Trusted Power Partner</h2>
            <p>{t("aboutText")}</p>
          </div>
        </section>

        <section className="section">
          <div className="section-heading" data-aos="fade-up">
            <p className="eyebrow">Why We Stand Apart</p>
            <h2>Premium Battery Solutions</h2>
          </div>

          <div className="counter-row">
            <div><strong><Counter to={25} suffix="+" /></strong><span>Years Trusted</span></div>
            <div><strong><Counter to={5000} suffix="+" /></strong><span>Happy Customers</span></div>
            <div><strong><Counter to={100} suffix="%" /></strong><span>Genuine Products</span></div>
          </div>
        </section>

        <section className="section">
          <div className="feature-grid">
            {features.map(([title, Icon]) => (
              <motion.div whileHover={{ y: -8, scale: 1.02 }} className="lux-card" key={title}>
                <Icon />
                <h3>{title}</h3>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="brands" className="section">
          <div className="section-heading">
            <p className="eyebrow">Our Brands</p>
            <h2>Authorized Premium Brands</h2>
          </div>

          <div className="marquee">
            <div className="marquee-track">
              {[...brands, ...brands].map((brand, i) => (
                <button key={`${brand.name}-${i}`} onClick={() => setSelectedBrand(brand)}>
                  <img src={brand.logo} alt={`${brand.name} battery logo`} />
                  <span>{brand.name}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section id="products" className="section">
          <div className="section-heading">
            <p className="eyebrow">Products</p>
            <h2>Battery Categories</h2>
          </div>

          <div className="category-grid">
            {categories.map(([name, Icon]) => (
              <motion.div
                className="lux-card category-card"
                key={name}
                whileHover={{ y: -10, scale: 1.03 }}
              >
                <Icon />
                <h3>{name}</h3>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section-heading">
            <p className="eyebrow">Services</p>
            <h2>Complete Battery Care</h2>
          </div>

          <div className="service-grid">
            {services.map(([name, Icon]) => (
              <div className="lux-card" data-aos="fade-up" key={name}>
                <Icon />
                <h3>{name}</h3>
              </div>
            ))}
          </div>

          <p className="service-note">
            Battery Checkup is a paid service and is not provided free of cost.
          </p>
        </section>

        <section className="section">
          <div className="section-heading">
            <p className="eyebrow">Why Choose Us</p>
            <h2>Built On Trust</h2>
          </div>

          <div className="why-grid">
            {whyChoose.map((item) => (
              <div className="why-item" key={item}>
                <FaCheckCircle /> {item}
              </div>
            ))}
          </div>
        </section>

        <section id="gallery" className="section">
          <div className="section-heading">
            <p className="eyebrow">Gallery</p>
            <h2>Showroom Gallery</h2>
          </div>

          <div className="gallery-slider">
            <button onClick={() => setSlide((slide - 1 + activeGallery.length) % activeGallery.length)}>‹</button>
            <AnimatePresence mode="wait">
              <motion.div
                key={slide}
                className="gallery-frame"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.04 }}
              >
                <img src={activeGallery[slide]?.image} alt={activeGallery[slide]?.title} />
                <span>{activeGallery[slide]?.title}</span>
              </motion.div>
            </AnimatePresence>
            <button onClick={() => setSlide((slide + 1) % activeGallery.length)}>›</button>
          </div>
        </section>

        <section className="section">
          <div className="section-heading">
            <p className="eyebrow">Certificates</p>
            <h2>Authorized & Certified</h2>
          </div>

          <div className="certificate-grid">
            {activeCertificates.map((cert) => (
              <motion.div className="certificate-card" whileHover={{ y: -8 }} key={cert.id}>
                <img src={cert.image} alt={cert.title} />
                <span>{cert.title}</span>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="contact" className="section contact-grid">
          <div className="glass-panel">
            <p className="eyebrow">Contact</p>
            <h2>Kalyankar Batteries</h2>
            <p><FaMapMarkerAlt /> Shinde Complex, Gargoti-Kolhapur Main Road, Near Swami Samarth Mangal Karyalay, Gargoti-Kolhapur Road, 416209</p>
            <p><FaPhoneAlt /> Phone: 9420007273</p>
            <p><FaWhatsapp /> WhatsApp: 7745047273</p>
            <p>Email: kalyankarbatteries7273@gmail.com</p>
            <p>Monday-Friday: 9:00 AM - 7:00 PM</p>
            <p>Saturday Closed</p>

            <div className="hero-actions">
              <a className="gold-btn" href="tel:+919420007273"><FaPhoneAlt /> Call</a>
              <a className="glass-btn" href="https://wa.me/917745047273"><FaWhatsapp /> WhatsApp</a>
            </div>
          </div>

          <div className="map-card">
            <iframe
              title="Kalyankar Batteries Location"
              src="https://www.google.com/maps?q=https://maps.app.goo.gl/63XqsnxThohjBjUR8&output=embed"
              loading="lazy"
            />
          </div>
        </section>

        <footer className="footer">
          <strong>Kalyankar Batteries</strong>
          <span>Certified with Excellent Quality Since 1998</span>
          <button onClick={() => setLoginOpen(true)}>Admin Login</button>
        </footer>
      </main>

      <AnimatePresence>
        {selectedBrand && (
          <motion.div className="popup-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="brand-popup" initial={{ scale: 0.82 }} animate={{ scale: 1 }} exit={{ scale: 0.82 }}>
              <button className="close-btn" onClick={() => setSelectedBrand(null)}><FaTimes /></button>
              <img src={selectedBrand.logo} alt={selectedBrand.name} />
              <h2>{selectedBrand.name}</h2>
              <p>{selectedBrand.desc}</p>
              <div className="tag-list">
                {selectedBrand.categories.map((c) => <span key={c}>{c}</span>)}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {loginOpen && (
          <motion.div className="popup-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.form className="login-popup" onSubmit={handleLogin} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
              <button type="button" className="close-btn" onClick={() => setLoginOpen(false)}><FaTimes /></button>
              <h2>Admin Login</h2>
              <input placeholder="Email" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} />
              <input type="password" placeholder="Password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} />
              <button className="gold-btn" type="submit">Login</button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

const css = `
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0}
.kb-site{
  min-height:100vh;
  color:#fff;
  background:#050505;
  font-family:Inter,Segoe UI,system-ui,sans-serif;
  overflow:hidden;
}
.kb-loader{
  position:fixed;inset:0;z-index:9999;
  display:grid;place-items:center;
  background:radial-gradient(circle,#241900,#050505 60%);
  color:#f7c85b;text-align:center;
}
.loader-ring{
  width:88px;height:88px;border-radius:50%;
  border:2px solid rgba(247,200,91,.2);
  border-top-color:#f7c85b;
  animation:spin 1s linear infinite;
}
@keyframes spin{to{transform:rotate(360deg)}}
.kb-nav{
  position:sticky;top:0;z-index:50;
  display:flex;align-items:center;justify-content:space-between;gap:18px;
  padding:16px clamp(18px,4vw,64px);
  background:rgba(5,5,5,.62);
  backdrop-filter:blur(18px);
  border-bottom:1px solid rgba(247,200,91,.18);
}
.brand-mark{display:flex;align-items:center;gap:10px;background:none;border:0;color:white;cursor:pointer}
.brand-mark span{
  width:42px;height:42px;border-radius:50%;
  display:grid;place-items:center;
  color:#050505;background:linear-gradient(135deg,#fff1a8,#b98216);
  font-weight:900;
  box-shadow:0 0 24px rgba(247,200,91,.45);
}
.brand-mark strong{font-size:16px}
.nav-links{display:flex;gap:22px}
.nav-links a{color:#eee;text-decoration:none;font-weight:600;font-size:14px}
.nav-links a:hover{color:#f7c85b}
.lang-switch{
  background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(247,200,91,.32);
  border-radius:999px;padding:9px 12px;
}
.hero{
  min-height:92vh;position:relative;display:grid;grid-template-columns:1.1fr .9fr;
  align-items:center;gap:40px;padding:80px clamp(20px,6vw,90px);
  background:radial-gradient(circle at 70% 30%,rgba(247,200,91,.18),transparent 32%),
             linear-gradient(135deg,#050505,#12100b 48%,#000);
}
.particles span{
  position:absolute;width:4px;height:4px;border-radius:50%;background:#f7c85b;
  left:calc((var(--i) * 31px) % 100%);top:calc((var(--i) * 47px) % 100%);
  opacity:.5;animation:float 5s ease-in-out infinite;animation-delay:calc(var(--i)*.15s);
}
@keyframes float{50%{transform:translateY(-26px) scale(1.8);opacity:1}}
.eyebrow{color:#f7c85b;text-transform:uppercase;letter-spacing:2px;font-weight:800;font-size:12px}
.hero h1{font-size:clamp(48px,8vw,112px);line-height:.92;margin:10px 0;background:linear-gradient(135deg,#fff,#ffd66f,#a46a13);-webkit-background-clip:text;color:transparent}
.hero h2{font-size:clamp(18px,2.4vw,34px);font-weight:500;color:#eadba7}
.hero-actions{display:flex;gap:14px;flex-wrap:wrap;margin-top:28px}
.gold-btn,.glass-btn{
  display:inline-flex;align-items:center;gap:9px;text-decoration:none;border:0;cursor:pointer;
  padding:13px 20px;border-radius:999px;font-weight:800;
}
.gold-btn{background:linear-gradient(135deg,#fff0a8,#c88b1d);color:#090909;box-shadow:0 0 34px rgba(247,200,91,.34)}
.glass-btn{background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(247,200,91,.28)}
.battery-visual{position:relative;min-height:380px;display:grid;place-items:center}
.inverter,.battery{
  position:absolute;border:1px solid rgba(247,200,91,.35);
  background:rgba(255,255,255,.08);backdrop-filter:blur(18px);
  box-shadow:0 0 60px rgba(247,200,91,.2);
}
.inverter{width:250px;height:280px;border-radius:28px;left:10%;top:10%}
.screen{width:120px;height:54px;border-radius:14px;margin:34px auto;background:#111;border:1px solid #f7c85b}
.vents{width:160px;height:90px;margin:40px auto;background:repeating-linear-gradient(0deg,rgba(247,200,91,.7) 0 4px,transparent 4px 14px)}
.battery{width:210px;height:140px;border-radius:22px;right:8%;bottom:10%;display:grid;place-items:center;font-size:48px}
.battery span{font-size:18px;color:#f7c85b}
.gold-orbit{width:360px;height:360px;border-radius:50%;border:1px solid rgba(247,200,91,.22);animation:spin 12s linear infinite}
.section{padding:84px clamp(20px,6vw,90px);position:relative}
.section-heading{text-align:center;margin-bottom:34px}
.section-heading h2,.glass-panel h2{font-size:clamp(30px,4vw,58px);margin:8px 0;color:#fff}
.about-grid,.contact-grid{display:grid;grid-template-columns:.8fr 1.2fr;gap:28px;align-items:center}
.glass-panel,.lux-card,.trust-card,.map-card,.certificate-card,.brand-popup,.login-popup{
  border:1px solid rgba(247,200,91,.22);
  background:linear-gradient(145deg,rgba(255,255,255,.11),rgba(255,255,255,.035));
  backdrop-filter:blur(18px);
  border-radius:22px;
  box-shadow:0 22px 80px rgba(0,0,0,.35),0 0 35px rgba(247,200,91,.08);
}
.glass-panel{padding:36px;color:#dbcfae;font-size:18px;line-height:1.75}
.trust-card{padding:44px;text-align:center}
.trust-card strong{display:block;font-size:86px;color:#f7c85b;text-shadow:0 0 35px rgba(247,200,91,.55)}
.trust-card span,.trust-card p{font-size:24px;margin:4px;color:#fff}
.counter-row,.feature-grid,.category-grid,.service-grid,.why-grid,.certificate-grid{
  display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:18px;
}
.counter-row div,.lux-card,.why-item,.certificate-card{padding:26px;text-align:center}
.counter-row strong{display:block;font-size:44px;color:#f7c85b}
.lux-card svg{font-size:38px;color:#f7c85b;margin-bottom:14px}
.lux-card h3{margin:0;color:#fff;font-size:18px}
.category-card{animation:softFloat 4s ease-in-out infinite}
@keyframes softFloat{50%{transform:translateY(-8px)}}
.marquee{overflow:hidden;border-block:1px solid rgba(247,200,91,.22);padding:26px 0}
.marquee-track{display:flex;gap:20px;width:max-content;animation:marquee 24s linear infinite}
@keyframes marquee{to{transform:translateX(-50%)}}
.marquee button{
  width:180px;height:110px;border-radius:18px;border:1px solid rgba(247,200,91,.25);
  background:rgba(255,255,255,.08);color:#fff;cursor:pointer;transition:.3s;
}
.marquee button:hover{transform:translateY(-8px) scale(1.04);box-shadow:0 0 34px rgba(247,200,91,.35)}
.marquee img{max-width:120px;max-height:52px;object-fit:contain;display:block;margin:0 auto 10px}
.service-note{text-align:center;color:#f7c85b;font-weight:800;margin-top:24px}
.why-item{display:flex;align-items:center;justify-content:center;gap:10px;border-radius:18px;background:rgba(255,255,255,.07);border:1px solid rgba(247,200,91,.18)}
.why-item svg{color:#f7c85b}
.gallery-slider{display:grid;grid-template-columns:52px 1fr 52px;gap:18px;align-items:center}
.gallery-slider button{height:52px;border-radius:50%;border:1px solid rgba(247,200,91,.32);background:rgba(255,255,255,.08);color:#f7c85b;font-size:34px;cursor:pointer}
.gallery-frame{height:460px;border-radius:24px;overflow:hidden;position:relative;border:1px solid rgba(247,200,91,.22)}
.gallery-frame img{width:100%;height:100%;object-fit:cover;transition:.4s}
.gallery-frame:hover img{transform:scale(1.08)}
.gallery-frame span{position:absolute;left:22px;bottom:22px;background:rgba(0,0,0,.6);padding:10px 16px;border-radius:999px;color:#f7c85b}
.certificate-card img{width:100%;height:240px;object-fit:cover;border-radius:16px;background:#111}
.certificate-card span{display:block;margin-top:12px;color:#f7c85b;font-weight:800}
.contact-grid{grid-template-columns:1fr 1fr}
.contact-grid p{display:flex;gap:10px;align-items:flex-start}
.map-card{overflow:hidden;min-height:430px}
.map-card iframe{width:100%;height:100%;min-height:430px;border:0;filter:grayscale(.2) contrast(1.1)}
.footer{padding:28px;text-align:center;border-top:1px solid rgba(247,200,91,.2);display:flex;justify-content:center;gap:18px;flex-wrap:wrap;color:#cfc3a0}
.footer strong{color:#f7c85b}
.footer button{background:none;color:#f7c85b;border:1px solid rgba(247,200,91,.28);border-radius:999px;padding:8px 14px;cursor:pointer}
.popup-backdrop{position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.68);backdrop-filter:blur(12px);display:grid;place-items:center;padding:20px}
.brand-popup,.login-popup{position:relative;width:min(520px,100%);padding:34px;text-align:center}
.brand-popup img{max-width:210px;max-height:90px;object-fit:contain}
.brand-popup h2,.login-popup h2{color:#f7c85b}
.brand-popup p{color:#d8cfb7;line-height:1.7}
.close-btn{position:absolute;right:16px;top:16px;width:38px;height:38px;border-radius:50%;border:1px solid rgba(247,200,91,.35);background:rgba(255,255,255,.08);color:#f7c85b;cursor:pointer}
.tag-list{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
.tag-list span{border:1px solid rgba(247,200,91,.3);border-radius:999px;padding:8px 12px;color:#fff}
.login-popup input{width:100%;padding:14px 16px;margin:10px 0;border-radius:14px;border:1px solid rgba(247,200,91,.25);background:rgba(255,255,255,.08);color:#fff}
@media(max-width:900px){
  .nav-links{display:none}
  .hero,.about-grid,.contact-grid{grid-template-columns:1fr}
  .battery-visual{min-height:310px}
  .gallery-frame{height:320px}
}
@media(max-width:560px){
  .kb-nav{padding:12px 14px}
  .brand-mark strong{display:none}
  .hero{padding-top:58px}
  .inverter{width:190px;height:230px}
  .battery{width:160px;height:110px}
  .gallery-slider{grid-template-columns:1fr}
  .gallery-slider button{display:none}
}
`;