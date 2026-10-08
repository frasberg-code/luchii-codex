import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Boxes, Plus, Eye, Pencil, Trash2, Loader2 } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import AuthModal from "../components/AuthModal";
import { Button } from "../components/ui/button";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function SpaceCard({ sp, onDelete }) {
  return (
    <div data-testid={`space-card-${sp.id}`} className="rounded-2xl border border-white/10 bg-[#11161A] p-5 flex flex-col gap-4">
      <div className="h-24 rounded-xl" style={{ background: `radial-gradient(circle at 50% 120%, ${sp.ground}, #0b1014 70%)` }} />
      <div>
        <h3 className="font-semibold">{sp.name}</h3>
        <p className="text-xs text-neutral-500 mt-1">{sp.items.length} object{sp.items.length === 1 ? "" : "s"} · updated {new Date(sp.updated_at).toLocaleDateString()}</p>
      </div>
      <div className="flex gap-2 mt-auto">
        <Link to={`/spaces/${sp.id}`} data-testid={`space-edit-${sp.id}`} className="inline-flex items-center gap-1.5 rounded-full bg-[#00F0FF] text-black px-4 py-1.5 text-sm font-semibold"><Pencil className="w-3.5 h-3.5" /> Edit</Link>
        <Link to={`/spaces/${sp.id}/view`} data-testid={`space-view-${sp.id}`} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-1.5 text-sm hover:bg-white/10"><Eye className="w-3.5 h-3.5" /> Explore</Link>
        <button data-testid={`space-delete-${sp.id}`} onClick={() => onDelete(sp)} className="ml-auto text-neutral-500 hover:text-red-400" title="Delete"><Trash2 className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

export default function Spaces() {
  const { user, authHeader, loading } = useAuth();
  const [spaces, setSpaces] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    axios.get(`${API}/spaces`, { headers: authHeader }).then(({ data }) => setSpaces(data)).catch(() => setSpaces([]));
  }, [user]); // eslint-disable-line

  const remove = async (sp) => {
    if (!window.confirm(`Delete "${sp.name}"?`)) return;
    try {
      await axios.delete(`${API}/spaces/${sp.id}`, { headers: authHeader });
      setSpaces((s) => s.filter((x) => x.id !== sp.id));
    } catch { toast.error("Couldn't delete this space."); }
  };

  return (
    <div className="min-h-screen bg-[#05060A] text-white">
      <Navbar />
      <main className="max-w-[1200px] mx-auto px-5 md:px-8 pt-28 pb-24" data-testid="spaces-page">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-neutral-300 mb-5">
          <Boxes className="w-3.5 h-3.5 text-[#00F0FF]" /> Luchii Spaces Builder · Powered by Frasberg
        </div>
        <div className="flex flex-col md:flex-row md:items-end gap-4 justify-between">
          <div>
            <h1 className="font-display font-bold tracking-tight text-4xl sm:text-5xl lg:text-6xl">Build <span className="text-[#00F0FF]">explorable</span> 3D spaces</h1>
            <p className="mt-3 text-neutral-400 text-sm md:text-base max-w-2xl">Arrange your 3D Studio objects into a scene, then walk through it in first person or share it with friends.</p>
          </div>
          {user && (
            <Link to="/spaces/new" data-testid="space-new-btn" className="inline-flex items-center gap-2 rounded-full bg-[#00F0FF] text-black px-6 h-12 font-semibold hover:bg-[#00d4de]">
              <Plus className="w-4 h-4" /> New space
            </Link>
          )}
        </div>

        <div className="mt-10">
          {loading ? null : !user ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center" data-testid="spaces-login-cta">
              <p className="text-neutral-300">Log in to build and save spaces from your 3D models.</p>
              <Button onClick={() => setAuthOpen(true)} className="mt-4 rounded-full bg-[#00F0FF] text-black hover:bg-[#00d4de] font-semibold">Log in</Button>
            </div>
          ) : spaces === null ? (
            <div className="grid place-items-center py-24"><Loader2 className="w-8 h-8 animate-spin text-[#00F0FF]" /></div>
          ) : spaces.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-neutral-400" data-testid="spaces-empty">
              No spaces yet. Make a few objects in <Link to="/3d" className="text-[#00F0FF] hover:underline">3D Studio</Link>, then start a new space.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="spaces-list">
              {spaces.map((sp) => <SpaceCard key={sp.id} sp={sp} onDelete={remove} />)}
            </div>
          )}
        </div>
      </main>
      <Footer />
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} defaultMode="login" />
    </div>
  );
}
