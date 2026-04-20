"""Local OCR service using EasyOCR + OpenCV.

Provides free, offline prescription text extraction and structured
field parsing without any paid LLM API calls.
"""

from __future__ import annotations

import logging
import re
from typing import Any

import cv2
import numpy as np

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lazy-loaded EasyOCR reader (downloads models on first call, ~100 MB)
# ---------------------------------------------------------------------------
_reader = None


def _get_reader():
    """Return a cached EasyOCR reader for French + English.

    Note: Arabic requires a separate reader (incompatible with Latin scripts
    in EasyOCR). Moroccan medical prescriptions are predominantly French.
    """
    global _reader
    if _reader is None:
        import easyocr
        _reader = easyocr.Reader(
            ["fr", "en"],
            gpu=False,
            verbose=False,
        )
        logger.info("EasyOCR reader initialized (fr+en, CPU)")
    return _reader


# ---------------------------------------------------------------------------
# Image preprocessing with OpenCV
# ---------------------------------------------------------------------------

def _preprocess_image(image_bytes: bytes) -> np.ndarray:
    """Apply OpenCV preprocessing to improve OCR accuracy.

    Pipeline: decode → grayscale → denoise → adaptive threshold → deskew.
    """
    # Decode image from bytes
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Failed to decode image bytes")

    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Denoise
    denoised = cv2.fastNlMeansDenoising(gray, h=12)

    # Increase contrast with CLAHE
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(denoised)

    # Adaptive thresholding for mixed print/handwriting
    thresh = cv2.adaptiveThreshold(
        enhanced, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        blockSize=15,
        C=8,
    )

    return thresh


# ---------------------------------------------------------------------------
# EasyOCR text extraction
# ---------------------------------------------------------------------------

def extract_text_from_image(image_bytes: bytes) -> str:
    """Run EasyOCR on the image and return concatenated text.

    Applies OpenCV preprocessing first for better accuracy.
    """
    try:
        processed = _preprocess_image(image_bytes)
    except Exception:
        logger.warning("Image preprocessing failed, using raw image")
        nparr = np.frombuffer(image_bytes, np.uint8)
        processed = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
        if processed is None:
            return ""

    reader = _get_reader()
    results = reader.readtext(processed, detail=1, paragraph=False)

    # Sort by vertical position (top-to-bottom), then left-to-right
    results.sort(key=lambda r: (r[0][0][1], r[0][0][0]))

    lines: list[str] = []
    for bbox, text, confidence in results:
        if confidence >= 0.15:  # low threshold for handwriting
            lines.append(text.strip())

    full_text = "\n".join(lines)
    logger.info("Local OCR extracted %d text segments, %d chars", len(lines), len(full_text))
    logger.debug("Local OCR raw text: %s", full_text[:500])
    return full_text


# ---------------------------------------------------------------------------
# Structured field extraction (regex + keyword matching)
# ---------------------------------------------------------------------------

# Doctor name patterns
_DOCTOR_PATTERNS = [
    re.compile(r"(?:Dr\.?|Docteur|Médecin|Medecin)\s*[:\-]?\s*(.+)", re.IGNORECASE),
    re.compile(r"(?:Pr\.?|Professeur)\s*[:\-]?\s*(.+)", re.IGNORECASE),
    re.compile(r"Dr\s+([A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-Ÿ][a-zà-ÿ]+)*)", re.UNICODE),
]

# Patient name patterns
_PATIENT_PATTERNS = [
    re.compile(r"(?:Patient|Patiente|Nom|Mme|Mlle|Mr?\.?)\s*[:\-]?\s*(.+)", re.IGNORECASE),
    re.compile(r"(?:Mme|M\.|Mr)\s+([A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-Ÿ][a-zà-ÿ]+)*)", re.UNICODE),
]

# Date patterns (DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY)
_DATE_PATTERNS = [
    re.compile(r"(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})"),
    re.compile(r"(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})"),
]

# Known medical analysis names/abbreviations (French medical lab context)
_ANALYSIS_KEYWORDS: dict[str, str] = {
    # Hematology
    "nfs": "NFS (Numération Formule Sanguine)",
    "numération": "NFS (Numération Formule Sanguine)",
    "numeration": "NFS (Numération Formule Sanguine)",
    "formule sanguine": "NFS (Numération Formule Sanguine)",
    "hemogramme": "NFS (Numération Formule Sanguine)",
    "hémogramme": "NFS (Numération Formule Sanguine)",
    "fns": "NFS (Numération Formule Sanguine)",
    "hb": "Hémoglobine",
    "hémoglobine": "Hémoglobine",
    "hemoglobine": "Hémoglobine",
    "hématocrite": "Hématocrite",
    "hematocrite": "Hématocrite",
    "plaquettes": "Plaquettes",
    "vs": "VS (Vitesse de sédimentation)",
    "vitesse de sédimentation": "VS (Vitesse de sédimentation)",
    "vitesse de sedimentation": "VS (Vitesse de sédimentation)",
    "tp": "TP (Taux de Prothrombine)",
    "taux de prothrombine": "TP (Taux de Prothrombine)",
    "inr": "INR",
    "tca": "TCA (Temps de Céphaline Activée)",
    "ts": "TS (Temps de Saignement)",
    "temps de saignement": "TS (Temps de Saignement)",
    "fibrinogène": "Fibrinogène",
    "fibrinogene": "Fibrinogène",
    "réticulocytes": "Réticulocytes",
    "reticulocytes": "Réticulocytes",
    "groupage": "Groupage sanguin",
    "groupe sanguin": "Groupage sanguin",

    # Biochemistry
    "glycémie": "Glycémie à jeun",
    "glycemie": "Glycémie à jeun",
    "glycémie à jeun": "Glycémie à jeun",
    "gaj": "Glycémie à jeun",
    "hba1c": "Hémoglobine glyquée (HbA1c)",
    "hémoglobine glyquée": "Hémoglobine glyquée (HbA1c)",
    "hemoglobine glyquee": "Hémoglobine glyquée (HbA1c)",
    "urée": "Urée",
    "uree": "Urée",
    "urea": "Urée",
    "créatinine": "Créatinine",
    "creatinine": "Créatinine",
    "acide urique": "Acide urique",
    "cholestérol": "Cholestérol total",
    "cholesterol": "Cholestérol total",
    "cholestérol total": "Cholestérol total",
    "hdl": "HDL-Cholestérol",
    "ldl": "LDL-Cholestérol",
    "triglycérides": "Triglycérides",
    "triglycerides": "Triglycérides",
    "bilan lipidique": "Bilan lipidique complet",
    "bilan rénal": "Bilan rénal",
    "bilan renal": "Bilan rénal",
    "bilan hépatique": "Bilan hépatique",
    "bilan hepatique": "Bilan hépatique",
    "transaminases": "Transaminases (ASAT/ALAT)",
    "asat": "ASAT (GOT)",
    "alat": "ALAT (GPT)",
    "got": "ASAT (GOT)",
    "gpt": "ALAT (GPT)",
    "gamma gt": "Gamma GT",
    "ggt": "Gamma GT",
    "phosphatases alcalines": "Phosphatases alcalines",
    "pal": "Phosphatases alcalines",
    "bilirubine": "Bilirubine totale",
    "protéines totales": "Protéines totales",
    "proteines totales": "Protéines totales",
    "albumine": "Albumine",
    "ionogramme": "Ionogramme sanguin",
    "sodium": "Sodium (Na+)",
    "potassium": "Potassium (K+)",
    "calcium": "Calcémie",
    "calcémie": "Calcémie",
    "calcemie": "Calcémie",
    "phosphore": "Phosphore",
    "magnésium": "Magnésium",
    "magnesium": "Magnésium",
    "fer sérique": "Fer sérique",
    "fer serique": "Fer sérique",
    "fer": "Fer sérique",
    "ferritine": "Ferritine",
    "transferrine": "Transferrine",
    "cst": "Coefficient de saturation de la transferrine",
    "amylase": "Amylase",
    "lipase": "Lipase",
    "ldh": "LDH",
    "cpk": "CPK",
    "troponine": "Troponine",
    "bnp": "BNP",

    # Thyroid
    "tsh": "TSH",
    "thyroïde": "TSH",
    "thyroide": "TSH",
    "t3": "T3 libre",
    "t4": "T4 libre",
    "ft3": "FT3 (T3 libre)",
    "ft4": "FT4 (T4 libre)",

    # Inflammation / Immunology
    "crp": "CRP (Protéine C-réactive)",
    "protéine c réactive": "CRP (Protéine C-réactive)",
    "proteine c reactive": "CRP (Protéine C-réactive)",
    "aslo": "ASLO",
    "facteur rhumatoïde": "Facteur rhumatoïde",
    "facteur rhumatoide": "Facteur rhumatoïde",
    "anti ccp": "Anti-CCP",
    "ana": "Anticorps antinucléaires",
    "anticorps antinucléaires": "Anticorps antinucléaires",

    # Urine
    "ecbu": "ECBU (Examen urinaire)",
    "examen urinaire": "ECBU (Examen urinaire)",
    "protéinurie": "Protéinurie des 24h",
    "proteinurie": "Protéinurie des 24h",
    "microalbuminurie": "Microalbuminurie",

    # Hormones / Vitamins
    "vitamine d": "Vitamine D",
    "vit d": "Vitamine D",
    "vitamine b12": "Vitamine B12",
    "vit b12": "Vitamine B12",
    "acide folique": "Acide folique",
    "folates": "Acide folique",
    "psa": "PSA (Antigène prostatique)",
    "beta hcg": "Beta HCG",
    "prolactine": "Prolactine",
    "cortisol": "Cortisol",
    "testosterone": "Testostérone",
    "testostérone": "Testostérone",
    "oestradiol": "Oestradiol",
    "fsh": "FSH",
    "lh": "LH",
    "progestérone": "Progestérone",
    "progesterone": "Progestérone",

    # Serology / Infectious
    "sérologie": "Sérologie",
    "serologie": "Sérologie",
    "hépatite b": "Sérologie Hépatite B",
    "hepatite b": "Sérologie Hépatite B",
    "hbs": "Ag HBs",
    "hépatite c": "Sérologie Hépatite C",
    "hepatite c": "Sérologie Hépatite C",
    "hcv": "Anticorps anti-HCV",
    "hiv": "Sérologie HIV",
    "vih": "Sérologie HIV",
    "syphilis": "Sérologie Syphilis (TPHA/VDRL)",
    "tpha": "TPHA",
    "vdrl": "VDRL",
    "toxoplasmose": "Sérologie Toxoplasmose",
    "rubéole": "Sérologie Rubéole",
    "rubeole": "Sérologie Rubéole",
    "widal": "Sérodiagnostic de Widal",

    # Electrophoresis
    "électrophorèse": "Électrophorèse des protéines",
    "electrophorese": "Électrophorèse des protéines",
    "epp": "Électrophorèse des protéines",
    "hémoglobine électrophorèse": "Électrophorèse de l'hémoglobine",
}


def _extract_doctor(text: str) -> str | None:
    """Extract doctor name from OCR text."""
    for pattern in _DOCTOR_PATTERNS:
        match = pattern.search(text)
        if match:
            name = match.group(1).strip().rstrip(".")
            # Sanity check: name should be 3-60 chars
            if 3 <= len(name) <= 60:
                return name
    return None


def _extract_patient(text: str) -> str | None:
    """Extract patient name from OCR text."""
    for pattern in _PATIENT_PATTERNS:
        match = pattern.search(text)
        if match:
            name = match.group(1).strip().rstrip(".")
            if 3 <= len(name) <= 60:
                return name
    return None


def _extract_date(text: str) -> str | None:
    """Extract date from OCR text and return in YYYY-MM-DD format."""
    for pattern in _DATE_PATTERNS:
        match = pattern.search(text)
        if match:
            groups = match.groups()
            if len(groups[0]) == 4:
                # YYYY-MM-DD
                return f"{groups[0]}-{groups[1].zfill(2)}-{groups[2].zfill(2)}"
            else:
                # DD/MM/YYYY
                day, month, year = groups
                if len(year) == 2:
                    year = f"20{year}"
                return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
    return None


def _extract_analyses(text: str) -> list[str]:
    """Match OCR text against known medical analysis keywords."""
    text_lower = text.lower()
    detected: list[str] = []
    seen_names: set[str] = set()

    # Sort keywords by length (longest first) to match multi-word phrases first
    sorted_keywords = sorted(_ANALYSIS_KEYWORDS.items(), key=lambda x: -len(x[0]))

    for keyword, analysis_name in sorted_keywords:
        if keyword in text_lower and analysis_name not in seen_names:
            detected.append(analysis_name)
            seen_names.add(analysis_name)

    return detected


def extract_prescription_fields(ocr_text: str) -> dict[str, Any]:
    """Parse OCR text into structured prescription fields.

    Returns a dict with doctor_name, patient_name, date,
    detected_analyses, notes, source, and confidence.
    """
    doctor = _extract_doctor(ocr_text)
    patient = _extract_patient(ocr_text)
    date = _extract_date(ocr_text)
    analyses = _extract_analyses(ocr_text)

    # Confidence heuristic
    confidence = 0.3
    if analyses:
        confidence += 0.3
    if doctor:
        confidence += 0.15
    if patient:
        confidence += 0.15
    confidence = min(confidence, 0.95)

    return {
        "source": "local_ocr",
        "doctor_name": doctor,
        "patient_name": patient,
        "date": date,
        "detected_analyses": analyses,
        "notes": None,
        "confidence": confidence,
        "ocr_text": ocr_text[:2000],  # keep first 2000 chars for reference
    }
