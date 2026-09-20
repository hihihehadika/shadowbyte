// ─── Constants ────────────────────────────────────────────────
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;  // 10MB carrier image limit
const MAX_PAYLOAD_SIZE = 2 * 1024 * 1024; // 2MB hidden file limit

// ─── Toast System ─────────────────────────────────────────────
function showToast(message, type = 'error') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => toast.classList.add('visible'));

  // Auto-remove after 4s
  setTimeout(() => {
    toast.classList.remove('visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 4000);
}

// ─── Tab Switching (registered immediately, before WASM loads) ─
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => {
      p.classList.remove('active');
      p.classList.add('hidden');
    });
    tab.classList.add('active');
    const target = document.getElementById(tab.dataset.target);
    target.classList.remove('hidden');
    target.classList.add('active');
  });
});

// ─── Global drag-drop guard (prevents browser opening files) ──
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => e.preventDefault());

// ─── Drag overlay ─────────────────────────────────────────────
let dragCounter = 0;
const dragOverlay = document.getElementById('drag-overlay');

window.addEventListener('dragenter', () => {
  dragCounter++;
  dragOverlay.classList.remove('hidden');
});
window.addEventListener('dragleave', () => {
  dragCounter--;
  if (dragCounter <= 0) {
    dragCounter = 0;
    dragOverlay.classList.add('hidden');
  }
});
window.addEventListener('drop', () => {
  dragCounter = 0;
  dragOverlay.classList.add('hidden');
});

// ─── Dropzone helper ──────────────────────────────────────────
// Fix: JS handles clicks exclusively — no <label for=""> to avoid double-trigger
function setupDropzone({ dropzoneId, inputId, previewId, previewContainerId, previewNameId, removeId, maxSize, onFile }) {
  const dropzone         = document.getElementById(dropzoneId);
  const input            = document.getElementById(inputId);
  const preview          = document.getElementById(previewId);
  const previewContainer = document.getElementById(previewContainerId);
  const previewName      = document.getElementById(previewNameId);
  const removeBtn        = document.getElementById(removeId);

  function validateAndShowFile(file) {
    if (!file) return;

    if (maxSize && file.size > maxSize) {
      showToast(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum is ${(maxSize / 1024 / 1024).toFixed(0)}MB.`, 'error');
      input.value = '';
      return;
    }

    const url = URL.createObjectURL(file);
    preview.src = url;
    preview.onload = () => URL.revokeObjectURL(url);
    previewName.textContent = file.name;
    dropzone.classList.add('hidden');
    previewContainer.classList.remove('hidden');
    onFile(file);
  }

  function clearFile() {
    preview.src = '';
    previewName.textContent = '';
    previewContainer.classList.add('hidden');
    dropzone.classList.remove('hidden');
    input.value = '';
    onFile(null);
  }

  // Fix: single click handler on dropzone div, not the <label>
  dropzone.addEventListener('click', () => input.click());
  input.addEventListener('change', () => validateAndShowFile(input.files[0]));
  removeBtn.addEventListener('click', e => { e.stopPropagation(); clearFile(); });

  dropzone.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); dropzone.classList.add('drag-over'); });
  dropzone.addEventListener('dragleave', e => { e.stopPropagation(); dropzone.classList.remove('drag-over'); });
  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove('drag-over');
    validateAndShowFile(e.dataTransfer.files[0]);
  });
}

// ─── Helper: image file → raw RGBA ────────────────────────────
function imageFileToRgba(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.getElementById('scratch-canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      // Fix: use Uint8Array(buffer) not Array.from() — avoids memory freeze
      resolve({ rgba: new Uint8Array(imageData.data.buffer), width: canvas.width, height: canvas.height });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image.')); };
    img.src = url;
  });
}

// ─── Helper: raw RGBA → PNG Blob ──────────────────────────────
function rgbaToBlob(rgba, width, height) {
  return new Promise(resolve => {
    const canvas = document.getElementById('scratch-canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const imageData = new ImageData(new Uint8ClampedArray(rgba.buffer || rgba), width, height);
    ctx.putImageData(imageData, 0, 0);
    canvas.toBlob(resolve, 'image/png');
  });
}

// ─── Helper: trigger download ─────────────────────────────────
function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── Helper: loading state ────────────────────────────────────
function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  const text = btn.querySelector('.btn-text');
  const loader = btn.querySelector('.loader');
  btn.disabled = loading;
  text.classList.toggle('hidden', loading);
  loader.classList.toggle('hidden', !loading);
}

// ─── HIDE panel setup ─────────────────────────────────────────
let hideImageFile = null;
let hidePayloadFile = null;

setupDropzone({
  dropzoneId: 'hide-dropzone',
  inputId: 'hide-img-input',
  previewId: 'hide-preview',
  previewContainerId: 'hide-preview-container',
  previewNameId: 'hide-preview-name',
  removeId: 'hide-remove',
  maxSize: MAX_IMAGE_SIZE,
  onFile: f => { hideImageFile = f; updateHideBtn(); }
});

// Payload type toggle
document.querySelectorAll('input[name="hide-mode"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const isFile = radio.value === 'file';
    document.getElementById('hide-text-group').classList.toggle('hidden', isFile);
    document.getElementById('hide-file-group').classList.toggle('hidden', !isFile);
    updateHideBtn();
  });
});

// Payload file dropzone (small)
const hideFileDropzone = document.getElementById('hide-file-dropzone');
const hideFileInput    = document.getElementById('hide-file-input');
const hideFileLabel    = document.getElementById('hide-file-label');

function setPayloadFile(file) {
  if (!file) { hidePayloadFile = null; hideFileLabel.textContent = 'Select a file to hide'; updateHideBtn(); return; }
  if (file.size > MAX_PAYLOAD_SIZE) {
    showToast(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum payload is 2MB.`, 'error');
    hideFileInput.value = '';
    return;
  }
  hidePayloadFile = file;
  hideFileLabel.textContent = `${file.name} (${(file.size / 1024).toFixed(0)} KB)`;
  updateHideBtn();
}

hideFileDropzone.addEventListener('click', () => hideFileInput.click());
hideFileInput.addEventListener('change', () => setPayloadFile(hideFileInput.files[0]));
hideFileDropzone.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); hideFileDropzone.classList.add('drag-over'); });
hideFileDropzone.addEventListener('dragleave', e => { e.stopPropagation(); hideFileDropzone.classList.remove('drag-over'); });
hideFileDropzone.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); hideFileDropzone.classList.remove('drag-over'); setPayloadFile(e.dataTransfer.files[0]); });

function updateHideBtn() {
  const btn = document.getElementById('hide-run');
  if (!wasmReady) return; // still loading
  const mode = document.querySelector('input[name="hide-mode"]:checked').value;
  const hasPayload = mode === 'text'
    ? document.getElementById('hide-message').value.trim().length > 0
    : hidePayloadFile !== null;
  btn.disabled = !hideImageFile || !hasPayload;
}

document.getElementById('hide-message').addEventListener('input', updateHideBtn);

// ─── REVEAL panel setup ───────────────────────────────────────
let revealImageFile = null;

setupDropzone({
  dropzoneId: 'reveal-dropzone',
  inputId: 'reveal-img-input',
  previewId: 'reveal-preview',
  previewContainerId: 'reveal-preview-container',
  previewNameId: 'reveal-preview-name',
  removeId: 'reveal-remove',
  maxSize: MAX_IMAGE_SIZE,
  onFile: f => { revealImageFile = f; updateRevealBtn(); }
});

function updateRevealBtn() {
  const btn = document.getElementById('reveal-run');
  if (!wasmReady) return;
  btn.disabled = !revealImageFile;
}

// ─── Load WASM (after all listeners are set) ──────────────────
let wasmReady = false;
let hide_text_fn, reveal_text_fn, hide_file_fn, reveal_file_fn;

// Set buttons to "loading" state initially
document.getElementById('hide-run').disabled = true;
document.getElementById('reveal-run').disabled = true;
document.getElementById('hide-run').querySelector('.btn-text').textContent = 'Loading Engine...';
document.getElementById('reveal-run').querySelector('.btn-text').textContent = 'Loading Engine...';

import init, { hide_text, reveal_text, hide_file, reveal_file } from './pkg/shadowbyte_core.js';

try {
  await init();
  wasmReady = true;
  hide_text_fn   = hide_text;
  reveal_text_fn = reveal_text;
  hide_file_fn   = hide_file;
  reveal_file_fn = reveal_file;

  document.getElementById('hide-run').querySelector('.btn-text').textContent = 'Inject & Download';
  document.getElementById('reveal-run').querySelector('.btn-text').textContent = 'Extract Payload';
  updateHideBtn();
  updateRevealBtn();
} catch (err) {
  showToast('Failed to load the WASM engine. Please refresh the page.', 'error');
}

// ─── HIDE: Run ────────────────────────────────────────────────
document.getElementById('hide-run').addEventListener('click', async () => {
  if (!wasmReady) return;
  const password = document.getElementById('hide-password').value;
  const mode     = document.querySelector('input[name="hide-mode"]:checked').value;

  if (!hideImageFile) return showToast('Please select a carrier image.', 'error');
  if (!password)      return showToast('Please enter a password.', 'error');

  setLoading('hide-run', true);
  try {
    const { rgba, width, height } = await imageFileToRgba(hideImageFile);

    let resultRgba;
    if (mode === 'text') {
      const message = document.getElementById('hide-message').value.trim();
      if (!message) { showToast('Please enter a message.', 'error'); return; }
      resultRgba = hide_text_fn(rgba, message, password);
    } else {
      if (!hidePayloadFile) { showToast('Please select a file to hide.', 'error'); return; }
      const fileBytes = new Uint8Array(await hidePayloadFile.arrayBuffer());
      resultRgba = hide_file_fn(rgba, fileBytes, password);
    }

    const blob = await rgbaToBlob(resultRgba, width, height);
    download(blob, 'output.png');
    showToast('Done! Output image downloaded.', 'success');
  } catch (err) {
    showToast(`Error: ${err}`, 'error');
  } finally {
    setLoading('hide-run', false);
  }
});

// ─── REVEAL: Run ──────────────────────────────────────────────
document.getElementById('reveal-run').addEventListener('click', async () => {
  if (!wasmReady) return;
  const password = document.getElementById('reveal-password').value;

  if (!revealImageFile) return showToast('Please select an image.', 'error');
  if (!password)        return showToast('Please enter a password.', 'error');

  const resultContainer = document.getElementById('reveal-result');
  const textOut   = document.getElementById('reveal-text-output');
  const fileOut   = document.getElementById('reveal-file-output');
  const dlBtn     = document.getElementById('reveal-file-download');

  resultContainer.classList.add('hidden');
  setLoading('reveal-run', true);

  try {
    const { rgba } = await imageFileToRgba(revealImageFile);

    let isText = true;
    let extracted;
    try {
      extracted = reveal_text_fn(rgba, password);
    } catch {
      isText = false;
      extracted = reveal_file_fn(rgba, password);
    }

    resultContainer.classList.remove('hidden');
    if (isText) {
      textOut.textContent = extracted;
      textOut.classList.remove('hidden');
      fileOut.classList.add('hidden');
    } else {
      textOut.classList.add('hidden');
      fileOut.classList.remove('hidden');
      const blob = new Blob([extracted]);
      dlBtn.href = URL.createObjectURL(blob);
      dlBtn.download = 'extracted_file';
    }
    showToast('Payload extracted successfully!', 'success');
  } catch (err) {
    showToast(`Error: ${err}`, 'error');
    resultContainer.classList.add('hidden');
  } finally {
    setLoading('reveal-run', false);
  }
});
