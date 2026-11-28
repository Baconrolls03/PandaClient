package com.pandaclient.mod.module.pvp;

import com.pandaclient.mod.module.Category;
import com.pandaclient.mod.module.Module;
import com.pandaclient.mod.module.Setting;

/** Party options: following the leader to servers, and party chat in game. */
public final class PartySettings extends Module {
    public final Setting.Choice follow = add(new Setting.Choice("follow", "Follow the party leader", "Always", "Always", "From the lobby", "Off"));
    public final Setting.Bool chatInGame = add(new Setting.Bool("chatInGame", "Party chat in game chat (/pp to reply)", true));
    public final Setting.Bool notices = add(new Setting.Bool("notices", "Tell me when people join or leave", true));
    public PartySettings() { super("party", "Party", "Party with friends: invites and chat in the lobby, and follow the leader when they join a server.", Category.UTILITY, true); }
}
