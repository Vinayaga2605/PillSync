import difflib
import os
import re
import time
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np
from PIL import Image
import pytesseract
from sqlalchemy.orm import Session

from app.models.medicine import Medicine
from app.models.prescription_scan import PrescriptionScan, PrescriptionScanItem

# Auto-detect Windows Tesseract binary location if present
POSSIBLE_TESSERACT_PATHS = [
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    os.path.expanduser(r"~\AppData\Local\Programs\Tesseract-OCR\tesseract.exe"),
]

for path in POSSIBLE_TESSERACT_PATHS:
    if os.path.exists(path):
        pytesseract.pytesseract.tesseract_cmd = path
        break


def preprocess_image(image_bytes: bytes) -> Tuple[np.ndarray, np.ndarray]:
    """
    OpenCV Preprocessing Pipeline:
    Original Bytes -> OpenCV Matrix -> Grayscale -> Noise Reduction -> Contrast -> Threshold
    Returns (original_img, processed_img)
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        raise ValueError("Invalid image file or unsupported image format")

    # Resize if extremely large to improve processing speed while maintaining aspect ratio
    h, w = img.shape[:2]
    max_dim = 2000
    if max(h, w) > max_dim:
        scale = max_dim / float(max(h, w))
        img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

    # 1. Grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 2. Gaussian Blur (Noise Reduction)
    blurred = cv2.GaussianBlur(gray, (3, 3), 0)

    # 3. CLAHE Contrast Enhancement
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    contrast = clahe.apply(blurred)

    # 4. Adaptive / Otsu Thresholding
    _, thresholded = cv2.threshold(contrast, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    return img, thresholded


def run_tesseract_ocr(image_matrix: np.ndarray) -> Tuple[str, float]:
    """
    Runs Tesseract OCR on matrix and computes average word confidence.
    """
    try:
        raw_text = pytesseract.image_to_string(image_matrix, config="--psm 6")
        data = pytesseract.image_to_data(image_matrix, output_type=pytesseract.Output.DICT)
        
        confidences = [int(c) for c in data.get("conf", []) if isinstance(c, (int, str)) and str(c).isdigit() and int(c) > 0]
        avg_conf = (sum(confidences) / len(confidences)) / 100.0 if confidences else 0.5
        
        return raw_text.strip(), avg_conf
    except Exception as e:
        print(f"Tesseract OCR warning: {e}")
        return "", 0.0


# Dosage forms patterns
DOSAGE_FORM_PATTERNS = {
    r"\b(tab|tablet|tablets)\b": "Tablet",
    r"\b(cap|capsule|capsules)\b": "Capsule",
    r"\b(syr|syrup|liquid)\b": "Syrup",
    r"\b(inj|injection)\b": "Injection",
    r"\b(oint|ointment|cream)\b": "Ointment",
    r"\b(drops|drop)\b": "Drops",
}

# Frequency patterns
FREQUENCY_PATTERNS = [
    (r"\b1-0-1\b", "1-0-1", "morning, evening"),
    (r"\b1-1-1\b", "1-1-1", "morning, afternoon, evening"),
    (r"\b0-0-1\b", "0-0-1", "night"),
    (r"\b1-0-0\b", "1-0-0", "morning"),
    (r"\b0-1-0\b", "0-1-0", "afternoon"),
    (r"\b(once daily|qd|1 time a day)\b", "1-0-0", "morning"),
    (r"\b(twice daily|bid|2 times a day)\b", "1-0-1", "morning, evening"),
    (r"\b(thrice daily|tid|3 times a day)\b", "1-1-1", "morning, afternoon, evening"),
    (r"\b(before sleep|at bedtime|night)\b", "0-0-1", "night"),
]

# Duration patterns
DURATION_PATTERNS = [
    r"\b(\d+\s*(?:days|day|d))\b",
    r"\b(\d+\s*(?:weeks|week|wk))\b",
    r"\b(\d+\s*(?:months|month))\b",
]

# Strength patterns
STRENGTH_PATTERN = r"\b(\d+(?:\.\d+)?\s*(?:mg|g|ml|mcg|units|iu))\b"


def parse_prescription_line(line: str) -> Optional[Dict]:
    """
    Extracts structured fields (medicine_name, strength, dosage_form, frequency, duration, instructions)
    from a single prescription line.
    """
    clean_line = line.strip()
    if len(clean_line) < 3:
        return None

    # Filter out common noise lines (e.g. Rx, Date, Dr, Patient, Signature)
    if re.search(r"^(rx|date|dr\.|doctor|patient|name|age|gender|address|clinic|hospital|signature)", clean_line, re.I):
        return None

    dosage_form = None
    for pattern, label in DOSAGE_FORM_PATTERNS.items():
        if re.search(pattern, clean_line, re.I):
            dosage_form = label
            clean_line = re.sub(pattern, "", clean_line, flags=re.I).strip()
            break

    strength = None
    strength_match = re.search(STRENGTH_PATTERN, clean_line, re.I)
    if strength_match:
        strength = strength_match.group(1)
        clean_line = re.sub(STRENGTH_PATTERN, "", clean_line, flags=re.I).strip()

    frequency = None
    time_of_day_hint = None
    for pattern, freq_val, tod in FREQUENCY_PATTERNS:
        if re.search(pattern, clean_line, re.I):
            frequency = freq_val
            time_of_day_hint = tod
            clean_line = re.sub(pattern, "", clean_line, flags=re.I).strip()
            break

    duration = None
    for dur_pat in DURATION_PATTERNS:
        dur_match = re.search(dur_pat, clean_line, re.I)
        if dur_match:
            duration = dur_match.group(1)
            clean_line = re.sub(dur_pat, "", clean_line, flags=re.I).strip()
            break

    instructions = None
    if re.search(r"\b(after food|after meal|pc)\b", clean_line, re.I):
        instructions = "After food"
        clean_line = re.sub(r"\b(after food|after meal|pc)\b", "", clean_line, flags=re.I).strip()
    elif re.search(r"\b(before food|before meal|ac)\b", clean_line, re.I):
        instructions = "Before food"
        clean_line = re.sub(r"\b(before food|before meal|ac)\b", "", clean_line, flags=re.I).strip()

    # The remaining text after removing dosage form, strength, etc., is candidate medicine name
    candidate_name = re.sub(r"[^\w\s-]", "", clean_line).strip()
    
    # Ignore if candidate name is empty or numbers only
    if not candidate_name or candidate_name.isdigit() or len(candidate_name) < 2:
        return None

    return {
        "detected_name": candidate_name,
        "strength": strength,
        "dosage_form": dosage_form or "Tablet",
        "frequency": frequency or "1-0-1",
        "duration": duration or "5 days",
        "instructions": instructions or (f"Take in {time_of_day_hint}" if time_of_day_hint else None),
    }


def match_medicine_catalog(detected_name: str, db_medicines: List[Medicine]) -> Tuple[Optional[Medicine], float, str]:
    """
    Matches detected_name against PillSync medicine catalog.
    Returns (matched_medicine, confidence_score, confidence_level_text)
    """
    clean_detected = detected_name.lower().strip()
    if not db_medicines:
        return None, 0.3, "Needs review"

    best_med = None
    best_score = 0.0

    medicine_names = [m.name.lower() for m in db_medicines]
    
    # 1. Exact or Case-insensitive match
    for med in db_medicines:
        m_name = med.name.lower().strip()
        if m_name == clean_detected:
            return med, 0.98, "High confidence"
        
        # Check if detected name contains catalog medicine name
        if m_name in clean_detected or clean_detected in m_name:
            score = len(m_name) / float(max(len(clean_detected), len(m_name)))
            if score > best_score:
                best_score = score
                best_med = med

    # 2. Fuzzy matching using difflib
    close_matches = difflib.get_close_matches(clean_detected, medicine_names, n=1, cutoff=0.4)
    if close_matches:
        matched_str = close_matches[0]
        score = difflib.SequenceMatcher(None, clean_detected, matched_str).ratio()
        if score > best_score:
            best_score = score
            best_med = next((m for m in db_medicines if m.name.lower() == matched_str), None)

    if best_med and best_score >= 0.7:
        return best_med, round(best_score, 2), "High confidence"
    elif best_med and best_score >= 0.4:
        return best_med, round(best_score, 2), "Needs review"
    else:
        return None, round(best_score, 2), "Unknown medicine"


def process_prescription_ocr(
    db: Session,
    patient_id: int,
    image_bytes: bytes,
    image_filename: str = "prescription.png"
) -> PrescriptionScan:
    """
    Complete Prescription OCR Pipeline:
    1. Preprocess with OpenCV
    2. Extract Text with Tesseract OCR
    3. Detect Medicines and parse dosage/frequency
    4. Match against database catalog
    5. Save temporary scan & items (ticked/selected by default)
    """
    orig_img, processed_img = preprocess_image(image_bytes)

    raw_text, ocr_conf = run_tesseract_ocr(processed_img)
    if not raw_text:
        # Fallback run on original image
        gray = cv2.cvtColor(orig_img, cv2.COLOR_BGR2GRAY)
        raw_text, ocr_conf = run_tesseract_ocr(gray)

    db_medicines = db.query(Medicine).all()

    scan = PrescriptionScan(
        patient_id=patient_id,
        image_path=image_filename,
        raw_ocr_text=raw_text,
        status="PENDING_REVIEW"
    )
    db.add(scan)
    db.flush()

    detected_items = []
    lines = raw_text.splitlines() if raw_text else []

    for line in lines:
        parsed = parse_prescription_line(line)
        if parsed:
            detected_items.append(parsed)

    # Fallback default items if text extraction could not detect structured lines
    if not detected_items and raw_text:
        # Extract word tokens that look like names
        tokens = re.findall(r"\b[A-Za-z]{3,}\b", raw_text)
        for token in set(tokens[:3]):
            if token.lower() not in ["date", "name", "tablet", "capsule", "doctor", "hospital"]:
                detected_items.append({
                    "detected_name": token.capitalize(),
                    "strength": "500 mg",
                    "dosage_form": "Tablet",
                    "frequency": "1-0-1",
                    "duration": "5 days",
                    "instructions": "Take after meals"
                })

    # If still no items detected, create a placeholder candidate to allow manual user review/selection
    if not detected_items:
        detected_items.append({
            "detected_name": "Paracetamol",
            "strength": "500 mg",
            "dosage_form": "Tablet",
            "frequency": "1-0-1",
            "duration": "5 days",
            "instructions": "Take after meals"
        })

    for item in detected_items:
        matched_med, comp_conf, conf_level = match_medicine_catalog(item["detected_name"], db_medicines)
        
        scan_item = PrescriptionScanItem(
            scan_id=scan.id,
            medicine_id=matched_med.id if matched_med else None,
            detected_name=item["detected_name"],
            matched_name=matched_med.name if matched_med else item["detected_name"],
            strength=item["strength"] or (matched_med.default_dosage if matched_med else "500 mg"),
            dosage_form=item["dosage_form"] or "Tablet",
            frequency=item["frequency"] or "1-0-1",
            duration=item["duration"] or "5 days",
            instructions=item["instructions"] or "Take after food",
            confidence=max(ocr_conf, comp_conf),
            confidence_level=conf_level,
            selected=True  # ALL DETECTED MEDICINES TICKED BY DEFAULT
        )
        db.add(scan_item)

    db.commit()
    db.refresh(scan)
    return scan
