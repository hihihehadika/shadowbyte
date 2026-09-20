/// ShadowByte Library Interface
///
/// Exposes the core steganography engine as a library.
/// Native CLI uses this via main.rs; browser uses it via wasm-bindgen.

pub mod image_buffer;
pub mod stega;

pub use stega::{decode, decode_text, encode, encode_text};

// ─────────────────────────────────────────────────────────────
//  WASM BINDINGS
//  Build: wasm-pack build --target web --out-dir www/pkg
// ─────────────────────────────────────────────────────────────

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

/// One-time initialization: hook Rust panics into browser console.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
}

/// Hide a text message inside raw RGBA image bytes.
///
/// `rgba`     — flat RGBA pixel buffer (from canvas.getImageData).
/// `message`  — plaintext to hide.
/// `password` — encryption password.
///
/// Returns the modified RGBA buffer.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn hide_text(mut rgba: Vec<u8>, message: &str, password: &str) -> Result<Vec<u8>, JsValue> {
    encode_text(&mut rgba, message, password)
        .map(|_| rgba)
        .map_err(|e| JsValue::from_str(&e))
}

/// Reveal a hidden text message from raw RGBA image bytes.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn reveal_text(rgba: Vec<u8>, password: &str) -> Result<String, JsValue> {
    decode_text(&rgba, password).map_err(|e| JsValue::from_str(&e))
}

/// Hide a binary file inside raw RGBA image bytes.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn hide_file(mut rgba: Vec<u8>, file_bytes: Vec<u8>, password: &str) -> Result<Vec<u8>, JsValue> {
    encode(&mut rgba, &file_bytes, password)
        .map(|_| rgba)
        .map_err(|e| JsValue::from_str(&e))
}

/// Extract a hidden binary file from raw RGBA image bytes.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn reveal_file(rgba: Vec<u8>, password: &str) -> Result<Vec<u8>, JsValue> {
    decode(&rgba, password).map_err(|e| JsValue::from_str(&e))
}
