package com.pandaclient.mod.module.hud;

import com.google.gson.JsonObject;
import com.pandaclient.mod.gui.Draw;
import com.pandaclient.mod.module.Category;
import com.pandaclient.mod.module.Module;
import com.pandaclient.mod.module.Setting;

/**
 * A mod that draws something on the HUD. Its position is stored as an anchor point in
 * 0..1 screen fractions, so it stays in the same place when the window or GUI scale changes.
 */
public abstract class HudModule extends Module {
    public double fx, fy;
    private final double defFx, defFy;
    public final Setting.Num scale = add(new Setting.Num("scale", "Scale", 1.0, 0.3, 3.0, 0.05));

    /** True while the HUD editor is open (elements show sample data). */
    public static boolean editing;

    protected HudModule(String id, String name, String description, boolean on, double fx, double fy) {
        this(id, name, description, Category.HUD, on, fx, fy);
    }
    protected HudModule(String id, String name, String description, Category category, boolean on, double fx, double fy) {
        super(id, name, description, category, on);
        this.fx = fx; this.fy = fy; this.defFx = fx; this.defFy = fy;
    }

    /** Whether there is anything to draw right now (outside the editor). */
    public boolean visible() { return true; }

    /** Unscaled size in GUI pixels for the current content. */
    public abstract int width();
    public abstract int height();

    /** Draw at (0,0) in unscaled coordinates. {@code preview} is true in the HUD editor (show sample data). */
    public abstract void render(Draw d, boolean preview);

    public float s() { return scale.asFloat(); }
    public int scaledW() { return Math.round(width() * s()); }
    public int scaledH() { return Math.round(height() * s()); }

    public int x(int screenW) { return clamp((int) Math.round(fx * screenW - scaledW() * fx), 0, Math.max(0, screenW - scaledW())); }
    public int y(int screenH) { return clamp((int) Math.round(fy * screenH - scaledH() * fy), 0, Math.max(0, screenH - scaledH())); }

    /** Move so the element's top-left is at (x, y). */
    public void moveTo(int x, int y, int screenW, int screenH) {
        int w = scaledW(), h = scaledH();
        fx = screenW - w <= 0 ? 0 : clamp01((double) x / (screenW - w));
        fy = screenH - h <= 0 ? 0 : clamp01((double) y / (screenH - h));
    }

    public final void draw(Draw d, int screenW, int screenH, boolean preview) {
        d.push();
        d.translate(x(screenW), y(screenH));
        d.scale(s());
        render(d, preview);
        d.pop();
    }

    /** Back to where this element starts out, at normal size. */
    public void resetPosition() { fx = defFx; fy = defFy; scale.reset(); }

    public JsonObject savePosition() {
        JsonObject o = new JsonObject(); o.addProperty("x", fx); o.addProperty("y", fy); return o;
    }
    public void loadPosition(JsonObject o) {
        if (o.has("x")) fx = clamp01(o.get("x").getAsDouble());
        if (o.has("y")) fy = clamp01(o.get("y").getAsDouble());
    }

    static int clamp(int v, int lo, int hi) { return Math.max(lo, Math.min(hi, v)); }
    static double clamp01(double v) { return Math.max(0, Math.min(1, v)); }
}
