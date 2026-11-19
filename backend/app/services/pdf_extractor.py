from dataclasses import dataclass

import numpy as np
import pymupdf

from app.services.ocr import ocr_image

MIN_NATIVE_CHARS = 50  # fewer characters than this = page is probably a scan
OCR_DPI = 200          # image resolution for OCR; higher is slower but more accurate


@dataclass
class PageText:
    page_number: int  # 1-based, matching what a person sees in a PDF viewer
    text: str
    method: str       # "native" or "ocr"
    ocr_confidence: float | None = None


def extract_pdf_pages(pdf_bytes: bytes) -> list[PageText]:
    """
    Extracts text page-by-page. Extracts native selectable PDF text first with PyMuPDF.
    Only invokes OCR (which requires a global lock for PaddleOCR) on pages that actually
    lack selectable text AND contain raster images that could hold scanned content.
    """
    pages: list[PageText] = []

    with pymupdf.open(stream=pdf_bytes, filetype="pdf") as doc:
        for index, page in enumerate(doc):
            native = page.get_text("text").strip()

            # 1. Native text is sufficient: skip OCR completely
            if len(native) >= MIN_NATIVE_CHARS:
                pages.append(PageText(index + 1, native, "native"))
                continue

            # 2. If page has no raster images, OCR cannot find any scanned text
            # (e.g. short title page, blank page, or vector-only graphics)
            images_on_page = page.get_images()
            if not images_on_page:
                pages.append(PageText(index + 1, native, "native"))
                continue

            # 3. Only invoke OCR when native text is lacking AND page contains images
            pix = page.get_pixmap(dpi=OCR_DPI, colorspace=pymupdf.csRGB, alpha=False)
            rgb = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, 3)
            bgr = np.ascontiguousarray(rgb[:, :, ::-1])  # BGR format for OCR
            ocr_text, confidence = ocr_image(bgr)

            if len(ocr_text) > len(native):
                pages.append(PageText(index + 1, ocr_text, "ocr", confidence))
            else:
                # OCR found nothing better: keep native
                pages.append(PageText(index + 1, native, "native"))

    return pages