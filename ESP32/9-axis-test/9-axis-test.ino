// ICM-20948 9-axis sensor test.
// Requires the "SparkFun 9DoF IMU Breakout - ICM 20948" library
// (Tools > Manage Libraries, search "ICM 20948").
// Open Serial Monitor at 115200 baud to see values.

#include "ICM_20948.h"
#include <Wire.h>

ICM_20948_I2C myICM;

// Prints every I2C device found so wiring problems are obvious.
// The ICM-20948 shows up at 0x68 (AD0 low) or 0x69 (AD0 high).
void scanI2C() {
  Serial.println("Scanning I2C bus...");
  int found = 0;
  for (uint8_t addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      Serial.print("  found device at 0x");
      Serial.println(addr, HEX);
      found++;
    }
  }
  if (found == 0) Serial.println("  no devices found -> check SDA/SCL/3.3V/GND wiring");
}

// Blocks until the sensor responds. Tries both possible addresses:
// SparkFun breakouts default to AD0=1 (0x69), most generic ones to AD0=0 (0x68).
void connectSensor() {
  bool initialized = false;
  while (!initialized) {
    for (uint8_t ad0 = 0; ad0 <= 1 && !initialized; ad0++) {
      myICM.begin(Wire, ad0);
      Serial.print("Trying AD0=");
      Serial.print(ad0);
      Serial.print(" -> ");
      Serial.println(myICM.statusString());
      if (myICM.status == ICM_20948_Stat_Ok) {
        initialized = true;
        Serial.println("ICM-20948 connected!");
      }
    }
    if (!initialized) delay(1000);
  }
}

void setup() {
  Serial.begin(115200);
  delay(2000); // wait for sensor to fully power up
  Wire.begin();
  Wire.setClock(400000);
  Wire.setTimeOut(50); // ms; don't hang forever if the bus locks up
  delay(500);

  scanI2C();

  connectSensor();

  printHeader();
}

void printHeader() {
  Serial.println();
  Serial.println("accX\taccY\taccZ\t|\tgyrX\tgyrY\tgyrZ\t|\tmagX\tmagY\tmagZ");
  Serial.println("(mg)\t\t\t|\t(dps)\t\t\t|\t(uT)");
}

// Prints a float right-padded so columns line up in Serial Monitor.
void printCol(float v) {
  Serial.print(v, 1);
  Serial.print('\t');
}

unsigned long lastSampleMs = 0;

void loop() {
  // If the sensor goes quiet (loose wire, I2C bus lock-up), say so and reconnect
  // instead of silently printing nothing.
  if (millis() - lastSampleMs > 2000) {
    Serial.print("No data for 2s. Sensor status: ");
    Serial.println(myICM.statusString());
    scanI2C();
    connectSensor();
    printHeader();
    lastSampleMs = millis();
  }

  if (myICM.dataReady()) {
    lastSampleMs = millis();
    myICM.getAGMT(); // read accel, gyro, mag, temp

    printCol(myICM.accX()); printCol(myICM.accY()); printCol(myICM.accZ());
    Serial.print("|\t");
    printCol(myICM.gyrX()); printCol(myICM.gyrY()); printCol(myICM.gyrZ());
    Serial.print("|\t");
    printCol(myICM.magX()); printCol(myICM.magY()); printCol(myICM.magZ());
    Serial.println();

    delay(20); // ~50 Hz — fast enough to catch quick hand movements
  }
}
