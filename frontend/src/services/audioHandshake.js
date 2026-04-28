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

const FREQUENCIES = [16000, 16500, 17000, 17500, 18000];
const MIN_THRESHOLD = -75; // Slightly less sensitive to avoid noise but reliable
const STABILITY_REQUIRED = 3; // Reduced from 5 for faster detection
const MATCH_WINDOW = 300; // Hz - wider window for cheaper mics

export function generateRoomFrequency() {
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
    
    analyser.fftSize = 8192;
    source.connect(analyser);

    const dataArray = new Float32Array(analyser.frequencyBinCount);
    const sampleRate = ctx.sampleRate;

    let lastMatch = null;
    let matchCount = 0;

    const analyze = () => {
      if (!isListening) return;

      analyser.getFloatFrequencyData(dataArray);

      let maxVal = -Infinity;
      let maxIndex = -1;

      // Range check 15.5kHz to 18.5kHz
      const minIndex = Math.floor(15500 * analyser.fftSize / sampleRate);
      const maxSearchIndex = Math.floor(18500 * analyser.fftSize / sampleRate);

      for (let i = minIndex; i < maxSearchIndex; i++) {
        if (dataArray[i] > maxVal) {
          maxVal = dataArray[i];
          maxIndex = i;
        }
      }

      if (maxVal > MIN_THRESHOLD) {
        const detectedFreq = maxIndex * sampleRate / analyser.fftSize;
        
        const closest = FREQUENCIES.reduce((prev, curr) => 
          Math.abs(curr - detectedFreq) < Math.abs(prev - detectedFreq) ? curr : prev
        );

        if (Math.abs(closest - detectedFreq) < MATCH_WINDOW) {
          if (closest === lastMatch) {
            matchCount++;
          } else {
            lastMatch = closest;
            matchCount = 1;
          }

          if (matchCount >= STABILITY_REQUIRED) {
            console.log(`[Audio] Confirmed Detection: ${closest}Hz (Count: ${matchCount})`);
            stopListening();
            onFrequencyDetected(closest);
            return;
          }
        } else {
          matchCount = 0;
        }
      } else {
        matchCount = 0;
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

