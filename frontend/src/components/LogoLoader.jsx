import React from "react";
import { brand } from "../mock";

export default function LogoLoader({ label = "Creating with Luchii AI...", sublabel }) {
  return (
    <div className="flex flex-col items-center gap-5 select-none">
      <div className="relative w-28 h-28 grid place-items-center">
        {/* pulsing rings */}
        <span className="absolute inset-0 rounded-full border border-[#00F0FF]/40 ring-pulse" />
        <span className="absolute inset-0 rounded-full border border-[#00F0FF]/25 ring-pulse" style={{ animationDelay: "0.6s" }} />
        {/* rotating accent ring */}
        <span className="absolute inset-1 rounded-full border-2 border-transparent border-t-[#00F0FF] border-r-[#00F0FF]/50 ring-spin" />
        {/* logo */}
        <img src={brand.logo} alt="Luchii AI" className="w-20 h-20 rounded-full object-contain logo-float" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-neutral-200">{label}</p>
        {sublabel && <p className="text-xs text-neutral-500 mt-1">{sublabel}</p>}
      </div>
    </div>
  );
}
