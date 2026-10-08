import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Image as ImageIcon, ArrowUpRight } from "lucide-react";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "./ui/accordion";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { tools, showcase as fallbackShowcase, faqs } from "../mock";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function titleFromPrompt(p) {
  if (!p) return "Untitled";
  const words = p.split(/\s+/).slice(0, 3).join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function SectionHead({ eyebrow, title, sub, id }) {
  return (
    <div id={id} className="max-w-3xl mb-12 scroll-mt-24">
      {eyebrow && (
        <span className="text-xs font-semibold uppercase tracking-widest text-[#00F0FF]">
          {eyebrow}
        </span>
      )}
      <h2 className="font-display font-bold tracking-tight text-3xl md:text-5xl mt-3">
        {title}
      </h2>
      {sub && <p className="mt-4 text-neutral-400 text-lg">{sub}</p>}
    </div>
  );
}

export default function LandingSections() {
  const navigate = useNavigate();
  const [items, setItems] = useState(fallbackShowcase);

  const openTool = (t) => {
    if (t.soon) {
      toast("Coming soon", { description: `${t.title} is on the way. Stay tuned!` });
      return;
    }
    if (t.route) {
      navigate(t.route);
      return;
    }
    const params = new URLSearchParams();
    if (t.mode) params.set("mode", t.mode);
    if (t.preset) params.set("preset", t.preset);
    const qs = params.toString();
    navigate(`/create${qs ? `?${qs}` : ""}`);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API}/showcase`, { params: { limit: 8 } });
        if (Array.isArray(res.data) && res.data.length >= 4) {
          setItems(
            res.data.map((g) => ({
              title: titleFromPrompt(g.prompt),
              style: g.style || "AI Art",
              img: g.image_base64,
              prompt: g.prompt,
            }))
          );
        }
      } catch (e) { /* keep curated fallback */ }
    };
    load();
  }, []);

  return (
    <>
      {/* Featured Showcase */}
      <section className="max-w-[1400px] mx-auto px-5 md:px-8 py-20 md:py-28">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-widest text-[#00F0FF]">
              Featured
            </span>
            <h2 className="font-display font-bold tracking-tight text-3xl md:text-5xl mt-3">
              Made with Luchii
            </h2>
            <p className="mt-4 text-neutral-400 text-lg">
              A glimpse of what creators are making. Every frame generated on the platform.
            </p>
          </div>
          <Button
            onClick={() => navigate("/create")}
            className="self-start bg-[#00F0FF] text-black hover:bg-[#00d4de] font-semibold rounded-full group shrink-0"
          >
            Create yours
            <ArrowUpRight className="w-4 h-4 ml-0.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Button>
        </div>

        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 [column-fill:_balance]">
          {items.map((s, i) => (
            <button
              key={i}
              onClick={() => navigate("/create")}
              className="group relative block w-full mb-5 break-inside-avoid rounded-2xl overflow-hidden ring-1 ring-white/10 hover:ring-[#00F0FF]/60 shadow-xl shadow-black/40 hover:-translate-y-1 transition duration-300 text-left"
            >
              <img
                src={s.img}
                alt={s.title}
                loading="lazy"
                className={`w-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ${
                  i % 3 === 0 ? "h-72" : i % 3 === 1 ? "h-56" : "h-64"
                }`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent opacity-70 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-0 inset-x-0 p-4 translate-y-1 group-hover:translate-y-0 transition-transform">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] uppercase tracking-wide font-semibold text-black bg-[#00F0FF] rounded-full px-2 py-0.5">
                    {s.style}
                  </span>
                  <span className="font-display font-semibold text-sm">{s.title}</span>
                </div>
                <p className="text-xs text-neutral-300 line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {s.prompt}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Tools grid */}
      <section id="tools" className="max-w-[1400px] mx-auto px-5 md:px-8 py-20 md:py-28 scroll-mt-16">
        <SectionHead
          title="Pick a tool, start creating"
          sub="Generate, upscale, edit—your creative workflow starts here."
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {tools.map((t) => (
            <button
              key={t.title}
              onClick={() => openTool(t)}
              className={`group text-left rounded-2xl p-6 border transition-all ${
                t.featured
                  ? "bg-[#00F0FF] text-black border-[#00F0FF]"
                  : "bg-[#1E2327] border-white/10 hover:border-white/25"
              }`}
            >
              <div className="flex items-center justify-between mb-8">
                <span className={`grid place-items-center w-10 h-10 rounded-xl ${t.featured ? "bg-black/10" : "bg-white/5"}`}>
                  <ImageIcon className={`w-5 h-5 ${t.featured ? "text-black" : "text-[#00F0FF]"}`} />
                </span>
                {t.soon ? (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[#00F0FF] bg-[#00F0FF]/10 border border-[#00F0FF]/30 rounded-full px-2 py-0.5">
                    Soon
                  </span>
                ) : (
                  <ArrowUpRight className={`w-5 h-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${t.featured ? "text-black" : "text-neutral-500"}`} />
                )}
              </div>
              <h3 className="font-display font-semibold text-lg">{t.title}</h3>
              <p className={`mt-1.5 text-sm ${t.featured ? "text-black/70" : "text-neutral-400"}`}>
                {t.desc}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-5 md:px-8 py-20 md:py-28">
        <SectionHead title="Answers to your top questions" />
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border-white/10">
              <AccordionTrigger className="text-left text-base md:text-lg font-medium hover:no-underline hover:text-[#00F0FF]">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-neutral-400 text-base leading-relaxed">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </>
  );
}
