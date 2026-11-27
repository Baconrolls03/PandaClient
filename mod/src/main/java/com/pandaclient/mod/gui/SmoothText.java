package com.pandaclient.mod.gui;

import com.mojang.blaze3d.platform.NativeImage;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.renderer.RenderPipelines;
import net.minecraft.client.renderer.texture.DynamicTexture;
import net.minecraft.resources.Identifier;

import java.awt.Font;
import java.awt.FontMetrics;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.font.FontRenderContext;
import java.awt.image.BufferedImage;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Crisp, anti-aliased text in the Poppins font at any size: each string is drawn once at the exact size it
 * appears on screen (in real pixels) and kept as a small texture, the way custom clients draw their UI text.
 */
final class SmoothText {
    private SmoothText() {}

    /** Baseline below the top of a line, as a share of the font size. */
    static final float BASE = 0.85f;
    private static final int PAD = 2, MAX = 900;

    private static Font regular, bold;
    private static boolean failed;
    private static final FontRenderContext FRC = new FontRenderContext(null, true, true);
    private static final Map<String, Float> WIDTH = new HashMap<>(), WIDTH_BOLD = new HashMap<>();

    private record Key(String s, boolean bold, int quarterPx) {}
    private record Entry(Identifier id, int w, int h, int baseline) {}
    private static final LinkedHashMap<Key, Entry> CACHE = new LinkedHashMap<>(256, 0.75f, true);
    private static int counter;

    static boolean ready() {
        if (regular == null && !failed) {
            try {
                regular = load("poppins-medium.ttf");
                bold = load("poppins-semibold.ttf");
            } catch (Throwable t) {
                failed = true;
                System.err.println("[PandaClient] Smooth font unavailable, using Minecraft's: " + t);
            }
        }
        return !failed;
    }

    private static Font load(String file) throws Exception {
        try (InputStream in = SmoothText.class.getResourceAsStream("/assets/pandaclient/font/" + file)) {
            if (in == null) throw new IllegalStateException("missing " + file);
            return Font.createFont(Font.TRUETYPE_FONT, in);
        }
    }

    static boolean canShow(String s) { return ready() && regular.canDisplayUpTo(s) == -1; }

    /** Width of {@code s} at font size {@code size}. */
    static float width(String s, float size, boolean b) {
        Map<String, Float> cache = b ? WIDTH_BOLD : WIDTH;
        Float w = cache.get(s);
        if (w == null) {
            if (cache.size() > 5000) cache.clear();
            w = (float) (b ? bold : regular).deriveFont(64f).getStringBounds(s, FRC).getWidth();
            cache.put(s, w);
        }
        return w * size / 64f;
    }

    private static float guiScale() {
        try { return Math.max(1f, (float) Minecraft.getInstance().getWindow().getGuiScale()); } catch (Throwable t) { return 2f; }
    }

    /** Draws {@code s} with the top of its line at x, y (current pose units), font size {@code size}. */
    static void draw(GuiGraphics g, String s, float x, float y, float size, int argb, boolean b) {
        if (s.isEmpty() || (argb >>> 24) == 0) return;
        var m = g.pose();
        float sx = (float) Math.hypot(m.m00(), m.m01());
        float gs = guiScale();
        float phys = size * sx * gs;
        if (phys < 2f) return;
        Entry e = entry(s, b, Math.round(phys * 4));
        if (e == null) return;
        float u = 1f / (sx * gs);
        float tx = x - PAD * u, ty = y + size * BASE - e.baseline * u;
        // snap to the screen's pixel grid so the texture maps one-to-one and stays sharp
        float px = Math.round((m.m20() + sx * tx) * gs), py = Math.round((m.m21() + sx * ty) * gs);
        tx = (px / gs - m.m20()) / sx;
        ty = (py / gs - m.m21()) / sx;
        m.pushMatrix();
        m.translate(tx, ty);
        m.scale(u, u);
        g.blit(RenderPipelines.GUI_TEXTURED, e.id, 0, 0, 0f, 0f, e.w, e.h, e.w, e.h, argb);
        m.popMatrix();
    }

    private static Entry entry(String s, boolean b, int quarterPx) {
        Key key = new Key(s, b, quarterPx);
        Entry e = CACHE.get(key);
        if (e != null) return e;
        try {
            Font f = (b ? bold : regular).deriveFont(quarterPx / 4f);
            BufferedImage probe = new BufferedImage(1, 1, BufferedImage.TYPE_INT_ARGB);
            Graphics2D pg = probe.createGraphics();
            pg.setFont(f);
            pg.setRenderingHint(RenderingHints.KEY_FRACTIONALMETRICS, RenderingHints.VALUE_FRACTIONALMETRICS_ON);
            FontMetrics fm = pg.getFontMetrics();
            int w = (int) Math.ceil(f.getStringBounds(s, pg.getFontRenderContext()).getWidth()) + PAD * 2;
            int ascent = fm.getAscent(), h = ascent + fm.getDescent() + PAD * 2;
            pg.dispose();
            BufferedImage img = new BufferedImage(Math.max(1, w), Math.max(1, h), BufferedImage.TYPE_INT_ARGB);
            Graphics2D g2 = img.createGraphics();
            g2.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
            g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g2.setRenderingHint(RenderingHints.KEY_FRACTIONALMETRICS, RenderingHints.VALUE_FRACTIONALMETRICS_ON);
            g2.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g2.setColor(java.awt.Color.WHITE);
            g2.setFont(f);
            g2.drawString(s, PAD, PAD + ascent);
            g2.dispose();
            NativeImage ni = new NativeImage(img.getWidth(), img.getHeight(), false);
            for (int yy = 0; yy < img.getHeight(); yy++)
                for (int xx = 0; xx < img.getWidth(); xx++)
                    ni.setPixel(xx, yy, (img.getRGB(xx, yy) & 0xFF000000) | 0xFFFFFF);
            Identifier id = Identifier.fromNamespaceAndPath("pandaclient", "text/" + (counter++));
            Minecraft.getInstance().getTextureManager().register(id, new DynamicTexture(() -> "PandaClient text", ni));
            e = new Entry(id, img.getWidth(), img.getHeight(), PAD + ascent);
            CACHE.put(key, e);
            if (CACHE.size() > MAX) {
                Iterator<Map.Entry<Key, Entry>> it = CACHE.entrySet().iterator();
                for (int i = 0; i < MAX / 4 && it.hasNext(); i++) {
                    Entry old = it.next().getValue();
                    it.remove();
                    try { Minecraft.getInstance().getTextureManager().release(old.id); } catch (Throwable ignored) {}
                }
            }
            return e;
        } catch (Throwable t) {
            failed = true;
            System.err.println("[PandaClient] Smooth font failed, using Minecraft's: " + t);
            return null;
        }
    }
}
