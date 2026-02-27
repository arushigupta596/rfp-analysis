import type { RetrievedSection } from "./pageindex-retriever";

function formatSections(sections: RetrievedSection[]): string {
  if (!sections || sections.length === 0) return "  (No relevant sections retrieved)";
  return sections
    .map((s) => `  [${s.page_range}] ${s.title}\n  ${s.summary}`)
    .join("\n\n");
}

export function buildEvaluationPrompt(
  vendors: { name: string; text: string }[],
  retrievedSections: Record<string, RetrievedSection[]>
): { system: string; user: string } {
  const system = `You are an expert procurement evaluator for Indian government tenders. You evaluate vendor submissions strictly against RFP requirements. Be precise, cite specific gaps, and score conservatively. Return ONLY valid JSON with no markdown or explanation. Keep every justification, strength, risk, and summary string under 120 characters.`;

  const vendorBlock = vendors
    .map((v, i) => `--- VENDOR ${i + 1}: ${v.name} ---\n${v.text}`)
    .join("\n\n");

  const user = `Evaluate these ${vendors.length} vendor submissions against the IRCTC AI Chatbot RFP.

=== RFP REQUIREMENTS (retrieved via PageIndex tree search) ===

[ELIGIBILITY & COMPLIANCE]
${formatSections(retrievedSections.eligibility)}

[TECHNICAL SCORING CRITERIA]
${formatSections(retrievedSections.technical)}

[KEY DELIVERABLES]
${formatSections(retrievedSections.deliverables)}

[SLA REQUIREMENTS]
${formatSections(retrievedSections.sla)}

[COMMERCIAL TERMS]
${formatSections(retrievedSections.commercial)}

[COMPLIANCE]
${formatSections(retrievedSections.compliance)}

=== VENDOR SUBMISSIONS ===

${vendorBlock}

=== EVALUATION INSTRUCTIONS ===
Score each vendor using QCBS methodology:
- Technical score T(s): normalize so highest scorer = 100
- Financial score F(s): 100 x (lowest TMBC quoted / vendor TMBC) — lower bid is better
- Combined = 0.7 x T(s) + 0.3 x F(s)
- Minimum 70 raw technical marks to qualify for financial evaluation
- If TMBC is not mentioned in the vendor document, set tmbc_quoted_cr to 0 and financial_score to 0

Return this exact JSON structure with no markdown fences:
{
  "vendors": [
    {
      "name": "string",
      "eligibility": {
        "iso_27001": true,
        "turnover_5cr": true,
        "operating_5_years": true,
        "query_volume_1cr": true,
        "meity_cloud": true,
        "not_blacklisted": true,
        "overall_pass": true
      },
      "technical_score_raw": 0,
      "technical_score_normalized": 0,
      "technical_breakdown": {
        "project_experience": { "score": 0, "max": 20, "justification": "string" },
        "multilingual_capability": { "score": 0, "max": 30, "justification": "string" },
        "architecture_demo": { "score": 0, "max": 50, "justification": "string" }
      },
      "qualifies_for_financial": true,
      "tmbc_quoted_cr": 0,
      "financial_score": 0,
      "combined_score": 0,
      "commercial_breakdown": {
        "tmbc_competitiveness": { "score": 0, "max": 40, "justification": "string" },
        "revenue_sharing": { "score": 0, "max": 30, "justification": "string" },
        "payment_and_security": { "score": 0, "max": 30, "justification": "string" }
      },
      "missing_deliverables": [
        { "item": "string", "rfp_requirement": "string", "rfp_page": "string" }
      ],
      "strengths": ["string"],
      "risks": ["string"],
      "summary": "string"
    }
  ],
  "winner": "string",
  "winner_reasoning": "string",
  "ranking": ["string"],
  "disqualified": [{ "name": "string", "reason": "string" }]
}`;

  return { system, user };
}
