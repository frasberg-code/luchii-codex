import React, { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import "@google/model-viewer";
import { Box, Loader2, Download, Dice5, Sparkles } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import LogoLoader from "../components/LogoLoader";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

const BACKEND = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND}/api`;
const IDEAS = ["a wooden treasure chest", "a cute cartoon robot", "a red sports car", "a potted cactus", "a medieval sword", "a cozy armchair"];

function sessionId() {
  let sid = localStorage.getItem("luchii_session");
  if (!sid) {
    sid = (crypto.randomUUID && crypto.randomUUID()) || `s-${Date.now()}`;
    localStorage.setItem("luchii_session", sid);
  }
  return sid;
}

function Viewer({ model }) {
  if (!model) {
    return (
      <div className="flex flex-col items-center gap-3 text-neutral-600" data-testid="model-empty">
        <Box className="w-10 h-10" />
        <p className="text-sm">Your 3D model will appear here</p>
      </div>
    );
  }
  if (model.status !== "completed") {
    const queued = model.status === "queued";
    return (
      <div data-testid={queued ? "model-queue-notice" : "model-building"}>
        <LogoLoader
          label={model.status === "failed" ? "This model didn't finish" : queued ? `In the queue: #${model.queue_position || 1}` : "Sculpting your 3D model..."}
          sublabel={model.status === "failed" ? model.error : "Powered by Frasberg · usually 2–4 minutes"} />
      </div>
    );
  }
  const src = `${BACKEND}${model.model_url}`;
  return (
    <>
      <model-viewer data-testid="model-viewer" src={src} alt={model.prompt} camera-controls auto-rotate
        shadow-intensity="1" exposure="1.1" style={{ width: "100%", height: "100%", background: "transparent" }} />
      <a data-testid="model-download-btn" href={src} download={`luchii-3d-${model.id.slice(0, 8)}.glb`}
        className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-full bg-[#00F0FF] text-black px-4 py-2 text-sm font-semibold hover:bg-[#00d4de]">
        <Download className="w-4 h-4" /> Download .glb
      </a>
    </>
  );
}

export default function Studio3D() {
  const { authHeader, user } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [models, setModels] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const timer = useRef(null);

  const load = useCallback(async () => {
    const { data } = await axios.get(`${API}/3d`, { headers: authHeader, params: { session_id: sessionId() } });
    setModels(data);
    return data;
  }, [authHeader]);

  useEffect(() => { load().catch(() => {}); }, [load, user]);

  useEffect(() => {
    const pending = models.some((m) => m.status === "queued" || m.status === "running");
    clearTimeout(timer.current);
    if (pending) timer.current = setTimeout(() => load().catch(() => {}), 5000);
    return () => clearTimeout(timer.current);
  }, [models, load]);

  const create = async () => {
    if (!prompt.trim()) { toast.error("Describe the object you want."); return; }
    setSubmitting(true);
    try {
      const { data } = await axios.post(`${API}/3d`, { prompt: prompt.trim(), session_id: sessionId() }, { headers: authHeader });
      setModels((m) => [data, ...m]);
      setActiveId(data.id);
      toast.success(data.queue_position > 1 ? `Queued at #${data.queue_position}` : "Building your 3D model");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not start the model. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const active = models.find((m) => m.id === activeId) || models[0];

  return (
    <div className="min-h-screen bg-[#05060A] text-white">
      <Navbar />
      <main className="max-w-[1200px] mx-auto px-5 md:px-8 pt-28 pb-24" data-testid="studio-3d-page">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-neutral-300 mb-5">
          <Box className="w-3.5 h-3.5 text-[#00F0FF]" /> Luchii 3D Studio · Powered by Frasberg
        </div>
        <h1 className="font-display font-bold tracking-tight text-4xl sm:text-5xl lg:text-6xl">
          Turn a prompt into a <span className="text-[#00F0FF]">3D model</span>
        </h1>
        <p className="mt-3 text-neutral-400 text-sm md:text-base max-w-2xl">
          Describe a single object. Luchii sculpts a coloured mesh you can spin, inspect and download as .glb for games, AR and 3D apps.
        </p>

        <div className="mt-8 flex flex-col md:flex-row gap-3">
          <Input data-testid="model-prompt-input" value={prompt} onChange={(e) => setPrompt(e.target.value)} maxLength={300}
            onKeyDown={(e) => e.key === "Enter" && create()} placeholder="a wooden treasure chest"
            className="h-12 bg-black/40 border-white/10 focus-visible:ring-[#00F0FF] text-base" />
          <Button data-testid="model-surprise-btn" variant="outline" onClick={() => setPrompt(IDEAS[Math.floor(Math.random() * IDEAS.length)])}
            className="h-12 rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10">
            <Dice5 className="w-4 h-4 mr-2" /> Surprise me
          </Button>
          <Button data-testid="model-generate-btn" onClick={create} disabled={submitting}
            className="h-12 px-8 bg-[#00F0FF] text-black hover:bg-[#00d4de] font-semibold rounded-full">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4 mr-2" /> Generate 3D</>}
          </Button>
        </div>

        <div className="mt-6 relative rounded-2xl border border-white/10 bg-[#11161A] aspect-video grid place-items-center overflow-hidden">
          <Viewer model={active} />
        </div>

        {models.length > 0 && (
          <section className="mt-8" data-testid="model-history">
            <h2 className="text-base md:text-lg font-semibold mb-3">Your models</h2>
            <div className="flex flex-wrap gap-2">
              {models.map((m) => (
                <button key={m.id} data-testid={`model-history-${m.id}`} onClick={() => setActiveId(m.id)}
                  className={`rounded-full px-4 py-2 text-sm border transition-colors ${active?.id === m.id
                    ? "border-[#00F0FF] bg-[#00F0FF]/10 text-[#00F0FF]" : "border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10"}`}>
                  {m.prompt}
                  <span className="ml-2 text-[10px] uppercase tracking-wider opacity-70">{m.status}</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
