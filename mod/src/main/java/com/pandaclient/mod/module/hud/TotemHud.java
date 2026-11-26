package com.pandaclient.mod.module.hud;

import com.pandaclient.mod.util.Game;
import net.minecraft.world.item.Items;

public final class TotemHud extends TextHud {
    public TotemHud() { super("totems", "Totem Counter", "How many Totems of Undying you have.", false, 1.0, 0.65); }
    @Override protected String label() { return "Totems"; }
    @Override protected String value(boolean preview) { return Game.inWorld() ? String.valueOf(Game.count(Items.TOTEM_OF_UNDYING)) : "3"; }
}
