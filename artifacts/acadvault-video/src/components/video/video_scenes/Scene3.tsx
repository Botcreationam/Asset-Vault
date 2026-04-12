import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 6000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center z-30"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, filter: 'blur(20px)', scale: 1.1 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.p 
        className="text-[var(--color-accent)] font-display text-[1.2vw] tracking-widest uppercase mb-4"
        initial={{ opacity: 0, y: -20 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        The Solution
      </motion.p>

      <motion.h2 
        className="text-[5vw] font-display font-semibold text-white leading-tight mb-16 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      >
        AcadVault Platform
      </motion.h2>

      <div className="flex gap-8 max-w-6xl w-full px-12">
        {[
          { title: "Organized", desc: "Program > Year > Semester" },
          { title: "Accessible", desc: "Free online reading" },
          { title: "Flexible", desc: "Unit-based downloads" }
        ].map((item, i) => (
          <motion.div 
            key={i}
            className="flex-1 bg-white/5 border border-white/10 p-8 rounded-2xl backdrop-blur-sm"
            initial={{ opacity: 0, y: 40 }}
            animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
            transition={{ duration: 0.8, delay: i * 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <h3 className="text-[2vw] font-display text-[var(--color-accent)] mb-2">{item.title}</h3>
            <p className="text-[1.2vw] font-body text-white/70">{item.desc}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
