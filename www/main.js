// ─── Top-level Module Imports ──────────────────────────────────
import init, { hide_text, reveal_text, hide_file, reveal_file } from './pkg/shadowbyte_core.js';

// ─── Constants ────────────────────────────────────────────────
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;  // 10MB carrier image limit
const MAX_PAYLOAD_SIZE = 2 * 1024 * 1024; // 2MB hidden payload file limit

// ─── Toast System ─────────────────────────────────────────────
function showToast(message, type = 'error') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  // Trigger smooth enter animation
  requestAnimationFrame(() => toast.classList.add('visible'));

  // Auto-remove after 4 seconds
  setTimeout(() => {
    toast.classList.remove('visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 4000);
}

// ─── Tab Switching ────────────────────────────────────────────
// Registered immediately so UI is 100% responsive right away
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    document.querySelectorAll('.panel').forEach(p => {
      p.classList.remove('active');
      p.classList.add('hidden');
    });

    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');

    const targetId = tab.dataset.target;
    const targetPanel = document.getElementById(targetId);
    if (targetPanel) {
      targetPanel.classList.remove('hidden');
      targetPanel.classList.add('active');
    }
  });
});

// ─── Global Drag & Drop Prevention ────────────────────────────
// Prevents the browser from navigating away or opening the dropped image
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  window.addEventListener(eventName, e => {
    e.preventDefault();
  }, false);
});

// ─── Global Drag Overlay ──────────────────────────────────────
let dragCounter = 0;
const dragOverlay = document.getElementById('drag-overlay');

window.addEventListener('dragenter', e => {
  if (e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
    dragCounter++;
    if (dragOverlay) dragOverlay.classList.remove('hidden');
  }
});

window.addEventListener('dragleave', () => {
  dragCounter--;
  if (dragCounter <= 0) {
    dragCounter = 0;
    if (dragOverlay) dragOverlay.classList.add('hidden');
  }
});

window.addEventListener('drop', () => {
  dragCounter = 0;
  if (dragOverlay) dragOverlay.classList.add('hidden');
});

// ─── Dropzone Setup Helper ────────────────────────────────────
function setupDropzone({
  dropzoneId,
  inputId,
  previewId,
  previewContainerId,
  previewNameId,
  removeId,
  maxSize,
  requirePng = true,
  onFile
}) {
  const dropzone         = document.getElementById(dropzoneId);
  const input            = document.getElementById(inputId);
  const preview          = document.getElementById(previewId);
  const previewContainer = document.getElementById(previewContainerId);
  const previewName      = document.getElementById(previewNameId);
  const removeBtn        = document.getElementById(removeId);

  if (!dropzone || !input) return;

  function validateAndShowFile(file) {
    if (!file) return;

    // 1. Format validation (PNG check)
    if (requirePng) {
      const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
      if (!isPng) {
        showToast('Invalid format! Only PNG files are supported to prevent compression data loss.', 'error');
        input.value = '';
        return;
      }
    }

    // 2. File size validation
    if (maxSize && file.size > maxSize) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      const maxMb = (maxSize / (1024 * 1024)).toFixed(0);
      showToast(`File too large: ${sizeMb}MB. Maximum allowed is ${maxMb}MB.`, 'error');
      input.value = '';
      return;
    }

    // Show preview
    const url = URL.createObjectURL(file);
    preview.src = url;
    preview.onload = () => URL.revokeObjectURL(url);
    if (previewName) previewName.textContent = file.name;

    dropzone.classList.add('hidden');
    if (previewContainer) previewContainer.classList.remove('hidden');

    onFile(file);
  }

  function clearFile() {
    preview.src = '';
    if (previewName) previewName.textContent = '';
    if (previewContainer) previewContainer.classList.add('hidden');
    dropzone.classList.remove('hidden');
    input.value = '';
    onFile(null);
  }

  // Click triggers file dialog without double-firing
  dropzone.addEventListener('click', e => {
    if (e.target === input) return;
    input.click();
  });

  // Stop input clicks from bubbling to dropzone
  input.addEventListener('click', e => {
    e.stopPropagation();
  });

  // Keyboard accessibility
  dropzone.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      input.click();
    }
  });

  input.addEventListener('change', () => {
    if (input.files && input.files.length > 0) {
      validateAndShowFile(input.files[0]);
    }
  });

  if (removeBtn) {
    removeBtn.addEventListener('click', e => {
      e.stopPropagation();
      clearFile();
    });
  }

  // Dropzone drag events
  dropzone.addEventListener('dragover', e => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.add('drag-over');
  });

  dropzone.addEventListener('dragleave', e => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove('drag-over');
  });

  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove('drag-over');
    if (dragOverlay) dragOverlay.classList.add('hidden');
    dragCounter = 0;

    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndShowFile(e.dataTransfer.files[0]);
    }
  });
}

// ─── Image Processing Helpers ─────────────────────────────────
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
      // Fast typed-array copy (avoids Array.from() browser freezes)
      resolve({
        rgba: new Uint8Array(imageData.data),
        width: canvas.width,
        height: canvas.height
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to read image file.'));
    };
    img.src = url;
  });
}

function rgbaToBlob(rgba, width, height) {
  return new Promise((resolve, reject) => {
    const canvas = document.getElementById('scratch-canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const clamped = new Uint8ClampedArray(rgba);
    const imageData = new ImageData(clamped, width, height);
    ctx.putImageData(imageData, 0, 0);
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to generate output image blob.'));
    }, 'image/png');
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  const text = btn.querySelector('.btn-text');
  const loader = btn.querySelector('.loader');
  btn.disabled = loading;
  if (text) text.classList.toggle('hidden', loading);
  if (loader) loader.classList.toggle('hidden', !loading);
}

// ─── Hide Panel Logic ─────────────────────────────────────────
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
  requirePng: true,
  onFile: file => {
    hideImageFile = file;
    updateHideBtn();
  }
});

// Mode toggle (Text vs File)
document.querySelectorAll('input[name="hide-mode"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const isFile = radio.value === 'file';
    document.getElementById('hide-text-group').classList.toggle('hidden', isFile);
    document.getElementById('hide-file-group').classList.toggle('hidden', !isFile);
    updateHideBtn();
  });
});

// Binary file payload dropzone
const hideFileDropzone = document.getElementById('hide-file-dropzone');
const hideFileInput    = document.getElementById('hide-file-input');
const hideFileLabel    = document.getElementById('hide-file-label');

function setPayloadFile(file) {
  if (!file) {
    hidePayloadFile = null;
    hideFileLabel.textContent = 'Select a file to hide';
    updateHideBtn();
    return;
  }

  if (file.size > MAX_PAYLOAD_SIZE) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    showToast(`File too large: ${sizeMb}MB. Maximum payload is 2MB.`, 'error');
    hideFileInput.value = '';
    return;
  }

  hidePayloadFile = file;
  const sizeKb = (file.size / 1024).toFixed(0);
  hideFileLabel.textContent = `${file.name} (${sizeKb} KB)`;
  updateHideBtn();
}

if (hideFileDropzone && hideFileInput) {
  hideFileDropzone.addEventListener('click', e => {
    if (e.target === hideFileInput) return;
    hideFileInput.click();
  });

  hideFileInput.addEventListener('click', e => e.stopPropagation());

  hideFileInput.addEventListener('change', () => {
    if (hideFileInput.files && hideFileInput.files.length > 0) {
      setPayloadFile(hideFileInput.files[0]);
    }
  });

  hideFileDropzone.addEventListener('dragover', e => {
    e.preventDefault();
    e.stopPropagation();
    hideFileDropzone.classList.add('drag-over');
  });

  hideFileDropzone.addEventListener('dragleave', e => {
    e.preventDefault();
    e.stopPropagation();
    hideFileDropzone.classList.remove('drag-over');
  });

  hideFileDropzone.addEventListener('drop', e => {
    e.preventDefault();
    e.stopPropagation();
    hideFileDropzone.classList.remove('drag-over');
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setPayloadFile(e.dataTransfer.files[0]);
    }
  });
}

function updateHideBtn() {
  const btn = document.getElementById('hide-run');
  if (!btn || !wasmReady) return;

  const mode = document.querySelector('input[name="hide-mode"]:checked').value;
  const hasPayload = mode === 'text'
    ? document.getElementById('hide-message').value.trim().length > 0
    : hidePayloadFile !== null;

  btn.disabled = !hideImageFile || !hasPayload;
}

document.getElementById('hide-message').addEventListener('input', updateHideBtn);

// ─── Reveal Panel Logic ───────────────────────────────────────
let revealImageFile = null;

setupDropzone({
  dropzoneId: 'reveal-dropzone',
  inputId: 'reveal-img-input',
  previewId: 'reveal-preview',
  previewContainerId: 'reveal-preview-container',
  previewNameId: 'reveal-preview-name',
  removeId: 'reveal-remove',
  maxSize: MAX_IMAGE_SIZE,
  requirePng: true,
  onFile: file => {
    revealImageFile = file;
    updateRevealBtn();
  }
});

function updateRevealBtn() {
  const btn = document.getElementById('reveal-run');
  if (!btn || !wasmReady) return;
  btn.disabled = !revealImageFile;
}

// ─── Asynchronous WASM Initialization ─────────────────────────
let wasmReady = false;

async function initWasmEngine() {
  try {
    await init();
    wasmReady = true;

    const hideBtn = document.getElementById('hide-run');
    const revealBtn = document.getElementById('reveal-run');

    if (hideBtn) hideBtn.querySelector('.btn-text').textContent = 'Inject & Download';
    if (revealBtn) revealBtn.querySelector('.btn-text').textContent = 'Extract Payload';

    updateHideBtn();
    updateRevealBtn();
  } catch (err) {
    console.error('WASM engine load error:', err);
    showToast('Failed to load WebAssembly engine. Please reload the page.', 'error');
  }
}

// Start loading WASM in background without blocking the UI
initWasmEngine();

// ─── Hide Action ──────────────────────────────────────────────
document.getElementById('hide-run').addEventListener('click', async () => {
  if (!wasmReady) {
    showToast('Engine is still loading, please wait a moment...', 'error');
    return;
  }

  const password = document.getElementById('hide-password').value;
  const mode = document.querySelector('input[name="hide-mode"]:checked').value;

  if (!hideImageFile) return showToast('Please select a carrier PNG image.', 'error');
  if (!password)      return showToast('Please enter an encryption password.', 'error');

  setLoading('hide-run', true);

  try {
    const { rgba, width, height } = await imageFileToRgba(hideImageFile);

    let resultRgba;
    if (mode === 'text') {
      const message = document.getElementById('hide-message').value.trim();
      if (!message) {
        showToast('Please enter a secret message.', 'error');
        setLoading('hide-run', false);
        return;
      }
      resultRgba = hide_text(rgba, message, password);
    } else {
      if (!hidePayloadFile) {
        showToast('Please select a file to hide.', 'error');
        setLoading('hide-run', false);
        return;
      }
      const fileBytes = new Uint8Array(await hidePayloadFile.arrayBuffer());
      resultRgba = hide_file(rgba, fileBytes, password);
    }

    const blob = await rgbaToBlob(resultRgba, width, height);
    downloadBlob(blob, 'shadowbyte_stego.png');
    showToast('Success! Stego image generated and downloaded.', 'success');
  } catch (err) {
    console.error('Hide error:', err);
    showToast(`Error: ${err}`, 'error');
  } finally {
    setLoading('hide-run', false);
  }
});

// ─── Reveal Action ────────────────────────────────────────────
document.getElementById('reveal-run').addEventListener('click', async () => {
  if (!wasmReady) {
    showToast('Engine is still loading, please wait a moment...', 'error');
    return;
  }

  const password = document.getElementById('reveal-password').value;
  if (!revealImageFile) return showToast('Please select a stego PNG image.', 'error');
  if (!password)        return showToast('Please enter the decryption password.', 'error');

  const resultContainer = document.getElementById('reveal-result');
  const textOut         = document.getElementById('reveal-text-output');
  const fileOut         = document.getElementById('reveal-file-output');
  const dlBtn           = document.getElementById('reveal-file-download');

  resultContainer.classList.add('hidden');
  setLoading('reveal-run', true);

  try {
    const { rgba } = await imageFileToRgba(revealImageFile);

    let isText = true;
    let extracted;

    // Try text decode first; if invalid UTF-8, decode as binary file
    try {
      extracted = reveal_text(rgba, password);
    } catch {
      isText = false;
      try {
        extracted = reveal_file(rgba, password);
      } catch (fileErr) {
        throw new Error('Extraction failed. Incorrect password or invalid stego image.');
      }
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
      dlBtn.download = 'extracted_secret';
    }

    showToast('Payload extracted successfully!', 'success');
  } catch (err) {
    console.error('Reveal error:', err);
    showToast(`${err.message || err}`, 'error');
    resultContainer.classList.add('hidden');
  } finally {
    setLoading('reveal-run', false);
  }
});
