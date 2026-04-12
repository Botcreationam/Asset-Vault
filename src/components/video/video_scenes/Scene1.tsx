import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 1800),
      setTimeout(() => setPhase(4), 3500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center text-center px-8"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Vault Icon */}
      <motion.div
        initial={{ opacity: 0, y: 50, rotateX: 45 }}
        animate={phase >= 1 ? { opacity: 1, y: 0, rotateX: 0 } : { opacity: 0, y: 50, rotateX: 45 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        className="mb-8 relative"
      >
        <motion.div 
          className="absolute inset-0 bg-[#D9A014] blur-3xl opacity-20"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <img 
          src={`${import.meta.env.BASE_URL}images/vault-icon.png`} 
          alt="Vault" 
          className="w-[15vw] max-w-[200px] h-auto object-contain drop-shadow-2xl relative z-10" 
        />
      </motion.div>

      {/* Main Title */}
      <h1 className="text-[#CDF0F3] font-[var(--font-display)] font-bold text-[6vw] leading-tight tracking-tight uppercase max-w-5xl">
        <span className="block overflow-hidden">
          <motion.span 
            className="block"
            initial={{ y: '100%' }}
            animate={phase >= 2 ? { y: 0 } : { y: '100%' }}
            transition={{ type: 'spring', stiffness: 120, damping: 25 }}
          >
            Unlock the Knowledge
          </motion.span>
        </span>
        <span className="block overflow-hidden text-[#D9A014]">
          <motion.span 
            className="block"
            initial={{ y: '100%' }}
            animate={phase >= 2 ? { y: 0 } : { y: '100%' }}
            transition={{ type: 'spring', stiffness: 120, damping: 25, delay: 0.1 }}
          >
            You Need to Succeed
          </motion.span>
        </span>
      </h1>

      {/* Subtitle */}
      <motion.p 
        className="mt-6 text-[#CDF0F3]/70 font-[var(--font-body)] text-[2vw] max-w-3xl"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.8 }}
      >
        The secure academic resource platform for university students.
      </motion.p>
    </motion.div>
  );
}