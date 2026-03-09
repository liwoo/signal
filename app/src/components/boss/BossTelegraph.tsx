"use client";

interface BossTelegraphProps {
  telegraph: string;
  hint: string;
  visible: boolean;
}

export function BossTelegraph({ telegraph, hint, visible }: BossTelegraphProps) {
  if (!visible || !telegraph) return null;

  return (
    <div
      className="px-4 py-2.5"
      style={{
        background: "rgba(255,40,40,0.04)",
        borderBottom: "1px solid rgba(255,64,64,0.1)",
        animation: "telegraph-in 0.3s ease forwards",
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className="text-[6px] tracking-[2px]"
          style={{ color: "#ff6e6e" }}
        >
          ⚡ TELEGRAPH
        </span>
      </div>
      <div
        className="text-[10px] leading-[1.5] font-[family-name:var(--font-display)]"
        style={{ color: "#ffaa00" }}
      >
        {telegraph}
      </div>
      <div
        className="text-[8px] leading-[1.4] mt-1"
        style={{ color: "var(--color-dim)" }}
      >
        {hint}
      </div>
    </div>
  );
}
