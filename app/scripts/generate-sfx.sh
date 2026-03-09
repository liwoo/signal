#!/usr/bin/env bash
# Generate synthetic sci-fi sound effects using ffmpeg
# All outputs are .ogg (Vorbis) files, 0.5-2 seconds long
# Run: bash scripts/generate-sfx.sh

set -euo pipefail

OUT_DIR="$(dirname "$0")/../public/audio/sfx"
mkdir -p "$OUT_DIR"

echo "Generating sci-fi SFX into $OUT_DIR ..."

# 1. weapon-charge.ogg — rising frequency sweep (200Hz -> 2000Hz over 1.5s) with slight distortion
echo "  weapon-charge.ogg"
ffmpeg -y -f lavfi -i "sine=frequency=200:duration=1.5" \
  -af "asetrate=44100*1.5,aresample=44100,atempo=0.667,vibrato=f=8:d=0.3,afade=t=in:st=0:d=0.1,afade=t=out:st=1.2:d=0.3,volume=0.7" \
  -c:a libvorbis -q:a 5 "$OUT_DIR/weapon-charge.ogg" 2>/dev/null

# Alternative approach using aeval for a proper frequency sweep
ffmpeg -y -f lavfi -i "aevalsrc=sin(2*PI*(200+1200*t/1.5)*t):s=44100:d=1.5" \
  -af "afade=t=in:st=0:d=0.05,afade=t=out:st=1.2:d=0.3,volume=0.6" \
  -c:a libvorbis -q:a 5 "$OUT_DIR/weapon-charge.ogg" 2>/dev/null

# 2. laser-fire.ogg — short descending sweep (3000Hz -> 200Hz) over 0.3s
echo "  laser-fire.ogg"
ffmpeg -y -f lavfi -i "aevalsrc=sin(2*PI*(3000-2800*t/0.3)*t)*exp(-3*t):s=44100:d=0.4" \
  -af "afade=t=out:st=0.2:d=0.2,volume=0.7" \
  -c:a libvorbis -q:a 5 "$OUT_DIR/laser-fire.ogg" 2>/dev/null

# 3. explosion-small.ogg — noise burst with exponential decay
echo "  explosion-small.ogg"
ffmpeg -y -f lavfi -i "anoisesrc=d=0.8:c=pink:a=0.8" \
  -af "lowpass=f=800,afade=t=in:st=0:d=0.01,afade=t=out:st=0.1:d=0.7,volume=0.8" \
  -c:a libvorbis -q:a 5 "$OUT_DIR/explosion-small.ogg" 2>/dev/null

# 4. shield-break.ogg — descending glassy tone + noise burst
echo "  shield-break.ogg"
ffmpeg -y -f lavfi \
  -i "aevalsrc=sin(2*PI*(1500-1000*t/0.6)*t)*exp(-4*t):s=44100:d=0.8" \
  -f lavfi \
  -i "anoisesrc=d=0.8:c=white:a=0.3" \
  -filter_complex "[0][1]amix=inputs=2:duration=shortest,highpass=f=400,afade=t=in:st=0:d=0.01,afade=t=out:st=0.4:d=0.4,volume=0.7" \
  -c:a libvorbis -q:a 5 "$OUT_DIR/shield-break.ogg" 2>/dev/null

# 5. target-lock.ogg — two short beeps (electronic targeting)
echo "  target-lock.ogg"
ffmpeg -y -f lavfi \
  -i "aevalsrc=sin(2*PI*1800*t)*(gt(t\,0)+gt(t\,0.15))*0.5:s=44100:d=0.5" \
  -af "agate=threshold=0.01,afade=t=out:st=0.35:d=0.15,volume=0.5" \
  -c:a libvorbis -q:a 5 "$OUT_DIR/target-lock.ogg" 2>/dev/null

# Simpler approach: two distinct beep tones
ffmpeg -y -f lavfi \
  -i "aevalsrc=sin(2*PI*1800*t)*(between(t\,0\,0.1)+between(t\,0.2\,0.3))*0.5:s=44100:d=0.5" \
  -af "afade=t=out:st=0.35:d=0.15,volume=0.5" \
  -c:a libvorbis -q:a 5 "$OUT_DIR/target-lock.ogg" 2>/dev/null

# 6. hit-confirm.ogg — short rising two-tone confirmation beep
echo "  hit-confirm.ogg"
ffmpeg -y -f lavfi \
  -i "aevalsrc=(sin(2*PI*800*t)*between(t\,0\,0.08)+sin(2*PI*1200*t)*between(t\,0.1\,0.2))*0.6:s=44100:d=0.3" \
  -af "afade=t=out:st=0.18:d=0.12,volume=0.5" \
  -c:a libvorbis -q:a 5 "$OUT_DIR/hit-confirm.ogg" 2>/dev/null

# 7. boss-hit.ogg — heavy low impact with distortion
echo "  boss-hit.ogg"
ffmpeg -y -f lavfi \
  -i "aevalsrc=sin(2*PI*80*t)*exp(-5*t)*0.9:s=44100:d=1.0" \
  -f lavfi \
  -i "anoisesrc=d=1.0:c=brown:a=0.6" \
  -filter_complex "[0][1]amix=inputs=2:duration=shortest,lowpass=f=400,afade=t=in:st=0:d=0.01,afade=t=out:st=0.3:d=0.7,volume=0.9" \
  -c:a libvorbis -q:a 5 "$OUT_DIR/boss-hit.ogg" 2>/dev/null

# 8. countdown-tick.ogg — short sharp click/tick
echo "  countdown-tick.ogg"
ffmpeg -y -f lavfi \
  -i "aevalsrc=sin(2*PI*1000*t)*exp(-30*t)*0.7:s=44100:d=0.15" \
  -af "volume=0.6" \
  -c:a libvorbis -q:a 5 "$OUT_DIR/countdown-tick.ogg" 2>/dev/null

echo ""
echo "Done! Generated 8 SFX files:"
ls -la "$OUT_DIR"/{weapon-charge,laser-fire,explosion-small,shield-break,target-lock,hit-confirm,boss-hit,countdown-tick}.ogg
