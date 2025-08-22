const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const statusDiv = document.getElementById('status');

chrome.storage.local.get(['isDubbing'], (result) => {
  if (result.isDubbing) {
    statusDiv.textContent = "Dubbing in progress...";
    startButton.style.display = 'none';
    stopButton.style.display = 'block';
  }
});

startButton.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.runtime.sendMessage({ action: "startDubbing", tab: tabs[0] });
    chrome.storage.local.set({ isDubbing: true });
    statusDiv.textContent = "Processing...";
    startButton.style.display = 'none';
    stopButton.style.display = 'block';
  });
});

stopButton.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.runtime.sendMessage({ action: "stopDubbing", tab: tabs[0] });
    chrome.storage.local.set({ isDubbing: false });
    statusDiv.textContent = "Ready to dub.";
    startButton.style.display = 'block';
    stopButton.style.display = 'none';
  });
});