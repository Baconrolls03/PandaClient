package com.pandaclient.mod.module.hud;

import com.pandaclient.mod.gui.Draw;
import com.pandaclient.mod.module.Setting;
import com.pandaclient.mod.util.Clicks;
import com.pandaclient.mod.util.Game;

/** W A S D + mouse buttons + space bar, lighting up when pressed. */
public final class KeystrokesHud extends HudModule {
    public final Setting.Bool mouse = add(new Setting.Bool("mouse", "Show mouse buttons", true));
    public final Setting.Bool cps = add(new Setting.Bool("cps", "Show CPS on mouse buttons", true));
    public final Setting.Bool space = add(new Setting.Bool("space", "Show space bar", true));
    public final Setting.Color keyColor = add(new Setting.Color("keyColor", "Key colour", 0x8C0F141C));
    public final Setting.Color pressedColor = add(new Setting.Color("pressedColor", "Pressed colour", 0xCCE6EDF3));
    public final Setting.Color textColor = add(new Setting.Color("textColor", "Text colour", 0xFFFFFFFF));
    public final Setting.Color pressedTextColor = add(new Setting.Color("pressedTextColor", "Pressed text colour", 0xFF0F141C));
    public final Setting.Num fade = add(new Setting.Num("fade", "Fade speed", 6, 1, 20, 1));

    private final float[] glow = new float[7];
    private long last = System.nanoTime();

    public KeystrokesHud() { super("keystrokes", "Keystrokes", "Shows the movement keys and mouse buttons you press.", true, 0.0, 0.55); }

    private static final int K = 22, G = 2;
    @Override public int width() { return K * 3 + G * 2; }
    @Override public int height() {
        int h = K * 2 + G;
        if (mouse.on()) h += G + K;
        if (space.on()) h += G + 12;
        return h;
    }

    private void key(Draw d, int i, boolean down, int x, int y, int w, int h, String label, String sub) {
        float dt = (System.nanoTime() - last) / 1e9f;
        glow[i] = down ? 1f : Math.max(0f, glow[i] - dt * fade.asFloat());
        int bg = Draw.lerpColor(keyColor.argb(), pressedColor.argb(), glow[i]);
        int fg = Draw.lerpColor(textColor.argb(), pressedTextColor.argb(), glow[i]);
        d.rect(x, y, x + w, y + h, bg);
        if (sub == null) {
            d.text(label, x + (w - Draw.textWidth(label)) / 2, y + (h - 8) / 2, fg, false);
        } else {
            d.text(label, x + (w - Draw.textWidth(label)) / 2, y + 3, fg, false);
            d.push(); d.translate(x + w / 2f, y + h - 8); d.scale(0.6f);
            d.text(sub, -Draw.textWidth(sub) / 2, 0, fg, false); d.pop();
        }
    }

    @Override public void render(Draw d, boolean preview) {
        boolean[] k = Game.inWorld() ? Game.movementKeys() : new boolean[]{true, false, false, false, false, false, false};
        key(d, 0, k[0], K + G, 0, K, K, Game.keyName(0), null);
        key(d, 1, k[1], 0, K + G, K, K, Game.keyName(1), null);
        key(d, 2, k[2], K + G, K + G, K, K, Game.keyName(2), null);
        key(d, 3, k[3], (K + G) * 2, K + G, K, K, Game.keyName(3), null);
        int y = (K + G) * 2;
        int half = (width() - G) / 2;
        if (mouse.on()) {
            key(d, 4, k[4], 0, y, half, K, "LMB", cps.on() ? Clicks.left() + " CPS" : null);
            key(d, 5, k[5], half + G, y, width() - half - G, K, "RMB", cps.on() ? Clicks.right() + " CPS" : null);
            y += K + G;
        }
        if (space.on()) {
            key(d, 6, k[6], 0, y, width(), 12, "", null);
            int c = Draw.lerpColor(textColor.argb(), pressedTextColor.argb(), glow[6]);
            d.rect(width() / 2 - 12, y + 5, width() / 2 + 12, y + 7, c);
        }
        last = System.nanoTime();
    }
}
