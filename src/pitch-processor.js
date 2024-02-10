const DEFAULT_THRESHOLD = 0.20;
const DEFAULT_BUFFER_SIZE = 2048;
const DEFAULT_OVERLAP = 1536;

class YinPitchDetector {
    constructor(sampleRate, bufferSize) {
        this.threshold = DEFAULT_THRESHOLD; 
        this.sampleRate = sampleRate; 
        if (bufferSize == 0 ){
            bufferSize = DEFAULT_BUFFER_SIZE;
        }
        
        this.yinBuffer = new Float32Array(bufferSize / 2);        
        this.result = new PitchDetectionResult();  // Initialize with a new instance of PitchDetectionResult
        this.scale = 100;
    }

    // Assuming audioBuffer is a Float32Array of audio samples
    getPitch(audioBuffer) {
        // YIN algorithm implementation goes here
        // 1. Compute difference function of the signal with respect to time
        this.difference(audioBuffer);
        // 2. Compute cumulative mean normalized difference function
        this.cumulativeMeanNormalizedDifference();

        // 3. Search for minimum starting from second index
        let tauEstimate = this.absoluteThreshold();
        let pitchInHertz;

        // 4. Interpolate minimum with parabolic fi
        if (tauEstimate != -1)
        {
            let betterTau = this.parabolicInterpolation(tauEstimate);
              // conversion to Hz
            pitchInHertz = this.sampleRate / betterTau;
        }
        else
        {
           // no pitch found
            pitchInHertz = -1;
        }
        // 5. Check if result is reliable and update the result object
        this.result.pitch = pitchInHertz;
        
        return this.result;
    }

    difference(audioBuffer) {
        let index, tau;
        let delta;
    
        for (tau = 0; tau < this.yinBuffer.length; tau++) {
            this.yinBuffer[tau] = 0;
        }
    
        for (tau = 1; tau < this.yinBuffer.length; tau++) {
            for (index = 0; index < this.yinBuffer.length; index++) {
                delta = (audioBuffer[index] - audioBuffer[index + tau]) * this.scale;
                this.yinBuffer[tau] += delta * delta;
            }
        }
    }

    cumulativeMeanNormalizedDifference() {
        let tau;
        this.yinBuffer[0] = 1;
        let runningSum = 0;
    
        for (tau = 1; tau < this.yinBuffer.length; tau++) {
            runningSum += this.yinBuffer[tau];
            this.yinBuffer[tau] *= tau / runningSum;
        }
    }

    absoluteThreshold() {
        let tau;
    
        // Start at the third position, as the first two are always 1
        for (tau = 2; tau < this.yinBuffer.length; tau++) {
            if (this.yinBuffer[tau] < this.threshold) {
                while (tau + 1 < this.yinBuffer.length && this.yinBuffer[tau + 1] < this.yinBuffer[tau]) {
                    tau++;
                }
    
                // Set the probability for the result
                this.result.probability = 1 - this.yinBuffer[tau];
                break;
            }
        }
    
        // If no pitch was found
        if (tau === this.yinBuffer.length || this.yinBuffer[tau] >= this.threshold) {
            tau = -1;
            this.result.probability = 0;
            this.result.pitched = false;
        } else {
            this.result.pitched = true;
        }
    
        return tau;
    }

    parabolicInterpolation(tauEstimate) {
        let betterTau;
        let x0, x2;
    
        // Ensure boundaries are not exceeded
        x0 = tauEstimate < 1 ? tauEstimate : tauEstimate - 1;
        x2 = (tauEstimate + 1 < this.yinBuffer.length) ? tauEstimate + 1 : tauEstimate;
    
        if (x0 === tauEstimate) {
            betterTau = this.yinBuffer[tauEstimate] <= this.yinBuffer[x2] ? tauEstimate : x2;
        } else if (x2 === tauEstimate) {
            betterTau = this.yinBuffer[tauEstimate] <= this.yinBuffer[x0] ? tauEstimate : x0;
        } else {
            const s0 = this.yinBuffer[x0];
            const s1 = this.yinBuffer[tauEstimate];
            const s2 = this.yinBuffer[x2];
            
            betterTau = tauEstimate + (s2 - s0) / (2 * (2 * s1 - s2 - s0));
        }
        return betterTau;
    }    
}

class PitchDetectionResult {
    constructor() {
        this.pitch = -1;
        this.probability = -1;
        this.pitched = false;
    }
}

let detector;

// The worker listens for messages from the main thread
self.addEventListener('message', function (e) {
    const action = e.data.action;

 //   console.log(` Worker receiving message: ${action}`);

    switch (action) {
        case 'init':
            const sampleRate = e.data.sampleRate;
            const bufferSize = e.data.bufferSize;
            detector = new YinPitchDetector(sampleRate, bufferSize);
            console.log(` Detector set || samplerate: ${detector.sampleRate} || bufferSize: ${bufferSize} `);
            break;
        case 'process':
            const inputData = e.data.inputData;

           // console.log(` Detector processing || samplerate: ${detector.sampleRate}`);

            // ... your audio processing logic using the detector ...
            const pitchResult = detector.getPitch(inputData); // Use the detector to calculate the pitch
            // Send the result back to the main thread
            self.postMessage(pitchResult);
            break;
            }
        }, false);



