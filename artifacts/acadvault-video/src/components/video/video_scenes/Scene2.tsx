import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 5000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-start pl-[10vw] z-30"
      initial={{ opacity: 0, x: '5vw' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '-5vw', filter: 'blur(10px)' }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="absolute right-[5vw] top-[20vh] w-[40vw] h-[60vh] rounded-xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10">
        <motion.img 
          src={`${import.meta.env.BASE_URL}images/students.jpg`}
          className="w-full h-full object-cover grayscale mix-blend-luminosity opacity-50"
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.5 }}
          transition={{ duration: 4, ease: "easeOut" }}
        />
      </div>

      <div className="relative z-10 max-w-2xl">
        <motion.p 
          className="text-[var(--color-accent)] font-display text-[1.5vw] tracking-widest uppercase mb-6"
          initial={{ opacity: 0, x: -20 }}
          animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          The Problem
        </motion.p>

        <motion.h2 
          className="text-[4vw] font-display font-light text-white leading-tight mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          Students are struggling to find <br/><span className="italic text-white/70">academic resources.</span>
        </motion.h2>

        <div className="space-y-4 font-body text-[1.2vw] text-white/80">
          <motion.div 
            className="flex items-center gap-4"
            initial={{ opacity: 0, x: -20 }}
            animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
            <p>Scattered Books & Materials</p>
          </motion.div>
          <motion.div 
            className="flex items-center gap-4"
            initial={{ opacity: 0, x: -20 }}
            animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
            <p>Expensive Textbooks</p>
          </motion.div>
          <motion.div 
            className="flex items-center gap-4"
            initial={{ opacity: 0, x: -20 }}
            animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{ duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
            <p>Disorganized Access</p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
