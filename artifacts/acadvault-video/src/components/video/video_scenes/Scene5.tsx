import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import logo from '@assets/generated_images/acadvault_logo_1.png';

export function Scene5() {
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
      className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-[var(--color-bg-dark)]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5, ease: "easeInOut" }}
    >
      <motion.div
        className="w-[20vw] h-[20vw] mb-8"
        initial={{ scale: 0.8, opacity: 0, y: 40 }}
        animate={phase >= 1 ? { scale: 1, opacity: 1, y: 0 } : { scale: 0.8, opacity: 0, y: 40 }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <img src={logo} alt="AcadVault" className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(217,160,20,0.3)]" />
      </motion.div>

      <motion.h2 
        className="text-[4vw] font-display font-light text-white tracking-wide"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      >
        Acad<span className="font-semibold text-[var(--color-accent)]">Vault</span>
      </motion.h2>

      <motion.p 
        className="text-[1.5vw] font-body text-white/60 mt-4 tracking-widest uppercase"
        initial={{ opacity: 0 }}
        animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 1.5, delay: 0.5, ease: "easeInOut" }}
      >
        The Premier Academic Vault
      </motion.p>
    </motion.div>
  );
}
