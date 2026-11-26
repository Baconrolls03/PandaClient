package com.pandaclient.mod.util;

import java.util.ArrayDeque;

/** Counts left/right mouse clicks over the last second (for the CPS and Keystrokes mods). */
public final class Clicks {
    private static final ArrayDeque<Long> LEFT = new ArrayDeque<>(), RIGHT = new ArrayDeque<>();
    private Clicks() {}

    public static void press(int button) {
        long now = System.currentTimeMillis();
        if (button == 0) LEFT.addLast(now); else if (button == 1) RIGHT.addLast(now);
    }
    private static int count(ArrayDeque<Long> q) {
        long cut = System.currentTimeMillis() - 1000;
        while (!q.isEmpty() && q.peekFirst() < cut) q.pollFirst();
        return q.size();
    }
    public static int left() { return count(LEFT); }
    public static int right() { return count(RIGHT); }
}
