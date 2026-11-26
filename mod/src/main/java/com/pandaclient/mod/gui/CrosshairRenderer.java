package com.pandaclient.mod.gui;

import com.pandaclient.mod.module.Modules;
import com.pandaclient.mod.module.pvp.Crosshair;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.phys.EntityHitResult;

/** Draws the Custom Crosshair mod's crosshair. */
public final class CrosshairRenderer {
    private CrosshairRenderer() {}

    public static void render(GuiGraphics g) {
        Minecraft mc = Minecraft.getInstance();
        Crosshair c = Modules.CROSSHAIR;
        if (mc.options.hideGui) return;
        if (!mc.options.getCameraType().isFirstPerson() && !c.thirdPerson.on()) return;
        Draw d = new Draw(g);
        int cx = g.guiWidth() / 2, cy = g.guiHeight() / 2;
        int color = c.color.argb();
        if (c.targetColor.on() && mc.hitResult instanceof EntityHitResult e && e.getEntity() instanceof Player) color = c.target.argb();
        int s = c.size.asInt(), gap = c.gap.asInt(), t = c.thickness.asInt();
        int lo = -(t / 2), hi = lo + t;
        int out = c.outline.on() ? 0xC0000000 : 0;
        switch (c.style.get()) {
            case "Dot" -> box(d, cx + lo - 1, cy + lo - 1, cx + hi + 1, cy + hi + 1, color, out);
            case "Circle" -> {
                int r = Math.max(2, s);
                for (int a = 0; a < 360; a += 6) {
                    double rad = Math.toRadians(a);
                    int x = cx + (int) Math.round(Math.cos(rad) * r), y = cy + (int) Math.round(Math.sin(rad) * r);
                    if (out != 0) d.rect(x - 1, y - 1, x + t + 1, y + t + 1, out);
                    d.rect(x, y, x + t, y + t, color);
                }
            }
            case "Arrow" -> {
                for (int i = 0; i < s; i++) {
                    d.rect(cx - i - 1 + lo, cy + gap + i, cx - i + lo + t - 1, cy + gap + i + t, color);
                    d.rect(cx + i + lo, cy + gap + i, cx + i + lo + t, cy + gap + i + t, color);
                }
            }
            case "Plus" -> {
                box(d, cx - s, cy + lo, cx + s + 1, cy + hi, color, out);
                box(d, cx + lo, cy - s, cx + hi, cy + s + 1, color, out);
            }
            default -> { // Cross with a gap in the middle
                box(d, cx - gap - s, cy + lo, cx - gap, cy + hi, color, out);
                box(d, cx + gap + 1, cy + lo, cx + gap + 1 + s, cy + hi, color, out);
                box(d, cx + lo, cy - gap - s, cx + hi, cy - gap, color, out);
                box(d, cx + lo, cy + gap + 1, cx + hi, cy + gap + 1 + s, color, out);
            }
        }
        if (c.dot.on() && !c.style.is("Dot")) box(d, cx + lo, cy + lo, cx + hi, cy + hi, color, out);
    }

    private static void box(Draw d, int x1, int y1, int x2, int y2, int color, int outline) {
        if (outline != 0) d.rect(x1 - 1, y1 - 1, x2 + 1, y2 + 1, outline);
        d.rect(x1, y1, x2, y2, color);
    }
}
