package com.pandaclient.mod.module.hud;

import com.pandaclient.mod.util.Game;

public final class PingHud extends TextHud {
    public PingHud() { super("ping", "Ping", "Shows your latency to the server.", false, 0.0, 0.2); }
    @Override protected String label() { return "Ping"; }
    @Override protected String value(boolean preview) {
        int p = Game.ping();
        return p < 0 ? (preview ? "32 ms" : "-") : p + " ms";
    }
}
