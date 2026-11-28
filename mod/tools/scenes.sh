#!/usr/bin/env bash
# Lobby scenes: start a real generated world, let CiScenes visit good-looking places at sunset/sunrise and capture
# the lobby's 3D panorama at each, then turn the pictures into the mod's built-in lobby places.
set -u
export PANDACLIENT_CI_SCENES=1
RUN=mod/run
mkdir -p $RUN
printf 'onboardAccessibility:false\nnarrator:0\ntutorialStep:none\nsoundCategory_master:0.0\nskipMultiplayerWarning:true\njoinedFirstServer:true\nrenderDistance:12\npauseOnLostFocus:false\ngraphicsMode:1\n' > $RUN/options.txt
Xvfb :99 -screen 0 1280x720x24 > /dev/null 2>&1 &
export DISPLAY=:99
sleep 2
printf 'eula=true\n' > $RUN/eula.txt
printf 'online-mode=false\nlevel-seed=pandaclient\nspawn-protection=0\nview-distance=12\nsimulation-distance=4\ngamemode=creative\ndifficulty=peaceful\nspawn-monsters=false\nmotd=PandaClient scenes\n' > $RUN/server.properties
echo '[{"uuid":"5094fdee-0b25-348e-811a-b7cb2010fd98","name":"PandaTester","level":4,"bypassesPlayerLimit":false}]' > $RUN/ops.json
( gradle -p mod runServer --no-daemon > server.log 2>&1; echo "exit $?" >> server.log ) &
for i in $(seq 1 600); do grep -q "Done (" server.log && break; grep -q "^exit " server.log && break; sleep 1; done
grep -E "Done \(|ERROR" server.log | head -5
( gradle -p mod runClient --no-daemon --args="--username PandaTester --quickPlayMultiplayer localhost:25565" > scenes.log 2>&1; echo "exit $?" >> scenes.log ) &
for i in $(seq 1 2400); do grep -qE "^exit [0-9]+" scenes.log && break; sleep 1; done
grep -E "\[PandaClient CI\]|Exception|Crash" scenes.log | head -80
pkill -f "net.fabricmc.devlaunchinjector" 2>/dev/null; pkill -f runServer 2>/dev/null

OUT=mod/src/main/resources/assets/pandaclient/lobby
mkdir -p $OUT shots
for f in $RUN/ci-scenes/*.png; do
  [ -f "$f" ] || continue
  n=$(basename "$f" .png)
  convert "$f" -quality 88 "$OUT/$n.jpg"
done
cp $RUN/ci-scenes/*.stage $OUT/ 2>/dev/null
ls $OUT > $OUT/index.txt.tmp; grep '\.stage$' $OUT/index.txt.tmp | sed 's/\.stage$//' > $OUT/index.txt; rm $OUT/index.txt.tmp
echo "scenes:"; cat $OUT/index.txt
# previews: each place's four sides in a row
for s in $(cat $OUT/index.txt); do
  convert "$OUT/${s}_3.jpg" "$OUT/${s}_0.jpg" "$OUT/${s}_1.jpg" "$OUT/${s}_2.jpg" +append -resize 1600x "shots/scene-$s.jpg"
done
