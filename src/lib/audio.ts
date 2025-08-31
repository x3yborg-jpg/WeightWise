"use client";

export function playWarningSound() {
  const audio = new Audio('/warning-beep.mp3');
  audio.volume = 0.5; // Don't make it too loud
  audio.play().catch(error => {
    // Autoplay can be blocked by the browser, log error if it fails.
    console.error("Audio playback failed:", error);
  });
}
