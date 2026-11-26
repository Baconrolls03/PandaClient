package com.pandaclient.mod.module.hud;

import com.pandaclient.mod.util.Game;

public final class FpsHud extends TextHud {
    public FpsHud() { super("fps", "FPS", "Shows your frames per second.", true, 0.0, 0.0); }
    @Override protected String label() { return "FPS"; }
    @Override protected String value(boolean preview) { return preview && !Game.inWorld() ? "240" : String.valueOf(Game.fps()); }
}
