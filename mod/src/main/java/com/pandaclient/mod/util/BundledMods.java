package com.pandaclient.mod.util;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.mojang.blaze3d.platform.NativeImage;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.client.Minecraft;
import net.minecraft.client.renderer.texture.DynamicTexture;
import net.minecraft.resources.Identifier;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;

/**
 * The popular mods PandaClient installs for you (Sodium, Sounds, Particle Interactions...).
 * The launcher writes the list (instance/pandaclient/bundled.json); switching one off here is saved
 * next to the PandaClient settings and applied by the launcher the next time the game starts.
 */
public final class BundledMods {
    private BundledMods() {}
    public record Entry(String slug, String name, String category, String modId, boolean wasEnabled, String icon) {}

    private static List<Entry> list;
    private static final Set<String> disabled = new HashSet<>();
    private static boolean prefsLoaded;
    private static final Map<String, int[]> iconSizes = new HashMap<>();
    private static final Map<String, Identifier> icons = new HashMap<>();

    private static Path prefsFile() {
        String cfg = System.getProperty("pandaclient.config");
        Path dir = cfg != null ? Path.of(cfg).getParent() : FabricLoader.getInstance().getConfigDir();
        return dir.resolve("pandaclient-bundled-prefs.json");
    }

    public static List<Entry> list() {
        if (list != null) return list;
        list = new ArrayList<>();
        Path f = FabricLoader.getInstance().getGameDir().resolve("pandaclient").resolve("bundled.json");
        try {
            JsonObject root = JsonParser.parseString(Files.readString(f, StandardCharsets.UTF_8)).getAsJsonObject();
            for (JsonElement e : root.getAsJsonArray("mods")) {
                JsonObject o = e.getAsJsonObject();
                list.add(new Entry(o.get("slug").getAsString(), o.get("name").getAsString(), o.get("category").getAsString(),
                    o.has("modId") && !o.get("modId").isJsonNull() ? o.get("modId").getAsString() : null,
                    !o.has("enabled") || o.get("enabled").getAsBoolean(),
                    o.has("icon") && !o.get("icon").isJsonNull() ? o.get("icon").getAsString() : null));
            }
        } catch (Exception ignored) { /* not launched from PandaClient */ }
        return list;
    }

    private static void loadPrefs() {
        if (prefsLoaded) return;
        prefsLoaded = true;
        try {
            JsonObject o = JsonParser.parseString(Files.readString(prefsFile(), StandardCharsets.UTF_8)).getAsJsonObject();
            if (o.has("disabled")) for (JsonElement e : o.getAsJsonArray("disabled")) disabled.add(e.getAsString());
        } catch (Exception ignored) {}
    }

    /** The switch position (what will apply from the next start). */
    public static boolean on(Entry e) { loadPrefs(); return !disabled.contains(e.slug()); }

    /** Is it actually running right now? */
    public static boolean running(Entry e) { return e.modId() != null && FabricLoader.getInstance().isModLoaded(e.modId()); }

    public static boolean restartNeeded() {
        for (Entry e : list()) if (on(e) != e.wasEnabled()) return true;
        return false;
    }

    public static void toggle(Entry e) {
        loadPrefs();
        if (!disabled.remove(e.slug())) disabled.add(e.slug());
        JsonObject o = new JsonObject();
        JsonArray a = new JsonArray();
        for (String s : new TreeSet<>(disabled)) a.add(s);
        o.add("disabled", a);
        try {
            Files.createDirectories(prefsFile().getParent());
            Files.writeString(prefsFile(), o.toString(), StandardCharsets.UTF_8);
        } catch (Exception ex) { System.err.println("[PandaClient] Could not save mod choices: " + ex); }
    }

    /** The mod's icon as a texture (null if none). Returns {width, height} via size(). */
    public static Identifier icon(Entry e) {
        if (e.icon() == null) return null;
        if (icons.containsKey(e.slug())) return icons.get(e.slug());
        Identifier id = null;
        try (InputStream in = Files.newInputStream(Path.of(e.icon()))) {
            NativeImage img = NativeImage.read(in);
            id = Identifier.fromNamespaceAndPath("pandaclient", "bundled/" + e.slug().replaceAll("[^a-z0-9_.-]", "_"));
            iconSizes.put(e.slug(), new int[]{img.getWidth(), img.getHeight()});
            Minecraft.getInstance().getTextureManager().register(id, new DynamicTexture(() -> "PandaClient icon " + e.slug(), img));
        } catch (Exception ignored) { id = null; }
        icons.put(e.slug(), id);
        return id;
    }
    public static int[] size(Entry e) { return iconSizes.getOrDefault(e.slug(), new int[]{64, 64}); }
}
