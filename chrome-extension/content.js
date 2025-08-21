// In chrome-extension/content.js

let dubbedAudio = new Audio(); // Create a single audio element to reuse
let videoElement = null;

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'play-dubbed-audio') {
    console.log("Content script received audio to play:", message.data.audioUrl);
    playDubbedAudio(message.data.audioUrl);
  }
});

function playDubbedAudio(audioUrl) {
  if (!videoElement) {
    // Find the primary video element on the page, but only once
    videoElement = document.querySelector('video');
    if (!videoElement) {
      console.error("VaniSetu: Could not find video element on the page.");
      return;
    }
    
    // Mute the original video
    videoElement.muted = true;
    console.log("VaniSetu: Original video muted.");
    
    // Add event listeners to sync play/pause
    videoElement.onplay = () => dubbedAudio.play();
    videoElement.onpause = () => dubbedAudio.pause();
  }
  
  // Set the source for our audio element and play it
  dubbedAudio.src = audioUrl;
  dubbedAudio.play();
  console.log("VaniSetu: Playing dubbed audio.");
}