// In chrome-extension/background.js

// ==============================================================================
// IMPORTANT: PASTE YOUR LATEST NGROK URL HERE
// ==============================================================================
const BACKEND_URL = "https://b856a0eec2a2.ngrok-free.app/api/v1/dub-audio";



// Main message listener
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "startCapture") {
    setupOffscreenDocument(message.tabId);
  } else if (message.target === 'background' && message.type === 'audio-captured') {
    fetch(message.data.blobUrl)
      .then(response => response.blob())
      .then(audioBlob => sendAudioToServer(audioBlob))
      .catch(error => console.error("Error fetching blob:", error));
  }
});

// Manages the offscreen document for audio capture
async function setupOffscreenDocument(tabId) {
  const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
  const existingContexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });

  if (existingContexts.length > 0) {
    chrome.runtime.sendMessage({ type: 'start-recording', target: 'offscreen', data: { streamId } });
    return;
  }

  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['USER_MEDIA'],
    justification: 'Required for tab audio capture.',
  });
  
  chrome.runtime.sendMessage({ type: 'start-recording', target: 'offscreen', data: { streamId } });
}

// Sends audio to backend and injects the final audio for playback
function sendAudioToServer(audioBlob) {
  const formData = new FormData();
  formData.append("audio", audioBlob, "captured_audio.webm");

  console.log("Sending audio to backend...");
  fetch(BACKEND_URL, {
    method: "POST",
    headers: { "ngrok-skip-browser-warning": "true" },
    body: formData,
  })
  .then(response => response.blob())
  .then(dubbedAudioBlob => {
    console.log("✅ Success! Received dubbed audio back from server.");
    
    // --- THIS IS THE NEW, CORRECTED CODE ---
    // Convert the Blob to a Data URL to pass it to the content script
    const reader = new FileReader();
    reader.onload = function() {
        const audioDataUrl = reader.result;
        
        // Find the active tab to inject the playback script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                // Use executeScript to directly run the playback logic on the page
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    func: playDubbedAudioOnPage,
                    args: [audioDataUrl]
                });
            }
        });
    };
    reader.readAsDataURL(dubbedAudioBlob);
    // --- END OF NEW CODE ---
  })
  .catch(error => console.error("❌ Error sending audio:", error));
}

// This function will be injected and run on the YouTube page
function playDubbedAudioOnPage(audioUrl) {
  const videoElement = document.querySelector('video');
  if (!videoElement) {
    console.error("VaniSetu: Could not find video element.");
    return;
  }
  videoElement.muted = true;
  const dubbedAudio = new Audio(audioUrl);
  dubbedAudio.play();
  console.log("VaniSetu: Playing dubbed audio.");
}