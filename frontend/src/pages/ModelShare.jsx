import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useParams } from "react-router-dom";
import "@google/model-viewer";
import { Box, Download, Share2, Sparkles, Loader2 } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { copyShare } from "./Studio3D";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function ModelShare() {
  const { id } = useParams();
  const [model, setModel] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get(`${BACKEND}/api/3d/${id}`).then(({ data }) => setModel(data))
      .catch(() => setError("This 3D model doesn't exist or was removed."));
  }, [id]);

  const ready = model?.status === "completed";
  const src = ready ? `${BACKEND}${model.model_url}` : null;

  return (
    <div className="min-h-screen bg-[#05060A] text-white">
      <Navbar />
      <main className="max-w-[1100px] mx-auto px-5 md:px-8 pt-28 pb-24" data-testid="model-share-page">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-neutral-300 mb-5">
          <Box className="w-3.5 h-3.5 text-[#00F0FF]" /> Made with Luchii 3D Studio · Powered by Frasberg
        </div>
        <h1 className="font-display font-bold tracking-tight text-4xl sm:text-5xl lg:text-6xl" data-testid="model-share-title">
          {error ? "Model not found" : model ? model.prompt : "Loading…"}
        </h1>
        <p className="mt-3 text-neutral-400 text-sm md:text-base">Drag to spin, scroll or pinch to zoom.</p>

        <div className="mt-8 relative rounded-2xl border border-white/10 bg-[#11161A] aspect-video grid place-items-center overflow-hidden">
          {error ? <p className="text-neutral-500" data-testid="model-share-error">{error}</p>
            : !model ? <Loader2 className="w-8 h-8 animate-spin text-[#00F0FF]" />
            : !ready ? <p className="text-neutral-400" data-testid="model-share-pending">This model is still being sculpted. Check back in a few minutes.</p>
            : <model-viewer data-testid="model-share-viewer" src={src} alt={model.prompt} camera-controls auto-rotate ar
                shadow-intensity="1" exposure="1.1" style={{ width: "100%", height: "100%", background: "transparent" }} />}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {ready && (
            <>
              <button data-testid="model-share-copy-btn" onClick={() => copyShare(model.id)}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm hover:bg-white/10">
                <Share2 className="w-4 h-4" /> Copy link
              </button>
              <a data-testid="model-share-download-btn" href={src} download={`luchii-3d-${model.id.slice(0, 8)}.glb`}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm hover:bg-white/10">
                <Download className="w-4 h-4" /> Download .glb
              </a>
            </>
          )}
          <Link to="/3d" data-testid="model-share-cta"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#00F0FF] text-black px-5 py-2.5 text-sm font-semibold hover:bg-[#00d4de]">
            <Sparkles className="w-4 h-4" /> Make your own 3D model
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
