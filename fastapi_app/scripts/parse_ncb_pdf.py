import os
import re
import json
from pypdf import PdfReader

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF_PATH = os.path.join(os.path.dirname(BASE_DIR), "Tariff_Analyses", "ncb_2.pdf")
JSON_PATH = os.path.join(BASE_DIR, "data", "catalog_data.json")

def parse_ncb_pdf():
    reader = PdfReader(PDF_PATH)
    catalog = []
    
    # We match "B100 Acide urique sanguin 30 33 40,20"
    pattern = re.compile(r"^(B\d{3,})\s+(.+?)\s+(\d+)\s+(?:[\d,]+)\s+(?:[\d,]+)$")
    
    for page in reader.pages:
        text = page.extract_text()
        for line in text.splitlines():
            line = line.strip()
            if not line.startswith("B"):
                continue
            match = pattern.search(line)
            if match:
                code = match.group(1)
                name = match.group(2).strip()
                coef = match.group(3)
                catalog.append({
                    "code": code,
                    "name": name,
                    "coefficient": int(coef)
                })
    
    # Deduplicate by code
    unique_catalog = {}
    for item in catalog:
        if item["code"] not in unique_catalog:
            unique_catalog[item["code"]] = item
            
    final_list = list(unique_catalog.values())
    
    os.makedirs(os.path.dirname(JSON_PATH), exist_ok=True)
    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(final_list, f, ensure_ascii=False, indent=2)
    
    print(f"Parsed {len(final_list)} unique items.")

if __name__ == "__main__":
    parse_ncb_pdf()
