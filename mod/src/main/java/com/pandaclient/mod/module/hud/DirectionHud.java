package com.pandaclient.mod.module.hud;

import com.pandaclient.mod.gui.Draw;
import com.pandaclient.mod.module.Setting;
import com.pandaclient.mod.util.Game;

/** A compass strip like Lunar's Direction HUD. */
public final class DirectionHud extends HudModule {
    public final Setting.Color color = add(new Setting.Color("color", "Colour", 0xFFFFFFFF));
    public final Setting.Color accent = add(new Setting.Color("accent", "Marker colour", 0xFF6EE08F));
    public final Setting.Bool background = add(new Setting.Bool("bg", "Background", false));
    public final Setting.Color backgroundColor = add(new Setting.Color("backgroundColor", "Background colour", 0x8C0F141C));

    public DirectionHud() { super("direction", "Direction", "A compass that shows which way you are facing.", false, 0.5, 0.0); }
    @Override public int width() { return 150; }
    @Override public int height() { return 22; }

    private static final String[] MARKS = {"S", "SW", "W", "NW", "N", "NE", "E", "SE"};

    @Override public void render(Draw d, boolean preview) {
        float yaw = Game.inWorld() ? Game.yaw() : 180f;
        if (background.on()) d.rect(0, 0, 150, 22, backgroundColor.argb());
        d.enableScissor(0, 0, 150, 22);
        float pxPerDeg = 1.5f;
        for (int deg = -180; deg <= 540; deg += 15) {
            float diff = deg - yaw;
            while (diff < -180) diff += 360;
            while (diff > 180) diff -= 360;
            int x = Math.round(75 + diff * pxPerDeg);
            if (x < -10 || x > 160) continue;
            int norm = Math.floorMod(deg, 360);
            if (norm % 45 == 0) {
                String m = MARKS[norm / 45];
                d.text(m, x - Draw.textWidth(m) / 2, 4, m.length() == 1 ? color.argb() : (color.argb() & 0x00FFFFFF) | 0xA0000000, true);
            } else d.rect(x, 7, x + 1, 11, (color.argb() & 0x00FFFFFF) | 0x80000000);
        }
        d.disableScissor();
        d.rect(74, 15, 76, 20, accent.argb());
        String num = String.valueOf(Math.floorMod(Math.round(yaw), 360));
        d.text(num, 75 - Draw.textWidth(num) / 2 + 12, 13, accent.argb(), true);
    }
}
