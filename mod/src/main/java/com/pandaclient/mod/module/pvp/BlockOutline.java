package com.pandaclient.mod.module.pvp;

import com.pandaclient.mod.module.Category;
import com.pandaclient.mod.module.Module;
import com.pandaclient.mod.module.Setting;

public final class BlockOutline extends Module {
    public final Setting.Color color = add(new Setting.Color("color", "Outline colour", 0xFF6EE08F));
    public BlockOutline() { super("blockoutline", "Block Outline", "Changes the colour of the outline on the block you look at.", Category.VISUAL, false); }
}
