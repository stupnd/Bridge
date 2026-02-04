import React from 'react';
import './SensorDisplay.css';

/**
 * SensorDisplay Component
 * 
 * Displays the current flex sensor value in large, easy-to-read format
 * 
 * @param {number} value - Current sensor reading (0-1023 range for analog sensors)
 */
function SensorDisplay({ value }) {
  // Check if we have data
  const hasData = value !== null && value !== undefined;
  
  // Calculate percentage for visual indicator (0-1023 maps to 0-100%)
  const percentage = hasData ? ((value / 1023) * 100).toFixed(1) : '0.0';
  
  // Color coding based on value ranges
  const getValueColor = () => {
    if (!hasData) return '#999'; // Gray for no data
    if (value < 341) return '#4caf50'; // Green (low flex)
    if (value < 682) return '#ff9800'; // Orange (medium flex)
    return '#f44336'; // Red (high flex)
  };

  return (
    <div className="sensor-display">
      <h2 className="sensor-label">Flex Sensor Value</h2>
      <div className="sensor-value" style={{ color: getValueColor() }}>
        {hasData ? value : '---'}
      </div>
      <div className="sensor-info">
        <span className="sensor-range">Range: 0-1023</span>
        <span className="sensor-percentage">{hasData ? `${percentage}%` : 'No data'}</span>
      </div>
      <div className="status-indicator">
        <span className={`status-dot ${!hasData ? 'inactive' : ''}`}></span>
        <span>{hasData ? 'Live' : 'Waiting for connection...'}</span>
      </div>
    </div>
  );
}

export default SensorDisplay;
