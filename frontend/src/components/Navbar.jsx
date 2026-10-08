import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, Sparkles, ArrowUpRight, LayoutGrid, LogOut, User } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "./ui/dropdown-menu";
import { navLinks, brand } from "../mock";
import { useAuth } from "../context/AuthContext";
import AuthModal from "./AuthModal";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToHash = (hash) => {
    const el = document.querySelector(hash);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const handleNav = (href) => {
    setOpen(false);
    if (href.startsWith("#")) {
      // hash link: scroll if present, else go home then scroll
      const el = document.querySelector(href);
      if (el) {
        scrollToHash(href);
      } else {
        navigate("/", { state: { scrollTo: href } });
      }
    } else {
      navigate(href);
    }
  };

  const isActive = (href) => {
    if (href.startsWith("#")) return false;
    return location.pathname === href;
  };

  const openAuth = (mode) => { setAuthMode(mode); setAuthOpen(true); setOpen(false); };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-[#12171B]/85 backdrop-blur-xl border-b border-white/5" : "bg-transparent"
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-5 md:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <img src={brand.logo} alt="Luchii logo" className="w-9 h-9 rounded-full object-contain" />
            <span className="font-display text-lg font-bold tracking-tight">
              Luchii
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((l) => (
              <button key={l.label} onClick={() => handleNav(l.href)}
                className={`px-3.5 py-2 text-sm rounded-lg transition-colors ${
                  isActive(l.href)
                    ? "text-[#00F0FF] bg-white/5"
                    : "text-neutral-300 hover:text-white hover:bg-white/5"
                }`}>
                {l.label}
              </button>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 pl-1 pr-3 py-1 transition-colors">
                    <span className="grid place-items-center w-7 h-7 rounded-full bg-[#00F0FF] text-black text-sm font-bold">
                      {user.name?.charAt(0)?.toUpperCase() || "U"}
                    </span>
                    <span className="text-sm">{user.name?.split(" ")[0]}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#1E2327] border-white/10 text-white w-52">
                  <DropdownMenuLabel className="text-neutral-400 font-normal text-xs">{user.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem onClick={() => navigate("/gallery")} className="cursor-pointer focus:bg-white/10">
                    <LayoutGrid className="w-4 h-4 mr-2" /> My gallery
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/create")} className="cursor-pointer focus:bg-white/10">
                    <Sparkles className="w-4 h-4 mr-2" /> Create
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem onClick={logout} className="cursor-pointer focus:bg-white/10 text-red-400">
                    <LogOut className="w-4 h-4 mr-2" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <button onClick={() => openAuth("login")}
                  className="px-3.5 py-2 text-sm text-neutral-300 hover:text-white transition-colors">
                  Log in
                </button>
                <Button onClick={() => openAuth("register")}
                  className="bg-[#00F0FF] text-black hover:bg-[#00d4de] font-semibold rounded-full px-5 group">
                  Start creating
                  <ArrowUpRight className="w-4 h-4 ml-0.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </Button>
              </>
            )}
          </div>

          <button className="md:hidden p-2 text-white" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden bg-[#12171B] border-t border-white/5 px-5 py-4 space-y-1">
          {navLinks.map((l) => (
            <button key={l.label} onClick={() => handleNav(l.href)}
              className="block w-full text-left px-3 py-3 text-neutral-200 hover:text-white rounded-lg hover:bg-white/5">
              {l.label}
            </button>
          ))}
          {user ? (
            <>
              <button onClick={() => handleNav("/gallery")} className="block w-full text-left px-3 py-3 text-neutral-200 hover:bg-white/5 rounded-lg">My gallery</button>
              <button onClick={logout} className="block w-full text-left px-3 py-3 text-red-400 hover:bg-white/5 rounded-lg">Log out</button>
            </>
          ) : (
            <div className="flex flex-col gap-2 pt-2">
              <Button variant="ghost" onClick={() => openAuth("login")} className="w-full text-white hover:bg-white/5">Log in</Button>
              <Button onClick={() => openAuth("register")} className="w-full bg-[#00F0FF] text-black hover:bg-[#00d4de] font-semibold rounded-full">Start creating</Button>
            </div>
          )}
        </div>
      )}

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} defaultMode={authMode} />
    </header>
  );
}
