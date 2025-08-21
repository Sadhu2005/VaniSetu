// In chrome-extension/offscreen.js

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.target === 'offscreen' && message.type === 'start-recording') {
    // We now receive the streamId directly from the background script
    startRecording(message.data.streamId);
  }
});

async function startRecording(streamId) {
  // Use the streamId to get the media stream
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId // Use the passed streamId
      }
    }
  });

  // The rest of the recording logic is the same
  const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
  const chunks = [];
  recorder.ondataavailable = (event) => chunks.push(event.data);
  recorder.onstop = () => {
    const audioBlob = new Blob(chunks, { type: "audio/webm" });
    
    chrome.runtime.sendMessage({
      type: 'audio-captured',
      target: 'background',
      data: {
        blobUrl: URL.createObjectURL(audioBlob) 
      }
    });
    stream.getTracks().forEach(track => track.stop());
  };
  
  recorder.start();
  setTimeout(() => recorder.stop(), 10000);
}