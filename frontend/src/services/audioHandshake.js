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
  // Higher range to be less audible, steps of 50Hz
  const min = 18500;
  const max = 19700;
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
      // Small delay to let the fade-out happen if we had a gain node, 
      // but for simplicity we just stop it now. 
      // To be perfect, we'd need to keep track of the gainNode.
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

      // Only check frequencies above 17kHz to avoid voice/noise
      const minIndex = Math.floor(17000 * analyser.fftSize / sampleRate);
      const maxSearchIndex = Math.floor(20000 * analyser.fftSize / sampleRate);

      for (let i = minIndex; i < maxSearchIndex; i++) {
        if (dataArray[i] > maxVal) {
          maxVal = dataArray[i];
          maxIndex = i;
        }
      }

      // Lower threshold for better sensitivity on laptops/desktops
      // -80 is very sensitive, which we need for small phone speakers
      if (maxVal > -80) {
        const detectedFreq = maxIndex * sampleRate / analyser.fftSize;
        // Round to nearest 50Hz to match our step
        const roundedFreq = Math.round(detectedFreq / 50) * 50;
        
        if (roundedFreq >= 18500 && roundedFreq <= 19700) {
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
