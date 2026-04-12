use image::{ImageError, RgbaImage};
use std::path::Path;

/// Loads an image from a file path and extracts its raw RGBA byte buffer and dimensions.
pub fn load_image_buffer<P: AsRef<Path>>(path: P) -> Result<(Vec<u8>, u32, u32), ImageError> {
    // Open the image and strictly force it into a lossless 8-bit RGBA sequence
    let img = image::open(path)?.into_rgba8();
    let (width, height) = img.dimensions();
    
    // Extract the raw underlying one-dimensional bytes for brute-force bitwise manipulation
    let raw_bytes = img.into_raw();
    
    Ok((raw_bytes, width, height))
}

/// Constructs a new image from a raw RGBA byte buffer and saves it safely to a file.
pub fn save_image_buffer<P: AsRef<Path>>(
    path: P,
    modified_buffer: Vec<u8>,
    width: u32,
    height: u32,
) -> Result<(), ImageError> {
    // Reconstruct the 2D image matrix from the 1D raw manipulated bytes
    let reconstructed_img = RgbaImage::from_raw(width, height, modified_buffer)
        .expect("Critical Memory Error: Buffer length does not match width * height * 4");

    // Save strictly as PNG. (PNG natively supports RGBA and is unconditionally lossless,
    // ensuring our hidden LSBs are permanently preserved from compression destruction).
    reconstructed_img.save(path)
}
