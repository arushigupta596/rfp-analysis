"""
build_rfp_index.py
------------------
Reads RFP_Unified_Registry_KSITM.pdf (project root), runs PageIndex on it
via OpenRouter, and saves the resulting tree index to /backend/rfp_index.json.

Usage:
    python build_rfp_index.py

Requires:
    - OPENROUTER_API_KEY in backend/.env
    - rfp.pdf placed in the backend/ directory
"""

import os
import sys
import json

# ── 1. Load .env BEFORE anything else ─────────────────────────────────────────
from dotenv import load_dotenv

_here = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(_here, ".env"))

# ── 2. Wire OpenRouter into the env vars PageIndex / OpenAI SDK read ───────────
openrouter_key = os.environ.get("OPENROUTER_API_KEY", "")
if not openrouter_key:
    raise EnvironmentError("OPENROUTER_API_KEY is not set. Add it to backend/.env")

# PageIndex reads CHATGPT_API_KEY at module-import time; set it now.
os.environ["CHATGPT_API_KEY"] = openrouter_key
# OpenAI Python SDK checks OPENAI_BASE_URL at client-creation time.
os.environ["OPENAI_BASE_URL"] = "https://openrouter.ai/api/v1"

# ── 3. Patch tiktoken so it gracefully handles Claude model names ──────────────
# tiktoken only knows OpenAI model names; fall back to gpt-4o encoding.
import tiktoken

_orig_encoding_for_model = tiktoken.encoding_for_model


def _patched_encoding_for_model(model_name: str):
    try:
        return _orig_encoding_for_model(model_name)
    except (KeyError, ValueError):
        return _orig_encoding_for_model("gpt-4o")


tiktoken.encoding_for_model = _patched_encoding_for_model

# ── 4. Now it's safe to import PageIndex ──────────────────────────────────────
sys.path.insert(0, _here)
from pageindex_lib.pageindex import page_index_main, config  # noqa: E402


def count_nodes(structure) -> int:
    """Recursively count all nodes in the PageIndex tree."""
    total = 0
    if isinstance(structure, dict):
        total += 1
        for child in structure.get("nodes", []):
            total += count_nodes(child)
    elif isinstance(structure, list):
        for item in structure:
            total += count_nodes(item)
    return total


def main():
    # PDF lives one level up (project root)
    project_root = os.path.dirname(_here)
    pdf_path = os.path.join(project_root, "85281205_TD_169_Lnf9.pdf")
    output_path = os.path.join(_here, "rfp_index.json")

    if not os.path.isfile(pdf_path):
        raise FileNotFoundError(
            f"PDF not found at {pdf_path}."
        )

    # ── Build PageIndex config ─────────────────────────────────────────────────
    # node_id    → needed for tree search later
    # node_summary → LLM-generated summary per section (used in retrieval)
    # node_text  → omit raw text from index to keep file small
    # doc_description → skip (adds an extra API call we don't need)
    opt = config(
        model="anthropic/claude-sonnet-4-5",
        toc_check_page_num=20,
        max_page_num_each_node=10,
        max_token_num_each_node=20000,
        if_add_node_id="yes",
        if_add_node_summary="yes",
        if_add_doc_description="no",
        if_add_node_text="no",
    )

    print(f"Building RFP index from: {pdf_path}")
    print(f"Model: {opt.model}  |  via OpenRouter")
    print("This may take a few minutes...\n")

    result = page_index_main(pdf_path, opt)

    # ── Persist index ──────────────────────────────────────────────────────────
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    node_count = count_nodes(result.get("structure", []))
    print(f"\nRFP index built successfully with {node_count} nodes")
    print(f"Saved to: {output_path}")


if __name__ == "__main__":
    main()
