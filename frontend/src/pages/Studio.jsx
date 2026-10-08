import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Clapperboard, Music, Loader2, Download } from "lucide-react";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

const BASE = process.env.REACT_APP_BACKEND_URL;
const API = `${BASE}/api`;

const KINDS = {
  video: { icon: Clapperboard, badge: "Astral Engine · Video Creator", title: "Turn prompts into", accent: "cinematic video",
    sub: "Describe a scene and the Frasberg Astral Engine renders a short clip.", durations: [5, 10, 15], placeholder: "A slow dolly shot through a neon-lit rainy alley..." },
  music: { icon: Music, badge: "Frasberg Music · Audio Studio", title: "Generate", accent: "music & audio beds",
    sub: "Describe a mood or genre and get an original track in seconds.", durations: [15, 30, 60], placeholder: "Haunting dark noir with soft piano and brushed drums..." },
};

export default function Studio({ kind }) {
  const cfg = KINDS[kind];
  const { authHeader } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(cfg.durations[1]);
  const [job, setJob] = useState(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearInterval(timer.current), []);

  const poll = (id) => {
    clearInterval(timer.current);
    timer.current = setInterval(async () => {
      try {
        const { data } = await axios.get(`${API}/jobs/${id}`);
        setJob(data);
        if (data.status === "completed" || data.status === "failed") {
          clearInterval(timer.current);
          setBusy(false);
          if (data.status === "failed") toast.error(data.error || "Generation failed");
        }
      } catch (e) {
        clearInterval(timer.current);
        setBusy(false);
        toast.error(e?.response?.data?.detail || "Could not check job status");
      }
    }, 3000);
  };

  const start = async () => {
    if (!prompt.trim()) { toast.error("Please enter a prompt."); return; }
    setBusy(true);
    setJob(null);
    try {
      const { data } = await axios.post(`${API}/${kind}`, { prompt: prompt.trim(), duration }, { headers: authHeader });
      setJob(data);
      poll(data.job_id);
    } catch (e) {
      setBusy(false);
      toast.error(e?.response?.data?.detail || "Request failed. Please try again.");
    }
  };

  const src = job?.url ? (job.url.startsWith("/api") ? `${BASE}${job.url}` : job.url) : null;
  const Icon = cfg.icon;

  return (
    <div className="min-h-screen bg-[#05060A] text-white">
      <Navbar />
      <main className="max-w-3xl mx-auto px-5 md:px-8 pt-28 pb-24" data-testid={`${kind}-studio-page`}>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-neutral-300 mb-5">
          <Icon className="w-3.5 h-3.5 text-[#00F0FF]" /> {cfg.badge}
        </div>
        <h1 className="font-display font-bold tracking-tight text-4xl md:text-5xl">
          {cfg.title} <span className="text-[#00F0FF]">{cfg.accent}</span>
        </h1>
        <p className="mt-3 text-neutral-400 text-sm md:text-base">{cfg.sub}</p>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6 space-y-5">
          <Textarea data-testid={`${kind}-prompt-input`} value={prompt} onChange={(e) => setPrompt(e.target.value)}
            placeholder={cfg.placeholder}
            className="min-h-[130px] bg-black/40 border-white/10 text-white resize-none focus-visible:ring-[#00F0FF]" />
          <div>
            <label className="text-sm font-medium text-neutral-300 mb-2 block">Duration</label>
            <div className="flex gap-2">
              {cfg.durations.map((d) => (
                <button key={d} data-testid={`${kind}-duration-${d}`} onClick={() => setDuration(d)}
                  className={`px-3.5 py-1.5 rounded-full text-sm border transition-colors ${duration === d
                    ? "bg-[#00F0FF] text-black border-[#00F0FF] font-semibold"
                    : "border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10"}`}>
                  {d}s
                </button>
              ))}
            </div>
          </div>
          <Button onClick={start} disabled={busy} data-testid={`${kind}-generate-btn`}
            className="w-full h-12 bg-[#00F0FF] text-black hover:bg-[#00d4de] font-semibold rounded-full text-base">
            {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {job?.status || "Submitting"}…</>
              : <><Icon className="w-4 h-4 mr-2" /> Generate {kind}</>}
          </Button>

          {src && (
            <div className="pt-2 space-y-3" data-testid={`${kind}-result`}>
              {kind === "video"
                ? <video src={src} controls autoPlay className="w-full rounded-xl border border-white/10" />
                : <audio src={src} controls autoPlay className="w-full" />}
              <a href={src} download target="_blank" rel="noreferrer" data-testid={`${kind}-download-btn`}
                className="flex items-center justify-center w-full h-10 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-sm">
                <Download className="w-4 h-4 mr-2" /> Download
              </a>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
