package com.pandaclient.mod.module.pvp;

import com.pandaclient.mod.module.Category;
import com.pandaclient.mod.module.Module;

/** Shows entity hitboxes (same as F3+B) as a simple on/off switch. */
public final class Hitboxes extends Module {
    public Hitboxes() { super("hitboxes", "Hitboxes", "Shows the hitboxes of players and mobs (like F3+B).", Category.PVP, false); }
}
