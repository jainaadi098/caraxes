-- =========================================================================
-- Migration 002: Batch Optimizations
-- Adds vector batch matching and batch embedding update RPCs to eliminate
-- sequential network round-trips to Supabase.
-- =========================================================================

begin;

-- 1. Batch vector search: resolves 5-30 query chunks in a single database round-trip
create or replace function match_knowledge_items_batch(
  query_embeddings  vector(768)[],
  match_org_id      uuid,
  match_count       int      default 4,
  filter_categories text[]   default null,
  filter_item_types text[]   default null,
  filter_tags       text[]   default null,
  min_similarity    float    default 0.0
)
returns table (
  id                 uuid,
  item_type          text,
  category           text,
  title              text,
  content            text,
  source_document_id uuid,
  source_page        int,
  source_excerpt     text,
  is_global          boolean,
  metadata           jsonb,
  similarity         float
)
language sql stable
as $$
  select distinct on (m.id)
    m.id, m.item_type, m.category, m.title, m.content,
    m.source_document_id, m.source_page, m.source_excerpt,
    m.is_global, m.metadata,
    m.similarity
  from unnest(query_embeddings) as q(emb)
  cross join lateral (
    select
      ki.id, ki.item_type, ki.category, ki.title, ki.content,
      ki.source_document_id, ki.source_page, ki.source_excerpt,
      ki.is_global, ki.metadata,
      (1 - (ki.embedding <=> q.emb))::float as similarity
    from knowledge_items ki
    where ki.org_id = match_org_id
      and ki.status = 'approved'
      and ki.is_global = false
      and ki.embedding is not null
      and (filter_categories is null or ki.category = any (filter_categories))
      and (filter_item_types is null or ki.item_type = any (filter_item_types))
      and (filter_tags is null or ki.metadata->'applies_to' ?| filter_tags)
      and (1 - (ki.embedding <=> q.emb)) >= min_similarity
    order by ki.embedding <=> q.emb
    limit match_count
  ) m
  order by m.id, m.similarity desc;
$$;

-- 2. Batch embedding updates: updates all embeddings in 1 round trip
create or replace function update_knowledge_item_embeddings(
  item_ids    uuid[],
  embeddings  vector(768)[]
)
returns void
language plpgsql
as $$
begin
  update knowledge_items ki
  set embedding = u.emb,
      updated_at = now()
  from unnest(item_ids, embeddings) as u(id, emb)
  where ki.id = u.id;
end;
$$;

commit;
