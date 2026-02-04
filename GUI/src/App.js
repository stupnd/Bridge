import React, { useState } from 'react';
import './App.css';
import SensorDisplay from './components/SensorDisplay';
import SensorGraph from './components/SensorGraph';

/**
 * Main application component for ASL Glove Sensor Dashboard
 * 
 * This component manages the sensor data state.
 * Currently displays an empty/waiting state until real sensor data is connected.
 * 
 * TODO: Add real sensor data integration:
 * - Option 1: WebSocket connection to Raspberry Pi (recommended for real-time)
 * - Option 2: HTTP polling (simpler but less efficient)
 * 
 * See commented code below for WebSocket example.
 */
function App() {
  // Current sensor value (most recent reading)
  const [currentValue, setCurrentValue] = useState(null);
  
  // Historical data for graphing (stores last 20 readings)
  const [sensorHistory, setSensorHistory] = useState([]);

  // TODO: Add real sensor data integration here
  // Example WebSocket connection:
  // useEffect(() => {
  //   const ws = new WebSocket('ws://raspberry-pi-ip:port');
  //   ws.onmessage = (event) => {
  //     const data = JSON.parse(event.data);
  //     setCurrentValue(data.flexSensorValue);
  //     setSensorHistory(prev => [...prev, { 
  //       timestamp: Date.now(), 
  //       value: data.flexSensorValue 
  //     }].slice(-20));
  //   };
  //   return () => ws.close();
  // }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>ASL Glove Sensor Dashboard</h1>
        <p className="subtitle">Real-time Flex Sensor Monitoring</p>
      </header>
      
      <main className="App-main">
        <SensorDisplay value={currentValue} />
        <SensorGraph data={sensorHistory} />
      </main>
      
      <footer className="App-footer">
        <p>Capstone Project - Midterm Demo</p>
      </footer>
    </div>
  );
}

export default App;
