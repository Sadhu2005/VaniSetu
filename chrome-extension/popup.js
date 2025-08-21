// In chrome-extension/popup.js

document.getElementById('dubButton').addEventListener('click', () => {
  // Find the active tab and send a message to our background script
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.runtime.sendMessage({
      action: "startCapture",
      tabId: tabs[0].id
    });
  });
  // Change button text to give user feedback
  const button = document.getElementById('dubButton');
  button.textContent = "Dubbing (10s)...";
  button.disabled = true;
});