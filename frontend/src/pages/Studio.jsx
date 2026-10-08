import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Clapperboard, Music, Loader2, Download } from "lucide-react";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import LogoLoader from "../components/LogoLoader";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

const BASE = process.env.REACT_APP_BACKEND_URL;
const API = `${BASE}/api`;

const KINDS = {
  video: {
    icon: Clapperboard, badge: "Astral Engine · Video Creator · Powered by Frasberg", title: "Turn prompts into", accent: "cinematic video",
    sub: "Describe a scene, pick a look and a length. Frasberg renders keyframes from your prompt and animates them into a clip.",
    durations: [5, 10, 15], defaultDuration: 5, eta: (d) => `about ${Math.round(d * 0.6 + 1)}–${Math.round(d * 1.2 + 2)} min`,
    placeholder: "A red fox running through a snowy forest at dawn...",
    styles: [["cinematic", "Cinematic"], ["photoreal", "Photoreal"], ["anime", "Anime"], ["3d", "3D Animation"], ["noir", "Film Noir"], ["fantasy", "Fantasy"]],
  },
  music: {
    icon: Music, badge: "Frasberg Music · Audio Studio", title: "Generate", accent: "music & audio beds",
    sub: "Describe a mood, instruments or genre, then pick a style and length. Frasberg composes an original track from your prompt.",
    durations: [10, 20, 30], defaultDuration: 10, eta: (d) => `about ${Math.round(d / 8)}–${Math.round(d / 5)} min`,
    placeholder: "Haunting dark noir with soft piano and brushed drums...",
    styles: [["lofi", "Lo-fi"], ["cinematic", "Cinematic"], ["electronic", "Electronic"], ["ambient", "Ambient"], ["rock", "Rock"], ["jazz", "Jazz"], ["hiphop", "Hip Hop"], ["acoustic", "Acoustic"]],
  },
};

function Chips({ kind, name, options, value, onChange, render }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const [id, label] = Array.isArray(o) ? o : [o, render(o)];
        return (
          <button key={id} data-testid={`${kind}-${name}-${id}`} onClick={() => onChange(value === id && name === "style" ? null : id)}
            className={`px-3.5 py-1.5 rounded-full text-sm border transition-colors ${value === id
              ? "bg-[#00F0FF] text-black border-[#00F0FF] font-semibold"
              : "border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10"}`}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

function Progress({ kind, job, eta }) {
  const queued = job.status === "queued";
  return (
    <div className="py-6" data-testid={queued ? `${kind}-queue-notice` : `${kind}-rendering`}>
      <LogoLoader
        label={queued ? `In the queue: #${job.queue_position || 1}` : kind === "video" ? "Rendering your clip..." : "Composing your track..."}
        sublabel={queued ? "Another request is finishing first. Yours starts next." : `Powered by Frasberg · ${eta}`} />
    </div>
  );
}

export default function Studio({ kind }) {
  const cfg = KINDS[kind];
  const { authHeader } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(cfg.defaultDuration);
  const [style, setStyle] = useState(cfg.styles[0][0]);
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
    }, 4000);
  };

  const start = async () => {
    if (!prompt.trim()) { toast.error("Please enter a prompt."); return; }
    setBusy(true);
    setJob(null);
    try {
      const { data } = await axios.post(`${API}/${kind}`, { prompt: prompt.trim(), duration, style }, { headers: authHeader });
      setJob(data);
      poll(data.job_id);
    } catch (e) {
      setBusy(false);
      toast.error(e?.response?.data?.detail || "Request failed. Please try again.");
    }
  };

  const src = job?.url ? (job.url.startsWith("/api") ? `${BASE}${job.url}` : job.url) : null;
  const Icon = cfg.icon;
  const pending = job && (job.status === "queued" || job.status === "running");

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
            placeholder={cfg.placeholder} maxLength={500}
            className="min-h-[130px] bg-black/40 border-white/10 text-white resize-none focus-visible:ring-[#00F0FF]" />
          <div>
            <label className="text-sm font-medium text-neutral-300 mb-2 block">Style</label>
            <Chips kind={kind} name="style" options={cfg.styles} value={style} onChange={setStyle} />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-300 mb-2 block">Length</label>
            <Chips kind={kind} name="duration" options={cfg.durations} value={duration} onChange={setDuration} render={(d) => `${d}s`} />
            <p className="mt-2 text-xs text-neutral-500" data-testid={`${kind}-eta`}>Takes {cfg.eta(duration)} to render.</p>
          </div>
          <Button onClick={start} disabled={busy} data-testid={`${kind}-generate-btn`}
            className="w-full h-12 bg-[#00F0FF] text-black hover:bg-[#00d4de] font-semibold rounded-full text-base">
            {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {job?.status === "queued" ? "Queued" : "Working"}…</>
              : <><Icon className="w-4 h-4 mr-2" /> Generate {kind}</>}
          </Button>

          {pending && <Progress kind={kind} job={job} eta={cfg.eta(job.duration || duration)} />}

          {src && (
            <div className="pt-2 space-y-3" data-testid={`${kind}-result`}>
              {kind === "video"
                ? <video src={src} controls autoPlay loop className="w-full rounded-xl border border-white/10" />
                : <audio src={src} controls autoPlay className="w-full" />}
              <p className="text-xs text-neutral-500" data-testid={`${kind}-result-meta`}>
                “{job.prompt}” · {job.style || "no style"} · {job.duration}s
              </p>
              <a href={src} download={`luchii-${kind}-${job.job_id.slice(0, 8)}.${kind === "video" ? "mp4" : "wav"}`}
                data-testid={`${kind}-download-btn`}
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
