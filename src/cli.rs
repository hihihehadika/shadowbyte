use clap::{Parser, Subcommand};

#[derive(Parser, Debug)]
#[command(author, version, about = "A low-level binary steganography engine", long_about = None)]
#[command(propagate_version = true)]
pub struct Cli {
    #[command(subcommand)]
    pub command: Commands,
}

#[derive(Subcommand, Debug)]
pub enum Commands {
    /// Hide a secret message inside an image
    Hide {
        /// The path to the original carrier image (PNG)
        #[arg(short, long)]
        img: String,

        /// The secret message to hide
        #[arg(short, long)]
        msg: String,

        /// The output path for the modified image (PNG)
        #[arg(short, long)]
        out: String,
    },
    /// Reveal a secret message from an image
    Reveal {
        /// The path to the steganographic image
        #[arg(short, long)]
        img: String,
    },
}
