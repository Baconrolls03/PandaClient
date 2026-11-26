package com.pandaclient.mod.module;

import com.google.gson.JsonElement;
import com.google.gson.JsonPrimitive;

/** One adjustable option of a mod (shown in the mod's settings page and saved to the config). */
public abstract class Setting<T> {
    public final String id;
    public final String name;
    protected T value;
    public final T defaultValue;

    protected Setting(String id, String name, T def) {
        this.id = id; this.name = name; this.value = def; this.defaultValue = def;
    }

    public T get() { return value; }
    public void set(T v) { value = v; }
    public void reset() { value = defaultValue; }
    public abstract JsonElement save();
    public abstract void load(JsonElement e);

    public static final class Bool extends Setting<Boolean> {
        public Bool(String id, String name, boolean def) { super(id, name, def); }
        public boolean on() { return value; }
        public void toggle() { value = !value; }
        @Override public JsonElement save() { return new JsonPrimitive(value); }
        @Override public void load(JsonElement e) { if (e.isJsonPrimitive()) value = e.getAsBoolean(); }
    }

    public static final class Num extends Setting<Double> {
        public final double min, max, step;
        public Num(String id, String name, double def, double min, double max, double step) {
            super(id, name, def); this.min = min; this.max = max; this.step = step;
        }
        @Override public void set(Double v) {
            double c = Math.max(min, Math.min(max, v));
            value = step > 0 ? Math.round(c / step) * step : c;
        }
        public int asInt() { return (int) Math.round(value); }
        public float asFloat() { return value.floatValue(); }
        @Override public JsonElement save() { return new JsonPrimitive(value); }
        @Override public void load(JsonElement e) { if (e.isJsonPrimitive()) set(e.getAsDouble()); }
    }

    /** ARGB colour, optionally cycling through the rainbow ("chroma"). */
    public static final class Color extends Setting<Integer> {
        public boolean chroma;
        public Color(String id, String name, int argb) { super(id, name, argb); }
        public int argb() {
            if (!chroma) return value;
            float hue = (System.currentTimeMillis() % 4000L) / 4000f;
            return (value & 0xFF000000) | (java.awt.Color.HSBtoRGB(hue, 0.7f, 1f) & 0xFFFFFF);
        }
        @Override public JsonElement save() {
            var o = new com.google.gson.JsonObject();
            o.addProperty("argb", value); o.addProperty("chroma", chroma); return o;
        }
        @Override public void load(JsonElement e) {
            if (e.isJsonObject()) {
                var o = e.getAsJsonObject();
                if (o.has("argb")) value = o.get("argb").getAsInt();
                if (o.has("chroma")) chroma = o.get("chroma").getAsBoolean();
            } else if (e.isJsonPrimitive()) value = e.getAsInt();
        }
    }

    public static final class Choice extends Setting<String> {
        public final String[] options;
        public Choice(String id, String name, String def, String... options) { super(id, name, def); this.options = options; }
        public void cycle(int dir) {
            int i = java.util.Arrays.asList(options).indexOf(value);
            value = options[Math.floorMod(i + dir, options.length)];
        }
        public boolean is(String s) { return value.equals(s); }
        @Override public JsonElement save() { return new JsonPrimitive(value); }
        @Override public void load(JsonElement e) {
            if (e.isJsonPrimitive() && java.util.Arrays.asList(options).contains(e.getAsString())) value = e.getAsString();
        }
    }

    /** A key code (GLFW), -1 = unbound. */
    public static final class Key extends Setting<Integer> {
        public Key(String id, String name, int def) { super(id, name, def); }
        @Override public JsonElement save() { return new JsonPrimitive(value); }
        @Override public void load(JsonElement e) { if (e.isJsonPrimitive()) value = e.getAsInt(); }
    }
}
