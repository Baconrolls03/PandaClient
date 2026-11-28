package com.pandaclient.mod.util;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import net.minecraft.client.multiplayer.resolver.ServerAddress;
import net.minecraft.client.multiplayer.resolver.ServerNameResolver;

import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Asks a server how many players are online, how fast it answers and what its icon is (the same "server list
 * ping" Minecraft's multiplayer screen uses), in the background, for the lobby's server card.
 */
public final class ServerPing {
    private ServerPing() {}

    /** online/max players (-1 when unknown), round-trip time in ms, PNG icon bytes (or null); failed = couldn't reach it. */
    public record Status(int online, int max, long ms, byte[] icon, boolean failed) {}

    private static final Map<String, Status> STATUS = new ConcurrentHashMap<>();
    private static final Map<String, Long> ASKED = new ConcurrentHashMap<>();
    private static final ExecutorService POOL = Executors.newFixedThreadPool(2, r -> {
        Thread t = new Thread(r, "PandaClient server ping");
        t.setDaemon(true);
        return t;
    });

    /** The last answer for {@code ip} (null until the first one), asking again every minute. */
    public static Status get(String ip) {
        if (ip == null || ip.isBlank()) return null;
        long now = System.currentTimeMillis();
        Long asked = ASKED.get(ip);
        if (asked == null || now - asked > 60_000) {
            ASKED.put(ip, now);
            POOL.submit(() -> {
                try { STATUS.put(ip, ping(ip)); }
                catch (Throwable t) { STATUS.put(ip, new Status(-1, -1, -1, STATUS.containsKey(ip) ? STATUS.get(ip).icon() : null, true)); }
            });
        }
        return STATUS.get(ip);
    }

    private static Status ping(String ip) throws IOException {
        ServerAddress address = ServerAddress.parseString(ip);
        InetSocketAddress target = ServerNameResolver.DEFAULT.resolveAddress(address)
            .map(r -> r.asInetSocketAddress())
            .orElseThrow(() -> new IOException("unknown host"));
        try (Socket socket = new Socket()) {
            socket.setSoTimeout(5000);
            long start = System.nanoTime();
            socket.connect(target, 5000);
            OutputStream out = socket.getOutputStream();
            DataInputStream in = new DataInputStream(socket.getInputStream());

            // handshake (next state: status) + status request
            ByteArrayOutputStream hs = new ByteArrayOutputStream();
            DataOutputStream h = new DataOutputStream(hs);
            writeVarInt(h, 0x00);
            writeVarInt(h, -1);
            writeString(h, address.getHost());
            h.writeShort(address.getPort());
            writeVarInt(h, 1);
            sendPacket(out, hs.toByteArray());
            sendPacket(out, new byte[]{0x00});

            readVarInt(in); // length
            if (readVarInt(in) != 0x00) throw new IOException("bad response");
            byte[] json = new byte[readVarInt(in)];
            in.readFully(json);
            long ms = (System.nanoTime() - start) / 1_000_000L;

            JsonObject o = JsonParser.parseString(new String(json, StandardCharsets.UTF_8)).getAsJsonObject();
            int online = -1, max = -1;
            if (o.has("players") && o.get("players").isJsonObject()) {
                JsonObject p = o.getAsJsonObject("players");
                if (p.has("online")) online = p.get("online").getAsInt();
                if (p.has("max")) max = p.get("max").getAsInt();
            }
            byte[] icon = null;
            if (o.has("favicon") && o.get("favicon").isJsonPrimitive()) {
                String f = o.get("favicon").getAsString();
                int comma = f.indexOf(',');
                if (f.startsWith("data:image/png;base64,") && comma > 0) {
                    try { icon = Base64.getMimeDecoder().decode(f.substring(comma + 1)); } catch (IllegalArgumentException ignored) {}
                }
            }
            return new Status(online, max, ms, icon, false);
        }
    }

    private static void sendPacket(OutputStream out, byte[] body) throws IOException {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        writeVarInt(new DataOutputStream(b), body.length);
        b.write(body);
        out.write(b.toByteArray());
        out.flush();
    }

    private static void writeString(DataOutputStream out, String s) throws IOException {
        byte[] bytes = s.getBytes(StandardCharsets.UTF_8);
        writeVarInt(out, bytes.length);
        out.write(bytes);
    }

    private static void writeVarInt(DataOutputStream out, int value) throws IOException {
        while ((value & ~0x7F) != 0) {
            out.writeByte((value & 0x7F) | 0x80);
            value >>>= 7;
        }
        out.writeByte(value);
    }

    private static int readVarInt(InputStream in) throws IOException {
        int value = 0, shift = 0, b;
        do {
            b = in.read();
            if (b < 0) throw new IOException("closed");
            value |= (b & 0x7F) << shift;
            shift += 7;
            if (shift > 35) throw new IOException("varint too long");
        } while ((b & 0x80) != 0);
        return value;
    }
}
