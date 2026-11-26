package com.pandaclient.mod.cosmetics;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.mojang.blaze3d.platform.NativeImage;
import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.blaze3d.vertex.VertexConsumer;
import com.mojang.math.Axis;
import com.pandaclient.mod.module.Modules;
import net.minecraft.client.Minecraft;
import net.minecraft.client.model.player.PlayerModel;
import net.minecraft.client.renderer.SubmitNodeCollector;
import net.minecraft.client.renderer.entity.RenderLayerParent;
import net.minecraft.client.renderer.entity.layers.RenderLayer;
import net.minecraft.client.renderer.entity.state.AvatarRenderState;
import net.minecraft.client.renderer.rendertype.RenderTypes;
import net.minecraft.client.renderer.texture.DynamicTexture;
import net.minecraft.client.renderer.texture.OverlayTexture;
import net.minecraft.resources.Identifier;
import net.minecraft.world.entity.Entity;

/**
 * Draws PandaClient accessories (hats, glasses, masks, bandanas, wings, backpacks) on players.
 * Same box format as the launcher's Wardrobe: pixels in head space (x -4..4, y 0..8 up from the neck, face toward -z)
 * or body space (y 0..12 from the waist up, back toward +z).
 */
public final class AccessoryLayer extends RenderLayer<AvatarRenderState, PlayerModel> {
    private static final String[] CATEGORIES = {"hat", "glasses", "mask", "bandana", "wings", "backpack"};
    private static Identifier white;

    public AccessoryLayer(RenderLayerParent<AvatarRenderState, PlayerModel> parent) { super(parent); }

    private static Identifier white() {
        if (white == null) {
            NativeImage img = new NativeImage(16, 16, true);
            for (int y = 0; y < 16; y++) for (int x = 0; x < 16; x++) img.setPixel(x, y, 0xFFFFFFFF);
            white = Identifier.fromNamespaceAndPath("pandaclient", "white");
            Minecraft.getInstance().getTextureManager().register(white, new DynamicTexture(() -> "PandaClient white", img));
        }
        return white;
    }

    @Override
    public void submit(PoseStack pose, SubmitNodeCollector collector, int light, AvatarRenderState state, float yRot, float xRot) {
        if (!Modules.COSMETICS.enabled() || !Modules.COSMETICS.accessories.on()) return;
        var level = Minecraft.getInstance().level;
        if (level == null) return;
        Entity e = level.getEntity(state.id);
        if (e == null || e.isInvisible()) return;
        for (String cat : CATEGORIES) {
            CosmeticsApi.Cosmetic c = CosmeticsApi.equipped(e.getUUID(), cat);
            if (c == null || !c.model().has("boxes")) continue;
            boolean body = c.model().has("space") && "body".equals(c.model().get("space").getAsString());
            pose.pushPose();
            (body ? getParentModel().body : getParentModel().head).translateAndRotate(pose);
            JsonArray boxes = c.model().getAsJsonArray("boxes");
            float time = (System.currentTimeMillis() % 100_000L) / 1000f;
            for (JsonElement el : boxes) drawBox(pose, collector, light, el.getAsJsonObject(), body, time);
            pose.popPose();
        }
    }

    private static float[] vec(JsonObject b, String k) {
        JsonArray a = b.getAsJsonArray(k);
        return new float[]{a.get(0).getAsFloat(), a.get(1).getAsFloat(), a.get(2).getAsFloat()};
    }

    /** Our space (pixels, y up) → model space (1/16 block, y down). */
    private static float my(float y, boolean body) { return (body ? 12 - y : -y) / 16f; }

    private void drawBox(PoseStack pose, SubmitNodeCollector collector, int light, JsonObject b, boolean body, float time) {
        float[] f = vec(b, "from"), t = vec(b, "to");
        int argb = 0xFF000000 | Integer.parseInt(b.get("color").getAsString().replace("#", ""), 16);
        pose.pushPose();
        if (b.has("pivot") && b.has("flap")) {
            float[] p = vec(b, "pivot");
            float angle = (float) ((Math.sin(time * 2.2) * 0.5 + 0.5) * b.get("flap").getAsFloat());
            pose.translate(p[0] / 16f, my(p[1], body), p[2] / 16f);
            pose.mulPose(Axis.YP.rotationDegrees(p[0] >= 0 ? -angle : angle));
            pose.translate(-p[0] / 16f, -my(p[1], body), -p[2] / 16f);
        }
        float x1 = Math.min(f[0], t[0]) / 16f, x2 = Math.max(f[0], t[0]) / 16f;
        float y1 = Math.min(my(f[1], body), my(t[1], body)), y2 = Math.max(my(f[1], body), my(t[1], body));
        float z1 = Math.min(f[2], t[2]) / 16f, z2 = Math.max(f[2], t[2]) / 16f;
        collector.submitCustomGeometry(pose, RenderTypes.entitySolid(white()), (p, vc) -> cube(p, vc, x1, y1, z1, x2, y2, z2, argb, light));
        pose.popPose();
    }

    private static void quad(PoseStack.Pose p, VertexConsumer vc, float[][] v, float nx, float ny, float nz, int argb, int light) {
        for (float[] q : v) vc.addVertex(p, q[0], q[1], q[2]).setColor(argb).setUv(0.5f, 0.5f).setOverlay(OverlayTexture.NO_OVERLAY).setLight(light).setNormal(p, nx, ny, nz);
    }

    private static int shade(int argb, float k) {
        int r = (int) (((argb >> 16) & 255) * k), g = (int) (((argb >> 8) & 255) * k), b = (int) ((argb & 255) * k);
        return 0xFF000000 | (r << 16) | (g << 8) | b;
    }

    private static void cube(PoseStack.Pose p, VertexConsumer vc, float x1, float y1, float z1, float x2, float y2, float z2, int argb, int light) {
        quad(p, vc, new float[][]{{x1, y1, z1}, {x2, y1, z1}, {x2, y1, z2}, {x1, y1, z2}}, 0, -1, 0, argb, light);            // top (y down = -)
        quad(p, vc, new float[][]{{x1, y2, z2}, {x2, y2, z2}, {x2, y2, z1}, {x1, y2, z1}}, 0, 1, 0, shade(argb, 0.6f), light); // bottom
        quad(p, vc, new float[][]{{x1, y2, z1}, {x2, y2, z1}, {x2, y1, z1}, {x1, y1, z1}}, 0, 0, -1, shade(argb, 0.85f), light); // front
        quad(p, vc, new float[][]{{x2, y2, z2}, {x1, y2, z2}, {x1, y1, z2}, {x2, y1, z2}}, 0, 0, 1, shade(argb, 0.85f), light); // back
        quad(p, vc, new float[][]{{x1, y2, z2}, {x1, y2, z1}, {x1, y1, z1}, {x1, y1, z2}}, -1, 0, 0, shade(argb, 0.75f), light); // side
        quad(p, vc, new float[][]{{x2, y2, z1}, {x2, y2, z2}, {x2, y1, z2}, {x2, y1, z1}}, 1, 0, 0, shade(argb, 0.75f), light); // side
    }
}
