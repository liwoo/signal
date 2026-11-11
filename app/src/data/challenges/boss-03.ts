import type { Challenge, LanguageId } from "@/types/game";

// ── Boss 3 · KIRA · ALLEGIANCE ──
// The judgment boss (spec/levels/boss-03-kira-allegiance.md): no hearts, no
// game over, no kill-timer. The player studies Kira's six-line encoder, marks
// the lines that betray the stream, writes WHY in plain words, and gives a
// verdict that sets Act IV's branch. An optional redemption rewrites the
// encoder safely, graded in the real sandbox. Logic: src/lib/game/allegiance.ts.

export const boss03: Challenge = {
  id: "boss-03",
  act: 3,
  chapter: 16,
  title: "KIRA · ALLEGIANCE",
  location: "DOCK RELAY · KIRA'S CHANNEL",
  concepts: ["reading code", "slices share memory", "copy before you send"],
  steps: [], // judged, not stepped
  events: [],
  timer: { timeLimitSeconds: 0, gameOverOnExpiry: false },
  isBoss: true,
  parTimeSeconds: 0,
};

/** One language's version of Kira's encoder and the redemption that fixes it. */
export interface AllegianceRealization {
  /** Kira's transmit, one string per displayed line (read-only). */
  kiraCode: string[];
  /** Lines (0-based) the player must mark: the mutation and the alias that ships it. */
  suspectLines: number[];
  /** Lines it's fair to mark too (where the alias is created), never counted wrong. */
  acceptableLines: number[];
  /** Maya's one free syntax assist during the study phase. */
  syntaxAssist: string;
  /** The name of the zero-copy view in this language — for the grader and Maya's lines. */
  viewWord: string;
  /** Redemption: what the editor opens with (Kira's code, renamed). */
  fixStarter: string;
  fixHarness: string;
  /** Any one of these must appear in the fix — the copy that freezes a frame. */
  fixUsesAnyOf: string[];
  /** A correct fix, for tests. */
  fixReference: string;
}

/** Reeves' dock-4 loopback: payload 10 20 30 40, mask FF, checksum = byte-sum mod 256. */
export const RECEIVER_LOG: string[] = [
  "frame 0 sent as: EF 20 30 40   checksum 7F",
  "frame 1 sent as: DF 30 40      checksum 4F",
  "frame 2 sent as: CF 40         checksum 0F",
  "frame 3 sent as: BF            checksum BF",
  "--- receiver reads buffer ---",
  "frame 0 now:     EF DF CF BF   checksum 5C   MISMATCH",
  "frame 1 now:     DF CF BF      checksum 6D   MISMATCH",
  "frame 2 now:     CF BF         checksum 8E   MISMATCH",
  "frame 3 now:     BF            checksum BF   ok",
];

export const FIX_EXPECTED_OUTPUT = [
  "frame 0: EF 20 30 40",
  "frame 1: DF 30 40",
  "frame 2: CF 40",
  "frame 3: BF",
  "stream integrity: OK - frames froze at send time",
].join("\n");

const GO: AllegianceRealization = {
  kiraCode: [
    "func transmit(data []byte, ch chan<- []byte) {",
    "    for i := range data {",
    "        data[i] ^= 0xFF",
    "        ch <- data[i:]",
    "    }",
    "}",
  ],
  suspectLines: [2, 3],
  acceptableLines: [],
  syntaxAssist: "`chan<- []byte` just means send-only. a restriction, not a new machine.",
  viewWord: "slice",
  fixStarter: `package main

import "fmt"

func transmitSafe(data []byte, ch chan<- []byte) {
	for i := range data {
		data[i] ^= 0xFF
		ch <- data[i:]
	}
}

func main() {
	fmt.Println("rewrite transmitSafe so every frame freezes when it's sent")
}
`,
  fixHarness: `func main() {
	data := []byte{0x10, 0x20, 0x30, 0x40}
	ch := make(chan []byte, len(data))
	transmitSafe(data, ch)
	close(ch)
	frames := [][]byte{}
	for f := range ch {
		frames = append(frames, f)
	}
	for i, f := range frames {
		fmt.Printf("frame %d: % X\\n", i, f)
	}
	if frames[0][1] == 0x20 && frames[0][2] == 0x30 && frames[0][3] == 0x40 {
		fmt.Println("stream integrity: OK - frames froze at send time")
	} else {
		fmt.Println("stream integrity: CORRUPTED - frames mutated after send")
	}
}`,
  fixUsesAnyOf: ["copy(", "append([]byte"],
  fixReference: `package main

import "fmt"

func transmitSafe(data []byte, ch chan<- []byte) {
	for i := range data {
		data[i] ^= 0xFF
		frame := make([]byte, len(data)-i)
		copy(frame, data[i:])
		ch <- frame
	}
}

func main() {
	fmt.Println("ok")
}
`,
};

const PYTHON: AllegianceRealization = {
  kiraCode: [
    "def transmit(data, ch):",
    "    view = memoryview(data)",
    "    for i in range(len(data)):",
    "        data[i] ^= 0xFF",
    "        ch.put(view[i:])",
  ],
  suspectLines: [3, 4],
  acceptableLines: [1],
  syntaxAssist: "`memoryview(data)` is a window onto the same bytes — no copy. `ch.put` just queues it for the receiver.",
  viewWord: "memoryview",
  fixStarter: `def transmit_safe(data, ch):
    view = memoryview(data)
    for i in range(len(data)):
        data[i] ^= 0xFF
        ch.put(view[i:])
`,
  fixHarness: `import queue
data = bytearray([0x10, 0x20, 0x30, 0x40])
ch = queue.SimpleQueue()
transmit_safe(data, ch)
frames = []
while not ch.empty():
    frames.append(bytes(ch.get()))
for i, f in enumerate(frames):
    print(f"frame {i}: {f.hex(' ').upper()}")
if frames[0][1:] == bytes([0x20, 0x30, 0x40]):
    print("stream integrity: OK - frames froze at send time")
else:
    print("stream integrity: CORRUPTED - frames mutated after send")`,
  fixUsesAnyOf: ["bytes(", "bytearray(", ".tobytes()", "copy"],
  fixReference: `def transmit_safe(data, ch):
    for i in range(len(data)):
        data[i] ^= 0xFF
        ch.put(bytes(data[i:]))
`,
};

const JAVASCRIPT: AllegianceRealization = {
  kiraCode: [
    "function transmit(data, ch) {",
    "  for (let i = 0; i < data.length; i++) {",
    "    data[i] ^= 0xff;",
    "    ch.push(data.subarray(i));",
    "  }",
    "}",
  ],
  suspectLines: [2, 3],
  acceptableLines: [],
  syntaxAssist: "`data` is a Uint8Array — raw bytes. `subarray(i)` and `slice(i)` look alike. they are not.",
  viewWord: "subarray",
  fixStarter: `function transmitSafe(data, ch) {
  for (let i = 0; i < data.length; i++) {
    data[i] ^= 0xff;
    ch.push(data.subarray(i));
  }
}
`,
  fixHarness: `const data = new Uint8Array([0x10, 0x20, 0x30, 0x40]);
const ch = [];
transmitSafe(data, ch);
const hex = (f) => [...f].map((b) => b.toString(16).toUpperCase().padStart(2, "0")).join(" ");
ch.forEach((f, i) => console.log(\`frame \${i}: \${hex(f)}\`));
if (ch[0][1] === 0x20 && ch[0][2] === 0x30 && ch[0][3] === 0x40) console.log("stream integrity: OK - frames froze at send time");
else console.log("stream integrity: CORRUPTED - frames mutated after send");`,
  fixUsesAnyOf: [".slice(", "Uint8Array.from", "new Uint8Array(", "[..."],
  fixReference: `function transmitSafe(data, ch) {
  for (let i = 0; i < data.length; i++) {
    data[i] ^= 0xff;
    ch.push(data.slice(i));
  }
}
`,
};

export const ALLEGIANCE: Record<LanguageId, AllegianceRealization> = {
  go: GO,
  python: PYTHON,
  javascript: JAVASCRIPT,
};

/** Who speaks on the channel during the encounter, and when. */
export interface AllegianceLine {
  who: "KIRA" | "REEVES" | "MAYA" | "GHOST" | "SYS";
  text: string;
}

export const ALLEGIANCE_LINES = {
  studyOpen: { who: "KIRA", text: "Six lines. Run the loopback if you don't believe me — oh. You already did." },
  studyLog: { who: "REEVES", text: "Frame three is the only honest frame in that log. Ask yourself why." },
  studyNudge: { who: "MAYA", text: "look at what the log says changed. then find who's still holding a pen on those bytes." },
  verdictOpen: { who: "MAYA", text: "she's listening on this channel. whatever i decide, she knows the moment i decide it." },
  verdict120: { who: "KIRA", text: "No clock this time. I wanted you thinking, not typing. Take your time — it's my code you're judging." },
  verdict240: { who: "GHOST", text: "T-MINUS 8 HOURS. PERSONNEL AUDIT ONGOING: K. VOLKOV — RESOLUTION PENDING." },
  verdict300: { who: "REEVES", text: "Maya. Bravo will not hold the dock forever. Whatever you see in it — say it." },
  contradiction: { who: "MAYA", text: "you just proved she's rewriting frames after they're sent. and you still want her in the stream?" },
  luckyGuess: { who: "MAYA", text: "you're right not to trust her. but suspicion isn't a read — say what the code actually does to the frames." },
  fixOpen: { who: "REEVES", text: "Before we move — show me how it should have been written." },
  fixFinalCall: { who: "SYS", text: "DOCK 4 WINDOW: FINAL CALL" },
} satisfies Record<string, AllegianceLine>;

export const ALLEGIANCE_TWISTS = {
  rejected: {
    headline: "VERDICT: REJECT",
    lines: [
      "> verdict transmitted: REJECT",
      "> kira: you actually read it. do you know how few people read?",
      "> kira: no hard feelings, maya. but the price just went up.",
      "> channel K.VOLKOV — closed from the far end",
      "> LOCKDOWN INITIATED — FLOORS 1–4 — EXIT CORRIDOR REROUTING",
      "> reeves: The code was a loyalty test with the polarity reversed. You passed by failing her.",
      "> maya: she never wanted to help the escape. she wanted to own the stream. we go the hard way.",
    ],
  },
  trusted: {
    headline: "VERDICT: TRUST",
    lines: [
      "> verdict transmitted: TRUST",
      "> kira: smart. three cameras on the exit corridor just went dark. call it a down payment.",
      "> transmit deployed to extraction pipeline — encoder ACTIVE",
      "> [background] frame checksums drifting — 3 of 4 mismatch — logged, unread",
      "> reeves: I hope you understand what you have signed, Maya. She most certainly does.",
      "> maya: she's inside our stream now. i can feel it. but the cameras really are dark.",
      "> somewhere in the corrupted frames, something is being written. not by maya.",
    ],
  },
} as const;
