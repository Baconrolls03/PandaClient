package com.pandaclient.mod.util;

import com.pandaclient.mod.gui.PandaTitleScreen;
import com.pandaclient.mod.module.Modules;
import com.mojang.blaze3d.platform.InputConstants;
import net.minecraft.ChatFormatting;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.screens.ConnectScreen;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.multiplayer.ServerData;
import net.minecraft.client.multiplayer.resolver.ServerAddress;
import net.minecraft.network.chat.Component;
import org.lwjgl.glfw.GLFW;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * The party while you play: follows the leader when they join a server, shows party chat in the game chat
 * (reply with /pp), and says when people join or leave the party. In the lobby the same things show on the
 * party card instead.
 */
public final class PartyLive {
    private PartyLive() {}

    /** The last chat message already shown (-1 until the first look, so old messages don't flood in). */
    private static long shownMsg = -1;
    /** The leader's last join we acted on (followed, skipped or were already there). */
    private static String followedKey;
    private static long countdownUntil;
    private static String countdownKey, countdownServer, countdownLeader;
    private static Map<UUID, String> lastMembers;
    private static UUID lastLeader;
    /** A short line for the lobby to show (who joined, following the leader...) and when. */
    public static String banner;
    public static long bannerAt;

    private static void say(Minecraft mc, String text, ChatFormatting color) {
        if (mc.level != null) mc.gui.getChat().addMessage(Component.literal("[Party] ").withStyle(ChatFormatting.LIGHT_PURPLE).append(Component.literal(text).withStyle(color)));
        banner = text;
        bannerAt = System.currentTimeMillis();
    }

    /** A party chat line in the game chat. */
    public static void show(Minecraft mc, String from, String text, boolean mine) {
        mc.gui.getChat().addMessage(Component.literal("[Party] ").withStyle(ChatFormatting.LIGHT_PURPLE)
            .append(Component.literal(from).withStyle(mine ? ChatFormatting.GREEN : ChatFormatting.AQUA))
            .append(Component.literal(": " + text).withStyle(ChatFormatting.WHITE)));
    }

    public static void tick(Minecraft mc) {
        if (!Party.connected()) { countdownUntil = 0; return; }
        String myName = mc.getUser().getName();
        boolean on = Modules.PARTY.enabled();

        String notice = Party.takeNotice();
        if (notice != null) say(mc, notice, ChatFormatting.RED);

        // party chat into the game chat
        List<Party.Message> msgs = Party.messages();
        long newest = shownMsg;
        for (Party.Message m : msgs) if (!m.pending()) newest = Math.max(newest, m.id());
        if (shownMsg >= 0 && on && mc.level != null && Modules.PARTY.chatInGame.on()) {
            for (Party.Message m : msgs) {
                if (m.pending() || m.id() <= shownMsg) continue;
                boolean mine = m.fromUuid() != null && Party.me() != null && m.fromUuid().equals(Party.me());
                if (!mine) show(mc, m.from(), m.text(), false); // yours were shown when you sent them
            }
        }
        shownMsg = Math.max(newest, 0);

        // who joined, left or leads now
        Map<UUID, String> now = new HashMap<>();
        for (Party.Member m : Party.members()) now.put(m.uuid(), m.name());
        Party.Member leader = Party.leader();
        UUID leaderId = leader == null ? null : leader.uuid();
        if (lastMembers != null && on && Modules.PARTY.notices.on()) {
            if (lastMembers.isEmpty() && !now.isEmpty()) say(mc, "You're in a party now (" + now.size() + " players)", ChatFormatting.GREEN);
            else if (!lastMembers.isEmpty() && now.isEmpty()) say(mc, "You left the party", ChatFormatting.GRAY);
            else {
                for (var e : now.entrySet()) if (!lastMembers.containsKey(e.getKey())) say(mc, e.getValue() + " joined the party", ChatFormatting.GREEN);
                for (var e : lastMembers.entrySet()) if (!now.containsKey(e.getKey())) say(mc, e.getValue() + " left the party", ChatFormatting.GRAY);
                if (leaderId != null && lastLeader != null && !leaderId.equals(lastLeader) && now.containsKey(lastLeader))
                    say(mc, (Party.isMe(leader, myName) ? "You are" : leader.name() + " is") + " now the party leader", ChatFormatting.GOLD);
            }
        }
        lastMembers = now;
        lastLeader = leaderId;

        if (on) follow(mc, myName, leader); else countdownUntil = 0;
    }

    private static void follow(Minecraft mc, String myName, Party.Member leader) {
        String mode = Modules.PARTY.follow.get();
        if (leader == null || Party.isMe(leader, myName) || mode.equals("Off")) { countdownUntil = 0; return; }
        String server = leader.server();
        if (server == null || server.isBlank() || server.equalsIgnoreCase("Singleplayer")) { countdownUntil = 0; return; }
        String key = server.toLowerCase(java.util.Locale.ROOT) + "@" + leader.serverAt();
        if (key.equals(followedKey)) return;
        String here = mc.getCurrentServer() != null ? mc.getCurrentServer().ip : null;
        if (here != null && here.equalsIgnoreCase(server)) { followedKey = key; countdownUntil = 0; return; }
        // only fresh joins: if the leader has been there a while (you just opened the game), the lobby offers a Join button
        if (leader.serverAt() > 0 && System.currentTimeMillis() - leader.serverAt() > 120_000) { followedKey = key; return; }
        if (mc.screen instanceof ConnectScreen) return;

        if (mc.level == null) {
            followedKey = key;
            say(mc, "Following " + leader.name() + " to " + server, ChatFormatting.GREEN);
            join(mc, server);
            return;
        }
        if (!mode.equals("Always")) {
            followedKey = key;
            say(mc, leader.name() + " joined " + server + ". Type /pp join to follow them", ChatFormatting.YELLOW);
            return;
        }
        // in a world: count down so you can stay
        long t = System.currentTimeMillis();
        if (!key.equals(countdownKey)) { countdownKey = key; countdownUntil = t + 5000; countdownServer = server; countdownLeader = leader.name(); }
        if (countdownUntil == 0) return;
        if (mc.screen == null && InputConstants.isKeyDown(mc.getWindow(), GLFW.GLFW_KEY_BACKSPACE)) {
            followedKey = key;
            countdownUntil = 0;
            say(mc, "Staying here. Type /pp join to follow " + leader.name() + " later", ChatFormatting.GRAY);
            return;
        }
        long left = countdownUntil - t;
        if (left > 0) {
            mc.gui.setOverlayMessage(Component.literal("Following " + countdownLeader + " to " + countdownServer + " in " + (left / 1000 + 1) + "s · press Backspace to stay")
                .withStyle(ChatFormatting.LIGHT_PURPLE), false);
            return;
        }
        followedKey = key;
        countdownUntil = 0;
        mc.disconnect(home(), false);
        join(mc, countdownServer);
    }

    /** Where to go back to after leaving a server. */
    private static Screen home() {
        return Modules.TITLE_SCREEN.enabled() ? new PandaTitleScreen() : new net.minecraft.client.gui.screens.TitleScreen();
    }

    /** Join a server address (from the lobby, or after leaving a world). */
    public static void join(Minecraft mc, String address) {
        Screen parent = mc.screen instanceof PandaTitleScreen ? mc.screen : home();
        ConnectScreen.startConnecting(parent, mc, ServerAddress.parseString(address), new ServerData(address, address, ServerData.Type.OTHER), false, null);
    }

    /** "/pp join": go where the leader is now. */
    public static String joinLeader(Minecraft mc) {
        Party.Member leader = Party.leader();
        if (leader == null) return "You're not in a party";
        String server = leader.server();
        if (Party.isMe(leader, mc.getUser().getName())) return "You're the party leader";
        if (server == null || server.isBlank() || server.equalsIgnoreCase("Singleplayer")) return leader.name() + " isn't on a server";
        String here = mc.getCurrentServer() != null ? mc.getCurrentServer().ip : null;
        if (here != null && here.equalsIgnoreCase(server)) return "You're already on " + server;
        followedKey = server.toLowerCase(java.util.Locale.ROOT) + "@" + leader.serverAt();
        mc.execute(() -> {
            if (mc.level != null) mc.disconnect(home(), false);
            join(mc, server);
        });
        return null;
    }
}
