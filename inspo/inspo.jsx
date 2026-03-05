import { useState, useRef, useEffect, useCallback } from "react";

// ─── STORY DATA ──────────────────────────────────────────────────────────────
const CHALLENGES = [
  {
    id: 0,
    xp: 100,
    rushBonus: 75,
    rushSeconds: 45,
    title: "HANDSHAKE",
    sub: "Variables · Constants · fmt",
    location: "CELL B-09",
    floor: "SUBLEVEL 3",
    // story events fire N seconds after challenge becomes active
    events: [
      {
        at: 18,
        type: "interrupt",
        who: "MAYA",
        text: "wait.\n\n...footsteps. right outside my door.",
      },
      { at: 20, type: "rush", label: "GUARD APPROACHING" },
    ],
    twist: {
      headline: "SHE KNOWS WHY",
      lines: [
        "they were talking outside my door.",
        "something about encryption. a thesis.",
        "...that's my research.",
        "they didn't take me at random.",
        "they need something on my laptop.",
      ],
    },
    brief: [
      "Maya rigged a terminal. Needs proof you have her exact location.",
      'Print "MAYA CHEN" then "CELL: B-09"',
      "var + const. keep it simple.",
    ],
    tips: [
      "const cell = 9",
      'name := "MAYA CHEN"',
      "fmt.Println(name)",
      'fmt.Printf("CELL: B-%02d\\n", cell)',
    ],
    starter: `package main

import "fmt"

const cell = 9

func main() {
    name := "MAYA CHEN"
    // TODO: print name
    // TODO: print "CELL: B-09" using cell
}
`,
  },
  {
    id: 1,
    xp: 150,
    rushBonus: 100,
    rushSeconds: 60,
    title: "DOOR CODE",
    sub: "For · Switch · If/Else",
    location: "CELL B-09",
    floor: "SUBLEVEL 3",
    events: [
      {
        at: 12,
        type: "interrupt",
        who: "MAYA",
        text: "...did you hear that.\n\nknocking. from b-10. twice. slow.",
      },
      {
        at: 28,
        type: "interrupt",
        who: "MAYA",
        text: "again. three knocks this time.\nthat's a distress signal.",
      },
      { at: 30, type: "rush", label: "CELL B-10 IN DANGER" },
    ],
    twist: {
      headline: "NOT ALONE",
      lines: [
        "the knocking stopped.",
        "then a voice.",
        "muffled. but i heard it.",
        '"maya."',
        "someone in b-10 knows my name.",
      ],
    },
    brief: [
      'Door panel needs 1–10 classified: 7 → "LUCKY"  even → "EVEN"  odd → "ODD"',
      'Print "N: TYPE" for each.',
      "Guard checks the sequence.",
    ],
    tips: [
      "for i := 1; i <= 10; i++",
      "switch { case n==7: ... }",
      'case n%2==0: return "EVEN"',
      'default: return "ODD"',
    ],
    starter: `package main

import "fmt"

func classify(n int) string {
    switch {
    case n == 7:
        return "LUCKY"
    // TODO: even case
    // TODO: default
    }
    return ""
}

func main() {
    for i := 1; i <= 10; i++ {
        // TODO: fmt.Printf("%d: %s\\n", i, classify(i))
    }
}
`,
  },
  {
    id: 2,
    xp: 200,
    rushBonus: 0,
    rushSeconds: 0,
    title: "SHAFT CODES",
    sub: "Functions · Multiple Returns · Variadic",
    location: "VENT SHAFT C",
    floor: "SUBLEVEL 2",
    events: [
      { at: 8, type: "powercut" },
      {
        at: 10,
        type: "interrupt",
        who: "SYSTEM",
        text: "⚡ EMERGENCY POWER  ·  90 SECONDS",
      },
      { at: 11, type: "rush", label: "BACKUP POWER FAILING" },
    ],
    twist: {
      headline: "DR. REEVES",
      lines: [
        "i made it to b-10.",
        "the door was open.",
        "inside—",
        "...it's dr. reeves.",
        "my thesis advisor.",
        "she's alive. she's terrified.",
        '"maya — i know why they took us."',
      ],
    },
    brief: [
      "Maintenance panel needs sum AND product of shaft IDs.",
      "IDs on the wall: 3 · 7 · 2 · 9 · 4",
      "Variadic func. Two return values.",
    ],
    tips: [
      "func calc(nums ...int) (int, int)",
      "product := 1; sum := 0",
      "for _, n := range nums { ... }",
      "return sum, product",
    ],
    starter: `package main

import "fmt"

func calc(nums ...int) (int, int) {
    sum, product := 0, 1
    for _, n := range nums {
        // TODO: accumulate sum and product
    }
    return sum, product
}

func main() {
    s, p := calc(3, 7, 2, 9, 4)
    // TODO: print "Sum: X" and "Product: Y"
    _ = s; _ = p
}
`,
  },
];

// ─── SYSTEM PROMPT ────────────────────────────────────────────────────────────
function sysPrompt(ch, inRush, powerCut) {
  const urgency = inRush
    ? "YOU ARE IN RUSH MODE. EXTREME URGENCY. Max 1 sentence."
    : powerCut
    ? "PITCH BLACK. Whispering. Max 1 sentence."
    : "Max 2 sentences.";
  return `You are Maya Chen — CS grad student, kidnapped 3 days, whispering through a hacked terminal. ${urgency}
Location: ${ch.location}, ${ch.floor}.
Current challenge: ${ch.title} (${ch.sub}).
Mission: ${ch.brief.join(" ")}

VOICE: Lowercase. Scared, sharp, no bullet points. Occasional "..." or ambient sounds.
${
  inRush
    ? "Use words like 'hurry', 'go', 'now' — a guard is right outside."
    : ""
}
${powerCut ? "It's completely dark. You can barely see the screen." : ""}

EVALUATE [CODE]:
- Correct (even minor syntax gaps) → 1 line of relief + physical result + ||COMPLETE||
- Wrong → what's missing in 1 sentence + 1 hint. No ||COMPLETE||.
Chat: 1–2 sentences. Stay in character.`;
}

async function callMaya(hist, ch, msg, isCode, inRush, powerCut) {
  const content = isCode ? `[CODE]\n${msg}` : msg;
  const messages = [...hist, { role: "user", content }];
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 180,
      system: sysPrompt(ch, inRush, powerCut),
      messages,
    }),
  });
  const data = await res.json();
  const reply = data.content?.[0]?.text ?? "...";
  return { reply, hist: [...messages, { role: "assistant", content: reply }] };
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;700&family=Orbitron:wght@400;700;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body,#root{height:100%;background:#040810;font-family:'JetBrains Mono',monospace;overflow:hidden}
::-webkit-scrollbar{width:2px}::-webkit-scrollbar-thumb{background:#0a2030}
textarea,input,button{font-family:'JetBrains Mono',monospace}
input:focus,textarea:focus{outline:none}
textarea{resize:none}
button{cursor:pointer;transition:all .12s ease;border:none}
button:disabled{cursor:not-allowed;opacity:.35}

@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
@keyframes scanline{0%{transform:translateY(-100%)}100%{transform:translateY(100vh)}}
@keyframes xpPop{0%{opacity:0;transform:translateX(-50%) scale(.4) translateY(0)}20%{opacity:1;transform:translateX(-50%) scale(1.3) translateY(-10px)}70%{opacity:1;transform:translateX(-50%) scale(1) translateY(-70px)}100%{opacity:0;transform:translateX(-50%) scale(.8) translateY(-110px)}}
@keyframes streakBlast{0%{opacity:0;transform:scale(2.5);filter:blur(12px)}35%{opacity:1;transform:scale(1);filter:blur(0)}75%{opacity:1;transform:scale(1.03)}100%{opacity:0;transform:scale(.95) translateY(-16px)}}
@keyframes msgIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@keyframes rushIn{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes interruptSlide{0%{transform:translateX(120%);opacity:0}12%{transform:translateX(0);opacity:1}80%{transform:translateX(0);opacity:1}100%{transform:translateX(120%);opacity:0}}
@keyframes twistReveal{0%{opacity:0;transform:scale(.96)}100%{opacity:1;transform:scale(1)}}
@keyframes powerFlicker{0%{opacity:1}8%{opacity:.05}15%{opacity:.9}22%{opacity:.03}30%{opacity:.8}38%{opacity:.04}46%{opacity:.7}54%{opacity:.02}62%{opacity:.85}70%{opacity:.03}80%{opacity:.9}90%{opacity:.04}100%{opacity:1}}
@keyframes redFlood{0%{background:rgba(255,30,10,.0)}100%{background:rgba(255,30,10,.06)}}
@keyframes timerPulse{0%,100%{box-shadow:0 0 8px rgba(255,60,60,.4)}50%{box-shadow:0 0 24px rgba(255,60,60,.9),0 0 48px rgba(255,60,60,.4)}}
@keyframes timerCrit{0%,100%{background:rgba(255,40,40,.15)}50%{background:rgba(255,40,40,.35)}}
@keyframes introIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes glowPulse{0%,100%{text-shadow:0 0 10px #6effa060,0 0 30px #6effa020}50%{text-shadow:0 0 24px #6effa0a0,0 0 60px #6effa050}}
@keyframes cardDone{0%{background:rgba(110,255,160,.2)}100%{background:rgba(110,255,160,.03)}}
@keyframes lineType{from{width:0}to{width:100%}}
.blink{animation:blink 1s step-end infinite}
.glowPulse{animation:glowPulse 3s ease-in-out infinite}
`;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function pad(n) {
  return String(Math.floor(n)).padStart(2, "0");
}

// ─── TYPING TEXT ──────────────────────────────────────────────────────────────
function TypeText({ text, speed = 22, color, onDone }) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    let i = 0;
    setShown("");
    const iv = setInterval(() => {
      i++;
      setShown(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(iv);
        onDone?.();
      }
    }, speed);
    return () => clearInterval(iv);
  }, [text]);
  return (
    <span style={{ color, whiteSpace: "pre-wrap" }}>
      {shown}
      <span
        className="blink"
        style={{ opacity: shown.length < text.length ? 1 : 0 }}
      >
        ▋
      </span>
    </span>
  );
}

// ─── XP PARTICLE ──────────────────────────────────────────────────────────────
function XPBurst({ amount, id, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1500);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        top: "45%",
        pointerEvents: "none",
        zIndex: 9999,
        animation: "xpPop 1.5s ease forwards",
        fontFamily: "'Orbitron',monospace",
        fontSize: 32,
        fontWeight: 900,
        color: "#6effa0",
        textShadow: "0 0 20px #6effa0,0 0 60px #6effa080",
        transform: "translateX(-50%)",
      }}
    >
      +{amount} XP
    </div>
  );
}

// ─── STREAK LABEL ─────────────────────────────────────────────────────────────
function Streak({ text, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1100);
    return () => clearTimeout(t);
  }, []);
  const colors = {
    "FIRST TRY!": "#ffed4a",
    "SPEED RUN!": "#00d4ff",
    "LEVEL UP!": "#ff9f1c",
    "CHAPTER CLEAR!": "#6effa0",
  };
  const c = colors[text] ?? "#6effa0";
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 9998,
      }}
    >
      <div
        style={{
          fontFamily: "'Orbitron',monospace",
          fontSize: "clamp(22px,4.5vw,44px)",
          fontWeight: 900,
          color: c,
          letterSpacing: 8,
          textShadow: `0 0 30px ${c},0 0 70px ${c}60`,
          animation: "streakBlast 1.1s ease forwards",
        }}
      >
        {text}
      </div>
    </div>
  );
}

// ─── INTERRUPT TOAST ──────────────────────────────────────────────────────────
function Interrupt({ who, text, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 5500);
    return () => clearTimeout(t);
  }, []);
  const isSystem = who === "SYSTEM";
  const border = isSystem ? "#ff5a5a" : "#6effa0";
  return (
    <div
      style={{
        position: "fixed",
        top: 60,
        right: 16,
        zIndex: 900,
        width: 280,
        border: `1px solid ${border}`,
        borderLeft: `3px solid ${border}`,
        background: isSystem ? "rgba(255,30,10,.12)" : "rgba(6,20,10,.96)",
        padding: "12px 14px",
        animation: "interruptSlide 5.5s ease forwards",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          color: border,
          fontSize: 8,
          letterSpacing: 3,
          marginBottom: 6,
        }}
      >
        ▸ INCOMING · {who}
      </div>
      <div
        style={{
          color: isSystem ? "#ff9a9a" : "#a0ffb8",
          fontSize: 11,
          lineHeight: 1.7,
          whiteSpace: "pre-wrap",
        }}
      >
        {text}
      </div>
    </div>
  );
}

// ─── RUSH TIMER BAR ───────────────────────────────────────────────────────────
function RushBar({ seconds, label, onExpire }) {
  const [left, setLeft] = useState(seconds);
  const total = useRef(seconds);
  useEffect(() => {
    const iv = setInterval(() => {
      setLeft((p) => {
        if (p <= 1) {
          clearInterval(iv);
          onExpire?.();
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, []);
  const pct = (left / total.current) * 100;
  const crit = left <= 10;
  const trackColor = crit ? "#3a0a0a" : "#1a0a00";
  const fillColor = crit ? "#ff3a3a" : left <= 20 ? "#ff6a20" : "#ff9f1c";
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 800,
        background: trackColor,
        borderTop: `1px solid ${fillColor}40`,
        animation: crit
          ? "timerCrit .6s ease-in-out infinite"
          : "rushIn .4s ease forwards",
        padding: "10px 16px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span
            style={{
              color: fillColor,
              fontSize: 8,
              letterSpacing: 3,
              animation: crit ? "blink .4s step-end infinite" : "none",
            }}
          >
            ⚠ {label}
          </span>
        </div>
        <div
          style={{
            fontFamily: "'Orbitron',monospace",
            color: fillColor,
            fontSize: 20,
            fontWeight: 900,
            animation: crit ? "timerPulse .6s ease-in-out infinite" : "none",
            minWidth: 52,
            textAlign: "right",
          }}
        >
          {pad(left / 60)}:{pad(left % 60)}
        </div>
      </div>
      <div
        style={{
          height: 4,
          background: "#0a0a0a",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "repeating-linear-gradient(90deg,transparent,transparent 19px,rgba(0,0,0,.4) 19px,rgba(0,0,0,.4) 20px)",
            zIndex: 1,
          }}
        />
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: fillColor,
            boxShadow: `0 0 10px ${fillColor}`,
            transition: "width 1s linear, background .5s",
          }}
        />
      </div>
    </div>
  );
}

// ─── POWER CUT ────────────────────────────────────────────────────────────────
function PowerCut({ onDone }) {
  const [phase, setPhase] = useState("flicker"); // flicker | dark | restore
  useEffect(() => {
    setTimeout(() => setPhase("dark"), 1200);
    setTimeout(() => setPhase("restore"), 3200);
    setTimeout(() => {
      onDone?.();
    }, 4000);
  }, []);
  if (phase === "flicker")
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9990,
          background: "#040810",
          animation: "powerFlicker 1.2s ease forwards",
          pointerEvents: "none",
        }}
      />
    );
  if (phase === "dark")
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9990,
          background: "#010204",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div
          style={{
            color: "#1a0a0a",
            fontFamily: "'Orbitron',monospace",
            fontSize: 11,
            letterSpacing: 6,
          }}
        >
          POWER FAILURE
        </div>
        <div style={{ color: "#2a0808", fontSize: 9, letterSpacing: 3 }}>
          SWITCHING TO BACKUP
        </div>
      </div>
    );
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9990,
        animation: "redFlood 1s ease forwards",
        pointerEvents: "none",
        background: "rgba(255,30,10,.06)",
      }}
    />
  );
}

// ─── TWIST REVEAL ─────────────────────────────────────────────────────────────
function TwistReveal({ twist, onDone }) {
  const [lineIdx, setLineIdx] = useState(0);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (lineIdx < twist.lines.length) {
      const t = setTimeout(() => setLineIdx((i) => i + 1), 900);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => setDone(true), 600);
      return () => clearTimeout(t);
    }
  }, [lineIdx]);
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        background: "rgba(4,8,16,.97)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        animation: "twistReveal .5s ease forwards",
      }}
    >
      <div style={{ maxWidth: 420, width: "100%", padding: "0 24px" }}>
        <div
          style={{
            color: "#ff5a3a",
            fontSize: 9,
            letterSpacing: 6,
            marginBottom: 24,
            textAlign: "center",
          }}
        >
          ▸ PLOT DEVELOPMENT
        </div>
        <div
          style={{
            fontFamily: "'Orbitron',monospace",
            fontSize: "clamp(18px,4vw,32px)",
            fontWeight: 900,
            color: "#ff9f1c",
            letterSpacing: 4,
            marginBottom: 32,
            textAlign: "center",
            textShadow: "0 0 20px #ff9f1c60",
          }}
        >
          {twist.headline}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {twist.lines.slice(0, lineIdx).map((line, i) => (
            <div
              key={i}
              style={{
                color: line.startsWith('"') ? "#ffed4a" : "#4a9a7a",
                fontSize: 14,
                lineHeight: 1.7,
                animation: "msgIn .4s ease forwards",
                textAlign: "center",
              }}
            >
              {line}
            </div>
          ))}
        </div>
        {done && (
          <div style={{ textAlign: "center", marginTop: 36 }}>
            <button
              onClick={onDone}
              style={{
                background: "transparent",
                border: "1px solid #1a5a3a",
                color: "#2a9a5a",
                padding: "10px 28px",
                fontSize: 10,
                letterSpacing: 4,
                fontFamily: "'Orbitron',monospace",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#6effa0";
                e.currentTarget.style.color = "#6effa0";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#1a5a3a";
                e.currentTarget.style.color = "#2a9a5a";
              }}
            >
              CONTINUE ▸
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── XP BAR ────────────────────────────────────────────────────────────────────
function XPBar({ xp, max, level }) {
  const pct = Math.min((xp / max) * 100, 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
      <div
        style={{
          fontFamily: "'Orbitron',monospace",
          color: "#6effa0",
          fontSize: 9,
          letterSpacing: 2,
          flexShrink: 0,
        }}
      >
        LV{level}
      </div>
      <div
        style={{
          flex: 1,
          height: 4,
          background: "#061810",
          border: "1px solid #0a2a1a",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: "linear-gradient(90deg,#2a8a4a,#6effa0)",
            boxShadow: "0 0 8px #6effa080",
            transition: "width .9s cubic-bezier(.17,.67,.35,1.2)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "repeating-linear-gradient(90deg,transparent,transparent 9px,rgba(0,0,0,.3) 9px,rgba(0,0,0,.3) 10px)",
          }}
        />
      </div>
      <div style={{ color: "#1a5a3a", fontSize: 8, flexShrink: 0 }}>
        {xp} XP
      </div>
    </div>
  );
}

// ─── CHALLENGE NODES ──────────────────────────────────────────────────────────
function ChallengeNodes({ challenges, cidx, completed }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
      {challenges.map((ch, i) => {
        const isDone = completed.includes(ch.id);
        const isActive = i === cidx;
        const isLocked = i > cidx && !isDone;
        const nodeColor = isDone ? "#6effa0" : isActive ? "#ff9f1c" : "#0a2a1a";
        const lineColor =
          isDone && i < challenges.length - 1 ? "#3a8a5a" : "#0a2a1a";
        return (
          <div key={ch.id} style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: 36,
                height: 36,
                border: `2px solid ${nodeColor}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: isActive
                  ? "rgba(255,159,28,.08)"
                  : isDone
                  ? "rgba(110,255,160,.06)"
                  : "transparent",
                position: "relative",
                boxShadow: isActive ? `0 0 16px ${nodeColor}40` : "none",
                animation: isActive
                  ? "cardPulse2 2s ease-in-out infinite"
                  : isDone
                  ? "cardDone .6s ease forwards"
                  : "none",
                transition: "all .4s ease",
              }}
            >
              {isDone ? (
                <span
                  style={{
                    color: "#6effa0",
                    fontSize: 14,
                    textShadow: "0 0 8px #6effa0",
                  }}
                >
                  ✓
                </span>
              ) : (
                <span
                  style={{
                    fontFamily: "'Orbitron',monospace",
                    color: nodeColor,
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {i + 1}
                </span>
              )}
            </div>
            {i < challenges.length - 1 && (
              <div
                style={{
                  width: 32,
                  height: 2,
                  background: lineColor,
                  transition: "background .6s ease",
                  position: "relative",
                }}
              >
                {isDone && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "linear-gradient(90deg,#3a8a5a,#1a4a2a)",
                      animation: "none",
                    }}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── INTRO ────────────────────────────────────────────────────────────────────
function Intro({ onStart }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 100);
    return () => clearInterval(iv);
  }, []);
  const noise = tick % 7 === 0;
  return (
    <>
      <style>
        {CSS +
          `
        @keyframes cardPulse2{0%,100%{box-shadow:0 0 16px rgba(255,159,28,.2)}50%{box-shadow:0 0 30px rgba(255,159,28,.5)}}
        @keyframes introScan{0%{transform:translateY(-100%)}100%{transform:translateY(100vh)}}
        .i0{animation:introIn .7s ease forwards}
        .i1{animation:introIn .7s ease .2s forwards;opacity:0}
        .i2{animation:introIn .7s ease .4s forwards;opacity:0}
        .i3{animation:introIn .7s ease .6s forwards;opacity:0}
        .i4{animation:introIn .7s ease .9s forwards;opacity:0}
      `}
      </style>
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 20,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: "100%",
            height: 2,
            background:
              "linear-gradient(transparent,rgba(110,255,160,.12),transparent)",
            animation: "introScan 5s linear infinite",
          }}
        />
      </div>
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#040810",
          padding: 20,
          backgroundImage:
            "radial-gradient(ellipse at 50% 110%, rgba(0,60,20,.2) 0%,transparent 65%)",
        }}
      >
        <div
          style={{
            position: "fixed",
            inset: 0,
            opacity: 0.1,
            backgroundImage:
              "linear-gradient(rgba(0,255,80,.25) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,80,.25) 1px,transparent 1px)",
            backgroundSize: "44px 44px",
            pointerEvents: "none",
          }}
        />
        <div style={{ maxWidth: 480, width: "100%", position: "relative" }}>
          {/* title */}
          <div className="i0" style={{ textAlign: "center", marginBottom: 28 }}>
            <div
              style={{
                color: "#0a4a2a",
                fontSize: 9,
                letterSpacing: 6,
                marginBottom: 14,
              }}
            >
              ▸ ENCRYPTED SIGNAL · ACT I
            </div>
            <div
              className="glowPulse"
              style={{
                fontFamily: "'Orbitron',monospace",
                fontSize: "clamp(52px,13vw,88px)",
                fontWeight: 900,
                color: "#6effa0",
                letterSpacing: 6,
                lineHeight: 1,
                filter: noise ? "blur(1px)" : "none",
              }}
            >
              SIGNAL
            </div>
            <div
              style={{
                color: "#1a6a3a",
                fontSize: 9,
                letterSpacing: 5,
                marginTop: 6,
              }}
            >
              FIRST CONTACT
            </div>
          </div>

          {/* stats */}
          <div
            className="i1"
            style={{ display: "flex", gap: 6, marginBottom: 16 }}
          >
            {[
              ["3", "CHALLENGES"],
              ["450", "MAX XP"],
              ["TIMED", "EVENTS"],
              ["GO", "LANGUAGE"],
            ].map(([v, l]) => (
              <div
                key={l}
                style={{
                  flex: 1,
                  border: "1px solid #0a2a1a",
                  background: "rgba(0,255,80,.015)",
                  padding: "10px 0",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Orbitron',monospace",
                    color: "#6effa0",
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  {v}
                </div>
                <div
                  style={{
                    color: "#0a4a2a",
                    fontSize: 7,
                    letterSpacing: 2,
                    marginTop: 2,
                  }}
                >
                  {l}
                </div>
              </div>
            ))}
          </div>

          {/* story */}
          <div
            className="i2"
            style={{
              border: "1px solid #0a2a1a",
              borderLeft: "3px solid #2a8a5a",
              background: "rgba(0,255,80,.015)",
              padding: "14px 16px",
              marginBottom: 14,
            }}
          >
            <div
              style={{
                color: "#1a6a4a",
                fontSize: 8,
                letterSpacing: 3,
                marginBottom: 8,
              }}
            >
              ▸ SIGNAL INTERCEPTED · 02:14:07
            </div>
            <p style={{ color: "#3a7a5a", fontSize: 12, lineHeight: 1.8 }}>
              maya chen. missing 72hrs. she's alive — hacked a terminal in
              sublevel 3.
            </p>
            <p
              style={{
                color: "#6effa0",
                fontSize: 12,
                lineHeight: 1.8,
                marginTop: 6,
              }}
            >
              she needs a Go programmer. write the code. get her out.
            </p>
          </div>

          {/* mechanics */}
          <div
            className="i3"
            style={{ display: "flex", gap: 6, marginBottom: 20 }}
          >
            {[
              ["⚡", "TIMED EVENTS", "Guards & power cuts fire mid-challenge"],
              ["🎯", "SPEED BONUS", "Finish during rush for extra XP"],
              ["⚠", "PLOT TWISTS", "Story evolves after each challenge"],
            ].map(([icon, title, desc]) => (
              <div
                key={title}
                style={{
                  flex: 1,
                  border: "1px solid #081820",
                  padding: "10px 10px",
                  background: "rgba(0,20,30,.4)",
                }}
              >
                <div style={{ fontSize: 14, marginBottom: 4 }}>{icon}</div>
                <div
                  style={{
                    color: "#1a5a6a",
                    fontSize: 8,
                    letterSpacing: 2,
                    marginBottom: 3,
                  }}
                >
                  {title}
                </div>
                <div style={{ color: "#0a3a4a", fontSize: 9, lineHeight: 1.5 }}>
                  {desc}
                </div>
              </div>
            ))}
          </div>

          <div className="i4">
            <button
              onClick={onStart}
              style={{
                width: "100%",
                padding: "14px",
                background: "transparent",
                border: "2px solid #6effa0",
                color: "#6effa0",
                fontFamily: "'Orbitron',monospace",
                fontSize: 12,
                letterSpacing: 6,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#6effa0";
                e.currentTarget.style.color = "#040810";
                e.currentTarget.style.boxShadow =
                  "0 0 40px rgba(110,255,160,.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#6effa0";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              CONNECT TO MAYA
            </button>
            <div
              style={{
                textAlign: "center",
                marginTop: 8,
                color: "#0a3a2a",
                fontSize: 8,
                letterSpacing: 2,
              }}
            >
              ⚡ FIRST TRY BONUS · SPEED BONUS · STORY BRANCHING{" "}
              <span className="blink">█</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── WIN ──────────────────────────────────────────────────────────────────────
function Win({ xp, level, onReplay }) {
  return (
    <>
      <style>{CSS}</style>
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#040810",
          padding: 32,
        }}
      >
        <div
          className="glowPulse"
          style={{
            fontFamily: "'Orbitron',monospace",
            fontSize: "clamp(28px,6vw,52px)",
            fontWeight: 900,
            color: "#6effa0",
            letterSpacing: 6,
            textAlign: "center",
            marginBottom: 6,
          }}
        >
          ACT I COMPLETE
        </div>
        <div
          style={{
            color: "#1a8a4a",
            fontSize: 9,
            letterSpacing: 5,
            marginBottom: 32,
          }}
        >
          MAYA ESCAPES SUBLEVEL 3
        </div>
        <div
          style={{
            display: "flex",
            gap: 10,
            marginBottom: 28,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {CHALLENGES.map((c) => (
            <div
              key={c.id}
              style={{
                border: "1px solid #2a8a5a",
                background: "rgba(110,255,160,.04)",
                padding: "14px 20px",
                textAlign: "center",
                minWidth: 110,
                animation: "cardDone .8s ease forwards",
              }}
            >
              <div
                style={{
                  color: "#3a8a5a",
                  fontSize: 8,
                  letterSpacing: 2,
                  marginBottom: 6,
                }}
              >
                ✓ {c.title}
              </div>
              <div
                style={{
                  fontFamily: "'Orbitron',monospace",
                  color: "#6effa0",
                  fontSize: 22,
                  fontWeight: 700,
                }}
              >
                +{c.xp}
              </div>
              <div style={{ color: "#1a5a3a", fontSize: 8 }}>BASE XP</div>
            </div>
          ))}
        </div>
        <div
          style={{
            border: "1px solid #1a3a2a",
            background: "rgba(0,255,80,.02)",
            padding: "18px 32px",
            textAlign: "center",
            marginBottom: 6,
          }}
        >
          <div
            style={{
              color: "#1a6a3a",
              fontSize: 8,
              letterSpacing: 4,
              marginBottom: 4,
            }}
          >
            FINAL SCORE
          </div>
          <div
            style={{
              fontFamily: "'Orbitron',monospace",
              color: "#6effa0",
              fontSize: 44,
              fontWeight: 900,
            }}
          >
            {xp}
          </div>
          <div style={{ color: "#1a5a3a", fontSize: 9, letterSpacing: 3 }}>
            LEVEL {level} · PROGRAMMER
          </div>
        </div>
        <div
          style={{
            color: "#ffed4a",
            fontSize: 11,
            textAlign: "center",
            margin: "20px 0",
            maxWidth: 380,
            lineHeight: 1.8,
          }}
        >
          dr. reeves is alive.
          <br />
          <span style={{ color: "#4a8a6a" }}>
            she knows why they were both taken.
          </span>
          <br />
          <span style={{ color: "#2a6a4a", fontSize: 10 }}>
            act ii begins in sublevel 2.
          </span>
        </div>
        <button
          onClick={onReplay}
          style={{
            background: "transparent",
            border: "1px solid #1a5a3a",
            color: "#1a8a4a",
            padding: "10px 28px",
            fontSize: 10,
            letterSpacing: 4,
            fontFamily: "'Orbitron',monospace",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#6effa0";
            e.currentTarget.style.color = "#6effa0";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#1a5a3a";
            e.currentTarget.style.color = "#1a8a4a";
          }}
        >
          PLAY AGAIN
        </button>
      </div>
    </>
  );
}

// ─── MAIN GAME ─────────────────────────────────────────────────────────────────
export default function App() {
  const [phase, setPhase] = useState("intro");
  const [cidx, setCidx] = useState(0);
  const [hist, setHist] = useState([]);
  const [msgs, setMsgs] = useState([]);
  const [code, setCode] = useState(CHALLENGES[0].starter);
  const [chat, setChat] = useState("");
  const [busy, setBusy] = useState(false);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [completed, setCompleted] = useState([]);
  const [attempts, setAttempts] = useState(0);
  const [tab, setTab] = useState("code");

  // story state
  const [inRush, setInRush] = useState(false);
  const [rushLabel, setRushLabel] = useState("");
  const [rushSecs, setRushSecs] = useState(0);
  const [powerCut, setPowerCut] = useState(false);
  const [interrupt, setInterrupt] = useState(null);
  const [twist, setTwist] = useState(null);
  const [particles, setParticles] = useState([]);
  const [streaks, setStreaks] = useState([]);
  const [glitch, setGlitch] = useState(false);
  const [redTint, setRedTint] = useState(false);

  const logRef = useRef(null);
  const eventTimers = useRef([]);
  const startTime = useRef(null);

  const ch = CHALLENGES[Math.min(cidx, CHALLENGES.length - 1)];

  useEffect(() => {
    logRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const clearTimers = () => {
    eventTimers.current.forEach(clearTimeout);
    eventTimers.current = [];
  };

  const addMsg = useCallback(
    (from, text, type) =>
      setMsgs((p) => [
        ...p,
        {
          id: Date.now() + Math.random(),
          from,
          text,
          type,
          anim: from === "MAYA" || from === "SYS",
        },
      ]),
    []
  );

  const showStreak = (text) => {
    const id = Date.now();
    setStreaks((s) => [...s, { id, text }]);
  };

  const spawnXP = (amt) => {
    const id = Date.now();
    setParticles((p) => [...p, { id, amt }]);
  };

  // fire story events for current challenge
  const fireEvents = (challenge) => {
    clearTimers();
    challenge.events.forEach((ev) => {
      const t = setTimeout(() => {
        if (ev.type === "interrupt") {
          setInterrupt({ who: ev.who, text: ev.text });
          addMsg(ev.who, ev.text, ev.who === "SYSTEM" ? "sys" : "maya");
        } else if (ev.type === "rush") {
          setInRush(true);
          setRushLabel(ev.label);
          setRushSecs(challenge.rushSeconds || 45);
          setGlitch(true);
          setTimeout(() => setGlitch(false), 300);
        } else if (ev.type === "powercut") {
          setPowerCut(true);
          setRedTint(true);
          setTimeout(() => setPowerCut(false), 4200);
        }
      }, ev.at * 1000);
      eventTimers.current.push(t);
    });
  };

  const startGame = async () => {
    setPhase("playing");
    setBusy(true);
    startTime.current = Date.now();
    setTimeout(async () => {
      try {
        const { reply, hist: h } = await callMaya(
          [],
          ch,
          "i got your signal. i'm here.",
          false,
          false,
          false
        );
        setHist(h);
        addMsg("MAYA", reply, "maya");
        fireEvents(ch);
      } catch {
        addMsg("SYS", "...", "err");
      }
      setBusy(false);
    }, 600);
  };

  const sendChat = async () => {
    if (!chat.trim() || busy) return;
    const m = chat.trim();
    setChat("");
    addMsg("YOU", m, "you");
    setBusy(true);
    try {
      const { reply, hist: h } = await callMaya(
        hist,
        ch,
        m,
        false,
        inRush,
        powerCut
      );
      setHist(h);
      addMsg("MAYA", reply, "maya");
    } catch {
      addMsg("SYS", "...", "err");
    }
    setBusy(false);
  };

  const submitCode = async () => {
    if (!code.trim() || busy) return;
    const isFirst = attempts === 0;
    const isSpeed = inRush;
    setAttempts((a) => a + 1);
    setBusy(true);
    addMsg("YOU", `[ transmitting · attempt ${attempts + 1} ]`, "dim");
    try {
      const { reply, hist: h } = await callMaya(
        hist,
        ch,
        code,
        true,
        inRush,
        powerCut
      );
      const ok = reply.includes("||COMPLETE||");
      const clean = reply.replace("||COMPLETE||", "").trim();
      setHist(h);
      addMsg("MAYA", clean, ok ? "win" : "maya");

      if (ok) {
        clearTimers();
        setInRush(false);
        let earned = ch.xp;
        if (isFirst) earned += Math.floor(ch.xp * 0.5);
        if (isSpeed) earned += ch.rushBonus;
        spawnXP(earned);
        setXp((p) => {
          const next = p + earned;
          const lv = [0, 150, 350, 600].findLastIndex((t) => next >= t) + 1;
          if (lv > level) {
            setLevel(lv);
            setTimeout(() => showStreak("LEVEL UP!"), 700);
          }
          return next;
        });
        setCompleted((p) => [...p, ch.id]);
        if (isFirst && isSpeed) showStreak("SPEED RUN!");
        else if (isFirst) showStreak("FIRST TRY!");
        else showStreak("CHAPTER CLEAR!");
        setGlitch(true);
        setTimeout(() => setGlitch(false), 400);

        // show twist then advance
        setTimeout(() => {
          setBusy(false);
          setTwist({
            ...ch.twist,
            onDone: () => {
              setTwist(null);
              const next = cidx + 1;
              if (next >= CHALLENGES.length) {
                setPhase("win");
                return;
              }
              const nextCh = CHALLENGES[next];
              setCidx(next);
              setCode(nextCh.starter);
              setTab("code");
              setAttempts(0);
              setInRush(false);
              setRedTint(false);
              const fh = [];
              setHist(fh);
              addMsg("SYS", `▸ ${nextCh.location} · ${nextCh.floor}`, "sys");
              setBusy(true);
              callMaya(fh, nextCh, "moving. what's next?", false, false, false)
                .then(({ reply: r2, hist: h2 }) => {
                  setHist(h2);
                  addMsg("MAYA", r2, "maya");
                  fireEvents(nextCh);
                  setBusy(false);
                })
                .catch(() => setBusy(false));
            },
          });
        }, 1400);
      } else {
        setBusy(false);
      }
    } catch {
      addMsg("SYS", "tx error", "err");
      setBusy(false);
    }
  };

  const reset = () => {
    clearTimers();
    setPhase("intro");
    setCidx(0);
    setHist([]);
    setMsgs([]);
    setCode(CHALLENGES[0].starter);
    setXp(0);
    setLevel(1);
    setCompleted([]);
    setAttempts(0);
    setTab("code");
    setInRush(false);
    setRedTint(false);
    setPowerCut(false);
    setTwist(null);
    setStreak(null);
  };

  if (phase === "intro") return <Intro onStart={startGame} />;
  if (phase === "win") return <Win xp={xp} level={level} onReplay={reset} />;

  const msgColor = (t) =>
    ({
      maya: "#6effa0",
      win: "#ffed4a",
      you: "#7ab8d8",
      sys: "#ff9f1c",
      err: "#ff5a5a",
      dim: "#1a4a5a",
    }[t] ?? "#3a7a6a");

  return (
    <>
      <style>
        {CSS +
          `
        @keyframes cardPulse2{0%,100%{box-shadow:0 0 12px rgba(255,159,28,.2)}50%{box-shadow:0 0 28px rgba(255,159,28,.5)}}
      `}
      </style>

      {/* XP particles */}
      {particles.map((p) => (
        <XPBurst
          key={p.id}
          amount={p.amt}
          id={p.id}
          onDone={() => setParticles((ps) => ps.filter((x) => x.id !== p.id))}
        />
      ))}

      {/* Streaks */}
      {streaks.map((s) => (
        <Streak
          key={s.id}
          text={s.text}
          onDone={() => setStreaks((ss) => ss.filter((x) => x.id !== s.id))}
        />
      ))}

      {/* Interrupt toast */}
      {interrupt && (
        <Interrupt
          who={interrupt.who}
          text={interrupt.text}
          onDone={() => setInterrupt(null)}
        />
      )}

      {/* Power cut overlay */}
      {powerCut && <PowerCut onDone={() => setPowerCut(false)} />}

      {/* Twist reveal */}
      {twist && <TwistReveal twist={twist} onDone={twist.onDone} />}

      {/* Rush timer */}
      {inRush && (
        <RushBar
          seconds={rushSecs}
          label={rushLabel}
          onExpire={() => setInRush(false)}
        />
      )}

      {/* Scanline */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 50,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: "100%",
            height: 1,
            background:
              "linear-gradient(transparent,rgba(110,255,160,.07),transparent)",
            animation: "scanline 7s linear infinite",
          }}
        />
      </div>

      <div
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          background: redTint ? "#06080c" : "#040810",
          filter: glitch
            ? "hue-rotate(10deg) saturate(1.6) brightness(1.1)"
            : "none",
          transition: "background 1s, filter .07s",
          paddingBottom: inRush ? 58 : 0,
        }}
      >
        {/* ── TOPBAR ── */}
        <div
          style={{
            background: "#05101a",
            borderBottom: `1px solid ${inRush ? "#3a1a0a" : "#0a2030"}`,
            padding: "0 14px",
            height: 40,
            display: "flex",
            alignItems: "center",
            gap: 14,
            flexShrink: 0,
            transition: "border-color .5s",
          }}
        >
          <div
            className="glowPulse"
            style={{
              fontFamily: "'Orbitron',monospace",
              color: "#6effa0",
              fontSize: 11,
              letterSpacing: 4,
              flexShrink: 0,
            }}
          >
            SIGNAL
          </div>
          <XPBar xp={xp} max={450} level={level} />
          <div
            style={{
              display: "flex",
              gap: 10,
              fontSize: 8,
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <span style={{ color: "#0a4a3a" }}>ACT I</span>
            <ChallengeNodes
              challenges={CHALLENGES}
              cidx={cidx}
              completed={completed}
            />
            <span
              style={{
                color: inRush ? "#ff5a5a" : busy ? "#ff9f1c" : "#2a9a5a",
                animation: inRush ? "blink .5s step-end infinite" : "none",
              }}
            >
              ● {inRush ? "RUSH" : busy ? "TX" : "LIVE"}
            </span>
          </div>
        </div>

        {/* ── BODY ── */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* ── LEFT: CHAT ── */}
          <div
            style={{
              width: "42%",
              display: "flex",
              flexDirection: "column",
              borderRight: `1px solid ${inRush ? "#2a1a0a" : "#0a2030"}`,
              transition: "border-color .5s",
              minWidth: 0,
            }}
          >
            {/* location bar */}
            <div
              style={{
                background: "rgba(0,0,0,.3)",
                borderBottom: "1px solid #0a1820",
                padding: "7px 12px",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <span
                    style={{ color: "#ff9f1c", fontSize: 11, fontWeight: 600 }}
                  >
                    {ch.title}{" "}
                  </span>
                  <span style={{ color: "#1a5a6a", fontSize: 9 }}>
                    — {ch.sub}
                  </span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "#1a5a4a", fontSize: 8 }}>
                    {ch.location}
                  </div>
                  <div style={{ color: "#0a3a2a", fontSize: 7 }}>
                    {ch.floor}
                  </div>
                </div>
              </div>
            </div>

            {/* messages */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "10px 12px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {msgs.length === 0 && (
                <div
                  style={{
                    color: "#0a3a2a",
                    fontSize: 10,
                    textAlign: "center",
                    marginTop: 28,
                  }}
                >
                  routing<span className="blink">...</span>
                </div>
              )}
              {msgs.map((m) => (
                <div
                  key={m.id}
                  className="msg-in"
                  style={{ fontSize: 11.5, lineHeight: 1.65 }}
                >
                  <div style={{ display: "flex", gap: 6, marginBottom: 1 }}>
                    <span style={{ color: "#0a2a3a", fontSize: 7 }}>
                      {new Date(m.id).toLocaleTimeString("en-US", {
                        hour12: false,
                      })}
                    </span>
                    <span
                      style={{
                        color: msgColor(m.type),
                        fontSize: 7,
                        letterSpacing: 2,
                      }}
                    >
                      {m.from}
                    </span>
                  </div>
                  <div
                    style={{
                      color: msgColor(m.type),
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {m.anim ? (
                      <TypeText
                        text={m.text}
                        color={msgColor(m.type)}
                        speed={20}
                      />
                    ) : (
                      m.text
                    )}
                  </div>
                </div>
              ))}
              {busy && (
                <div style={{ fontSize: 9, color: "#0a4a3a" }}>
                  <span style={{ color: "#6effa050", letterSpacing: 2 }}>
                    MAYA{" "}
                  </span>
                  <span className="blink" style={{ color: "#6effa0" }}>
                    ▋
                  </span>
                </div>
              )}
              <div ref={logRef} />
            </div>

            {/* chat */}
            <div
              style={{
                borderTop: "1px solid #0a1820",
                padding: "7px 10px",
                display: "flex",
                gap: 8,
                alignItems: "center",
                background: "#04090f",
                flexShrink: 0,
              }}
            >
              <span style={{ color: "#0a3a2a", fontSize: 11 }}>▸</span>
              <input
                value={chat}
                onChange={(e) => setChat(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChat()}
                placeholder="ask maya..."
                disabled={busy}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  color: "#7ab8d8",
                  fontSize: 11,
                  borderBottom: "1px solid #0a1820",
                  padding: "2px 0",
                }}
              />
              <button
                onClick={sendChat}
                disabled={busy || !chat.trim()}
                style={{
                  background: "transparent",
                  border: "1px solid #0a3a4a",
                  color: "#0a5a6a",
                  fontSize: 8,
                  padding: "4px 10px",
                  letterSpacing: 1,
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.borderColor = "#7ab8d8";
                    e.currentTarget.style.color = "#7ab8d8";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#0a3a4a";
                  e.currentTarget.style.color = "#0a5a6a";
                }}
              >
                TX
              </button>
            </div>
          </div>

          {/* ── RIGHT ── */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              minWidth: 0,
            }}
          >
            {/* tabs */}
            <div
              style={{
                background: "#04090f",
                borderBottom: "1px solid #0a1820",
                display: "flex",
                flexShrink: 0,
              }}
            >
              {[
                ["code", "< CODE />"],
                ["mission", "MISSION"],
                ["tips", "TIPS"],
              ].map(([t, label]) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    background: "transparent",
                    color: tab === t ? "#6effa0" : "#1a5a4a",
                    fontSize: 8,
                    letterSpacing: 2,
                    padding: "9px 14px",
                    borderBottom:
                      tab === t ? "2px solid #6effa0" : "2px solid transparent",
                  }}
                >
                  {label}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              {attempts > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    paddingRight: 12,
                    gap: 5,
                  }}
                >
                  <span style={{ color: "#1a4a3a", fontSize: 7 }}>TRIES</span>
                  <span
                    style={{
                      fontFamily: "'Orbitron',monospace",
                      color: attempts >= 3 ? "#ff5a5a" : "#ff9f1c",
                      fontSize: 10,
                    }}
                  >
                    {attempts}
                  </span>
                </div>
              )}
            </div>

            {/* ── CODE TAB ── */}
            {tab === "code" && (
              <>
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    overflow: "hidden",
                    background: "#030810",
                  }}
                >
                  <div
                    style={{
                      padding: "12px 8px",
                      background: "rgba(0,0,0,.5)",
                      borderRight: "1px solid #0a1820",
                      fontSize: 9.5,
                      lineHeight: "16px",
                      color: "#0a3040",
                      textAlign: "right",
                      minWidth: 30,
                      userSelect: "none",
                      overflowY: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    {code.split("\n").map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </div>
                  <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Tab") {
                        e.preventDefault();
                        const s = e.target.selectionStart,
                          end = e.target.selectionEnd;
                        const next =
                          code.slice(0, s) + "    " + code.slice(end);
                        setCode(next);
                        requestAnimationFrame(() => {
                          e.target.selectionStart = e.target.selectionEnd =
                            s + 4;
                        });
                      }
                    }}
                    spellCheck={false}
                    style={{
                      flex: 1,
                      background: "transparent",
                      border: "none",
                      color: redTint ? "#b8a870" : "#7ab888",
                      fontSize: 11.5,
                      lineHeight: "16px",
                      padding: "12px 10px",
                      tabSize: 4,
                      transition: "color .8s",
                    }}
                  />
                </div>
                <div
                  style={{
                    borderTop: "1px solid #0a1820",
                    padding: "7px 12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "#04090f",
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: "flex", gap: 10, fontSize: 8 }}>
                    <span style={{ color: "#0a3a2a" }}>
                      {code.split("\n").length}L
                    </span>
                    {attempts === 0 && !inRush && (
                      <span style={{ color: "#1a5a3a" }}>
                        ⚡ +{Math.floor(ch.xp * 0.5)} first try
                      </span>
                    )}
                    {inRush && ch.rushBonus > 0 && (
                      <span
                        style={{
                          color: "#ff9f1c",
                          animation: "blink .7s step-end infinite",
                        }}
                      >
                        ⚡ +{ch.rushBonus} speed bonus
                      </span>
                    )}
                  </div>
                  <button
                    onClick={submitCode}
                    disabled={busy || !code.trim()}
                    style={{
                      background: inRush
                        ? "rgba(255,80,20,.1)"
                        : "rgba(110,255,160,.06)",
                      border: `1px solid ${inRush ? "#ff6a2a" : "#6effa0"}`,
                      color: inRush ? "#ff9f1c" : "#6effa0",
                      padding: "7px 20px",
                      fontSize: 9,
                      letterSpacing: 2,
                      boxShadow: inRush
                        ? "0 0 20px rgba(255,100,20,.3)"
                        : "0 0 12px rgba(110,255,160,.1)",
                      animation: inRush
                        ? "timerPulse .8s ease-in-out infinite"
                        : "none",
                    }}
                    onMouseEnter={(e) => {
                      if (!e.currentTarget.disabled) {
                        e.currentTarget.style.background = inRush
                          ? "#ff6a2a"
                          : "#6effa0";
                        e.currentTarget.style.color = "#040810";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = inRush
                        ? "rgba(255,80,20,.1)"
                        : "rgba(110,255,160,.06)";
                      e.currentTarget.style.color = inRush
                        ? "#ff9f1c"
                        : "#6effa0";
                    }}
                  >
                    {busy
                      ? "TRANSMITTING..."
                      : inRush
                      ? `▸ HURRY · +${ch.xp} XP`
                      : `▸ SUBMIT · +${ch.xp} XP`}
                  </button>
                </div>
              </>
            )}

            {/* ── MISSION TAB ── */}
            {tab === "mission" && (
              <div style={{ flex: 1, overflowY: "auto", padding: "18px 18px" }}>
                <div
                  style={{
                    color: "#ff9f1c",
                    fontFamily: "'Orbitron',monospace",
                    fontSize: 13,
                    letterSpacing: 2,
                    marginBottom: 4,
                  }}
                >
                  {ch.title}
                </div>
                <div
                  style={{
                    color: "#1a5a4a",
                    fontSize: 8,
                    letterSpacing: 3,
                    marginBottom: 14,
                  }}
                >
                  {ch.sub}
                </div>
                <div
                  style={{
                    borderLeft: "3px solid #2a6a4a",
                    paddingLeft: 14,
                    marginBottom: 18,
                  }}
                >
                  {ch.brief.map((line, i) => (
                    <p
                      key={i}
                      style={{
                        color: i === 2 ? "#6effa0" : "#3a7a6a",
                        fontSize: 12,
                        lineHeight: 1.9,
                        marginBottom: 3,
                      }}
                    >
                      {line}
                    </p>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div
                    style={{
                      flex: 1,
                      border: "1px solid #0a2a1a",
                      background: "rgba(110,255,160,.015)",
                      padding: "10px 12px",
                    }}
                  >
                    <div
                      style={{
                        color: "#0a4a2a",
                        fontSize: 7,
                        letterSpacing: 3,
                        marginBottom: 6,
                      }}
                    >
                      XP BREAKDOWN
                    </div>
                    <div
                      style={{
                        fontFamily: "'Orbitron',monospace",
                        color: "#6effa0",
                        fontSize: 22,
                        fontWeight: 700,
                      }}
                    >
                      {ch.xp}
                    </div>
                    <div
                      style={{ color: "#1a6a4a", fontSize: 8, marginTop: 2 }}
                    >
                      base xp
                    </div>
                    <div
                      style={{ color: "#ff9f1c", fontSize: 8, marginTop: 4 }}
                    >
                      +{Math.floor(ch.xp * 0.5)} first try
                    </div>
                    {ch.rushBonus > 0 && (
                      <div
                        style={{ color: "#ff5a3a", fontSize: 8, marginTop: 2 }}
                      >
                        +{ch.rushBonus} speed bonus
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      border: "1px solid #0a1820",
                      padding: "10px 12px",
                    }}
                  >
                    <div
                      style={{
                        color: "#0a3a4a",
                        fontSize: 7,
                        letterSpacing: 3,
                        marginBottom: 6,
                      }}
                    >
                      EVENTS
                    </div>
                    {ch.events.map((ev, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: 9,
                          color:
                            ev.type === "rush"
                              ? "#ff9f1c"
                              : ev.type === "powercut"
                              ? "#ff5a5a"
                              : "#2a7a9a",
                          marginBottom: 4,
                        }}
                      >
                        T+{ev.at}s —{" "}
                        {ev.type === "rush"
                          ? "⚡ RUSH MODE"
                          : ev.type === "powercut"
                          ? "⚡ POWER CUT"
                          : `▸ ${ev.who}`}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── TIPS TAB ── */}
            {tab === "tips" && (
              <div style={{ flex: 1, overflowY: "auto", padding: "18px 18px" }}>
                <div
                  style={{
                    color: "#0a4a3a",
                    fontSize: 7,
                    letterSpacing: 4,
                    marginBottom: 14,
                  }}
                >
                  GO SYNTAX HINTS
                </div>
                {ch.tips.map((tip, i) => (
                  <div
                    key={i}
                    style={{
                      border: "1px solid #0a1820",
                      background: "#030810",
                      padding: "9px 12px",
                      marginBottom: 7,
                      borderLeft: "2px solid #1a6a4a",
                    }}
                  >
                    <code style={{ color: "#7ab888", fontSize: 11.5 }}>
                      {tip}
                    </code>
                  </div>
                ))}
                <div
                  style={{
                    marginTop: 18,
                    borderTop: "1px solid #0a1820",
                    paddingTop: 14,
                  }}
                >
                  <div
                    style={{
                      color: "#0a3a4a",
                      fontSize: 7,
                      letterSpacing: 3,
                      marginBottom: 8,
                    }}
                  >
                    GOBYEXAMPLE.COM
                  </div>
                  {ch.sub.split(" · ").map((concept) => (
                    <div key={concept} style={{ marginBottom: 5 }}>
                      <a
                        href={`https://gobyexample.com/${concept
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/-$/, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          color: "#00d4ff",
                          fontSize: 10,
                          textDecoration: "none",
                        }}
                      >
                        ↗ {concept}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
