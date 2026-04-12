import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

const SCENE_DURATIONS = { 
  intro: 4500, 
  features: 5000, 
  security: 4500, 
  mobile: 5000, 
  outro: 4000 
};

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0B1120] font-sans">
      {/* Persistent Background Layer */}
      <div className="absolute inset-0 z-0">
        <motion.div 
          className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-screen"
          style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/bg-abstract.png)` }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        />
        
        {/* Animated Orbs */}
        <motion.div 
          className="absolute w-[80vw] h-[80vw] rounded-full blur-[100px] opacity-20 bg-[#142042]"
          animate={{ 
            x: ['-20%', '20%', '-20%'], 
            y: ['-20%', '20%', '-20%'] 
          }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div 
          className="absolute w-[60vw] h-[60vw] rounded-full blur-[100px] opacity-10 bg-[#D9A014] bottom-0 right-0"
          animate={{ 
            x: ['20%', '-20%', '20%'], 
            y: ['20%', '-20%', '20%'] 
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Persistent Midground Accent */}
      <motion.div
        className="absolute h-[1px] bg-[#D9A014] z-10 blur-[1px]"
        animate={{
          left: ['0%', '20%', '50%', '10%', '30%'][currentScene],
          width: ['100%', '40%', '20%', '80%', '40%'][currentScene],
          top: ['50%', '80%', '20%', '90%', '50%'][currentScene],
          opacity: [0.5, 0.8, 0.3, 0.7, 0.5][currentScene],
        }}
        transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
      />

      {/* Foreground Content */}
      <div className="relative z-20 w-full h-full">
        <AnimatePresence mode="sync">
          {currentScene === 0 && <Scene1 key="intro" />}
          {currentScene === 1 && <Scene2 key="features" />}
          {currentScene === 2 && <Scene3 key="security" />}
          {currentScene === 3 && <Scene4 key="mobile" />}
          {currentScene === 4 && <Scene5 key="outro" />}
        </AnimatePresence>
      </div>
    </div>
  );
}