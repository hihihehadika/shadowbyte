/// ShadowByte V2 — Ghost-Class Steganography Engine
///
/// Architecture:
///   1. Compress payload with Deflate (flate2)
///   2. Derive AES-256-GCM key from password via Argon2id
///   3. Encrypt compressed payload with AES-256-GCM
///   4. Append Reed-Solomon parity blocks for FEC
///   5. Build 36-byte Stealth Header (Salt + Nonce + original_len)
///      — no magic signature, zero fingerprint
///   6. Concatenate Header + FEC-protected ciphertext into `stream`
///   7. Scatter every bit of `stream` chaotically via ChaCha20 PRNG
///      seeded from password — zero sequential artifacts
///
/// Header Layout (36 bytes, signature-free):
///   [0..16]  = Argon2id Salt (16 bytes)
///   [16..28] = AES-GCM Nonce (12 bytes)
///   [28..36] = Original plaintext length as u64 little-endian (8 bytes)

use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Key, Nonce,
};
use argon2::Argon2;
use flate2::{read::DeflateDecoder, write::DeflateEncoder, Compression};
use rand::{RngCore, SeedableRng};
use rand_chacha::ChaCha20Rng;
use reed_solomon_erasure::galois_8::ReedSolomon;
use std::io::{Read, Write};

const SALT_LEN: usize = 16;
const NONCE_LEN: usize = 12;

// Reed-Solomon: 4 data shards + 2 parity shards (50% redundancy)
const RS_DATA_SHARDS: usize = 4;
const RS_PARITY_SHARDS: usize = 2;
const RS_TOTAL_SHARDS: usize = RS_DATA_SHARDS + RS_PARITY_SHARDS;

/// Derive a 32-byte AES key + a deterministic ChaCha20 scatter-seed from the password.
/// Uses Argon2id with the provided salt.
fn derive_keys(password: &[u8], salt: &[u8]) -> ([u8; 32], [u8; 32]) {
    let argon2 = Argon2::default();
    let mut okm = [0u8; 64];
    argon2
        .hash_password_into(password, salt, &mut okm)
        .expect("Argon2id key derivation failed");
    let aes_key: [u8; 32] = okm[..32].try_into().unwrap();
    let scatter_seed: [u8; 32] = okm[32..].try_into().unwrap();
    (aes_key, scatter_seed)
}

/// Compress bytes with Deflate.
fn compress(data: &[u8]) -> Vec<u8> {
    let mut encoder = DeflateEncoder::new(Vec::new(), Compression::best());
    encoder.write_all(data).unwrap();
    encoder.finish().unwrap()
}

/// Decompress Deflate-compressed bytes.
fn decompress(data: &[u8]) -> Result<Vec<u8>, &'static str> {
    let mut decoder = DeflateDecoder::new(data);
    let mut out = Vec::new();
    decoder
        .read_to_end(&mut out)
        .map_err(|_| "Decompression failed — corrupted payload")?;
    Ok(out)
}

/// Reed-Solomon encode: pad `data` to multiple of RS_DATA_SHARDS, then append parity.
fn rs_encode(data: &[u8]) -> Vec<u8> {
    let r = ReedSolomon::new(RS_DATA_SHARDS, RS_PARITY_SHARDS).unwrap();
    let shard_size = (data.len() + RS_DATA_SHARDS - 1) / RS_DATA_SHARDS;

    let mut shards: Vec<Vec<u8>> = (0..RS_DATA_SHARDS)
        .map(|i| {
            let start = i * shard_size;
            let end = ((i + 1) * shard_size).min(data.len());
            let mut shard = if start < data.len() {
                data[start..end].to_vec()
            } else {
                vec![]
            };
            shard.resize(shard_size, 0);
            shard
        })
        .collect();

    for _ in 0..RS_PARITY_SHARDS {
        shards.push(vec![0u8; shard_size]);
    }

    r.encode(&mut shards).unwrap();

    // Flatten: prefix with u32 shard_size for decoding
    let mut out = (shard_size as u32).to_le_bytes().to_vec();
    for shard in shards {
        out.extend_from_slice(&shard);
    }
    out
}

/// Reed-Solomon decode: recover original ciphertext bytes.
fn rs_decode(encoded: &[u8], original_len: usize) -> Result<Vec<u8>, &'static str> {
    if encoded.len() < 4 {
        return Err("FEC data too short");
    }
    let shard_size = u32::from_le_bytes(encoded[..4].try_into().unwrap()) as usize;
    let body = &encoded[4..];
    if body.len() != RS_TOTAL_SHARDS * shard_size {
        return Err("FEC shard length mismatch");
    }

    let r = ReedSolomon::new(RS_DATA_SHARDS, RS_PARITY_SHARDS).unwrap();
    let mut shards: Vec<Option<Vec<u8>>> = body
        .chunks(shard_size)
        .map(|s| Some(s.to_vec()))
        .collect();

    r.reconstruct(&mut shards)
        .map_err(|_| "Reed-Solomon reconstruction failed — too many corrupted shards")?;

    let mut data: Vec<u8> = shards
        .into_iter()
        .take(RS_DATA_SHARDS)
        .flatten()
        .flatten()
        .collect();

    data.truncate(original_len);
    Ok(data)
}

/// Build a deterministic scatter index table from `scatter_seed`.
/// Every index from 0..total_bits is permuted via Fisher-Yates on ChaCha20Rng.
fn build_scatter_table(scatter_seed: &[u8; 32], total_bits: usize) -> Vec<usize> {
    let mut rng = ChaCha20Rng::from_seed(*scatter_seed);
    let mut indices: Vec<usize> = (0..total_bits).collect();
    for i in (1..total_bits).rev() {
        let j = (rng.next_u64() as usize) % (i + 1);
        indices.swap(i, j);
    }
    indices
}

/// Write `stream` bits scattered across `image_buffer` using the scatter table.
fn scatter_write(image_buffer: &mut [u8], stream: &[u8], scatter_seed: &[u8; 32]) {
    let total_bits = stream.len() * 8;
    let table = build_scatter_table(scatter_seed, total_bits);
    for (bit_idx, &pixel_idx) in table.iter().enumerate() {
        let byte_pos = bit_idx / 8;
        let bit_pos = 7 - (bit_idx % 8);
        let secret_bit = (stream[byte_pos] >> bit_pos) & 1;
        image_buffer[pixel_idx] = (image_buffer[pixel_idx] & 0xFE) | secret_bit;
    }
}

/// Read bits scattered across `image_buffer` using the scatter table, reconstruct `stream`.
fn scatter_read(image_buffer: &[u8], stream_len: usize, scatter_seed: &[u8; 32]) -> Vec<u8> {
    let total_bits = stream_len * 8;
    let table = build_scatter_table(scatter_seed, total_bits);
    let mut stream = vec![0u8; stream_len];
    for (bit_idx, &pixel_idx) in table.iter().enumerate() {
        let byte_pos = bit_idx / 8;
        let bit_pos = 7 - (bit_idx % 8);
        let extracted_bit = image_buffer[pixel_idx] & 1;
        stream[byte_pos] |= extracted_bit << bit_pos;
    }
    stream
}

// ─────────────────────────────────────────────────────────────
//  INTERNAL: Fixed-zone reader/writer
//
//  The first 20 bytes are written sequentially (no scatter) to the
//  FIRST 160 LSBs of the image:
//    bytes  0..16 = 16-byte Argon2id Salt
//    bytes 16..20 = total_scattered_len (u32 le) — length of scatter zone data
//
//  This gives decode() everything needed to do a SINGLE-PASS scatter_read,
//  eliminating the two-pass index-mismatch problem.
// ─────────────────────────────────────────────────────────────

const FIXED_ZONE_BYTES: usize = SALT_LEN + 4; // 20 bytes = 160 pixels

fn write_fixed_zone(image_buffer: &mut [u8], salt: &[u8; SALT_LEN], total_scattered_len: u32) {
    let mut fixed = [0u8; FIXED_ZONE_BYTES];
    fixed[..SALT_LEN].copy_from_slice(salt);
    fixed[SALT_LEN..].copy_from_slice(&total_scattered_len.to_le_bytes());

    for (i, &byte) in fixed.iter().enumerate() {
        for bit_pos in (0..8usize).rev() {
            let pixel_idx = i * 8 + (7 - bit_pos);
            let bit = (byte >> bit_pos) & 1;
            image_buffer[pixel_idx] = (image_buffer[pixel_idx] & 0xFE) | bit as u8;
        }
    }
}

fn read_fixed_zone(image_buffer: &[u8]) -> ([u8; SALT_LEN], u32) {
    let mut fixed = [0u8; FIXED_ZONE_BYTES];
    for i in 0..FIXED_ZONE_BYTES {
        let mut byte = 0u8;
        for bit_pos in (0..8usize).rev() {
            let pixel_idx = i * 8 + (7 - bit_pos);
            let bit = image_buffer[pixel_idx] & 1;
            byte |= bit << bit_pos;
        }
        fixed[i] = byte;
    }
    let salt: [u8; SALT_LEN] = fixed[..SALT_LEN].try_into().unwrap();
    let len = u32::from_le_bytes(fixed[SALT_LEN..].try_into().unwrap());
    (salt, len)
}

// ─────────────────────────────────────────────────────────────
//  PUBLIC API
// ─────────────────────────────────────────────────────────────

/// Hide a binary payload inside an image buffer.
///
/// Layout:
///   Fixed zone — pixels 0..159  (20 bytes): Salt(16) + total_scattered_len(4)
///   Scatter zone — pixels 160.. : Nonce(12) + orig_len(8) + FEC data — all chaotically scattered
///
/// `payload` — raw bytes to hide (any file type).
/// `password` — UTF-8 password string.
pub fn encode(image_buffer: &mut Vec<u8>, payload: &[u8], password: &str) -> Result<(), String> {
    // 1. Compress
    let compressed = compress(payload);
    

    // 2. Generate random Salt + Nonce
    let mut salt = [0u8; SALT_LEN];
    let mut nonce_bytes = [0u8; NONCE_LEN];
    rand::thread_rng().fill_bytes(&mut salt);
    rand::thread_rng().fill_bytes(&mut nonce_bytes);

    // 3. Derive AES key + scatter seed from password + salt
    let (aes_key, scatter_seed) = derive_keys(password.as_bytes(), &salt);

    // 4. AES-256-GCM encrypt
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(&aes_key));
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ciphertext = cipher
        .encrypt(nonce, compressed.as_ref())
        .map_err(|_| "AES-GCM encryption failed")?;

    // 5. Reed-Solomon FEC encode
    let fec_data = rs_encode(&ciphertext);

    // 6. Build scattered stream: Nonce(12) + orig_len(8) + FEC data
    //    (fec_len is NOT needed in stream — fec_data carries its own shard_size)
    let cipher_len = ciphertext.len() as u64;
    let mut scattered_stream: Vec<u8> = Vec::new();
    scattered_stream.extend_from_slice(&nonce_bytes);
    scattered_stream.extend_from_slice(&cipher_len.to_le_bytes());
    scattered_stream.extend_from_slice(&fec_data);

    let total_scattered_len = scattered_stream.len() as u32;

    // 7. Check total capacity
    let fixed_zone_pixels = FIXED_ZONE_BYTES * 8; // = 160
    let total_needed = fixed_zone_pixels + scattered_stream.len() * 8;
    if image_buffer.len() < total_needed {
        return Err(format!(
            "Payload too large: need {} LSB slots, image only has {}.",
            total_needed,
            image_buffer.len()
        ));
    }

    // 8. Write fixed zone (pixels 0..159): salt + total_scattered_len
    write_fixed_zone(image_buffer, &salt, total_scattered_len);

    // 9. Single-pass scatter write into pixels 160..end
    let scatter_buffer = &mut image_buffer[fixed_zone_pixels..];
    scatter_write(scatter_buffer, &scattered_stream, &scatter_seed);

    Ok(())
}

/// Reveal a hidden payload from an image buffer.
///
/// Returns raw bytes of the original hidden payload.
pub fn decode(image_buffer: &[u8], password: &str) -> Result<Vec<u8>, String> {
    let fixed_zone_pixels = FIXED_ZONE_BYTES * 8; // = 160

    if image_buffer.len() < fixed_zone_pixels {
        return Err("Image too small to contain a ShadowByte V2 payload.".into());
    }

    // Step 1: Read fixed zone — no scatter key needed
    let (salt, total_scattered_len) = read_fixed_zone(image_buffer);
    let total_scattered = total_scattered_len as usize;

    // Step 2: Derive AES key + scatter seed from password + real salt
    let (aes_key, scatter_seed) = derive_keys(password.as_bytes(), &salt);

    // Step 3: Single-pass scatter_read of the full scatter zone
    let scatter_buffer = &image_buffer[fixed_zone_pixels..];
    if scatter_buffer.len() < total_scattered * 8 {
        return Err("Image does not contain enough data for this payload.".into());
    }

    let full_scattered = scatter_read(scatter_buffer, total_scattered, &scatter_seed);

    // Step 4: Parse nonce + orig_len from scattered stream
    if full_scattered.len() < NONCE_LEN + 8 {
        return Err("Scattered stream too short — corrupted payload.".into());
    }
    let nonce_bytes: [u8; NONCE_LEN] = full_scattered[..NONCE_LEN].try_into().unwrap();
    let cipher_len_extracted = u64::from_le_bytes(
        full_scattered[NONCE_LEN..NONCE_LEN + 8].try_into().unwrap()
    ) as usize;
    let fec_data = &full_scattered[NONCE_LEN + 8..];

    // Step 5: RS decode ciphertext
    if fec_data.len() < 4 {
        return Err("FEC data too short — corrupted payload.".into());
    }

    let ciphertext = rs_decode(fec_data, cipher_len_extracted).map_err(|e| e.to_string())?;

    // Step 6: AES-256-GCM decrypt
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(&aes_key));
    let nonce = Nonce::from_slice(&nonce_bytes);
    let compressed = cipher
        .decrypt(nonce, ciphertext.as_ref())
        .map_err(|_| "Decryption failed — wrong password or no hidden payload.")?;

    // Step 7: Decompress
    let payload = decompress(&compressed)?;
    

    Ok(payload)
}

// ─────────────────────────────────────────────────────────────
//  TEXT WRAPPERS (CLI convenience)
// ─────────────────────────────────────────────────────────────

/// Hide a text message. Wrapper around `encode`.
pub fn encode_text(
    image_buffer: &mut Vec<u8>,
    message: &str,
    password: &str,
) -> Result<(), String> {
    encode(image_buffer, message.as_bytes(), password)
}

/// Reveal a text message. Wrapper around `decode`.
pub fn decode_text(image_buffer: &[u8], password: &str) -> Result<String, String> {
    let bytes = decode(image_buffer, password)?;
    String::from_utf8(bytes).map_err(|_| "Extracted payload is not valid UTF-8 text.".into())
}
