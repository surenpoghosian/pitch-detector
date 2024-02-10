import React, { useRef, useState, useEffect } from 'react';
import { YinPitchDetector, PitchDetectionResult } from './YinPitchDetector';
import { StreamChart } from './StreamChart';

const Spectrogram = () => {
  const canvasRef = useRef(null);
  const [audioContext, setAudioContext] = useState(null);
  const [analyser, setAnalyser] = useState(null);
  const [animationFrameId, setAnimationFrameId] = useState(null);
  const [detector, setDetector] = useState(null);
  const [pitch, setPitch] = useState([])

  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Your browser does not support getUserMedia API");
      return;
    }

    const initAudioContextAndDetector = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const newAudioContext = new AudioContext();
        const newAnalyser = newAudioContext.createAnalyser();
        newAnalyser.fftSize = 2048;
        const source = newAudioContext.createMediaStreamSource(stream);
        source.connect(newAnalyser);

        const newDetector = new YinPitchDetector(newAudioContext.sampleRate, 2048);

        setAudioContext(newAudioContext);
        setAnalyser(newAnalyser);
        setDetector(newDetector);
      } catch (error) {
        console.error('Error accessing the microphone', error);
      }
    };

    initAudioContextAndDetector();

    return () => {
      if (audioContext) {
        audioContext.close();
      }
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  useEffect(() => {
    if (analyser && canvasRef.current && detector) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const renderFrame = () => {
        const bufferLength = analyser.fftSize;
        const dataArray = new Float32Array(bufferLength);
        analyser.getFloatTimeDomainData(dataArray);

        // Use the pitch detector to calculate the pitch from the current audio frame
        const pitchResult = detector.getPitch(dataArray);

        if (ctx && canvas) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = 'rgb(200, 200, 200)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          if (pitchResult.pitch !== -1) {
            ctx.fillStyle = 'rgb(0, 0, 0)';
            ctx.font = '24px Arial';
            ctx.fillText(`Pitch: ${pitchResult.pitch.toFixed(2)} Hz`, 10, 50);
            setPitch(prevValues => {
              const newValue = parseFloat(pitchResult.pitch.toFixed(2));
              if (prevValues.length > 100) { // Example: Keep the last 100 values
                return [...prevValues.slice(1), newValue];
              } else {
                return [...prevValues, newValue];
              }
            });          
          } else {
            ctx.fillStyle = 'rgb(255, 0, 0)';
            ctx.font = '24px Arial';
            ctx.fillText(`Pitch not detected`, 10, 50);
          }
        }

        const newAnimationFrameId = requestAnimationFrame(renderFrame);
        setAnimationFrameId(newAnimationFrameId);
      };

      renderFrame();
    }
  }, [analyser, detector]);

  return (
    <div>
      <StreamChart pitchValues={pitch}/>
      <h1 style={{position:'absolute', color:'black', left:"40px", top:"40px"}}>Pitch Detector</h1>
      <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight} />
    </div>
  );
};

export default Spectrogram;



