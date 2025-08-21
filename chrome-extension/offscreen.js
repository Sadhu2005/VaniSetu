// In chrome-extension/offscreen.js

let recorder;
let stream;

chrome.runtime.onMessage.addListener((message) => {
  if (message.target === 'offscreen' && message.type === 'start-recording') {
    startContinuousRecording(message.data.streamId);
  }
});

async function startContinuousRecording(streamId) {
  if (recorder?.state === 'recording') return;

  stream = await navigator.mediaDevices.getUserMedia({
    audio: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: streamId } }
  });

  // This function will handle the 10-second recording loop
  const recordAndSend = () => {
    recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    const chunks = [];
    recorder.ondataavailable = (event) => chunks.push(event.data);
    
    recorder.onstop = () => {
      const audioBlob = new Blob(chunks, { type: "audio/webm" });
      chrome.runtime.sendMessage({
        type: 'audio-chunk-captured',
        target: 'background',
        data: { blobUrl: URL.createObjectURL(audioBlob) }
      });
      // After a segment is sent, start the next one immediately
      if (stream.active) {
        recordAndSend();
      }
    };
    
    recorder.start();
    setTimeout(() => {
        if(recorder.state === 'recording') {
            recorder.stop();
        }
    }, 10000); // Record for 10 seconds
  };
  
  // Start the first recording
  recordAndSend();
}