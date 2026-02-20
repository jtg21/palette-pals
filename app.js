// --- Color math utilities ---

function hslToRgb(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function luminance(r, g, b) {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

// --- Palette generation strategies ---

function generateAnalogous(baseHue) {
  const spread = randomInRange(15, 40);
  return [
    baseHue - spread * 2,
    baseHue - spread,
    baseHue,
    baseHue + spread,
    baseHue + spread * 2,
  ].map(h => ((h % 360) + 360) % 360);
}

function generateComplementary(baseHue) {
  const comp = (baseHue + 180) % 360;
  return [
    baseHue,
    (baseHue + 15) % 360,
    (baseHue + 345) % 360,
    comp,
    (comp + 20) % 360,
  ];
}

function generateTriadic(baseHue) {
  const t1 = (baseHue + 120) % 360;
  const t2 = (baseHue + 240) % 360;
  return [
    baseHue,
    (baseHue + 15) % 360,
    t1,
    t2,
    (t2 + 15) % 360,
  ];
}

function generateSplitComplementary(baseHue) {
  const sc1 = (baseHue + 150) % 360;
  const sc2 = (baseHue + 210) % 360;
  return [
    baseHue,
    (baseHue + 20) % 360,
    (baseHue + 340) % 360,
    sc1,
    sc2,
  ];
}

function generateRandom() {
  const hues = [];
  for (let i = 0; i < 5; i++) {
    hues.push(Math.random() * 360);
  }
  return hues;
}

// --- Color name approximation ---

function getColorName(h, s, l) {
  if (l < 12) return 'Noir';
  if (l > 92) return 'Snow';
  if (s < 10) return l > 50 ? 'Silver' : 'Slate';

  const names = [
    [0, 'Rose'], [15, 'Coral'], [30, 'Amber'], [45, 'Gold'],
    [60, 'Lime'], [80, 'Jade'], [120, 'Emerald'], [150, 'Mint'],
    [170, 'Teal'], [190, 'Cyan'], [210, 'Azure'], [230, 'Cobalt'],
    [250, 'Indigo'], [270, 'Violet'], [290, 'Purple'], [310, 'Orchid'],
    [330, 'Magenta'], [350, 'Crimson'],
  ];

  let closest = names[0];
  let minDist = 999;
  for (const [hue, name] of names) {
    const dist = Math.min(Math.abs(h - hue), 360 - Math.abs(h - hue));
    if (dist < minDist) {
      minDist = dist;
      closest = [hue, name];
    }
  }

  if (l < 35) return 'Dark ' + closest[1];
  if (l > 70) return 'Light ' + closest[1];
  return closest[1];
}

// --- Main palette generation ---

function generatePalette(harmonyType) {
  const baseHue = Math.random() * 360;

  let hues;
  switch (harmonyType) {
    case 'analogous': hues = generateAnalogous(baseHue); break;
    case 'complementary': hues = generateComplementary(baseHue); break;
    case 'triadic': hues = generateTriadic(baseHue); break;
    case 'split-complementary': hues = generateSplitComplementary(baseHue); break;
    case 'random': hues = generateRandom(); break;
    default: hues = generateAnalogous(baseHue);
  }

  return hues.map((hue, i) => {
    const s = randomInRange(50, 90);
    const l = randomInRange(30, 75);
    const [r, g, b] = hslToRgb(hue, s, l);
    const hex = rgbToHex(r, g, b);
    const lum = luminance(r, g, b);
    const name = getColorName(hue, s, l);
    return { hex, lum, name, hue: Math.round(hue), s: Math.round(s), l: Math.round(l) };
  });
}

// --- DOM rendering ---

const paletteEl = document.getElementById('palette');
const generateBtn = document.getElementById('generate-btn');
const harmonySelect = document.getElementById('harmony-type');
const toastEl = document.getElementById('toast');

function showToast(text) {
  toastEl.textContent = text;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 1200);
}

function renderPalette() {
  const colors = generatePalette(harmonySelect.value);
  paletteEl.innerHTML = '';

  colors.forEach((color, i) => {
    const swatch = document.createElement('div');
    swatch.className = `swatch ${color.lum > 0.5 ? 'light' : 'dark'}`;
    swatch.style.backgroundColor = color.hex;
    swatch.style.animationDelay = `${i * 0.07}s`;
    swatch.innerHTML = `
      <span class="swatch-hex">${color.hex.toUpperCase()}</span>
      <span class="swatch-name">${color.name}</span>
    `;
    swatch.addEventListener('click', () => {
      navigator.clipboard.writeText(color.hex.toUpperCase()).then(() => {
        showToast(`Copied ${color.hex.toUpperCase()}`);
      });
    });
    paletteEl.appendChild(swatch);
  });
}

generateBtn.addEventListener('click', renderPalette);
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && e.target === document.body) {
    e.preventDefault();
    renderPalette();
  }
});

// Generate initial palette
renderPalette();
