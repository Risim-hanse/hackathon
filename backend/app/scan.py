"""Gemini-powered document scanner.

The API key never leaves the backend. The model returns a strict JSON object
that mirrors `ScanResponse` in the frontend contract; the user still confirms
or edits every medicine before it enters the plan.
"""

from __future__ import annotations

import hashlib
import json
import re

from google import genai
from google.genai import types

from .schemas import ScanResponse
from .settings import GEMINI_API_KEY, GEMINI_MODEL

PROMPT = """You read photographs of medical prescriptions, pharmacy bills, medicine boxes,
and discharge summaries. Extract the dosage plan faithfully. DO NOT invent or guess.
If a field is not readable or not present, leave it null or empty.

Rules:
- Return ONLY JSON matching the provided schema.
- Preserve medicine brand names exactly as printed.
- genericName: write the generic/salt only when it is printed or unambiguous (e.g. Crocin -> paracetamol).
- strength: keep the printed label, e.g. "650mg", "500mg + 25mg".
- times: use 24-hour HH:mm. Common shorthand mapping is allowed ONLY when clear:
  "1-0-1" -> ["08:00","20:00"], "1-1-1" -> ["08:00","14:00","20:00"],
  "0-0-1" -> ["21:00"], "BD" -> ["08:00","20:00"], "TDS" -> ["08:00","14:00","20:00"],
  "OD" -> ["08:00"], "HS" -> ["21:00"].
  If the shorthand is ambiguous, leave times empty and put the raw text in directionsRaw.
- scheduleType: 'fixedTimes' when times are known, 'everyHours' when an interval like "q8h" is printed,
  'asNeeded' only when the document says 'as needed' / 'SOS' / 'when required'.
- foodRelation: use 'before_meal', 'with_meal', 'after_meal', 'empty_stomach', 'bedtime', or 'anytime'.
- durationDays / quantityDispensed / refillsAuthorized: only when explicitly printed.
- Document dates: 'issuedDate' is the prescription date written by the doctor;
  'documentDate' is a bill or report date if different; 'pharmacyBillDate' is on a bill.
- 'ocrText' should be a short verbatim transcript of the relevant lines, not a summary.
- 'kind' should be one of: prescription, pharmacy_bill, medicine_box, discharge_summary, other.
- Set 'confidence' between 0 and 1. Add short, plain-language strings to 'warnings' for
  anything unreadable, ambiguous, missing, or that needs a pharmacist to confirm.
  Never claim the extracted plan is medically safe or complete.
"""

FENCE = re.compile(r"^```(?:json)?\s*|\s*```$", re.IGNORECASE)


def _unwrap(raw: str) -> str:
    return FENCE.sub("", raw.strip())


def scan_document(
    image_bytes: bytes,
    mime_type: str,
    filename: str,
    hints: str = "",
) -> ScanResponse:
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not configured")

    client = genai.Client(api_key=GEMINI_API_KEY)
    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_json_schema=ScanResponse.model_json_schema(),
        temperature=0.1,
    )
    contents = [
        PROMPT,
        (f"File name: {filename}. Additional context from the caregiver: {hints}" if hints else f"File name: {filename}."),
        types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
    ]

    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=contents,
        config=config,
    )
    result = ScanResponse.model_validate_json(_unwrap(response.text or "{}"))

    if not result.medications:
        result.warnings.append("No medicines could be read. Check the photo and try again.")
    if result.prescription.confidence is not None and result.prescription.confidence < 0.6:
        result.warnings.append("Some document details were unclear. Confirm them before saving.")
    if not result.prescription.issuedDate:
        result.warnings.append("No prescription date was found. Add it before saving.")
    if not result.prescription.prescriberName and not result.prescription.pharmacyName:
        result.warnings.append("No doctor or pharmacy name was found on the document.")

    result.model = GEMINI_MODEL
    result.sha256 = hashlib.sha256(image_bytes).hexdigest()
    return result


def payload_for_client(result: ScanResponse) -> dict:
    """Serialize without Pydantic internals, dropping nulls we don't need."""
    return json.loads(result.model_dump_json(exclude_none=True))
