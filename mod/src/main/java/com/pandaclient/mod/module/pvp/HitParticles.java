package com.pandaclient.mod.module.pvp;

import com.pandaclient.mod.module.Category;
import com.pandaclient.mod.module.Module;
import com.pandaclient.mod.module.Setting;
import net.minecraft.client.Minecraft;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.world.entity.Entity;

/** More hit particles (on your screen only), like Lunar's Particles mod. */
public final class HitParticles extends Module {
    public final Setting.Num multiplier = add(new Setting.Num("multiplier", "Multiplier", 3, 1, 10, 1));
    public final Setting.Bool crits = add(new Setting.Bool("crits", "Always show crit particles", true));
    public final Setting.Bool sharpness = add(new Setting.Bool("sharpness", "Always show sharpness particles", false));
    public HitParticles() { super("particles", "Hit Particles", "Shows more particles when you hit something.", Category.VISUAL, false); }

    public void spawn(Entity target) {
        if (!enabled()) return;
        var pe = Minecraft.getInstance().particleEngine;
        for (int i = 0; i < multiplier.asInt(); i++) {
            if (crits.on()) pe.createTrackingEmitter(target, ParticleTypes.CRIT);
            if (sharpness.on()) pe.createTrackingEmitter(target, ParticleTypes.ENCHANTED_HIT);
        }
    }
}
