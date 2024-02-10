export class YinPitchDetector {
    constructor(sampleRate, bufferSize = 2048) {
        this.threshold = 0.20; // Default threshold for the absolute threshold step
        this.sampleRate = sampleRate;
        this.bufferSize = bufferSize;
        this.yinBuffer = new Float32Array(bufferSize / 2);
        this.result = new PitchDetectionResult(); // Initialize with a new instance of PitchDetectionResult
    }

    getPitch(audioBuffer) {
        this.difference(audioBuffer);
        this.cumulativeMeanNormalizedDifference();
        let tauEstimate = this.absoluteThreshold();
        let pitchInHertz;

        if (tauEstimate !== -1) {
            let betterTau = this.parabolicInterpolation(tauEstimate);
            pitchInHertz = this.sampleRate / betterTau;
        } else {
            pitchInHertz = -1; // No pitch found
        }

        this.result.pitch = pitchInHertz;
        return this.result;
    }

    difference(audioBuffer) {
        let tau;
        let bufferSize = this.bufferSize / 2;
        for (tau = 0; tau < bufferSize; tau++) {
            this.yinBuffer[tau] = 0;
        }
        for (tau = 1; tau < bufferSize; tau++) {
            for (let i = 0; i < bufferSize; i++) {
                let delta = audioBuffer[i] - audioBuffer[i + tau];
                this.yinBuffer[tau] += delta * delta;
            }
        }
    }

    cumulativeMeanNormalizedDifference() {
        let tau;
        let bufferSize = this.bufferSize / 2;
        this.yinBuffer[0] = 1;
        let runningSum = 0;
        for (tau = 1; tau < bufferSize; tau++) {
            runningSum += this.yinBuffer[tau];
            this.yinBuffer[tau] *= tau / runningSum;
        }
    }

    absoluteThreshold() {
        let tau;
        let bufferSize = this.bufferSize / 2;
        for (tau = 2; tau < bufferSize; tau++) {
            if (this.yinBuffer[tau] < this.threshold) {
                while (tau + 1 < bufferSize && this.yinBuffer[tau + 1] < this.yinBuffer[tau]) {
                    tau++;
                }
                return tau;
            }
        }
        // If no pitch found within threshold
        return -1;
    }

    parabolicInterpolation(tauEstimate) {
        let x0, x2;
        if (tauEstimate < 1) {
            x0 = tauEstimate;
        } else {
            x0 = tauEstimate - 1;
        }
        if (tauEstimate + 1 < this.yinBuffer.length) {
            x2 = tauEstimate + 1;
        } else {
            x2 = tauEstimate;
        }
        if (x0 === tauEstimate) {
            return (this.yinBuffer[tauEstimate] <= this.yinBuffer[x2]) ? tauEstimate : x2;
        } else if (x2 === tauEstimate) {
            return (this.yinBuffer[tauEstimate] <= this.yinBuffer[x0]) ? tauEstimate : x0;
        } else {
            let s0, s1, s2;
            s0 = this.yinBuffer[x0];
            s1 = this.yinBuffer[tauEstimate];
            s2 = this.yinBuffer[x2];
            // Parabolic interpolation formula
            return tauEstimate + (s2 - s0) / (2 * (2 * s1 - s2 - s0));
        }
    }
}

export class PitchDetectionResult {
    constructor() {
        this.pitch = -1; // The detected pitch frequency in Hz
        this.probability = -1; // The probability of the detected pitch
        this.pitched = false; // Whether a pitch has been detected
    }
}
