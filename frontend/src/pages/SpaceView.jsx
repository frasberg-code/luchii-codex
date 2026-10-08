import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useParams } from "react-router-dom";
import { Footprints, Share2, Sparkles, Loader2 } from "lucide-react";
import { SpaceScene } from "../components/SpaceScene";
import { copySpaceLink } from "./SpaceEditor";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SpaceView() {
  const { id } = useParams();
  const [space, setSpace] = useState(null);
  const [error, setError] = useState(false);
  const [explore, setExplore] = useState(false);

  useEffect(() => {
    axios.get(`${API}/spaces/${id}`).then(({ data }) => setSpace(data)).catch(() => setError(true));
  }, [id]);

  return (
    <div className="fixed inset-0 bg-[#05060A] text-white" data-testid="space-view-page">
      {space && <SpaceScene items={space.items} ground={space.ground} explore={explore} onExploreExit={() => setExplore(false)} />}
      {!space && (
        <div className="absolute inset-0 grid place-items-center text-neutral-400" data-testid={error ? "space-view-error" : "space-view-loading"}>
          {error ? "This space doesn't exist or was removed." : <Loader2 className="w-8 h-8 animate-spin text-[#00F0FF]" />}
        </div>
      )}
      <div className="absolute top-4 left-4 right-4 flex flex-wrap items-start justify-between gap-3 pointer-events-none">
        <div className="pointer-events-auto rounded-2xl bg-black/55 backdrop-blur px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#00F0FF]">Luchii Space · Powered by Frasberg</p>
          <h1 className="text-lg md:text-xl font-semibold" data-testid="space-view-title">{space?.name || (error ? "Space not found" : "Loading…")}</h1>
          {space?.author && <p className="text-xs text-neutral-400">by {space.author}</p>}
        </div>
        <div className="pointer-events-auto flex gap-2">
          <button data-testid="space-view-explore-btn" onClick={() => setExplore(true)} disabled={!space}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#00F0FF] text-black px-4 py-2 text-sm font-semibold hover:bg-[#00d4de] disabled:opacity-40">
            <Footprints className="w-4 h-4" /> Walk around
          </button>
          <button data-testid="space-view-share-btn" onClick={() => copySpaceLink(id)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/60 backdrop-blur px-4 py-2 text-sm hover:bg-white/10">
            <Share2 className="w-4 h-4" /> Copy link
          </button>
          <Link to="/spaces" data-testid="space-view-cta" className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/60 backdrop-blur px-4 py-2 text-sm hover:bg-white/10">
            <Sparkles className="w-4 h-4" /> Build your own
          </Link>
        </div>
      </div>
      <p className="absolute bottom-4 left-4 text-xs text-neutral-400 bg-black/50 backdrop-blur rounded-full px-3 py-1.5" data-testid="space-view-hint">
        {explore ? "WASD / arrows to walk · mouse to look · Shift to run · Esc to stop" : "Drag to orbit · scroll to zoom · Walk around for first person"}
      </p>
    </div>
  );
}
