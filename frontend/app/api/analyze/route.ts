import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import rfpIndex from "@/lib/rfp-index.json";
import { retrieveAllRelevantSections } from "@/lib/pageindex-retriever";
import { buildEvaluationPrompt } from "@/lib/prompts";
import type { RFPIndex } from "@/lib/pageindex-retriever";

export const maxDuration = 60;

const MAX_VENDOR_CHARS = 8_000;

async function parseDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value.trim();
  if (text.length <= MAX_VENDOR_CHARS) return text;
  const half = Math.floor(MAX_VENDOR_CHARS / 2);
  return text.slice(0, half) + "\n\n[... document truncated for length ...]\n\n" + text.slice(-half);
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const formData = await req.formData();

    const files = [
      formData.get("vendor1") as File | null,
      formData.get("vendor2") as File | null,
      formData.get("vendor3") as File | null,
    ];
    const names = [
      (formData.get("name1") as string) || "Vendor 1",
      (formData.get("name2") as string) || "Vendor 2",
      (formData.get("name3") as string) || "Vendor 3",
    ];

    if (files.some((f) => !f)) {
      return NextResponse.json(
        { error: "All three vendor files are required" },
        { status: 400 }
      );
    }

    // Step 1 — parse .docx files in parallel
    const texts = await Promise.all(files.map((f) => parseDocx(f!)));
    const vendors = names.map((name, i) => ({ name, text: texts[i] }));

    // Step 2 — RFP retrieval (local keyword scoring, instant)
    const typedIndex = rfpIndex as RFPIndex;
    const retrievedSections = retrieveAllRelevantSections(typedIndex);

    // Step 3 — build evaluation prompt
    const { system, user } = buildEvaluationPrompt(vendors, retrievedSections);

    // Step 4 — call Claude Haiku via OpenRouter (fast)
    const llmResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://rfp-analyzer.vercel.app",
        "X-Title": "IRCTC RFP Vendor Analyzer",
      },
      body: JSON.stringify({
        model: "anthropic/claude-haiku-4-5",
        max_tokens: 8000,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!llmResponse.ok) {
      const errText = await llmResponse.text();
      return NextResponse.json(
        { error: "LLM call failed", details: errText },
        { status: 500 }
      );
    }

    const llmData = await llmResponse.json();
    const rawContent: string = llmData.choices?.[0]?.message?.content ?? "";
    const stopReason: string = llmData.choices?.[0]?.finish_reason ?? "";

    console.log("LLM stop_reason:", stopReason);
    console.log("LLM response length:", rawContent.length);

    if (stopReason === "length") {
      return NextResponse.json(
        { error: "Analysis failed — LLM response was truncated. Try shorter vendor documents.", details: rawContent.slice(-300) },
        { status: 500 }
      );
    }

    // Strip markdown fences, extract outermost JSON object
    const stripped = rawContent.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
    const start = stripped.indexOf("{");
    const end = stripped.lastIndexOf("}");
    if (start === -1 || end === -1) {
      return NextResponse.json(
        { error: "Analysis failed — no JSON in LLM response", details: rawContent.slice(0, 600) },
        { status: 500 }
      );
    }

    let analysisResult: unknown;
    try {
      analysisResult = JSON.parse(stripped.slice(start, end + 1));
    } catch (parseErr) {
      return NextResponse.json(
        { error: "Analysis failed — JSON parse error", details: String(parseErr), raw: rawContent.slice(0, 800) },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...(analysisResult as object),
      _retrieved_sections: retrievedSections,
    });
  } catch (err) {
    console.error("Analyze route error:", err);
    return NextResponse.json(
      { error: "Unexpected server error", details: String(err) },
      { status: 500 }
    );
  }
}
