package com.pandaclient.mod.module;

import java.util.ArrayList;
import java.util.List;

/** A PandaClient mod that can be switched on/off and configured from the Right Shift menu. */
public abstract class Module {
    public final String id;
    public final String name;
    public final String description;
    public final Category category;
    private boolean enabled;
    public final boolean enabledByDefault;
    public final List<Setting<?>> settings = new ArrayList<>();

    protected Module(String id, String name, String description, Category category, boolean enabledByDefault) {
        this.id = id; this.name = name; this.description = description; this.category = category;
        this.enabled = enabledByDefault;
        this.enabledByDefault = enabledByDefault;
    }

    protected <S extends Setting<?>> S add(S s) { settings.add(s); return s; }

    public boolean enabled() { return enabled; }
    public void setEnabled(boolean on) {
        if (on == enabled) return;
        enabled = on;
        if (on) onEnable(); else onDisable();
    }
    public void toggle() { setEnabled(!enabled); }

    protected void onEnable() {}
    protected void onDisable() {}
    /** Called every client tick while enabled. */
    public void tick() {}
}
