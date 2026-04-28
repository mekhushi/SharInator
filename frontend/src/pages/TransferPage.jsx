import React, { useState, useRef } from 'react';
import { Download, Upload, ArrowUpRight, ArrowDownLeft, X, ArrowLeft, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import RadarScanner from '../components/RadarScanner';
import { generateRoomFrequency, startBroadcast, stopBroadcast, startListening, stopListening } from '../services/audioHandshake';
import { WebRTCService } from '../services/webrtc';
import '../index.css';

export default function TransferPage({ onBack }) {
  const [mode, setMode] = useState('idle'); // idle, broadcasting, listening, connected
  const [role, setRole] = useState(null); // 'sender', 'receiver'
  const [statusText, setStatusText] = useState('Ready to send or receive files');
  const [transferProgress, setTransferProgress] = useState(0);
  const [receivedFile, setReceivedFile] = useState(null);
  const [isTransferring, setIsTransferring] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState(null);
  const [copied, setCopied] = useState(false);
  
  const webrtcRef = useRef(null);

  const cleanup = () => {
    stopBroadcast();
    stopListening();
    if (webrtcRef.current) {
      webrtcRef.current.disconnect();
      webrtcRef.current = null;
    }
    setMode('idle');
    setRole(null);
    setStatusText('Ready to send or receive files');
    setTransferProgress(0);
    setReceivedFile(null);
    setIsTransferring(false);
  };

  const handleBack = () => {
    cleanup();
    onBack();
  };

  const handleSend = async () => {
    cleanup();
    setRole('sender');
    setMode('broadcasting');
    setStatusText('Emitting sound wave...');
    
    const roomId = generateRoomFrequency();
    setCurrentRoomId(roomId);
    await startBroadcast(roomId);
    
    webrtcRef.current = new WebRTCService(roomId, true, {
      onPeerConnected: () => {
        stopBroadcast();
        setMode('connected');
        setStatusText('Connected.');
      },
      onPeerDisconnected: () => {
        setStatusText('Disconnected.');
        setTimeout(cleanup, 3000);
      }
    });
    webrtcRef.current.connect();
  };

  const handleReceive = async () => {
    cleanup();
    setRole('receiver');
    setMode('listening');
    setStatusText('Listening for nearby devices...');
    
    try {
      await startListening((roomId) => {
        setStatusText('Device found. Connecting...');
        setMode('connected');
        
        webrtcRef.current = new WebRTCService(roomId, false, {
          onPeerConnected: () => {
            setStatusText('Connected. Waiting for file...');
          },
          onTransferStart: (meta) => {
            setIsTransferring(true);
            setStatusText(`Receiving ${meta.name}`);
          },
          onProgress: (progress) => {
            setTransferProgress(progress);
          },
          onFileReceived: (meta, blob) => {
            setIsTransferring(false);
            setStatusText('File received.');
            const url = URL.createObjectURL(blob);
            setReceivedFile({ name: meta.name, url });
          },
          onPeerDisconnected: () => {
            setStatusText('Disconnected.');
            setTimeout(cleanup, 3000);
          }
        });
        webrtcRef.current.connect();
      });
    } catch (err) {
      console.error(err);
      setStatusText('Mic access denied or error. Try manual join.');
      setMode('idle');
    }
  };

  const handleFileDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer ? e.dataTransfer.files[0] : e.target.files[0];
    if (!file) return;

    if (webrtcRef.current && mode === 'connected') {
      setIsTransferring(true);
      setStatusText(`Sending ${file.name}`);
      try {
        await webrtcRef.current.sendFile(file, (progress) => {
          setTransferProgress(progress);
        });
        setStatusText('Sent successfully.');
      } catch (err) {
        console.error(err);
        setStatusText('Failed to send.');
      } finally {
        setIsTransferring(false);
        setTimeout(() => setTransferProgress(0), 1500);
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="main-card"
    >
      <LayoutGroup>
        <motion.div layout className="header-section" style={{ position: 'relative' }}>
          {mode === 'idle' && (
            <button 
              onClick={handleBack}
              style={{ position: 'absolute', left: '1rem', top: '1.5rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <motion.h1 layout>SharInator</motion.h1>
          <motion.p layout className="subtitle">Peer-to-peer over ultrasonic sound.</motion.p>
        </motion.div>

        <motion.div layout className="content-section">
          <RadarScanner mode={mode} />
          <motion.p layout className="status-text">{statusText}</motion.p>
          
          {mode === 'broadcasting' && currentRoomId && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="room-code-display"
              onClick={() => {
                navigator.clipboard.writeText(currentRoomId);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              style={{ cursor: 'pointer' }}
            >
              Room Code: <span>{currentRoomId}</span>
              {copied ? <Check size={14} style={{ marginLeft: '8px', color: 'var(--success)' }} /> : <Copy size={14} style={{ marginLeft: '8px' }} />}
            </motion.div>
          )}

          {isTransferring && (
            <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="progress-bg">
              <motion.div 
                className="progress-fill"
                animate={{ width: `${transferProgress * 100}%` }}
                transition={{ type: "tween", ease: "easeOut", duration: 0.2 }}
              />
            </motion.div>
          )}

          <AnimatePresence mode="popLayout">
            {mode === 'idle' && (
              <motion.div 
                key="buttons"
                layout
                initial={{ opacity: 0, filter: 'blur(4px)', y: 10 }}
                animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                exit={{ opacity: 0, filter: 'blur(4px)', y: -10 }}
                transition={{ duration: 0.2 }}
                className="button-group-container"
              >
                <div className="button-group">
                  <button className="btn btn-primary" onClick={handleSend}>
                    <ArrowUpRight size={18} /> Send
                  </button>
                  <button className="btn btn-secondary" onClick={handleReceive}>
                    <ArrowDownLeft size={18} /> Receive
                  </button>
                </div>
                
                <div className="manual-join-section">
                  <div className="divider"><span>OR</span></div>
                  <div className="manual-input-wrapper">
                    <input 
                      type="number" 
                      placeholder="Enter Room Code" 
                      className="manual-input"
                      id="manualRoomInput"
                    />
                    <button 
                      className="btn btn-small"
                      onClick={() => {
                        const val = document.getElementById('manualRoomInput').value;
                        if (val) {
                          setRole('receiver');
                          setMode('connected');
                          setStatusText('Connecting manually...');
                          
                          webrtcRef.current = new WebRTCService(val, false, {
                            onPeerConnected: () => setStatusText('Connected. Waiting for file...'),
                            onTransferStart: (meta) => {
                              setIsTransferring(true);
                              setStatusText(`Receiving ${meta.name}`);
                            },
                            onProgress: (progress) => setTransferProgress(progress),
                            onFileReceived: (meta, blob) => {
                              setIsTransferring(false);
                              setStatusText('File received.');
                              setReceivedFile({ name: meta.name, url: URL.createObjectURL(blob) });
                            },
                            onPeerDisconnected: () => {
                              setStatusText('Disconnected.');
                              setTimeout(cleanup, 3000);
                            }
                          });
                          webrtcRef.current.connect();
                        }
                      }}
                    >
                      Join
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {mode === 'connected' && role === 'sender' && !isTransferring && (
              <motion.div
                key="dropzone"
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="dropzone"
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('active'); }}
                onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('active'); }}
                onDrop={handleFileDrop}
                onClick={() => document.getElementById('fileInput').click()}
              >
                <Upload size={24} className="icon" />
                <div>
                  <h3>Drop a file</h3>
                  <p>or click to select</p>
                </div>
                <input 
                  type="file" 
                  id="fileInput" 
                  style={{ display: 'none' }} 
                  onChange={handleFileDrop} 
                />
              </motion.div>
            )}

            {receivedFile && (
              <motion.div
                key="download"
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ width: '100%' }}
              >
                <a 
                  href={receivedFile.url} 
                  download={receivedFile.name}
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                >
                  <Download size={18} /> Save {receivedFile.name}
                </a>
              </motion.div>
            )}

            {mode !== 'idle' && !isTransferring && (
              <motion.button
                key="cancel"
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="btn btn-danger"
                style={{ width: '100%' }}
                onClick={cleanup}
              >
                <X size={18} /> Cancel
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>

      </LayoutGroup>
    </motion.div>
  );
}
