# RepoAgent — Hackathon MVP (Round 2 Working End-to-End)

A dual-engine brand content review platform combining **Vale CLI** (for deterministic, markup-aware rule linting) and **LLM Judgment** (for brand voice, factual claims, and citation-enforced review) with a full approval workflow.

---

## 1. Quick Start

### Prerequisites
1. Python 3.12+ installed
2. Dependencies installed:
   ```bash
   pip install -r requirements.txt
   ```
3. Vale CLI (already installed locally or available via WinGet / Chocolatey / Scoop)

### Run the Web Application
```bash
python app.py
```
Open your browser to: **http://localhost:8000**

---

## 2. Multi-Role Demo Workflow

Switch between roles seamlessly using the query parameter or the top-bar dropdown:
- **Charlie (Creator)**: `http://localhost:8000/?user=charlie`
  - Submits draft content
  - Views automated findings inline (Vale + AI)
  - Revises and addresses feedback
- **Rachel (Reviewer)**: `http://localhost:8000/?user=rachel`
  - Views the **Review Queue** (`/review-queue`)
  - Reviews content and flags
  - Adds comments and makes final decisions: **Approve**, **Request Changes**, or **Publish**
- **Alice (Admin)**: `http://localhost:8000/?user=alice`
  - Oversees brand guidelines and overall dashboard metrics

---

## 3. Seeded Test Files for Demo

Located in `sample_content/`:
- `bad_article_terminology.md`: Seeded with forbidden informal phrasing (`gonna`, `kinda`), incorrect terminology (`users` vs `customers`, `cheap` vs `affordable`), and case misspellings (`Novabrew`).
- `bad_article_facts.md`: Seeded with stale/outdated metrics (wrong founding year, wrong store count, unapproved legal guarantees).
- `bad_article_mixed.md`: Comprehensive article containing both deterministic style and factual discrepancies.
- `good_article.md`: Clean, compliant article matching all NovaBrew Coffee guidelines.
- `labels.json`: Ground truth dataset for measuring precision and recall.

---

## 4. Architecture & Ponytail Philosophy

- **Deterministic Layer**: Powered by Vale CLI running local declarative YAML rules (`styles/NovaBrew/`). Zero hallucinations, $O(N)$ execution time, 100% precision on terminology and banned tokens.
- **Judgment Layer**: Powered by Gemini (`gemini-2.0-flash`) with strict citation enforcement against the knowledge base (`knowledge_base/`). Findings without direct citations are suppressed.
- **Workflow & Audit**: SQLite database tracking all submissions, revisions, comments, and decision states (`draft` → `in_review` → `changes_requested` / `approved` → `published`).
- **Zero-Bloat UI**: Server-side rendered Jinja2 templates styled with Pico CSS and augmented with HTMX. No build steps, no webpack, no node modules.
