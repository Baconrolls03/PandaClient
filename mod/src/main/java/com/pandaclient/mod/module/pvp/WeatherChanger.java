package com.pandaclient.mod.module.pvp;

import com.pandaclient.mod.module.Category;
import com.pandaclient.mod.module.Module;
import com.pandaclient.mod.module.Setting;

public final class WeatherChanger extends Module {
    public final Setting.Choice weather = add(new Setting.Choice("weather", "Weather", "Clear", "Clear", "Rain", "Thunder"));
    public WeatherChanger() { super("weatherchanger", "Weather Changer", "Changes the weather you see (only for you).", Category.VISUAL, false); }
    public float rain() { return weather.is("Clear") ? 0f : 1f; }
    public float thunder() { return weather.is("Thunder") ? 1f : 0f; }
}
