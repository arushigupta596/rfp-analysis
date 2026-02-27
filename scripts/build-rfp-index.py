"""
Run this ONCE locally to build the RFP index from the PDF.

Usage:
    python scripts/build-rfp-index.py --pdf /path/to/rfp.pdf

Requirements:
    pip install -r scripts/requirements.txt

Output:
    frontend/lib/rfp-index.json  — commit this file to GitHub
"""

import argparse
import json
import os
import sys

# ── Add pageindex_lib to path ───────────────────────────────────────────────
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, "backend"))

from dotenv import load_dotenv

load_dotenv(os.path.join(ROOT, "backend", ".env"))


def main() -> None:
    parser = argparse.ArgumentParser(description="Build PageIndex from an RFP PDF")
    parser.add_argument("--pdf", required=True, help="Path to the RFP PDF")
    parser.add_argument("--model", default="anthropic/claude-sonnet-4-5", help="LLM model to use")
    parser.add_argument(
        "--output",
        default=os.path.join(ROOT, "frontend", "lib", "rfp-index.json"),
        help="Output path for rfp-index.json",
    )
    args = parser.parse_args()

    openrouter_key = os.getenv("OPENROUTER_API_KEY")
    if not openrouter_key:
        sys.exit("Error: OPENROUTER_API_KEY not set. Add it to backend/.env")

    pdf_path = os.path.abspath(args.pdf)
    if not os.path.exists(pdf_path):
        sys.exit(f"Error: PDF not found at {pdf_path}")

    print(f"Building PageIndex for: {pdf_path}")
    print(f"Model: {args.model}")

    # ── Set env before importing pageindex ──────────────────────────────────
    os.environ["CHATGPT_API_KEY"] = openrouter_key
    os.environ["OPENAI_BASE_URL"] = "https://openrouter.ai/api/v1"

    import tiktoken
    _orig = tiktoken.encoding_for_model

    def _patched(model_name: str):
        try:
            return _orig(model_name)
        except (KeyError, ValueError):
            return _orig("gpt-4o")

    tiktoken.encoding_for_model = _patched  # type: ignore

    from pageindex_lib.pageindex import page_index_main, config  # type: ignore

    opt = config(
        model=args.model,
        toc_check_page_num=20,
        max_page_num_each_node=10,
        max_token_num_each_node=20000,
        if_add_node_id="yes",
        if_add_node_summary="yes",
        if_add_doc_description="no",
        if_add_node_text="no",
    )

    raw = page_index_main(pdf_path, opt)

    # ── Transform to the format expected by pageindex-retriever.ts ──────────
    def transform_node(node: dict) -> dict:
        transformed = {
            "node_id": node.get("node_id", ""),
            "title": node.get("title", ""),
            "start_index": node.get("start_index", 0),
            "end_index": node.get("end_index", 0),
            "summary": node.get("summary", ""),
        }
        children = node.get("nodes", [])
        if children:
            transformed["nodes"] = [transform_node(c) for c in children]
        return transformed

    structure = raw.get("structure", [])
    output = {
        "doc_description": raw.get("doc_name", os.path.basename(pdf_path)),
        "nodes": [transform_node(n) for n in structure],
    }

    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    with open(args.output, "w") as f:
        json.dump(output, f, indent=2)

    # ── Stats ────────────────────────────────────────────────────────────────
    def count_nodes(nodes: list) -> int:
        total = len(nodes)
        for n in nodes:
            total += count_nodes(n.get("nodes", []))
        return total

    node_count = count_nodes(output["nodes"])
    size_kb = os.path.getsize(args.output) / 1024

    print(f"\n✓ Index built: {node_count} nodes, {size_kb:.1f} KB")
    print(f"✓ Saved to: {args.output}")
    print(f"\nNext steps:")
    print(f"  git add {args.output}")
    print(f"  git commit -m 'Add RFP index ({node_count} nodes)'")
    print(f"  git push")


if __name__ == "__main__":
    main()
