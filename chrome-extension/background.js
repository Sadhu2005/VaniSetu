// In chrome-extension/background.js

const NGROK_BASE_URL = "https://dab473d3f533.ngrok-free.app"; // No slash at the end
const WEBSOCKET_URL = NGROK_BASE_URL.replace('https://', 'wss://') + "/ws/dub";

// ==============================================================================
// FINAL BACKGROUND.JS



let socket;
let activeTabId;

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "startCapture") {
    activeTabId = message.tabId;
    connectWebSocket(message.tabId);
  } else if (message.action === "stopCapture") {
    if (socket) socket.close();
    chrome.scripting.executeScript({
      target: { tabId: message.tabId },
      func: stopDubbingOnPage,
    });
  } else if (message.target === 'background' && message.type === 'audio-chunk-captured') {
    fetch(message.data.blobUrl)
      .then(response => response.blob())
      .then(audioBlob => {
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(audioBlob);
        }
      });
  }
});

function connectWebSocket(tabId) {
  if (socket && socket.readyState !== WebSocket.CLOSED) return;
  
  socket = new WebSocket(WEBSOCKET_URL);
  
  socket.onopen = () => {
    console.log("✅ WebSocket connection opened.");
    setupOffscreenDocument(tabId);
  };
  
  socket.onmessage = (event) => {
    const audioBlob = event.data;
    const reader = new FileReader();
    reader.onload = function() {
        const audioDataUrl = reader.result;
        chrome.scripting.executeScript({
            target: { tabId: activeTabId },
            func: addToPlaybackQueue,
            args: [audioDataUrl]
        });
    };
    reader.readAsDataURL(audioBlob);
  };
  
  socket.onerror = (error) => console.error("❌ WebSocket Error:", error);
  socket.onclose = () => console.log("WebSocket connection closed.");
}

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

// Injected function for PLAYING audio
function addToPlaybackQueue(audioUrl) {
  if (!window.vaniSetuPlayerInitialized) {
    window.vaniSetuAudioQueue = [];
    window.vaniSetuIsPlaying = false;
    const dubbedAudio = new Audio();
    dubbedAudio.id = 'vaniSetuDubbedAudio';
    document.body.appendChild(dubbedAudio);
    const videoElement = document.querySelector('video');
    if (!videoElement) return;
    videoElement.muted = true;
    videoElement.onplay = () => { if(!window.vaniSetuIsPlaying) { playNextInQueue(); }};
    videoElement.onpause = () => dubbedAudio.pause();
    dubbedAudio.onended = () => {
      window.vaniSetuIsPlaying = false;
      playNextInQueue();
    };
    const playNextInQueue = () => {
      if (window.vaniSetuAudioQueue.length > 0 && !window.vaniSetuIsPlaying) {
        window.vaniSetuIsPlaying = true;
        const nextUrl = window.vaniSetuAudioQueue.shift();
        dubbedAudio.src = nextUrl;
        dubbedAudio.play().catch(e => console.error("Audio play failed:", e));
      }
    };
    window.playNextInQueue = playNextInQueue;
    window.vaniSetuPlayerInitialized = true;
  }
  window.vaniSetuAudioQueue.push(audioUrl);
  window.playNextInQueue();
}

// Injected function for STOPPING the dub
function stopDubbingOnPage() {
  const videoElement = document.querySelector('video');
  if (videoElement) videoElement.muted = false;
  
  const dubbedAudio = document.getElementById('vaniSetuDubbedAudio');
  if (dubbedAudio) {
    dubbedAudio.pause();
    dubbedAudio.src = "";
    document.body.removeChild(dubbedAudio);
  }
  
  // Reset state
  window.vaniSetuPlayerInitialized = false;
  window.vaniSetuAudioQueue = [];
  window.vaniSetuIsPlaying = false;
  console.log("VaniSetu: Dubbing stopped and resources cleaned up.");
}