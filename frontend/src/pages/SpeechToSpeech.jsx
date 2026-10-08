import React, { useRef, useState } from "react";
import axios from "axios";
import { Mic, Square, Upload, Loader2, Wand2 } from "lucide-react";
import { Button } from "../components/ui/button";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const VOICES = ["nova", "alloy", "echo", "fable", "onyx", "shimmer", "sage", "coral", "ash"];

export default function SpeechToSpeech() {
  const [blob, setBlob] = useState(null);
  const [voice, setVoice] = useState("nova");
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const rec = useRef(null);

  const toggleRecord = async () => {
    if (recording) { rec.current?.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      const chunks = [];
      r.ondataavailable = (e) => chunks.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setBlob(new Blob(chunks, { type: "audio/webm" }));
        setRecording(false);
      };
      r.start();
      rec.current = r;
      setRecording(true);
    } catch {
      toast.error("Microphone access denied");
    }
  };

  const convert = async () => {
    if (!blob) { toast.error("Record or upload your voice first."); return; }
    setBusy(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", blob, blob.name || "voice.webm");
      fd.append("voice", voice);
      const { data } = await axios.post(`${API}/sts`, fd);
      setResult(data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Conversion failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05060A] text-white">
      <Navbar />
      <main className="max-w-3xl mx-auto px-5 md:px-8 pt-28 pb-24" data-testid="sts-page">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-neutral-300 mb-5">
          <Wand2 className="w-3.5 h-3.5 text-[#00F0FF]" /> Astral Echo · Speech to Speech
        </div>
        <h1 className="font-display font-bold tracking-tight text-4xl md:text-5xl">
          Convert your voice into <span className="text-[#00F0FF]">any voice</span>
        </h1>
        <p className="mt-3 text-neutral-400 text-sm md:text-base">Record or upload speech, pick a target voice, and Luchii re-speaks it.</p>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6 space-y-5">
          <div className="flex flex-wrap gap-3">
            <Button data-testid="sts-record-btn" onClick={toggleRecord} variant="outline"
              className="rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10">
              {recording ? <><Square className="w-4 h-4 mr-2 text-rose-400" /> Stop recording</> : <><Mic className="w-4 h-4 mr-2" /> Record</>}
            </Button>
            <label data-testid="sts-upload-label" className="inline-flex items-center cursor-pointer rounded-full border border-white/15 bg-white/5 hover:bg-white/10 px-4 h-10 text-sm">
              <Upload className="w-4 h-4 mr-2" /> Upload audio
              <input data-testid="sts-upload-input" type="file" accept="audio/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && setBlob(e.target.files[0])} />
            </label>
          </div>
          {blob && <audio data-testid="sts-source-audio" controls src={URL.createObjectURL(blob)} className="w-full" />}
          <div>
            <label className="text-sm font-medium text-neutral-300 mb-2 block">Target voice</label>
            <div className="flex flex-wrap gap-2">
              {VOICES.map((v) => (
                <button key={v} data-testid={`sts-voice-${v}`} onClick={() => setVoice(v)}
                  className={`px-3.5 py-1.5 rounded-full text-sm border capitalize transition-colors ${voice === v
                    ? "bg-[#00F0FF] text-black border-[#00F0FF] font-semibold"
                    : "border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10"}`}>{v}</button>
              ))}
            </div>
          </div>
          <Button data-testid="sts-convert-btn" onClick={convert} disabled={busy}
            className="w-full h-12 bg-[#00F0FF] text-black hover:bg-[#00d4de] font-semibold rounded-full text-base">
            {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Converting…</> : <><Wand2 className="w-4 h-4 mr-2" /> Convert voice</>}
          </Button>
          {result && (
            <div className="space-y-3" data-testid="sts-result">
              <p className="text-sm text-neutral-400">“{result.text}”</p>
              <audio controls autoPlay src={`data:${result.mime};base64,${result.audio_base64}`} className="w-full" />
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
