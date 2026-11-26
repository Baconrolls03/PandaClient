package com.pandaclient.mod.module.hud;

import com.pandaclient.mod.util.Game;
import net.minecraft.world.item.Items;

public final class ArrowHud extends TextHud {
    public ArrowHud() { super("arrows", "Arrow Counter", "How many arrows you have.", false, 1.0, 0.7); }
    @Override protected String label() { return "Arrows"; }
    @Override protected String value(boolean preview) {
        return Game.inWorld() ? String.valueOf(Game.count(Items.ARROW) + Game.count(Items.SPECTRAL_ARROW) + Game.count(Items.TIPPED_ARROW)) : "64";
    }
}
