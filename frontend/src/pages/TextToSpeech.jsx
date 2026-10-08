import React, { useState, useRef } from "react";
import axios from "axios";
import { Volume2, Download, Loader2, Sparkles } from "lucide-react";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const VOICES = [
  { id: "nova", label: "Nova", note: "Energetic" },
  { id: "alloy", label: "Alloy", note: "Balanced" },
  { id: "echo", label: "Echo", note: "Calm" },
  { id: "fable", label: "Fable", note: "Storytelling" },
  { id: "onyx", label: "Onyx", note: "Deep" },
  { id: "shimmer", label: "Shimmer", note: "Bright" },
  { id: "coral", label: "Coral", note: "Warm" },
  { id: "sage", label: "Sage", note: "Measured" },
  { id: "ash", label: "Ash", note: "Articulate" },
];

export default function TextToSpeech() {
  const [text, setText] = useState("");
  const [voice, setVoice] = useState("nova");
  const [hd, setHd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const audioRef = useRef(null);

  const generate = async () => {
    if (!text.trim()) {
      toast("Enter some text", { description: "Type what you'd like Vocalist Prime to say." });
      return;
    }
    setLoading(true);
    setAudioUrl("");
    try {
      const res = await axios.post(`${API}/tts`, { text: text.trim(), voice, hd });
      const url = `data:${res.data.mime || "audio/mp3"};base64,${res.data.audio_base64}`;
      setAudioUrl(url);
      setTimeout(() => audioRef.current?.play().catch(() => {}), 200);
      toast("Speech ready", { description: `Generated with Vocalist Prime · ${voice}` });
    } catch (e) {
      toast("Generation failed", { description: e?.response?.data?.detail || "Please try again shortly." });
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!audioUrl) return;
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = `luchii-vocalist-prime.${audioUrl.startsWith("data:audio/wav") ? "wav" : "mp3"}`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-[#05060A] text-white">
      <Navbar />
      <main className="max-w-3xl mx-auto px-5 md:px-8 pt-28 pb-24" data-testid="tts-page">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-neutral-300 mb-5">
          <Sparkles className="w-3.5 h-3.5 text-[#00F0FF]" /> Vocalist Prime · Text to Speech
        </div>
        <h1 className="font-display font-bold tracking-tight text-4xl md:text-5xl">
          Turn text into <span className="text-[#00F0FF]">natural speech</span>
        </h1>
        <p className="mt-3 text-neutral-400 text-sm md:text-base">
          Type your script, choose a voice, and let Vocalist Prime narrate it in seconds.
        </p>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6 space-y-5">
          <Textarea
            data-testid="tts-text-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={4096}
            placeholder="Enter the text you want to hear spoken aloud..."
            className="min-h-[150px] bg-black/40 border-white/10 text-white resize-none focus-visible:ring-[#00F0FF]"
          />
          <div className="text-right text-xs text-neutral-500">{text.length} / 4096</div>

          <div>
            <label className="text-sm font-medium text-neutral-300 mb-2 block">Voice</label>
            <div className="flex flex-wrap gap-2">
              {VOICES.map((v) => (
                <button
                  key={v.id}
                  data-testid={`tts-voice-${v.id}`}
                  onClick={() => setVoice(v.id)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    voice === v.id
                      ? "bg-[#00F0FF] text-black border-[#00F0FF] font-semibold"
                      : "border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10"
                  }`}
                >
                  {v.label} <span className="opacity-60 text-xs">· {v.note}</span>
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer w-fit" data-testid="tts-hd-toggle">
            <input type="checkbox" checked={hd} onChange={(e) => setHd(e.target.checked)} className="accent-[#00F0FF]" />
            HD quality (slower)
          </label>

          <Button
            onClick={generate}
            disabled={loading}
            data-testid="tts-generate-btn"
            className="w-full h-12 bg-[#00F0FF] text-black hover:bg-[#00d4de] font-semibold rounded-full text-base"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…</>
            ) : (
              <><Volume2 className="w-4 h-4 mr-2" /> Generate speech</>
            )}
          </Button>

          {audioUrl && (
            <div className="pt-2 space-y-3" data-testid="tts-result">
              <audio ref={audioRef} src={audioUrl} controls className="w-full" />
              <Button
                onClick={download}
                data-testid="tts-download-btn"
                variant="outline"
                className="w-full border-white/15 bg-white/5 hover:bg-white/10 rounded-full"
              >
                <Download className="w-4 h-4 mr-2" /> Download MP3
              </Button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
