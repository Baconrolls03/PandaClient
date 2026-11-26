#!/usr/bin/env bash
# Start the real game (headless, software OpenGL), let CiCheck drive the menus, take screenshots.
set -u
export PANDACLIENT_CI=1
mkdir -p shots mod/run
printf 'onboardAccessibility:false\nnarrator:0\ntutorialStep:none\nsoundCategory_master:0.0\n' > mod/run/options.txt
( xvfb-run -a -s "-screen 0 1280x720x24" gradle -p mod runClient --no-daemon > game.log 2>&1; echo "exit $?" >> game.log ) &
for name in menu settings hud; do
  for i in $(seq 1 180); do grep -q "\[PandaClient CI\] $name" game.log && break; sleep 1; done
  sleep 3
  DISPLAY=$(ps aux | grep -oE 'Xvfb :[0-9]+' | head -1 | cut -d' ' -f2) import -window root -resize 640x360 -quality 60 "shots/$name.jpg" 2>/dev/null || echo "no screenshot for $name"
done
for i in $(seq 1 300); do grep -qE "^exit [0-9]+" game.log && break; sleep 1; done
