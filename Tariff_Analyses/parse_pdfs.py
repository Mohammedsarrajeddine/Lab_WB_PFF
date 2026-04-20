import os
from pypdf import PdfReader

def extract_pdf_info(filepath, out_file):
    out_file.write(f"--- Analyzing: {os.path.basename(filepath)} ---\n")
    try:
        reader = PdfReader(filepath)
        out_file.write(f"Number of pages: {len(reader.pages)}\n")
        
        # Extract first 4 pages text
        full_text = ""
        for i in range(min(4, len(reader.pages))):
            full_text += reader.pages[i].extract_text() + "\n"
        
        # Write first 50 lines
        lines = [line.strip() for line in full_text.split('\n') if line.strip()]
        for i, line in enumerate(lines[:50]):
            out_file.write(f"L{i}: {line}\n")
            
    except Exception as e:
        out_file.write(f"Error reading PDF: {e}\n")

base_dir = r"c:\Users\sirag\OneDrive\Desktop\Projet gemini\Tariff_Analyses"
out_path = os.path.join(base_dir, "analysis.txt")
with open(out_path, "w", encoding="utf-8") as f:
    extract_pdf_info(os.path.join(base_dir, "cout_analyses_2.pdf"), f)
    extract_pdf_info(os.path.join(base_dir, "ncb_2.pdf"), f)
