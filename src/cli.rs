use clap::{Parser, Subcommand};

#[derive(Parser, Debug)]
#[command(
    author,
    version,
    about = "ShadowByte V2 — Ghost-Class binary steganography engine",
    long_about = None
)]
#[command(propagate_version = true)]
pub struct Cli {
    #[command(subcommand)]
    pub command: Commands,
}

#[derive(Subcommand, Debug)]
pub enum Commands {
    /// Hide a secret text message inside an image (AES-256-GCM encrypted)
    Hide {
        /// Path to the carrier image (PNG)
        #[arg(short, long)]
        img: String,

        /// The secret message to hide
        #[arg(short, long)]
        msg: String,

        /// Password for encryption
        #[arg(short, long)]
        password: String,

        /// Output path for the steganographic image (PNG)
        #[arg(short, long)]
        out: String,
    },

    /// Hide any binary file inside an image (AES-256-GCM encrypted)
    HideFile {
        /// Path to the carrier image (PNG)
        #[arg(short, long)]
        img: String,

        /// Path to the secret file to hide
        #[arg(short = 'f', long)]
        file: String,

        /// Password for encryption
        #[arg(short, long)]
        password: String,

        /// Output path for the steganographic image (PNG)
        #[arg(short, long)]
        out: String,
    },

    /// Reveal a hidden text message from an image
    Reveal {
        /// Path to the steganographic image (PNG)
        #[arg(short, long)]
        img: String,

        /// Password for decryption
        #[arg(short, long)]
        password: String,
    },

    /// Extract a hidden file from an image and save it
    RevealFile {
        /// Path to the steganographic image (PNG)
        #[arg(short, long)]
        img: String,

        /// Password for decryption
        #[arg(short, long)]
        password: String,

        /// Output path to save the extracted file
        #[arg(short, long)]
        out: String,
    },
}
