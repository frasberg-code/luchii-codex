import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Button } from "../components/ui/button";
import { modelFamilies } from "../mock";

const FILTERS = ["All", "Text to Image", "Image to Image", "Upscale", "Video", "Audio", "3D"];

export default function Models() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("All");

  const tryModel = (m) => {
    if (m.soon) {
      toast("Coming soon", { description: `${m.name} is on the way. Stay tuned!` });
      return;
    }
    navigate(m.route || `/create?mode=${m.mode || "text"}`);
  };

  const families = modelFamilies
    .map((f) => ({
      ...f,
      models: filter === "All" ? f.models : f.models.filter((m) => m.caps.includes(filter)),
    }))
    .filter((f) => f.models.length > 0);

  return (
    <div className="min-h-screen bg-transparent">
      <Navbar />

      <section className="max-w-[1400px] mx-auto px-5 md:px-8 pt-32 md:pt-40 pb-10 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs md:text-sm text-neutral-300">
          <Sparkles className="w-3.5 h-3.5 text-[#00F0FF]" /> One workflow, every model
        </span>
        <h1 className="font-display font-bold tracking-tight text-4xl md:text-6xl mt-6 max-w-4xl mx-auto">
          The models behind <span className="text-[#00F0FF]">Luchii</span>
        </h1>
        <p className="mt-5 text-neutral-400 text-lg max-w-2xl mx-auto">
          Every Luchii tool and model is powered by Frasberg — image, video,
          voice, music and 3D, all from a single interface.
        </p>
      </section>

      {/* Filter bar */}
      <div className="max-w-[1400px] mx-auto px-5 md:px-8 pb-2 sticky top-16 z-30">
        <div className="flex flex-wrap gap-2 justify-center bg-[#12171B]/70 backdrop-blur-md rounded-full py-3">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-2 text-sm font-medium border transition-colors ${
                filter === f
                  ? "bg-[#00F0FF] text-black border-[#00F0FF]"
                  : "bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {families.map((fam) => (
        <section key={fam.id} className="max-w-[1400px] mx-auto px-5 md:px-8 py-12 md:py-16">
          <div className="max-w-3xl mb-8">
            <h2 className="font-display font-bold tracking-tight text-2xl md:text-4xl">
              {fam.label}
            </h2>
            <p className="mt-3 text-neutral-400 text-base md:text-lg">{fam.blurb}</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {fam.models.map((m) => (
              <div
                key={m.name}
                className="group rounded-2xl overflow-hidden border border-white/10 bg-[#1E2327] hover:border-[#00F0FF]/40 transition-colors flex flex-col"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={m.img}
                    alt={`${m.name} sample output`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <span className="absolute top-3 left-3 text-[10px] uppercase tracking-wide font-semibold text-black bg-[#00F0FF] rounded-full px-2.5 py-0.5">
                    {m.tag}
                  </span>
                  {m.badge && (
                    <span className="absolute top-3 right-3 text-[10px] uppercase tracking-wide font-semibold text-[#00F0FF] bg-[#00F0FF]/10 border border-[#00F0FF]/30 rounded-full px-2.5 py-0.5">
                      {m.badge}
                    </span>
                  )}
                  {m.soon && (
                    <span className="absolute top-3 right-3 text-[10px] uppercase tracking-wide font-semibold text-neutral-200 bg-black/60 border border-white/15 rounded-full px-2.5 py-0.5">
                      Soon
                    </span>
                  )}
                  <span className="absolute bottom-3 left-3 text-[10px] text-neutral-300">Sample output</span>
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-display font-semibold text-lg">{m.name}</h3>
                  <p className="mt-1.5 text-sm text-neutral-400 flex-1">{m.desc}</p>
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {m.caps.map((c) => (
                      <span
                        key={c}
                        className="inline-flex items-center gap-1 text-[11px] text-neutral-300 bg-white/5 border border-white/10 rounded-full px-2.5 py-1"
                      >
                        <Check className="w-3 h-3 text-[#00F0FF]" /> {c}
                      </span>
                    ))}
                  </div>
                  <Button
                    onClick={() => tryModel(m)}
                    className={`mt-5 rounded-full font-semibold group/btn ${
                      m.soon
                        ? "bg-white/10 text-white hover:bg-white/15"
                        : "bg-[#00F0FF] text-black hover:bg-[#00d4de]"
                    }`}
                  >
                    {m.soon ? "Coming soon" : "Try this model"}
                    {!m.soon && (
                      <ArrowUpRight className="w-4 h-4 ml-0.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="max-w-[1400px] mx-auto px-5 md:px-8 py-16 md:py-24 text-center">
        <h2 className="font-display font-bold tracking-tight text-3xl md:text-5xl">
          Pick a model. <span className="text-[#00F0FF]">Start creating.</span>
        </h2>
        <Button
          onClick={() => navigate("/create")}
          className="mt-8 h-12 px-8 bg-[#00F0FF] text-black hover:bg-[#00d4de] font-semibold rounded-full text-base group"
        >
          Open the studio
          <ArrowUpRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </Button>
      </section>

      <Footer />
    </div>
  );
}
