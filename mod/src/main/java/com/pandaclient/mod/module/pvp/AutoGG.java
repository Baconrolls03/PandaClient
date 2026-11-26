package com.pandaclient.mod.module.pvp;

import com.pandaclient.mod.module.Category;
import com.pandaclient.mod.module.Module;
import com.pandaclient.mod.module.Setting;
import net.minecraft.client.Minecraft;

import java.util.Locale;

/** Says "gg" in chat when a game ends (detects the usual end-of-game messages). */
public final class AutoGG extends Module {
    public final Setting.Choice message = add(new Setting.Choice("message", "Message", "gg", "gg", "GG", "gg wp", "Good game!"));
    private static final String[] ENDINGS = {"winner!", "1st killer", "winner:", "won the game", "you won", "victory!", "game over", "reward summary", "you died! want to play again"};
    private long last;
    public AutoGG() { super("autogg", "Auto GG", "Says gg when a game ends.", Category.UTILITY, false); }

    public void onChat(String text) {
        if (!enabled() || System.currentTimeMillis() - last < 15_000) return;
        String t = text.toLowerCase(Locale.ROOT);
        for (String e : ENDINGS) {
            if (t.contains(e)) {
                var c = Minecraft.getInstance().getConnection();
                if (c == null) return;
                last = System.currentTimeMillis();
                Minecraft.getInstance().execute(() -> c.sendChat(message.get()));
                return;
            }
        }
    }
}
