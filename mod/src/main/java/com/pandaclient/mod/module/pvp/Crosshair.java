package com.pandaclient.mod.module.pvp;

import com.pandaclient.mod.module.Category;
import com.pandaclient.mod.module.Module;
import com.pandaclient.mod.module.Setting;

/** Replace the vanilla crosshair with a customisable one. */
public final class Crosshair extends Module {
    public final Setting.Choice style = add(new Setting.Choice("style", "Style", "Cross", "Cross", "Plus", "Dot", "Circle", "Arrow"));
    public final Setting.Color color = add(new Setting.Color("color", "Colour", 0xFFFFFFFF));
    public final Setting.Bool outline = add(new Setting.Bool("outline", "Outline", true));
    public final Setting.Num size = add(new Setting.Num("size", "Size", 5, 1, 15, 1));
    public final Setting.Num gap = add(new Setting.Num("gap", "Gap", 2, 0, 10, 1));
    public final Setting.Num thickness = add(new Setting.Num("thickness", "Thickness", 1, 1, 4, 1));
    public final Setting.Bool dot = add(new Setting.Bool("dot", "Centre dot", false));
    public final Setting.Bool targetColor = add(new Setting.Bool("targetColor", "Change colour on players", true));
    public final Setting.Color target = add(new Setting.Color("target", "Colour on players", 0xFFF26D6D));
    public final Setting.Bool thirdPerson = add(new Setting.Bool("thirdPerson", "Show in third person", false));
    public Crosshair() { super("crosshair", "Custom Crosshair", "Change your crosshair's shape, size and colour.", Category.VISUAL, false); }
}
