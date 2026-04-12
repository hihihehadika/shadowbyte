/// Encodes a secret payload into the Least Significant Bits (LSB) of the image buffer.
pub fn encode_lsb(image_buffer: &mut [u8], message: &str) -> Result<(), &'static str> {
    let payload = message.as_bytes();
    let required_capacity = (payload.len() + 1) * 8; // +1 for the null terminator

    if image_buffer.len() < required_capacity {
        return Err("Payload too large or image too small.");
    }

    let mut bit_index = 0;

    // Inject payload characters bit by bit
    for &byte in payload {
        for bit_pos in (0..8).rev() { // Traverse from MSB to LSB
            let secret_bit = (byte >> bit_pos) & 1;
            // Clear the 1st bit position (LSB) and forcibly inject the secret bit
            image_buffer[bit_index] = (image_buffer[bit_index] & 0xFE) | secret_bit;
            bit_index += 1;
        }
    }

    // Inject exactly 8 zero structural bits to serve as a null terminator ('\0')
    for _ in 0..8 {
        image_buffer[bit_index] &= 0xFE; // Clear LSB to 0
        bit_index += 1;
    }

    Ok(())
}

/// Decodes a hidden string by extracting the Least Significant Bits of an image buffer.
pub fn decode_lsb(image_buffer: &[u8]) -> Result<String, &'static str> {
    let mut extracted_bytes = Vec::new();
    let mut current_byte = 0u8;
    let mut bit_count = 0;

    for &pixel_byte in image_buffer {
        let extracted_bit = pixel_byte & 1; // Extract only the 1st bit
        current_byte = (current_byte << 1) | extracted_bit; // Append bit dynamically
        bit_count += 1;

        if bit_count == 8 {
            if current_byte == 0 {
                // Halts parsing when hitting the structural null terminator
                break;
            }
            extracted_bytes.push(current_byte);
            current_byte = 0;
            bit_count = 0;
        }
    }

    // Convert the extracted raw bytes back into human-readable text
    String::from_utf8(extracted_bytes).map_err(|_| "Failed to decode UTF-8 payload. Corrupted buffer.")
}
