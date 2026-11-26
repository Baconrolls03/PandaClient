package com.pandaclient.mod.cosmetics;

import java.util.List;

/**
 * Paints a PandaClient cape (pattern + colours) onto Minecraft's 64×32 cape layout.
 * Same rules as the launcher's Wardrobe (src/renderer/src/lib/cosmetics.ts), so everyone sees the same cape.
 */
public final class CapePainter {
    private CapePainter() {}

    private static final String[] PANDA = {"d....d", "wwwwww", "wdwwdw", "wwwwww", "wwddww", ".wwww."};

    static int[] rgb(String hex) {
        int n = Integer.parseInt(hex.replace("#", ""), 16);
        return new int[]{(n >> 16) & 255, (n >> 8) & 255, n & 255};
    }
    static int[] mix(int[] a, int[] b, double t) {
        return new int[]{(int) Math.round(a[0] + (b[0] - a[0]) * t), (int) Math.round(a[1] + (b[1] - a[1]) * t), (int) Math.round(a[2] + (b[2] - a[2]) * t)};
    }
    static int[] ramp(int[][] stops, double t) {
        if (stops.length == 1) return stops[0];
        double x = Math.min(0.9999, Math.max(0, t)) * (stops.length - 1);
        int i = (int) Math.floor(x);
        return mix(stops[i], stops[i + 1], x - i);
    }
    static double hash(int x, int y) {
        int h = (int) ((long) x * 374761393L + (long) y * 668265263L) ^ 0x5bd1e995;
        h = (h ^ (h >>> 13)) * 1274126177;
        return Integer.toUnsignedLong(h ^ (h >>> 16)) / 4294967295.0;
    }

    /** Colour of one pixel on the 10×16 cape face. */
    public static int[] pixel(String pattern, int[][] c, int u, int v) {
        int[] c0 = c[0], c1 = c.length > 1 ? c[1] : c[0], c2 = c.length > 2 ? c[2] : c1;
        switch (pattern) {
            case "gradient": return ramp(c, v / 15.0);
            case "stripes": return (v / 2) % 2 == 1 ? c1 : c0;
            case "checker": return ((u / 2) + (v / 2)) % 2 == 1 ? c1 : c0;
            case "split": return u < 5 ? c0 : c1;
            case "trim": return u == 0 || u == 9 || v == 0 || v >= 14 ? c1 : c0;
            case "waves": {
                int[] base = ramp(new int[][]{c0, c1}, v / 15.0);
                return Math.floorMod(v + (int) Math.round(Math.sin(u * 0.9) * 1.5) + 20, 5) == 0 ? c2 : base;
            }
            case "stars": {
                int[] base = ramp(new int[][]{c0, c1}, v / 15.0);
                return hash(u, v) > 0.9 ? c2 : base;
            }
            case "dots":
                if (u % 3 == 1 && v % 3 == 1) return (u + v) % 4 == 0 ? c2 : c1;
                return c0;
            case "emblem": {
                int[] base = ramp(new int[][]{c0, c1}, Math.max(0, (v - 8) / 7.0));
                int x = u - 2, y = v - 4;
                if (y >= 0 && y < PANDA.length && x >= 0 && x < PANDA[y].length()) {
                    char cell = PANDA[y].charAt(x);
                    if (cell == 'd') return c2;
                    if (cell == 'w') return new int[]{243, 245, 248};
                }
                return base;
            }
            default: return c0;
        }
    }

    /** ARGB pixels of the 64×32 cape texture (row-major). */
    public static int[] paint(String pattern, List<String> colors) {
        int[][] c = colors.isEmpty() ? new int[][]{{110, 224, 143}} : colors.stream().map(CapePainter::rgb).toArray(int[][]::new);
        int[] img = new int[64 * 32];
        java.util.function.BiConsumer<int[], int[]> put = (xy, p) -> img[xy[1] * 64 + xy[0]] = 0xFF000000 | (p[0] << 16) | (p[1] << 8) | p[2];
        for (int v = 0; v < 16; v++) {
            for (int u = 0; u < 10; u++) {
                int[] px = pixel(pattern, c, u, v);
                put.accept(new int[]{1 + u, 1 + v}, px);
                put.accept(new int[]{12 + (9 - u), 1 + v}, px);
            }
            put.accept(new int[]{0, 1 + v}, pixel(pattern, c, 0, v));
            put.accept(new int[]{11, 1 + v}, pixel(pattern, c, 9, v));
        }
        for (int u = 0; u < 10; u++) {
            put.accept(new int[]{1 + u, 0}, pixel(pattern, c, u, 0));
            put.accept(new int[]{11 + u, 0}, pixel(pattern, c, u, 15));
        }
        return img;
    }
}
