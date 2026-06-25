/**
 * SpacePoint Software Guide Platform
 * practice.js - Interactive Code Templates
 */

window.practiceTemplates = {
    // --- Intro Level Quizzes ---
    'intro_variables': {
        title: 'Variable Declaration',
        instructions: 'Declare the variables below with the correct types (int, float, bool, char) and assignments.',
        hasAddressSelector: false,
        template: `
void setup() {
  Serial.begin(115200);

  // 1. Declare an integer named 'count' with value 10
  {{INT_VAR}} count = {{INT_VAL}};

  // 2. Declare a float named 'voltage' with value 3.3
  {{FLOAT_VAR}} voltage = {{FLOAT_VAL}};

  // 3. Declare a boolean named 'isActive' with value true
  {{BOOL_VAR}} isActive = {{BOOL_VAL}};

  Serial.println("Variables initialized!");
}
`,
        answers: {
            // Permissive: match keyword/value anywhere, ignore case/symbols
            '{{INT_VAR}}': (val) => /int/i.test(val),
            '{{INT_VAL}}': (val) => val.includes('10'),
            '{{FLOAT_VAR}}': (val) => /float/i.test(val),
            '{{FLOAT_VAL}}': (val) => val.includes('3.3'),
            '{{BOOL_VAR}}': (val) => /bool/i.test(val),
            '{{BOOL_VAL}}': (val) => /true|1/i.test(val)
        },
        correctAnswers: {
             '{{INT_VAR}}': 'int',
             '{{INT_VAL}}': '10',
             '{{FLOAT_VAR}}': 'float',
             '{{FLOAT_VAL}}': '3.3',
             '{{BOOL_VAR}}': 'bool',
             '{{BOOL_VAL}}': 'true'
        },
        hints: ["Integers use 'int'.", "Decimals use 'float'.", "True/False uses 'bool'."]
    },

    'intro_loops': {
        title: 'For Loop Practice',
        instructions: 'Write a for loop that counts from 0 to 9 (10 iterations).',
        hasAddressSelector: false,
        template: `
void setup() {
  Serial.begin(115200);

  // Loop from i = 0 to i < 10
  for (int i = 0; i < {{LIMIT}}; {{INCREMENT}}) {
    Serial.println(i);
  }
}
`,
        answers: {
            // Allows '10', '10;', ' 10 ', etc.
            '{{LIMIT}}': (val) => val.includes('10'),
            // Allows 'i++', '++i', 'i+=1', 'i = i + 1'
            '{{INCREMENT}}': (val) => {
                const norm = val.replace(/\s/g, '');
                return norm.includes('i++') || norm.includes('++i') || norm.includes('i+=1') || norm.includes('i=i+1');
            }
        },
        correctAnswers: {
             '{{LIMIT}}': '10',
             '{{INCREMENT}}': 'i++'
        },
        hints: ["The condition should be i < 10.", "Increment i by 1 using i++."]
    },

    'intro_if': {
        title: 'If-Else Logic',
        instructions: 'Complete the logic to check if temperature is above 30 degrees.',
        hasAddressSelector: false,
        template: `
void checkTemp(float temp) {
  // Check if temp is greater than 30
  if (temp {{OPERATOR}} 30.0) {
    Serial.println("Too Hot!");
  } {{ELSE_KEY}} {
    Serial.println("Normal");
  }
}
`,
        answers: {
            '{{OPERATOR}}': (val) => val.includes('>'),
            '{{ELSE_KEY}}': (val) => /else/i.test(val)
        },
        correctAnswers: {
             '{{OPERATOR}}': '>',
             '{{ELSE_KEY}}': 'else'
        },
        hints: ["Greater than symbol is >.", "The opposite block is 'else'."]
    },

    'intro_functions': {
        title: 'Writing a Function',
        instructions: 'Create a function named blinkLED that takes one integer argument named "delayTime".',
        hasAddressSelector: false,
        template: `
// Define the function
void {{FUNC_NAME}}(int {{ARG_NAME}}) {
  digitalWrite(LED_BUILTIN, HIGH);
  delay({{ARG_NAME}});
  digitalWrite(LED_BUILTIN, LOW);
  delay({{ARG_NAME}});
}

void loop() {
  blinkLED(1000);
}
`,
        answers: {
            '{{FUNC_NAME}}': (val) => val.trim() === 'blinkLED',
            '{{ARG_NAME}}': (val) => val.trim() === 'delayTime'
        },
        correctAnswers: {
             '{{FUNC_NAME}}': 'blinkLED',
             '{{ARG_NAME}}': 'delayTime'
        },
        hints: ["Function name must match the call in loop().", "Argument name must match the usage directly inside."]
    },

    // --- Advanced Hardware Quizzes ---
    'temp_i2c': {
        title: 'Read TMP102 Temperature',
        instructions: 'Complete the code to initialize I2C and read temperature from the SpacePoint TMP102 (Address 0x49).',
        hasAddressSelector: true,
        addresses: ['0x48', '0x49', '0x4A', '0x4B'],
        defaultAddress: '0x49',
        template: `
#include <Wire.h>

// --- TMP102 Settings ---
uint8_t tmp102_addr = {{ADDRESS}};  // Default sensor address
#define TMP102_REG_TEMP 0x00

void setup() {
  Serial.begin(115200);
  {{WIRE_INIT}}; // SDA and SCL for ESP32
  Serial.println("Starting TMP102 temperature monitor...");
}

void loop() {
  float temperature = readTMP102Temperature();

  if (isnan(temperature)) {
    Serial.println("❌ Failed to read temperature from TMP102.");
  } else {
    Serial.print("🌡 Temperature: ");
    Serial.print(temperature);
    Serial.println(" °C");

    if (temperature > 50.0) {
      Serial.println("🔥 ALERT: High temperature!");
    }
  }

  delay(2000); // Update every 2 seconds
}

// --- TMP102 Temperature Read Function ---
float readTMP102Temperature() {
  Wire.beginTransmission(tmp102_addr);
  Wire.write(TMP102_REG_TEMP);
  if ({{END_TRANS}} != 0) return NAN;

  Wire.requestFrom(tmp102_addr, (uint8_t)2);
  if ({{AVAIL_CHECK}} < 2) return NAN;

  uint8_t msb = Wire.read();
  uint8_t lsb = Wire.read();

  // 12-bit conversion
  int16_t tempRaw = ((msb << 8) | lsb) >> 4;
  /* 
     If the 12th bit (0x800) is set, it's a negative number.
     We subtract 4096 (2^12) to handle the two's complement 
     for 12-bit numbers manually if needed, or just cast to int16_t 
     correctly after shifting (as done above for positive/standard range).
     The user's code handles it explicitly:
  */
  if (tempRaw & 0x800) tempRaw -= 4096;

  return tempRaw * 0.0625;
}
`,
        answers: {
            '{{ADDRESS}}': (val, ctx) => val.trim() === ctx.address,
            '{{WIRE_INIT}}': (val) => val.replace(/\s/g,'').includes('Wire.begin(21,22)'),
            '{{END_TRANS}}': (val) => val.includes('Wire.endTransmission(false)'),
            '{{AVAIL_CHECK}}': (val) => val.includes('Wire.available()')
        },
        correctAnswers: {
             '{{ADDRESS}}': (ctx) => ctx.address,
             '{{WIRE_INIT}}': 'Wire.begin(21, 22)',
             '{{END_TRANS}}': 'Wire.endTransmission(false)',
             '{{AVAIL_CHECK}}': 'Wire.available()'
        },
        hints: [
            "Use Wire.begin(21, 22) for ESP32 specific pins.",
            "Use Wire.endTransmission(false) for repeated start.",
            "Check Wire.available() return value."
        ]
    },
    
    'fram_i2c': {
        title: 'Read/Write FRAM',
        instructions: 'Complete the code to write 0x42 to address 0x0000 and read it back. FRAM configured at 0x50.',
        hasAddressSelector: true,
        addresses: ['0x50', '0x51', '0x52', '0x53'],
        defaultAddress: '0x50',
        template: `
#include <Wire.h>

#define FRAM_I2C_ADDR {{ADDRESS}}

void framWrite8(uint16_t memAddr, uint8_t value) {
  Wire.beginTransmission(FRAM_I2C_ADDR);
  Wire.write((uint8_t)({{WRITE_MEM_ADDR}}));     // high byte
  Wire.write((uint8_t)(memAddr & 0xFF));   // low byte
  Wire.write(value);
  Wire.endTransmission();
}

uint8_t framRead8(uint16_t memAddr) {
  Wire.beginTransmission(FRAM_I2C_ADDR);
  Wire.write((uint8_t)({{READ_MEM_ADDR}}));
  Wire.write((uint8_t)(memAddr & 0xFF));
  Wire.endTransmission(false);

  Wire.requestFrom(FRAM_I2C_ADDR, (uint8_t)1);
  if (!Wire.available()) return 0xFF;
  return Wire.read();
}

void setup() {
  Serial.begin(115200);
  {{WIRE_INIT}};  // SDA, SCL
  Serial.println("Starting I2C FRAM test...");

  framWrite8(0x0000, 0x42);  // write test byte
}

void loop() {
  uint8_t value = framRead8(0x0000);
  Serial.print("FRAM[0x0000] = 0x");
  Serial.println(value, HEX);
  delay(2000);
}
`,
        answers: {
            '{{ADDRESS}}': (val, ctx) => val.trim() === ctx.address,
            '{{WIRE_INIT}}': (val) => val.replace(/\s/g,'').includes('Wire.begin(21,22)'),
            '{{WRITE_MEM_ADDR}}': (val) => val.includes('memAddr >> 8'),
            '{{READ_MEM_ADDR}}': (val) => val.includes('memAddr >> 8')
        },
        correctAnswers: {
            '{{ADDRESS}}': (ctx) => ctx.address,
            '{{WIRE_INIT}}': 'Wire.begin(21, 22)',
            '{{WRITE_MEM_ADDR}}': 'memAddr >> 8',
            '{{READ_MEM_ADDR}}': 'memAddr >> 8'
        },
        hints: [
            "Shift the 16-bit address right by 8 to get the high byte.",
            "Use Wire.begin(21, 22) for standard pins."
        ]
    },

    'current_i2c': {
        title: 'Read Current (INA219)',
        instructions: 'Complete the code to initialize the INA219 sensor and read current/voltage. Address is 0x40.',
        hasAddressSelector: true,
        addresses: ['0x40', '0x41', '0x44', '0x45'],
        defaultAddress: '0x40',
        template: `
#include <Wire.h>
#include <Adafruit_INA219.h>

#define INA219_I2C_ADDR {{ADDRESS}}

Adafruit_INA219 ina219(INA219_I2C_ADDR);

void setup() {
  Serial.begin(115200);
  {{WIRE_INIT}};  // SDA, SCL
  Serial.println("Starting INA219 current sensor...");

  if (!{{INIT_FUNC}}) {
    Serial.println("Failed to find INA219 chip");
    while (1) { delay(10); }
  }
}

void loop() {
  float busVoltage = ina219.getBusVoltage_V();  // V
  float current_mA = ina219.getCurrent_mA();    // mA

  Serial.print("Bus Voltage: ");
  Serial.print(busVoltage);
  Serial.println(" V");

  Serial.print("Current: ");
  Serial.print(current_mA);
  Serial.println(" mA");

  if (current_mA > 500.0) {
    Serial.println("⚠ HIGH CURRENT on CDHS line!");
  }

  Serial.println("------------------------");
  delay(2000);
}
`,
        answers: {
             '{{ADDRESS}}': (val, ctx) => val.trim() === ctx.address,
             '{{WIRE_INIT}}': (val) => val.replace(/\s/g,'').includes('Wire.begin(21,22)'),
             '{{INIT_FUNC}}': (val) => val.includes('ina219.begin()')
        },
        correctAnswers: {
            '{{ADDRESS}}': (ctx) => ctx.address,
            '{{WIRE_INIT}}': 'Wire.begin(21, 22)',
            '{{INIT_FUNC}}': 'ina219.begin()'
        },
        hints: [
            "Use Wire.begin(21, 22) for standard ESP32 pins.",
            "The library init function is typically begin()."
        ]
    },

    'motor_pwm': {
        title: 'ESP32 Motor PWM (LEDC)',
        instructions: 'Configure PWM for a motor pin using ESP32 LEDC peripherals.',
        hasAddressSelector: false,
        template: `
const int motorPin = 16;
const int pwmChannel = 0;
const int freq = 5000;
const int resolution = 8; // 8-bit (0-255)

void setup() {
  // 1. Setup PWM channel
  {{SETUP_FUNC}}(pwmChannel, freq, resolution);
  
  // 2. Attach pin to channel
  {{ATTACH_FUNC}}(motorPin, pwmChannel);
}

void setSpeed(int dutyCycle) {
  // Write duty cycle to channel
  ledcWrite(pwmChannel, dutyCycle);
}
`,
        answers: {
            '{{SETUP_FUNC}}': (val) => val.includes('ledcSetup'),
            '{{ATTACH_FUNC}}': (val) => val.includes('ledcAttachPin')
        },
        correctAnswers: {
            '{{SETUP_FUNC}}': 'ledcSetup',
            '{{ATTACH_FUNC}}': 'ledcAttachPin'
        },
        hints: ["Use ledcSetup for configuration.", "Use ledcAttachPin to connect GPIO."]
    },

    'mpu_i2c': {
        title: 'MPU6050 Initialization',
        instructions: 'Initialize the MPU6050 using the Adafruit library.',
        hasAddressSelector: false,
        template: `
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <Wire.h>

Adafruit_MPU6050 mpu;

void setup() {
  Serial.begin(115200);

  // Try to initialize!
  if (!{{INIT_CALL}}) {
    Serial.println("Failed to find MPU6050 chip");
    while (1) { delay(10); }
  }
  
  Serial.println("MPU6050 Found!");
  
  // Set accelerometer range to +-8G
  mpu.setAccelerometerRange({{RANGE_CONST}});
}
`,
        answers: {
            '{{INIT_CALL}}': (val) => val.includes('mpu.begin'),
            '{{RANGE_CONST}}': (val) => val.includes('MPU6050_RANGE_8_G')
        },
        correctAnswers: {
            '{{INIT_CALL}}': 'mpu.begin()',
            '{{RANGE_CONST}}': 'MPU6050_RANGE_8_G'
        },
        hints: ["Standard library begin method.", "Look for the 8_G constant."]
    }
};
