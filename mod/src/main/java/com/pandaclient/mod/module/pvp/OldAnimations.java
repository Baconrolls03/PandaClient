package com.pandaclient.mod.module.pvp;

import com.pandaclient.mod.module.Category;
import com.pandaclient.mod.module.Module;
import com.pandaclient.mod.module.Setting;

/** 1.7-style held items: lower, closer and a bit smaller, plus custom size and position. */
public final class OldAnimations extends Module {
    public final Setting.Choice style = add(new Setting.Choice("style", "Style", "1.7", "1.7", "Custom"));
    public final Setting.Num size = add(new Setting.Num("size", "Item size", 0.85, 0.3, 1.5, 0.05));
    public final Setting.Num x = add(new Setting.Num("x", "Left / right", 0, -1, 1, 0.02));
    public final Setting.Num y = add(new Setting.Num("y", "Up / down", 0, -1, 1, 0.02));
    public final Setting.Num z = add(new Setting.Num("z", "Forward / back", 0, -1, 1, 0.02));
    public OldAnimations() { super("oldanimations", "1.7 Animations", "Holds items the old 1.7 way (lower and closer), or wherever you like.", Category.VISUAL, false); }
    public float[] transform() {
        if (style.is("1.7")) return new float[]{0.06f, -0.06f, 0.08f, 0.85f};
        return new float[]{x.asFloat(), y.asFloat(), z.asFloat(), size.asFloat()};
    }
}
