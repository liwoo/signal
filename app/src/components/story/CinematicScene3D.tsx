"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import * as THREE from "three";
import { SceneAtmosphere } from "./SceneAtmosphere";
import { createCinematicWorld } from "./cinematic-world";
import type { SceneDefinition } from "@/lib/sprites/scenes";
import { flashLevel, glitchLevel } from "@/lib/sprites/scene-fx";
import { C } from "@/lib/sprites/palette";

const CinematicFallback = dynamic(() => import("./CinematicFallback").then((m) => m.CinematicFallback), { ssr: false });

/** One context per film, with the same pixel sampling and exposure as missions. */
export function CinematicScene3D({ scene, onReady }: { scene: SceneDefinition; onReady: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const latestRef = useRef(scene);
  const [failed, setFailed] = useState(false);
  useEffect(() => { latestRef.current = scene; }, [scene]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || failed) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let renderer: THREE.WebGLRenderer | undefined;
    let world: ReturnType<typeof createCinematicWorld> | undefined;
    let observer: ResizeObserver | undefined;
    let frame = 0;
    let disposed = false;
    let active = latestRef.current;
    let start = performance.now();
    const wash = document.createElement("div");
    wash.style.cssText = "position:absolute;inset:0;pointer-events:none;opacity:0";
    const cleanup = () => {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      renderer?.domElement.removeEventListener("webglcontextlost", contextLost);
      world?.dispose();
      renderer?.dispose();
      renderer?.domElement.remove();
      wash.remove();
    };
    const fail = () => { cleanup(); setFailed(true); };
    const contextLost = (event: Event) => { event.preventDefault(); fail(); };
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.3;
      renderer.shadowMap.enabled = false;
      renderer.domElement.style.cssText = "display:block;width:100%;height:100%;image-rendering:pixelated";
      renderer.domElement.setAttribute("aria-label", "3D cinematic scene");
      renderer.domElement.addEventListener("webglcontextlost", contextLost);
      host.append(renderer.domElement, wash);
      world = createCinematicWorld(active);
      const resize = () => {
        if (disposed || !renderer || !world) return;
        const width = Math.max(1, host.clientWidth);
        const height = Math.max(1, host.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2) * 0.72);
        renderer.setSize(width, height, false);
        world.camera.aspect = width / height; world.camera.updateProjectionMatrix();
      };
      observer = new ResizeObserver(resize); observer.observe(host); resize();
      let ready = false;
      const draw = () => {
        if (disposed || !world || !renderer) return;
        try {
          if (active !== latestRef.current) {
            active = latestRef.current;
            world.dispose(); world = createCinematicWorld(active);
            resize(); start = performance.now();
          }
          const elapsed = performance.now() - start;
          world.update(elapsed, motion.matches);
          const flash = flashLevel(elapsed, active.flashes);
          const fade = active.transition === "dissolve" ? Math.max(0, 1 - elapsed / 650) : 0;
          const white = !motion.matches && active.transition === "flash" ? Math.max(0, 1 - elapsed / 220) : 0;
          const flashOpacity = motion.matches ? 0 : Math.max(flash.level, white);
          wash.style.background = fade > flashOpacity ? C.void : white > flash.level ? C.highlight : flash.color;
          wash.style.opacity = String(Math.max(fade, flashOpacity));
          const glitch = motion.matches ? 0 : Math.max(glitchLevel(elapsed, active.glitches),
            active.transition === "glitch" ? Math.max(0, 1 - elapsed / 350) : 0);
          renderer.domElement.style.transform = glitch ? `translateX(${Math.sin(elapsed * 0.17) * glitch * 4}px)` : "";
          if (!document.hidden) renderer.render(world.scene, world.camera);
          if (!ready) { ready = true; start = performance.now(); onReady(); }
          frame = requestAnimationFrame(draw);
        } catch { fail(); }
      };
      draw();
    } catch { fail(); }
    return cleanup;
  }, [onReady, failed]);

  if (failed) return <CinematicFallback scene={scene} onReady={onReady} />;
  return (
    <div className="absolute inset-0">
      <div ref={hostRef} className="absolute inset-0" data-cinematic-renderer="three" />
      <SceneAtmosphere />
    </div>
  );
}
