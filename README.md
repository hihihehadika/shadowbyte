# ShadowByte 💀

> **Fast, invisible, low-level binary steganography engine written in pure Rust.**

ShadowByte is a high-performance tool designed for the silent injection and extraction of secret payloads within image media. By manipulating the **Least Significant Bit (LSB)** of RGB pixels, it hides data in plain sight with zero visual degradation.

---

## 🚀 Quick Start

### 1. Installation
Ensure you have the [Rust toolchain](https://rustup.rs/) installed.
```bash
git clone https://github.com/hihihehadika/shadowbyte.git
cd shadowbyte
cargo build --release
```

### 2. Hide a Secret Message
To hide a message, you need a carrier image (PNG). The engine will fuse your text into the pixels and produce a new file.
```bash
# Syntax:
cargo run -- hide --img <INPUT_PNG> --msg "<YOUR_SECRET>" --out <OUTPUT_PNG>

# Example:
cargo run -- hide --img base.png --msg "Hello from the shadows" --out secret.png
```

### 3. Reveal the Secret
To extract the message back, simply point the engine to the modified image.
```bash
cargo run -- reveal --img secret.png
```

---

## 🛠️ Commands & Flags

| Command | Flag | Description |
| :--- | :--- | :--- |
| `hide` | `--img`, `-i` | The source carrier image (Must be PNG). |
| | `--msg`, `-m` | The text payload you want to hide. |
| | `--out`, `-o` | The filename for the generated steganographic image. |
| `reveal`| `--img`, `-i` | The image containing the hidden payload. |

---

## 🛡️ Architecture & Stealth
ShadowByte operates at the hardware-logic level:
- **Lossless Buffer**: Uses raw `RGBA8` memory buffers to prevent data corruption.
- **LSB Manipulation**: Only modifies the 1st bit of each pixel color channel.
- **Null-Terminator**: Injects a specific 8-bit zero sequence to mark the end of data.

---

## 🗺️ Roadmap (V2 "The Perfection" Update)
We are currently working on the **Military-Grade upgrade**, which will include:
- [ ] **AES-256-GCM Encryption**: Secure your data with a mandatory password.
- [ ] **Chaotic Scattering**: Randomize pixel injection points via ChaCha20 PRNG.
- [ ] **Universal Binary**: Support for hiding any file type (.zip, .pdf, .exe).
- [ ] **Plausible Deniability**: Dual-volume password support.
- [ ] **WebAssembly (WASM)**: Running ShadowByte directly in your browser.

---

## 🤝 Contributing
ShadowByte is an open-source project. Feel free to fork, open issues, or submit PRs to help make steganography more accessible and secure.
