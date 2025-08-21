const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const statusDiv = document.getElementById('status');

// When popup opens, check the status and set the button visibility
chrome.storage.local.get(['isDubbing'], (result) => {
  if (result.isDubbing) {
    statusDiv.textContent = "Dubbing in progress...";
    startButton.style.display = 'none';
    stopButton.style.display = 'block';
  }
});

startButton.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.runtime.sendMessage({ action: "startCapture", tabId: tabs[0].id });
    
    // Update state
    chrome.storage.local.set({ isDubbing: true });
    statusDiv.textContent = "Dubbing in progress...";
    startButton.style.display = 'none';
    stopButton.style.display = 'block';
  });
});

stopButton.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.runtime.sendMessage({ action: "stopCapture", tabId: tabs[0].id });

    // Update state
    chrome.storage.local.set({ isDubbing: false });
    statusDiv.textContent = "Ready to dub.";
    startButton.style.display = 'block';
    stopButton.style.display = 'none';
  });
});