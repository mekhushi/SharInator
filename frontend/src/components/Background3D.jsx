import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MeshDistortMaterial, Sphere, Environment, Float } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

function AnimatedBlob({ isMobile }) {
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      // Rotate the blob over time
      meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.2;
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.3;
      
      // Parallax effect based on mouse position
      // Mouse coordinates are normalized between -1 and 1
      const targetX = (state.mouse.x * 0.5);
      const targetY = (state.mouse.y * 0.5);
      
      // Smoothly interpolate current position towards target position
      meshRef.current.position.x += (targetX - meshRef.current.position.x) * 0.05;
      meshRef.current.position.y += (targetY - meshRef.current.position.y) * 0.05;
    }
  });

  return (
    <Float speed={isMobile ? 1 : 2} rotationIntensity={0.5} floatIntensity={1}>
      <Sphere ref={meshRef} args={[1.5, isMobile ? 32 : 64, isMobile ? 32 : 64]} scale={1.5}>
        <MeshDistortMaterial
          color="#8b5cf6"
          attach="material"
          distort={0.4}
          speed={2.5}
          roughness={0.1}
          metalness={0.9}
          emissive="#6d28d9"
          emissiveIntensity={1.5} /* Increased for bloom */
          clearcoat={1}
          clearcoatRoughness={0.1}
        />
      </Sphere>
    </Float>
  );
}

function SoundParticles({ isMobile }) {
  const pointsRef = useRef();
  
  const particleCount = isMobile ? 100 : 300;
  const positions = new Float32Array(particleCount * 3);
  
  for(let i=0; i<particleCount * 3; i+=3) {
    positions[i] = (Math.random() - 0.5) * 20;
    positions[i+1] = (Math.random() - 0.5) * 20;
    positions[i+2] = (Math.random() - 0.5) * 10 - 2;
  }

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.getElapsedTime() * 0.03;
      pointsRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.05) * 0.2;
      
      // Slight mouse parallax for particles too
      pointsRef.current.position.x = state.mouse.x * -1;
      pointsRef.current.position.y = state.mouse.y * -1;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.06} color="#00f0ff" transparent opacity={0.8} sizeAttenuation />
    </points>
  );
}

export default function Background3D() {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1, background: '#09090b', overflow: 'hidden' }}>
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }} dpr={isMobile ? 1 : [1, 2]}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={2} color="#00f0ff" />
          <directionalLight position={[-10, -10, -5]} intensity={3} color="#ff00ff" />
          
          <AnimatedBlob isMobile={isMobile} />
          <SoundParticles isMobile={isMobile} />
          <Environment preset="city" />

          {/* Only use heavy post-processing on non-mobile devices */}
          {!isMobile && (
            <EffectComposer>
              <Bloom 
                luminanceThreshold={0.5} 
                luminanceSmoothing={0.9} 
                intensity={1.5} 
              />
              <ChromaticAberration 
                blendFunction={BlendFunction.NORMAL} 
                offset={[0.002, 0.002]} 
              />
            </EffectComposer>
          )}
        </Suspense>
      </Canvas>
      {/* Overlay gradient to softly blend 3D into the dark app background */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, width: '100%', height: '100%',
        background: 'radial-gradient(circle at center, transparent 0%, #09090b 85%)',
        pointerEvents: 'none'
      }} />
    </div>
  );
}
