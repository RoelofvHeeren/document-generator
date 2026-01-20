#!/usr/bin/env python3
"""
Advanced PDF Extraction Script (v2)
Extracts:
1. Full page renders (images)
2. Precise text blocks with rotation, font, and styling
3. Embedded images with positioning
"""

import fitz  # PyMuPDF
import sys
import json
import os
import argparse
from pathlib import Path

def extract_pdf_data(pdf_path, output_dir):
    """
    Extracts data from a PDF file.
    """
    
    if not os.path.exists(pdf_path):
        print(json.dumps({"error": f"File not found: {pdf_path}"}))
        sys.exit(1)
        
    os.makedirs(output_dir, exist_ok=True)
    images_dir = os.path.join(output_dir, "images")
    os.makedirs(images_dir, exist_ok=True)
    
    doc = fitz.open(pdf_path)
    
    pages_data = []
    
    for page_num, page in enumerate(doc):
        # 1. Render Page as Image (High Res) for background
        # 2x zoom = ~144 DPI
        zoom = 2
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat)
        page_image_filename = f"page_{page_num + 1}.png"
        page_image_path = os.path.join(images_dir, page_image_filename)
        pix.save(page_image_path)
        
        # 2. Extract Text with Layout
        # "dict" format gives us blocks -> lines -> spans
        # This is the most detailed format
        text_page = page.get_text("dict")
        
        extracted_blocks = []
        
        for block in text_page["blocks"]:
            if block["type"] == 0:  # Text block
                for line in block["lines"]:
                    for span in line["spans"]:
                        # Extract core properties
                        # PyMuPDF origin is bottom-left of the first character usually, but bbox is safer
                        
                        # bbox is [x0, y0, x1, y1]
                        bbox = span["bbox"]
                        
                        # Calculate rotation if available (dir is unit vector of text direction)
                        # Default is (1, 0) for horizontal
                        # Vertical up is (0, -1)
                        rotation_rad = 0
                        # PyMuPDF doesn't give explicit rotation in 'dict' spans easily, 
                        # but we can infer or use 'dir' if available in other modes.
                        # Actually 'dict' output has 'dir' in lines sometimes or we can use the transform matrix if we parsed raw.
                        # However, 'lines' in dict output often grouped by direction.
                        # Let's check 'dir' on the line level.
                        
                        line_dir = line["dir"] # (cosine, sine)
                        import math
                        rotation_deg = 0
                        if line_dir != (1, 0):
                             rotation_deg = math.degrees(math.atan2(line_dir[1], line_dir[0]))
                        
                        extracted_blocks.append({
                            "type": "text",
                            "text": span["text"],
                            "x": bbox[0],
                            "y": bbox[1], # Top-left Y (PyMuPDF usually gives top-left for bbox)
                            "width": bbox[2] - bbox[0],
                            "height": bbox[3] - bbox[1],
                            "font": span["font"],
                            "fontSize": span["size"],
                            "color": span["color"], # sRGB integer
                            "rotation": rotation_deg,
                            "origin": span["origin"]
                        })
                        
            elif block["type"] == 1: # Image block (sometimes these are inline images)
                # We often prefer getting raw images from the page list
                pass

        # 3. Extract Embedded Images (Components)
        # This is distinct from the full page render. This finds specific image objects on the page.
        image_list = page.get_images()
        extracted_images = []
        
        for img_index, img in enumerate(image_list):
            xref = img[0]
            try:
                # Get image rect on page
                # This is tricky in PyMuPDF. We need to find where this XREF is drawn.
                # page.get_image_rects(xref) returns a list of rects
                rects = page.get_image_rects(xref)
                
                for rect_index, rect in enumerate(rects):
                    # Extract the image bytes
                    base_image = doc.extract_image(xref)
                    image_bytes = base_image["image"]
                    image_ext = base_image["ext"]
                    
                    image_filename = f"page_{page_num + 1}_img_{img_index + 1}_{rect_index + 1}.{image_ext}"
                    image_path = os.path.join(images_dir, image_filename)
                    
                    with open(image_path, "wb") as f:
                        f.write(image_bytes)
                        
                    extracted_images.append({
                        "type": "image",
                        "src": f"/uploads/{image_filename}", # Relative path for frontend
                        "x": rect.x0,
                        "y": rect.y0,
                        "width": rect.width,
                        "height": rect.height,
                        "rotation": 0 # Images usually axis aligned unless transformed, PyMuPDF handles transform in rect
                    })
                    
            except Exception as e:
                pass
                # print(f"Error extracting image {xref}: {e}", file=sys.stderr)

        
        pages_data.append({
            "pageNumber": page_num + 1,
            "width": page.rect.width,
            "height": page.rect.height,
            "backgroundImage": f"/uploads/{page_image_filename}",
            "blocks": extracted_blocks,
            "images": extracted_images
        })
        
    doc.close()
    
    # Output JSON to stdout
    print(json.dumps({
        "pages": pages_data,
        "total": len(pages_data)
    }, indent=2))

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract content from PDF")
    parser.add_argument("pdf_path", help="Path to the PDF file")
    parser.add_argument("output_dir", help="Directory to save extracted images")
    
    args = parser.parse_args()
    
    extract_pdf_data(args.pdf_path, args.output_dir)
