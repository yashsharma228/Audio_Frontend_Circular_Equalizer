import React, { useState, useEffect } from 'react';
import CircularEqualizer from './components/CircularEqualizer';
import AudioControls from './components/AudioControls';
import { useAudioAnalyzer } from './hooks/useAudioAnalyzer';
import * as AudioHelpers from './utils/audioHelpers';
import './App.css';

function App() {
  const [volumeSensitivity, setVolumeSensitivity] = useState(1);
  const [visualizerSize, setVisualizerSize] = useState(500);
  const [deviceInfo, setDeviceInfo] = useState(null);
  
  const {
    isRecording,
    frequencyData,
    audioLevel,
    audioStats,
    error,
    compatibility,
    toggleRecording,
    startRecording,
    stopRecording,
    getDeviceInfo,
    generateTestAudio
  } = useAudioAnalyzer();

  // Get device info on mount
  useEffect(() => {
    getDeviceInfo().then(info => {
      setDeviceInfo(info);
    });
  }, [getDeviceInfo]);

  // Adjust visualizer size based on window width
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setVisualizerSize(300);
      } else if (width < 1024) {
        setVisualizerSize(400);
      } else {
        setVisualizerSize(500);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Apply volume sensitivity to audio level
  const adjustedAudioLevel = Math.min(audioLevel * volumeSensitivity, 1);

  const handleVolumeChange = (value) => {
    setVolumeSensitivity(value);
  };

  const handleTestAudio = (type) => {
    stopRecording();
    setTimeout(() => {
      generateTestAudio(type);
    }, 100);
  };

  return (
    <div className="App">
      <div className="app-container">
        <header className="app-header">
          <h1 className="app-title">Circular Audio Equalizer</h1>
          <p className="app-subtitle">
            Real-time frequency visualization with Web Audio API • 60 FPS Smooth Animation
          </p>
          
          {deviceInfo && (
            <div className="device-info">
              <span className="device-count">
                {deviceInfo.available 
                  ? `${deviceInfo.count} microphone(s) detected` 
                  : 'No microphone detected'}
              </span>
              {deviceInfo.defaultDevice && (
                <span className="default-device">
                  Default: {deviceInfo.defaultDevice.label || 'Default Microphone'}
                </span>
              )}
            </div>
          )}
        </header>

        <main className="app-main">
          <div className="visualizer-wrapper">
            <CircularEqualizer
              frequencyData={frequencyData}
              audioLevel={adjustedAudioLevel}
              audioStats={audioStats}
              isRecording={isRecording}
              size={visualizerSize}
            />
          </div>

          <div className="controls-wrapper">
            <AudioControls
              isRecording={isRecording}
              audioLevel={adjustedAudioLevel}
              frequencyData={frequencyData}
              onToggleRecording={toggleRecording}
              onVolumeChange={handleVolumeChange}
              volume={volumeSensitivity}
            />
          </div>

          {/* Test audio buttons (for development) */}
          <div className="test-buttons">
            <h4>Test Audio Patterns:</h4>
            <div className="button-group">
              <button 
                className="test-button sine"
                onClick={() => handleTestAudio('sine')}
              >
                Sine Wave
              </button>
              <button 
                className="test-button pulse"
                onClick={() => handleTestAudio('pulse')}
              >
                Pulse
              </button>
              <button 
                className="test-button random"
                onClick={() => handleTestAudio('random')}
              >
                Random Noise
              </button>
            </div>
          </div>

          {error && (
            <div className="error-message">
              <div className="error-icon">⚠️</div>
              <div className="error-text">
                <strong>Error:</strong> {error}
              </div>
              {error.includes('denied') && (
                <button 
                  className="error-retry"
                  onClick={() => {
                    stopRecording();
                    setTimeout(startRecording, 500);
                  }}
                >
                  Retry Microphone Access
                </button>
              )}
            </div>
          )}

          {/* Advanced audio statistics */}
          {audioStats && (
            <div className="advanced-stats">
              <h3>Audio Analysis</h3>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-title">Spectral Centroid</div>
                  <div className="stat-value">
                    {AudioHelpers.formatFrequency(audioStats.spectral?.centroid || 0)}
                  </div>
                  <div className="stat-desc">Spectral center of gravity</div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-title">Spectral Flatness</div>
                  <div className="stat-value">
                    {(audioStats.spectral?.flatness || 0).toFixed(3)}
                  </div>
                  <div className="stat-desc">Noise vs tone (0-1)</div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-title">Spectral Rolloff</div>
                  <div className="stat-value">
                    {AudioHelpers.formatFrequency(audioStats.spectral?.rolloff || 0)}
                  </div>
                  <div className="stat-desc">85% energy frequency</div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-title">Frequency Range</div>
                  <div className="stat-value">
                    {audioStats.frequency?.min || 0} - {audioStats.frequency?.max || 0}
                  </div>
                  <div className="stat-desc">Min/Max values</div>
                </div>
              </div>
            </div>
          )}

          <div className="instructions">
            <h3>How to Use:</h3>
            <ol>
              <li>Click "Start Recording" to begin microphone access</li>
              <li>Grant microphone permissions when prompted</li>
              <li>Speak, sing, or play music to see the visualization</li>
              <li>Adjust volume sensitivity for different sound levels</li>
              <li>Watch the circular equalizer react in real-time</li>
            </ol>
            
            <div className="feature-list">
              <div className="feature">
                <div className="feature-icon">🎯</div>
                <div className="feature-text">
                  <strong>60 FPS Animation:</strong> Uses requestAnimationFrame for smooth performance
                </div>
              </div>
              <div className="feature">
                <div className="feature-icon">⚡</div>
                <div className="feature-text">
<strong>Real-time Response:</strong> Instant reaction to audio changes with sub-50ms latency
                </div>
              </div>
              <div className="feature">
                <div className="feature-icon">🎨</div>
                <div className="feature-text">
                  <strong>Dynamic Colors:</strong> Automatic color adaptation based on frequency and volume
                </div>
              </div>
              <div className="feature">
                <div className="feature-icon">📊</div>
                <div className="feature-text">
                  <strong>Advanced Analysis:</strong> Spectral centroid, flatness, and rolloff calculations
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="app-footer">
          <p>
            Built with React & Web Audio API • 
            <a 
              href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              Web Audio API Docs
            </a>
          </p>
          {compatibility && (
            <div className="compatibility-info">
              Browser Support: {compatibility.allSupported ? '✅ Full Support' : '⚠️ Limited Support'}
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}

export default App;