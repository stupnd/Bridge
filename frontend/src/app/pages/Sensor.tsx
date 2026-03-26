import FlexSensor from "../components/FlexSensor";

export default function Sensor() {
  return (
    <div className="max-w-4xl mx-auto p-6 pb-24 md:pb-6">
      <div className="mb-6">
        <h1 className="text-3xl mb-2">Glove Sensor</h1>
        <p className="text-gray-600">
          Connect to your ESP32 glove and watch the flex sensor values update in
          real time.
        </p>
      </div>

      <FlexSensor />
    </div>
  );
}

 