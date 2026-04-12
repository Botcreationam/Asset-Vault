import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 4000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center z-30"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, filter: 'blur(10px)', scale: 0.95 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="text-center px-12 relative max-w-4xl mx-auto">
        <motion.h1 
          className="text-[6vw] font-display font-light tracking-tight text-white leading-tight"
          initial={{ opacity: 0, y: 40 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          Unlock the <span className="text-[var(--color-accent)] font-semibold italic">Knowledge</span>
        </motion.h1>
        
        <motion.h1 
          className="text-[6vw] font-display font-light tracking-tight text-white leading-tight mt-2"
          initial={{ opacity: 0, y: 40 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          You Need to <span className="text-white font-semibold">Succeed</span>
        </motion.h1>
      </div>
    </motion.div>
  );
}
