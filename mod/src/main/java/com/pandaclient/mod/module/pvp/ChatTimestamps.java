package com.pandaclient.mod.module.pvp;

import com.pandaclient.mod.module.Category;
import com.pandaclient.mod.module.Module;
import com.pandaclient.mod.module.Setting;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

public final class ChatTimestamps extends Module {
    public final Setting.Bool seconds = add(new Setting.Bool("seconds", "Show seconds", false));
    public final Setting.Bool twelveHour = add(new Setting.Bool("twelveHour", "12-hour clock", false));
    public ChatTimestamps() { super("chattimestamps", "Chat Timestamps", "Adds the time to every chat message.", Category.UTILITY, false); }
    public String stamp() {
        String p = (twelveHour.on() ? "h:mm" : "HH:mm") + (seconds.on() ? ":ss" : "") + (twelveHour.on() ? " a" : "");
        return "[" + LocalTime.now().format(DateTimeFormatter.ofPattern(p)) + "] ";
    }
}
