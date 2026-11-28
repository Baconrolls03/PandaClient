package com.pandaclient.mod.gui;

/** Small drawing helpers shared by the PandaClient screens. */
final class Widgets {
    private Widgets() {}

    static boolean in(double mx, double my, int x, int y, int w, int h) { return mx >= x && my >= y && mx < x + w && my < y + h; }

    /** iOS-style switch, 20×10. */
    static void toggle(Draw d, int x, int y, boolean on, float anim) {
        int track = Draw.lerpColor(Theme.OFF, Theme.accent(), anim);
        d.round(x, y, x + 20, y + 10, track);
        int kx = x + 1 + Math.round(anim * 10);
        d.round(kx, y + 1, kx + 8, y + 9, 0xFFFFFFFF);
    }

    static void button(Draw d, int x, int y, int w, int h, String label, boolean hover, boolean primary) {
        int bg = primary ? (hover ? Draw.lerpColor(Theme.accent(), 0xFFFFFFFF, 0.15f) : Theme.accent()) : (hover ? Theme.HOVER : Theme.RAISED);
        d.round(x, y, x + w, y + h, bg);
        d.centered(label, x + w / 2, y + (h - 8) / 2, primary ? 0xFF0F141C : Theme.TEXT, false);
    }

    static String ellipsize(String s, int maxW) {
        if (Draw.textWidth(s) <= maxW) return s;
        while (!s.isEmpty() && Draw.textWidth(s + "…") > maxW) s = s.substring(0, s.length() - 1);
        return s + "…";
    }

    /** Shorten to fit in Minecraft's own font. */
    static String ellipsizeMc(String s, int maxW) {
        var font = net.minecraft.client.Minecraft.getInstance().font;
        if (font.width(s) <= maxW) return s;
        while (!s.isEmpty() && font.width(s + "...") > maxW) s = s.substring(0, s.length() - 1);
        return s + "...";
    }

    /** Word-wrap into at most {@code lines} lines. */
    static java.util.List<String> wrap(String s, int maxW, int lines) {
        java.util.List<String> out = new java.util.ArrayList<>();
        StringBuilder cur = new StringBuilder();
        for (String word : s.split(" ")) {
            String next = cur.isEmpty() ? word : cur + " " + word;
            if (Draw.textWidth(next) > maxW && !cur.isEmpty()) {
                out.add(cur.toString()); cur = new StringBuilder(word);
                if (out.size() == lines) break;
            } else cur = new StringBuilder(next);
        }
        if (out.size() < lines && !cur.isEmpty()) out.add(cur.toString());
        if (out.size() == lines) out.set(lines - 1, ellipsize(out.get(lines - 1), maxW));
        return out;
    }
}
