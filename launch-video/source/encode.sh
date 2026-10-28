#!/bin/bash
# encode.sh <horizontal|vertical> <output.mp4>
set -e
fmt="$1"; out="$2"
ffmpeg -v error -stats -y -framerate 60 -i "$(dirname "$0")/frames/$fmt/f%05d.png" \
  -i "$(dirname "$0")/../../music/Rap Intro.wav" \
  -filter_complex "[0:v]tmix=frames=2:weights='1 1',fps=30,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p[v]" \
  -map "[v]" -map 1:a \
  -c:v libx264 -preset slow -crf 14 -profile:v high -level 4.2 -pix_fmt yuv420p \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -c:a aac -b:a 320k -ar 48000 -shortest -movflags +faststart "$out"
ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height,r_frame_rate -of default=nw=1 "$out"
