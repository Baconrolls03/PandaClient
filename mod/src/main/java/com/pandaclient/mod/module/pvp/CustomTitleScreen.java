package com.pandaclient.mod.module.pvp;

import com.pandaclient.mod.module.Category;
import com.pandaclient.mod.module.Module;
import com.pandaclient.mod.module.Setting;

public final class CustomTitleScreen extends Module {
    public final Setting.Bool stars = add(new Setting.Bool("stars", "Twinkling stars", true));
    public final Setting.Bool fireflies = add(new Setting.Bool("fireflies", "Fireflies", true));
    public final Setting.Choice buttons = add(new Setting.Choice("buttons", "Button style", "PandaClient", "PandaClient", "Minecraft"));
    public final Setting.Bool pauseMenu = add(new Setting.Bool("pauseMenu", "PandaClient pause menu", true));
    public final Setting.Bool lobbyFromWorld = add(new Setting.Bool("lobbyFromWorld", "Background: where you left off", true));
    public final Setting.Bool cinematic = add(new Setting.Bool("cinematic", "Cinematic shader look on the main menu", true));
    public final Setting.Bool lobbyPlayer = add(new Setting.Bool("lobbyPlayer", "Show your character on the main menu", true));
    public final Setting.Bool smoothFont = add(new Setting.Bool("smoothFont", "Smooth font in PandaClient menus", true));
    public final Setting.Bool serverCard = add(new Setting.Bool("serverCard", "Server shortcuts on the main menu", true));
    public CustomTitleScreen() { super("titlescreen", "Menus", "PandaClient's animated main menu, pause menu and modern buttons in every menu.", Category.UTILITY, true); }
}
