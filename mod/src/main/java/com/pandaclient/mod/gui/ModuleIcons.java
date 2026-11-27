package com.pandaclient.mod.gui;

import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;

import java.util.HashMap;
import java.util.Map;

/** A real Minecraft item as the picture for each PandaClient mod in the menu (like OneConfig's mod icons). */
public final class ModuleIcons {
    private ModuleIcons() {}
    private static final Map<String, ItemStack> CACHE = new HashMap<>();

    private static Item item(String id) {
        return switch (id) {
            case "armor" -> Items.DIAMOND_CHESTPLATE;
            case "arrows" -> Items.ARROW;
            case "autogg" -> Items.WRITABLE_BOOK;
            case "badge" -> Items.NAME_TAG;
            case "blockoutline" -> Items.GLASS;
            case "bowcharge" -> Items.BOW;
            case "chattimestamps" -> Items.BOOK;
            case "clock" -> Items.CLOCK;
            case "combo" -> Items.BLAZE_POWDER;
            case "coords" -> Items.COMPASS;
            case "cosmetics" -> Items.ELYTRA;
            case "cps" -> Items.STONE_BUTTON;
            case "crosshair" -> Items.TARGET;
            case "day" -> Items.SUNFLOWER;
            case "direction" -> Items.RECOVERY_COMPASS;
            case "fps" -> Items.REDSTONE;
            case "freelook" -> Items.ENDER_EYE;
            case "fullbright" -> Items.TORCH;
            case "hitboxcolor" -> Items.MAGENTA_DYE;
            case "hitboxes" -> Items.ITEM_FRAME;
            case "hitcolor" -> Items.RED_DYE;
            case "hitsounds" -> Items.NOTE_BLOCK;
            case "itemcounter" -> Items.CHEST;
            case "keystrokes" -> Items.OAK_BUTTON;
            case "lowfire" -> Items.FLINT_AND_STEEL;
            case "memory" -> Items.COMPARATOR;
            case "nametags" -> Items.NAME_TAG;
            case "nohurtcam" -> Items.SHIELD;
            case "oldanimations" -> Items.IRON_SWORD;
            case "particles" -> Items.FIREWORK_STAR;
            case "ping" -> Items.REPEATER;
            case "potions" -> Items.POTION;
            case "reach" -> Items.STICK;
            case "saturation" -> Items.COOKED_BEEF;
            case "scoreboard" -> Items.OAK_SIGN;
            case "server" -> Items.GRASS_BLOCK;
            case "skycolor" -> Items.LIGHT_BLUE_DYE;
            case "speed" -> Items.FEATHER;
            case "targethud" -> Items.PLAYER_HEAD;
            case "timechanger" -> Items.CLOCK;
            case "titlescreen" -> Items.PAINTING;
            case "togglesprint" -> Items.LEATHER_BOOTS;
            case "totems" -> Items.TOTEM_OF_UNDYING;
            case "weatherchanger" -> Items.WATER_BUCKET;
            case "zoom" -> Items.SPYGLASS;
            default -> Items.PAPER;
        };
    }

    public static ItemStack of(String id) {
        return CACHE.computeIfAbsent(id, k -> new ItemStack(item(k)));
    }
}
