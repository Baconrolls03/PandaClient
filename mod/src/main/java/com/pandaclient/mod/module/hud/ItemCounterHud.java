package com.pandaclient.mod.module.hud;

import com.pandaclient.mod.gui.Draw;
import com.pandaclient.mod.module.Setting;
import com.pandaclient.mod.util.Game;

/** Counts useful PvP items in your inventory (arrows, pearls, golden apples, potions...). */
public final class ItemCounterHud extends HudModule {
    public final Setting.Bool hideEmpty = add(new Setting.Bool("hideEmpty", "Hide items you don't have", true));
    public final Setting.Bool shadow = add(new Setting.Bool("shadow", "Text shadow", true));
    public ItemCounterHud() { super("itemcounter", "Item Counter", "Counts arrows, pearls, golden apples, potions and more.", false, 1.0, 0.6); }

    private Game.Stack[] items() { return Game.countedItems(hideEmpty.on()); }
    @Override public int width() { return 18 + Draw.textWidth("x999"); }
    @Override public int height() { return Math.max(1, items().length) * 17; }
    @Override public void render(Draw d, boolean preview) {
        int y = 0;
        for (Game.Stack s : items()) {
            d.item(s, 0, y);
            d.text("x" + s.count(), 18, y + 4, s.count() == 0 ? 0xFF8B98A9 : 0xFFFFFFFF, shadow.on());
            y += 17;
        }
    }
}
