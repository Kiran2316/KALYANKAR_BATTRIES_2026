import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "../i18n.jsx";

const mediaItems = [
  { id: 0, type: "video", src: "/img/ShopVideo.mp4", label: "Shop Tour Video" },
  { id: 1, type: "image", src: "/img/Shop1.jpeg", label: "Store Front View" },
  { id: 2, type: "image", src: "/img/Shop2.jpeg", label: "Showroom & Display" },
  { id: 3, type: "image", src: "/img/Shop3.jpeg", label: "Billing Counter" },
  { id: 4, type: "image", src: "/img/Shop4.jpeg", label: "Glass Front View" },
  { id: 5, type: "image", src: "/img/Shop5.jpeg", label: "Battery Racks" },
  { id: 6, type: "image", src: "/img/Shop6.jpeg", label: "Exide Inventory" },
  { id: 7, type: "image", src: "/img/Shop7.jpeg", label: "Waiting Area" },
  { id: 8, type: "image", src: "/img/Shop8.jpeg", label: "Authorized Signage" },
];

export default function Workshop() {
  const { t } = useLang();
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef(null);
  const videoRef = useRef(null);

  const startTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % mediaItems.length);
    }, 4000);
  };

  const stopTimer = () => {
    clearInterval(timerRef.current);
  };

  // Switch slides reset playing state and handle timer
  useEffect(() => {
    setIsPlaying(false);
    if (mediaItems[index].type === "video") {
      stopTimer();
    } else {
      startTimer();
    }
    return () => stopTimer();
  }, [index]);

  const handlePlayVideo = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const nextSlide = () => {
    setIndex((i) => (i + 1) % mediaItems.length);
  };

  const prevSlide = () => {
    setIndex((i) => (i - 1 + mediaItems.length) % mediaItems.length);
  };

  const handleDragEnd = (_, info) => {
    if (info.offset.x < -50) nextSlide();
    else if (info.offset.x > 50) prevSlide();
  };

  const currentMedia = mediaItems[index];

  return (
    <section id="workshop" className="section bg-matte relative">
      <div className="section-inner max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <p className="eyebrow">{t.workshop.eyebrow}</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold mt-2 gold-text">{t.workshop.title}</h2>
          <p className="text-white/60 max-w-xl mx-auto mt-4 text-sm md:text-base">{t.workshop.desc}</p>
        </div>

        {/* Media Slider Box */}
        <div
          className="overflow-hidden relative rounded-2xl border border-gold/30 bg-charcoal shadow-2xl group"
          onMouseEnter={stopTimer}
          onMouseLeave={() => {
            if (currentMedia.type !== "video") startTimer();
          }}
          onTouchStart={stopTimer}
          onTouchEnd={() => {
            if (currentMedia.type !== "video") startTimer();
          }}
        >
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="cursor-grab active:cursor-grabbing"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentMedia.id}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.5 }}
                onClick={() => setLightbox(currentMedia)}
                className="relative h-[450px] sm:h-[550px] md:h-[650px] w-full overflow-hidden"
              >
                {currentMedia.type === "video" ? (
                  <div className="relative w-full h-full">
                    <video
                      ref={videoRef}
                      key={currentMedia.id}
                      src={currentMedia.src}
                      playsInline
                      onEnded={nextSlide}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />

                    {/* Big Play Button Overlay */}
                    {!isPlaying && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
                        <button
                          onClick={handlePlayVideo}
                          className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gold/90 text-matte flex items-center justify-center pl-1 shadow-lg transform hover:scale-110 transition-transform duration-300"
                          aria-label="Play Video"
                        >
                          <svg className="w-10 h-10 sm:w-12 sm:h-12 fill-current" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <img
                    src={currentMedia.src}
                    alt={currentMedia.label}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90 pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 p-6 pointer-events-none">
                  <span className="text-gold font-display text-lg font-semibold">{currentMedia.label}</span>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Navigation Buttons */}
          <button
            onClick={(e) => { e.stopPropagation(); prevSlide(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 border border-gold/40 text-gold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gold hover:text-matte z-20"
            aria-label="Previous Slide"
          >
            ❮
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); nextSlide(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 border border-gold/40 text-gold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gold hover:text-matte z-20"
            aria-label="Next Slide"
          >
            ❯
          </button>
        </div>

        {/* Dots Navigation */}
        <div className="flex justify-center gap-2 mt-8 flex-wrap">
          {mediaItems.map((item, i) => (
            <button
              key={item.id}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all duration-300 ${i === index ? "w-8 bg-gold" : "w-2 bg-white/30"}`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-6"
            onClick={() => setLightbox(null)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              className="relative w-full max-w-3xl h-[75vh] rounded-2xl border border-gold/40 overflow-hidden bg-charcoal flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {lightbox.type === "video" ? (
                <video 
                  key={lightbox.id}
                  src={lightbox.src} 
                  controls 
                  autoPlay 
                  playsInline
                  className="w-full h-full object-contain" 
                />
              ) : (
                <img src={lightbox.src} alt={lightbox.label} className="w-full h-full object-contain" />
              )}

              <span className="absolute bottom-4 left-6 text-gold font-display text-base bg-matte/80 px-4 py-1 rounded-full border border-gold/30">
                {lightbox.label}
              </span>
              <button
                onClick={() => setLightbox(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full glass text-white flex items-center justify-center hover:bg-gold hover:text-matte transition-colors z-10"
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