package com.pandaclient.mod.module.pvp;

import com.pandaclient.mod.module.Category;
import com.pandaclient.mod.module.Module;
import com.pandaclient.mod.module.Setting;
import net.minecraft.client.Minecraft;
import net.minecraft.client.resources.sounds.SimpleSoundInstance;
import net.minecraft.sounds.SoundEvent;
import net.minecraft.sounds.SoundEvents;

/** Plays a sound (only for you) when you hit a player or mob. */
public final class HitSounds extends Module {
    public final Setting.Choice sound = add(new Setting.Choice("sound", "Sound", "Ding", "Ding", "Pling", "Bell", "Click", "Crit", "Arrow"));
    public final Setting.Num volume = add(new Setting.Num("volume", "Volume", 0.6, 0.1, 1.0, 0.05));
    public final Setting.Num pitch = add(new Setting.Num("pitch", "Pitch", 1.0, 0.5, 2.0, 0.05));
    public HitSounds() { super("hitsounds", "Hit Sounds", "Plays a sound when you land a hit (only you hear it).", Category.PVP, false); }

    private SoundEvent event() {
        return switch (sound.get()) {
            case "Pling" -> SoundEvents.NOTE_BLOCK_PLING.value();
            case "Bell" -> SoundEvents.NOTE_BLOCK_BELL.value();
            case "Click" -> SoundEvents.NOTE_BLOCK_HAT.value();
            case "Crit" -> SoundEvents.PLAYER_ATTACK_CRIT;
            case "Arrow" -> SoundEvents.ARROW_HIT_PLAYER;
            default -> SoundEvents.EXPERIENCE_ORB_PICKUP;
        };
    }
    public void play() {
        if (enabled()) Minecraft.getInstance().getSoundManager().play(SimpleSoundInstance.forUI(event(), pitch.asFloat(), volume.asFloat()));
    }
}
