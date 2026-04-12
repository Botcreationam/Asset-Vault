import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

const SCENE_DURATIONS = { 
  hook: 5000, 
  problem: 6000, 
  solution: 7000, 
  features: 7000, 
  closer: 5000 
};

const bgPositions = [
  { scale: 1.1, x: '0%', opacity: 0.6 },
  { scale: 1.2, x: '-5%', opacity: 0.4 },
  { scale: 1.3, x: '-10%', opacity: 0.3 },
  { scale: 1.2, x: '-5%', opacity: 0.4 },
  { scale: 1.1, x: '0%', opacity: 0.6 },
];

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[var(--color-bg-dark)] font-body text-white">
      
      {/* Persistent Background Layer */}
      <motion.div 
        className="absolute inset-0 z-0 bg-cover bg-center origin-center"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/library-bg.png)` }}
        animate={bgPositions[currentScene]}
        transition={{ duration: 6, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 z-0 bg-[var(--color-bg-dark)]/70 mix-blend-multiply pointer-events-none" />
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-[var(--color-bg-dark)] to-transparent opacity-80 pointer-events-none" />

      {/* Persistent Animated Gradient Shift */}
      <motion.div 
        className="absolute top-0 right-0 w-[800px] h-[800px] rounded-full blur-[120px] opacity-20 pointer-events-none z-0"
        style={{ background: 'radial-gradient(circle, var(--color-accent), transparent)' }}
        animate={{
          x: ['10%', '-20%', '30%', '-10%', '0%'][currentScene],
          y: ['-10%', '30%', '-20%', '40%', '0%'][currentScene],
          scale: [1, 1.2, 0.8, 1.5, 1][currentScene],
        }}
        transition={{ duration: 3, ease: "easeInOut" }}
      />

      {/* Persistent Floating Elements Midground */}
      <motion.div 
        className="absolute inset-0 z-10 pointer-events-none opacity-40 bg-cover bg-center"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/floating-elements.png)` }}
        animate={{
          y: ['0%', '-5%', '5%', '-2%', '0%'][currentScene],
          rotate: [0, 2, -1, 1, 0][currentScene],
          scale: [1, 1.05, 1, 1.05, 1][currentScene],
          opacity: currentScene === 1 ? 0.1 : 0.4
        }}
        transition={{ duration: 4, ease: "easeInOut" }}
      />

      {/* Gold Accent Line - Persistent motif */}
      <motion.div 
        className="absolute z-20 h-[2px] bg-[var(--color-accent)] shadow-[0_0_10px_var(--color-accent)]"
        animate={{
          left: ['0%', '0%', '20%', '10%', '50%'][currentScene],
          top: ['10%', '85%', '15%', '85%', '50%'][currentScene],
          width: ['30%', '50%', '20%', '80%', '0%'][currentScene],
          opacity: currentScene === 4 ? 0 : 0.8
        }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* Scene Content */}
      <AnimatePresence mode="popLayout">
        {currentScene === 0 && <Scene1 key="hook" />}
        {currentScene === 1 && <Scene2 key="problem" />}
        {currentScene === 2 && <Scene3 key="solution" />}
        {currentScene === 3 && <Scene4 key="features" />}
        {currentScene === 4 && <Scene5 key="closer" />}
      </AnimatePresence>
    </div>
  );
}
