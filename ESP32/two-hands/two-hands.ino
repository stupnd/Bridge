// Two ICM-20948 sensors on one ESP32 — one per hand.
//
// WIRING (both sensors share the same four wires — I2C is a bus):
//   sensor SDA  -> A4        sensor SCL  -> A5
//   sensor VIN  -> 3.3V      sensor GND  -> GND
// The ONLY difference between them is the AD0 pin, which sets the address:
//   LEFT  hand: AD0 -> GND   (address 0x68)
//   RIGHT hand: AD0 -> 3.3V  (address 0x69)
//
// Bus runs to the hands are long for I2C, so this uses 100 kHz and needs
// solid pull-ups. Wear the board center-body so each run is ~50 cm.
//
// Prints 18 tab-separated numbers per line: left  accXYZ gyrXYZ magXYZ,
// then right the same. Open two-hands.html in Chrome to see it.

#include "ICM_20948.h"
#include <Wire.h>

// How often to send a reading. 200 ms (5 lines/second) is slow enough to read
// in the Serial Monitor; drop to 20 ms (50/second) when driving two-hands.html,
// which wants the extra detail to catch quick hand movements.
const int SAMPLE_INTERVAL_MS = 200;

ICM_20948_I2C imuLeft;   // AD0 = 0 -> 0x68
ICM_20948_I2C imuRight;  // AD0 = 1 -> 0x69

bool leftOk = false, rightOk = false;

void scanI2C() {
  Serial.println("Scanning I2C bus...");
  int found = 0;
  for (uint8_t addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      Serial.print("  found device at 0x");
      Serial.print(addr, HEX);
      if (addr == 0x68) Serial.print("  <- left hand");
      if (addr == 0x69) Serial.print("  <- right hand");
      Serial.println();
      found++;
    }
  }
  if (found == 0) Serial.println("  no devices found -> check SDA/SCL/3.3V/GND wiring");
  if (found == 1) Serial.println("  only one sensor -> check the other sensor's AD0 pin");
}

// Tries to bring up each sensor. Unlike the one-sensor sketch this does NOT
// block: one hand working is better than neither, and a hand that drops out
// mid-session gets retried by the watchdog in loop().
void connectSensors() {
  imuLeft.begin(Wire, 0);
  leftOk = (imuLeft.status == ICM_20948_Stat_Ok);
  Serial.print("Left  (0x68): "); Serial.println(imuLeft.statusString());

  imuRight.begin(Wire, 1);
  rightOk = (imuRight.status == ICM_20948_Stat_Ok);
  Serial.print("Right (0x69): "); Serial.println(imuRight.statusString());
}

void setup() {
  Serial.begin(115200);
  delay(2000);
  Wire.begin();
  Wire.setClock(100000); // slower than the 400 kHz default — long wires to the hands
  Wire.setTimeOut(50);   // ms; don't hang forever if the bus locks up
  delay(500);

  scanI2C();
  connectSensors();
  Serial.println();
  Serial.println("L:accX\taccY\taccZ\tgyrX\tgyrY\tgyrZ\tmagX\tmagY\tmagZ\tR:(same 9)");
}

// Writes one sensor's nine values, or nine zeros if that hand is offline.
void printSensor(ICM_20948_I2C &imu, bool ok) {
  if (!ok) {
    for (int i = 0; i < 9; i++) Serial.print("0.0\t");
    return;
  }
  imu.getAGMT();
  Serial.print(imu.accX(), 1); Serial.print('\t');
  Serial.print(imu.accY(), 1); Serial.print('\t');
  Serial.print(imu.accZ(), 1); Serial.print('\t');
  Serial.print(imu.gyrX(), 1); Serial.print('\t');
  Serial.print(imu.gyrY(), 1); Serial.print('\t');
  Serial.print(imu.gyrZ(), 1); Serial.print('\t');
  Serial.print(imu.magX(), 1); Serial.print('\t');
  Serial.print(imu.magY(), 1); Serial.print('\t');
  Serial.print(imu.magZ(), 1); Serial.print('\t');
}

unsigned long lastRetryMs = 0;

void loop() {
  // Retry a missing hand every 2 s so a reseated wire recovers on its own.
  if ((!leftOk || !rightOk) && millis() - lastRetryMs > 2000) {
    lastRetryMs = millis();
    if (!leftOk)  { imuLeft.begin(Wire, 0);  leftOk  = (imuLeft.status  == ICM_20948_Stat_Ok); }
    if (!rightOk) { imuRight.begin(Wire, 1); rightOk = (imuRight.status == ICM_20948_Stat_Ok); }
  }

  // Sample both hands together so the pair lines up in time.
  printSensor(imuLeft, leftOk);
  printSensor(imuRight, rightOk);
  Serial.println();

  // A read that fails leaves status set; drop the hand so the retry picks it up.
  if (leftOk  && imuLeft.status  != ICM_20948_Stat_Ok) leftOk  = false;
  if (rightOk && imuRight.status != ICM_20948_Stat_Ok) rightOk = false;

  delay(SAMPLE_INTERVAL_MS);
}
