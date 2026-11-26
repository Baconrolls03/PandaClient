#!/usr/bin/env bash
# Print public signatures (javap) of the classes the mod talks to. No source code is printed.
set -u
find_jar() { # $1 = class file path inside the jar
  for j in $(find "$HOME/.gradle" mod/.gradle -name '*.jar' 2>/dev/null); do
    if unzip -l "$j" 2>/dev/null | grep -q " $1\$"; then echo "$j"; return; fi
  done
}
MC=$(find_jar 'net/minecraft/client/gui/GuiGraphics.class')
echo "Minecraft jar: $MC"
CP="$MC"
for c in 'net/fabricmc/fabric/api/client/rendering/v1/hud/HudElementRegistry.class' \
         'net/fabricmc/fabric/api/client/keybinding/v1/KeyBindingHelper.class' \
         'net/fabricmc/fabric/api/client/event/lifecycle/v1/ClientTickEvents.class' \
         'net/fabricmc/fabric/api/client/rendering/v1/hud/VanillaHudElements.class'; do
  j=$(find_jar "$c"); echo "Fabric: $c -> $j"; CP="$CP:$j"
done
for f in $(find "$HOME/.gradle" -name 'lwjgl-glfw-*.jar' | head -1) $(find "$HOME/.gradle" -name 'joml-*.jar' | head -1); do CP="$CP:$f"; done
classes=$(cat mod/tools/api-classes.txt | grep -v '^#' | grep -v '^$')
for k in $classes; do
  echo "===== $k"
  javap -cp "$CP" -public "$k" 2>&1 | head -120
done
for k in $(grep -v '^#' mod/tools/mixin-classes.txt | grep -v '^$'); do
  echo "===== (private) $k"
  javap -cp "$CP" -p "$k" 2>&1 | grep '(' | head -150
done
