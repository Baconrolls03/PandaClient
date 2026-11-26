package com.pandaclient.mod.module.hud;

import com.pandaclient.mod.gui.Draw;
import com.pandaclient.mod.module.Setting;
import com.pandaclient.mod.util.Combat;
import net.minecraft.client.Minecraft;
import net.minecraft.world.entity.LivingEntity;

/** Name and health of the player/mob you last hit. */
public final class TargetHud extends HudModule {
    public final Setting.Num hideAfter = add(new Setting.Num("hideAfter", "Hide after (s)", 4, 1, 15, 1));
    public final Setting.Color background = add(new Setting.Color("background", "Background colour", 0xB00F141C));
    public TargetHud() { super("targethud", "Target HUD", "Shows the name and health of who you are fighting.", false, 0.5, 0.62); }

    private LivingEntity target() {
        var mc = Minecraft.getInstance();
        if (mc.level == null || Combat.lastTargetId < 0 || System.currentTimeMillis() - Combat.lastHitAt > hideAfter.get() * 1000) return null;
        return mc.level.getEntity(Combat.lastTargetId) instanceof LivingEntity le && le.isAlive() ? le : null;
    }
    @Override public boolean visible() { return target() != null; }
    @Override public int width() { return 110; }
    @Override public int height() { return 28; }
    @Override public void render(Draw d, boolean preview) {
        LivingEntity t = target();
        String name = t != null ? t.getName().getString() : "Opponent";
        float hp = t != null ? t.getHealth() + t.getAbsorptionAmount() : 14, max = t != null ? Math.max(1, t.getMaxHealth()) : 20;
        d.round(0, 0, 110, 28, background.argb());
        d.text(Draw.textWidth(name) > 100 ? name.substring(0, 14) : name, 5, 4, 0xFFFFFFFF, true);
        float f = Math.max(0, Math.min(1, hp / max));
        int col = f > 0.6f ? 0xFF6EE08F : f > 0.3f ? 0xFFF5C451 : 0xFFF26D6D;
        d.rect(5, 17, 105, 22, 0xFF263140);
        d.rect(5, 17, 5 + Math.round(100 * f), 22, col);
        String v = String.format("%.1f", hp / 2) + " ❤";
        d.text(v, 105 - Draw.textWidth(v), 4, col, true);
    }
}
