package com.pandaclient.mod.module.pvp;

import com.pandaclient.mod.module.Category;
import com.pandaclient.mod.module.Module;
import com.pandaclient.mod.module.Setting;

public final class TimeChanger extends Module {
    public final Setting.Num time = add(new Setting.Num("time", "Time (0 = sunrise, 6000 = noon)", 6000, 0, 23999, 250));
    public TimeChanger() { super("timechanger", "Time Changer", "Changes the time of day you see (only for you).", Category.VISUAL, false); }
}
