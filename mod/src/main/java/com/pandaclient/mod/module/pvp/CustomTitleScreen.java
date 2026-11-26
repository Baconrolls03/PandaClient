package com.pandaclient.mod.module.pvp;

import com.pandaclient.mod.module.Category;
import com.pandaclient.mod.module.Module;
import com.pandaclient.mod.module.Setting;

public final class CustomTitleScreen extends Module {
    public final Setting.Bool stars = add(new Setting.Bool("stars", "Twinkling stars", true));
    public final Setting.Bool fireflies = add(new Setting.Bool("fireflies", "Fireflies", true));
    public CustomTitleScreen() { super("titlescreen", "Title Screen", "PandaClient's animated main menu.", Category.UTILITY, true); }
}
