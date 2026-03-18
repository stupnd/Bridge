#include <ArduinoBLE.h>
#include "ICM_20948.h"
#include <Wire.h>

// Define a data structure for transmission
typedef union {
  struct __attribute__((packed)) {
    float accX, accY, accZ, gyrX, gyrY, gyrZ, magX, magY, magZ;
    int32_t finger1, finger2, finger3, finger4, finger5;
  };
  uint8_t bytes[sizeof(float)*9 + sizeof(int32_t)*5];
} SensorData;

// Randomly generated UUIDs for the service & characteristic
char* serviceUUID = "3104838b-5ed7-4e6c-ac03-7823dd9d4c7b";
char* characteristicUUID = "77283f94-81cf-4438-be8a-642fe725ccbd";

// Set up the service & characteristic
BLEService myService(serviceUUID);
BLECharacteristic  myChar(characteristicUUID,  BLERead | BLENotify, sizeof(SensorData));

// 9-axis sensor
ICM_20948_I2C myICM;

void setup() {
  // Serial (for testing)
  Serial.begin(9600);
  delay(2000);

  // Set up I2C
  Wire.begin();

  // init the 9-axis sensor
  bool icm_init = false;
  while (!icm_init) {
    myICM.begin(Wire, 0);
    Serial.print("Status: ");
    Serial.println(myICM.statusString());

    if (myICM.status == ICM_20948_Stat_Ok) {
      icm_init = true;
      Serial.println("ICM-20948 connected!");
    } else {
      delay(500);
    }
  }

  // Set up the bluetooth device & service
  BLE.begin();
  BLE.setLocalName("MyArduinoDevice");
  BLE.setAdvertisedService(myService);
  myService.addCharacteristic(myChar);
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
    while (central.connected()) {
      if (myICM.dataReady()) {
        // Update 9-axis sensor the data
        myICM.getAGMT();

        SensorData data;

        data.accX = myICM.accX();
        data.accY = myICM.accY();
        data.accZ = myICM.accZ();

        data.gyrX = myICM.gyrX();
        data.gyrY = myICM.gyrY();
        data.gyrZ = myICM.gyrZ();

        data.magX = myICM.magX();
        data.magY = myICM.magY();
        data.magZ = myICM.magZ();

        // Update the flex sensor data
        data.finger1 = analogRead(A0);
        data.finger2 = 0;
        data.finger3 = 0;
        data.finger4 = 0;
        data.finger5 = 0;

        myChar.writeValue(data.bytes, sizeof(data.bytes));
      }
      // Repeat every 250 ms
      delay(250);
    }

    // When the central disconnects
    Serial.print("Disconnected from central: ");
    Serial.println(central.address());
  }
}
