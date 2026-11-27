package com.pandaclient.mod.util;

import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.client.gui.screens.Screen;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;

/**
 * Every installed mod's own settings screen, found through the standard "modmenu" entry point that
 * almost every Fabric mod provides, so they can all be opened from the PandaClient menu.
 */
public final class ModConfigs {
    private ModConfigs() {}

    public record Entry(String id, String name, Function<Screen, Screen> open) {}

    private static final Set<String> SKIP = Set.of("pandaclient", "modmenu", "minecraft", "fabricloader", "java");
    private static List<Entry> cache;
    /** Ids of every mod Mod Menu integration was found for (for the CI check). */
    public static final List<String> seen = new ArrayList<>();

    public static List<Entry> all() {
        if (cache != null) return cache;
        List<Entry> out = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        // Best source: Mod Menu's own list (it already loaded every mod's settings screen, and skips broken ones).
        try {
            Class<?> mm = Class.forName("com.terraformersmc.modmenu.ModMenu");
            Object map = mm.getField("configScreenFactories").get(null);
            Method open = mm.getMethod("getConfigScreen", String.class, Screen.class);
            if (map instanceof Map<?, ?> m) for (Object k : m.keySet()) {
                String id = String.valueOf(k);
                ModConfigs.seen.add(id);
                if (SKIP.contains(id) || !seen.add(id)) continue;
                String name = FabricLoader.getInstance().getModContainer(id).map(c -> c.getMetadata().getName()).orElse(id);
                out.add(new Entry(id, name, parent -> {
                    try { return (Screen) open.invoke(null, id, parent); } catch (Throwable t) { System.err.println("[PandaClient] Couldn't open " + id + " settings: " + t); return null; }
                }));
            }
        } catch (Throwable t) {
            ModConfigs.seen.add("(Mod Menu list unavailable: " + t + ")");
        }
        try {
            for (var c : FabricLoader.getInstance().getEntrypointContainers("modmenu", Object.class)) {
                try {
                    Object api = c.getEntrypoint();
                    String id = c.getProvider().getMetadata().getId();
                    seen.add(id);
                    Method m = api.getClass().getMethod("getModConfigScreenFactory");
                    // The interface's default returns no screen: only count mods that really have settings.
                    if (!m.getDeclaringClass().isInterface()) add(out, seen, id, m.invoke(api));
                    Object extra = api.getClass().getMethod("getProvidedConfigScreenFactories").invoke(api);
                    if (extra instanceof Map<?, ?> map) for (var e : map.entrySet()) add(out, seen, String.valueOf(e.getKey()), e.getValue());
                } catch (Throwable ignored) {
                    // a mod whose integration doesn't load: skip it
                }
            }
        } catch (Throwable t) {
            ModConfigs.seen.add("(entry points unavailable: " + t + ")");
        }
        out.sort(Comparator.comparing(e -> e.name().toLowerCase(java.util.Locale.ROOT)));
        cache = out;
        return out;
    }

    private static void add(List<Entry> out, Set<String> seen, String id, Object factory) {
        if (factory == null || SKIP.contains(id) || !seen.add(id)) return;
        Method create = null;
        for (Class<?> i : factory.getClass().getInterfaces()) {
            try { create = i.getMethod("create", Screen.class); break; } catch (NoSuchMethodException ignored) {}
        }
        if (create == null) return;
        String name = FabricLoader.getInstance().getModContainer(id).map(c -> c.getMetadata().getName()).orElse(id);
        Method fc = create;
        out.add(new Entry(id, name, parent -> {
            try { return (Screen) fc.invoke(factory, parent); } catch (Throwable t) { System.err.println("[PandaClient] Couldn't open " + id + " settings: " + t); return null; }
        }));
    }
}
