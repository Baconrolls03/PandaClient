package com.pandaclient.mod.module.hud;

import com.pandaclient.mod.gui.Draw;
import net.minecraft.client.Minecraft;
import net.minecraft.world.item.BowItem;
import net.minecraft.world.item.Items;

/** A bar that fills while you draw a bow. */
public final class BowChargeHud extends HudModule {
    public BowChargeHud() { super("bowcharge", "Bow Charge", "Shows how far your bow is drawn.", false, 0.5, 0.56); }
    private float charge() {
        var p = Minecraft.getInstance().player;
        if (p == null || !p.isUsingItem() || !p.getUseItem().is(Items.BOW)) return -1;
        return BowItem.getPowerForTime(p.getTicksUsingItem());
    }
    @Override public boolean visible() { return charge() >= 0; }
    @Override public int width() { return 60; }
    @Override public int height() { return 6; }
    @Override public void render(Draw d, boolean preview) {
        float c = Math.max(0, charge() < 0 ? 0.7f : charge());
        d.rect(0, 0, 60, 6, 0xB00F141C);
        d.rect(1, 1, 1 + Math.round(58 * c), 5, c >= 1 ? 0xFF6EE08F : 0xFFF5C451);
    }
}
