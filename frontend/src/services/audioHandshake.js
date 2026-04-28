// Audio context singleton
let audioContext = null;
let oscillator = null;
let analyser = null;
let listenFrameId = null;
let isListening = false;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

const FREQUENCIES = [18200, 18600, 19000, 19400, 19800];

export function generateRoomFrequency() {
  // Use a fixed set of widely-spaced frequencies for robust matching
  const randomIndex = Math.floor(Math.random() * FREQUENCIES.length);
  return FREQUENCIES[randomIndex];
}

export async function startBroadcast(frequency) {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  if (oscillator) {
    oscillator.stop();
  }

  oscillator = ctx.createOscillator();
  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;

  // 0.8 gain prevents speaker clipping/distortion which makes it audible
  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.1); // 100ms fade-in

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  oscillator.start();
  console.log(`[Audio] Broadcasting at ${frequency}Hz`);
}

export function stopBroadcast() {
  if (oscillator) {
    try {
      oscillator.stop();
    } catch (e) {}
    oscillator.disconnect();
    oscillator = null;
    console.log('[Audio] Broadcast stopped');
  }
}

export async function startListening(onFrequencyDetected) {
  if (isListening) return;
  isListening = true;

  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }, 
      video: false 
    });
    const source = ctx.createMediaStreamSource(stream);
    analyser = ctx.createAnalyser();
    
    analyser.fftSize = 4096;
    source.connect(analyser);

    const dataArray = new Float32Array(analyser.frequencyBinCount);
    const sampleRate = ctx.sampleRate;

    const analyze = () => {
      if (!isListening) return;

      analyser.getFloatFrequencyData(dataArray);

      let maxVal = -Infinity;
      let maxIndex = -1;

      // Check range 17kHz to 21kHz
      const minIndex = Math.floor(17000 * analyser.fftSize / sampleRate);
      const maxSearchIndex = Math.floor(21000 * analyser.fftSize / sampleRate);

      for (let i = minIndex; i < maxSearchIndex; i++) {
        if (dataArray[i] > maxVal) {
          maxVal = dataArray[i];
          maxIndex = i;
        }
      }

      // High sensitivity threshold
      if (maxVal > -85) {
        const detectedFreq = maxIndex * sampleRate / analyser.fftSize;
        
        // Fuzzy match: find the closest frequency in our list
        const closest = FREQUENCIES.reduce((prev, curr) => 
          Math.abs(curr - detectedFreq) < Math.abs(prev - detectedFreq) ? curr : prev
        );

        // If we are within 150Hz of a target frequency, we have a match
        if (Math.abs(closest - detectedFreq) < 150) {
          console.log(`[Audio] Match! Detected: ${detectedFreq}Hz, Matched to: ${closest}Hz`);
          stopListening();
          onFrequencyDetected(closest);
          return;
        }
      }

      listenFrameId = requestAnimationFrame(analyze);
    };

    analyze();
    console.log('[Audio] Listening for frequencies...');
  } catch (err) {
    isListening = false;
    throw err;
  }
}

export function stopListening() {
  isListening = false;
  if (listenFrameId) {
    cancelAnimationFrame(listenFrameId);
    listenFrameId = null;
  }
  if (analyser) {
    analyser.disconnect();
    analyser = null;
  }
  console.log('[Audio] Stopped listening');
}
