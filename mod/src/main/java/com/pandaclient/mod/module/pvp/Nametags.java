package com.pandaclient.mod.module.pvp;

import com.pandaclient.mod.module.Category;
import com.pandaclient.mod.module.Module;
import com.pandaclient.mod.module.Setting;

public final class Nametags extends Module {
    public final Setting.Bool showOwn = add(new Setting.Bool("own", "Show your own nametag in F5", true));
    public final Setting.Bool health = add(new Setting.Bool("health", "Show health next to names", true));
    public Nametags() { super("nametags", "Nametags", "Your own nametag in third person, and players' health next to their names.", Category.VISUAL, false); }
}
