import React, { useEffect, useRef } from 'react';
import * as AudioHelpers from '../utils/audioHelpers';
import './CircularEqualizer.css';

const CircularEqualizer = ({ 
  frequencyData, 
  audioLevel, 
  audioStats,
  isRecording,
  size = 500 
}) => {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const barDataRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // If not recording, show idle animation
    if (!isRecording || !frequencyData) {
      drawIdleAnimation(ctx, centerX, centerY);
      return;
    }

    // Generate bar data for visualization
    const barData = AudioHelpers.createCircularVisualizationData(
      new Uint8Array(frequencyData),
      72,
      { smoothing: 0.7, logScaling: true }
    );
    barDataRef.current = barData;

    drawEqualizer(ctx, barData, audioLevel, audioStats, centerX, centerY);

    // Smooth animation with requestAnimationFrame
    const animate = () => {
      if (isRecording && frequencyData) {
        drawEqualizer(ctx, barDataRef.current, audioLevel, audioStats, centerX, centerY);
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [frequencyData, audioLevel, audioStats, isRecording, size]);

  const drawIdleAnimation = (ctx, centerX, centerY) => {
    const baseRadius = Math.min(centerX, centerY) * 0.4;
    const time = Date.now() * 0.001;
    
    // Draw pulsing center circle
    const pulseRadius = baseRadius * (0.8 + 0.2 * Math.sin(time * 2));
    
    const gradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, pulseRadius
    );
    
    gradient.addColorStop(0, 'rgba(100, 100, 255, 0.6)');
    gradient.addColorStop(0.5, 'rgba(80, 80, 220, 0.3)');
    gradient.addColorStop(1, 'rgba(60, 60, 200, 0)');
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Draw static equalizer bars
    const numBars = 60;
    const angleStep = (Math.PI * 2) / numBars;
    const barWidth = 3;
    
    for (let i = 0; i < numBars; i++) {
      const angle = i * angleStep;
      const barLength = baseRadius * 0.3;
      const approxFrequency = (i / numBars) * 10000;
      
      // Calculate bar position
      const startX = centerX + Math.cos(angle) * baseRadius;
      const startY = centerY + Math.sin(angle) * baseRadius;
      const endX = centerX + Math.cos(angle) * (baseRadius + barLength);
      const endY = centerY + Math.sin(angle) * (baseRadius + barLength);
      
      // Create gradient using audio helper
      const gradient = AudioHelpers.createFrequencyGradient(
        ctx, startX, startY, endX, endY, approxFrequency, 0.3
      );
      
      // Draw bar
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = barWidth;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  };

  const drawEqualizer = (ctx, barData, audioLevel, audioStats, centerX, centerY) => {
    // Clear canvas with fade effect for trail
    ctx.fillStyle = 'rgba(15, 15, 25, 0.15)';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    const baseRadius = Math.min(centerX, centerY) * 0.4;
    const maxBarLength = Math.min(centerX, centerY) * 0.5;
    const barWidth = 3;
    
    // Draw frequency bars
    barData.forEach((bar, i) => {
      const { angle, height, frequency } = bar;
      
      // Calculate bar length
      const barLength = height * maxBarLength;
      
      // Calculate positions
      const startX = centerX + Math.cos(angle) * baseRadius;
      const startY = centerY + Math.sin(angle) * baseRadius;
      const endX = centerX + Math.cos(angle) * (baseRadius + barLength);
      const endY = centerY + Math.sin(angle) * (baseRadius + barLength);
      
      // Create gradient based on frequency and audio level
      const gradient = AudioHelpers.createFrequencyGradient(
        ctx, startX, startY, endX, endY, frequency, audioLevel
      );
      
      // Draw bar
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = barWidth;
      ctx.lineCap = 'round';
      ctx.stroke();
      
      // Add glow effect for high values
      if (height > 0.7) {
        ctx.shadowColor = AudioHelpers.getFrequencyColor(frequency, 0.8);
        ctx.shadowBlur = 15 + (height * 10);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    });
    
    // Draw center circle with audio level indicator
    const centerRadius = baseRadius * 0.6;
    const pulseRadius = centerRadius * (0.9 + audioLevel * 0.3);
    
    const centerGradient = ctx.createRadialGradient(
      centerX, centerY, centerRadius * 0.5,
      centerX, centerY, pulseRadius
    );
    
    // Color based on spectral centroid if available
    let hue = 220; // Default blue
    if (audioStats && audioStats.spectral) {
      // Map centroid to hue (0-4000 Hz maps to 200-360 hue)
      hue = 200 + (Math.min(audioStats.spectral.centroid, 4000) / 4000) * 160;
    }
    
    centerGradient.addColorStop(0, `hsla(${hue}, 80%, 70%, ${0.3 + audioLevel * 0.4})`);
    centerGradient.addColorStop(0.7, `hsla(${hue}, 70%, 60%, ${0.1 + audioLevel * 0.2})`);
    centerGradient.addColorStop(1, `hsla(${hue}, 60%, 50%, 0)`);
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
    ctx.fillStyle = centerGradient;
    ctx.fill();
    
    // Draw inner circle
    const innerGradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, centerRadius
    );
    
    innerGradient.addColorStop(0, 'rgba(30, 30, 50, 0.9)');
    innerGradient.addColorStop(1, 'rgba(20, 20, 40, 0.8)');
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, centerRadius, 0, Math.PI * 2);
    ctx.fillStyle = innerGradient;
    ctx.fill();
    
    // Display audio stats if available
    if (audioStats && audioLevel > 0.1) {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + audioLevel * 0.5})`;
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Display different stats based on audio level
      if (audioLevel > 0.7) {
        // High level - show peak
        ctx.fillText(`PEAK`, centerX, centerY - 15);
        ctx.font = 'bold 24px Arial';
        ctx.fillText(`${Math.round(audioLevel * 100)}%`, centerX, centerY + 15);
      } else if (audioStats.spectral) {
        // Normal level - show centroid frequency
        const centroid = AudioHelpers.formatFrequency(audioStats.spectral.centroid);
        ctx.font = 'bold 14px Arial';
        ctx.fillText(`Center:`, centerX, centerY - 20);
        ctx.font = 'bold 20px Arial';
        ctx.fillText(centroid, centerX, centerY + 10);
      } else {
        // Low level - just show percentage
        ctx.fillText(`${Math.round(audioLevel * 100)}%`, centerX, centerY);
      }
    }
  };

  return (
    <div className="circular-equalizer">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="equalizer-canvas"
      />
      <div className="visualizer-overlay">
        <div className={`recording-indicator ${isRecording ? 'active' : ''}`}>
          <div className="pulse-ring"></div>
          <div className="pulse-ring delay-1"></div>
          <div className="pulse-ring delay-2"></div>
        </div>
        
        {/* Audio stats display */}
        {audioStats && (
          <div className="audio-stats-overlay">
            <div className="stat-item">
              <span className="stat-label">RMS</span>
              <span className="stat-value">{Math.round(audioLevel * 100)}%</span>
            </div>
            {audioStats.spectral && (
              <div className="stat-item">
                <span className="stat-label">Center</span>
                <span className="stat-value">
                  {AudioHelpers.formatFrequency(audioStats.spectral.centroid)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CircularEqualizer;