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
            println!("Loading image: {}", img);

            match image_buffer::load_image_buffer(img) {
                Ok((mut buffer, width, height)) => {
                    println!("Encoding {} bytes...", msg.len());
                    if let Err(e) = stega::encode_text(&mut buffer, msg, password) {
                        eprintln!("Error: {}", e);
                        return;
                    }
                    if let Err(e) = image_buffer::save_image_buffer(out, buffer, width, height) {
                        eprintln!("Error saving image: {}", e);
                        return;
                    }
                    println!("Successfully saved to '{}'", out);
                }
                Err(e) => eprintln!("Error loading image: {}", e),
            }
        }

        // ── HIDE FILE ────────────────────────────────────────────────────────
        Commands::HideFile { img, file, password, out } => {
            println!("Loading image: {}", img);

            let payload = match fs::read(file) {
                Ok(data) => data,
                Err(e) => {
                    eprintln!("Error reading file '{}': {}", file, e);
                    return;
                }
            };

            match image_buffer::load_image_buffer(img) {
                Ok((mut buffer, width, height)) => {
                    println!("Encoding {} bytes...", payload.len());
                    if let Err(e) = stega::encode(&mut buffer, &payload, password) {
                        eprintln!("Error: {}", e);
                        return;
                    }
                    if let Err(e) = image_buffer::save_image_buffer(out, buffer, width, height) {
                        eprintln!("Error saving image: {}", e);
                        return;
                    }
                    println!("Successfully saved to '{}'", out);
                }
                Err(e) => eprintln!("Error loading image: {}", e),
            }
        }

        // ── REVEAL TEXT ──────────────────────────────────────────────────────
        Commands::Reveal { img, password } => {
            println!("Loading image: {}", img);

            match image_buffer::load_image_buffer(img) {
                Ok((buffer, _, _)) => {
                    println!("Extracting payload...");
                    match stega::decode_text(&buffer, password) {
                        Ok(secret) => {
                            println!("\nExtracted payload:");
                            println!("{}", secret);
                        }
                        Err(e) => eprintln!("Error: {}", e),
                    }
                }
                Err(e) => eprintln!("Error loading image: {}", e),
            }
        }

        // ── REVEAL FILE ──────────────────────────────────────────────────────
        Commands::RevealFile { img, password, out } => {
            println!("Loading image: {}", img);

            match image_buffer::load_image_buffer(img) {
                Ok((buffer, _, _)) => {
                    println!("Extracting payload...");
                    match stega::decode(&buffer, password) {
                        Ok(payload) => {
                            if let Err(e) = fs::write(out, &payload) {
                                eprintln!("Error writing output file '{}': {}", out, e);
                                return;
                            }
                            println!("Successfully extracted {} bytes to '{}'", payload.len(), out);
                        }
                        Err(e) => eprintln!("Error: {}", e),
                    }
                }
                Err(e) => eprintln!("Error loading image: {}", e),
            }
        }
    }
}
