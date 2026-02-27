"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { RetrievedSection } from "@/lib/pageindex-retriever";

// ── Types from the API response ─────────────────────────────────────────────
interface Eligibility {
  iso_27001: boolean;
  turnover_5cr: boolean;
  operating_5_years: boolean;
  query_volume_1cr: boolean;
  meity_cloud: boolean;
  not_blacklisted: boolean;
  overall_pass: boolean;
}

interface TechBreakdown {
  project_experience: { score: number; max: number; justification: string };
  multilingual_capability: { score: number; max: number; justification: string };
  architecture_demo: { score: number; max: number; justification: string };
}

interface CommercialBreakdown {
  tmbc_competitiveness: { score: number; max: number; justification: string };
  revenue_sharing: { score: number; max: number; justification: string };
  payment_and_security: { score: number; max: number; justification: string };
}

interface MissingDeliverable {
  item: string;
  rfp_requirement: string;
  rfp_page: string;
}

interface VendorResult {
  name: string;
  eligibility: Eligibility;
  technical_score_raw: number;
  technical_score_normalized: number;
  technical_breakdown: TechBreakdown;
  qualifies_for_financial: boolean;
  tmbc_quoted_cr: number;
  financial_score: number;
  combined_score: number;
  commercial_breakdown?: CommercialBreakdown;
  missing_deliverables: MissingDeliverable[];
  strengths: string[];
  risks: string[];
  summary: string;
}

interface AnalysisResult {
  vendors: VendorResult[];
  winner: string;
  winner_reasoning: string;
  ranking?: string[];
  disqualified?: { name: string; reason: string }[];
  _retrieved_sections?: Record<string, RetrievedSection[]>;
}

// ── Fallback demo data ───────────────────────────────────────────────────────
const FALLBACK: AnalysisResult = {
  winner: "TCS Digital Solutions",
  winner_reasoning:
    "TCS scores highest on both technical (89/100) and combined QCBS (85.3) criteria, meeting all eligibility requirements and demonstrating strong multilingual and Agentic AI capabilities.",
  ranking: ["TCS Digital Solutions", "Infosys AI Labs", "Wipro iSocial"],
  disqualified: [{ name: "Wipro iSocial", reason: "Annual turnover Rs 3.2 Cr — below Rs 5 Cr threshold" }],
  vendors: [
    {
      name: "TCS Digital Solutions",
      eligibility: { iso_27001: true, turnover_5cr: true, operating_5_years: true, query_volume_1cr: true, meity_cloud: true, not_blacklisted: true, overall_pass: true },
      technical_score_raw: 89,
      technical_score_normalized: 100,
      technical_breakdown: {
        project_experience: { score: 18, max: 20, justification: "8 production GenAI chatbot deployments, 3 exceed 1,000+ daily users." },
        multilingual_capability: { score: 27, max: 30, justification: "14 Indian languages with >92% NLP accuracy in 10 languages." },
        architecture_demo: { score: 44, max: 50, justification: "Strong Agentic AI with RAG pipeline; missing real-time escalation prototype." },
      },
      qualifies_for_financial: true,
      tmbc_quoted_cr: 4.2,
      financial_score: 88.1,
      combined_score: 96.4,
      commercial_breakdown: {
        tmbc_competitiveness: { score: 35, max: 40, justification: "TMBC of ₹4.2 Cr is competitive but 14% above lowest bid; strong value relative to technical depth delivered." },
        revenue_sharing: { score: 27, max: 30, justification: "Offers 18% ad revenue share to IRCTC — above average; clear monetization roadmap provided." },
        payment_and_security: { score: 28, max: 30, justification: "Security deposit of ₹10 L submitted; milestone-based payment schedule aligned to RFP terms." },
      },
      missing_deliverables: [
        { item: "Real-time escalation to human agent prototype", rfp_requirement: "Escalation Management", rfp_page: "p. 15" },
      ],
      strengths: ["Strongest multilingual NLP — 14 Indian languages >90% accuracy", "8 production GenAI chatbot deployments", "Demonstrated Agentic AI with autonomous booking flow"],
      risks: ["Escalation prototype not demonstrated", "WhatsApp integration sub-contracted — IP ownership unclear"],
      summary: "TCS is the clear technical leader with robust multilingual capabilities and a proven Agentic AI architecture. Minor gaps in escalation demo.",
    },
    {
      name: "Infosys AI Labs",
      eligibility: { iso_27001: true, turnover_5cr: true, operating_5_years: true, query_volume_1cr: true, meity_cloud: true, not_blacklisted: true, overall_pass: true },
      technical_score_raw: 74,
      technical_score_normalized: 83.1,
      technical_breakdown: {
        project_experience: { score: 14, max: 20, justification: "5 chatbot projects; only 1 in travel domain." },
        multilingual_capability: { score: 22, max: 30, justification: "10 languages; 4 required languages absent; 3 below 90% accuracy." },
        architecture_demo: { score: 38, max: 50, justification: "Good RAG implementation; pre-recorded demo, not live system." },
      },
      qualifies_for_financial: true,
      tmbc_quoted_cr: 3.7,
      financial_score: 100,
      combined_score: 88.2,
      commercial_breakdown: {
        tmbc_competitiveness: { score: 40, max: 40, justification: "Lowest TMBC at ₹3.7 Cr — full 40 points awarded as the benchmark bid in financial evaluation." },
        revenue_sharing: { score: 21, max: 30, justification: "Revenue share of 12% offered — below RFP expectation of 15–20%; terms described vaguely without a monetization plan." },
        payment_and_security: { score: 25, max: 30, justification: "Security deposit submitted; payment schedule partially deviates from standard milestone split proposed in RFP." },
      },
      missing_deliverables: [
        { item: "Voice input / IVRS integration", rfp_requirement: "Channel Requirements", rfp_page: "p. 11" },
        { item: "Malayalam and Odia language support", rfp_requirement: "Language Coverage", rfp_page: "p. 12" },
        { item: "Monetization revenue declaration (Annexure IV)", rfp_requirement: "Annexure IV", rfp_page: "pp. 47–48" },
      ],
      strengths: ["ISO 27001 and SOC 2 Type II certified", "Proven PNR API integration with IRCTC", "Cost-competitive — lowest TMBC"],
      risks: ["Missing 4 mandatory Indian languages", "No live Agentic AI demo", "Annexure IV not submitted"],
      summary: "Infosys is technically qualified but has significant language coverage gaps. Lowest bid gives strong financial score.",
    },
    {
      name: "Wipro iSocial",
      eligibility: { iso_27001: true, turnover_5cr: false, operating_5_years: true, query_volume_1cr: false, meity_cloud: true, not_blacklisted: true, overall_pass: false },
      technical_score_raw: 60,
      technical_score_normalized: 67.4,
      technical_breakdown: {
        project_experience: { score: 10, max: 20, justification: "4 chatbot projects; none in ticketing domain." },
        multilingual_capability: { score: 18, max: 30, justification: "8 languages; benchmarks not provided for 6; voice support is beta." },
        architecture_demo: { score: 32, max: 50, justification: "Entirely conceptual; no working prototype submitted." },
      },
      qualifies_for_financial: false,
      tmbc_quoted_cr: 0,
      financial_score: 0,
      combined_score: 0,
      commercial_breakdown: {
        tmbc_competitiveness: { score: 0, max: 40, justification: "TMBC not disclosed in submission — financial evaluation cannot proceed. Disqualified on eligibility grounds." },
        revenue_sharing: { score: 0, max: 30, justification: "No revenue sharing model submitted; Annexure IV (monetization declaration) absent." },
        payment_and_security: { score: 0, max: 30, justification: "Security deposit not confirmed; no payment schedule submitted with the bid." },
      },
      missing_deliverables: [
        { item: "CA-certified turnover statement with UDIN", rfp_requirement: "Financial Turnover Criterion", rfp_page: "pp. 24–25" },
        { item: "Agentic AI working prototype", rfp_requirement: "Technical Presentation", rfp_page: "p. 29" },
        { item: "Language accuracy benchmarks (8 languages)", rfp_requirement: "Language Coverage", rfp_page: "p. 12" },
        { item: "WhatsApp Business API integration proof", rfp_requirement: "WhatsApp Channel", rfp_page: "p. 11" },
      ],
      strengths: ["Lowest proposed cost among all vendors", "50+ engineers allocated to project", "Owned data centres in India"],
      risks: ["Fails minimum turnover threshold (Rs 3.2 Cr vs Rs 5 Cr)", "Technical score 60/100 below 70 minimum", "No working GenAI prototype submitted"],
      summary: "Wipro is disqualified on eligibility — turnover below threshold. Technical score also below qualifying mark.",
    },
  ],
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function scoreColor(score: number): string {
  if (score >= 80) return "#16A34A";
  if (score >= 60) return "#D97706";
  return "#DC2626";
}

function scoreBg(score: number): string {
  if (score >= 80) return "bg-green-50 text-green-700 border-green-200";
  if (score >= 60) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
}

const ELIGIBILITY_ROWS: { key: keyof Eligibility; label: string }[] = [
  { key: "iso_27001", label: "ISO 27001:2015" },
  { key: "turnover_5cr", label: "Turnover ≥ ₹5 Cr" },
  { key: "operating_5_years", label: "5+ Years Operating" },
  { key: "query_volume_1cr", label: "1 Crore+ Annual Queries" },
  { key: "meity_cloud", label: "MEITY Cloud Compliant" },
  { key: "not_blacklisted", label: "Not Blacklisted" },
  { key: "overall_pass", label: "OVERALL ELIGIBILITY" },
];

// ── Small components ──────────────────────────────────────────────────────────
function CheckIcon({ pass }: { pass: boolean }) {
  return (
    <div className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full ring-1 ${pass ? "bg-green-50 ring-green-200" : "bg-red-50 ring-red-200"}`}>
      {pass ? (
        <svg className="h-3.5 w-3.5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      ) : (
        <svg className="h-3.5 w-3.5 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
    </div>
  );
}

function ScoreBar({ score, max, color }: { score: number; max: number; color: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
      <div
        className="h-full rounded-full"
        style={{
          "--score-pct": `${Math.round((score / max) * 100)}%`,
          animation: "scoreBar 1s ease-out forwards",
          backgroundColor: color,
        } as React.CSSProperties}
      />
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900 uppercase tracking-wide">
      {children}
    </h2>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ResultsPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [citationsOpen, setCitationsOpen] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("rfp_results");
    setData(stored ? (JSON.parse(stored) as AnalysisResult) : FALLBACK);
  }, []);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
      </div>
    );
  }

  const { vendors, winner, winner_reasoning, ranking = [], disqualified = [], _retrieved_sections } = data;
  const winnerDQ = disqualified.some((d) => d.name === winner);

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rfp_analysis_report.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Rank badge colours
  const RANK_COLORS = ["bg-amber-100 text-amber-700", "bg-gray-100 text-gray-600", "bg-orange-100 text-orange-600"];

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              New Analysis
            </button>
            <div className="h-4 w-px bg-gray-200" />
            <div>
              <h1 className="text-base font-semibold text-gray-900">Evaluation Report</h1>
              <p className="text-xs text-gray-400">QCBS methodology — IRCTC AI Chatbot RFP 2025</p>
            </div>
          </div>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download Report
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">

        {/* ── 1. WINNER BANNER ── */}
        <div
          className={`rounded-xl border-2 p-6 ${winnerDQ ? "border-red-300 bg-red-50" : "border-amber-300 bg-amber-50"}`}
          style={{ animation: "fadeInUp 0.4s ease-out both" }}
        >
          {winnerDQ && (
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
              DISQUALIFIED
            </div>
          )}
          <div className="flex items-start gap-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${winnerDQ ? "bg-red-100" : "bg-amber-100"}`}>
              <svg className={`h-5 w-5 ${winnerDQ ? "text-red-600" : "text-amber-600"}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Recommended Vendor</p>
              <h2 className="mt-0.5 text-xl font-bold text-gray-900">{winner}</h2>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed max-w-2xl">{winner_reasoning}</p>
              {ranking.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {ranking.map((name, i) => (
                    <span key={name} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${RANK_COLORS[i] ?? "bg-gray-100 text-gray-600"}`}>
                      #{i + 1} {name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── 2. ELIGIBILITY GRID ── */}
        <section style={{ animation: "fadeInUp 0.4s ease-out 0.1s both" }}>
          <SectionHeader>Eligibility Check</SectionHeader>
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Criterion</th>
                    {vendors.map((v, i) => (
                      <th key={i} className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-400">
                        {v.name.split(" ")[0]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {ELIGIBILITY_ROWS.map(({ key, label }) => (
                    <tr key={key} className={`transition-colors hover:bg-gray-50 ${key === "overall_pass" ? "border-t-2 border-gray-200 font-semibold bg-gray-50" : ""}`}>
                      <td className={`px-6 py-3 text-sm ${key === "overall_pass" ? "font-bold text-gray-900" : "text-gray-700"}`}>
                        {label}
                      </td>
                      {vendors.map((v, vi) => (
                        <td key={vi} className="px-6 py-3 text-center">
                          <CheckIcon pass={v.eligibility[key]} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── 4. TECHNICAL SCORE BREAKDOWN ── */}
        <section style={{ animation: "fadeInUp 0.4s ease-out 0.15s both" }}>
          <SectionHeader>Technical Score Breakdown</SectionHeader>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {vendors.map((v, i) => {
              const breakdown = [
                { label: "Project Experience", key: "project_experience" as const, max: 20 },
                { label: "Multilingual Capability", key: "multilingual_capability" as const, max: 30 },
                { label: "Architecture & Demo", key: "architecture_demo" as const, max: 50 },
              ];
              return (
                <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">{v.name}</p>
                    <span className="font-mono text-sm font-bold" style={{ color: scoreColor(v.technical_score_raw) }}>
                      {v.technical_score_raw}/100
                    </span>
                  </div>
                  <div className="space-y-4">
                    {breakdown.map(({ label, key, max }) => {
                      const item = v.technical_breakdown[key];
                      const color = scoreColor(Math.round((item.score / max) * 100));
                      return (
                        <div key={key}>
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-xs text-gray-600">{label}</span>
                            <span className="font-mono text-xs font-semibold text-gray-800">
                              {item.score}/{max}
                            </span>
                          </div>
                          <ScoreBar score={item.score} max={max} color={color} />
                          <p className="mt-1.5 text-xs leading-relaxed text-gray-400">{item.justification}</p>
                        </div>
                      );
                    })}
                  </div>
                  {v.technical_score_raw < 70 && (
                    <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
                      Below 70-mark minimum — does not qualify for financial evaluation
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── 5. COMMERCIAL SCORE BREAKDOWN ── */}
        <section style={{ animation: "fadeInUp 0.4s ease-out 0.18s both" }}>
          <SectionHeader>Commercial Score Breakdown</SectionHeader>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {vendors.map((v, i) => {
              const cb = v.commercial_breakdown;
              const commercialItems = [
                { label: "TMBC Competitiveness", key: "tmbc_competitiveness" as const, max: 40 },
                { label: "Revenue Sharing", key: "revenue_sharing" as const, max: 30 },
                { label: "Payment & Security", key: "payment_and_security" as const, max: 30 },
              ];
              const commercialTotal = cb
                ? commercialItems.reduce((sum, item) => sum + (cb[item.key]?.score ?? 0), 0)
                : null;
              return (
                <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">{v.name}</p>
                    <div className="flex flex-col items-end gap-0.5">
                      {commercialTotal !== null && (
                        <span className="font-mono text-sm font-bold" style={{ color: scoreColor(commercialTotal) }}>
                          {commercialTotal}/100
                        </span>
                      )}
                      <span className="font-mono text-xs text-gray-400">
                        F(s): {v.financial_score.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  {cb ? (
                    <div className="space-y-4">
                      {commercialItems.map(({ label, key, max }) => {
                        const item = cb[key];
                        const color = scoreColor(Math.round((item.score / max) * 100));
                        return (
                          <div key={key}>
                            <div className="mb-1 flex items-center justify-between">
                              <span className="text-xs text-gray-600">{label}</span>
                              <span className="font-mono text-xs font-semibold text-gray-800">
                                {item.score}/{max}
                              </span>
                            </div>
                            <ScoreBar score={item.score} max={max} color={color} />
                            <p className="mt-1.5 text-xs leading-relaxed text-gray-400">{item.justification}</p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">Commercial breakdown not available</p>
                  )}
                  {!v.qualifies_for_financial && (
                    <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
                      Did not qualify for financial evaluation
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── 6. MISSING DELIVERABLES ── */}
        <section style={{ animation: "fadeInUp 0.4s ease-out 0.2s both" }}>
          <SectionHeader>Missing Deliverables</SectionHeader>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {vendors.map((v, vi) => (
              <div key={vi} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
                  <p className="text-sm font-semibold text-gray-900">{v.name}</p>
                  {v.missing_deliverables.length === 0 ? (
                    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">All Clear</span>
                  ) : (
                    <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                      {v.missing_deliverables.length} Missing
                    </span>
                  )}
                </div>
                <div className="p-5">
                  {v.missing_deliverables.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      All deliverables addressed ✓
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {v.missing_deliverables.map((d, di) => (
                        <div key={di} style={{ animation: `fadeInUp 0.3s ease-out ${di * 0.06}s both` }}>
                          <div className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1">
                            <svg className="h-3 w-3 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span className="text-xs font-medium text-red-700">{d.item}</span>
                          </div>
                          <p className="mt-1 pl-1 text-xs text-gray-500">
                            RFP Requirement: {d.rfp_requirement}{" "}
                            <span className="rounded border border-gray-200 px-1 py-0.5 font-mono text-gray-400">
                              {d.rfp_page}
                            </span>
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 6. STRENGTHS & RISKS ── */}
        <section style={{ animation: "fadeInUp 0.4s ease-out 0.25s both" }}>
          <SectionHeader>Strengths &amp; Risks</SectionHeader>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {vendors.map((v, vi) => (
              <div key={vi} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
                <p className="text-sm font-semibold text-gray-900">{v.name}</p>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-green-600">Strengths</p>
                  <div className="flex flex-wrap gap-1.5">
                    {v.strengths.map((s, si) => (
                      <span key={si} className="rounded-full bg-green-100 px-2.5 py-1 text-xs text-green-800">{s}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-500">Risks</p>
                  <div className="flex flex-wrap gap-1.5">
                    {v.risks.map((r, ri) => (
                      <span key={ri} className="rounded-full bg-red-100 px-2.5 py-1 text-xs text-red-800">{r}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 7. VENDOR SUMMARIES ── */}
        <section style={{ animation: "fadeInUp 0.4s ease-out 0.3s both" }}>
          <SectionHeader>Vendor Summaries</SectionHeader>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {vendors.map((v, vi) => (
              <div key={vi} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="mb-2 text-sm font-semibold text-gray-900">{v.name}</p>
                <p className="text-sm leading-relaxed text-gray-600">{v.summary}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 8. RFP SECTIONS USED ── */}
        {_retrieved_sections && Object.keys(_retrieved_sections).length > 0 && (
          <section style={{ animation: "fadeInUp 0.4s ease-out 0.35s both" }}>
            <button
              onClick={() => setCitationsOpen((p) => !p)}
              className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 ring-1 ring-blue-200">
                  <svg className="h-3.5 w-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-900">RFP Sections Used in Evaluation</p>
                  <p className="text-xs text-gray-400">PageIndex retrieved these sections for this analysis</p>
                </div>
              </div>
              <svg className={`h-4 w-4 text-gray-400 transition-transform ${citationsOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {citationsOpen && (
              <div className="mt-3 space-y-4">
                {Object.entries(_retrieved_sections).map(([topic, sections]) => (
                  <div key={topic} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-gray-100 bg-gray-50 px-5 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{topic}</p>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {sections.map((s, si) => (
                        <div key={si} className="px-5 py-4">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-sm font-medium text-gray-800">{s.title}</p>
                            <span className="shrink-0 rounded border border-gray-200 px-1.5 py-0.5 font-mono text-xs text-gray-500">
                              {s.page_range}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 leading-relaxed">{s.summary}</p>
                          <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-blue-50 px-3 py-2">
                            <span className="shrink-0 text-xs font-bold text-blue-600">WHY:</span>
                            <span className="text-xs text-blue-700">Relevance score {s.relevance_score}/10</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <div className="h-8" />
      </main>
    </div>
  );
}
