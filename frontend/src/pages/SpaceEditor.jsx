import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Share2, Footprints, Move3d, RotateCw, Copy, Trash2, Plus, Loader2 } from "lucide-react";
import { SpaceScene } from "../components/SpaceScene";
import { Input } from "../components/ui/input";
import { Slider } from "../components/ui/slider";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const GROUNDS = ["#1b2a30", "#2f3b2a", "#3b3226", "#25223a", "#d9d4c7", "#0f1418"];
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

export const copySpaceLink = async (id) => {
  const url = `${window.location.origin}/spaces/${id}/view`;
  try { await navigator.clipboard.writeText(url); toast.success("Space link copied"); } catch { toast(url); }
};

function Library({ models, onAdd }) {
  const done = models.filter((m) => m.status === "completed");
  return (
    <div className="space-y-2" data-testid="space-library">
      <h3 className="text-xs uppercase tracking-wider text-neutral-500">Your 3D objects</h3>
      {done.length === 0 && <p className="text-sm text-neutral-500">No finished models yet. <Link to="/3d" className="text-[#00F0FF] hover:underline">Make one</Link>.</p>}
      <div className="max-h-[38vh] overflow-y-auto space-y-1.5 pr-1">
        {done.map((m) => (
          <button key={m.id} data-testid={`space-add-${m.id}`} onClick={() => onAdd(m)}
            className="w-full flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-sm hover:border-[#00F0FF]/50">
            {m.thumbnail ? <img src={m.thumbnail} alt="" className="w-6 h-6 rounded object-cover" /> : <Plus className="w-4 h-4 text-[#00F0FF]" />}
            <span className="line-clamp-1 flex-1">{m.prompt}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Inspector({ item, name, mode, setMode, onChange, onDuplicate, onDelete }) {
  if (!item) return <p className="text-sm text-neutral-500" data-testid="space-inspector-empty">Click an object in the scene to move, rotate or scale it.</p>;
  const deg = Math.round((item.rotation[1] * 180) / Math.PI);
  return (
    <div className="space-y-4" data-testid="space-inspector">
      <p className="text-sm font-medium line-clamp-1">{name}</p>
      <div className="flex gap-2">
        {[["translate", "Move", Move3d], ["rotate", "Rotate", RotateCw]].map(([id, label, Icon]) => (
          <button key={id} data-testid={`space-mode-${id}`} onClick={() => setMode(id)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs border ${mode === id ? "bg-[#00F0FF] text-black border-[#00F0FF] font-semibold" : "border-white/10 bg-white/5"}`}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>
      <label className="block text-xs text-neutral-400">Scale · {item.scale.toFixed(2)}x
        <Slider data-testid="space-scale-slider" className="mt-2" min={0.2} max={6} step={0.05} value={[item.scale]}
          onValueChange={([v]) => onChange({ scale: v })} />
      </label>
      <label className="block text-xs text-neutral-400">Turn · {deg}°
        <Slider data-testid="space-rotate-slider" className="mt-2" min={-180} max={180} step={5} value={[deg]}
          onValueChange={([v]) => onChange({ rotation: [item.rotation[0], (v * Math.PI) / 180, item.rotation[2]] })} />
      </label>
      <div className="flex gap-2">
        <button data-testid="space-duplicate-btn" onClick={onDuplicate} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs hover:bg-white/10"><Copy className="w-3.5 h-3.5" /> Duplicate</button>
        <button data-testid="space-remove-btn" onClick={onDelete} className="inline-flex items-center gap-1.5 rounded-full border border-red-400/30 text-red-300 px-3 py-1.5 text-xs hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5" /> Remove</button>
      </div>
    </div>
  );
}

export default function SpaceEditor() {
  const { id } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const { user, authHeader, loading } = useAuth();
  const [name, setName] = useState("My space");
  const [ground, setGround] = useState(GROUNDS[0]);
  const [items, setItems] = useState([]);
  const [models, setModels] = useState([]);
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState("translate");
  const [explore, setExplore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(isNew);

  useEffect(() => {
    if (!loading && !user) navigate(`/login?next=/spaces/${id}`, { replace: true });
  }, [loading, user]); // eslint-disable-line

  useEffect(() => {
    if (!user) return;
    axios.get(`${API}/3d`, { headers: authHeader, params: { limit: 60 } }).then(({ data }) => setModels(data)).catch(() => {});
    if (!isNew) {
      axios.get(`${API}/spaces/${id}`).then(({ data }) => {
        setName(data.name); setGround(data.ground); setItems(data.items); setReady(true);
      }).catch(() => { toast.error("Space not found"); navigate("/spaces"); });
    }
  }, [user, id]); // eslint-disable-line

  const names = useMemo(() => Object.fromEntries(models.map((m) => [m.id, m.prompt])), [models]);
  const sel = items.find((i) => i.uid === selected);
  const patch = (u, p) => setItems((list) => list.map((i) => (i.uid === u ? { ...i, ...p } : i)));

  const add = (m) => {
    const a = Math.random() * Math.PI * 2, r = items.length ? 1.5 + Math.random() * 3 : 0;
    const it = { uid: uid(), model_id: m.id, position: [+(Math.cos(a) * r).toFixed(2), 0, +(Math.sin(a) * r).toFixed(2)], rotation: [0, 0, 0], scale: 1 };
    setItems((l) => [...l, it]);
    setSelected(it.uid);
  };
  const duplicate = () => {
    const it = { ...sel, uid: uid(), position: [sel.position[0] + 1.2, sel.position[1], sel.position[2] + 0.6] };
    setItems((l) => [...l, it]);
    setSelected(it.uid);
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = { name: name.trim() || "My space", ground, items };
      const { data } = isNew
        ? await axios.post(`${API}/spaces`, body, { headers: authHeader })
        : await axios.put(`${API}/spaces/${id}`, body, { headers: authHeader });
      toast.success("Space saved");
      if (isNew) navigate(`/spaces/${data.id}`, { replace: true });
      return data.id;
    } catch (e) {
      toast.error(e?.response?.data?.detail?.toString() || "Couldn't save this space.");
      return null;
    } finally { setSaving(false); }
  };

  const share = async () => { const sid = await save(); if (sid) copySpaceLink(sid); };

  return (
    <div className="fixed inset-0 bg-[#05060A] text-white flex flex-col md:flex-row" data-testid="space-editor-page">
      <aside className="md:w-80 shrink-0 border-b md:border-b-0 md:border-r border-white/10 bg-[#0b1014]/95 p-4 space-y-5 overflow-y-auto max-h-[45vh] md:max-h-none">
        <Link to="/spaces" className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white" data-testid="space-back-link"><ArrowLeft className="w-4 h-4" /> All spaces</Link>
        <Input data-testid="space-name-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80}
          className="bg-black/40 border-white/10 focus-visible:ring-[#00F0FF]" />
        <div>
          <h3 className="text-xs uppercase tracking-wider text-neutral-500 mb-2">Ground</h3>
          <div className="flex gap-2">
            {GROUNDS.map((g) => (
              <button key={g} data-testid={`space-ground-${g.slice(1)}`} onClick={() => setGround(g)} style={{ background: g }}
                className={`w-7 h-7 rounded-full border-2 ${ground === g ? "border-[#00F0FF]" : "border-white/10"}`} />
            ))}
          </div>
        </div>
        <Library models={models} onAdd={add} />
        <div className="border-t border-white/10 pt-4">
          <Inspector item={sel} name={sel && names[sel.model_id]} mode={mode} setMode={setMode}
            onChange={(p) => patch(selected, p)} onDuplicate={duplicate}
            onDelete={() => { setItems((l) => l.filter((i) => i.uid !== selected)); setSelected(null); }} />
        </div>
      </aside>
      <section className="relative flex-1 min-h-[55vh]">
        {ready ? (
          <SpaceScene items={items} ground={ground} editable selected={selected} mode={mode} explore={explore}
            onSelect={setSelected} onTransform={(u, t) => patch(u, t)} onExploreExit={() => setExplore(false)} />
        ) : <div className="absolute inset-0 grid place-items-center"><Loader2 className="w-8 h-8 animate-spin text-[#00F0FF]" /></div>}
        <div className="absolute top-4 right-4 flex gap-2">
          <button data-testid="space-explore-btn" onClick={() => { setSelected(null); setExplore(true); }} disabled={!items.length}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/60 backdrop-blur px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-40">
            <Footprints className="w-4 h-4" /> Walk around
          </button>
          <button data-testid="space-share-btn" onClick={share} disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/60 backdrop-blur px-4 py-2 text-sm hover:bg-white/10">
            <Share2 className="w-4 h-4" /> Share
          </button>
          <button data-testid="space-save-btn" onClick={save} disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#00F0FF] text-black px-5 py-2 text-sm font-semibold hover:bg-[#00d4de]">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
          </button>
        </div>
        <p className="absolute bottom-4 left-4 text-xs text-neutral-400 bg-black/50 backdrop-blur rounded-full px-3 py-1.5" data-testid="space-hint">
          {explore ? "WASD / arrows to walk · mouse to look · Shift to run · Esc to stop" : "Drag to orbit · scroll to zoom · click an object to edit it"}
        </p>
      </section>
    </div>
  );
}
