# ShadowByte V2

> Ghost-Class military-grade binary steganography engine written in pure Rust.

ShadowByte V2 cryptographically injects and extracts secret payloads deep into the Least Significant Bits (LSB) of image pixels. Every byte is encrypted, scattered chaotically, and protected with error-correction — leaving **zero detectable fingerprints**.

## What's New in V2

| Feature | V1 | V2 |
|---|---|---|
| Encryption | ❌ None | ✅ AES-256-GCM |
| Key Derivation | ❌ None | ✅ Argon2id |
| Scattering | ❌ Sequential LSB | ✅ ChaCha20 PRNG chaotic scatter |
| Compression | ❌ None | ✅ Deflate (flate2) |
| Error Correction | ❌ None | ✅ Reed-Solomon FEC |
| Binary File Support | ❌ Text only | ✅ Any file type |
| Magic Signature | ❌ Present | ✅ Zero fingerprint (Ghost Mode) |
| WASM Ready | ❌ No | ✅ Yes (lib.rs) |

## Architecture

```
Payload
  │
  ▼ Deflate compression
  │
  ▼ AES-256-GCM encryption  ← key derived via Argon2id(password, random_salt)
  │
  ▼ Reed-Solomon FEC encode  ← 4 data + 2 parity shards (50% redundancy)
  │
  ▼ ChaCha20 PRNG scatter    ← seed derived from same Argon2id output
  │
  ▼ Written to image LSBs

Fixed zone (pixels 0–159):  Salt(16) + stream_len(4)  ← sequential, no scatter
Scatter zone (pixels 160+):  Nonce(12) + orig_len(8) + FEC data  ← fully scattered
```

## Installation

Ensure you have [Rust and Cargo](https://rustup.rs/) installed.

```bash
git clone https://github.com/hihihehadika/shadowbyte.git
cd shadowbyte
cargo build --release
```

## Usage

### Hide a text message

```bash
cargo run -- hide --img <INPUT_IMAGE> --msg "<MESSAGE>" --password "<PASSWORD>" --out <OUTPUT_IMAGE>
```

**Example:**
```bash
cargo run -- hide --img base.png --msg "Hello from the shadows" --password "my_secret_key" --out secret.png
```

### Reveal a text message

```bash
cargo run -- reveal --img <IMAGE_PATH> --password "<PASSWORD>"
```

**Example:**
```bash
cargo run -- reveal --img secret.png --password "my_secret_key"
```

### Hide any binary file

```bash
cargo run -- hide-file --img <INPUT_IMAGE> --file <SECRET_FILE> --password "<PASSWORD>" --out <OUTPUT_IMAGE>
```

### Extract a hidden file

```bash
cargo run -- reveal-file --img <IMAGE_PATH> --password "<PASSWORD>" --out <OUTPUT_FILE>
```

## Security Properties

- **Encryption**: AES-256-GCM (authenticated encryption — detects tampering)
- **Key Derivation**: Argon2id (memory-hard, resistant to GPU/ASIC brute-force)
- **Scattering**: ChaCha20 PRNG Fisher-Yates shuffle (zero sequential artifacts)
- **Compression**: Deflate before encryption (reduces ciphertext size)
- **Error Correction**: Reed-Solomon (survives minor file corruption)
- **Ghost Mode**: No magic signature — image appears as pure noise to any scanner
- **Wrong Password**: Returns `Decryption failed` — no data leak, no oracle

## WASM

The engine is exposed as a library crate (`shadowbyte_core`) for WebAssembly integration.
See `src/lib.rs` for `wasm_encode_text`, `wasm_decode_text`, `wasm_encode_binary`, `wasm_decode_binary`.

Build for WASM with [wasm-pack](https://rustwasm.github.io/wasm-pack/):

```bash
wasm-pack build --target web
```

## Stealth Rating: **SSS** | Encryption: **Mil-Spec** | Platform: **CLI + WASM/Web**
