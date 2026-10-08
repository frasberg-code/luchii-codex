import React, { useRef, useEffect } from "react";

/**
 * InteractiveStarfield
 * Canvas starfield that reacts to the mouse: parallax on move, and on
 * click-drag it pulls nearby stars toward the cursor and draws constellation
 * lines. Listens on window so it works even though the canvas sits behind
 * page content (pointer-events: none).
 */
export default function InteractiveStarfield() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    let stars = [];
    let raf;

    const mouse = { x: 0, y: 0, px: 0, py: 0, active: false, dragging: false };

    const COLORS = ["#F8F9FA", "#00F0FF", "#6C4AFF", "#007AFF"];

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(180, Math.floor((w * h) / 11000));
      stars = new Array(count).fill(0).map(() => {
        const depth = 0.3 + Math.random() * 0.9;
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          bx: 0, by: 0, // parallax offset
          z: depth,
          r: (Math.random() * 1.1 + 0.4) * depth + 0.3,
          a: 0.3 + Math.random() * 0.6,
          tw: Math.random() * Math.PI * 2,
          tws: 0.6 + Math.random() * 1.4,
          color: COLORS[Math.floor(Math.random() * (Math.random() < 0.7 ? 1 : COLORS.length))],
          vx: (Math.random() - 0.5) * 0.12 * depth,
          vy: (Math.random() - 0.5) * 0.12 * depth,
        };
      });
    }

    mouse.x = mouse.px = window.innerWidth / 2;
    mouse.y = mouse.py = window.innerHeight / 2;

    const onMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };
    const onDown = () => { mouse.dragging = true; };
    const onUp = () => { mouse.dragging = false; };
    const onLeave = () => { mouse.active = false; };

    function tick(t) {
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2;
      // smooth parallax target based on cursor distance from center
      const tpx = (mouse.x - cx) / cx; // -1..1
      const tpy = (mouse.y - cy) / cy;

      for (const s of stars) {
        // drift
        if (!reduce) { s.x += s.vx; s.y += s.vy; }
        // wrap
        if (s.x < -5) s.x = w + 5; else if (s.x > w + 5) s.x = -5;
        if (s.y < -5) s.y = h + 5; else if (s.y > h + 5) s.y = -5;

        // parallax offset eased
        const targetBx = tpx * 26 * s.z;
        const targetBy = tpy * 26 * s.z;
        s.bx += (targetBx - s.bx) * 0.05;
        s.by += (targetBy - s.by) * 0.05;

        let dx = s.x + s.bx;
        let dy = s.y + s.by;

        // drag interaction: pull nearby stars toward cursor + link lines
        if (mouse.active) {
          const mdx = mouse.x - dx;
          const mdy = mouse.y - dy;
          const dist = Math.hypot(mdx, mdy);
          const radius = mouse.dragging ? 220 : 140;
          if (dist < radius) {
            const force = (1 - dist / radius) * (mouse.dragging ? 0.16 : 0.05);
            dx += mdx * force;
            dy += mdy * force;
            if (mouse.dragging && dist > 4) {
              ctx.beginPath();
              ctx.strokeStyle = `rgba(0,240,255,${(1 - dist / radius) * 0.35})`;
              ctx.lineWidth = 0.6;
              ctx.moveTo(dx, dy);
              ctx.lineTo(mouse.x, mouse.y);
              ctx.stroke();
            }
          }
        }

        // twinkle
        const tw = reduce ? 1 : 0.55 + 0.45 * Math.sin(s.tw + t * 0.001 * s.tws);
        ctx.beginPath();
        ctx.fillStyle = s.color;
        ctx.globalAlpha = Math.max(0, Math.min(1, s.a * tw));
        ctx.arc(dx, dy, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    }

    resize();
    raf = requestAnimationFrame(tick);
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mouseleave", onLeave);
    // touch support
    const onTouch = (e) => {
      if (e.touches && e.touches[0]) {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
        mouse.active = true;
        mouse.dragging = true;
      }
    };
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("touchend", onUp);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("touchend", onUp);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: -9 }}
      aria-hidden="true"
    />
  );
}
