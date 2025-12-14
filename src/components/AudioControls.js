import React from 'react';
import './AudioControls.css';

const AudioControls = ({ 
  isRecording, 
  audioLevel, 
  frequencyData,
  onToggleRecording,
  onVolumeChange,
  volume = 1 
}) => {
  const calculateFrequencyStats = () => {
    if (!frequencyData) return null;
    
    const lowFreq = frequencyData.slice(0, 20).reduce((a, b) => a + b, 0) / 20;
    const midFreq = frequencyData.slice(20, 100).reduce((a, b) => a + b, 0) / 80;
    const highFreq = frequencyData.slice(100).reduce((a, b) => a + b, 0) / (frequencyData.length - 100);
    
    return {
      low: Math.round(lowFreq),
      mid: Math.round(midFreq),
      high: Math.round(highFreq)
    };
  };
  
  const stats = calculateFrequencyStats();

  return (
    <div className="audio-controls">
      <div className="control-section">
        <button
          className={`record-button ${isRecording ? 'recording' : ''}`}
          onClick={onToggleRecording}
        >
          <div className="button-icon">
            {isRecording ? (
              <div className="stop-icon"></div>
            ) : (
              <div className="mic-icon">
                <div className="mic-body"></div>
                <div className="mic-stand"></div>
              </div>
            )}
          </div>
          <span className="button-text">
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </span>
        </button>
        
        <div className="volume-control">
          <label htmlFor="volume">Volume Sensitivity</label>
          <input
            id="volume"
            type="range"
            min="0.1"
            max="2"
            step="0.1"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          />
          <div className="volume-value">{volume.toFixed(1)}x</div>
        </div>
      </div>
      
      <div className="stats-section">
        <div className="audio-level">
          <div className="level-label">Audio Level</div>
          <div className="level-bar">
            <div 
              className="level-fill"
              style={{ width: `${audioLevel * 100}%` }}
            ></div>
          </div>
          <div className="level-value">{Math.round(audioLevel * 100)}%</div>
        </div>
        
        {stats && (
          <div className="frequency-stats">
            <div className="stat-item">
              <div className="stat-label">Low</div>
              <div className="stat-bar low-bar" style={{ height: `${stats.low / 2.55}%` }}></div>
              <div className="stat-value">{stats.low}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Mid</div>
              <div className="stat-bar mid-bar" style={{ height: `${stats.mid / 2.55}%` }}></div>
              <div className="stat-value">{stats.mid}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">High</div>
              <div className="stat-bar high-bar" style={{ height: `${stats.high / 2.55}%` }}></div>
              <div className="stat-value">{stats.high}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioControls;