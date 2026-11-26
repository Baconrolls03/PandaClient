package com.pandaclient.mod.module.hud;

import com.pandaclient.mod.gui.Draw;
import com.pandaclient.mod.module.Setting;

/** A one-line HUD element ("FPS: 240") with the usual Lunar-style options. */
public abstract class TextHud extends HudModule {
    public final Setting.Color textColor = add(new Setting.Color("textColor", "Text colour", 0xFFFFFFFF));
    public final Setting.Color labelColor = add(new Setting.Color("labelColor", "Label colour", 0xFF6EE08F));
    public final Setting.Bool background = add(new Setting.Bool("background", "Background", true));
    public final Setting.Color backgroundColor = add(new Setting.Color("backgroundColor", "Background colour", 0x8C0F141C));
    public final Setting.Bool shadow = add(new Setting.Bool("shadow", "Text shadow", true));
    public final Setting.Bool brackets = add(new Setting.Bool("brackets", "Brackets", false));
    public final Setting.Bool showLabel = add(new Setting.Bool("showLabel", "Show label", true));

    protected TextHud(String id, String name, String description, boolean on, double fx, double fy) {
        super(id, name, description, on, fx, fy);
    }

    /** Label shown before the value, e.g. "FPS". Empty for none. */
    protected abstract String label();
    /** The value text; {@code preview} = sample data for the editor. */
    protected abstract String value(boolean preview);

    private String text(boolean preview) {
        String v = value(preview);
        String l = showLabel.on() && !label().isEmpty() ? label() + ": " : "";
        return brackets.on() ? "[" + l + v + "]" : l + v;
    }

    @Override public int width() { return Draw.textWidth(text(true)) + (background.on() ? 10 : 0); }
    @Override public int height() { return background.on() ? 16 : 9; }

    @Override public void render(Draw d, boolean preview) {
        String v = value(preview);
        String l = showLabel.on() && !label().isEmpty() ? label() + ": " : "";
        int w = Draw.textWidth((brackets.on() ? "[]" : "") + l + v) + (background.on() ? 10 : 0);
        int x = 0, y = 0;
        if (background.on()) { d.rect(0, 0, w, 16, backgroundColor.argb()); x = 5; y = 4; }
        if (brackets.on()) x = d.text("[", x, y, textColor.argb(), shadow.on());
        if (!l.isEmpty()) x = d.text(l, x, y, labelColor.argb(), shadow.on());
        x = d.text(v, x, y, textColor.argb(), shadow.on());
        if (brackets.on()) d.text("]", x, y, textColor.argb(), shadow.on());
    }
}
