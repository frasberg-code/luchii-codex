import React from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { footerCols, brand } from "../mock";

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#171C20]">
      <div className="max-w-[1400px] mx-auto px-5 md:px-8 py-16">
        <div className="grid md:grid-cols-5 gap-10">
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2">
              <img src={brand.logo} alt="Luchii AI logo" className="w-9 h-9 rounded-full object-contain" />
              <span className="font-display text-lg font-bold">
                Luchii <span className="text-[#00F0FF]">AI</span>
              </span>
            </Link>
            <p className="mt-4 text-sm text-neutral-500 max-w-xs">
              The creative platform to direct your best work.
            </p>
          </div>
          {footerCols.map((col) => (
            <div key={col.title}>
              <h4 className="font-semibold text-sm mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-neutral-500 hover:text-white transition-colors">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-neutral-600">
            © {new Date().getFullYear()} Luchii AI. All rights reserved.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-600">
            <Link to="/legal/privacy" data-testid="footer-privacy-link" className="hover:text-white transition-colors">Privacy</Link>
            <Link to="/legal/terms" data-testid="footer-terms-link" className="hover:text-white transition-colors">Terms</Link>
            <Link to="/legal/cookies" data-testid="footer-cookies-link" className="hover:text-white transition-colors">Cookies</Link>
            <Link to="/legal/identity-separation" data-testid="footer-identity-link" className="hover:text-white transition-colors">Identity Separation</Link>
            <Link to="/legal/creator-codex" data-testid="footer-codex-link" className="hover:text-white transition-colors">Creator Codex</Link>
            <Link to="/legal/safety-matrix" data-testid="footer-safety-link" className="hover:text-white transition-colors">Safety</Link>
            <Link to="/legal/model-disclosure" data-testid="footer-model-disclosure-link" className="hover:text-white transition-colors">Model Disclosure</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
