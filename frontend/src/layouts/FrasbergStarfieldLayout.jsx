import React from "react";
import "../styles/starfield.css";
import InteractiveStarfield from "../components/InteractiveStarfield";

/**
 * FrasbergStarfieldLayout
 * Global layout that guarantees the starfield background behind every page.
 * The CSS layer provides the deep-space gradient/nebula glow; the canvas
 * adds interactive, mouse-reactive stars (parallax + drag).
 */
export default function FrasbergStarfieldLayout({ children }) {
  return (
    <>
      <div className="starfield" aria-hidden="true">
        <div className="starfield-glow" />
      </div>
      <InteractiveStarfield />
      <div className="relative z-0 min-h-screen">{children}</div>
    </>
  );
}
