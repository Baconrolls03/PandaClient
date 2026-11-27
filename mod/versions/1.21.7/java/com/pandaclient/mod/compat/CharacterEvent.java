package com.pandaclient.mod.compat;

/** Typed characters in the 1.21.9+ shape. */
public record CharacterEvent(char ch, int modifiers) {
    public String codepointAsString() { return String.valueOf(ch); }
}
