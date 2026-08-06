import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { LanguageProvider } from '../i18n.jsx'
import Navbar from '../components/Navbar.jsx'
import Hero from '../components/Hero.jsx'
import Workshop from '../components/Workshop.jsx'
import Certificates from '../components/Certificates.jsx'
import Trust from '../components/Trust.jsx'
import Brands from '../components/Brands.jsx'
import Products from '../components/Products.jsx'
import WhyChooseUs from '../components/WhyChooseUs.jsx'
import About from '../components/About.jsx'
import Contact from '../components/Contact.jsx'
import Login from '../components/Login.jsx'
import Footer from '../components/Footer.jsx'
import kbLogo from '../assets/kbremove.png'
import '../landing.css'

function Loader() {
  return (
    <motion.div key="loader" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }} className="fixed inset-0 z-[300] bg-black flex items-center justify-center p-4">
      <motion.img
        src={kbLogo}
        alt="KB Logo"
        animate={{ scale: [0.98, 1.02, 0.98], opacity: [0.9, 1, 0.9] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        className="w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 object-contain"
        style={{
          filter: 'brightness(0.9) contrast(1.3) drop-shadow(0 0 20px rgba(255, 215, 0, 0.5)) drop-shadow(0 0 40px rgba(218, 165, 32, 0.3))',
          WebkitFilter: 'brightness(0.9) contrast(1.3) drop-shadow(0 0 20px rgba(255, 215, 0, 0.5)) drop-shadow(0 0 40px rgba(218, 165, 32, 0.3))',
        }}
      />
    </motion.div>
  )
}

function LandingContent() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [loginOpen, setLoginOpen] = useState(false)
  const [showLoginBtn, setShowLoginBtn] = useState(false)
  const clickCount = useRef(0)
  const clickTimer = useRef(null)

  useEffect(() => {
    document.body.classList.add('landing-page')
    const timer = setTimeout(() => setLoading(false), 1400)
    return () => {
      clearTimeout(timer)
      clearTimeout(clickTimer.current)
      document.body.classList.remove('landing-page')
    }
  }, [])

  const handleLogoClick = () => {
    clickCount.current += 1
    clearTimeout(clickTimer.current)
    clickTimer.current = setTimeout(() => { clickCount.current = 0 }, 1200)
    if (clickCount.current >= 3) {
      setShowLoginBtn(true)
      clickCount.current = 0
    }
  }

  return (
    <div id="landing-site" className="landing-site">
      <AnimatePresence>{loading && <Loader />}</AnimatePresence>
      {!loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
          <Navbar onOpenLogin={() => setLoginOpen(true)} showLoginBtn={showLoginBtn} onLogoClick={handleLogoClick} />
          <main>
            <Hero />
            <Workshop />
            <Certificates />
            <Trust />
            <Brands />
            <Products />
            <WhyChooseUs />
            <About />
            <Contact />
          </main>
          <Footer onOpenLogin={() => setLoginOpen(true)} />
          <Login open={loginOpen} onClose={() => setLoginOpen(false)} onSuccess={() => navigate('/dashboard')} />
          <a href="https://wa.me/917745047273" target="_blank" rel="noreferrer" className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gold text-matte flex items-center justify-center text-2xl shadow-goldGlowLg animate-float" aria-label="Chat on WhatsApp">💬</a>
        </motion.div>
      )}
    </div>
  )
}

export default function LandingPage() {
  return <LanguageProvider><LandingContent /></LanguageProvider>
}
