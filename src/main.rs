pub mod cli;
pub mod image_buffer;
pub mod stega;

use clap::Parser;
use cli::{Cli, Commands};

fn main() {
    let cli = Cli::parse();

    match &cli.command {
        Commands::Hide { img, msg, out } => {
            println!("[*] Steganography Engine Initialized...");
            println!("[*] Loading carrier media: {}", img);

            match image_buffer::load_image_buffer(img) {
                Ok((mut buffer, width, height)) => {
                    println!("[*] Injecting {} bytes of structural payload...", msg.len());
                    if let Err(e) = stega::encode_lsb(&mut buffer, msg) {
                        eprintln!("[!] FATAL ERROR: {}", e);
                        return;
                    }

                    println!("[*] Reconstructing dimensional media lattice...");
                    if let Err(e) = image_buffer::save_image_buffer(out, buffer, width, height) {
                        eprintln!("[!] FATAL ERROR saving image: {}", e);
                        return;
                    }
                    println!("[+] SUCCESS: Memory securely fused and exported to '{}'", out);
                }
                Err(e) => eprintln!("[!] FATAL ERROR loading image: {}", e),
            }
        }
        Commands::Reveal { img } => {
            println!("[*] Steganography Engine Initialized...");
            println!("[*] Stripping carrier media: {}", img);

            match image_buffer::load_image_buffer(img) {
                Ok((buffer, _, _)) => {
                    println!("[*] Initiating sub-surface LSB Extraction sequence...");
                    match stega::decode_lsb(&buffer) {
                        Ok(secret) => {
                            println!("\n================ EXTRACTED PAYLOAD ================");
                            println!("{}", secret);
                            println!("===================================================\n");
                        }
                        Err(e) => eprintln!("[!] FATAL ERROR extracting secret: {}", e),
                    }
                }
                Err(e) => eprintln!("[!] FATAL ERROR loading image: {}", e),
            }
        }
    }
}
