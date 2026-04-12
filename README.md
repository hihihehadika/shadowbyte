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

**Hide a Message:**
Takes a carrier media, forcibly modifies its bits, and generates an encrypted output media containing your deep-layer text.
```bash
cargo run -- hide --img carrier.png --msg "Your secret payload block" --out secret.png
```

**Reveal a Message:**
Extracts a continuous sub-surface LSB sequence from an encrypted media file until the injected null-terminator halts the process.
```bash
cargo run -- reveal --img secret.png
```

## Architecture Map
Built around an atomic CLI command core utilizing `clap` and raw 8-bit `RGBA` flattened manipulations dynamically allocated by `image`. The payload strictly isolates bits from left to right (`MSB to LSB`) and securely breaks loops via an aggressive mathematical null-terminator injection (`\0`).
