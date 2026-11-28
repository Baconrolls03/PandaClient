package com.pandaclient.mod.util;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.pandaclient.mod.config.Config;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Your party, as the PandaClient launcher writes it (pandaclient-party.json, refreshed every few seconds while
 * the game is open): who's in it, who leads, where everyone is playing, party chat, your invites and the friends
 * you can invite. The game asks the launcher to do things (invite, chat, leave...) by dropping small request
 * files in .pandaclient-cmd; the launcher carries them out with your PandaClient sign-in.
 */
public final class Party {
    private Party() {}

    public record Member(UUID uuid, String name, boolean leader, boolean online, String server, long serverAt) {
        public Member(UUID uuid, String name, boolean leader, boolean online) { this(uuid, name, leader, online, null, 0); }
    }
    public record Invite(String id, String from) {}
    public record Message(long id, String from, UUID fromUuid, String text, long at, boolean pending) {}
    public record Friend(UUID uuid, String name, boolean online, String server, boolean inParty) {}

    private static List<Member> members = List.of();
    private static List<Invite> invites = List.of();
    private static List<Message> messages = List.of();
    private static List<Friend> friends = List.of();
    private static UUID me, leader;
    private static String notice;
    private static long noticeAt, updated, checkedAt, modified = -1;
    /** Messages you sent that the launcher hasn't confirmed yet (shown straight away). */
    private static final List<Message> sending = new ArrayList<>();
    private static final AtomicInteger SEQ = new AtomicInteger();

    private static void refresh() {
        long now = System.currentTimeMillis();
        if (now - checkedAt < 500) return;
        checkedAt = now;
        try {
            Path file = Config.sibling("pandaclient-party.json");
            if (!Files.exists(file)) { clear(); return; }
            long m = Files.getLastModifiedTime(file).toMillis();
            if (m == modified) return;
            modified = m;
            JsonObject o = JsonParser.parseString(Files.readString(file)).getAsJsonObject();
            updated = num(o, "updated");
            me = uuid(o, "me");
            leader = uuid(o, "leader");
            List<Member> ms = new ArrayList<>();
            for (JsonElement e : arr(o, "members")) {
                JsonObject p = e.getAsJsonObject();
                UUID id = uuid(p, "uuid");
                if (id == null) continue;
                ms.add(new Member(id, str(p, "name", "?"), bool(p, "leader", false), bool(p, "online", true), str(p, "server", null), time(p, "serverAt")));
            }
            members = ms.size() > 1 ? List.copyOf(ms) : List.of();
            List<Invite> inv = new ArrayList<>();
            for (JsonElement e : arr(o, "invites")) {
                JsonObject p = e.getAsJsonObject();
                if (p.has("id")) inv.add(new Invite(p.get("id").getAsString(), str(p, "from", "A friend")));
            }
            invites = List.copyOf(inv);
            List<Message> msgs = new ArrayList<>();
            for (JsonElement e : arr(o, "messages")) {
                JsonObject p = e.getAsJsonObject();
                msgs.add(new Message(num(p, "id"), str(p, "from", "?"), uuid(p, "fromUuid"), str(p, "text", ""), num(p, "at"), false));
            }
            messages = List.copyOf(msgs);
            // drop sent messages once the launcher has them (or after a while)
            synchronized (sending) {
                sending.removeIf(s -> now - s.at() > 20_000 || msgs.stream().anyMatch(x -> x.text().equals(s.text()) && me != null && me.equals(x.fromUuid())));
            }
            List<Friend> fr = new ArrayList<>();
            for (JsonElement e : arr(o, "friends")) {
                JsonObject p = e.getAsJsonObject();
                UUID id = uuid(p, "uuid");
                if (id != null) fr.add(new Friend(id, str(p, "name", "?"), bool(p, "online", false), str(p, "server", null), bool(p, "inParty", false)));
            }
            fr.sort((a, b) -> a.online() != b.online() ? (a.online() ? -1 : 1) : a.name().compareToIgnoreCase(b.name()));
            friends = List.copyOf(fr);
            if (o.has("notice") && o.get("notice").isJsonObject()) {
                JsonObject n = o.getAsJsonObject("notice");
                long at = num(n, "at");
                if (at != noticeAt) { noticeAt = at; notice = str(n, "text", null); }
            }
        } catch (Exception e) {
            // half-written or old file: keep what we had
        }
    }

    private static void clear() { members = List.of(); invites = List.of(); messages = List.of(); friends = List.of(); updated = 0; }

    /** True while the launcher keeps the party file fresh (the game was started from the PandaClient launcher). */
    public static boolean connected() { refresh(); return System.currentTimeMillis() - updated < 20_000; }

    /** Everyone in your party, you included (empty when you're not in one). */
    public static List<Member> members() { refresh(); return members; }

    /** The other members (not you). */
    public static List<Member> others(String myName) {
        List<Member> out = new ArrayList<>();
        for (Member m : members()) if (!isMe(m, myName)) out.add(m);
        return out;
    }

    /** Your own uuid as the launcher knows it (null before the first update). */
    public static UUID me() { refresh(); return me; }

    public static boolean isMe(Member m, String myName) { return me != null ? me.equals(m.uuid()) : m.name().equalsIgnoreCase(myName); }
    public static Member leader() { for (Member m : members()) if (m.leader()) return m; return null; }
    public static boolean iLead(String myName) { Member l = leader(); return l != null && isMe(l, myName); }
    public static List<Invite> invites() { refresh(); return invites; }
    public static List<Friend> friends() { refresh(); return friends; }

    /** Party chat (oldest first), with what you just sent. */
    public static List<Message> messages() {
        refresh();
        synchronized (sending) {
            if (sending.isEmpty()) return messages;
            List<Message> all = new ArrayList<>(messages);
            all.addAll(sending);
            return all;
        }
    }

    /** A message from the launcher to show once (e.g. why an invite failed), or null. */
    public static String takeNotice() { refresh(); String n = notice; notice = null; return n; }

    // ---- requests to the launcher

    private static void send(String type, String key, String value) {
        try {
            Path dir = Config.sibling(".pandaclient-cmd");
            Files.createDirectories(dir);
            JsonObject o = new JsonObject();
            o.addProperty("type", type);
            if (key != null) o.addProperty(key, value);
            String name = System.currentTimeMillis() + "-" + SEQ.incrementAndGet();
            Path tmp = dir.resolve(name + ".tmp");
            Files.writeString(tmp, o.toString(), StandardCharsets.UTF_8);
            Files.move(tmp, dir.resolve(name + ".json"), StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
            checkedAt = 0;
        } catch (Exception e) {
            System.err.println("[PandaClient] Party request failed: " + e);
        }
    }

    public static void invite(UUID friend) { send("invite", "uuid", friend.toString()); }
    public static void accept(String inviteId) { send("accept", "id", inviteId); }
    public static void decline(String inviteId) { send("decline", "id", inviteId); }
    public static void leave() { send("leave", null, null); }
    public static void kick(UUID member) { send("kick", "uuid", member.toString()); }
    public static void promote(UUID member) { send("promote", "uuid", member.toString()); }

    public static void chat(String myName, String text) {
        String t = text.strip();
        if (t.isEmpty()) return;
        if (t.length() > 200) t = t.substring(0, 200);
        send("chat", "text", t);
        synchronized (sending) { sending.add(new Message(-1, myName, me, t, System.currentTimeMillis(), true)); }
    }

    // ---- json helpers

    private static JsonArray arr(JsonObject o, String k) { return o.has(k) && o.get(k).isJsonArray() ? o.getAsJsonArray(k) : new JsonArray(); }
    private static String str(JsonObject o, String k, String def) { return o.has(k) && o.get(k).isJsonPrimitive() ? o.get(k).getAsString() : def; }
    private static boolean bool(JsonObject o, String k, boolean def) { return o.has(k) && o.get(k).isJsonPrimitive() ? o.get(k).getAsBoolean() : def; }
    private static long num(JsonObject o, String k) {
        try { return o.has(k) && o.get(k).isJsonPrimitive() ? o.get(k).getAsLong() : 0; } catch (Exception e) { return 0; }
    }
    private static UUID uuid(JsonObject o, String k) {
        try { String s = str(o, k, null); return s == null ? null : UUID.fromString(s); } catch (Exception e) { return null; }
    }
    /** An ISO time (or millis) as millis, 0 if missing. */
    private static long time(JsonObject o, String k) {
        String s = str(o, k, null);
        if (s == null) return 0;
        try { return java.time.OffsetDateTime.parse(s).toInstant().toEpochMilli(); } catch (Exception e) {
            try { return Long.parseLong(s); } catch (Exception e2) { return 0; }
        }
    }
}
