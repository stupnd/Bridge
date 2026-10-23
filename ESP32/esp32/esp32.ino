// Glove firmware: 5 flex sensors + ICM-20948 9-axis sensor, streamed over BLE.
// Requires the "ArduinoBLE" and "SparkFun 9DoF IMU Breakout - ICM 20948" libraries.
//
// WIRING
//   flex sensors -> A0, A1, A2, A3 (thumb..ring) and D2 (pinky)
//   ICM-20948    -> SDA = A4, SCL = A5, VIN = 3.3V, GND = GND
// The pinky is on D2 because A4-A7 are on the ESP32-S3's ADC2, which reads
// noisy while the Bluetooth radio is on. A0-A3 and D2 are all on ADC1.
//
// Each BLE notification is 56 bytes, little-endian:
//   9 floats  accX..Z (mg), gyrX..Z (dps), magX..Z (uT)
//   5 int32   finger1..finger5 (raw analogRead)
// If the 9-axis sensor isn't found, its values are sent as 0 and the flex
// sensors keep working.

#include <ArduinoBLE.h>
#include <Wire.h>
#include "ICM_20948.h"

const int FINGER_PINS[5] = {A0, A1, A2, A3, D2};
const int SAMPLE_INTERVAL_MS = 20; // ~50 Hz — fast enough to catch quick hand movements

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

ICM_20948_I2C myICM;
bool imuOk = false;
unsigned long lastImuAttemptMs = 0;
int imuFailures = 0;
const int MAX_IMU_FAILURES = 10; // ~0.2 s of failed reads while streaming

// Tries both possible addresses once: SparkFun breakouts default to AD0=1
// (0x69), most generic ones to AD0=0 (0x68). Doesn't block, so the flex
// sensors still stream if the 9-axis sensor is missing.
void tryConnectImu() {
  lastImuAttemptMs = millis();
  for (uint8_t ad0 = 0; ad0 <= 1; ad0++) {
    myICM.begin(Wire, ad0);
    if (myICM.status == ICM_20948_Stat_Ok) {
      imuOk = true;
      imuFailures = 0;
      Serial.print("ICM-20948 connected at AD0=");
      Serial.println(ad0);
      return;
    }
  }
  Serial.print("ICM-20948 not found (");
  Serial.print(myICM.statusString());
  Serial.println("), sending zeros. Will retry.");
}

void readSensors(SensorData &data) {
  // Read every time rather than waiting on dataReady(): that flag can stay
  // false forever after a bus glitch, which used to freeze the 9-axis at 0.
  bool got = false;
  if (imuOk) {
    myICM.getAGMT();
    got = myICM.status == ICM_20948_Stat_Ok;
    if (got) {
      imuFailures = 0;
    } else if (++imuFailures >= MAX_IMU_FAILURES) {
      // Sensor stopped answering (usually a loose wire): reconnect from loop().
      imuOk = false;
      Serial.print("ICM-20948 stopped responding (");
      Serial.print(myICM.statusString());
      Serial.println("), reconnecting.");
    }
  }
  if (got) {
    data.accX = myICM.accX(); data.accY = myICM.accY(); data.accZ = myICM.accZ();
    data.gyrX = myICM.gyrX(); data.gyrY = myICM.gyrY(); data.gyrZ = myICM.gyrZ();
    data.magX = myICM.magX(); data.magY = myICM.magY(); data.magZ = myICM.magZ();
  } else {
    data.accX = 0; data.accY = 0; data.accZ = 0;
    data.gyrX = 0; data.gyrY = 0; data.gyrZ = 0;
    data.magX = 0; data.magY = 0; data.magZ = 0;
  }

  data.finger1 = analogRead(FINGER_PINS[0]);
  data.finger2 = analogRead(FINGER_PINS[1]);
  data.finger3 = analogRead(FINGER_PINS[2]);
  data.finger4 = analogRead(FINGER_PINS[3]);
  data.finger5 = analogRead(FINGER_PINS[4]);
}

// Prints one labeled line, e.g. "thumb:1234 index:... accX:12 ...".
// The "name:value" format also works in Tools > Serial Plotter.
void printSensors(const SensorData &data) {
  Serial.print("thumb:");  Serial.print(data.finger1);
  Serial.print(" index:"); Serial.print(data.finger2);
  Serial.print(" middle:"); Serial.print(data.finger3);
  Serial.print(" ring:");  Serial.print(data.finger4);
  Serial.print(" pinky:"); Serial.print(data.finger5);
  Serial.print(" accX:"); Serial.print(data.accX, 0);
  Serial.print(" accY:"); Serial.print(data.accY, 0);
  Serial.print(" accZ:"); Serial.print(data.accZ, 0);
  Serial.print(" gyrX:"); Serial.print(data.gyrX, 1);
  Serial.print(" gyrY:"); Serial.print(data.gyrY, 1);
  Serial.print(" gyrZ:"); Serial.print(data.gyrZ, 1);
  Serial.print(" magX:"); Serial.print(data.magX, 1);
  Serial.print(" magY:"); Serial.print(data.magY, 1);
  Serial.print(" magZ:"); Serial.println(data.magZ, 1);
}

void setup() {
  Serial.begin(115200); // set the Serial Monitor to 115200 baud
  // The ESP32-S3's USB serial drops anything printed before the monitor
  // opens, so wait up to 3 s for it (doubles as sensor power-up time).
  unsigned long t0 = millis();
  while (!Serial && millis() - t0 < 3000) delay(10);
  delay(500);
  Serial.println("Glove firmware starting...");

  Wire.begin();
  Wire.setClock(100000); // standard speed; more forgiving of long glove wires
  Wire.setTimeOut(50); // ms; don't hang forever if the bus locks up
  tryConnectImu();

  if (!BLE.begin()) Serial.println("BLE.begin() failed!");
  BLE.setLocalName("MyArduinoDevice");
  // Ask for a 15-30 ms connection interval (units of 1.25 ms) so packets go
  // out as they're made instead of queuing. 15 ms is the floor macOS/iOS allow.
  BLE.setConnectionInterval(12, 24);
  BLE.setAdvertisedService(myService);
  myService.addCharacteristic(myChar);
  BLE.addService(myService);
  BLE.advertise();
  Serial.println("BLE advertising!");
}

void loop() {
  if (!imuOk && millis() - lastImuAttemptMs > 5000) tryConnectImu();

  SensorData data;
  readSensors(data);

  BLEDevice central = BLE.central();
  if (central) {
    Serial.print("Connected to central: ");
    Serial.println(central.address());
    int n = 0;
    while (central.connected()) {
      if (!imuOk && millis() - lastImuAttemptMs > 5000) tryConnectImu();
      readSensors(data);
      myChar.writeValue(data.bytes, sizeof(data.bytes));
      // Printing every sample at 50 Hz floods the Serial Monitor; 5 lines/s is readable.
      if (++n % 10 == 0) printSensors(data);
      delay(SAMPLE_INTERVAL_MS);
    }
    Serial.print("Disconnected from central: ");
    Serial.println(central.address());
  } else {
    printSensors(data);
    delay(250);
  }
}
