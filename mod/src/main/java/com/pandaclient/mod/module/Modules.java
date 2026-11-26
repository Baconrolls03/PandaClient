package com.pandaclient.mod.module;

import com.pandaclient.mod.module.hud.*;
import com.pandaclient.mod.module.pvp.*;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/** Every PandaClient mod, in the order they appear in the menu. */
public final class Modules {
    private Modules() {}

    public static final Setting.Choice THEME = new Setting.Choice("theme", "Menu accent", "Mint", "Mint", "Blue", "Purple", "Pink", "Orange", "Red");

    public static final FpsHud FPS = new FpsHud();
    public static final CpsHud CPS = new CpsHud();
    public static final KeystrokesHud KEYSTROKES = new KeystrokesHud();
    public static final ArmorHud ARMOR = new ArmorHud();
    public static final PotionHud POTIONS = new PotionHud();
    public static final CoordsHud COORDS = new CoordsHud();
    public static final DirectionHud DIRECTION = new DirectionHud();
    public static final PingHud PING = new PingHud();
    public static final ServerHud SERVER = new ServerHud();
    public static final ClockHud CLOCK = new ClockHud();
    public static final MemoryHud MEMORY = new MemoryHud();
    public static final ReachHud REACH = new ReachHud();
    public static final ComboHud COMBO = new ComboHud();
    public static final SpeedHud SPEED = new SpeedHud();
    public static final ItemCounterHud ITEMS = new ItemCounterHud();
    public static final TargetHud TARGET = new TargetHud();
    public static final SaturationHud SATURATION = new SaturationHud();
    public static final DayHud DAY = new DayHud();
    public static final TotemHud TOTEMS = new TotemHud();
    public static final ArrowHud ARROWS = new ArrowHud();
    public static final BowChargeHud BOW = new BowChargeHud();

    public static final ToggleSprint TOGGLE_SPRINT = new ToggleSprint();
    public static final Zoom ZOOM = new Zoom();
    public static final Freelook FREELOOK = new Freelook();
    public static final NoHurtCam NO_HURT_CAM = new NoHurtCam();
    public static final Hitboxes HITBOXES = new Hitboxes();
    public static final HitSounds HIT_SOUNDS = new HitSounds();
    public static final HitParticles PARTICLES = new HitParticles();
    public static final AutoGG AUTO_GG = new AutoGG();
    public static final PandaBadge BADGE = new PandaBadge();
    public static final CustomTitleScreen TITLE_SCREEN = new CustomTitleScreen();
    public static final Fullbright FULLBRIGHT = new Fullbright();
    public static final Crosshair CROSSHAIR = new Crosshair();
    public static final BlockOutline BLOCK_OUTLINE = new BlockOutline();
    public static final LowFire LOW_FIRE = new LowFire();
    public static final TimeChanger TIME = new TimeChanger();
    public static final WeatherChanger WEATHER = new WeatherChanger();
    public static final HitColor HIT_COLOR = new HitColor();
    public static final ChatTimestamps CHAT_TIMESTAMPS = new ChatTimestamps();
    public static final Cosmetics COSMETICS = new Cosmetics();

    private static final List<Module> ALL = Collections.unmodifiableList(new ArrayList<>(List.of(
        FPS, CPS, KEYSTROKES, ARMOR, POTIONS, COORDS, DIRECTION, PING, SERVER, CLOCK, MEMORY, REACH, COMBO, SPEED, ITEMS, TARGET, SATURATION, DAY, TOTEMS, ARROWS, BOW,
        TOGGLE_SPRINT, ZOOM, FREELOOK, NO_HURT_CAM, HITBOXES, HIT_SOUNDS,
        FULLBRIGHT, CROSSHAIR, BLOCK_OUTLINE, HIT_COLOR, PARTICLES, LOW_FIRE, TIME, WEATHER,
        CHAT_TIMESTAMPS, AUTO_GG, BADGE, COSMETICS, TITLE_SCREEN)));

    public static List<Module> all() { return ALL; }

    public static List<HudModule> hud() {
        List<HudModule> l = new ArrayList<>();
        for (Module m : ALL) if (m instanceof HudModule h) l.add(h);
        return l;
    }

    public static int accent() {
        return switch (THEME.get()) {
            case "Blue" -> 0xFF4F8CFF;
            case "Purple" -> 0xFFA77BFF;
            case "Pink" -> 0xFFFF7BC5;
            case "Orange" -> 0xFFFFA24F;
            case "Red" -> 0xFFF26D6D;
            default -> 0xFF6EE08F;
        };
    }
}
