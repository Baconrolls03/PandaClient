package com.pandaclient.mod.module.hud;

import com.pandaclient.mod.module.Setting;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

public final class ClockHud extends TextHud {
    public final Setting.Bool twelveHour = add(new Setting.Bool("twelveHour", "12-hour clock", false));
    public final Setting.Bool seconds = add(new Setting.Bool("seconds", "Show seconds", false));
    public ClockHud() { super("clock", "Clock", "Shows the real-world time.", false, 1.0, 0.0); }
    @Override protected String label() { return "Time"; }
    @Override protected String value(boolean preview) {
        String p = (twelveHour.on() ? "h:mm" : "HH:mm") + (seconds.on() ? ":ss" : "") + (twelveHour.on() ? " a" : "");
        return LocalTime.now().format(DateTimeFormatter.ofPattern(p));
    }
}
