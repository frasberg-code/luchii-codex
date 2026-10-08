import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Activity, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "../components/ui/button";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TONE = {
  online: { dot: "bg-emerald-400", text: "text-emerald-300", label: "Online" },
  degraded: { dot: "bg-amber-400", text: "text-amber-300", label: "Degraded" },
  offline: { dot: "bg-rose-500", text: "text-rose-300", label: "Offline" },
};

const EngineCard = ({ e }) => {
  const t = TONE[e.status] || TONE.offline;
  return (
    <div data-testid={`engine-card-${e.id}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-display font-semibold text-lg">{e.name}</div>
          <div className="text-xs text-neutral-500">{e.powers}</div>
        </div>
        <span data-testid={`engine-status-${e.id}`} className={`inline-flex items-center gap-2 text-sm font-medium ${t.text}`}>
          <span className={`w-2.5 h-2.5 rounded-full ${t.dot} ${e.status === "online" ? "animate-pulse" : ""}`} />
          {t.label}
        </span>
      </div>
      <div data-testid={`engine-detail-${e.id}`} className="text-sm text-neutral-300 break-words">{e.detail}</div>
      <div className="text-xs text-neutral-500">{(e.latency_ms / 1000).toFixed(1)}s response</div>
    </div>
  );
};

export default function EngineStatus() {
  const { user, authHeader } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/engines/status`, { params: { refresh }, headers: authHeader });
      setData(data);
      setDenied(false);
    } catch {
      setDenied(true);
    } finally {
      setLoading(false);
    }
  }, [authHeader]);

  useEffect(() => { if (user) load(); else { setDenied(true); setLoading(false); } }, [user, load]);

  if (denied) {
    return (
      <div className="min-h-screen bg-[#05060A] text-white">
        <Navbar />
        <main className="max-w-xl mx-auto px-5 pt-40 pb-24 text-center" data-testid="engine-status-denied">
          <h1 className="font-display font-bold text-3xl">Admins only</h1>
          <p className="mt-3 text-neutral-400">Log in with an admin account to view engine status.</p>
        </main>
        <Footer />
      </div>
    );
  }

  const online = data?.engines.filter((e) => e.status === "online").length ?? 0;

  return (
    <div className="min-h-screen bg-[#05060A] text-white">
      <Navbar />
      <main className="max-w-5xl mx-auto px-5 md:px-8 pt-28 pb-24" data-testid="engine-status-page">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-neutral-300 mb-5">
          <Activity className="w-3.5 h-3.5 text-[#00F0FF]" /> Live engine status
        </div>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="font-display font-bold tracking-tight text-4xl md:text-5xl">
              Luchii AI <span className="text-[#00F0FF]">engines</span>
            </h1>
            <p data-testid="engine-summary" className="mt-3 text-neutral-400 text-sm md:text-base">
              {data ? `${online} of ${data.engines.length} engines online · checked ${new Date(data.checked_at).toLocaleTimeString()}` : "Running live checks on every engine…"}
            </p>
          </div>
          <Button data-testid="engine-refresh-btn" onClick={() => load(true)} disabled={loading}
            className="rounded-full bg-[#00F0FF] text-black hover:bg-[#00d4de] font-semibold">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            {loading ? "Checking…" : "Re-check now"}
          </Button>
        </div>
        <div className="mt-10 grid sm:grid-cols-2 gap-4">
          {data?.engines.map((e) => <EngineCard key={e.id} e={e} />)}
        </div>
      </main>
      <Footer />
    </div>
  );
}
