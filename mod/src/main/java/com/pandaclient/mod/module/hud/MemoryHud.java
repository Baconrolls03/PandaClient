package com.pandaclient.mod.module.hud;

public final class MemoryHud extends TextHud {
    public MemoryHud() { super("memory", "Memory", "Shows how much RAM the game is using.", false, 1.0, 0.05); }
    @Override protected String label() { return "Mem"; }
    @Override protected String value(boolean preview) {
        Runtime r = Runtime.getRuntime();
        long used = (r.totalMemory() - r.freeMemory()) >> 20, max = r.maxMemory() >> 20;
        return (used * 100 / Math.max(1, max)) + "% " + used + "/" + max + " MB";
    }
}
