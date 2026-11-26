package com.pandaclient.mod.util;

/** Display-only combat stats: the reach of your last hit and your current combo. */
public final class Combat {
    private Combat() {}
    public static double lastReach = -1;
    public static long lastHitAt;
    public static int combo;
    public static long comboAt;
    public static int lastTargetId = -1;
    private static int pendingTarget = -1;
    private static long pendingAt;

    /** You swung at an entity (reach = distance from your eyes to the hit point). */
    public static void attacked(int entityId, double reach) {
        lastReach = reach; lastHitAt = System.currentTimeMillis();
        pendingTarget = entityId; pendingAt = lastHitAt;
    }
    /** The entity you attacked took damage → the hit counted. */
    public static void targetHurt(int entityId) {
        if (entityId != pendingTarget || System.currentTimeMillis() - pendingAt > 600) return;
        pendingTarget = -1;
        combo = entityId == lastTargetId ? combo + 1 : 1;
        lastTargetId = entityId; comboAt = System.currentTimeMillis();
    }
    public static int pendingTarget() { return pendingTarget; }
    /** You took damage → combo broken. */
    public static void selfHurt() { combo = 0; }
    public static void tick() {
        if (combo > 0 && System.currentTimeMillis() - comboAt > 2500) combo = 0;
    }
}
