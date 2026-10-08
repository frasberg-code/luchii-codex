import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Sparkles, ArrowLeft, Download, ImageIcon, Loader2, Wand2, Share2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { useAuth } from "../context/AuthContext";
import { brand } from "../mock";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Gallery() {
  const { user, loading, authHeader } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/"); return; }
    const load = async () => {
      try {
        const res = await axios.get(`${API}/my/generations`, { headers: authHeader, params: { limit: 60 } });
        setItems(res.data);
      } catch (e) {
        // ignore
      } finally {
        setBusy(false);
      }
    };
    load();
  }, [user, loading]); // eslint-disable-line

  return (
    <div className="min-h-screen bg-transparent">
      <header className="sticky top-0 z-40 bg-[#12171B]/85 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-[1400px] mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={brand.logo} alt="Luchii AI logo" className="w-9 h-9 rounded-full object-contain" />
            <span className="font-display text-lg font-bold">Luchii <span className="text-[#00F0FF]">AI</span></span>
          </Link>
          <Link to="/create" className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white">
            <ArrowLeft className="w-4 h-4" /> Back to create
          </Link>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-5 md:px-8 py-10">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold">My gallery</h1>
            <p className="text-sm text-neutral-500 mt-1">Everything you've created with Luchii AI.</p>
          </div>
          <Button onClick={() => navigate("/create")}
            className="bg-[#00F0FF] text-black hover:bg-[#00d4de] font-semibold rounded-full">
            <Wand2 className="w-4 h-4 mr-2" /> Create new
          </Button>
        </div>

        {busy ? (
          <div className="grid place-items-center py-32 text-neutral-500">
            <Loader2 className="w-8 h-8 animate-spin text-[#00F0FF]" />
          </div>
        ) : items.length === 0 ? (
          <div className="grid place-items-center py-32 text-center">
            <ImageIcon className="w-12 h-12 text-neutral-700 mb-4" />
            <p className="text-neutral-400">No creations yet.</p>
            <Button onClick={() => navigate("/create")}
              className="mt-4 bg-[#00F0FF] text-black hover:bg-[#00d4de] font-semibold rounded-full">
              Start creating
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((g) => (
              <div key={g.id} className="group relative rounded-xl overflow-hidden border border-white/10 bg-[#1E2327]">
                <img src={g.image_base64} alt={g.prompt} className="w-full aspect-square object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-0 inset-x-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-xs text-neutral-200 line-clamp-2">{g.prompt}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] uppercase tracking-wide text-[#00F0FF]">{g.style}</span>
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/s/${g.id}`);
                          toast.success("Share link copied!");
                        }}
                        className="text-white/80 hover:text-white" title="Copy share link">
                        <Share2 className="w-4 h-4" />
                      </button>
                      <a href={g.image_base64} download className="text-white/80 hover:text-white" title="Download">
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
