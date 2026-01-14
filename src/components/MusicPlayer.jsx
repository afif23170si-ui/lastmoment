import React, { useState, useRef, useEffect } from 'react';
import { Music, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MusicPlayer({ className }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    // Attempt auto-play with low volume
    if (audioRef.current) {
      audioRef.current.volume = 0.5;
    }

    // Workaround for browser auto-play policy:
    // Listen for the first user interaction (click/touch) to start playback
    const handleFirstInteraction = () => {
      if (audioRef.current && !isPlaying) {
        audioRef.current.play()
          .then(() => {
            setIsPlaying(true);
            // Remove listener after successful play
            document.removeEventListener('click', handleFirstInteraction);
            document.removeEventListener('touchstart', handleFirstInteraction);
          })
          .catch(err => console.log("Auto-play blocked:", err));
      }
    };

    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('touchstart', handleFirstInteraction);

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, []);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(error => {
          console.log("Playback prevented:", error);
        });
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <audio
        ref={audioRef}
        src="/music/diakhir-perang.mp3"
        loop
        onEnded={() => setIsPlaying(false)}
      />

      {/* Main Player Button */}
      <motion.button
        onClick={togglePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm border transition-all ${
          isPlaying 
            ? 'bg-indigo-600 text-white border-indigo-500' 
            : 'bg-white text-slate-400 border-slate-200 hover:text-indigo-600 hover:border-indigo-200'
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className={`relative flex items-center justify-center ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`}>
           {isPlaying ? <Music size={20} /> : <Play size={20} className="ml-0.5" />}
        </div>
      </motion.button>

      {/* Volume Control (Only shows when playing) */}
      <AnimatePresence>
        {isPlaying && (
          <motion.button
            initial={{ width: 0, opacity: 0, x: -10 }}
            animate={{ width: 40, opacity: 1, x: 0 }}
            exit={{ width: 0, opacity: 0, x: -10 }}
            onClick={toggleMute}
            className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-slate-600 shadow-sm border border-white/20"
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
