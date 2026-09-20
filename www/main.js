import init, { hide_text, reveal_text, hide_file, reveal_file } from './pkg/shadowbyte_core.js';

// ─── Init WASM ───────────────────────────────────────────────
await init();

// ─── Helpers ─────────────────────────────────────────────────

/** Draw an image file to the scratch canvas and return its raw RGBA Uint8Array + dimensions. */
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
      resolve({ rgba: imageData.data, width: canvas.width, height: canvas.height });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image.')); };
    img.src = url;
  });
}

/** Convert a modified RGBA Uint8Array back to a PNG Blob. */
function rgbaToBlob(rgba, width, height) {
  return new Promise((resolve) => {
    const canvas = document.getElementById('scratch-canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const imageData = new ImageData(new Uint8ClampedArray(rgba), width, height);
    ctx.putImageData(imageData, 0, 0);
    canvas.toBlob(resolve, 'image/png');
  });
}

/** Trigger a file download in the browser. */
function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function setStatus(el, type, msg) {
  el.className = `status ${type}`;
  el.textContent = msg;
}

// ─── Tab switching ────────────────────────────────────────────

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
    tab.classList.add('active');
    document.getElementById(`panel-${tab.dataset.tab}`).classList.remove('hidden');
  });
});

// ─── Dropzone helper ──────────────────────────────────────────

function setupDropzone(dropzoneId, inputId, previewImgId, previewWrapId, removeId, onFile) {
  const dropzone = document.getElementById(dropzoneId);
  const input    = document.getElementById(inputId);
  const preview  = document.getElementById(previewImgId);
  const wrap     = document.getElementById(previewWrapId);
  const remove   = document.getElementById(removeId);

  function showFile(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    preview.src = url;
    dropzone.hidden = true;
    wrap.hidden = false;
    onFile(file);
  }

  function clearFile() {
    URL.revokeObjectURL(preview.src);
    preview.src = '';
    dropzone.hidden = false;
    wrap.hidden = true;
    onFile(null);
  }

  dropzone.addEventListener('click', () => input.click());
  input.addEventListener('change', () => showFile(input.files[0]));
  remove.addEventListener('click', clearFile);

  dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    showFile(e.dataTransfer.files[0]);
  });
}

// ─── HIDE panel ───────────────────────────────────────────────

let hideImageFile = null;
let hidePayloadFile = null;

setupDropzone('hide-dropzone', 'hide-img-input', 'hide-preview', 'hide-preview-wrap', 'hide-remove', f => { hideImageFile = f; });

// Mode toggle (text / file)
document.querySelectorAll('input[name="hide-mode"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const isFile = radio.value === 'file';
    document.getElementById('hide-text-field').hidden = isFile;
    document.getElementById('hide-file-field').hidden = !isFile;
  });
});

// File payload dropzone
const hideFileDropzone = document.getElementById('hide-file-dropzone');
const hideFileInput    = document.getElementById('hide-file-input');
const hideFileInfo     = document.getElementById('hide-file-info');

function setPayloadFile(file) {
  if (!file) { hidePayloadFile = null; hideFileInfo.hidden = true; return; }
  hidePayloadFile = file;
  hideFileInfo.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
  hideFileInfo.hidden = false;
}

hideFileDropzone.addEventListener('click', () => hideFileInput.click());
hideFileInput.addEventListener('change', () => setPayloadFile(hideFileInput.files[0]));
hideFileDropzone.addEventListener('dragover', e => { e.preventDefault(); hideFileDropzone.classList.add('drag-over'); });
hideFileDropzone.addEventListener('dragleave', () => hideFileDropzone.classList.remove('drag-over'));
hideFileDropzone.addEventListener('drop', e => {
  e.preventDefault();
  hideFileDropzone.classList.remove('drag-over');
  setPayloadFile(e.dataTransfer.files[0]);
});

// Run hide
document.getElementById('hide-run').addEventListener('click', async () => {
  const status   = document.getElementById('hide-status');
  const password = document.getElementById('hide-password').value;
  const mode     = document.querySelector('input[name="hide-mode"]:checked').value;

  if (!hideImageFile)     return setStatus(status, 'error', 'Please select a carrier image.');
  if (!password)          return setStatus(status, 'error', 'Please enter a password.');

  setStatus(status, 'loading', 'Processing...');
  document.getElementById('hide-run').disabled = true;

  try {
    const { rgba, width, height } = await imageFileToRgba(hideImageFile);

    let resultRgba;
    if (mode === 'text') {
      const message = document.getElementById('hide-message').value;
      if (!message) { setStatus(status, 'error', 'Please enter a message.'); return; }
      resultRgba = hide_text(Array.from(rgba), message, password);
    } else {
      if (!hidePayloadFile) { setStatus(status, 'error', 'Please select a file to hide.'); return; }
      const fileBytes = new Uint8Array(await hidePayloadFile.arrayBuffer());
      resultRgba = hide_file(Array.from(rgba), Array.from(fileBytes), password);
    }

    const blob = await rgbaToBlob(resultRgba, width, height);
    download(blob, 'output.png');
    setStatus(status, 'success', 'Done. File downloaded.');
  } catch (err) {
    setStatus(status, 'error', String(err));
  } finally {
    document.getElementById('hide-run').disabled = false;
  }
});

// ─── REVEAL panel ─────────────────────────────────────────────

let revealImageFile = null;

setupDropzone('reveal-dropzone', 'reveal-img-input', 'reveal-preview', 'reveal-preview-wrap', 'reveal-remove', f => { revealImageFile = f; });

document.getElementById('reveal-run').addEventListener('click', async () => {
  const status   = document.getElementById('reveal-status');
  const password = document.getElementById('reveal-password').value;
  const result   = document.getElementById('reveal-result');
  const textOut  = document.getElementById('reveal-text-output');
  const dlBtn    = document.getElementById('reveal-file-download');

  if (!revealImageFile) return setStatus(status, 'error', 'Please select an image.');
  if (!password)        return setStatus(status, 'error', 'Please enter a password.');

  setStatus(status, 'loading', 'Processing...');
  document.getElementById('reveal-run').disabled = true;
  result.hidden = true;
  dlBtn.hidden = true;

  try {
    const { rgba } = await imageFileToRgba(revealImageFile);

    // Try text first; if it fails or returns binary-looking data, fall back to file
    let extracted;
    let isText = true;
    try {
      extracted = reveal_text(Array.from(rgba), password);
    } catch {
      isText = false;
      extracted = reveal_file(Array.from(rgba), password);
    }

    setStatus(status, 'success', 'Payload extracted.');
    result.hidden = false;

    if (isText) {
      textOut.textContent = extracted;
      textOut.hidden = false;
    } else {
      textOut.hidden = true;
      const blob = new Blob([new Uint8Array(extracted)]);
      const url  = URL.createObjectURL(blob);
      dlBtn.href = url;
      dlBtn.download = 'extracted_file';
      dlBtn.hidden = false;
      dlBtn.textContent = 'Download extracted file';
    }
  } catch (err) {
    setStatus(status, 'error', String(err));
    result.hidden = true;
  } finally {
    document.getElementById('reveal-run').disabled = false;
  }
});
