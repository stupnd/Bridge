# ASL Glove Sensor Dashboard

A real-time sensor monitoring dashboard for an ASL (American Sign Language) glove capstone project. This application displays live flex sensor data with a numeric display and an updating line graph.

## Features

- **Real-time Sensor Display**: Large, color-coded numeric display of current flex sensor value (0-1023 range)
- **Live Graph**: Scrolling line chart showing the last 20 sensor readings
- **Clean UI**: Simple, responsive design focused on data visualization
- **Simulated Data**: Currently uses simulated sensor data for development and testing

## Project Structure

```
src/
├── App.js                    # Main application component, manages data flow
├── App.css                   # Main application styles
├── index.js                  # Application entry point
├── index.css                 # Global styles
└── components/
    ├── SensorDisplay.js      # Numeric sensor value display component
    ├── SensorDisplay.css     # SensorDisplay styles
    ├── SensorGraph.js        # Line graph component for historical data
    └── SensorGraph.css       # SensorGraph styles
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

The application will automatically reload when you make changes to the code.

## Current Implementation

The application currently **simulates sensor data** using a timer that generates new values every 500ms. This simulated data:
- Ranges from 0 to 1023 (typical analog sensor range)
- Has smooth transitions (small variations from previous value)
- Updates the display and graph in real-time

## Future Integration with Raspberry Pi

The code is structured to easily integrate with real sensor data from a Raspberry Pi backend. Two recommended approaches:

### Option 1: WebSocket (Recommended for Real-time)

Replace the simulation in `App.js` with a WebSocket connection:

```javascript
useEffect(() => {
  const ws = new WebSocket('ws://raspberry-pi-ip:port');
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    setCurrentValue(data.flexSensorValue);
    setSensorHistory(prev => [...prev, { 
      timestamp: Date.now(), 
      value: data.flexSensorValue 
    }]);
  };
  
  return () => ws.close();
}, []);
```

### Option 2: HTTP Polling (Simpler Alternative)

Replace the simulation with periodic HTTP requests:

```javascript
useEffect(() => {
  const fetchSensorData = async () => {
    const response = await fetch('http://raspberry-pi-ip:port/sensor');
    const data = await response.json();
    setCurrentValue(data.flexSensorValue);
    setSensorHistory(prev => [...prev, { 
      timestamp: Date.now(), 
      value: data.flexSensorValue 
    }]);
  };
  
  const interval = setInterval(fetchSensorData, 500);
  return () => clearInterval(interval);
}, []);
```

## Components Overview

### App.js
- Main application container
- Manages sensor data state (`currentValue` and `sensorHistory`)
- Contains data simulation logic (to be replaced with real integration)
- Orchestrates data flow to child components

### SensorDisplay.js
- Displays current sensor value in large, readable format
- Color-coded indicator based on value range:
  - Green (0-340): Low flex
  - Orange (341-681): Medium flex
  - Red (682-1023): High flex
- Shows percentage and live status indicator

### SensorGraph.js
- Renders real-time line chart using Recharts library
- Displays last 20 readings with auto-scrolling
- Includes interactive tooltip for detailed information
- X-axis shows reading number, Y-axis shows sensor value (0-1023)

## Technologies Used

- **React 18**: Core framework
- **Recharts**: Chart library for data visualization
- **React Hooks**: useState and useEffect for state management
- **Create React App**: Development environment and build tooling

## Deployment

To create a production build:

```bash
npm run build
```

This creates an optimized build in the `build/` folder, ready for deployment to any static hosting service.

## Development Notes

- All TODO comments in the code indicate where real sensor integration should be implemented
- The simulated data generator can be found in `App.js` (`simulateSensorData` function)
- Graph keeps only the last 20 readings for performance
- Values are clamped to 0-1023 range (standard for 10-bit analog sensors)

## License

This is a capstone project for educational purposes.
