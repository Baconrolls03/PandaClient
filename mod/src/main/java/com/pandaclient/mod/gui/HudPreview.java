package com.pandaclient.mod.gui;

import com.pandaclient.mod.util.IconCache;
import com.pandaclient.mod.util.LobbyPanorama;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.renderer.RenderPipelines;
import net.minecraft.resources.Identifier;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;

import java.nio.file.Files;
import java.nio.file.Path;

/**
 * What the game looks like, for placing HUD mods when you aren't in a world: the view from where you last
 * played (or Minecraft's panorama) with a hotbar, hearts, hunger, armour, XP bar and crosshair.
 */
final class HudPreview {
    private HudPreview() {}

    private static final Identifier PANORAMA = Identifier.withDefaultNamespace("textures/gui/title/background/panorama_0.png");
    private static ItemStack[] hotbar;

    private static Identifier sprite(String name) { return Identifier.withDefaultNamespace("hud/" + name); }

    static void draw(Minecraft mc, GuiGraphics g, int w, int h) {
        // the scene: a square picture covering the screen
        Identifier tex = PANORAMA;
        try {
            Path face = LobbyPanorama.previewFace();
            if (face != null) {
                IconCache.Icon icon = IconCache.get("preview:" + face + ":" + Files.getLastModifiedTime(face).toMillis(), () -> Files.newInputStream(face));
                if (icon != null) tex = icon.id();
            }
        } catch (Exception ignored) {}
        int size = Math.max(w, h);
        g.blit(RenderPipelines.GUI_TEXTURED, tex, (w - size) / 2, (h - size) / 2, 0f, 0f, size, size, 256, 256, 256, 256);
        g.fill(0, 0, w, h, 0x1A000000);

        try {
            // crosshair
            g.blitSprite(RenderPipelines.GUI_TEXTURED, sprite("crosshair"), w / 2 - 7, h / 2 - 7, 15, 15);
            // hotbar with a typical PvP loadout
            int hx = w / 2 - 91, hy = h - 22;
            g.blitSprite(RenderPipelines.GUI_TEXTURED, sprite("hotbar"), hx, hy, 182, 22);
            g.blitSprite(RenderPipelines.GUI_TEXTURED, sprite("hotbar_selection"), hx - 1, hy - 1, 24, 23);
            if (hotbar == null) hotbar = new ItemStack[]{
                new ItemStack(Items.DIAMOND_SWORD), new ItemStack(Items.BOW), new ItemStack(Items.ENDER_PEARL, 16), new ItemStack(Items.GOLDEN_APPLE, 8),
                new ItemStack(Items.COBBLESTONE, 64), new ItemStack(Items.WATER_BUCKET), new ItemStack(Items.COOKED_BEEF, 32), new ItemStack(Items.DIAMOND_PICKAXE),
                new ItemStack(Items.ARROW, 64)};
            for (int i = 0; i < hotbar.length; i++) {
                g.renderItem(hotbar[i], hx + 3 + i * 20, hy + 3);
                g.renderItemDecorations(mc.font, hotbar[i], hx + 3 + i * 20, hy + 3);
            }
            // XP bar, hearts, hunger, armour
            g.blitSprite(RenderPipelines.GUI_TEXTURED, sprite("experience_bar_background"), hx, hy - 7, 182, 5);
            for (int i = 0; i < 10; i++) {
                int x = hx + i * 8, y = hy - 17;
                g.blitSprite(RenderPipelines.GUI_TEXTURED, sprite("heart/container"), x, y, 9, 9);
                g.blitSprite(RenderPipelines.GUI_TEXTURED, sprite("heart/full"), x, y, 9, 9);
                g.blitSprite(RenderPipelines.GUI_TEXTURED, sprite("armor_full"), x, y - 10, 9, 9);
                int fx = hx + 182 - 9 - i * 8;
                g.blitSprite(RenderPipelines.GUI_TEXTURED, sprite("food_empty"), fx, y, 9, 9);
                g.blitSprite(RenderPipelines.GUI_TEXTURED, sprite("food_full"), fx, y, 9, 9);
            }
        } catch (Throwable ignored) {
            // a sprite missing on this version: the picture alone is fine
        }
    }
}
