/// ShadowByte V2 — Library Interface
///
/// This file exposes the core steganography engine as a reusable library.
/// Both native CLI (via main.rs) and WASM (via wasm-bindgen) can link against this.

pub mod image_buffer;
pub mod stega;

// Re-export public API for library consumers
pub use stega::{decode, decode_text, encode, encode_text};

// ─────────────────────────────────────────────────────────────
//  WASM BINDINGS
//  To build for WASM: cargo build --target wasm32-unknown-unknown
//  Or use wasm-pack: wasm-pack build --target web
// ─────────────────────────────────────────────────────────────

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

/// WASM: Hide a text message inside raw RGBA image bytes.
///
/// `image_bytes` — flat RGBA pixel buffer from a `<canvas>` element.
/// `message`     — plaintext to hide.
/// `password`    — encryption password.
///
/// Returns the modified RGBA buffer on success.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn wasm_encode_text(
    mut image_bytes: Vec<u8>,
    message: &str,
    password: &str,
) -> Result<Vec<u8>, JsValue> {
    encode_text(&mut image_bytes, message, password)
        .map(|_| image_bytes)
        .map_err(|e| JsValue::from_str(&e))
}

/// WASM: Hide any binary payload inside raw RGBA image bytes.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn wasm_encode_binary(
    mut image_bytes: Vec<u8>,
    payload: Vec<u8>,
    password: &str,
) -> Result<Vec<u8>, JsValue> {
    encode(&mut image_bytes, &payload, password)
        .map(|_| image_bytes)
        .map_err(|e| JsValue::from_str(&e))
}

/// WASM: Reveal a hidden text message from raw RGBA image bytes.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn wasm_decode_text(image_bytes: Vec<u8>, password: &str) -> Result<String, JsValue> {
    decode_text(&image_bytes, password).map_err(|e| JsValue::from_str(&e))
}

/// WASM: Extract a hidden binary payload from raw RGBA image bytes.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn wasm_decode_binary(image_bytes: Vec<u8>, password: &str) -> Result<Vec<u8>, JsValue> {
    decode(&image_bytes, password).map_err(|e| JsValue::from_str(&e))
}
