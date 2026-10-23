// Checks the I2C lines electrically, before any sensor talk happens.
//
// A powered, connected ICM-20948 breakout holds SDA and SCL HIGH through its
// pull-up resistors. So reading the pins as plain high-impedance inputs tells
// us whether anything is actually out there:
//
//   both HIGH   -> pull-ups alive: sensor is powered and wired. Problem is the
//                  chip itself (CS pin low = SPI mode, or a dead sensor).
//   both LOW    -> no pull-ups reaching the pins: sensor unpowered, GND missing,
//                  a broken wire, or the lines shorted to ground.
//   flickering  -> floating, nothing connected: broken wire or bad solder joint.
//   one of each -> that one line is broken; the other is fine.

const int SDA_PIN = A4;
const int SCL_PIN = A5;

void setup() {
  Serial.begin(115200);
  delay(2000);
  Serial.println("I2C line check — nothing is driving the bus, just reading it.");
  Serial.print("SDA is GPIO "); Serial.print(SDA_PIN);
  Serial.print(", SCL is GPIO "); Serial.println(SCL_PIN);
  Serial.println();
  pinMode(SDA_PIN, INPUT); // high-Z: let the sensor's pull-ups show themselves
  pinMode(SCL_PIN, INPUT);
}

// Samples a pin repeatedly so a floating (undriven) line shows up as flicker
// rather than a single misleading reading.
int stability(int pin) {
  int highs = 0;
  for (int i = 0; i < 100; i++) { highs += digitalRead(pin); delayMicroseconds(200); }
  return highs; // 100 = solidly high, 0 = solidly low, anything between = floating
}

void loop() {
  int sda = stability(SDA_PIN), scl = stability(SCL_PIN);

  Serial.print("SDA: "); Serial.print(describe(sda));
  Serial.print("    SCL: "); Serial.println(describe(scl));

  if (sda > 95 && scl > 95) {
    Serial.println("  -> Wiring is good, pull-ups alive. Suspect the sensor: tie its CS/NCS pin to 3.3V.");
  } else if (sda < 5 && scl < 5) {
    Serial.println("  -> Both lines dead. Check 3.3V and GND reach the sensor (look for its power LED).");
  } else if (sda < 5 || scl < 5) {
    Serial.println("  -> One line is stuck low — that wire is shorted or that solder joint failed.");
  } else {
    Serial.println("  -> Lines are floating: nothing connected. Broken wire or cold solder joint.");
  }
  Serial.println();
  delay(1000);
}

const char* describe(int highs) {
  if (highs > 95) return "HIGH (pulled up)  ";
  if (highs < 5)  return "LOW  (stuck down) ";
  return "FLOATING (nothing)";
}
