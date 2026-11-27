package com.pandaclient.mod.gui;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.components.AbstractWidget;
import net.minecraft.client.gui.components.PlayerSkinWidget;
import net.minecraft.world.entity.player.PlayerSkin;

/** Your character standing in the main menu lobby (drag to spin it), using Minecraft's skin preview. */
public final class LobbyPlayer {
    private LobbyPlayer() {}
    private static PlayerSkin skin;
    private static boolean requested;

    private static void request(Minecraft mc) {
        if (requested) return;
        requested = true;
        try { mc.getSkinManager().get(mc.getGameProfile()).thenAccept(o -> o.ifPresent(s -> skin = s)); } catch (Throwable ignored) {}
    }

    /** Draws your face (skin head) at x, y; false if the skin isn't ready yet. */
    public static boolean face(Minecraft mc, net.minecraft.client.gui.GuiGraphics g, int x, int y, int size) {
        request(mc);
        if (skin == null) return false;
        try { net.minecraft.client.gui.components.PlayerFaceRenderer.draw(g, skin, x, y, size); return true; } catch (Throwable t) { return false; }
    }

    /** The widget once your skin has loaded, else null (call again next frame). */
    public static AbstractWidget create(Minecraft mc, int w, int h) {
        request(mc);
        if (skin == null) return null;
        try { return new PlayerSkinWidget(w, h, mc.getEntityModels(), () -> skin); } catch (Throwable t) { return null; }
    }

    // ---------------------------------------------------------------- party members

    private static final java.util.Map<java.util.UUID, PlayerSkin> SKINS = new java.util.concurrent.ConcurrentHashMap<>();
    private static final java.util.Set<java.util.UUID> ASKED = java.util.concurrent.ConcurrentHashMap.newKeySet();

    private static PlayerSkin skinOf(Minecraft mc, java.util.UUID id, String name) {
        if (ASKED.add(id)) {
            PlayerSkin fallback = net.minecraft.client.resources.DefaultPlayerSkin.get(id);
            try {
                mc.getSkinManager().get(new com.mojang.authlib.GameProfile(id, name))
                    .thenAccept(o -> SKINS.put(id, o.orElse(fallback)))
                    .exceptionally(t -> { SKINS.put(id, fallback); return null; });
            } catch (Throwable t) {
                SKINS.put(id, fallback);
            }
        }
        return SKINS.get(id);
    }

    /** A party member's character (null until their skin is ready). */
    public static AbstractWidget createFor(Minecraft mc, java.util.UUID id, String name, int w, int h) {
        PlayerSkin s = skinOf(mc, id, name);
        if (s == null) return null;
        try { return new PlayerSkinWidget(w, h, mc.getEntityModels(), () -> s); } catch (Throwable t) { return null; }
    }

    /** A party member's face; false until their skin is ready. */
    public static boolean faceOf(Minecraft mc, net.minecraft.client.gui.GuiGraphics g, java.util.UUID id, String name, int x, int y, int size) {
        PlayerSkin s = skinOf(mc, id, name);
        if (s == null) return false;
        try { net.minecraft.client.gui.components.PlayerFaceRenderer.draw(g, s, x, y, size); return true; } catch (Throwable t) { return false; }
    }

    // ---------------------------------------------------------------- posed characters (the lobby)

    /** How a lobby character stands this frame. swing: radians (feet to the right is positive). */
    public record Pose(float swing, float held, float walk, float time, float headYaw, float headPitch) {}
    /** Sign that turns {@link Pose#swing} into the model's roll. */
    public static float swingSign = -1f;

    private static final java.util.Map<String, net.minecraft.client.model.player.PlayerModel> MODELS = new java.util.HashMap<>();

    /**
     * Draws a character (you when {@code id} is null) in the box x0..y1, scaled so a standing character is
     * {@code height} GUI pixels tall, turned {@code yaw} degrees. False until the skin is ready.
     */
    public static boolean draw(Minecraft mc, net.minecraft.client.gui.GuiGraphics g, String key, java.util.UUID id, String name,
                               int x0, int y0, int x1, int y1, float height, float yaw, Pose p) {
        PlayerSkin s;
        if (id == null) { request(mc); s = skin; } else s = skinOf(mc, id, name);
        if (s == null) return false;
        try {
            boolean slim = s.model() == net.minecraft.world.entity.player.PlayerModelType.SLIM;
            var m = MODELS.computeIfAbsent(key + (slim ? ":slim" : ":wide"), k -> new net.minecraft.client.model.player.PlayerModel(
                mc.getEntityModels().bakeLayer(slim ? net.minecraft.client.model.geom.ModelLayers.PLAYER_SLIM : net.minecraft.client.model.geom.ModelLayers.PLAYER), slim));
            m.resetPose();
            pose(m, p);
            g.submitSkinRenderState(m, s.body().texturePath(), 0.97f * height / 2.125f, 0f, yaw, -1.0625f, x0, y0, x1, y1);
            return true;
        } catch (Throwable t) {
            return false;
        }
    }

    private static void pose(net.minecraft.client.model.player.PlayerModel m, Pose p) {
        float t = p.time(), h = p.held(), w = p.walk();
        m.root().zRot = swingSign * p.swing();
        float breathe = (float) Math.sin(t * 1.7f) * 0.035f;
        m.rightArm.zRot = 0.07f + breathe;
        m.leftArm.zRot = -0.07f - breathe;
        m.rightArm.xRot = (float) Math.sin(t * 1.1f) * 0.03f;
        m.leftArm.xRot = -(float) Math.sin(t * 1.1f) * 0.03f;
        if (h > 0) {
            // held up: arms flail out, legs dangle and kick
            m.rightArm.zRot += h * (1.15f + (float) Math.sin(t * 11) * 0.3f);
            m.leftArm.zRot -= h * (1.15f + (float) Math.sin(t * 11 + 1.3f) * 0.3f);
            m.rightArm.xRot -= h * 0.35f;
            m.leftArm.xRot -= h * 0.35f;
            m.rightLeg.xRot = h * (float) Math.sin(t * 8) * 0.55f;
            m.leftLeg.xRot = -h * (float) Math.sin(t * 8) * 0.55f;
            m.rightLeg.zRot = h * 0.14f;
            m.leftLeg.zRot = -h * 0.14f;
        }
        if (w > 0) {
            float s = (float) Math.sin(t * 9) * 0.7f * w;
            m.rightLeg.xRot += s;
            m.leftLeg.xRot -= s;
            m.rightArm.xRot -= s * 0.8f;
            m.leftArm.xRot += s * 0.8f;
        }
        m.head.yRot = p.headYaw();
        m.head.xRot = p.headPitch();
    }
}
