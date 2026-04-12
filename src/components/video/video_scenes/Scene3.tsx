import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1500),
      setTimeout(() => setPhase(4), 3500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center bg-[#0B1120]"
      initial={{ opacity: 0, clipPath: 'circle(0% at 50% 50%)' }}
      animate={{ opacity: 1, clipPath: 'circle(150% at 50% 50%)' }}
      exit={{ opacity: 0, filter: 'blur(20px)' }}
      transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
    >
      <div className="text-center relative z-10 flex flex-col items-center">
        
        {/* Shield/Lock Graphic */}
        <motion.div
          className="w-[12vw] h-[12vw] border-4 border-[#D9A014] rounded-full flex items-center justify-center mb-8 relative"
          initial={{ scale: 0, rotate: -180 }}
          animate={phase >= 1 ? { scale: 1, rotate: 0 } : { scale: 0, rotate: -180 }}
          transition={{ type: 'spring', stiffness: 150, damping: 20 }}
        >
          <motion.div 
            className="absolute inset-0 border-2 border-[#CDF0F3] rounded-full"
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <div className="w-1/2 h-1/2 bg-[#D9A014] rounded-sm relative shadow-[0_0_30px_rgba(217,160,20,0.5)]">
            <div className="absolute -top-1/2 left-1/4 right-1/4 h-1/2 border-t-4 border-l-4 border-r-4 border-[#D9A014] rounded-t-full"></div>
          </div>
        </motion.div>

        <motion.h2 
          className="text-[#CDF0F3] font-[var(--font-display)] text-[5vw] font-bold tracking-tight mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        >
          Military-Grade Protection
        </motion.h2>

        <motion.div 
          className="flex gap-8 mt-6"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        >
          <span className="px-6 py-2 bg-[#142042] text-[#CDF0F3] font-[var(--font-display)] rounded-full border border-[#D9A014]/30 text-[1.5vw]">DRM Enabled</span>
          <span className="px-6 py-2 bg-[#142042] text-[#CDF0F3] font-[var(--font-display)] rounded-full border border-[#D9A014]/30 text-[1.5vw]">Anti-Screenshot</span>
          <span className="px-6 py-2 bg-[#142042] text-[#CDF0F3] font-[var(--font-display)] rounded-full border border-[#D9A014]/30 text-[1.5vw]">Dynamic Watermarking</span>
        </motion.div>
      </div>
    </motion.div>
  );
}