# ShadowByte

> Fast, invisible, low-level binary steganography engine written in pure Rust.

ShadowByte allows you to cryptographically inject and extract secret textual payloads deep into the Least Significant Bits (LSB) of RGB image pixels without altering their visual integrity.

## Features
- **100% Lossless Steganography**: Directly mutates binary memory buffers natively via Rust.
- **Microsecond Extraction**: Bypasses heavy headers to directly stream bits out of 1D vector arrays.
- **Stealth Architecture**: Visual degradation of carrier media is mathematically indistinguishable to the naked eye.

## Installation
Ensure you have the latest stable [Rust and Cargo](https://rustup.rs/) installed.
```bash
git clone https://github.com/hihihehadika/shadowbyte.git
cd shadowbyte
cargo build --release
```

## Usage

### 1. Hiding a message
To hide a message, use the `hide` command. You need to provide the input image, your secret message, and the desired output filename.

**Syntax:**
```bash
cargo run -- hide --img <INPUT_IMAGE> --msg "<MESSAGE>" --out <OUTPUT_IMAGE>
```

**Example:**
```bash
cargo run -- hide --img base.png --msg "Hello from the shadows" --out secret.png
```

### 2. Revealing a message
To extract a hidden message from an image, use the `reveal` command.

**Syntax:**
```bash
cargo run -- reveal --img <IMAGE_PATH>
```

**Example:**
```bash
cargo run -- reveal --img secret.png
```

## Architecture Map
Built around an atomic CLI command core utilizing `clap` and raw 8-bit `RGBA` flattened manipulations dynamically allocated by `image`. The payload strictly isolates bits from left to right (`MSB to LSB`) and securely breaks loops via an aggressive mathematical null-terminator injection (`\0`).
