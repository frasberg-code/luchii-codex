import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Mic, Square, Upload, Loader2, Wand2, Download, RefreshCw, Trash2, Fingerprint } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { toast } from "sonner";

const BACKEND = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND}/api`;
const VOICES = ["nova", "alloy", "echo", "fable", "onyx", "shimmer", "sage", "coral", "ash"];
const audioSrc = (t) => (t.audio_url ? `${BACKEND}${t.audio_url}` : `data:${t.mime};base64,${t.audio_base64}`);
const voiceLabel = (v) => (v === "clone" ? "My cloned voice" : v);
const ext = (mime) => (mime?.includes("wav") ? "wav" : "mp3");

function VoicePicker({ voice, setVoice, hasClone }) {
  return (
    <div className="flex flex-wrap gap-2">
      {hasClone && (
        <button data-testid="sts-voice-clone" onClick={() => setVoice("clone")}
          className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-sm border transition-colors ${voice === "clone"
            ? "bg-[#00F0FF] text-black border-[#00F0FF] font-semibold"
            : "border-[#00F0FF]/40 bg-[#00F0FF]/10 text-[#00F0FF] hover:bg-[#00F0FF]/20"}`}>
          <Fingerprint className="w-3.5 h-3.5 mr-1.5" /> My cloned voice
        </button>
      )}
      {VOICES.map((v) => (
        <button key={v} data-testid={`sts-voice-${v}`} onClick={() => setVoice(v)}
          className={`px-3.5 py-1.5 rounded-full text-sm border capitalize transition-colors ${voice === v
            ? "bg-[#00F0FF] text-black border-[#00F0FF] font-semibold"
            : "border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10"}`}>{v}</button>
      ))}
    </div>
  );
}

function Take({ take, index, onRemove }) {
  return (
    <div data-testid={`sts-take-${index}`} className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs uppercase tracking-wider text-[#00F0FF]">{voiceLabel(take.voice)}{take.id && <span className="ml-2 text-neutral-500 normal-case tracking-normal">· saved</span>}</span>
        <div className="flex items-center gap-1">
          <a data-testid={`sts-take-download-${index}`} href={audioSrc(take)} download={`luchii-sts-${take.voice}.${ext(take.mime)}`}
            className="p-2 rounded-full hover:bg-white/10 text-neutral-300" aria-label="Download take">
            <Download className="w-4 h-4" />
          </a>
          <button data-testid={`sts-take-remove-${index}`} onClick={onRemove}
            className="p-2 rounded-full hover:bg-white/10 text-neutral-500" aria-label="Remove take">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <p className="text-sm text-neutral-400 line-clamp-2">“{take.text}”</p>
      <audio controls src={audioSrc(take)} className="w-full" />
    </div>
  );
}

export default function SpeechToSpeech() {
  const { user, authHeader } = useAuth();
  const [hasClone, setHasClone] = useState(false);
  const [blob, setBlob] = useState(null);
  const [voice, setVoice] = useState("nova");
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [respeaking, setRespeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [takes, setTakes] = useState([]);
  const rec = useRef(null);
  const sourceUrl = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);

  useEffect(() => {
    if (!user) { setHasClone(false); setTakes((p) => p.filter((t) => !t.id)); return; }
    axios.get(`${API}/voice/clone`, { headers: authHeader }).then(({ data }) => setHasClone(!!data.has_sample)).catch(() => {});
    axios.get(`${API}/voice/takes`, { headers: authHeader })
      .then(({ data }) => setTakes(data.map((t) => ({ ...t, key: t.id }))))
      .catch(() => {});
  }, [user]); // eslint-disable-line

  const addTake = async (t) => {
    let take = { ...t, key: `${Date.now()}-${Math.random()}` };
    if (user) {
      try {
        const { data } = await axios.post(`${API}/voice/takes`,
          { text: t.text, voice: t.voice, mime: t.mime, audio_base64: t.audio_base64 }, { headers: authHeader });
        take = { ...data, key: data.id };
      } catch {
        toast.error("Couldn't save this take to your gallery.");
      }
    }
    setTakes((prev) => [take, ...prev].slice(0, 50));
  };

  const removeTake = async (t) => {
    if (t.id) {
      try { await axios.delete(`${API}/voice/takes/${t.id}`, { headers: authHeader }); }
      catch { toast.error("Couldn't delete this take."); return; }
    }
    setTakes((p) => p.filter((x) => x.key !== t.key));
  };

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
    try {
      const fd = new FormData();
      fd.append("file", blob, blob.name || "voice.webm");
      fd.append("voice", voice);
      const { data } = await axios.post(`${API}/sts`, fd, { headers: authHeader });
      setTranscript(data.text);
      addTake({ ...data, voice });
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Conversion failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const respeak = async () => {
    if (!transcript.trim()) { toast.error("The transcript is empty."); return; }
    setRespeaking(true);
    try {
      const { data } = voice === "clone"
        ? await axios.post(`${API}/voice/clone/speak`, { text: transcript.trim() }, { headers: authHeader })
        : await axios.post(`${API}/tts`, { text: transcript.trim(), voice });
      addTake({ ...data, text: transcript.trim(), voice });
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not re-speak. Please try again.");
    } finally {
      setRespeaking(false);
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
        <p className="mt-3 text-neutral-400 text-sm md:text-base">
          Record or upload speech, pick a target voice, then fine-tune the words and try other voices.
        </p>

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
            {recording && <span data-testid="sts-recording-indicator" className="self-center text-xs text-rose-400 animate-pulse">Recording…</span>}
          </div>
          {sourceUrl && <audio data-testid="sts-source-audio" controls src={sourceUrl} className="w-full" />}
          <div>
            <label className="text-sm font-medium text-neutral-300 mb-2 block">Target voice</label>
            <VoicePicker voice={voice} setVoice={setVoice} hasClone={hasClone} />
            {user && !hasClone && (
              <p className="mt-2 text-xs text-neutral-500" data-testid="sts-clone-hint">
                Want it in your own voice? <Link to="/voice-clone" className="text-[#00F0FF] hover:underline">Save a voice sample</Link> first.
              </p>
            )}
          </div>
          <Button data-testid="sts-convert-btn" onClick={convert} disabled={busy}
            className="w-full h-12 bg-[#00F0FF] text-black hover:bg-[#00d4de] font-semibold rounded-full text-base">
            {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Converting…</> : <><Wand2 className="w-4 h-4 mr-2" /> Convert voice</>}
          </Button>

          {transcript && (
            <div className="space-y-3 pt-2 border-t border-white/10" data-testid="sts-result">
              <label className="text-sm font-medium text-neutral-300 block pt-3">Transcript. Edit it, pick a voice, re-speak.</label>
              <Textarea data-testid="sts-transcript-input" value={transcript} onChange={(e) => setTranscript(e.target.value)}
                className="min-h-24 resize-none bg-black/40 border-white/10 focus-visible:ring-[#00F0FF]" />
              <Button data-testid="sts-respeak-btn" onClick={respeak} disabled={respeaking} variant="outline"
                className="rounded-full border-[#00F0FF]/40 bg-[#00F0FF]/10 text-[#00F0FF] hover:bg-[#00F0FF]/20">
                {respeaking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Re-speak as <span className="capitalize ml-1">{voiceLabel(voice)}</span>
              </Button>
            </div>
          )}
        </div>

        {takes.length > 0 && (
          <section className="mt-8 space-y-3" data-testid="sts-takes">
            <div className="flex items-baseline justify-between">
              <h2 className="text-base md:text-lg font-semibold">Your takes</h2>
              <span className="text-xs text-neutral-500" data-testid="sts-takes-note">
                {user ? "Saved to your gallery" : "Log in to keep takes after a refresh"}
              </span>
            </div>
            {takes.map((t, i) => (
              <Take key={t.key} take={t} index={i} onRemove={() => removeTake(t)} />
            ))}
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
