#!/usr/bin/env bash
# 15秒の縦型ショート動画(1080x1920 / 30fps / H.264 + AAC)を生成する。
# 必要: node(Playwright), ffmpeg
set -euo pipefail
cd "$(dirname "$0")"
node audio.mjs
node render.mjs
ffmpeg -y -loglevel error -i out/video_noaudio.mp4 -i out/audio.wav \
  -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart out/emonounmeido_15s.mp4
# SNSのサムネイル用に、フック画面の静止画も書き出す
ffmpeg -y -loglevel error -ss 1.9 -i out/video_noaudio.mp4 -frames:v 1 out/cover.png
echo "done: promo/out/emonounmeido_15s.mp4"
