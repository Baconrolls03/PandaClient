package com.pandaclient.mod.gui;

import net.minecraft.network.chat.FontDescription;
import net.minecraft.network.chat.Style;
import net.minecraft.resources.Identifier;

/** The smooth Poppins font PandaClient's menus use (assets/pandaclient/font/ui*.json). */
final class UiFont {
    private UiFont() {}
    static final Style REGULAR = Style.EMPTY.withFont(new FontDescription.Resource(Identifier.fromNamespaceAndPath("pandaclient", "ui")));
    static final Style BOLD = Style.EMPTY.withFont(new FontDescription.Resource(Identifier.fromNamespaceAndPath("pandaclient", "ui_bold")));
}
