// Tiny shared store for the currently playing video. Written by
// VideoBackground when it advances, read by VideoMetadata for display.
export const nowPlaying = $state({ item: null });
