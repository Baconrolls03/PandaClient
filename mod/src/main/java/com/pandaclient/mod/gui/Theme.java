package com.pandaclient.mod.gui;

import com.pandaclient.mod.module.Modules;

/** PandaClient's colours (same as the launcher). */
public final class Theme {
    private Theme() {}
    public static final int BG = 0xF00F141C, SURFACE = 0xFF161D27, RAISED = 0xFF1E2733, BORDER = 0xFF263140,
        HOVER = 0xFF243041, TEXT = 0xFFE6EDF3, MUTED = 0xFF8B98A9, DANGER = 0xFFF26D6D, OFF = 0xFF3A4656;
    public static int accent() { return Modules.accent(); }
}
