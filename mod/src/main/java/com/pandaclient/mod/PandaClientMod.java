package com.pandaclient.mod;

import net.fabricmc.api.ClientModInitializer;

public final class PandaClientMod implements ClientModInitializer {
    @Override
    public void onInitializeClient() {
        System.out.println("[PandaClient] loaded");
    }
}
