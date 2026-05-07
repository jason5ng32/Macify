// Tiny shared store for the currently playing video. Written by
// VideoBackground when it advances, read by VideoMetadata for display.
export const nowPlaying = $state({ item: null });

// VideoBackground registers its `nextVideo` here so that components
// outside of it (RefreshButton, future hotkeys, etc.) can ask for the
// next video without needing a direct ref or shared parent.
let nextHandler = null;
export function registerVideoNext(fn) {
  nextHandler = fn;
}
export function requestVideoNext(options) {
  nextHandler?.(options);
}
