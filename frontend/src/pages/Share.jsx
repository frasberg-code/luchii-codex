import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Download, ArrowUpRight, Loader2, ImageOff, Copy } from "lucide-react";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { brand } from "../mock";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Share() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API}/share/${id}`);
        setData(res.data);
      } catch (e) {
        setErr(true);
      } finally {
        setBusy(false);
      }
    };
    load();
  }, [id]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-transparent">
      <header className="sticky top-0 z-40 bg-[#12171B]/85 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-[1100px] mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={brand.logo} alt="Luchii AI logo" className="w-9 h-9 rounded-full object-contain" />
            <span className="font-display text-lg font-bold">Luchii <span className="text-[#00F0FF]">AI</span></span>
          </Link>
          <Button onClick={() => navigate("/create")}
            className="bg-[#00F0FF] text-black hover:bg-[#00d4de] font-semibold rounded-full group">
            Create your own
            <ArrowUpRight className="w-4 h-4 ml-0.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Button>
        </div>
      </header>

      <div className="max-w-[1100px] mx-auto px-5 md:px-8 py-10">
        {busy ? (
          <div className="grid place-items-center py-32 text-neutral-500">
            <Loader2 className="w-8 h-8 animate-spin text-[#00F0FF]" />
          </div>
        ) : err || !data ? (
          <div className="grid place-items-center py-32 text-center">
            <ImageOff className="w-12 h-12 text-neutral-700 mb-4" />
            <p className="text-neutral-400">This creation isn't available.</p>
            <Button onClick={() => navigate("/create")}
              className="mt-4 bg-[#00F0FF] text-black hover:bg-[#00d4de] font-semibold rounded-full">
              Start creating
            </Button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1.4fr_1fr] gap-8 items-start">
            <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#1E2327]">
              <img src={data.image_base64} alt={data.prompt} className="w-full object-contain max-h-[70vh]" />
            </div>
            <div className="lg:pt-4">
              <span className="inline-block text-xs uppercase tracking-widest text-[#00F0FF] font-semibold">
                {data.style || "Creation"}
              </span>
              <h1 className="font-display text-2xl md:text-3xl font-bold mt-3 leading-snug">
                “{data.prompt}”
              </h1>
              {data.author && (
                <p className="text-sm text-neutral-400 mt-3">Created by {data.author}</p>
              )}
              <div className="flex flex-wrap gap-3 mt-7">
                <a href={data.image_base64} download="luchii-ai.png">
                  <Button className="bg-[#00F0FF] text-black hover:bg-[#00d4de] font-semibold rounded-full">
                    <Download className="w-4 h-4 mr-2" /> Download
                  </Button>
                </a>
                <Button onClick={copyLink} variant="ghost"
                  className="rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white">
                  <Copy className="w-4 h-4 mr-2" /> Copy link
                </Button>
              </div>
              <div className="mt-10 rounded-2xl border border-white/10 bg-[#1E2327] p-5">
                <p className="text-sm text-neutral-300">
                  Made with <span className="font-semibold text-white">Luchii AI</span> — the creative
                  platform to direct your best work.
                </p>
                <Button onClick={() => navigate("/create")}
                  className="mt-4 w-full bg-white/10 hover:bg-white/15 text-white rounded-full font-semibold">
                  Try it free
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
