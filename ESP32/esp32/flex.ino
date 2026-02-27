#include <ArduinoBLE.h>

BLEService flexService("180C");
BLEIntCharacteristic flexCharacteristic("2A56", BLERead | BLENotify);

void setup() {
  Serial.begin(9600);
  
  if (!BLE.begin()) {
    Serial.println("BLE failed!");
    while (1);
  }

  BLE.setLocalName("FlexSensor");
  BLE.setAdvertisedService(flexService);
  flexService.addCharacteristic(flexCharacteristic);
  BLE.addService(flexService);
  BLE.advertise();

  Serial.println("BLE ready!");
}

void loop() {
  BLE.poll();
  
  int flexValue = analogRead(A0);
  flexCharacteristic.writeValue(flexValue);
  Serial.println(flexValue);
  delay(100);
}