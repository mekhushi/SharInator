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

export function generateRoomFrequency() {
  // Generate a random frequency between 18000 and 19500 in steps of 50Hz
  const min = 18000;
  const max = 19500;
  const step = 50;
  const steps = Math.floor((max - min) / step);
  const randomStep = Math.floor(Math.random() * steps);
  return min + randomStep * step;
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

  // Reduce volume slightly to avoid clipping, though it's inaudible
  const gainNode = ctx.createGain();
  gainNode.gain.value = 0.9; // Increased volume for better detection

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
    
    // High FFT size for better frequency resolution
    analyser.fftSize = 8192;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    const sampleRate = ctx.sampleRate;

    const analyze = () => {
      if (!isListening) return;

      analyser.getFloatFrequencyData(dataArray);

      let maxVal = -Infinity;
      let maxIndex = -1;

      // Only check frequencies above 17.5kHz to avoid voice/noise
      const minIndex = Math.floor(17500 * analyser.fftSize / sampleRate);
      const maxSearchIndex = Math.floor(20000 * analyser.fftSize / sampleRate);

      for (let i = minIndex; i < maxSearchIndex; i++) {
        if (dataArray[i] > maxVal) {
          maxVal = dataArray[i];
          maxIndex = i;
        }
      }

      // Threshold in dB. -70 is more sensitive than -50
      if (maxVal > -70) {
        const detectedFreq = maxIndex * sampleRate / analyser.fftSize;
        // Round to nearest 50Hz to match our step
        const roundedFreq = Math.round(detectedFreq / 50) * 50;
        
        if (roundedFreq >= 18000 && roundedFreq <= 19500) {
          console.log(`[Audio] Detected frequency: ${roundedFreq}Hz (raw: ${detectedFreq})`);
          stopListening();
          onFrequencyDetected(roundedFreq);
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
