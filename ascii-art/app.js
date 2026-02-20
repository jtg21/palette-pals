// --- Character sets ordered from darkest to lightest ---
const CHARSETS = {
  standard:  ' .:-=+*#%@',
  detailed:  ' .\'`^",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
  blocks:    ' ░▒▓█',
  minimal:   ' .+#@',
};

// --- Core conversion engine ---

function imageToAscii(canvas, options) {
  const { charWidth, charset, color, invert } = options;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  const aspect = canvas.height / canvas.width;
  // Characters are roughly 2x taller than wide, so halve the row count
  const charHeight = Math.round(charWidth * aspect * 0.5);

  const cellW = canvas.width / charWidth;
  const cellH = canvas.height / charHeight;

  const chars = CHARSETS[charset] || CHARSETS.standard;
  const maxIdx = chars.length - 1;

  const lines = [];

  for (let row = 0; row < charHeight; row++) {
    let line = '';
    let colorLine = [];

    for (let col = 0; col < charWidth; col++) {
      // Sample a block of pixels and average them
      const x = Math.floor(col * cellW);
      const y = Math.floor(row * cellH);
      const w = Math.max(1, Math.ceil(cellW));
      const h = Math.max(1, Math.ceil(cellH));

      const imageData = ctx.getImageData(x, y, w, h);
      const data = imageData.data;

      let rSum = 0, gSum = 0, bSum = 0, count = 0;

      for (let i = 0; i < data.length; i += 4) {
        rSum += data[i];
        gSum += data[i + 1];
        bSum += data[i + 2];
        count++;
      }

      const rAvg = Math.round(rSum / count);
      const gAvg = Math.round(gSum / count);
      const bAvg = Math.round(bSum / count);

      // Perceived brightness (ITU-R BT.601)
      let brightness = (0.299 * rAvg + 0.587 * gAvg + 0.114 * bAvg) / 255;

      if (invert) brightness = 1 - brightness;

      // Map brightness to character index
      const charIdx = Math.round(brightness * maxIdx);
      const ch = chars[charIdx];

      if (color) {
        colorLine.push({ ch, r: rAvg, g: gAvg, b: bAvg });
      } else {
        line += ch;
      }
    }

    if (color) {
      lines.push(colorLine);
    } else {
      lines.push(line);
    }
  }

  return { lines, color };
}

// --- Rendering ---

function renderAscii(result, outputEl) {
  if (!result.color) {
    outputEl.textContent = result.lines.join('\n');
    outputEl.classList.remove('colored');
    return;
  }

  // Color mode: build HTML with colored spans
  outputEl.innerHTML = '';
  outputEl.classList.add('colored');

  result.lines.forEach((line, rowIdx) => {
    line.forEach(({ ch, r, g, b }) => {
      const span = document.createElement('span');
      span.textContent = ch;
      span.style.color = `rgb(${r},${g},${b})`;
      outputEl.appendChild(span);
    });
    if (rowIdx < result.lines.length - 1) {
      outputEl.appendChild(document.createTextNode('\n'));
    }
  });
}

function getPlainText(result) {
  if (!result.color) return result.lines.join('\n');
  return result.lines.map(line => line.map(c => c.ch).join('')).join('\n');
}

// --- DOM wiring ---

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const canvas = document.getElementById('source-canvas');
const output = document.getElementById('ascii-output');
const previewContainer = document.getElementById('preview-container');
const widthSlider = document.getElementById('width-slider');
const widthValue = document.getElementById('width-value');
const charsetSelect = document.getElementById('charset-select');
const colorToggle = document.getElementById('color-toggle');
const invertToggle = document.getElementById('invert-toggle');
const copyBtn = document.getElementById('copy-btn');
const toastEl = document.getElementById('toast');

let currentImage = null;
let currentResult = null;

function showToast(text) {
  toastEl.textContent = text;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 1200);
}

function processImage() {
  if (!currentImage) return;

  const ctx = canvas.getContext('2d');
  canvas.width = currentImage.naturalWidth;
  canvas.height = currentImage.naturalHeight;
  ctx.drawImage(currentImage, 0, 0);

  currentResult = imageToAscii(canvas, {
    charWidth: parseInt(widthSlider.value),
    charset: charsetSelect.value,
    color: colorToggle.checked,
    invert: invertToggle.checked,
  });

  renderAscii(currentResult, output);
  previewContainer.classList.remove('hidden');
  copyBtn.disabled = false;
}

function loadImage(file) {
  if (!file || !file.type.startsWith('image/')) return;

  const img = new Image();
  img.onload = () => {
    currentImage = img;
    dropZone.style.display = 'none';
    processImage();
  };
  img.src = URL.createObjectURL(file);
}

// File input
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
  if (e.target.files[0]) loadImage(e.target.files[0]);
});

// Drag and drop
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
});
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  if (e.dataTransfer.files[0]) loadImage(e.dataTransfer.files[0]);
});

// Also support paste
document.addEventListener('paste', (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      loadImage(item.getAsFile());
      break;
    }
  }
});

// Controls re-render on change
widthSlider.addEventListener('input', () => {
  widthValue.textContent = widthSlider.value;
  processImage();
});
charsetSelect.addEventListener('change', processImage);
colorToggle.addEventListener('change', processImage);
invertToggle.addEventListener('change', processImage);

// Copy
copyBtn.addEventListener('click', () => {
  if (!currentResult) return;
  const text = getPlainText(currentResult);
  navigator.clipboard.writeText(text).then(() => showToast('Copied!'));
});
