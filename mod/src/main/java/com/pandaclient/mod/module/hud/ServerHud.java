package com.pandaclient.mod.module.hud;

import com.pandaclient.mod.util.Game;

public final class ServerHud extends TextHud {
    public ServerHud() { super("server", "Server Address", "Shows the server you are playing on.", false, 0.0, 0.25); }
    @Override protected String label() { return "IP"; }
    @Override protected String value(boolean preview) {
        String s = Game.serverAddress();
        return s == null ? (preview ? "play.example.net" : "Singleplayer") : s;
    }
}
