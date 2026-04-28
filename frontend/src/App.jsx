import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import LandingPage from './pages/LandingPage';
import TransferPage from './pages/TransferPage';
import Background3D from './components/Background3D';
import './index.css';

export default function App() {
  const [currentPage, setCurrentPage] = useState('landing'); // 'landing' | 'transfer'

  return (
    <>
      <Background3D />
      <AnimatePresence mode="wait">
        {currentPage === 'landing' ? (
          <LandingPage key="landing" onStart={() => setCurrentPage('transfer')} />
        ) : (
          <TransferPage key="transfer" onBack={() => setCurrentPage('landing')} />
        )}
      </AnimatePresence>
    </>
  );
}
