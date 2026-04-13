#include <ArduinoBLE.h>
#include <Wire.h>

typedef union {
  struct __attribute__((packed)) {
    float accX, accY, accZ, gyrX, gyrY, gyrZ, magX, magY, magZ;
    int32_t finger1, finger2, finger3, finger4, finger5;
  };
  uint8_t bytes[sizeof(float)*9 + sizeof(int32_t)*5];
} SensorData;

char* serviceUUID = "3104838b-5ed7-4e6c-ac03-7823dd9d4c7b";
char* characteristicUUID = "77283f94-81cf-4438-be8a-642fe725ccbd";

BLEService myService(serviceUUID);
BLECharacteristic myChar(characteristicUUID, BLERead | BLENotify, sizeof(SensorData));

// ICM_20948_I2C myICM; // 9-axis sensor commented out

void setup() {
  Serial.begin(9600);
  delay(2000);

  // Wire.begin(); // commented out — not needed without IMU
  
  // IMU init commented out:
  // bool icm_init = false;
  // while (!icm_init) {
  //   myICM.begin(Wire, 0);
  //   Serial.print("Status: ");
  //   Serial.println(myICM.statusString());
  //   if (myICM.status == ICM_20948_Stat_Ok) {
  //     icm_init = true;
  //     Serial.println("ICM-20948 connected!");
  //   } else {
  //     delay(500);
  //   }
  // }

  BLE.begin();
  BLE.setLocalName("MyArduinoDevice");
  BLE.setAdvertisedService(myService);
  myService.addCharacteristic(myChar);
  BLE.addService(myService);
  BLE.advertise();
  Serial.println("BLE advertising!");
}

void loop() {
  int f1 = analogRead(A0);
  int f2 = analogRead(A1);
  int f3 = analogRead(A2);
  int f4 = analogRead(A3);
  int f5 = analogRead(A4);

  Serial.print("F1: "); Serial.print(f1);
  Serial.print(" F2: "); Serial.print(f2);
  Serial.print(" F3: "); Serial.print(f3);
  Serial.print(" F4: "); Serial.print(f4);
  Serial.print(" F5: "); Serial.println(f5);

  BLEDevice central = BLE.central();
  if (central) {
    Serial.print("Connected to central: ");
    Serial.println(central.address());
    while (central.connected()) {
      SensorData data;

      // IMU values zeroed out since sensor is disconnected:
      data.accX = 0; data.accY = 0; data.accZ = 0;
      data.gyrX = 0; data.gyrY = 0; data.gyrZ = 0;
      data.magX = 0; data.magY = 0; data.magZ = 0;

      data.finger1 = analogRead(A0);
      data.finger2 = analogRead(A1);
      data.finger3 = analogRead(A2);
      data.finger4 = analogRead(A3);
      data.finger5 = analogRead(A4);

      Serial.print("F1: "); Serial.print(data.finger1);
      Serial.print(" F2: "); Serial.print(data.finger2);
      Serial.print(" F3: "); Serial.print(data.finger3);
      Serial.print(" F4: "); Serial.print(data.finger4);
      Serial.print(" F5: "); Serial.println(data.finger5);

      myChar.writeValue(data.bytes, sizeof(data.bytes));
      delay(250);
    }
    Serial.print("Disconnected from central: ");
    Serial.println(central.address());
  }
  delay(250);
}
