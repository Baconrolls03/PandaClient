package com.pandaclient.mod.module.pvp;

import com.pandaclient.mod.module.Category;
import com.pandaclient.mod.module.Module;
import com.pandaclient.mod.module.Setting;

/** Shows the PandaClient cosmetics players picked in the launcher's Wardrobe. */
public final class Cosmetics extends Module {
    public final Setting.Bool capes = add(new Setting.Bool("capes", "Show capes", true));
    public final Setting.Bool elytra = add(new Setting.Bool("elytra", "Use the cape on elytras", true));
    public final Setting.Bool accessories = add(new Setting.Bool("accessories", "Show hats, glasses, wings...", true));
    public final Setting.Bool keepMojangCape = add(new Setting.Bool("keepMojang", "Prefer Mojang / Minecon capes", false));
    public Cosmetics() { super("cosmetics", "Cosmetics", "See the capes, hats, glasses and wings PandaClient players wear (pick yours in the launcher's Wardrobe).", Category.UTILITY, true); }
}
