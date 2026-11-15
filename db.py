"""Backwards-compatibility shim re-exporting core.database."""

from core.database import (
    init_db,
    get_db,
    get_user_by_name,
    get_all_users,
    create_content,
    get_content,
    update_content_status,
    get_content_by_status,
    get_all_content,
    save_finding,
    get_findings,
    resolve_finding,
    clear_findings,
    add_comment,
    get_comments,
    create_revision,
    get_revisions,
    get_content_with_findings,
    get_dashboard_stats,
)
