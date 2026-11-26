package com.pandaclient.mod.module.pvp;

import com.pandaclient.mod.module.Category;
import com.pandaclient.mod.module.Module;
import com.pandaclient.mod.module.Setting;

public final class HitboxColor extends Module {
    public final Setting.Color color = add(new Setting.Color("color", "Hitbox colour", 0xFF6EE08F));
    public HitboxColor() { super("hitboxcolor", "Hitbox Colour", "Changes the colour of hitboxes (turn on Hitboxes to see them).", Category.PVP, false); }
}
