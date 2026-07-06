#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUTPUT="${ROOT}/replylane-demo.mp4"
TEMP_DIR="${ROOT}/demo/temp"
mkdir -p "$TEMP_DIR"

BG="0x1C1C1C"
PRIMARY="0x58C4DD"
SECONDARY="0x83C167"
ACCENT="0xFFFF00"
TEXT="0xFFFFFF"
DIM="0x888888"
BLUE="0x58A6FF"

FONT="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REGULAR="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

scene() {
  local id="$1"
  local duration="$2"
  shift 2
  ffmpeg -y -f lavfi -i "color=c=$BG:s=1920x1080:d=$duration" \
    -vf "$*" \
    -c:v libx264 -pix_fmt yuv420p "$TEMP_DIR/scene${id}.mp4" 2>/dev/null
}

echo "Scene 1: Hook"
scene 1 4 \
  "drawtext=text='ReplyLane v0.1.0':fontsize=64:fontcolor=$PRIMARY:x=(w-text_w)/2:y=320:fontfile=$FONT,\
drawtext=text='X reply intelligence for strategic growth':fontsize=30:fontcolor=$TEXT:x=(w-text_w)/2:y=430:fontfile=$FONT_REGULAR"

echo "Scene 2: Install"
scene 2 5 \
  "drawtext=text='Install':fontsize=42:fontcolor=$PRIMARY:x=360:y=260:fontfile=$FONT,\
drawtext=text='npm install -g @talocode/replylane':fontsize=34:fontcolor=$TEXT:x=360:y=400:fontfile=$FONT_REGULAR,\
drawtext=text='Works on Linux, macOS, and Windows':fontsize=24:fontcolor=$DIM:x=360:y=500:fontfile=$FONT_REGULAR"

echo "Scene 3: Opportunity"
scene 3 6 \
  "drawtext=text='Score reply opportunities':fontsize=42:fontcolor=$PRIMARY:x=360:y=220:fontfile=$FONT,\
drawtext=text='replylane opportunity --text ... --author builder':fontsize=28:fontcolor=$TEXT:x=360:y=360:fontfile=$FONT_REGULAR,\
drawtext=text='Timing + author size + reply competition':fontsize=24:fontcolor=$SECONDARY:x=360:y=460:fontfile=$FONT_REGULAR"

echo "Scene 4: Draft + Risk"
scene 4 6 \
  "drawtext=text='Draft replies and check deboost risk':fontsize=38:fontcolor=$PRIMARY:x=360:y=220:fontfile=$FONT,\
drawtext=text='replylane draft --text ... --niche SaaS':fontsize=28:fontcolor=$TEXT:x=360:y=360:fontfile=$FONT_REGULAR,\
drawtext=text='replylane risk --text your-reply-draft':fontsize=28:fontcolor=$TEXT:x=360:y=430:fontfile=$FONT_REGULAR"

echo "Scene 5: Grok check"
scene 5 5 \
  "drawtext=text='Grok compatibility check':fontsize=42:fontcolor=$ACCENT:x=360:y=280:fontfile=$FONT,\
drawtext=text='replylane grok-check --text post-draft':fontsize=30:fontcolor=$TEXT:x=360:y=400:fontfile=$FONT_REGULAR,\
drawtext=text='Constructive tone scores get wider distribution':fontsize=24:fontcolor=$DIM:x=360:y=500:fontfile=$FONT_REGULAR"

echo "Scene 6: Cloud API"
scene 6 6 \
  "drawtext=text='Talocode Cloud API':fontsize=42:fontcolor=$PRIMARY:x=360:y=240:fontfile=$FONT,\
drawtext=text='export TALOCODE_API_KEY=tc_...':fontsize=28:fontcolor=$TEXT:x=360:y=360:fontfile=$FONT_REGULAR,\
drawtext=text='api.talocode.site/v1/replylane/*':fontsize=30:fontcolor=$BLUE:x=360:y=440:fontfile=$FONT_REGULAR"

echo "Scene 7: CTA"
scene 7 5 \
  "drawtext=text='ReplyLane by Talocode':fontsize=64:fontcolor=$PRIMARY:x=(w-text_w)/2:y=300:fontfile=$FONT,\
drawtext=text='github.com/talocode/replylane':fontsize=34:fontcolor=$BLUE:x=(w-text_w)/2:y=430:fontfile=$FONT_REGULAR,\
drawtext=text='Human-in-the-loop. No auto-posting bots.':fontsize=24:fontcolor=$DIM:x=(w-text_w)/2:y=520:fontfile=$FONT_REGULAR"

cat > "$TEMP_DIR/concat.txt" << EOF
file 'scene1.mp4'
file 'scene2.mp4'
file 'scene3.mp4'
file 'scene4.mp4'
file 'scene5.mp4'
file 'scene6.mp4'
file 'scene7.mp4'
EOF

ffmpeg -y -f concat -safe 0 -i "$TEMP_DIR/concat.txt" -c copy "$OUTPUT" 2>/dev/null
echo "Created $OUTPUT"