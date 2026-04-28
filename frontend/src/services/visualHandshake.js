const COLORS = {
  RED: { name: 'RED', rgb: [255, 0, 0], hex: '#ff0000' },
  GREEN: { name: 'GREEN', rgb: [0, 255, 0], hex: '#00ff00' },
  BLUE: { name: 'BLUE', rgb: [0, 0, 255], hex: '#0000ff' },
  YELLOW: { name: 'YELLOW', rgb: [255, 255, 0], hex: '#ffff00' },
};

const COLOR_LIST = Object.values(COLORS);
const FREQUENCIES = [16000, 16500, 17000, 17500, 18000];

// Map a Room ID to a 4-color sequence
export function getSequenceFromId(roomId) {
  const idStr = roomId.toString();
  const sequence = [];
  for (let i = 0; i < 4; i++) {
    const charCode = idStr.charCodeAt(i % idStr.length);
    sequence.push(COLOR_LIST[charCode % COLOR_LIST.length]);
  }
  return sequence;
}

// Detect which of our defined colors is closest to the sampled RGB
export function detectColor(r, g, b) {
  let closest = null;
  let minDistance = Infinity;

  for (const color of COLOR_LIST) {
    const dr = r - color.rgb[0];
    const dg = g - color.rgb[1];
    const db = b - color.rgb[2];
    const distance = Math.sqrt(dr * dr + dg * dg + db * db);

    if (distance < minDistance) {
      minDistance = distance;
      closest = color;
    }
  }

  // If distance is too far (e.g. black), return null
  if (minDistance > 180) return null;
  return closest;
}

export function isSequenceMatch(detected, target) {
  if (detected.length < target.length) return false;
  const recent = detected.slice(-target.length);
  return recent.every((color, i) => color.name === target[i].name);
}

export function detectRoomFromSequence(detected) {
  for (const freq of FREQUENCIES) {
    const target = getSequenceFromId(freq);
    if (isSequenceMatch(detected, target)) {
      return freq;
    }
  }
  return null;
}
