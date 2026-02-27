"""
rfp_retriever.py
----------------
Tree-search retrieval over a PageIndex-built RFP index.

Public API:
    retrieve_relevant_sections(
        query:     str,
        rfp_index: dict,   # loaded from rfp_index.json
        model:     str,    # e.g. "anthropic/claude-sonnet-4-5"
    ) -> list[dict]

Each returned dict:
    {
        "section_title":    str,
        "page_range":       str,   # e.g. "pp. 12–15"
        "content_summary":  str,
        "relevance_reason": str,
    }
"""

from __future__ import annotations

import json
import os
from typing import Any

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"


# ── Helpers ────────────────────────────────────────────────────────────────────


def _get_client() -> OpenAI:
    api_key = os.environ.get("OPENROUTER_API_KEY", "")
    if not api_key:
        raise EnvironmentError("OPENROUTER_API_KEY is not set. Add it to backend/.env")
    return OpenAI(api_key=api_key, base_url=OPENROUTER_BASE_URL)


def _chat(client: OpenAI, model: str, prompt: str) -> str:
    """Single-turn chat completion, returns the text content."""
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
    )
    return response.choices[0].message.content or ""


def _extract_json(text: str) -> Any:
    """Extract a JSON object/array from an LLM response."""
    # Strip markdown code fences if present
    for fence in ("```json", "```"):
        start = text.find(fence)
        if start != -1:
            text = text[start + len(fence):]
            end = text.rfind("```")
            if end != -1:
                text = text[:end]
            break
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Last-ditch: find the first { or [ and try from there
        for ch, close in (("{", "}"), ("[", "]")):
            i = text.find(ch)
            j = text.rfind(close)
            if i != -1 and j > i:
                try:
                    return json.loads(text[i: j + 1])
                except json.JSONDecodeError:
                    pass
        return {}


def _flatten_tree(node: Any, result: list | None = None) -> list[dict]:
    """
    Walk the PageIndex tree recursively and return a flat list of node dicts
    (without the 'nodes' child list, to keep things readable for the LLM).
    """
    if result is None:
        result = []
    if isinstance(node, dict):
        flat = {k: v for k, v in node.items() if k != "nodes"}
        result.append(flat)
        for child in node.get("nodes", []):
            _flatten_tree(child, result)
    elif isinstance(node, list):
        for item in node:
            _flatten_tree(item, result)
    return result


def _compact_tree(structure: Any) -> list[dict]:
    """
    Build a compact representation for the LLM tree-search prompt:
    only node_id, title, start_index, end_index, and summary (if present).
    """
    flat = _flatten_tree(structure)
    compact = []
    for n in flat:
        entry: dict = {
            "node_id": n.get("node_id", ""),
            "title": n.get("title", ""),
            "pages": f"{n.get('start_index', '?')}–{n.get('end_index', '?')}",
        }
        if n.get("summary"):
            entry["summary"] = n["summary"]
        compact.append(entry)
    return compact


def _node_by_id(structure: Any, node_id: str) -> dict | None:
    """Return the first node with the given node_id."""
    if isinstance(structure, dict):
        if structure.get("node_id") == node_id:
            return structure
        for child in structure.get("nodes", []):
            found = _node_by_id(child, node_id)
            if found:
                return found
    elif isinstance(structure, list):
        for item in structure:
            found = _node_by_id(item, node_id)
            if found:
                return found
    return None


# ── LLM tree-search step ───────────────────────────────────────────────────────


def _tree_search(
    client: OpenAI,
    model: str,
    query: str,
    compact_tree: list[dict],
) -> list[dict]:
    """
    Ask the LLM to identify which nodes in the PageIndex tree are relevant
    to the query.  Returns a list of {node_id, relevance_reason}.
    """
    tree_str = json.dumps(compact_tree, indent=2, ensure_ascii=False)
    prompt = f"""You are analyzing an RFP (Request for Proposal) document tree index.

Your task: identify ALL nodes that are relevant to the query below.

Query: {query}

Document tree structure (each node has node_id, title, page range, and optional summary):
{tree_str}

Reply ONLY with a JSON object in this exact format:
{{
  "thinking": "<brief reasoning about which sections are relevant>",
  "results": [
    {{
      "node_id": "<node_id>",
      "relevance_reason": "<one sentence explaining why this node is relevant>"
    }}
  ]
}}

Include every node that is even partially relevant. If no nodes are relevant, return an empty results list.
Do not output anything outside the JSON."""

    raw = _chat(client, model, prompt)
    parsed = _extract_json(raw)
    return parsed.get("results", [])


# ── Per-node content summary step ─────────────────────────────────────────────


def _summarize_node(
    client: OpenAI,
    model: str,
    query: str,
    node: dict,
) -> str:
    """
    Generate a focused content summary for a single node given the query.
    Uses the node's existing summary if available; falls back to title + page info.
    """
    existing = node.get("summary", "").strip()
    page_info = f"pages {node.get('start_index', '?')}–{node.get('end_index', '?')}"

    if existing:
        context = f"Section summary: {existing}"
    else:
        context = f"Section title: {node.get('title', 'Unknown')}  |  {page_info}"

    prompt = f"""You are analyzing a section of an RFP document.

Query: {query}

{context}

Write a focused 2-3 sentence content summary of what this section likely contains
that is specifically relevant to the query. Be concrete and mention any key terms
(criteria, thresholds, requirements, deadlines) that appear to be covered.

Respond with only the summary text, no preamble."""

    return _chat(client, model, prompt).strip()


# ── Public API ─────────────────────────────────────────────────────────────────


def retrieve_relevant_sections(
    query: str,
    rfp_index: dict,
    model: str = "anthropic/claude-sonnet-4-5",
) -> list[dict]:
    """
    Use PageIndex tree search to find the most relevant RFP sections for a query.

    Args:
        query:     Natural-language question or topic, e.g.
                   "eligibility criteria for turnover",
                   "technical scoring criteria",
                   "SLA requirements".
        rfp_index: Dict loaded from rfp_index.json (output of build_rfp_index.py).
        model:     OpenRouter model identifier.

    Returns:
        List of dicts, each with:
            section_title    – section heading from the document
            page_range       – human-readable page range (e.g. "pp. 12–15")
            content_summary  – LLM-generated summary focused on the query
            relevance_reason – why this section was deemed relevant
    """
    structure = rfp_index.get("structure", [])
    if not structure:
        return []

    client = _get_client()
    compact = _compact_tree(structure)

    # Step 1: tree search — which node_ids are relevant?
    search_results = _tree_search(client, model, query, compact)
    if not search_results:
        return []

    # Step 2: for each relevant node, build the output dict
    sections: list[dict] = []
    for hit in search_results:
        node_id = hit.get("node_id", "")
        reason = hit.get("relevance_reason", "")

        node = _node_by_id(structure, node_id)
        if node is None:
            continue

        start = node.get("start_index")
        end = node.get("end_index")
        if start == end:
            page_range = f"p. {start}"
        else:
            page_range = f"pp. {start}–{end}"

        summary = _summarize_node(client, model, query, node)

        sections.append(
            {
                "section_title": node.get("title", f"Node {node_id}"),
                "page_range": page_range,
                "content_summary": summary,
                "relevance_reason": reason,
            }
        )

    return sections


# ── Quick smoke-test (run directly) ───────────────────────────────────────────

if __name__ == "__main__":
    import sys

    index_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "rfp_index.json")
    if not os.path.isfile(index_path):
        print("rfp_index.json not found. Run build_rfp_index.py first.")
        sys.exit(1)

    with open(index_path, encoding="utf-8") as f:
        rfp_index = json.load(f)

    test_queries = [
        "eligibility criteria for turnover",
        "technical scoring criteria",
        "SLA requirements",
    ]

    for q in test_queries:
        print(f"\n{'='*60}")
        print(f"Query: {q}")
        print("=" * 60)
        results = retrieve_relevant_sections(q, rfp_index)
        if not results:
            print("  No relevant sections found.")
        for r in results:
            print(f"\n  Section : {r['section_title']}")
            print(f"  Pages   : {r['page_range']}")
            print(f"  Summary : {r['content_summary']}")
            print(f"  Reason  : {r['relevance_reason']}")
