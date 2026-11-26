package com.pandaclient.mod.module.hud;

import com.pandaclient.mod.module.Setting;
import com.pandaclient.mod.util.Combat;

/** Shows how far away your last hit landed (display only). */
public final class ReachHud extends TextHud {
    public final Setting.Num hideAfter = add(new Setting.Num("hideAfter", "Reset after (s)", 3, 1, 10, 1));
    public ReachHud() { super("reach", "Reach Display", "Shows the distance of your last hit.", false, 0.0, 0.3); }
    @Override protected String label() { return "Reach"; }
    @Override protected String value(boolean preview) {
        boolean fresh = Combat.lastReach >= 0 && System.currentTimeMillis() - Combat.lastHitAt < hideAfter.get() * 1000;
        return fresh ? String.format("%.2f blocks", Combat.lastReach) : (preview ? "2.94 blocks" : "-");
    }
}
