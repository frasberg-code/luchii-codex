import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import LandingSections from "../components/LandingSections";
import Footer from "../components/Footer";

export default function Home() {
  const location = useLocation();

  useEffect(() => {
    const target = location.state?.scrollTo;
    if (target) {
      // wait for sections to render, then scroll
      const t = setTimeout(() => {
        const el = document.querySelector(target);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 300);
      return () => clearTimeout(t);
    }
  }, [location.state]);

  return (
    <div className="min-h-screen bg-transparent">
      <Navbar />
      <Hero />
      <LandingSections />
      <Footer />
    </div>
  );
}
