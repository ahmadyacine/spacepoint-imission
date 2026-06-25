/**
 * SpacePoint Software Guide Platform
 * data/cdhs.js - CDHS Lessons & Resources
 */

window.spacePointData.categories.push({
    id: 'cdhs',
    title: 'CDHS',
    description: 'Command & Data Handling System sensors.',
    icon: 'hard-drive',
    timeEstimate: '2 hours',
    color: 'from-red-500 to-orange-500',
    lessons: [
        { 
            id: 'temp-sensors', 
            title: 'TEMP Sensors (TMP102)', 
            time: '30 min',
            hasPractice: true,
            practiceType: 'temp_i2c',
            content: `
                <div class="flex items-center gap-3 mb-4">
                    <span class="text-4xl">🌡</span>
                    <div>
                        <h3 class="text-xl font-bold">TMP102 Training</h3>
                        <p class="text-purple-300 text-sm">Address 0x49 • I²C</p>
                    </div>
                </div>

                <p class="mb-4 leading-relaxed">TMP102 is a digital temperature sensor that uses the I²C protocol. On your SpacePoint CDHS board:</p>
                
                <div class="bg-gray-800/50 p-4 rounded-lg border-l-4 border-blue-500 mb-6 font-mono text-sm">
                    <p>Sensor address used on our board: <strong>0x49</strong></p>
                    <p>ESP32 I²C pins: <strong>SDA = 21, SCL = 22</strong></p>
                    <p>Temperature register: <strong>0x00</strong></p>
                </div>

                <p class="mb-4">The TMP102 can have different addresses depending on how its ADD0 pin is connected. Convert each binary address to hex, then choose which address the SpacePoint board uses.</p>

                <div class="bg-black/30 p-4 rounded-lg border border-purple-500/30 mb-6">
                    <h4 class="font-bold text-purple-300 mb-3 text-sm uppercase tracking-wide">Exercise – TMP102 Addresses</h4>
                    <p class="text-xs text-gray-400 mb-4">Complete the hex column for each configuration, then select which one matches the SpacePoint CDHS board in the practice section below.</p>
                    
                    <table class="w-full text-sm text-left">
                        <thead class="text-gray-500 border-b border-gray-700">
                            <tr>
                                <th class="pb-2">ADD0 Pin</th>
                                <th class="pb-2">Binary Address</th>
                                <th class="pb-2">Hex</th>
                            </tr>
                        </thead>
                        <tbody class="text-gray-300">
                            <tr class="border-b border-gray-800">
                                <td class="py-2">GND</td>
                                <td>1001000</td>
                                <td>0x48</td>
                            </tr>
                            <tr class="border-b border-gray-800 bg-purple-900/10">
                                <td class="py-2">V+</td>
                                <td>1001001</td>
                                <td><strong>0x49</strong> (SpacePoint)</td>
                            </tr>
                            <tr class="border-b border-gray-800">
                                <td class="py-2">SDA</td>
                                <td>1001010</td>
                                <td>0x4A</td>
                            </tr>
                            <tr>
                                <td class="py-2">SCL</td>
                                <td>1001011</td>
                                <td>0x4B</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            ` 
        },
        { 
            id: 'fram', 
            title: 'FRAM Memory', 
            time: '35 min',
            hasPractice: true,
            practiceType: 'fram_i2c',
            content: `
                <div class="flex items-center gap-3 mb-4">
                    <span class="text-4xl">💾</span>
                    <div>
                        <h3 class="text-xl font-bold">FRAM Training</h3>
                        <p class="text-purple-300 text-sm">Address 0x50 • I²C</p>
                    </div>
                </div>

                <p class="mb-4">FRAM (Ferroelectric RAM) is a non-volatile memory. It keeps data even when power is off and can handle many more write cycles than EEPROM.</p>

                <div class="bg-gray-800/50 p-4 rounded-lg border-l-4 border-green-500 mb-6 font-mono text-sm">
                    <p>FRAM I²C base address used on our SpacePoint CDHS board: <strong>0x50</strong></p>
                    <p>ESP32 I²C pins: <strong>SDA = 21, SCL = 22</strong></p>
                    <p>We will read/write at memory location: <strong>0x0000</strong></p>
                </div>

                <p class="mb-4">First, you will practice converting the FRAM I²C address from binary to hex for different configurations, then select which address the SpacePoint board uses.</p>

                <div class="bg-black/30 p-4 rounded-lg border border-purple-500/30 mb-6">
                    <h4 class="font-bold text-purple-300 mb-3 text-sm uppercase tracking-wide">Exercise – FRAM Addresses</h4>
                    <p class="text-xs text-gray-400 mb-4">Complete the hex column for each configuration, then choose which one matches the SpacePoint CDHS board (FRAM at 0x50).</p>
                        <table class="w-full text-sm text-left">
                        <thead class="text-gray-500 border-b border-gray-700">
                            <tr>
                                <th class="pb-2">A0 / A1 / A2</th>
                                <th class="pb-2">Binary Address</th>
                                <th class="pb-2">Hex</th>
                            </tr>
                        </thead>
                        <tbody class="text-gray-300">
                            <tr class="border-b border-gray-800 bg-purple-900/10">
                                <td class="py-2">GND / GND / GND</td>
                                <td>1010000</td>
                                <td><strong>0x50</strong> (SpacePoint)</td>
                            </tr>
                            <tr class="border-b border-gray-800">
                                <td class="py-2">V+ / GND / GND</td>
                                <td>1010001</td>
                                <td>0x51</td>
                            </tr>
                            <tr class="border-b border-gray-800">
                                <td class="py-2">GND / V+ / GND</td>
                                <td>1010010</td>
                                <td>0x52</td>
                            </tr>
                            <tr>
                                <td class="py-2">V+ / V+ / GND</td>
                                <td>1010011</td>
                                <td>0x53</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            ` 
        },
        { 
            id: 'current', 
            title: 'Current Sensors (INA219)', 
            time: '30 min',
            hasPractice: true,
            practiceType: 'current_i2c',
            content: `
                <div class="flex items-center gap-3 mb-4">
                    <span class="text-4xl">⚡</span>
                    <div>
                        <h3 class="text-xl font-bold">INA219 Training</h3>
                        <p class="text-purple-300 text-sm">Address 0x40 • I²C</p>
                    </div>
                </div>
                
                <p class="mb-4">INA219 is a current & voltage sensor. It measures:</p>
                <ul class="list-disc list-inside mb-4 text-gray-300 text-sm ml-2">
                    <li>Bus voltage (voltage on your power line)</li>
                    <li>Shunt voltage (voltage on the resistor)</li>
                    <li>Current in mA</li>
                </ul>

                <div class="bg-gray-800/50 p-4 rounded-lg border-l-4 border-yellow-500 mb-6 font-mono text-sm">
                    <p>INA219 I²C base address used on our SpacePoint CDHS board: <strong>0x40</strong></p>
                    <p>ESP32 I²C pins: <strong>SDA = 21, SCL = 22</strong></p>
                </div>

                <p class="mb-4">First, you will practice converting possible INA219 addresses from binary to hex, and then select which address is actually used on the SpacePoint board.</p>

                <div class="bg-black/30 p-4 rounded-lg border border-purple-500/30 mb-6">
                    <h4 class="font-bold text-purple-300 mb-3 text-sm uppercase tracking-wide">Exercise – INA219 Addresses</h4>
                    <p class="text-xs text-gray-400 mb-4">Complete the hex column for each configuration, then choose which one matches the SpacePoint CDHS board (INA219 at 0x40).</p>
                        <table class="w-full text-sm text-left">
                        <thead class="text-gray-500 border-b border-gray-700">
                            <tr>
                                <th class="pb-2">A0 / A1</th>
                                <th class="pb-2">Binary Address</th>
                                <th class="pb-2">Hex</th>
                            </tr>
                        </thead>
                        <tbody class="text-gray-300">
                            <tr class="border-b border-gray-800 bg-purple-900/10">
                                <td class="py-2">GND / GND</td>
                                <td>1000000</td>
                                <td><strong>0x40</strong> (SpacePoint)</td>
                            </tr>
                            <tr class="border-b border-gray-800">
                                <td class="py-2">GND / V+</td>
                                <td>1000001</td>
                                <td>0x41</td>
                            </tr>
                            <tr class="border-b border-gray-800">
                                <td class="py-2">GND / SDA</td>
                                <td>1000100</td>
                                <td>0x44</td>
                            </tr>
                            <tr>
                                <td class="py-2">GND / SCL</td>
                                <td>1000101</td>
                                <td>0x45</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            ` 
        }
    ]
});

// Resources for CDHS
window.spacePointData.resources['temp-sensors'] = [
    { type: 'Article', title: 'ESP32 and TMP102 digital temperature sensor example', org: 'ESP32 Learning', desc: 'Comprehensive wiring and code guide.', url: 'https://www.esp32learning.com/code/esp32-and-tmp102-digital-temperature-sensor-example.php' },
    { type: 'Datasheet', title: 'TMP102 Datasheet', org: 'Texas Instruments', desc: 'Official technical specifications.', url: 'https://www.ti.com/product/TMP102' }
];

window.spacePointData.resources['fram'] = [
    { type: 'Article', title: 'Adafruit I2C FRAM Guide', org: 'Adafruit', desc: 'How to use FRAM with Arduino.', url: 'https://learn.adafruit.com/adafruit-i2c-fram-breakout' },
    { type: 'Article', title: 'ESP32 I2C Communication: Set Pins, Multiple Bus Interfaces and Peripherals (Arduino IDE)', org: 'Random Nerd Tutorials', desc: 'Comprehensive wiring and code guide.', url: 'https://randomnerdtutorials.com/esp32-i2c-communication-arduino-ide/' }
];

window.spacePointData.resources['current'] = [
    { type: 'Video', title: '10 Minute Arduino Project - INA219 Current Sensor', org: 'DroneBot Workshop', desc: 'Measuring Voltage and Current with Arduino.', url: 'https://www.youtube.com/watch?v=PZ7imiIIf_k' },
    { type: 'Article', title: 'INA219 Breakout', org: 'Adafruit', desc: 'Library usage and wiring.', url: 'https://learn.adafruit.com/adafruit-ina219-current-sensor-breakout' },
    { type: 'Article', title: 'INA219 Current Sensor', org: 'DIY IoT', desc: 'Library usage and wiring.', url: 'https://diyi0t.com/ina219-tutorial-for-arduino-and-esp/' }
];
