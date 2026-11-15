"""FastAPI app for RepoAgent. Hackathon-grade, ponytail philosophy."""

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, Form, Depends, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

import db
import review_engine

@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    yield

app = FastAPI(title="RepoAgent - NovaBrew Content Review", lifespan=lifespan)

BASE_DIR = Path(__file__).parent
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))


# Auth: user switching via query parameter
def current_user(request: Request):
    """Pull user from ?user= query param. Default to charlie."""
    name = request.query_params.get("user", "charlie")
    user = db.get_user_by_name(name)
    if not user:
        user = db.get_user_by_name("charlie")  # fallback
    return user


def _user_param(request: Request) -> str:
    """Preserve user param for links."""
    name = request.query_params.get("user", "")
    return f"?user={name}" if name else ""


# Routes

@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request, user=Depends(current_user)):
    stats = db.get_dashboard_stats()
    return templates.TemplateResponse(
        request=request,
        name="dashboard.html",
        context={
            "user": user,
            "stats": stats,
            "up": _user_param(request),
        },
    )


@app.get("/submit", response_class=HTMLResponse)
async def submit_form(request: Request, user=Depends(current_user)):
    return templates.TemplateResponse(
        request=request,
        name="submit.html",
        context={
            "user": user,
            "up": _user_param(request),
        },
    )


@app.post("/submit")
async def submit_content(
    request: Request,
    title: str = Form(...),
    body: str = Form(...),
    user=Depends(current_user),
):
    content_id = db.create_content(title=title, body=body, author_id=user["id"])
    await review_engine.run_full_review(body, content_id)
    up = _user_param(request)
    return RedirectResponse(url=f"/content/{content_id}{up}", status_code=303)


@app.get("/content/{content_id}", response_class=HTMLResponse)
async def view_content(request: Request, content_id: int, user=Depends(current_user)):
    data = db.get_content_with_findings(content_id)
    if not data:
        raise HTTPException(status_code=404, detail="Content not found")
    comments = db.get_comments(content_id)
    revisions = db.get_revisions(content_id)

    vale_findings = [f for f in data["findings"] if f["engine"] == "vale"]
    ai_findings = [f for f in data["findings"] if f["engine"] == "ai"]

    return templates.TemplateResponse(
        request=request,
        name="content.html",
        context={
            "user": user,
            "content": data["content"],
            "vale_findings": vale_findings,
            "ai_findings": ai_findings,
            "comments": [dict(c) for c in comments],
            "revisions": [dict(r) for r in revisions],
            "up": _user_param(request),
        },
    )


@app.post("/content/{content_id}/comment")
async def add_comment(
    request: Request,
    content_id: int,
    body: str = Form(...),
    finding_id: int | None = Form(default=None),
    user=Depends(current_user),
):
    fid = finding_id if isinstance(finding_id, int) else None
    db.add_comment(content_id=content_id, user_id=user["id"], body=body, finding_id=fid)
    up = _user_param(request)
    return RedirectResponse(url=f"/content/{content_id}{up}", status_code=303)


@app.post("/content/{content_id}/status")
async def change_status(
    request: Request,
    content_id: int,
    status: str = Form(...),
    user=Depends(current_user),
):
    if user["role"] not in ("reviewer", "admin"):
        raise HTTPException(status_code=403, detail="Only reviewers can change status")
    allowed = ("approved", "changes_requested", "published", "in_review")
    if status not in allowed:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {allowed}")
    db.update_content_status(content_id, status)
    up = _user_param(request)
    return RedirectResponse(url=f"/content/{content_id}{up}", status_code=303)


@app.get("/content/{content_id}/re-review")
async def re_review(request: Request, content_id: int, user=Depends(current_user)):
    content = db.get_content(content_id)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    await review_engine.run_full_review(content["body"], content_id)
    up = _user_param(request)
    return RedirectResponse(url=f"/content/{content_id}{up}", status_code=303)


@app.get("/review-queue", response_class=HTMLResponse)
async def review_queue(request: Request, user=Depends(current_user)):
    items = db.get_content_by_status("in_review")
    return templates.TemplateResponse(
        request=request,
        name="review_queue.html",
        context={
            "user": user,
            "items": [dict(i) for i in items],
            "up": _user_param(request),
        },
    )


# API endpoints

@app.get("/api/content/{content_id}/findings")
async def api_findings(content_id: int):
    data = db.get_content_with_findings(content_id)
    if not data:
        raise HTTPException(status_code=404, detail="Content not found")
    return JSONResponse(content=data)


@app.get("/api/sample/{sample_type}")
async def get_sample_content(sample_type: str):
    file_map = {
        "terminology": ("Why Novabrew Is Basically the Best Coffee", "sample_content/bad_article_terminology.md"),
        "facts": ("NovaBrew Coffee: A Portland Success Story", "sample_content/bad_article_facts.md"),
        "mixed": ("NovaBrew Brand Story and Seasonal Lineup", "sample_content/bad_article_mixed.md"),
        "good": ("Introducing the Cascadian Roast: Our Autumn Blend", "sample_content/good_article.md"),
    }
    if sample_type not in file_map:
        raise HTTPException(status_code=404, detail="Sample not found")
    title, rel_path = file_map[sample_type]
    full_path = BASE_DIR / rel_path
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="Sample file missing")
    body = full_path.read_text(encoding="utf-8")
    return JSONResponse(content={"title": title, "body": body})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
