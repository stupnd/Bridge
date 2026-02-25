#include <ArduinoBLE.h>

// Randomly generated UUIDs for the service & characteristic
char* serviceUUID = "3104838b-5ed7-4e6c-ac03-7823dd9d4c7b";
char* characteristicUUID = "77283f94-81cf-4438-be8a-642fe725ccbd";

// Set up the service & characteristic
BLEService myService(serviceUUID);
BLEByteCharacteristic myChar(characteristicUUID,  BLERead | BLENotify);

void setup() {
  // Serial (for testing)
  Serial.begin(9600);

  // Set up the bluetooth device & service
  BLE.begin();
  BLE.setLocalName("MyArduinoDevice");
  BLE.setAdvertisedService(myService);
  myService.addCharacteristic(myChar);
  myChar.writeValue(0);
  BLE.addService(myService);

  // Advertise bluetooth
  BLE.advertise();
}

void loop() {
  // Listen for BLE centrals to connect
  BLEDevice central = BLE.central();

  // If a central device is connected
  if (central) {
    Serial.print("Connected to central: ");
    Serial.println(central.address());
    
    // While the central is connected
    // Dummy code for proof of concept
    int t = 0;
    while (central.connected()) {
      myChar.writeValue(++t);
      delay(200);
    }

    // When the central disconnects
    Serial.print("Disconnected from central: ");
    Serial.println(central.address());
  }
}
