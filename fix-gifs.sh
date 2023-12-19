#!/bin/bash

# Directory containing .gif images
gif_dir="docs/assets/images"

# Directory containing Markdown files
markdown_dir="docs"

# Loop through each .gif file in the specified directory
for gif_file in "$gif_dir"/*.gif; do
    # Extract filename without extension
    base_name=$(basename "$gif_file" .gif)

    # Use find to search for Markdown files recursively in subdirectories
    find "$markdown_dir" -name "*.md" -type f | while read -r md_file; do
        # Check if Markdown file contains the mistaken filename
        if grep -q "${base_name}.png" "$md_file"; then
            echo "Correcting $md_file: ${base_name}.png -> ${base_name}.gif"
            # Replace .png with .gif in the Markdown file
            sed -i "s/${base_name}.png/${base_name}.gif/g" "$md_file"
        fi
    done
done
