package com.pandaclient.mod.module.hud;

import com.pandaclient.mod.gui.Draw;
import com.pandaclient.mod.module.Setting;
import com.pandaclient.mod.util.Game;

/** Your armour and held item with durability, like Lunar's Armor Status. */
public final class ArmorHud extends HudModule {
    public final Setting.Bool horizontal = add(new Setting.Bool("horizontal", "Horizontal", false));
    public final Setting.Bool heldItem = add(new Setting.Bool("heldItem", "Show held item", true));
    public final Setting.Choice durability = add(new Setting.Choice("durability", "Durability", "Percent", "Percent", "Value", "Off"));
    public final Setting.Bool shadow = add(new Setting.Bool("shadow", "Text shadow", true));

    public ArmorHud() { super("armor", "Armor Status", "Shows your armour and held item with durability.", true, 1.0, 0.8); }

    private Game.Stack[] stacks() {
        Game.Stack[] s = Game.armorAndHand(heldItem.on());
        return s;
    }
    private int slotW() { return durability.is("Off") ? 18 : 18 + Draw.textWidth("100%") + 2; }
    @Override public int width() { return horizontal.on() ? Math.max(1, stacks().length) * (slotW() + 2) : slotW(); }
    @Override public int height() { return horizontal.on() ? 16 : Math.max(1, stacks().length) * 17; }

    @Override public void render(Draw d, boolean preview) {
        Game.Stack[] s = stacks();
        if (s.length == 0 && preview) { d.text("Armor", 0, 4, 0xFFFFFFFF, true); return; }
        int x = 0, y = 0;
        for (Game.Stack st : s) {
            d.item(st, x, y);
            if (!durability.is("Off") && st.maxDamage() > 0) {
                int left = st.maxDamage() - st.damage();
                String t = durability.is("Percent") ? (left * 100 / st.maxDamage()) + "%" : String.valueOf(left);
                float f = left / (float) st.maxDamage();
                int c = f > 0.6f ? 0xFF6EE08F : f > 0.3f ? 0xFFF5C451 : 0xFFF26D6D;
                d.text(t, x + 18, y + 4, c, shadow.on());
            } else if (st.count() > 1 && !durability.is("Off")) {
                d.text(String.valueOf(st.count()), x + 18, y + 4, 0xFFFFFFFF, shadow.on());
            }
            if (horizontal.on()) x += slotW() + 2; else y += 17;
        }
    }
}
