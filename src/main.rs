mod cli;

use clap::Parser;
use cli::{Cli, Commands};

fn main() {
    let cli = Cli::parse();

    match &cli.command {
        Commands::Hide { img, msg, out } => {
            println!("[*] Steganography Engine Initialized...");
            println!("[*] Mode         : HIDE");
            println!("[*] Carrier Image: {}", img);
            println!("[*] Payload Size : {} bytes", msg.len());
            println!("[*] Output Target: {}", out);
            println!("[!] Warning: Encoder logic not yet linked.");
            // TODO: Route to Bitwise Encoder
        }
        Commands::Reveal { img } => {
            println!("[*] Steganography Engine Initialized...");
            println!("[*] Mode         : REVEAL");
            println!("[*] Target Image : {}", img);
            println!("[!] Warning: Decoder logic not yet linked.");
            // TODO: Route to Bitwise Decoder
        }
    }
}
