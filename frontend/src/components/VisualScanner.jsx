import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { detectColor, detectRoomFromSequence } from '../services/visualHandshake';

export default function VisualScanner({ onMatch, onError }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [detectedSequence, setDetectedSequence] = useState([]);
  const [lastColor, setLastColor] = useState(null);

  useEffect(() => {
    let stream = null;
    let animationId = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' },
          audio: false 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Camera access denied:', err);
        onError('Camera access denied. Please allow camera permissions.');
      }
    };

    const processFrame = () => {
      if (!videoRef.current || !canvasRef.current) return;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      // Draw center 50x50 area to canvas
      const size = 50;
      const x = (video.videoWidth - size) / 2;
      const y = (video.videoHeight - size) / 2;
      
      if (video.videoWidth > 0) {
        ctx.drawImage(video, x, y, size, size, 0, 0, size, size);
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;

        // Average colors
        let r = 0, g = 0, b = 0;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
        }
        const count = data.length / 4;
        r /= count;
        g /= count;
        b /= count;

        const color = detectColor(r, g, b);
        
        if (color && color.name !== lastColor) {
          setLastColor(color.name);
          setDetectedSequence(prev => {
            const next = [...prev, color].slice(-10); // Keep last 10
            const matchedRoom = detectRoomFromSequence(next);
            if (matchedRoom) {
              onMatch(matchedRoom);
            }
            return next;
          });
        } else if (!color) {
          setLastColor(null);
        }
      }

      animationId = requestAnimationFrame(processFrame);
    };

    startCamera().then(() => {
      animationId = requestAnimationFrame(processFrame);
    });

    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [targetSequence, onMatch, onError, lastColor]);

  return (
    <div className="visual-scanner-container">
      <div className="camera-preview-wrapper">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className="camera-preview"
        />
        <div className="scanner-overlay">
          <div className="scanner-reticle" />
        </div>
      </div>
      <canvas ref={canvasRef} width="50" height="50" style={{ display: 'none' }} />
      
      <div className="sequence-track">
        {detectedSequence.slice(-4).map((c, i) => (
          <motion.div 
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="sequence-dot"
            style={{ backgroundColor: c.hex }}
          />
        ))}
      </div>
    </div>
  );
}
