import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function RadarScanner({ mode }) {
  const isScanning = mode === 'listening' || mode === 'broadcasting' || mode === 'shaking';
  const isShaking = mode === 'shaking';
  
  return (
    <div className="ripple-container">
      <motion.div 
        layout
        className="ripple-dot"
        animate={{
          backgroundColor: mode === 'connected' ? 'var(--success)' : (isShaking ? '#fbbf24' : 'var(--primary)'),
          scale: mode === 'connected' ? 1.2 : 1,
          x: isShaking ? [0, -10, 10, -10, 10, 0] : 0,
        }}
        transition={{ 
          backgroundColor: { type: "spring", stiffness: 300, damping: 20 },
          scale: { type: "spring", stiffness: 300, damping: 20 },
          x: isShaking ? { duration: 0.5, repeat: Infinity } : { duration: 0.2 }
        }}
      />
      
      <AnimatePresence>
        {isScanning && (
          <>
            <motion.div
              key="ripple-1"
              className="ripple-circle"
              initial={{ width: 12, height: 12, opacity: 1 }}
              animate={{ width: 160, height: 160, opacity: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.div
              key="ripple-2"
              className="ripple-circle"
              initial={{ width: 12, height: 12, opacity: 1 }}
              animate={{ width: 160, height: 160, opacity: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 1 }}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
