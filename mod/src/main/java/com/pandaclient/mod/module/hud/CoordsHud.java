package com.pandaclient.mod.module.hud;

import com.pandaclient.mod.gui.Draw;
import com.pandaclient.mod.module.Setting;
import com.pandaclient.mod.util.Game;

public final class CoordsHud extends HudModule {
    public final Setting.Bool showDirection = add(new Setting.Bool("direction", "Show direction", true));
    public final Setting.Num decimals = add(new Setting.Num("decimals", "Decimals", 0, 0, 2, 1));
    public final Setting.Color textColor = add(new Setting.Color("textColor", "Text colour", 0xFFFFFFFF));
    public final Setting.Color labelColor = add(new Setting.Color("labelColor", "Label colour", 0xFF6EE08F));
    public final Setting.Bool background = add(new Setting.Bool("bg", "Background", false));
    public final Setting.Color backgroundColor = add(new Setting.Color("backgroundColor", "Background colour", 0x8C0F141C));
    public final Setting.Bool shadow = add(new Setting.Bool("shadow", "Text shadow", true));

    public CoordsHud() { super("coords", "Coordinates", "Shows your X / Y / Z position.", true, 0.0, 0.12); }

    private String[][] lines(boolean preview) {
        double[] p = Game.inWorld() ? Game.pos() : new double[]{128.5, 64, -256.5};
        String f = "%." + decimals.asInt() + "f";
        java.util.List<String[]> l = new java.util.ArrayList<>();
        l.add(new String[]{"X: ", String.format(f, p[0])});
        l.add(new String[]{"Y: ", String.format(f, p[1])});
        l.add(new String[]{"Z: ", String.format(f, p[2])});
        if (showDirection.on()) l.add(new String[]{"Facing: ", Game.inWorld() ? Game.facing() : "North (-Z)"});
        return l.toArray(new String[0][]);
    }

    @Override public int width() {
        int w = 0; for (String[] s : lines(true)) w = Math.max(w, Draw.textWidth(s[0] + s[1]));
        return w + (background.on() ? 10 : 0);
    }
    @Override public int height() { return lines(true).length * 10 + (background.on() ? 7 : -1); }
    @Override public void render(Draw d, boolean preview) {
        String[][] ls = lines(preview);
        int pad = background.on() ? 5 : 0;
        if (background.on()) d.rect(0, 0, width(), height(), backgroundColor.argb());
        int y = pad == 0 ? 0 : 4;
        for (String[] s : ls) {
            int x = d.text(s[0], pad, y, labelColor.argb(), shadow.on());
            d.text(s[1], x, y, textColor.argb(), shadow.on());
            y += 10;
        }
    }
}
