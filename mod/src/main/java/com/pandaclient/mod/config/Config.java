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
    /** The launcher passes one shared file for all instances (-Dpandaclient.config); otherwise this instance's config folder. */
    private static final Path LOCAL = FabricLoader.getInstance().getConfigDir().resolve("pandaclient.json");
    private static final Path FILE = System.getProperty("pandaclient.config") != null ? Path.of(System.getProperty("pandaclient.config")) : LOCAL;
    private static long dirtyAt = -1;

    private Config() {}

    public static void markDirty() { if (dirtyAt < 0) dirtyAt = System.currentTimeMillis(); }

    /** Called each tick: writes the file a moment after the last change. */
    public static void tick() {
        if (dirtyAt >= 0 && System.currentTimeMillis() - dirtyAt > 1500) { save(); }
    }

    public static void load() {
        // First run with shared settings: start from this instance's own settings.
        if (!Files.exists(FILE) && !FILE.equals(LOCAL) && Files.exists(LOCAL)) {
            try { Files.createDirectories(FILE.getParent()); Files.copy(LOCAL, FILE); } catch (Exception ignored) {}
        }
        if (!Files.exists(FILE)) return;
        try {
            JsonObject root = JsonParser.parseString(Files.readString(FILE, StandardCharsets.UTF_8)).getAsJsonObject();
            if (root.has("profile")) profile = root.get("profile").getAsString();
            apply(root, false);
        } catch (Exception e) {
            System.err.println("[PandaClient] Could not read " + FILE + ": " + e);
        }
    }

    /** Apply a saved setup. {@code full} = reset first so missing values go back to defaults. */
    private static void apply(JsonObject root, boolean full) {
        if (full) resetAll();
        {
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
        }
    }

    /** A file next to PandaClient's settings (shared with the launcher). */
    public static Path sibling(String name) { return FILE.resolveSibling(name); }

    private static String presence = "";
    /** Tell the launcher which server you're on (friends can see it and join). */
    private static long presenceAt;

    /** Where you're playing, for the launcher (friends and your party see it). Written when it changes and every minute. */
    public static void writePresence(String server) {
        String s = server == null ? "" : server;
        if (s.equals(presence) && System.currentTimeMillis() - presenceAt < 60_000) return;
        presence = s;
        presenceAt = System.currentTimeMillis();
        JsonObject o = new JsonObject();
        o.addProperty("server", s);
        o.addProperty("updated", System.currentTimeMillis());
        write(FILE.resolveSibling("pandaclient-presence.json"), o);
    }

    /** Name of the active layout profile. */
    public static String profile = "Default";
    public static final String[] PROFILES = {"Default", "PvP", "Survival", "Recording"};

    public static void save() {
        dirtyAt = -1;
        JsonObject root = toJson();
        root.addProperty("profile", profile);
        write(FILE, root);
    }

    private static void write(Path file, JsonObject root) {
        try {
            Files.createDirectories(file.getParent());
            Path tmp = file.resolveSibling(file.getFileName() + ".tmp");
            Files.writeString(tmp, GSON.toJson(root), StandardCharsets.UTF_8);
            Files.move(tmp, file, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        } catch (Exception e) {
            System.err.println("[PandaClient] Could not save " + file + ": " + e);
        }
    }

    private static Path profileFile(String name) { return FILE.resolveSibling("pandaclient-profile-" + name.toLowerCase(java.util.Locale.ROOT) + ".json"); }

    /** Switch layout profile: keep the current setup in its slot, load the other (a new slot starts as a copy). */
    public static void switchProfile(String name) {
        if (name.equals(profile)) return;
        write(profileFile(profile), toJson());
        Path next = profileFile(name);
        if (Files.exists(next)) {
            try { apply(JsonParser.parseString(Files.readString(next, StandardCharsets.UTF_8)).getAsJsonObject(), true); } catch (Exception ignored) {}
        }
        profile = name;
        save();
    }

    /** Everything back to how PandaClient starts out (modules, settings and HUD positions). */
    public static void resetAll() {
        for (Module m : Modules.all()) {
            m.setEnabled(m.enabledByDefault);
            for (Setting<?> set : m.settings) { set.reset(); if (set instanceof Setting.Color c) c.chroma = false; }
            if (m instanceof HudModule h) h.resetPosition();
        }
        markDirty();
    }

    /** The whole setup as a short text you can paste to a friend. */
    public static String exportString() {
        byte[] raw = toJson().toString().getBytes(StandardCharsets.UTF_8);
        return "PANDA1:" + java.util.Base64.getEncoder().encodeToString(raw);
    }
    public static boolean importString(String s) {
        try {
            s = s.trim();
            if (!s.startsWith("PANDA1:")) return false;
            String json = new String(java.util.Base64.getDecoder().decode(s.substring(7)), StandardCharsets.UTF_8);
            apply(JsonParser.parseString(json).getAsJsonObject(), true);
            markDirty();
            return true;
        } catch (Exception e) { return false; }
    }

    public static JsonObject toJson() {
        JsonObject root = new JsonObject();
        root.addProperty("version", 1);
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
        return root;
    }
}
