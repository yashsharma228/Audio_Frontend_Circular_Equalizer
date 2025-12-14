import { useState, useEffect, useRef, useCallback } from 'react';
import * as AudioHelpers from '../utils/audioHelpers';

export const useAudioAnalyzer = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [frequencyData, setFrequencyData] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [audioStats, setAudioStats] = useState(null);
  const [audioContext, setAudioContext] = useState(null);
  const [error, setError] = useState(null);
  const [compatibility, setCompatibility] = useState(null);
  
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const dataArrayRef = useRef(null);
  const timeArrayRef = useRef(null);
  const previousDataRef = useRef(null);

  // Check compatibility on mount
  useEffect(() => {
    const compat = AudioHelpers.checkAudioCompatibility();
    setCompatibility(compat);
    
    if (!compat.allSupported) {
      const missing = [];
      if (!compat.webAudioAPI) missing.push('Web Audio API');
      if (!compat.getUserMedia) missing.push('Microphone Access');
      if (!compat.canvas) missing.push('Canvas');
      setError(`Browser incompatible. Missing: ${missing.join(', ')}`);
    }
  }, []);

  const initAudioContext = useCallback(() => {
    if (audioContextRef.current) return audioContextRef.current;
    
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContext();
    audioContextRef.current = context;
    setAudioContext(context);
    return context;
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      
      // Check compatibility
      if (compatibility && !compatibility.allSupported) {
        throw new Error('Browser does not support required audio features');
      }
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
          sampleRate: 44100,
          channelCount: 1,
          latency: 0
        }
      });
      
      streamRef.current = stream;
      
      // Initialize audio context
      const context = initAudioContext();
      
      // Create analyzer node with optimized settings
      const analyser = context.createAnalyser();
      analyser.fftSize = AudioHelpers.AUDIO_CONSTANTS.FFT_SIZE;
      analyser.smoothingTimeConstant = AudioHelpers.AUDIO_CONSTANTS.SMOOTHING;
      analyser.minDecibels = AudioHelpers.AUDIO_CONSTANTS.MIN_DB;
      analyser.maxDecibels = AudioHelpers.AUDIO_CONSTANTS.MAX_DB;
      analyserRef.current = analyser;
      
      // Create source from stream
      const source = context.createMediaStreamSource(stream);
      sourceRef.current = source;
      
      // Connect source to analyzer
      source.connect(analyser);
      
      // Prepare data arrays
      const bufferLength = analyser.frequencyBinCount;
      const frequencyArray = new Uint8Array(bufferLength);
      const timeArray = new Uint8Array(bufferLength);
      
      dataArrayRef.current = frequencyArray;
      timeArrayRef.current = timeArray;
      
      setIsRecording(true);
      
      // Start animation loop
      const analyzeAudio = () => {
        if (!analyserRef.current || !dataArrayRef.current || !timeArrayRef.current) return;
        
        // Get frequency and time domain data
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        analyserRef.current.getByteTimeDomainData(timeArrayRef.current);
        
        // Apply smoothing to frequency data
        let processedFrequencyData = dataArrayRef.current;
        if (previousDataRef.current) {
          processedFrequencyData = AudioHelpers.smoothFrequencyData(
            dataArrayRef.current,
            previousDataRef.current,
            0.6
          );
        }
        previousDataRef.current = processedFrequencyData;
        
        // Calculate audio level using RMS
        const audioLevel = AudioHelpers.calculateRMS(timeArrayRef.current);
        
        // Calculate audio statistics
        const stats = AudioHelpers.calculateAudioStats(
          processedFrequencyData,
          timeArrayRef.current
        );
        
        // Update state
        setAudioLevel(audioLevel);
        setFrequencyData([...processedFrequencyData]);
        setAudioStats(stats);
        
        // Continue animation
        animationFrameRef.current = requestAnimationFrame(analyzeAudio);
      };
      
      // Start analysis loop
      animationFrameRef.current = requestAnimationFrame(analyzeAudio);
      
    } catch (err) {
      console.error('Audio initialization error:', err);
      
      let errorMessage = err.message || 'Failed to access microphone';
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Microphone access denied. Please allow microphone permissions.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No microphone found. Please connect a microphone.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Microphone is already in use by another application.';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = 'Cannot satisfy audio constraints. Try different settings.';
      }
      
      setError(errorMessage);
    }
  }, [initAudioContext, compatibility]);

  const stopRecording = useCallback(() => {
    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Disconnect audio nodes
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    
    // Stop all tracks in stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        if (track.readyState === 'live') {
          track.stop();
        }
      });
      streamRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().then(() => {
        audioContextRef.current = null;
        setAudioContext(null);
      }).catch(err => {
        console.error('Error closing audio context:', err);
      });
    }
    
    // Reset state
    setIsRecording(false);
    setFrequencyData(null);
    setAudioLevel(0);
    setAudioStats(null);
    analyserRef.current = null;
    dataArrayRef.current = null;
    timeArrayRef.current = null;
    previousDataRef.current = null;
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Get device info
  const getDeviceInfo = useCallback(async () => {
    return await AudioHelpers.getAudioDeviceInfo();
  }, []);

  // Generate test data for development
  const generateTestAudio = useCallback((type = 'sine', frequency = 440) => {
    const testData = AudioHelpers.generateTestData(256, type, frequency);
    setFrequencyData([...testData]);
    setAudioLevel(0.5);
    
    // Simulate audio stats
    const stats = AudioHelpers.calculateAudioStats(testData);
    setAudioStats(stats);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  return {
    isRecording,
    frequencyData,
    audioLevel,
    audioStats,
    audioContext,
    error,
    compatibility,
    startRecording,
    stopRecording,
    toggleRecording,
    getDeviceInfo,
    generateTestAudio
  };
};