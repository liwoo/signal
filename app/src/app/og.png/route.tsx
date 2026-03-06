import { ImageResponse } from "next/og";

export const runtime = "edge";

// OG image: 1200x630 — Maya's pixel avatar blown up with title + tagline
export function GET() {
  // Pixel size of each "block" when scaling the 64x64 icon to fill the card
  const S = 6; // scale factor for each SVG unit

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#040810",
          fontFamily: "monospace",
        }}
      >
        {/* Subtle grid overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(110,255,160,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(110,255,160,.03) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            opacity: 0.5,
          }}
        />

        {/* Left: Maya avatar blown up */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "460px",
            height: "460px",
            position: "relative",
          }}
        >
          {/* Render the favicon as scaled pixel blocks */}
          <svg
            width={64 * S}
            height={64 * S}
            viewBox="0 0 64 64"
            xmlns="http://www.w3.org/2000/svg"
            style={{ imageRendering: "pixelated" }}
          >
            <rect width="64" height="64" fill="#040810" />
            {/* Hair */}
            <rect x="12" y="24" width="26" height="6" fill="#1a1420" />
            <rect x="10" y="28" width="30" height="10" fill="#1a1420" />
            <rect x="8" y="34" width="8" height="16" fill="#1a1420" />
            <rect x="32" y="30" width="6" height="12" fill="#1a1420" />
            <rect x="14" y="26" width="22" height="6" fill="#2a2030" />
            <rect x="10" y="32" width="4" height="10" fill="#2a2030" />
            {/* Green streak */}
            <rect x="28" y="24" width="8" height="14" fill="#3a8a60" />
            <rect x="30" y="25" width="4" height="10" fill="#6effa0" opacity="0.7" />
            {/* Face */}
            <rect x="14" y="32" width="22" height="20" fill="#b08868" />
            <rect x="16" y="30" width="18" height="4" fill="#b08868" />
            <rect x="16" y="50" width="18" height="4" fill="#b08868" />
            <rect x="14" y="34" width="10" height="14" fill="#c8a080" />
            <rect x="28" y="34" width="8" height="14" fill="#8a6850" />
            {/* Eyes */}
            <rect x="15" y="38" width="8" height="6" fill="#e8ece8" />
            <rect x="27" y="38" width="8" height="6" fill="#e8ece8" />
            <rect x="17" y="39" width="5" height="5" fill="#6effa0" />
            <rect x="29" y="39" width="5" height="5" fill="#6effa0" />
            <rect x="19" y="40" width="3" height="3" fill="#081408" />
            <rect x="31" y="40" width="3" height="3" fill="#081408" />
            <rect x="15" y="37" width="8" height="2" fill="#1a1420" />
            <rect x="27" y="37" width="8" height="2" fill="#1a1420" />
            <rect x="17" y="38" width="2" height="2" fill="#ffffff" />
            <rect x="29" y="38" width="2" height="2" fill="#ffffff" />
            {/* Nose + mouth */}
            <rect x="24" y="44" width="3" height="3" fill="#8a6850" />
            <rect x="20" y="49" width="10" height="2" fill="#8a5050" />
            {/* Ears */}
            <rect x="8" y="38" width="4" height="8" fill="#b08868" />
            <rect x="38" y="38" width="4" height="8" fill="#b08868" />
            {/* Speech bubble */}
            <rect x="2" y="2" width="60" height="18" fill="#0a1a10" stroke="#6effa0" strokeWidth="1" />
            <polygon points="14,20 18,20 16,24" fill="#0a1a10" stroke="#6effa0" strokeWidth="1" />
            <rect x="14" y="19" width="5" height="2" fill="#0a1a10" />
            <text x="6" y="9" fontFamily="monospace" fontSize="5.5" fill="#6effa0" fontWeight="bold">
              fmt.Println(
            </text>
            <text x="8" y="16" fontFamily="monospace" fontSize="5.5" fill="#6effa0" fontWeight="bold">
              {'"Help Me!")'}
            </text>
          </svg>

          {/* Green glow behind avatar */}
          <div
            style={{
              position: "absolute",
              width: "300px",
              height: "300px",
              background: "radial-gradient(circle, rgba(110,255,160,0.12) 0%, transparent 70%)",
              top: "80px",
              left: "80px",
            }}
          />
        </div>

        {/* Right: Title + tagline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            paddingLeft: "40px",
            maxWidth: "620px",
          }}
        >
          <div
            style={{
              fontSize: "72px",
              fontWeight: 900,
              color: "#6effa0",
              letterSpacing: "8px",
              lineHeight: 1,
              fontFamily: "monospace",
              textShadow: "0 0 40px rgba(110,255,160,0.4)",
            }}
          >
            SIGNAL
          </div>
          <div
            style={{
              fontSize: "22px",
              color: "#b8d4a0",
              marginTop: "20px",
              lineHeight: 1.5,
              fontFamily: "monospace",
            }}
          >
            Learn Go by keeping someone alive.
          </div>
          <div
            style={{
              fontSize: "14px",
              color: "#1a5a4a",
              marginTop: "16px",
              lineHeight: 1.6,
              fontFamily: "monospace",
              maxWidth: "500px",
            }}
          >
            A narrative coding game where every challenge is a real Go problem
            and every line you write matters.
          </div>

          {/* Terminal prompt */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "32px",
              fontSize: "14px",
              fontFamily: "monospace",
            }}
          >
            <span style={{ color: "#1a5a4a" }}>$</span>
            <span style={{ color: "#6effa0" }}>go run signal.go</span>
            <span
              style={{
                width: "8px",
                height: "16px",
                background: "#6effa0",
                opacity: 0.7,
              }}
            />
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
