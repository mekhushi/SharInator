import React from 'react';
import { motion } from 'framer-motion';
import { Radio, Shield, Zap, ArrowRight } from 'lucide-react';

export default function LandingPage({ onStart }) {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      className="landing-container"
      variants={containerVariants}
      initial="hidden"
      animate="show"
      exit="exit"
    >
      <motion.div variants={itemVariants} className="landing-hero">
        <h1 className="landing-title">
          Send files through <br />
          <span className="text-gradient">sound waves.</span>
        </h1>
        <p className="landing-subtitle">
          A completely serverless, peer-to-peer file transfer protocol. 
          It uses the Web Audio API to broadcast an ultrasonic handshake, 
          connecting your devices instantly without QR codes or links.
        </p>
        
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginTop: '2.5rem' }}>
          <button className="btn btn-primary btn-large" onClick={onStart}>
            Initialize Protocol <ArrowRight size={18} />
          </button>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="features-grid">
        <div className="feature-card">
          <div className="feature-icon"><Radio size={24} /></div>
          <h3>Ultrasonic Discovery</h3>
          <p>Devices discover each other using inaudible high-frequency sound waves. No manual pairing required.</p>
        </div>
        
        <div className="feature-card">
          <div className="feature-icon"><Zap size={24} /></div>
          <h3>Direct P2P Transfer</h3>
          <p>Files are chunked and sent directly over WebRTC Data Channels. Fast, unlimited, and peer-to-peer.</p>
        </div>
        
        <div className="feature-card">
          <div className="feature-icon"><Shield size={24} /></div>
          <h3>Zero Server Storage</h3>
          <p>Your data never touches a database. The signaling server only connects peers, ensuring absolute privacy.</p>
        </div>
      </motion.div>
    </motion.div>
  );
}
