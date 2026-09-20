pub mod cli;
pub mod image_buffer;
pub mod stega;

use clap::Parser;
use cli::{Cli, Commands};
use std::fs;

fn main() {
    let cli = Cli::parse();

    match &cli.command {
        // ── HIDE TEXT ────────────────────────────────────────────────────────
        Commands::Hide { img, msg, password, out } => {
            println!("[*] ShadowByte V2 — Ghost Mode Activated");
            println!("[*] Loading carrier media: {}", img);

            match image_buffer::load_image_buffer(img) {
                Ok((mut buffer, width, height)) => {
                    println!("[*] Encrypting & scattering {} bytes...", msg.len());
                    if let Err(e) = stega::encode_text(&mut buffer, msg, password) {
                        eprintln!("[!] FATAL: {}", e);
                        return;
                    }
                    println!("[*] Stripping EXIF metadata from carrier...");
                    if let Err(e) = image_buffer::save_image_buffer(out, buffer, width, height) {
                        eprintln!("[!] FATAL saving image: {}", e);
                        return;
                    }
                    println!("[+] SUCCESS: Payload fused & exported to '{}'", out);
                    println!("[+] Stealth Rating: SSS | Encryption: AES-256-GCM | FEC: Reed-Solomon");
                }
                Err(e) => eprintln!("[!] FATAL loading image: {}", e),
            }
        }

        // ── HIDE FILE ────────────────────────────────────────────────────────
        Commands::HideFile { img, file, password, out } => {
            println!("[*] ShadowByte V2 — Ghost Mode Activated (Binary Payload)");
            println!("[*] Loading carrier media: {}", img);

            let payload = match fs::read(file) {
                Ok(data) => data,
                Err(e) => {
                    eprintln!("[!] FATAL reading file '{}': {}", file, e);
                    return;
                }
            };

            match image_buffer::load_image_buffer(img) {
                Ok((mut buffer, width, height)) => {
                    println!("[*] Encrypting & scattering {} bytes...", payload.len());
                    if let Err(e) = stega::encode(&mut buffer, &payload, password) {
                        eprintln!("[!] FATAL: {}", e);
                        return;
                    }
                    println!("[*] Stripping EXIF metadata from carrier...");
                    if let Err(e) = image_buffer::save_image_buffer(out, buffer, width, height) {
                        eprintln!("[!] FATAL saving image: {}", e);
                        return;
                    }
                    println!("[+] SUCCESS: Binary payload fused & exported to '{}'", out);
                }
                Err(e) => eprintln!("[!] FATAL loading image: {}", e),
            }
        }

        // ── REVEAL TEXT ──────────────────────────────────────────────────────
        Commands::Reveal { img, password } => {
            println!("[*] ShadowByte V2 — Ghost Mode Extraction");
            println!("[*] Stripping carrier media: {}", img);

            match image_buffer::load_image_buffer(img) {
                Ok((buffer, _, _)) => {
                    println!("[*] Initiating chaotic LSB de-scatter + decryption...");
                    match stega::decode_text(&buffer, password) {
                        Ok(secret) => {
                            println!("\n================ EXTRACTED PAYLOAD ================");
                            println!("{}", secret);
                            println!("===================================================\n");
                        }
                        Err(e) => eprintln!("[!] FATAL: {}", e),
                    }
                }
                Err(e) => eprintln!("[!] FATAL loading image: {}", e),
            }
        }

        // ── REVEAL FILE ──────────────────────────────────────────────────────
        Commands::RevealFile { img, password, out } => {
            println!("[*] ShadowByte V2 — Ghost Mode Binary Extraction");
            println!("[*] Stripping carrier media: {}", img);

            match image_buffer::load_image_buffer(img) {
                Ok((buffer, _, _)) => {
                    println!("[*] Initiating chaotic LSB de-scatter + decryption...");
                    match stega::decode(&buffer, password) {
                        Ok(payload) => {
                            if let Err(e) = fs::write(out, &payload) {
                                eprintln!("[!] FATAL writing output file '{}': {}", out, e);
                                return;
                            }
                            println!("[+] SUCCESS: {} bytes extracted & saved to '{}'", payload.len(), out);
                        }
                        Err(e) => eprintln!("[!] FATAL: {}", e),
                    }
                }
                Err(e) => eprintln!("[!] FATAL loading image: {}", e),
            }
        }
    }
}
