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

const FREQUENCIES = [18000, 18300, 18600, 18900, 19200];

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

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.1);

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
    
    // Back to 8192 for better resolution
    analyser.fftSize = 8192;
    source.connect(analyser);

    const dataArray = new Float32Array(analyser.frequencyBinCount);
    const sampleRate = ctx.sampleRate;

    const analyze = () => {
      if (!isListening) return;

      analyser.getFloatFrequencyData(dataArray);

      let maxVal = -Infinity;
      let maxIndex = -1;

      // Range check 17kHz to 20kHz
      const minIndex = Math.floor(17000 * analyser.fftSize / sampleRate);
      const maxSearchIndex = Math.floor(20000 * analyser.fftSize / sampleRate);

      for (let i = minIndex; i < maxSearchIndex; i++) {
        if (dataArray[i] > maxVal) {
          maxVal = dataArray[i];
          maxIndex = i;
        }
      }

      // Threshold at -75dB to avoid noise but keep sensitivity
      if (maxVal > -75) {
        const detectedFreq = maxIndex * sampleRate / analyser.fftSize;
        
        const closest = FREQUENCIES.reduce((prev, curr) => 
          Math.abs(curr - detectedFreq) < Math.abs(prev - detectedFreq) ? curr : prev
        );

        if (Math.abs(closest - detectedFreq) < 150) {
          console.log(`[Audio] Detected: ${detectedFreq}Hz, Matched: ${closest}Hz`);
          stopListening();
          onFrequencyDetected(closest);
          return;
        }
      }

      listenFrameId = requestAnimationFrame(analyze);
    };

    analyze();
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
