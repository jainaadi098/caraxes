import numpy as np
import pytest
from app.validators.deterministic_text import check_all_caps, check_exclamations, parse_max_count
from app.validators.visual_checks import check_logo_proportions, parse_contrast_threshold


def test_parse_max_count():
    assert parse_max_count("Use no more than 2 exclamation marks per paragraph") == 2
    assert parse_max_count("At most one exclamation mark is permitted") == 1
    assert parse_max_count("No numbers here") == 1  # default


def test_check_exclamations():
    # Pass case
    findings = check_exclamations("Hello world! This is fine.", max_count=2)
    assert len(findings) == 0

    # Violation case
    findings = check_exclamations("Hello world! Wow! Amazing! So cool!", max_count=2)
    assert len(findings) >= 1
    assert findings[0]["severity"] == "low"
    assert "4" in findings[0]["explanation"]


def test_check_all_caps():
    # Regular sentence with 4 all-caps words (more than 3 words and >=8 letters)
    findings = check_all_caps("This is fine. PLEASE READ THIS NOW.")
    assert len(findings) == 1
    assert findings[0]["severity"] == "low"
    assert "PLEASE READ THIS NOW." in findings[0]["segment"]

    # Short acronyms should not trigger violation
    findings = check_all_caps("Our API and SDK are fast.")
    assert len(findings) == 0


def test_parse_contrast_threshold():
    assert parse_contrast_threshold("Minimum 4.5:1 contrast ratio required") == 4.5
    assert parse_contrast_threshold("Ensure at least 7:1 contrast for small text") == 7.0
    assert parse_contrast_threshold("No ratio mentioned") == 4.5  # default WCAG AA


def test_check_logo_proportions():
    # Normal aspect ratio match
    finding = check_logo_proportions(
        logo_box=[0.1, 0.1, 0.3, 0.2],  # width 0.2, height 0.1 -> aspect ratio 2.0
        image_w=1000,
        image_h=1000,
        ref_w=200,
        ref_h=100,  # aspect ratio 2.0
    )
    assert finding is None

    # Stretched logo
    finding = check_logo_proportions(
        logo_box=[0.1, 0.1, 0.5, 0.2],  # width 0.4, height 0.1 -> aspect ratio 4.0 (2x stretched)
        image_w=1000,
        image_h=1000,
        ref_w=200,
        ref_h=100,  # aspect ratio 2.0
    )
    assert finding is not None
    assert finding["severity"] == "medium"
    assert "distorted" in finding["explanation"].lower()
