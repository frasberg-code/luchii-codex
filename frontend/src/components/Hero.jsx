import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Button } from "./ui/button";

export default function Hero() {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden pt-32 pb-20 md:pt-44 md:pb-28">
      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0 grain opacity-40" />
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-[#00F0FF]/10 blur-[160px]" />

      <div className="relative max-w-[1400px] mx-auto px-5 md:px-8 text-center">
        <h1 className="font-display font-bold tracking-tight text-5xl md:text-8xl" data-testid="hero-heading">
          Luchii <span className="text-[#00F0FF]">AI</span>
        </h1>

        <div className="mt-8 flex items-center justify-center">
          <Button
            onClick={() => navigate("/create")}
            data-testid="hero-start-creating-btn"
            className="h-12 px-8 bg-[#00F0FF] text-black hover:bg-[#00d4de] font-semibold rounded-full text-base group"
          >
            Start creating
            <ArrowUpRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Button>
        </div>
      </div>
    </section>
  );
}
