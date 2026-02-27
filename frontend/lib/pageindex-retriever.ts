export interface PageIndexNode {
  title: string;
  node_id: string;
  start_index: number;
  end_index: number;
  summary: string;
  nodes?: PageIndexNode[];
}

export interface RFPIndex {
  doc_description: string;
  nodes: PageIndexNode[];
}

export interface RetrievedSection {
  title: string;
  node_id: string;
  page_range: string;
  summary: string;
  relevance_score: number;
  path: string[]; // breadcrumb from root to this node
}

interface FlatNode {
  node_id: string;
  title: string;
  summary: string;
  start_index: number;
  end_index: number;
  path: string[];
}

// Step 1 — recursively flatten the tree into a list of nodes with breadcrumbs
function flattenTree(nodes: PageIndexNode[], path: string[] = []): FlatNode[] {
  const result: FlatNode[] = [];
  for (const node of nodes) {
    const nodePath = [...path, node.title];
    result.push({
      node_id: node.node_id,
      title: node.title,
      summary: node.summary || "",
      start_index: node.start_index,
      end_index: node.end_index,
      path: nodePath,
    });
    if (node.nodes && node.nodes.length > 0) {
      result.push(...flattenTree(node.nodes, nodePath));
    }
  }
  return result;
}

// Step 2 — score nodes locally via keyword matching (no LLM call needed)
function scoreNodeLocally(node: FlatNode, keywords: string[]): number {
  const haystack = (node.title + " " + node.summary).toLowerCase();
  const hits = keywords.filter((kw) => haystack.includes(kw)).length;
  // Scale to 0–10; full keyword coverage = 10
  return Math.min(10, Math.round((hits / keywords.length) * 10));
}

export function retrieveRelevantSections(
  query: string,
  rfpIndex: RFPIndex,
  topK: number = 5
): RetrievedSection[] {
  const flatNodes = flattenTree(rfpIndex.nodes);
  if (flatNodes.length === 0) return [];

  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2); // drop trivial words

  const scored = flatNodes
    .map((n) => ({ node: n, score: scoreNodeLocally(n, keywords) }))
    .filter((x) => x.score >= 3) // minimum relevance threshold
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored.map(({ node, score }) => ({
    title: node.title,
    node_id: node.node_id,
    page_range: `pp. ${node.start_index}-${node.end_index}`,
    summary: node.summary,
    relevance_score: score,
    path: node.path,
  }));
}

const QUERIES: Record<string, string> = {
  eligibility:
    "eligibility criteria company registration turnover ISO certification years operation",
  technical:
    "technical scoring evaluation marks project experience multilingual languages",
  deliverables:
    "key deliverables chatbot WhatsApp voice GenAI Agentic AI capabilities",
  sla: "SLA service level agreement uptime response time penalties",
  commercial: "commercial terms TMBC revenue sharing payment security deposit",
  compliance: "compliance data privacy DPDP CERT-IN India hosting MEITY",
};

export function retrieveAllRelevantSections(
  rfpIndex: RFPIndex,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _openrouterApiKey?: string
): Record<string, RetrievedSection[]> {
  return Object.fromEntries(
    Object.entries(QUERIES).map(([key, query]) => [
      key,
      retrieveRelevantSections(query, rfpIndex, 5),
    ])
  );
}
