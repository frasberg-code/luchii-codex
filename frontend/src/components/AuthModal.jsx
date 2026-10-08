import React, { useState } from "react";
import { Sparkles, Loader2, X } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { brand } from "../mock";

export default function AuthModal({ open, onOpenChange, defaultMode = "login" }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState(defaultMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  React.useEffect(() => { setMode(defaultMode); }, [defaultMode, open]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "register") {
        await register(name, email, password);
        toast.success("Welcome to Luchii AI!");
      } else {
        await login(email, password);
        toast.success("Welcome back!");
      }
      onOpenChange(false);
      setName(""); setEmail(""); setPassword("");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1E2327] border-white/10 text-white sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <img src={brand.logo} alt="Luchii AI logo" className="w-9 h-9 rounded-full object-contain" />
            <span className="font-display text-lg font-bold">Luchii <span className="text-[#00F0FF]">AI</span></span>
          </div>
          <DialogTitle className="font-display text-2xl">
            {mode === "register" ? "Create your account" : "Welcome back"}
          </DialogTitle>
          <DialogDescription className="sr-only">Log in or create your Luchii AI account</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 mt-2">
          {mode === "register" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)}
                required placeholder="Jane Creator"
                className="bg-black/40 border-white/10 focus-visible:ring-[#00F0FF]" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              required placeholder="you@example.com"
              className="bg-black/40 border-white/10 focus-visible:ring-[#00F0FF]" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              required minLength={6} placeholder="••••••"
              className="bg-black/40 border-white/10 focus-visible:ring-[#00F0FF]" />
          </div>
          <Button type="submit" disabled={busy}
            className="w-full h-11 bg-[#00F0FF] text-black hover:bg-[#00d4de] font-semibold rounded-full">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : (mode === "register" ? "Create account" : "Log in")}
          </Button>
        </form>

        <p className="text-sm text-neutral-400 text-center mt-2">
          {mode === "register" ? "Already have an account?" : "New to Luchii AI?"}{" "}
          <button
            onClick={() => setMode(mode === "register" ? "login" : "register")}
            className="text-[#00F0FF] hover:underline font-medium"
          >
            {mode === "register" ? "Log in" : "Create one"}
          </button>
        </p>
      </DialogContent>
    </Dialog>
  );
}
