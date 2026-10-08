import React, { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { Mic, Square, Upload, Loader2, AudioLines, Volume2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import AuthModal from "../components/AuthModal";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const MAX_SEC = 15;

const Recorder = ({ onSample, busy }) => {
  const [recording, setRecording] = useState(false);
  const rec = useRef({ r: null, t: null, start: 0 });

  const toggle = async () => {
    if (recording) { rec.current.r?.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      const chunks = [];
      r.ondataavailable = (e) => chunks.push(e.data);
      r.onstop = () => {
        clearTimeout(rec.current.t);
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const secs = (Date.now() - rec.current.start) / 1000;
        if (secs < 5) { toast.error("Speak for at least 5 seconds"); return; }
        onSample(new File(chunks, "sample.webm", { type: "audio/webm" }));
      };
      rec.current = { r, start: Date.now(), t: setTimeout(() => r.state !== "inactive" && r.stop(), MAX_SEC * 1000) };
      r.start();
      setRecording(true);
      toast.info(`Recording — read a few sentences naturally (5–${MAX_SEC}s)`);
    } catch {
      toast.error("Microphone access denied");
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      <Button data-testid="clone-record-btn" onClick={toggle} disabled={busy} variant="outline"
        className="rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10">
        {recording ? <><Square className="w-4 h-4 mr-2 text-rose-400" /> Stop recording</> : <><Mic className="w-4 h-4 mr-2" /> Record sample</>}
      </Button>
      <label data-testid="clone-upload-label" className="inline-flex items-center cursor-pointer rounded-full border border-white/15 bg-white/5 hover:bg-white/10 px-4 h-10 text-sm">
        <Upload className="w-4 h-4 mr-2" /> Upload sample
        <input data-testid="clone-upload-input" type="file" accept="audio/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; f && onSample(f); }} />
      </label>
    </div>
  );
};

export default function VoiceClone() {
  const { user, authHeader } = useAuth();
  const [info, setInfo] = useState(null);
  const [sampleUrl, setSampleUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [text, setText] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [audio, setAudio] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);

  const load = useCallback(async () => {
    const { data } = await axios.get(`${API}/voice/clone`, { headers: authHeader });
    setInfo(data);
    if (data.has_sample) {
      const res = await axios.get(`${API}/voice/clone/sample`, { headers: authHeader, responseType: "blob" });
      setSampleUrl((old) => { old && URL.revokeObjectURL(old); return URL.createObjectURL(res.data); });
    }
  }, [authHeader]);

  useEffect(() => { if (user) load().catch(() => {}); }, [user, load]);

  const upload = async (file) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file, file.name);
      const { data } = await axios.post(`${API}/voice/clone`, fd, { headers: authHeader });
      toast.success(`Voice sample saved (${data.duration_sec ?? "?"}s) — Luchii can now speak in your voice`);
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const speakNow = async () => {
    if (!text.trim()) { toast.error("Type something to say first."); return; }
    setSpeaking(true);
    setAudio(null);
    try {
      const { data } = await axios.post(`${API}/voice/clone/speak`, { text: text.trim() }, { headers: authHeader });
      setAudio(`data:${data.mime};base64,${data.audio_base64}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Speech failed. Please try again.");
    } finally {
      setSpeaking(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05060A] text-white">
      <Navbar />
      <main className="max-w-3xl mx-auto px-5 md:px-8 pt-28 pb-24" data-testid="voice-clone-page">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-neutral-300 mb-5">
          <AudioLines className="w-3.5 h-3.5 text-[#00F0FF]" /> Luchii Voice Cloning
        </div>
        <h1 className="font-display font-bold tracking-tight text-4xl md:text-5xl">
          Let Luchii speak in <span className="text-[#00F0FF]">your voice</span>
        </h1>
        <p className="mt-3 text-neutral-400 text-sm md:text-base">Record 5–15 seconds of natural speech, then type anything and hear it in your own voice.</p>

        {!user ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center" data-testid="clone-login-required">
            <p className="text-neutral-300">Log in to create your personal voice clone.</p>
            <Button data-testid="clone-login-btn" onClick={() => setAuthOpen(true)}
              className="mt-4 rounded-full bg-[#00F0FF] text-black hover:bg-[#00d4de] font-semibold">Log in</Button>
          </div>
        ) : (
          <div className="mt-8 space-y-5">
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-semibold text-lg">1. Your voice sample</h2>
                <span data-testid="clone-sample-status" className={`text-xs rounded-full px-2.5 py-0.5 border ${info?.has_sample
                  ? "text-emerald-300 border-emerald-400/30 bg-emerald-400/10" : "text-neutral-400 border-white/10 bg-white/5"}`}>
                  {info?.has_sample ? `Saved · ${info.duration_sec ?? "?"}s` : "No sample yet"}
                </span>
              </div>
              <Recorder onSample={upload} busy={uploading} />
              {uploading && <p className="text-sm text-neutral-400 flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading sample…</p>}
              {sampleUrl && <audio data-testid="clone-sample-audio" controls src={sampleUrl} className="w-full" />}
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6 space-y-4">
              <h2 className="font-display font-semibold text-lg">2. Speak in your voice</h2>
              <Textarea data-testid="clone-text-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={4000}
                placeholder="Type what you want your voice to say…"
                className="min-h-[120px] bg-black/40 border-white/10 text-white resize-none focus-visible:ring-[#00F0FF]" />
              <Button data-testid="clone-speak-btn" onClick={speakNow} disabled={speaking || !info?.has_sample}
                className="w-full h-12 bg-[#00F0FF] text-black hover:bg-[#00d4de] font-semibold rounded-full text-base">
                {speaking ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Speaking…</> : <><Volume2 className="w-4 h-4 mr-2" /> Speak in my voice</>}
              </Button>
              {audio && <audio data-testid="clone-result-audio" controls autoPlay src={audio} className="w-full" />}
            </section>
          </div>
        )}
      </main>
      <Footer />
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} defaultMode="login" />
    </div>
  );
}
