"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

// ── Types ───────────────────────────────────────────────────────────────────
interface VendorEntry {
  name: string;
  file: File | null;
}

const STEPS = [
  "Parsing vendor documents…",
  "Querying RFP index (6 topic areas)…",
  "Running QCBS evaluation…",
  "Building comparison report…",
];

const STEP_DURATIONS = [1000, 2000, 4000]; // ms to advance each step (first 3)

// ── VendorCard ──────────────────────────────────────────────────────────────
function VendorCard({
  index,
  vendor,
  onChange,
  disabled,
}: {
  index: number;
  vendor: VendorEntry;
  onChange: (v: VendorEntry) => void;
  disabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith(".docx")) {
        alert("Only .docx files are accepted.");
        return;
      }
      onChange({ ...vendor, file });
    },
    [vendor, onChange]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const hasFile = !!vendor.file;

  return (
    <div className={`rounded-xl border bg-white shadow-sm transition-all ${hasFile ? "border-gray-300" : "border-gray-200"}`}>
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">
            {index + 1}
          </span>
          <span className="text-sm font-semibold text-gray-700">Vendor {index + 1}</span>
        </div>
        {hasFile && (
          <span className="flex items-center gap-1 text-xs font-medium text-green-600">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Ready
          </span>
        )}
      </div>

      <div className="p-5 space-y-3">
        {/* Name input */}
        <input
          type="text"
          placeholder="Enter vendor name"
          value={vendor.name}
          disabled={disabled}
          onChange={(e) => onChange({ ...vendor, name: e.target.value })}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none focus:ring-0 disabled:opacity-50"
        />

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          className={`relative flex min-h-25 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition-colors ${
            disabled
              ? "cursor-not-allowed opacity-50"
              : dragging
              ? "border-gray-500 bg-gray-50"
              : hasFile
              ? "border-green-300 bg-green-50"
              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".docx"
            className="hidden"
            disabled={disabled}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />

          {hasFile ? (
            <div className="flex flex-col items-center gap-1 text-center">
              <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <p className="text-xs font-medium text-gray-800">{vendor.file!.name}</p>
              <p className="text-xs text-gray-400">{(vendor.file!.size / 1024).toFixed(1)} KB</p>
              <button
                onClick={(e) => { e.stopPropagation(); onChange({ ...vendor, file: null }); }}
                className="mt-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 text-center">
              <svg className="h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <p className="text-xs text-gray-400">
                Drop <span className="font-medium text-gray-600">.docx</span> or click to browse
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Progress overlay ─────────────────────────────────────────────────────────
function ProgressOverlay({ step }: { step: number }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm">
      <div
        className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-xl"
        style={{ animation: "fadeInUp 0.3s ease-out both" }}
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-900">
            <svg
              className="h-5 w-5 text-white"
              style={{ animation: "stepSpin 1s linear infinite" }}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Analyzing Vendors</h3>
          <p className="mt-1 text-xs text-gray-400">Powered by PageIndex retrieval</p>
        </div>

        <ol className="space-y-3">
          {STEPS.map((label, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <li key={i} className="flex items-center gap-3">
                <div
                  className={`relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    done
                      ? "bg-green-100 text-green-600"
                      : active
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {done ? (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                  {active && (
                    <span className="absolute inset-0 animate-ping rounded-full bg-gray-900 opacity-20" />
                  )}
                </div>
                <span
                  className={`text-sm leading-snug ${
                    done ? "text-gray-400 line-through" : active ? "font-medium text-gray-900" : "text-gray-400"
                  }`}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>

      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function Home() {
  const router = useRouter();
  const [vendors, setVendors] = useState<VendorEntry[]>([
    { name: "", file: null },
    { name: "", file: null },
    { name: "", file: null },
  ]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const allFilesReady = vendors.every((v) => v.file !== null);

  const updateVendor = (i: number, v: VendorEntry) =>
    setVendors((prev) => prev.map((x, idx) => (idx === i ? v : x)));

  const handleAnalyze = async () => {
    if (!allFilesReady) return;
    setError(null);
    setLoading(true);
    setStep(0);

    const timers = STEP_DURATIONS.map((delay, i) =>
      setTimeout(() => setStep(i + 1), delay)
    );

    try {
      const form = new FormData();
      vendors.forEach((v, i) => {
        form.append(`vendor${i + 1}`, v.file!);
        form.append(`name${i + 1}`, v.name || `Vendor ${i + 1}`);
      });

      const res = await fetch("/api/analyze", { method: "POST", body: form });
      const data = await res.json();

      timers.forEach(clearTimeout);

      if (!res.ok || data.error) {
        const detail = data.raw ? `\n\nRaw LLM output:\n${data.raw}` : (data.details ? `\n${data.details}` : "");
        setError((data.error || "Analysis failed") + detail);
        setLoading(false);
        return;
      }

      setStep(3);
      await new Promise((r) => setTimeout(r, 600));

      sessionStorage.setItem("rfp_results", JSON.stringify(data));
      router.push("/results");
    } catch (err) {
      timers.forEach(clearTimeout);
      setError(String(err));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {loading && <ProgressOverlay step={step} />}

      {/* ── Navbar ── */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">IRCTC RFP Evaluator</p>
              <p className="text-xs text-gray-400">E-Tender No. 2025/IRCTC/CO/SER/Chatbot ASKDISHA</p>
            </div>
          </div>
          <span className="hidden rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-500 sm:block">
            Powered by PageIndex Reasoning-based Retrieval
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">

        {/* ── Intro ── */}
        <div className="mb-8 text-center" style={{ animation: "fadeInUp 0.4s ease-out both" }}>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Evaluation</h1>
          <p className="mt-2 text-sm text-gray-500 max-w-lg mx-auto">
            Upload three vendor proposal documents. The system queries the pre-indexed RFP and scores each vendor using QCBS methodology.
          </p>
        </div>

        {/* ── How it works ── */}
        <div
          className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4"
          style={{ animation: "fadeInUp 0.4s ease-out 0.1s both" }}
        >
          {[
            { step: "01", label: "Parse .docx files", desc: "mammoth extracts plain text" },
            { step: "02", label: "Query RFP index", desc: "PageIndex tree search (6 topics)" },
            { step: "03", label: "QCBS evaluation", desc: "Claude scores via OpenRouter" },
            { step: "04", label: "Comparison report", desc: "Rankings + winner recommendation" },
          ].map((s) => (
            <div key={s.step} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="font-mono text-xs font-bold text-gray-300">{s.step}</p>
              <p className="mt-1 text-xs font-semibold text-gray-800">{s.label}</p>
              <p className="mt-0.5 text-xs text-gray-400">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* ── Vendor cards ── */}
        <div
          className="grid grid-cols-1 gap-5 md:grid-cols-3"
          style={{ animation: "fadeInUp 0.4s ease-out 0.2s both" }}
        >
          {vendors.map((v, i) => (
            <VendorCard
              key={i}
              index={i}
              vendor={v}
              disabled={loading}
              onChange={(upd) => updateVendor(i, upd)}
            />
          ))}
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span className="font-semibold">Error: </span>{error}
          </div>
        )}

        {/* ── CTA ── */}
        <div
          className="mt-8 flex flex-col items-center gap-3"
          style={{ animation: "fadeInUp 0.4s ease-out 0.3s both" }}
        >
          <button
            onClick={handleAnalyze}
            disabled={!allFilesReady || loading}
            className="flex items-center gap-2.5 rounded-xl bg-gray-900 px-8 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none"
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Analyzing…
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
                Analyze Vendors
              </>
            )}
          </button>
          {!allFilesReady && (
            <p className="text-xs text-gray-400">Upload all three .docx files to continue</p>
          )}
        </div>
      </main>
    </div>
  );
}
