import React, { useState, useRef } from 'react';
import YinPitchDetector from './YinPitchDetector';

function PitchDetector() {
  const [pitch, setPitch] = useState(null);
  const [probability, setProbability] = useState(null);
  const [audioStarted, setAudioStarted] = useState(false);
  const audioContextRef = useRef(null);
  const detectorRef = useRef(null);

  async function initAudioContext() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    await audioContext.audioWorklet.addModule('pitch-processor.js'); // Path to your worklet file
    return audioContext;
}


  const startAudio = async () => {
    if (audioStarted) return;
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(2048, 1, 1);

      detectorRef.current = new YinPitchDetector(audioContextRef.current.sampleRate, 2048);

      source.connect(processor);
      processor.connect(audioContextRef.current.destination);

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const result = detectorRef.current.getPitch(inputData);
        setPitch(result.pitch);
        setProbability(result.probability);
      };

      setAudioStarted(true);
    } catch (err) {
      console.error('Error accessing audio stream:', err);
    }
  };

  return (
    <div>
      <h2>Live Pitch Detector</h2>
      {!audioStarted && <button onClick={startAudio}>Start</button>}
      <div>
        <p>Pitch: {pitch ? `${pitch.toFixed(2)} Hz` : 'N/A'}</p>
        <p>Probability: {probability ? `${(probability * 100).toFixed(2)}%` : 'N/A'}</p>
      </div>
    </div>
  );
}

export default PitchDetector;
