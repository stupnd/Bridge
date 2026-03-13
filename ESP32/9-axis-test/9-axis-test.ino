#include "ICM_20948.h"
#include <Wire.h>

ICM_20948_I2C myICM;

void setup() {
  Serial.begin(115200);
  delay(2000); // wait for sensor to fully power up
  Wire.begin();
  delay(500);

  bool initialized = false;
  while (!initialized) {
    myICM.begin(Wire, 0);
    Serial.print("Status: ");
    Serial.println(myICM.statusString());
    
    if (myICM.status == ICM_20948_Stat_Ok) {
      initialized = true;
      Serial.println("ICM-20948 connected!");
    } else {
      delay(500);
    }
  }
}

void loop() {
  if (myICM.dataReady()) {
    myICM.getAGMT();

    Serial.print("Accel (mg): ");
    Serial.print(myICM.accX()); Serial.print(", ");
    Serial.print(myICM.accY()); Serial.print(", ");
    Serial.println(myICM.accZ());

    Serial.print("Gyro (DPS): ");
    Serial.print(myICM.gyrX()); Serial.print(", ");
    Serial.print(myICM.gyrY()); Serial.print(", ");
    Serial.println(myICM.gyrZ());

    Serial.print("Mag (uT): ");
    Serial.print(myICM.magX()); Serial.print(", ");
    Serial.print(myICM.magY()); Serial.print(", ");
    Serial.println(myICM.magZ());

    Serial.println("---");
    delay(100);
  }
}