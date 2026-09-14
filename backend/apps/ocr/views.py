import re

import pytesseract
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.medications.models import Medication


pytesseract.pytesseract.tesseract_cmd = (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)


# ---------------------------------------------------------
# IMAGE PREPROCESSING
# ---------------------------------------------------------

def preprocess_variants(image):
    image = ImageOps.exif_transpose(image)

    if image.mode != "RGB":
        image = image.convert("RGB")

    gray = ImageOps.grayscale(image)

    width, height = gray.size
    gray = gray.resize((width * 2, height * 2))

    gray = ImageOps.autocontrast(gray)

    enhanced = ImageEnhance.Contrast(gray).enhance(2.0)
    enhanced = ImageEnhance.Sharpness(enhanced).enhance(2.0)
    enhanced = enhanced.filter(ImageFilter.SHARPEN)

    threshold = enhanced.point(
        lambda pixel: 255 if pixel > 160 else 0
    )

    return [
        enhanced,
        threshold,
    ]


# ---------------------------------------------------------
# DOSAGE
# ---------------------------------------------------------

def extract_dosage(text):
    patterns = [
        r"\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|units?)\b",
        r"\b\d+(?:\.\d+)?\s*%\b",
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)

        if match:
            return match.group(0).replace(" ", "")

    return ""


# ---------------------------------------------------------
# QUANTITY
# ---------------------------------------------------------

def extract_quantity(text):
    patterns = [
        r"\bqty\.?\s*[:\-]?\s*(\d+)\b",
        r"\bquantity\s*[:\-]?\s*(\d+)\b",
        r"\b(\d+)\s*(?:tablets?|tabs?|capsules?|caps?|pills?|units?)\b",
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)

        if match:
            return int(match.group(1))

    return 0


# ---------------------------------------------------------
# FREQUENCY
# ---------------------------------------------------------

def extract_frequency(text):
    text = text.lower()

    if re.search(
        r"\b(thrice|three times|3 times|t\.i\.d)\b",
        text,
    ):
        return "Three times daily", 3

    if re.search(
        r"\b(twice|two times|2 times|b\.i\.d|bid)\b",
        text,
    ):
        return "Twice daily", 2

    if re.search(
        r"\b(once|one time|1 time|o\.d|od)\b",
        text,
    ):
        return "Once daily", 1

    if "morning and evening" in text:
        return "Twice daily", 2

    if "morning" in text and "evening" in text:
        return "Twice daily", 2

    if "morning" in text:
        return "Once daily", 1

    if "afternoon" in text:
        return "Once daily", 1

    if "evening" in text or "night" in text:
        return "Once daily", 1

    return "Once daily", 1


# ---------------------------------------------------------
# TEXT CLEANING
# ---------------------------------------------------------

def clean_medicine_name(text):
    text = text.strip()

    text = re.sub(
        r"^\s*\(?\d{1,2}\)?\s*[\.\)\-:]?\s*",
        "",
        text,
    )

    text = re.sub(
        r"^[©®○●•◦◉QOBZéŽÉ]+\s*",
        "",
        text,
    )

    text = re.sub(
        r"\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|units?)\b",
        "",
        text,
        flags=re.IGNORECASE,
    )

    text = re.sub(
        r"\b(?:qty|quantity)\s*[:\-]?\s*\d+\b",
        "",
        text,
        flags=re.IGNORECASE,
    )

    text = re.split(
        r"\s+(?:take|tab|tabs|tablet|tablets|capsule|capsules|"
        r"once|twice|thrice|daily|morning|afternoon|evening|night)\b",
        text,
        maxsplit=1,
        flags=re.IGNORECASE,
    )[0]

    text = re.sub(r"\s{2,}", " ", text)
    text = text.strip(" .,:;|-/\\()[]{}")

    return text


# ---------------------------------------------------------
# IGNORE NON-MEDICINE CONTENT
# ---------------------------------------------------------

def is_obvious_non_medicine(text):
    lower = text.lower().strip()

    if not lower:
        return True

    ignored_terms = [
        "afsar",
        "polyclinic",
        "family health",
        "doctor",
        "dr.",
        "dr ",
        "name",
        "gender",
        "age",
        "date",
        "weight",
        "address",
        "patient",
        "note",
        "please bring",
        "prescription",
        "medical",
        "general store",
        "chemist",
        "district",
        "visit",
        "reg.",
        "registration",
        "phone",
        "mobile",
        "consultation",
    ]

    for term in ignored_terms:
        if term in lower:
            return True

    return False


# ---------------------------------------------------------
# MEDICINE LINE DETECTION
# ---------------------------------------------------------

def looks_like_medicine_line(line):
    line = line.strip()

    if not line:
        return False

    if is_obvious_non_medicine(line):
        return False

    if extract_dosage(line):
        return True

    if re.search(
        r"\b(?:take|tablet|tablets|tab|tabs|capsule|capsules|"
        r"morning|afternoon|evening|night|once|twice|thrice|daily)\b",
        line,
        re.IGNORECASE,
    ):
        return True

    if re.match(
        r"^\s*\(?\d{1,2}\)?\s*[\.\)\-:]",
        line,
    ):
        return True

    if re.match(
        r"^\s*[©®○●•◦◉QOBZéŽÉ]\s+",
        line,
        re.IGNORECASE,
    ):
        words = re.findall(r"[A-Za-z]{2,}", line)

        if len(words) >= 1:
            return True

    return False


# ---------------------------------------------------------
# EXTRACT MEDICINES
# ---------------------------------------------------------

def extract_medicines(raw_text):
    medicines = []
    seen_names = set()

    lines = [
        re.sub(r"\s+", " ", line).strip()
        for line in raw_text.splitlines()
        if line.strip()
    ]

    for line in lines:
        if not looks_like_medicine_line(line):
            continue

        name = clean_medicine_name(line)

        if not name:
            continue

        if len(name) < 2 or len(name) > 100:
            continue

        if not re.search(r"[A-Za-z]", name):
            continue

        normalized_name = re.sub(
            r"[^a-z0-9]",
            "",
            name.lower(),
        )

        if not normalized_name:
            continue

        # Prevent duplicate medicine names.
        if normalized_name in seen_names:
            continue

        seen_names.add(normalized_name)

        dosage = extract_dosage(line)
        frequency, doses_per_day = extract_frequency(line)
        quantity = extract_quantity(line)

        medicines.append(
            {
                "name": name,
                "dosage": dosage,
                "frequency": frequency,
                "doses_per_day": doses_per_day,
                "quantity": quantity,
            }
        )

        if len(medicines) >= 10:
            break

    return medicines


# ---------------------------------------------------------
# CHOOSE BEST OCR RESULT
# ---------------------------------------------------------

def score_ocr_result(text):
    if not text.strip():
        return -1

    lines = [
        line.strip()
        for line in text.splitlines()
        if line.strip()
    ]

    if not lines:
        return -1

    alpha_count = sum(
        1 for char in text
        if char.isalpha()
    )

    digit_count = sum(
        1 for char in text
        if char.isdigit()
    )

    useful_lines = sum(
        1 for line in lines
        if len(line) >= 3
    )

    medicine_signals = sum(
        1 for line in lines
        if (
            extract_dosage(line)
            or re.search(
                r"\b(?:tablet|tablets|tab|capsule|"
                r"capsules|take|daily|morning|night)\b",
                line,
                re.IGNORECASE,
            )
        )
    )

    # Prefer readable OCR with useful prescription signals.
    return (
        (alpha_count * 2)
        + digit_count
        + (useful_lines * 5)
        + (medicine_signals * 20)
    )


def choose_best_ocr_result(results):
    if not results:
        return ""

    unique_results = []

    for result in results:
        cleaned = result.strip()

        if not cleaned:
            continue

        if cleaned not in unique_results:
            unique_results.append(cleaned)

    if not unique_results:
        return ""

    return max(
        unique_results,
        key=score_ocr_result,
    )


# ---------------------------------------------------------
# OCR API
# ---------------------------------------------------------

class OCRScanView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        uploaded_file = request.FILES.get("prescription")

        if not uploaded_file:
            return Response(
                {
                    "success": False,
                    "error": "Please upload a prescription image.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        content_type = uploaded_file.content_type or ""

        if not content_type.startswith("image/"):
            return Response(
                {
                    "success": False,
                    "error": "Only image files are supported.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if uploaded_file.size > 10 * 1024 * 1024:
            return Response(
                {
                    "success": False,
                    "error": "Image size must be 10 MB or less.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            image = Image.open(uploaded_file)

            variants = preprocess_variants(image)

            ocr_results = []

            configs = [
                "--psm 6",
                "--psm 11",
                "--psm 12",
            ]

            for variant in variants:
                for config in configs:
                    text = pytesseract.image_to_string(
                        variant,
                        config=config,
                    )

                    if text.strip():
                        ocr_results.append(text)

            # IMPORTANT:
            # Do NOT concatenate all OCR results.
            # Pick the best single result.
            raw_text = choose_best_ocr_result(
                ocr_results
            )

            medicines = extract_medicines(raw_text)

            return Response(
                {
                    "success": True,
                    "raw_text": raw_text,
                    "medicines": medicines,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as exc:
            return Response(
                {
                    "success": False,
                    "error": f"OCR processing failed: {str(exc)}",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# ---------------------------------------------------------
# SAVE MEDICINES
# ---------------------------------------------------------

class OCRSaveMedicinesView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        medicines = request.data.get("medicines", [])

        if not isinstance(medicines, list):
            return Response(
                {
                    "success": False,
                    "error": "Medicines must be provided as a list.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        saved_medicines = []

        for medicine in medicines:
            name = str(
                medicine.get("name", "")
            ).strip()

            if not name:
                continue

            dosage = str(
                medicine.get("dosage", "")
            ).strip()

            frequency = str(
                medicine.get(
                    "frequency",
                    "Once daily",
                )
            ).strip()

            try:
                doses_per_day = int(
                    medicine.get(
                        "doses_per_day",
                        1,
                    )
                )
            except (TypeError, ValueError):
                doses_per_day = 1

            try:
                quantity = int(
                    medicine.get(
                        "quantity",
                        0,
                    )
                )
            except (TypeError, ValueError):
                quantity = 0

            if doses_per_day < 1:
                doses_per_day = 1

            if quantity < 0:
                quantity = 0

            medication = Medication.objects.create(
                patient=request.user,
                name=name[:100],
                dosage=dosage[:50],
                frequency=frequency[:50],
                doses_per_day=doses_per_day,
                total_stock=quantity,
                remaining_stock=quantity,
                condition="",
            )

            saved_medicines.append(
                {
                    "id": medication.id,
                    "name": medication.name,
                    "dosage": medication.dosage,
                    "frequency": medication.frequency,
                    "doses_per_day": medication.doses_per_day,
                    "total_stock": medication.total_stock,
                    "remaining_stock": medication.remaining_stock,
                    "condition": medication.condition,
                }
            )

        return Response(
            {
                "success": True,
                "saved": len(saved_medicines),
                "medicines": saved_medicines,
            },
            status=status.HTTP_201_CREATED,
        )