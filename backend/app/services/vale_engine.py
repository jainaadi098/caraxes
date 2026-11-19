from dataclasses import dataclass
import difflib
import re
from typing import Any

from app.services.vale_exporter import _parse_forbidden_tokens, _parse_substitutions


@dataclass
class ValeFinding:
    rule: str
    message: str
    level: str  # "error", "warning", "suggestion"
    segment: str
    start: int
    end: int
    replacement: str | None = None
    finding_type: str = "rule_violation"


def evaluate_vale_rules(text: str, items: list[dict]) -> list[dict]:
    """
    Evaluates text against brand rules using Vale's deterministic rule semantics:
    - Terminology substitutions (level: error, gives instant replacement)
    - Forbidden/banned existence tokens (level: warning)
    Returns findings in Caraxes finding dictionary format.
    """
    findings: list[dict] = []
    if not text:
        return findings

    # 1. Terminology substitutions
    swaps = _parse_substitutions(items)
    for bad_term, good_term in swaps.items():
        pattern = r"\b" + re.escape(bad_term) + r"\b"
        for m in re.finditer(pattern, text, re.IGNORECASE):
            match_str = m.group(0)
            # Preserve title/upper casing if original was title/upper
            replacement = good_term
            if match_str.isupper():
                replacement = good_term.upper()
            elif match_str[0].isupper() and len(match_str) > 1:
                replacement = good_term.capitalize()

            findings.append(
                {
                    "segment": match_str,
                    "severity": "medium",
                    "finding_type": "rule_violation",
                    "source": "deterministic",
                    "rule": "Brand.Terminology",
                    "explanation": f"Use approved terminology '{replacement}' instead of '{match_str}'.",
                    "suggested_correction": replacement,
                    "location": {"start": m.start(), "end": m.end()},
                }
            )

    # 2. Forbidden tokens
    banned = _parse_forbidden_tokens(items)
    for token in banned:
        pattern = r"\b" + re.escape(token) + r"\b"
        for m in re.finditer(pattern, text, re.IGNORECASE):
            findings.append(
                {
                    "segment": m.group(0),
                    "severity": "medium",
                    "finding_type": "rule_violation",
                    "source": "deterministic",
                    "rule": "Brand.BannedTerms",
                    "explanation": f"'{m.group(0)}' is prohibited by brand guidelines.",
                    "suggested_correction": None,
                    "location": {"start": m.start(), "end": m.end()},
                }
            )

    return findings


def apply_deterministic_substitutions(text: str, findings: list[dict]) -> tuple[str, list[dict]]:
    """
    Applies exact deterministic substitutions (e.g. from Vale terminology rules)
    to produce clean text in 0ms without requiring an LLM call.
    Applies edits in reverse offset order to keep indices valid.
    """
    # Filter for findings with exact location offsets and replacements
    fixable = [
        f for f in findings
        if f.get("suggested_correction") and isinstance(f.get("location", {}).get("start"), int)
    ]
    if not fixable:
        return text, []

    # Sort in reverse order of start offset
    fixable.sort(key=lambda f: f["location"]["start"], reverse=True)

    applied_changes: list[dict] = []
    chars = list(text)

    for f in fixable:
        start = f["location"]["start"]
        end = f["location"]["end"]
        replacement = f["suggested_correction"]
        original = text[start:end]

        # Apply replacement
        chars[start:end] = list(replacement)
        applied_changes.append(
            {
                "original": original,
                "replacement": replacement,
                "type": "vale_substitution",
                "rule": f.get("rule", "Brand.Terminology"),
            }
        )

    corrected_text = "".join(chars)
    applied_changes.reverse()  # Return in natural reading order
    return corrected_text, applied_changes


def generate_unified_diff(original: str, corrected: str, filename: str = "document.txt") -> str:
    """Generates a standard unified diff string between original and corrected text."""
    orig_lines = original.splitlines(keepends=True)
    corr_lines = corrected.splitlines(keepends=True)

    diff = difflib.unified_diff(
        orig_lines,
        corr_lines,
        fromfile=f"a/{filename}",
        tofile=f"b/{filename}",
        n=3,
    )
    return "".join(diff)
