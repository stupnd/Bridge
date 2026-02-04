import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './SensorGraph.css';

/**
 * SensorGraph Component
 * 
 * Displays a live-updating line graph of recent sensor readings
 * 
 * @param {Array} data - Array of sensor readings with timestamp and value
 *                       Format: [{ timestamp: number, value: number }, ...]
 * 
 * The graph shows the last 20 readings, automatically scrolling as new data arrives
 */
function SensorGraph({ data }) {
  // Format data for the chart
  // Convert absolute timestamps to relative time labels for readability
  const chartData = data.map((reading, index) => ({
    index: index + 1,
    value: reading.value,
    time: new Date(reading.timestamp).toLocaleTimeString()
  }));

  // Custom tooltip to show detailed information on hover
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-value">{`Value: ${payload[0].value}`}</p>
          <p className="tooltip-time">{`Time: ${payload[0].payload.time}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="sensor-graph">
      <h2 className="graph-title">Real-time Sensor Data</h2>
      <div className="graph-container">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis 
                dataKey="index" 
                label={{ value: 'Reading #', position: 'insideBottom', offset: -5 }}
                stroke="#666"
              />
              <YAxis 
                domain={[0, 1023]} 
                label={{ value: 'Sensor Value', angle: -90, position: 'insideLeft' }}
                stroke="#666"
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#2196f3" 
                strokeWidth={2}
                dot={{ fill: '#2196f3', r: 3 }}
                activeDot={{ r: 6 }}
                animationDuration={300}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="no-data">
            <p>Waiting for sensor data...</p>
          </div>
        )}
      </div>
      <p className="graph-info">
        Displaying last {data.length} readings (max 20)
      </p>
    </div>
  );
}

export default SensorGraph;
