package com.pandaclient.mod.util;

import net.minecraft.client.Minecraft;
import net.minecraft.client.multiplayer.PlayerInfo;
import net.minecraft.client.player.LocalPlayer;
import net.minecraft.core.Holder;
import net.minecraft.world.effect.MobEffect;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;

import java.util.ArrayList;
import java.util.List;

/** Read-only game state for the HUD mods. */
public final class Game {
    private Game() {}
    public record Stack(ItemStack stack, int count, int damage, int maxDamage) {
        static Stack of(ItemStack s) {
            return new Stack(s, s.getCount(), s.isDamageableItem() ? s.getDamageValue() : 0, s.isDamageableItem() ? s.getMaxDamage() : 0);
        }
    }
    public record Effect(Holder<MobEffect> holder, String name, int color, int ticks, boolean infinite) {}

    static Minecraft mc() { return Minecraft.getInstance(); }
    public static boolean inWorld() { return mc().player != null && mc().level != null; }
    public static int fps() { return mc().getFps(); }

    public static double[] pos() { LocalPlayer p = mc().player; return new double[]{p.getX(), p.getY(), p.getZ()}; }
    public static float yaw() { return mc().player.getYRot(); }

    public static String facing() {
        String[] n = {"South (+Z)", "South-West", "West (-X)", "North-West", "North (-Z)", "North-East", "East (+X)", "South-East"};
        int i = Math.floorMod(Math.round(yaw() / 45f), 8);
        return n[i];
    }

    public static double speed(boolean vertical) {
        LocalPlayer p = mc().player;
        double dx = p.getX() - p.xo, dy = p.getY() - p.yo, dz = p.getZ() - p.zo;
        return Math.sqrt(dx * dx + dz * dz + (vertical ? dy * dy : 0)) * 20;
    }

    public static int ping() {
        if (!inWorld() || mc().getConnection() == null) return -1;
        PlayerInfo info = mc().getConnection().getPlayerInfo(mc().player.getUUID());
        return info == null ? -1 : info.getLatency();
    }

    public static String serverAddress() {
        var s = mc().getCurrentServer();
        return s == null ? null : s.ip;
    }

    /** forward, left, back, right, attack, use, jump */
    public static boolean[] movementKeys() {
        var o = mc().options;
        return new boolean[]{o.keyUp.isDown(), o.keyLeft.isDown(), o.keyDown.isDown(), o.keyRight.isDown(),
            o.keyAttack.isDown(), o.keyUse.isDown(), o.keyJump.isDown()};
    }
    public static String keyName(int i) {
        var o = mc().options;
        var k = switch (i) { case 0 -> o.keyUp; case 1 -> o.keyLeft; case 2 -> o.keyDown; default -> o.keyRight; };
        String s = k.getTranslatedKeyMessage().getString();
        return s.length() > 3 ? s.substring(0, 3) : s;
    }

    public static Stack[] armorAndHand(boolean hand) {
        List<Stack> l = new ArrayList<>();
        if (!inWorld()) {
            l.add(Stack.of(new ItemStack(Items.DIAMOND_HELMET))); l.add(Stack.of(new ItemStack(Items.DIAMOND_CHESTPLATE)));
            l.add(Stack.of(new ItemStack(Items.DIAMOND_LEGGINGS))); l.add(Stack.of(new ItemStack(Items.DIAMOND_BOOTS)));
            if (hand) l.add(Stack.of(new ItemStack(Items.DIAMOND_SWORD)));
            return l.toArray(new Stack[0]);
        }
        LocalPlayer p = mc().player;
        for (EquipmentSlot s : new EquipmentSlot[]{EquipmentSlot.HEAD, EquipmentSlot.CHEST, EquipmentSlot.LEGS, EquipmentSlot.FEET}) {
            ItemStack st = p.getItemBySlot(s);
            if (!st.isEmpty()) l.add(Stack.of(st));
        }
        if (hand && !p.getMainHandItem().isEmpty()) l.add(Stack.of(p.getMainHandItem()));
        return l.toArray(new Stack[0]);
    }

    private static final Item[] COUNTED = {Items.ARROW, Items.SPECTRAL_ARROW, Items.ENDER_PEARL, Items.GOLDEN_APPLE,
        Items.ENCHANTED_GOLDEN_APPLE, Items.SPLASH_POTION, Items.POTION, Items.TOTEM_OF_UNDYING, Items.WIND_CHARGE,
        Items.COBWEB, Items.WATER_BUCKET, Items.EXPERIENCE_BOTTLE};

    public static Stack[] countedItems(boolean hideEmpty) {
        List<Stack> l = new ArrayList<>();
        for (Item item : COUNTED) {
            int n = 0;
            if (inWorld()) {
                var inv = mc().player.getInventory();
                for (int i = 0; i < inv.getContainerSize(); i++) {
                    ItemStack s = inv.getItem(i);
                    if (s.is(item)) n += s.getCount();
                }
            } else n = item == Items.ENDER_PEARL ? 16 : item == Items.GOLDEN_APPLE ? 8 : item == Items.ARROW ? 64 : 0;
            if (n == 0 && hideEmpty) continue;
            l.add(new Stack(new ItemStack(item), n, 0, 0));
        }
        return l.toArray(new Stack[0]);
    }

    private static final String[] ROMAN = {"", " II", " III", " IV", " V", " VI", " VII", " VIII", " IX", " X"};

    public static List<Effect> effects() {
        List<Effect> l = new ArrayList<>();
        if (!inWorld()) return l;
        for (MobEffectInstance e : mc().player.getActiveEffects()) {
            int a = e.getAmplifier();
            String name = e.getEffect().value().getDisplayName().getString() + (a >= 0 && a < ROMAN.length ? ROMAN[a] : " " + (a + 1));
            l.add(new Effect(e.getEffect(), name, e.getEffect().value().getColor(), e.getDuration(), e.isInfiniteDuration()));
        }
        return l;
    }
    public static List<Effect> sampleEffects() {
        List<Effect> l = new ArrayList<>();
        l.add(new Effect(MobEffects.SPEED, "Speed II", 0x33EBFF, 20 * 95, false));
        l.add(new Effect(MobEffects.STRENGTH, "Strength", 0xFFC700, 20 * 42, false));
        return l;
    }
    public static String ticksToTime(int ticks) {
        int s = ticks / 20;
        return s >= 3600 ? String.format("%d:%02d:%02d", s / 3600, (s / 60) % 60, s % 60) : String.format("%d:%02d", s / 60, s % 60);
    }
}
