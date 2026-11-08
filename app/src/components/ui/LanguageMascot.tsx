// ── Language mascots ──
// One pixel-art mark per language, drawn in the game's own style rather than
// reusing official logos: a gopher for Go, a snake for Python, the yellow
// block for JavaScript. Each sprite is a character grid; every letter maps to a
// palette colour and `.` is transparent. Rendered as crisp SVG rects, so it
// scales to any size without blurring.

import type { CSSProperties } from "react";
import type { LanguageId } from "@/types/game";

interface Sprite {
  rows: string[];
  palette: Record<string, string>;
  /** Accessible name. */
  title: string;
}

// Sprite colours are artwork (like the canvas painters' palettes), not UI tokens.
const SPRITES: Record<LanguageId, Sprite> = {
  go: {
    title: "Go gopher",
    palette: { D: "#1f5d6e", B: "#79d4ea", W: "#ffffff", K: "#0b1a20", N: "#d9a77a", T: "#f4f1e8", F: "#d9a77a" },
    rows: [
      "..DD........DD..",
      ".DBBD......DBBD.",
      ".DBBBDDDDDDBBBD.",
      "..DBBBBBBBBBBD..",
      ".DBWWWBBBBWWWBD.",
      ".DBWWKBBBBWWKBD.",
      ".DBWWWBBBBWWWBD.",
      ".DBBBBBNNBBBBBD.",
      ".DBBBBNNNNBBBBD.",
      ".DBBBBBTTBBBBBD.",
      "DDBBBBBTTBBBBBDD",
      "DBDBBBBBBBBBBDBD",
      ".DDBBBBBBBBBBDD.",
      "..DBBBBBBBBBBD..",
      "..DBBBBBBBBBBD..",
      "...DDDDDDDDDD...",
      "...FF......FF...",
    ],
  },
  python: {
    title: "Python snake",
    palette: { D: "#173f6e", B: "#4ea6ff", L: "#9fd0ff", Y: "#ffd43b", W: "#ffffff", K: "#0b1a20", R: "#ff5a6a" },
    rows: [
      ".....DDDDD........",
      "....DLLBBBD.......",
      "...DBWKBBBBD......",
      "...DBKKBBBBBD.....",
      "R..DBBBBBBBBD.....",
      ".RRDBBBBBBBBD.....",
      "R...DDDDBBBBD.....",
      ".......DBBBBD.....",
      ".......DBBBYD.....",
      "......DBBBYD...DD.",
      ".....DBBBYD...DBLD",
      "....DBBBYD...DBBYD",
      "...DBBBYD...DBBBYD",
      "...DBBBYDDDDDBBYD.",
      "...DBBBYYYYYYBBYD.",
      "....DBBBBBBBBBBD..",
      ".....DDDDDDDDDD...",
    ],
  },
  javascript: {
    title: "JavaScript",
    palette: { Y: "#f7df1e", O: "#c9b414", K: "#16160f" },
    rows: [
      "YYYYYYYYYYYYYYYY",
      "YYYYYYYYYYYYYYYY",
      "YYYYYYYYYYYYYYYY",
      "YYYYYYYYYYYYYYYY",
      "YYYYYYYYYYYYYYYY",
      "YYYYYYYYYYYYYYYY",
      "YYYYYYYYYYYYYYYY",
      "YYYYYYYKKKYKKKKY",
      "YYYYYYYYYKYKYYYY",
      "YYYYYYYYYKYKYYYY",
      "YYYYYYYYYKYKKKKY",
      "YYYYYYYYYKYYYYKY",
      "YYYYYYKYYKYYYYKY",
      "YYYYYYKYYKYYYYKY",
      "YYYYYYYKKYYKKKKY",
      "YYYYYYYYYYYYYYYY",
      "OOOOOOOOOOOOOOOO",
    ],
  },
};

export function LanguageMascot({
  language,
  size = 32,
  bob = false,
  className,
  style,
}: {
  language: LanguageId;
  /** Rendered height in px; width follows the sprite's aspect. */
  size?: number;
  /** Idle hop — for the selected language. */
  bob?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const sprite = SPRITES[language];
  const h = sprite.rows.length;
  const w = Math.max(...sprite.rows.map((r) => r.length));
  const rects: React.ReactElement[] = [];
  sprite.rows.forEach((row, y) => {
    // Merge horizontal runs of one colour into a single rect.
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === ch) end++;
      const fill = sprite.palette[ch];
      if (fill) rects.push(<rect key={`${y}-${x}`} x={x} y={y} width={end - x} height={1} fill={fill} />);
      x = end;
    }
  });

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={(size * w) / h}
      height={size}
      shapeRendering="crispEdges"
      role="img"
      aria-label={sprite.title}
      className={`${bob ? "mascot-bob" : ""} ${className ?? ""}`.trim() || undefined}
      style={{ display: "block", imageRendering: "pixelated", ...style }}
    >
      <title>{sprite.title}</title>
      {rects}
    </svg>
  );
}
