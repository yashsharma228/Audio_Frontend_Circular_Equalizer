/**
 * Audio Helpers - Utility functions for audio processing and visualization
 */

// Audio constants
export const AUDIO_CONSTANTS = {
  SAMPLE_RATE: 44100,
  FFT_SIZE: 2048,
  SMOOTHING: 0.8,
  MIN_DB: -90,
  MAX_DB: -10,
  FREQUENCY_BANDS: {
    SUB_BASS: [20, 60],
    BASS: [60, 250],
    LOW_MID: [250, 500],
    MID: [500, 2000],
    HIGH_MID: [2000, 4000],
    PRESENCE: [4000, 6000],
    BRILLIANCE: [6000, 20000]
  }
};

/**
 * Get frequency for a specific index
 * @param {number} index - Frequency bin index
 * @param {number} fftSize - FFT size (default 2048)
 * @param {number} sampleRate - Sample rate (default 44100)
 * @returns {number} Frequency in Hz
 */
export const getFrequencyForIndex = (index, fftSize = 2048, sampleRate = 44100) => {
  return (index * sampleRate) / fftSize;
};

/**
 * Get index for a specific frequency
 * @param {number} frequency - Frequency in Hz
 * @param {number} fftSize - FFT size (default 2048)
 * @param {number} sampleRate - Sample rate (default 44100)
 * @returns {number} Array index
 */
export const getIndexForFrequency = (frequency, fftSize = 2048, sampleRate = 44100) => {
  return Math.floor((frequency * fftSize) / sampleRate);
};

/**
 * Calculate frequency band averages
 * @param {Uint8Array} frequencyData - Frequency data array
 * @param {number} sampleRate - Sample rate
 * @param {number} fftSize - FFT size
 * @returns {Object} Band averages
 */
export const calculateBandAverages = (frequencyData, sampleRate = 44100, fftSize = 2048) => {
  const bands = AUDIO_CONSTANTS.FREQUENCY_BANDS;
  const results = {};
  
  Object.entries(bands).forEach(([name, [lowFreq, highFreq]]) => {
    const lowIndex = getIndexForFrequency(lowFreq, fftSize, sampleRate);
    const highIndex = getIndexForFrequency(highFreq, fftSize, sampleRate);
    
    let sum = 0;
    let count = 0;
    
    for (let i = lowIndex; i <= highIndex && i < frequencyData.length; i++) {
      sum += frequencyData[i];
      count++;
    }
    
    results[name.toLowerCase().replace('_', '')] = count > 0 ? sum / count : 0;
  });
  
  return results;
};

/**
 * Calculate RMS (Root Mean Square) audio level
 * @param {Uint8Array} dataArray - Audio data array
 * @returns {number} RMS value (0-1)
 */
export const calculateRMS = (dataArray) => {
  if (!dataArray || dataArray.length === 0) return 0;
  
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    // Normalize to -1 to 1 range
    const normalized = (dataArray[i] - 128) / 128;
    sum += normalized * normalized;
  }
  
  const rms = Math.sqrt(sum / dataArray.length);
  // Convert to 0-1 range
  return Math.min(rms, 1);
};

/**
 * Calculate peak audio level
 * @param {Uint8Array} dataArray - Audio data array
 * @returns {number} Peak value (0-1)
 */
export const calculatePeak = (dataArray) => {
  if (!dataArray || dataArray.length === 0) return 0;
  
  let peak = 0;
  for (let i = 0; i < dataArray.length; i++) {
    const normalized = Math.abs((dataArray[i] - 128) / 128);
    if (normalized > peak) {
      peak = normalized;
    }
  }
  
  return Math.min(peak, 1);
};

/**
 * Apply smoothing to frequency data
 * @param {Uint8Array} currentData - Current frequency data
 * @param {Uint8Array} previousData - Previous frequency data
 * @param {number} smoothingFactor - Smoothing factor (0-1)
 * @returns {Uint8Array} Smoothed data
 */
export const smoothFrequencyData = (currentData, previousData, smoothingFactor = 0.8) => {
  if (!previousData) return currentData.slice();
  
  const smoothed = new Uint8Array(currentData.length);
  for (let i = 0; i < currentData.length; i++) {
    smoothed[i] = Math.round(
      previousData[i] * smoothingFactor + currentData[i] * (1 - smoothingFactor)
    );
  }
  
  return smoothed;
};

/**
 * Normalize frequency data
 * @param {Uint8Array} dataArray - Frequency data array
 * @param {number} maxValue - Maximum value for normalization
 * @returns {number[]} Normalized array (0-1)
 */
export const normalizeFrequencyData = (dataArray, maxValue = 255) => {
  const normalized = new Array(dataArray.length);
  for (let i = 0; i < dataArray.length; i++) {
    normalized[i] = dataArray[i] / maxValue;
  }
  return normalized;
};

/**
 * Apply logarithmic scaling to frequency data (mimics human hearing)
 * @param {Uint8Array} dataArray - Frequency data array
 * @returns {number[]} Log-scaled array
 */
export const applyLogScaling = (dataArray) => {
  const scaled = new Array(dataArray.length);
  for (let i = 0; i < dataArray.length; i++) {
    // Apply logarithmic scaling factor
    const logIndex = Math.log10(i + 1) / Math.log10(dataArray.length);
    const scaledIndex = Math.floor(logIndex * dataArray.length);
    scaled[i] = dataArray[scaledIndex] || 0;
  }
  return scaled;
};

/**
 * Detect beat based on frequency changes
 * @param {Uint8Array} currentData - Current frequency data
 * @param {Uint8Array} previousData - Previous frequency data
 * @param {number} threshold - Beat detection threshold
 * @returns {Object} Beat information
 */
export const detectBeat = (currentData, previousData, threshold = 1.3) => {
  if (!previousData) return { isBeat: false, intensity: 0 };
  
  let energy = 0;
  let previousEnergy = 0;
  
  for (let i = 0; i < currentData.length; i++) {
    energy += currentData[i];
    previousEnergy += previousData[i];
  }
  
  const avgEnergy = energy / currentData.length;
  const avgPrevEnergy = previousEnergy / previousData.length;
  
  const beatIntensity = avgEnergy / (avgPrevEnergy || 1);
  const isBeat = beatIntensity > threshold;
  
  return {
    isBeat,
    intensity: beatIntensity,
    energy: avgEnergy,
    previousEnergy: avgPrevEnergy
  };
};

/**
 * Calculate frequency centroid (spectral center of gravity)
 * @param {Uint8Array} frequencyData - Frequency data array
 * @param {number} sampleRate - Sample rate
 * @param {number} fftSize - FFT size
 * @returns {number} Centroid frequency in Hz
 */
export const calculateSpectralCentroid = (frequencyData, sampleRate = 44100, fftSize = 2048) => {
  let weightedSum = 0;
  let sum = 0;
  
  for (let i = 0; i < frequencyData.length; i++) {
    const frequency = getFrequencyForIndex(i, fftSize, sampleRate);
    weightedSum += frequency * frequencyData[i];
    sum += frequencyData[i];
  }
  
  return sum > 0 ? weightedSum / sum : 0;
};

/**
 * Calculate spectral flatness (noise vs tone)
 * @param {Uint8Array} frequencyData - Frequency data array
 * @returns {number} Flatness value (0-1)
 */
export const calculateSpectralFlatness = (frequencyData) => {
  if (frequencyData.length === 0) return 0;
  
  let geometricMean = 0;
  let arithmeticMean = 0;
  
  for (let i = 0; i < frequencyData.length; i++) {
    const value = Math.max(frequencyData[i], 0.0001); // Avoid log(0)
    geometricMean += Math.log(value);
    arithmeticMean += value;
  }
  
  geometricMean = Math.exp(geometricMean / frequencyData.length);
  arithmeticMean = arithmeticMean / frequencyData.length;
  
  return arithmeticMean > 0 ? geometricMean / arithmeticMean : 0;
};

/**
 * Calculate spectral rolloff (frequency below which 85% of energy is contained)
 * @param {Uint8Array} frequencyData - Frequency data array
 * @param {number} sampleRate - Sample rate
 * @param {number} fftSize - FFT size
 * @param {number} percentile - Percentile (default 85%)
 * @returns {number} Rolloff frequency in Hz
 */
export const calculateSpectralRolloff = (
  frequencyData, 
  sampleRate = 44100, 
  fftSize = 2048,
  percentile = 0.85
) => {
  const totalEnergy = frequencyData.reduce((sum, val) => sum + val, 0);
  const targetEnergy = totalEnergy * percentile;
  
  let cumulativeEnergy = 0;
  for (let i = 0; i < frequencyData.length; i++) {
    cumulativeEnergy += frequencyData[i];
    if (cumulativeEnergy >= targetEnergy) {
      return getFrequencyForIndex(i, fftSize, sampleRate);
    }
  }
  
  return getFrequencyForIndex(frequencyData.length - 1, fftSize, sampleRate);
};

/**
 * Generate color based on frequency and intensity
 * @param {number} frequency - Frequency value
 * @param {number} intensity - Intensity (0-1)
 * @param {string} mode - Color mode: 'hsl', 'rgb', or 'gradient'
 * @returns {string|Object} Color value
 */
export const getFrequencyColor = (frequency, intensity = 0.5, mode = 'hsl') => {
  // Map frequency to hue (0-360)
  const baseHue = (frequency / 20000) * 360;
  
  // Adjust saturation and lightness based on intensity
  const saturation = 70 + (intensity * 30);
  const lightness = 40 + (intensity * 40);
  
  switch (mode) {
    case 'hsl':
      return `hsl(${baseHue}, ${saturation}%, ${lightness}%)`;
    
    case 'rgb':
      // Convert HSL to RGB
      const h = baseHue / 360;
      const s = saturation / 100;
      const l = lightness / 100;
      
      const chroma = (1 - Math.abs(2 * l - 1)) * s;
      const x = chroma * (1 - Math.abs((h * 6) % 2 - 1));
      const m = l - chroma / 2;
      
      let r, g, b;
      if (h < 1/6) [r, g, b] = [chroma, x, 0];
      else if (h < 2/6) [r, g, b] = [x, chroma, 0];
      else if (h < 3/6) [r, g, b] = [0, chroma, x];
      else if (h < 4/6) [r, g, b] = [0, x, chroma];
      else if (h < 5/6) [r, g, b] = [x, 0, chroma];
      else [r, g, b] = [chroma, 0, x];
      
      return `rgb(${Math.round((r + m) * 255)}, ${Math.round((g + m) * 255)}, ${Math.round((b + m) * 255)})`;
    
    case 'gradient':
      return {
        start: `hsl(${baseHue}, ${saturation}%, ${lightness}%)`,
        end: `hsl(${baseHue + 60}, ${saturation}%, ${lightness + 20}%)`
      };
    
    default:
      return `hsl(${baseHue}, ${saturation}%, ${lightness}%)`;
  }
};

/**
 * Create audio frequency gradient for visualization
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x1 - Start X
 * @param {number} y1 - Start Y
 * @param {number} x2 - End X
 * @param {number} y2 - End Y
 * @param {number} frequency - Frequency value
 * @param {number} intensity - Intensity (0-1)
 * @returns {CanvasGradient} Gradient object
 */
export const createFrequencyGradient = (ctx, x1, y1, x2, y2, frequency, intensity) => {
  const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
  const baseHue = (frequency / 20000) * 360;
  const saturation = 70 + (intensity * 30);
  
  gradient.addColorStop(0, `hsla(${baseHue}, ${saturation}%, 50%, ${0.5 + intensity * 0.5})`);
  gradient.addColorStop(0.5, `hsla(${baseHue + 30}, ${saturation}%, 60%, ${0.4 + intensity * 0.4})`);
  gradient.addColorStop(1, `hsla(${baseHue + 60}, ${saturation}%, 70%, ${0.3 + intensity * 0.3})`);
  
  return gradient;
};

/**
 * Format frequency for display
 * @param {number} frequency - Frequency in Hz
 * @returns {string} Formatted frequency
 */
export const formatFrequency = (frequency) => {
  if (frequency >= 1000) {
    return `${(frequency / 1000).toFixed(1)} kHz`;
  }
  return `${Math.round(frequency)} Hz`;
};

/**
 * Format decibel level
 * @param {number} db - Decibel value
 * @returns {string} Formatted dB
 */
export const formatDecibels = (db) => {
  return `${db.toFixed(1)} dB`;
};

/**
 * Generate test audio data for development
 * @param {number} length - Length of data array
 * @param {string} type - Type of test data: 'sine', 'random', 'pulse'
 * @param {number} frequency - Base frequency for sine wave
 * @returns {Uint8Array} Test audio data
 */
export const generateTestData = (length = 256, type = 'sine', frequency = 440) => {
  const data = new Uint8Array(length);
  
  switch (type) {
    case 'sine':
      for (let i = 0; i < length; i++) {
        // Create sine wave pattern
        const value = Math.sin((i / length) * Math.PI * 2 * frequency / 1000) * 0.5 + 0.5;
        data[i] = Math.floor(value * 255);
      }
      break;
    
    case 'random':
      for (let i = 0; i < length; i++) {
        data[i] = Math.floor(Math.random() * 255);
      }
      break;
    
    case 'pulse':
      const pulseRate = 4; // Pulses per array
      for (let i = 0; i < length; i++) {
        const pulse = Math.sin((i / length) * Math.PI * 2 * pulseRate) * 0.5 + 0.5;
        const noise = Math.random() * 0.3;
        data[i] = Math.floor((pulse + noise) * 127.5);
      }
      break;
    
    default:
      for (let i = 0; i < length; i++) {
        data[i] = 128; // Silent
      }
  }
  
  return data;
};

/**
 * Calculate audio statistics
 * @param {Uint8Array} frequencyData - Frequency data array
 * @param {Uint8Array} timeDomainData - Time domain data (optional)
 * @returns {Object} Audio statistics
 */
export const calculateAudioStats = (frequencyData, timeDomainData = null) => {
  const stats = {
    frequency: {
      min: Infinity,
      max: -Infinity,
      avg: 0,
      total: 0
    },
    level: {
      rms: 0,
      peak: 0,
      avg: 0
    },
    bands: {},
    spectral: {
      centroid: 0,
      flatness: 0,
      rolloff: 0
    }
  };
  
  // Frequency stats
  let sum = 0;
  for (let i = 0; i < frequencyData.length; i++) {
    const value = frequencyData[i];
    stats.frequency.min = Math.min(stats.frequency.min, value);
    stats.frequency.max = Math.max(stats.frequency.max, value);
    sum += value;
  }
  stats.frequency.avg = sum / frequencyData.length;
  stats.frequency.total = sum;
  
  // Time domain stats (if available)
  if (timeDomainData && timeDomainData.length > 0) {
    stats.level.rms = calculateRMS(timeDomainData);
    stats.level.peak = calculatePeak(timeDomainData);
    
    let timeSum = 0;
    for (let i = 0; i < timeDomainData.length; i++) {
      timeSum += timeDomainData[i];
    }
    stats.level.avg = timeSum / timeDomainData.length;
  }
  
  // Band averages
  stats.bands = calculateBandAverages(frequencyData);
  
  // Spectral features
  stats.spectral.centroid = calculateSpectralCentroid(frequencyData);
  stats.spectral.flatness = calculateSpectralFlatness(frequencyData);
  stats.spectral.rolloff = calculateSpectralRolloff(frequencyData);
  
  return stats;
};

/**
 * Create audio visualization data for circular equalizer
 * @param {Uint8Array} frequencyData - Raw frequency data
 * @param {number} numBars - Number of bars in visualization
 * @param {Object} options - Visualization options
 * @returns {Array} Processed bar data
 */
export const createCircularVisualizationData = (
  frequencyData,
  numBars = 72,
  options = {}
) => {
  const {
    smoothing = 0.7,
    logScaling = true,
    minBarHeight = 0.05,
    maxBarHeight = 1.0
  } = options;
  
  // Process frequency data
  let processedData = [...frequencyData];
  
  if (logScaling) {
    processedData = applyLogScaling(frequencyData);
  }
  
  // Normalize data
  const normalizedData = normalizeFrequencyData(
    new Uint8Array(processedData.map(v => Math.round(v))),
    255
  );
  
  // Create bar data
  const barData = [];
  const step = Math.floor(normalizedData.length / numBars);
  
  for (let i = 0; i < numBars; i++) {
    const startIdx = i * step;
    const endIdx = Math.min(startIdx + step, normalizedData.length);
    
    // Calculate average value for this segment
    let sum = 0;
    let count = 0;
    for (let j = startIdx; j < endIdx; j++) {
      sum += normalizedData[j];
      count++;
    }
    
    const avgValue = count > 0 ? sum / count : 0;
    
    // Apply smoothing and constraints
    let barHeight = avgValue;
    barHeight = Math.max(barHeight, minBarHeight);
    barHeight = Math.min(barHeight, maxBarHeight);
    
    // Apply easing for visual appeal
    barHeight = Math.pow(barHeight, 1.5);
    
    // Calculate frequency for this bar (approximate)
    const approxFrequency = getFrequencyForIndex(startIdx + step / 2);
    
    barData.push({
      index: i,
      height: barHeight,
      frequency: approxFrequency,
      rawValue: avgValue,
      angle: (i / numBars) * Math.PI * 2
    });
  }
  
  return barData;
};

/**
 * Check browser compatibility for Web Audio API
 * @returns {Object} Compatibility information
 */
export const checkAudioCompatibility = () => {
  const compatibility = {
    webAudioAPI: !!window.AudioContext || !!window.webkitAudioContext,
    getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    canvas: !!window.CanvasRenderingContext2D,
    requestAnimationFrame: !!window.requestAnimationFrame
  };
  
  compatibility.allSupported = 
    compatibility.webAudioAPI && 
    compatibility.getUserMedia && 
    compatibility.canvas &&
    compatibility.requestAnimationFrame;
  
  return compatibility;
};

/**
 * Get audio device information
 * @returns {Promise<Object>} Device information
 */
export const getAudioDeviceInfo = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter(device => device.kind === 'audioinput');
    
    return {
      available: audioInputs.length > 0,
      devices: audioInputs,
      defaultDevice: audioInputs.find(device => device.deviceId === 'default'),
      count: audioInputs.length
    };
  } catch (error) {
    console.error('Error getting audio devices:', error);
    return {
      available: false,
      devices: [],
      defaultDevice: null,
      count: 0,
      error: error.message
    };
  }
};

// Export all functions as default object
export default {
  AUDIO_CONSTANTS,
  getFrequencyForIndex,
  getIndexForFrequency,
  calculateBandAverages,
  calculateRMS,
  calculatePeak,
  smoothFrequencyData,
  normalizeFrequencyData,
  applyLogScaling,
  detectBeat,
  calculateSpectralCentroid,
  calculateSpectralFlatness,
  calculateSpectralRolloff,
  getFrequencyColor,
  createFrequencyGradient,
  formatFrequency,
  formatDecibels,
  generateTestData,
  calculateAudioStats,
  createCircularVisualizationData,
  checkAudioCompatibility,
  getAudioDeviceInfo
};