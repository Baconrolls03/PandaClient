#!/usr/bin/env bash
# Smoke test: start the real game headless (software OpenGL) with the mod and let CiCheck drive it.
#  1. title screen: menu, settings page, HUD editor
#  2. in a world on a local offline test server: every mod on, zoom, freelook, toggle sprint, HUD
set -u
export PANDACLIENT_CI=1
mkdir -p shots mod/run
RUN=mod/run
printf 'onboardAccessibility:false\nnarrator:0\ntutorialStep:none\nsoundCategory_master:0.0\nskipMultiplayerWarning:true\njoinedFirstServer:true\n' > $RUN/options.txt
Xvfb :99 -screen 0 1280x720x24 > /dev/null 2>&1 &
export DISPLAY=:99
sleep 2

shoot() { # wait for "[PandaClient CI] shot NAME" lines in $1 and screenshot each
  local log=$1; shift
  for name in "$@"; do
    for i in $(seq 1 240); do grep -q "\[PandaClient CI\] shot $name" "$log" 2>/dev/null && break; grep -q "^exit " "$log" && return; sleep 1; done
    sleep 2
    import -window root -resize 800x450 -quality 55 "shots/$name.jpg" 2>/dev/null || echo "no screenshot for $name"
  done
}
wait_exit() { for i in $(seq 1 300); do grep -qE "^exit [0-9]+" "$1" && return; sleep 1; done; }

echo "=== 1. title screen"
( gradle -p mod runClient --no-daemon > game.log 2>&1; echo "exit $?" >> game.log ) &
shoot game.log menu settings hud
wait_exit game.log

echo "=== 2. in a world"
printf 'eula=true\n' > $RUN/eula.txt
printf 'online-mode=false\nlevel-type=minecraft\\:flat\nspawn-protection=0\nview-distance=4\nsimulation-distance=4\ngamemode=survival\ndifficulty=peaceful\nspawn-monsters=false\nmotd=PandaClient test\n' > $RUN/server.properties
echo '[{"uuid":"5094fdee-0b25-348e-811a-b7cb2010fd98","name":"PandaTester","level":4,"bypassesPlayerLimit":false}]' > $RUN/ops.json
( gradle -p mod runServer --no-daemon > server.log 2>&1; echo "exit $?" >> server.log ) &
for i in $(seq 1 300); do grep -q "Done (" server.log && break; grep -q "^exit " server.log && break; sleep 1; done
grep -E "Done \(|ERROR|Exception" server.log | head -5
export PANDACLIENT_CI_WORLD=1
( gradle -p mod runClient --no-daemon --args="--username PandaTester --quickPlayMultiplayer localhost:25565" > world.log 2>&1; echo "exit $?" >> world.log ) &
shoot world.log ingame zoom freelook crosshair-settings hud-world
wait_exit world.log
pkill -f "net.fabricmc.devlaunchinjector" 2>/dev/null; pkill -f runServer 2>/dev/null; true
