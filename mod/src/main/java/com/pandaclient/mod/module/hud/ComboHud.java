package com.pandaclient.mod.module.hud;

import com.pandaclient.mod.util.Combat;

public final class ComboHud extends TextHud {
    public ComboHud() { super("combo", "Combo Counter", "Counts hits in a row without getting hit back.", false, 0.0, 0.35); }
    @Override protected String label() { return "Combo"; }
    @Override protected String value(boolean preview) {
        return Combat.combo > 0 ? Combat.combo + (Combat.combo == 1 ? " hit" : " hits") : (preview ? "3 hits" : "No combo");
    }
}
