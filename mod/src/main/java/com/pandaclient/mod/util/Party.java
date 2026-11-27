package com.pandaclient.mod.util;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.pandaclient.mod.config.Config;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** Your lobby party, as the PandaClient launcher writes it (pandaclient-party.json). */
public final class Party {
    private Party() {}
    public record Member(UUID uuid, String name, boolean leader, boolean online) {}

    private static List<Member> members = List.of();
    private static long checkedAt, modified = -1;

    /** Everyone in your party, you included (empty when you're not in one). */
    public static List<Member> members() {
        long now = System.currentTimeMillis();
        if (now - checkedAt < 2000) return members;
        checkedAt = now;
        try {
            Path file = Config.sibling("pandaclient-party.json");
            if (!Files.exists(file)) { members = List.of(); return members; }
            long m = Files.getLastModifiedTime(file).toMillis();
            if (m == modified) return members;
            modified = m;
            JsonObject o = JsonParser.parseString(Files.readString(file)).getAsJsonObject();
            List<Member> out = new ArrayList<>();
            for (JsonElement e : o.getAsJsonArray("members")) {
                JsonObject p = e.getAsJsonObject();
                try {
                    out.add(new Member(UUID.fromString(p.get("uuid").getAsString()), p.get("name").getAsString(),
                        p.has("leader") && p.get("leader").getAsBoolean(), !p.has("online") || p.get("online").getAsBoolean()));
                } catch (Exception ignored) {}
            }
            members = out.size() > 1 ? List.copyOf(out) : List.of();
        } catch (Exception e) {
            members = List.of();
        }
        return members;
    }

    /** The other members (not you). */
    public static List<Member> others(String myName) {
        List<Member> out = new ArrayList<>();
        for (Member m : members()) if (!m.name().equalsIgnoreCase(myName)) out.add(m);
        return out;
    }
}
