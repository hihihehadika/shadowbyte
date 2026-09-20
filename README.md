# ShadowByte

A binary steganography engine written in pure Rust.

ShadowByte cryptographically injects and extracts secret payloads into the Least Significant Bits (LSB) of image pixels. 

## Features

- **Encryption**: AES-256-GCM authenticated encryption.
- **Key Derivation**: Argon2id password hashing.
- **Scattering**: ChaCha20 PRNG Fisher-Yates shuffle for non-sequential bit scattering.
- **Compression**: Deflate (flate2) compression before encryption.
- **Error Correction**: Reed-Solomon FEC (4 data + 2 parity shards).
- **Universal Payload**: Hide both text and arbitrary binary files.
- **WASM Ready**: Includes `lib.rs` for WebAssembly integration.

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

## WebAssembly

The engine is exposed as a library crate (`shadowbyte_core`) for WebAssembly integration.
See `src/lib.rs` for `wasm_encode_text`, `wasm_decode_text`, `wasm_encode_binary`, `wasm_decode_binary`.

Build for WASM with [wasm-pack](https://rustwasm.github.io/wasm-pack/):

```bash
wasm-pack build --target web
```
