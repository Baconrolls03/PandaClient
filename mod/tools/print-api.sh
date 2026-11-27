#!/usr/bin/env bash
# Print the public signatures (javap) of the classes in tools/api.txt for one group (no source code).
set -u
GROUP="${1:-1}"
jars=$(find "$HOME/.gradle" mod/.gradle -name '*.jar' 2>/dev/null | grep -Ev 'sources|javadoc')
find_jar() { for j in $jars; do if unzip -l "$j" 2>/dev/null | grep -q " $1\$"; then echo "$j"; return; fi; done; }
CP="$(find_jar 'net/minecraft/client/gui/GuiGraphics.class')"
for c in net/fabricmc/fabric/api/client/rendering/v1/hud/HudElementRegistry.class \
         net/fabricmc/fabric/api/client/keybinding/v1/KeyBindingHelper.class \
         net/fabricmc/fabric/api/client/event/lifecycle/v1/ClientTickEvents.class; do CP="$CP:$(find_jar $c)"; done
for f in $(echo "$jars" | grep -E '/(joml|lwjgl-glfw|datafixerupper|brigadier|authlib|guava)-[0-9]' ); do CP="$CP:$f"; done
MCJAR="${CP%%:*}"
grep -v '^#' mod/tools/api.txt | grep "^$GROUP|" | while IFS='|' read -r g cls priv filter; do
  if [ "${cls#FIND:}" != "$cls" ]; then
    echo "== classes matching ${cls#FIND:}"
    unzip -l "$MCJAR" | grep -oE "net/minecraft/[A-Za-z0-9_/$]*\.class" | grep -iE "${cls#FIND:}" | grep -v '\$' | head -25
    continue
  fi
  echo "== $cls"
  if [ "$priv" = c ]; then
    # bytecode of the methods whose signature matches the filter
    javap -cp "$CP" -c -p "$cls" 2>&1 | awk -v re="$filter" '
      /^  [a-zA-Z].*\(.*\).*;$|^  [a-zA-Z].*\(.*\).*\{?$/ { show = ($0 ~ re) }
      show { print }' | sed -E 's/net\/minecraft\///g; s/com\/mojang\///g; s/^ +//' | grep -v '^$' | head -260
    continue
  fi
  flag=-public; [ "$priv" = p ] && flag=-p
  javap -cp "$CP" $flag "$cls" 2>&1 | grep -E "$filter" | sed -E 's/^  //; s/(public|final|java\.lang\.|net\.minecraft\.|com\.mojang\.) ?//g' | head -90
done
