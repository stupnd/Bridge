#include <ArduinoBLE.h>

char* serviceUUID = "3104838b-5ed7-4e6c-ac03-7823dd9d4c7b";
char* characteristicUUID = "77283f94-81cf-4438-be8a-642fe725ccbd";

void setup() {
  // put your setup code here, to run once:
  Serial.begin(9600);

  BLEService myService(serviceUUID);
  BLEByteCharacteristic myChar(characteristicUUID,  BLERead | BLENotify);

  BLE.begin();
  BLE.setLocalName("MyArduinoDevice");
  BLE.setAdvertisedService(myService);
  myService.addCharacteristic(myChar);
  BLE.addService(myService);

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
    while (central.connected()) {
      
    }

    // When the central disconnects
    Serial.print("Disconnected from central: ");
    Serial.println(central.address());
  }
}
