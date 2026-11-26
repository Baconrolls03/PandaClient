package com.pandaclient.mod.module.pvp;

import com.pandaclient.mod.module.Category;
import com.pandaclient.mod.module.Module;
import com.pandaclient.mod.module.Setting;

public final class Scoreboard extends Module {
    public final Setting.Bool hide = add(new Setting.Bool("hide", "Hide the scoreboard", false));
    public final Setting.Bool numbers = add(new Setting.Bool("numbers", "Show red numbers", false));
    public final Setting.Num size = add(new Setting.Num("size", "Size", 1.0, 0.5, 1.5, 0.05));
    public final Setting.Num offset = add(new Setting.Num("offset", "Move up / down", 0, -150, 150, 1));
    public Scoreboard() { super("scoreboard", "Scoreboard", "Hide the red numbers, resize, move or hide the sidebar.", Category.VISUAL, false); }
}
