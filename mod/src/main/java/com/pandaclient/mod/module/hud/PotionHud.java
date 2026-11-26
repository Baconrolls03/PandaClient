package com.pandaclient.mod.module.hud;

import com.pandaclient.mod.gui.Draw;
import com.pandaclient.mod.module.Setting;
import com.pandaclient.mod.util.Game;

import java.util.List;

/** Your active potion effects with time left. */
public final class PotionHud extends HudModule {
    public final Setting.Bool icons = add(new Setting.Bool("icons", "Show icons", true));
    public final Setting.Bool background = add(new Setting.Bool("background", "Background", false));
    public final Setting.Color backgroundColor = add(new Setting.Color("backgroundColor", "Background colour", 0x8C0F141C));
    public final Setting.Color nameColor = add(new Setting.Color("nameColor", "Name colour", 0xFFFFFFFF));
    public final Setting.Color timeColor = add(new Setting.Color("timeColor", "Time colour", 0xFF8B98A9));
    public final Setting.Bool effectColor = add(new Setting.Bool("effectColor", "Use effect colour for names", true));
    public final Setting.Bool blink = add(new Setting.Bool("blink", "Blink when ending", true));

    public PotionHud() { super("potions", "Potion Effects", "Shows your active effects and how long they last.", true, 1.0, 0.3); }

    private List<Game.Effect> effects(boolean preview) {
        List<Game.Effect> e = Game.effects();
        if (e.isEmpty() && preview) return Game.sampleEffects();
        return e;
    }
    @Override public int width() {
        int w = 60;
        for (Game.Effect e : effects(true)) w = Math.max(w, Draw.textWidth(e.name()) + 4);
        return w + (icons.on() ? 22 : 0) + (background.on() ? 6 : 0);
    }
    @Override public int height() { return Math.max(1, effects(true).size()) * 22; }

    @Override public void render(Draw d, boolean preview) {
        List<Game.Effect> list = effects(preview);
        int y = 0, pad = background.on() ? 3 : 0;
        if (background.on() && !list.isEmpty()) d.rect(0, 0, width(), list.size() * 22, backgroundColor.argb());
        for (Game.Effect e : list) {
            if (blink.on() && e.ticks() < 200 && !e.infinite() && (System.currentTimeMillis() / 300) % 2 == 0) { y += 22; continue; }
            int x = pad;
            if (icons.on()) { d.effectIcon(e, x, y + 2); x += 22; }
            d.text(e.name(), x, y + 2, effectColor.on() ? (0xFF000000 | e.color()) : nameColor.argb(), true);
            d.text(e.infinite() ? "**:**" : Game.ticksToTime(e.ticks()), x, y + 12, timeColor.argb(), true);
            y += 22;
        }
    }
}
