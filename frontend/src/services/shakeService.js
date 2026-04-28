let isShaking = false;
let lastShakeTime = 0;
const SHAKE_THRESHOLD = 15; // Adjusted for better detection
const COOLDOWN = 1000; // 1 second between shakes

export async function requestMotionPermission() {
  if (typeof DeviceMotionEvent.requestPermission === 'function') {
    try {
      const permissionState = await DeviceMotionEvent.requestPermission();
      return permissionState === 'granted';
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }
  return true; // Not required on most platforms (except iOS)
}

export function startShakeDetection(onShake) {
  const handleMotion = (event) => {
    const acc = event.accelerationIncludingGravity;
    if (!acc) return;

    const { x, y, z } = acc;
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    const now = Date.now();

    if (magnitude > SHAKE_THRESHOLD && now - lastShakeTime > COOLDOWN) {
      lastShakeTime = now;
      console.log(`[ShakeService] Shake detected! Magnitude: ${magnitude.toFixed(2)}`);
      onShake();
    }
  };

  window.addEventListener('devicemotion', handleMotion);
  return () => window.removeEventListener('devicemotion', handleMotion);
}
