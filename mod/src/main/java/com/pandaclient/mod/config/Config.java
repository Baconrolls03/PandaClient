package com.pandaclient.mod.config;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.pandaclient.mod.module.Module;
import com.pandaclient.mod.module.Modules;
import com.pandaclient.mod.module.Setting;
import com.pandaclient.mod.module.hud.HudModule;
import net.fabricmc.loader.api.FabricLoader;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

/** Saves every mod's on/off state, settings and HUD position to config/pandaclient.json. */
public final class Config {
    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();
    private static final Path FILE = FabricLoader.getInstance().getConfigDir().resolve("pandaclient.json");
    private static long dirtyAt = -1;

    private Config() {}

    public static void markDirty() { if (dirtyAt < 0) dirtyAt = System.currentTimeMillis(); }

    /** Called each tick: writes the file a moment after the last change. */
    public static void tick() {
        if (dirtyAt >= 0 && System.currentTimeMillis() - dirtyAt > 1500) { save(); }
    }

    public static void load() {
        if (!Files.exists(FILE)) return;
        try {
            JsonObject root = JsonParser.parseString(Files.readString(FILE, StandardCharsets.UTF_8)).getAsJsonObject();
            if (root.has("menuKey")) Modules.MENU_KEY.load(root.get("menuKey"));
            if (root.has("theme")) Modules.THEME.load(root.get("theme"));
            JsonObject mods = root.has("mods") ? root.getAsJsonObject("mods") : new JsonObject();
            for (Module m : Modules.all()) {
                if (!mods.has(m.id)) continue;
                JsonObject o = mods.getAsJsonObject(m.id);
                if (o.has("enabled")) m.setEnabled(o.get("enabled").getAsBoolean());
                JsonObject s = o.has("settings") ? o.getAsJsonObject("settings") : new JsonObject();
                for (Setting<?> set : m.settings) if (s.has(set.id)) {
                    try { set.load(s.get(set.id)); } catch (RuntimeException ignored) {}
                }
                if (m instanceof HudModule h && o.has("hud")) h.loadPosition(o.getAsJsonObject("hud"));
            }
        } catch (Exception e) {
            System.err.println("[PandaClient] Could not read " + FILE + ": " + e);
        }
    }

    public static void save() {
        dirtyAt = -1;
        JsonObject root = new JsonObject();
        root.addProperty("version", 1);
        root.add("menuKey", Modules.MENU_KEY.save());
        root.add("theme", Modules.THEME.save());
        JsonObject mods = new JsonObject();
        for (Module m : Modules.all()) {
            JsonObject o = new JsonObject();
            o.addProperty("enabled", m.enabled());
            JsonObject s = new JsonObject();
            for (Setting<?> set : m.settings) s.add(set.id, set.save());
            o.add("settings", s);
            if (m instanceof HudModule h) o.add("hud", h.savePosition());
            mods.add(m.id, o);
        }
        root.add("mods", mods);
        try {
            Files.createDirectories(FILE.getParent());
            Path tmp = FILE.resolveSibling("pandaclient.json.tmp");
            Files.writeString(tmp, GSON.toJson(root), StandardCharsets.UTF_8);
            Files.move(tmp, FILE, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        } catch (Exception e) {
            System.err.println("[PandaClient] Could not save " + FILE + ": " + e);
        }
    }
}
