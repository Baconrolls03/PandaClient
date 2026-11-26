package com.pandaclient.mod.cosmetics;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Reads the PandaClient cosmetics catalogue and what nearby players have equipped
 * (public, read-only endpoints; nothing about you is sent except the UUIDs of players you can see).
 */
public final class CosmeticsApi {
    private CosmeticsApi() {}
    public static final String BASE = System.getProperty("pandaclient.api", "https://yljkeadmxsmwiclrbvgp.supabase.co/functions/v1/api");
    private static final HttpClient HTTP = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build();

    /** id → cosmetic definition. */
    public record Cosmetic(String id, String name, String category, JsonObject model) {}
    public static final Map<String, Cosmetic> CATALOG = new ConcurrentHashMap<>();
    /** uuid (no dashes, lower case) → category → cosmetic id. */
    public static final Map<String, Map<String, String>> LOADOUTS = new ConcurrentHashMap<>();
    private static final Map<String, Long> fetchedAt = new ConcurrentHashMap<>();
    private static volatile boolean catalogLoading, requestInFlight;
    private static volatile long catalogAt;
    private static final long REFRESH_MS = 5 * 60_000L;

    public static String key(UUID uuid) { return uuid.toString().replace("-", "").toLowerCase(Locale.ROOT); }

    private static JsonElement get(String path) throws Exception {
        HttpRequest req = HttpRequest.newBuilder(URI.create(BASE + path)).timeout(Duration.ofSeconds(10))
            .header("User-Agent", "PandaClient-mod").GET().build();
        HttpResponse<String> res = HTTP.send(req, HttpResponse.BodyHandlers.ofString());
        if (res.statusCode() != 200) throw new IllegalStateException("HTTP " + res.statusCode());
        return JsonParser.parseString(res.body());
    }

    public static void loadCatalog() {
        if (catalogLoading || System.currentTimeMillis() - catalogAt < REFRESH_MS) return;
        catalogLoading = true;
        Thread t = new Thread(() -> {
            try {
                for (JsonElement e : get("/cosmetics").getAsJsonArray()) {
                    JsonObject o = e.getAsJsonObject();
                    CATALOG.put(o.get("id").getAsString(), new Cosmetic(o.get("id").getAsString(), o.get("name").getAsString(),
                        o.get("category").getAsString(), o.has("model") && o.get("model").isJsonObject() ? o.getAsJsonObject("model") : new JsonObject()));
                }
                catalogAt = System.currentTimeMillis();
            } catch (Exception ex) {
                System.out.println("[PandaClient] Cosmetics catalogue unavailable: " + ex.getMessage());
                catalogAt = System.currentTimeMillis() - REFRESH_MS + 30_000; // retry in 30 s
            } finally { catalogLoading = false; }
        }, "PandaClient cosmetics");
        t.setDaemon(true); t.start();
    }

    /** Ask for the loadouts of these players if we don't have a recent answer. */
    public static void request(Collection<UUID> players) {
        if (requestInFlight) return;
        long now = System.currentTimeMillis();
        List<String> want = new ArrayList<>();
        for (UUID u : players) {
            String k = key(u);
            if (now - fetchedAt.getOrDefault(k, 0L) > REFRESH_MS) want.add(k);
            if (want.size() == 100) break;
        }
        if (want.isEmpty()) return;
        for (String k : want) fetchedAt.put(k, now);
        requestInFlight = true;
        Thread t = new Thread(() -> {
            try {
                JsonArray arr = get("/loadouts?uuids=" + String.join(",", want)).getAsJsonArray();
                Set<String> seen = new HashSet<>();
                for (JsonElement e : arr) {
                    JsonObject o = e.getAsJsonObject();
                    String k = o.get("uuid").getAsString().replace("-", "").toLowerCase(Locale.ROOT);
                    Map<String, String> eq = new HashMap<>();
                    if (o.has("equipped") && o.get("equipped").isJsonObject())
                        for (var en : o.getAsJsonObject("equipped").entrySet()) if (en.getValue().isJsonPrimitive()) eq.put(en.getKey(), en.getValue().getAsString());
                    LOADOUTS.put(k, eq);
                    seen.add(k);
                }
                for (String k : want) if (!seen.contains(k)) LOADOUTS.remove(k);
            } catch (Exception ex) {
                for (String k : want) fetchedAt.put(k, System.currentTimeMillis() - REFRESH_MS + 30_000);
            } finally { requestInFlight = false; }
        }, "PandaClient loadouts");
        t.setDaemon(true); t.start();
    }

    /** The cosmetic this player wears in a category, or null. */
    public static Cosmetic equipped(UUID player, String category) {
        Map<String, String> eq = LOADOUTS.get(key(player));
        if (eq == null) return null;
        String id = eq.get(category);
        Cosmetic c = id == null ? null : CATALOG.get(id);
        return c != null && c.category().equals(category) ? c : null;
    }

    /** Forget a player's cached loadout (e.g. after changing your own in the launcher). */
    public static void refresh(UUID player) { fetchedAt.remove(key(player)); }
}
