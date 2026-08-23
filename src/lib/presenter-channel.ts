"use client";

import { PresenterState } from "./types";
import { storageKeys, savePresenterState } from "./storage";

const channelName = "coro-cumbres-presenter";
const legacyPresenterEventKey = "coro-os:v1:presenter:event";

export function publishPresenterState(state: PresenterState) {
  savePresenterState(state);
  if ("BroadcastChannel" in window) {
    const channel = new BroadcastChannel(channelName);
    channel.postMessage(state);
    channel.close();
  }
}

export function subscribePresenterState(callback: (state: PresenterState) => void) {
  let channel: BroadcastChannel | null = null;
  if ("BroadcastChannel" in window) {
    channel = new BroadcastChannel(channelName);
    channel.onmessage = (event) => callback(event.data as PresenterState);
  }
  const onStorage = (event: StorageEvent) => {
    if ((event.key === `${storageKeys.presenter}:event` || event.key === legacyPresenterEventKey) && event.newValue) {
      try {
        callback(JSON.parse(event.newValue).state as PresenterState);
      } catch {
        return;
      }
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    channel?.close();
    window.removeEventListener("storage", onStorage);
  };
}
