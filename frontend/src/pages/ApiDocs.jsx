import React from "react";
import { Terminal, Sparkles } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const ENDPOINTS = [
  { method: "POST", path: "/v1/image/generate", model: "Nova-Muse", status: "Live", desc: "Generate images from a text prompt." },
  { method: "POST", path: "/v1/image/edit", model: "Painter-X", status: "Live", desc: "Remix and restyle a reference image." },
  { method: "POST", path: "/v1/image/upscale", model: "Luchii Prime", status: "Live", desc: "Upscale and enhance to crisp 4K detail." },
  { method: "POST", path: "/v1/audio/tts", model: "Vocalist Prime", status: "Live", desc: "Convert text into natural speech." },
  { method: "POST", path: "/v1/audio/sts", model: "Astral Echo", status: "Live", desc: "Speech-to-speech voice conversion." },
  { method: "POST", path: "/v1/video/generate", model: "Astral Engine", status: "Live", desc: "Generate cinematic video from a prompt." },
  { method: "POST", path: "/v1/spaces/generate", model: "Realmweaver", status: "Live", desc: "Build interactive 3D spaces." },
  { method: "POST", path: "/v1/3d/generate", model: "Sculptor Core", status: "Live", desc: "Generate 3D objects and assets." },
];

const StatusPill = ({ s }) => (
  <span
    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
      s === "Live" ? "bg-[#00F0FF]/15 text-[#00F0FF]" : "bg-white/10 text-neutral-400"
    }`}
  >
    {s}
  </span>
);

export default function ApiDocs() {
  return (
    <div className="min-h-screen bg-[#05060A] text-white">
      <Navbar />
      <main className="max-w-4xl mx-auto px-5 md:px-8 pt-28 pb-24" data-testid="api-docs-page">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-neutral-300 mb-5">
          <Terminal className="w-3.5 h-3.5 text-[#00F0FF]" /> Luchii AI Developer API
        </div>
        <h1 className="font-display font-bold tracking-tight text-4xl md:text-5xl">
          The <span className="text-[#00F0FF]">Luchii AI API</span>
        </h1>
        <p className="mt-3 text-neutral-400 text-sm md:text-base max-w-2xl">
          One unified API for every modality, powered by the Frasberg and Luchii model families. Authenticate with a bearer token and call any endpoint below.
        </p>

        <div className="mt-8 rounded-xl border border-white/10 bg-black/50 p-4 font-mono text-sm text-neutral-300 overflow-x-auto">
          <div className="text-neutral-500"># Example request</div>
          <div className="mt-2">
            <span className="text-[#00F0FF]">curl</span> -X POST https://api.frasberg.com/v1/audio/tts \<br />
            &nbsp;&nbsp;-H <span className="text-emerald-400">"Authorization: Bearer $LUCHII_API_KEY"</span> \<br />
            &nbsp;&nbsp;-d <span className="text-emerald-400">{'\'{"text":"Hello from Luchii AI","voice":"nova"}\''}</span>
          </div>
        </div>

        <div className="mt-10 space-y-3">
          {ENDPOINTS.map((e) => (
            <div
              key={e.path}
              data-testid={`api-endpoint-${e.path.replace(/\//g, "-")}`}
              className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 hover:bg-white/[0.05] transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-black bg-[#00F0FF] rounded px-2 py-0.5">{e.method}</span>
                <code className="text-sm text-white">{e.path}</code>
              </div>
              <div className="flex-1 text-sm text-neutral-400">{e.desc}</div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-neutral-500 inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#00F0FF]" /> {e.model}
                </span>
                <StatusPill s={e.status} />
              </div>
            </div>
          ))}
        </div>

        <p className="mt-10 text-xs text-neutral-600">
          Luchii Models are separate Frasberg-owned AI models used internally by Luchii AI. Contact enterprise@frasberg.com for API keys, rate limits, and usage plans.
        </p>
      </main>
      <Footer />
    </div>
  );
}
