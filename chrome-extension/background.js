const NGROK_BASE_URL = "https://3b1896085537.ngrok-free.app";
const DUB_ENDPOINT = "/api/v1/dub-video";
 

// Use async/await for the main message listener for stability
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startDubbing") {
    // We handle the entire process in this async function
    handleStartDubbing(message.tab);
    return true; // Indicates we will respond asynchronously
  } else if (message.action === "stopDubbing") {
    chrome.scripting.executeScript({
      target: { tabId: message.tab.id },
      func: stopDubbing,
    });
  }
});

async function handleStartDubbing(tab) {
  try {
    console.log("ANU: Start dubbing message received for URL:", tab.url);

    // 1. Immediately pause the video and show the processing overlay
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: pauseAndPrepare,
    });

    // 2. Send the request to the backend
    const response = await fetch(NGROK_BASE_URL + DUB_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true"
      },
      body: JSON.stringify({ video_url: tab.url })
    });

    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }

    const dubbedAudioBlob = await response.blob();
    console.log("ANU: Received dubbed audio file from server.");

    // 3. Convert the audio blob to a Data URL
    const audioDataUrl = await blobToDataUrl(dubbedAudioBlob);

    // 4. Inject the script to show the "Play" button
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: showPlayButton,
      args: [audioDataUrl]
    });

  } catch (error) {
    console.error("❌ Error during dubbing process:", error);
    // If anything fails, tell the page to clean up
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: stopDubbing,
    });
  }
}

// A helper function to convert a Blob to a Data URL using Promises
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}


// --- INJECTABLE FUNCTIONS (These run on the YouTube page) ---

function pauseAndPrepare() {
  console.log("ANU (on-page): Pausing video and preparing UI.");
  const videoElement = document.querySelector('video');
  if (!videoElement) return;
  videoElement.pause();
  let overlay = document.getElementById('anu-dubbing-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'anu-dubbing-overlay';
    Object.assign(overlay.style, {
      position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.8)', color: 'white', display: 'flex',
      justifyContent: 'center', alignItems: 'center', fontSize: '24px', zIndex: '9999',
      cursor: 'pointer', fontFamily: 'sans-serif'
    });
    const container = videoElement.closest('.html5-video-container') || videoElement.parentElement;
    container.style.position = 'relative';
    container.appendChild(overlay);
  }
  overlay.textContent = 'ANU AI is dubbing... Please wait.';
}

function showPlayButton(audioUrl) {
  console.log("ANU (on-page): Dubbing complete. Showing play button.");
  const overlay = document.getElementById('anu-dubbing-overlay');
  if (!overlay) return;

  overlay.textContent = '▶️ Play Dubbed Version';
  overlay.onclick = () => {
    playDubbedAudio(audioUrl);
  };
}

function playDubbedAudio(audioUrl) {
  console.log("ANU (on-page): Play button clicked. Starting dubbed audio.");
  const overlay = document.getElementById('anu-dubbing-overlay');
  if (overlay) overlay.remove();

  const videoElement = document.querySelector('video');
  if (!videoElement) return;

  let dubbedAudio = document.getElementById('anuDubbedAudio');
  if (!dubbedAudio) {
    dubbedAudio = new Audio(audioUrl);
    dubbedAudio.id = 'anuDubbedAudio';
    document.body.appendChild(dubbedAudio);
  } else {
    dubbedAudio.src = audioUrl;
  }
  
  videoElement.muted = true;
  videoElement.currentTime = 0;
  dubbedAudio.currentTime = 0;
  
  videoElement.play();
  dubbedAudio.play();

  videoElement.onplay = () => dubbedAudio.play();
  videoElement.onpause = () => dubbedAudio.pause();
  videoElement.onseeking = () => { dubbedAudio.currentTime = videoElement.currentTime; };
}

function stopDubbing() {
  console.log("ANU (on-page): Stopping dubbing and cleaning up.");
  const overlay = document.getElementById('anu-dubbing-overlay');
  if (overlay) overlay.remove();

  const videoElement = document.querySelector('video');
  if (videoElement) {
    videoElement.muted = false;
    if (videoElement.paused) videoElement.play();
  }
  const dubbedAudio = document.getElementById('anuDubbedAudio');
  if (dubbedAudio) {
    dubbedAudio.pause();
    document.body.removeChild(dubbedAudio);
  }
}
