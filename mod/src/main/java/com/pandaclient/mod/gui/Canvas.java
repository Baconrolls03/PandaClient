package com.pandaclient.mod.gui;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.renderer.RenderPipelines;
import net.minecraft.resources.Identifier;

/**
 * Drawing on a 720-unit-tall canvas scaled to the window (OneClient's proportions), so PandaClient's
 * full-screen menus look the same at every GUI scale and window size.
 */
final class Canvas {
    static final int CARD_FILL = 0x9E0E1117, CARD_LINE = 0x24FFFFFF, MUTED = 0xFFA3AAB6, DIM = 0xFF7D8592;
    private static final Identifier PANDA = Identifier.fromNamespaceAndPath("pandaclient", "textures/gui/panda_logo.png");
    /** Where the middle of a line of text sits below its top, as a share of the font size. */
    static float MID = 0.52f;

    final Draw d;
    final float k, vw, vh = 720f;
    float a = 1f;

    Canvas(GuiGraphics g, int width, int height) {
        d = new Draw(g);
        k = height / 720f;
        vw = width / k;
    }

    static float scaleFor(int height) { return height / 720f; }

    void begin() { d.push(); d.scale(k); d.zoom = k; }
    void end() { d.pop(); d.zoom = 1f; }

    int col(int argb) { return Draw.alpha(argb, Math.round((argb >>> 24) * a)); }

    void txt(String s, float x, float cy, float size, int argb, boolean bold) { d.textScaled(s, x, cy - size * MID, size / 8f, col(argb), bold); }
    float tw(String s, float size, boolean bold) { return Draw.widthF(s, bold) * size / 8f; }
    void txtR(String s, float right, float cy, float size, int argb, boolean bold) { txt(s, right - tw(s, size, bold), cy, size, argb, bold); }
    void txtC(String s, float cx, float cy, float size, int argb, boolean bold) { txt(s, cx - tw(s, size, bold) / 2, cy, size, argb, bold); }
    /** Letter-spaced text (the PANDACLIENT wordmark); returns the x after it. */
    float spaced(String s, float x, float cy, float size, float gap, int argb, boolean bold) {
        for (char ch : s.toCharArray()) {
            String c = String.valueOf(ch);
            txt(c, x, cy, size, argb, bold);
            x += tw(c, size, bold) + gap;
        }
        return x;
    }

    void card(float x1, float y1, float x2, float y2, float r) { d.rounded(x1, y1, x2, y2, r, col(CARD_FILL), col(CARD_LINE)); }
    void icon(int i, float cx, float cy, float size, int argb) { d.icon(i, cx, cy, size, col(argb)); }

    void logo(float x, float y, float size) {
        d.push(); d.translate(x, y); d.scale(size / 256f);
        d.g.blit(RenderPipelines.GUI_TEXTURED, PANDA, 0, 0, 0f, 0f, 256, 256, 256, 256, col(0xFFFFFFFF));
        d.pop();
    }

    static boolean in(double mx, double my, float x1, float y1, float x2, float y2) { return mx >= x1 && my >= y1 && mx < x2 && my < y2; }

    static String name() {
        Minecraft mc = Minecraft.getInstance();
        return mc.getUser() != null ? mc.getUser().getName() : "Player";
    }

    /** Light shade at the top, the panda logo and PANDACLIENT wordmark. */
    void brand() {
        for (int i = 0; i < 8; i++) d.rect(0, i * 9, Math.round(vw) + 1, i * 9 + 9, col(Draw.alpha(0xFF05070B, 70 - i * 9)));
        logo(24, 14, 22);
        spaced("PANDACLIENT", 54, 25, 15, 1.6f, 0xFFFFFFFF, true);
    }

    /** Your name and face, right-aligned so the face's right edge is at {@code right}. */
    void you(float right) {
        Minecraft mc = Minecraft.getInstance();
        float hx = right - 30;
        d.rounded(hx - 1, 9, hx + 31, 41, 7, col(0x33FFFFFF));
        boolean face = a > 0.98f && LobbyPlayer.face(mc, d.g, Math.round(hx + 3), 13, 24);
        if (!face) txtC(name().substring(0, 1).toUpperCase(java.util.Locale.ROOT), hx + 15, 25, 13, 0xFFFFFFFF, true);
        txtR(name(), hx - 10, 25, 13, 0xFFFFFFFF, true);
    }

    /** OneClient's FPS card: a gauge, the FPS and the frame time. */
    void fpsCard(float x1, float y1, float x2, float y2) {
        card(x1, y1, x2, y2, 10);
        float cy = (y1 + y2) / 2;
        icon(Draw.I_GAUGE, x1 + 20, cy, 13, 0xFFFFFFFF);
        int fps = Minecraft.getInstance().getFps();
        txt(fps + " FPS", x1 + 36, cy, 11, 0xFFFFFFFF, true);
        txtR(String.format(java.util.Locale.ROOT, "%.1f ms", 1000f / Math.max(1, fps)), x2 - 12, cy, 11, MUTED, false);
    }

    /** Bottom line: PANDACLIENT, versions, and the Mojang notice on the right. */
    static void footer(Canvas c) {
        float y = c.vh - 12;
        c.logo(22, y - 5, 10);
        float x = 36;
        c.txt("PANDACLIENT", x, y, 9, 0xFFFFFFFF, true);
        x += c.tw("PANDACLIENT", 9, true) + 9;
        String mc = net.fabricmc.loader.api.FabricLoader.getInstance().getModContainer("minecraft").map(m -> m.getMetadata().getVersion().getFriendlyString()).orElse("");
        c.txt("Fabric " + mc, x, y, 9, MUTED, false);
        x += c.tw("Fabric " + mc, 9, false) + 8;
        c.txt("PandaClient " + com.pandaclient.mod.PandaClientMod.VERSION, x, y, 9, MUTED, false);
        c.txtR("Not affiliated with Mojang or Microsoft", c.vw - 22, y, 9, MUTED, false);
    }
}
