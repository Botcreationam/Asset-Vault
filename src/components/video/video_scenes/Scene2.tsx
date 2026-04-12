import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1400),
      setTimeout(() => setPhase(4), 2000),
      setTimeout(() => setPhase(5), 4000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const features = [
    { title: "Free Online Reading", desc: "Access books, slides & notes instantly." },
    { title: "Unit-Based Downloads", desc: "Affordable access to what you need." },
    { title: "Drive-Like Organization", desc: "Program → Year → Semester → Subject." }
  ];

  return (
    <motion.div 
      className="absolute inset-0 flex items-center px-[10vw]"
      initial={{ opacity: 0, x: '20vw' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '-20vw', filter: 'blur(5px)' }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="w-1/2 pr-10">
        <motion.h2 
          className="text-[#CDF0F3] font-[var(--font-display)] text-[4vw] font-bold leading-tight mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        >
          Everything you need, <br/>
          <span className="text-[#D9A014]">organized beautifully.</span>
        </motion.h2>

        <div className="space-y-6">
          {features.map((f, i) => (
            <motion.div 
              key={i}
              className="flex flex-col border-l-2 border-[#D9A014] pl-6"
              initial={{ opacity: 0, x: -20 }}
              animate={phase >= i + 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
              <h3 className="text-[#CDF0F3] font-[var(--font-display)] text-[1.8vw] font-semibold">{f.title}</h3>
              <p className="text-[#CDF0F3]/70 font-[var(--font-body)] text-[1.2vw]">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="w-1/2 relative h-[60vh] flex items-center justify-center">
        <motion.div 
          className="absolute inset-0 border border-[#142042] rounded-3xl bg-[#0B1120]/50 backdrop-blur-md overflow-hidden"
          initial={{ opacity: 0, scale: 0.8, rotateY: 30 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1, rotateY: 0 } : { opacity: 0, scale: 0.8, rotateY: 30 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{ perspective: 1000 }}
        >
           {/* Abstract UI representation */}
           <div className="p-6 h-full flex flex-col gap-4">
             <div className="h-10 w-1/3 bg-[#142042] rounded-md animate-pulse"></div>
             <div className="flex gap-4">
               <div className="h-32 w-1/4 bg-[#142042] rounded-lg"></div>
               <div className="h-32 w-1/4 bg-[#142042] rounded-lg"></div>
               <div className="h-32 w-1/4 bg-[#142042] rounded-lg"></div>
             </div>
             <div className="h-64 w-full bg-[#142042] rounded-xl mt-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#D9A014]/10 to-transparent w-[200%] animate-[shimmer_2s_infinite]"></div>
             </div>
           </div>
        </motion.div>
      </div>
    </motion.div>
  );
}