/**
 * SpacePoint Software Guide Platform
 * data/intro.js - Introduction Lessons
 */

window.spacePointData.categories.push({
    id: 'intro',
    title: 'Introduction',
    description: 'Basics of Arduino IDE, ESP32, and C++ programming.',
    icon: 'cpu',
    timeEstimate: '1.5 hours',
    color: 'from-blue-500 to-purple-500',
    lessons: [
        {
            id: 'arduino-ide',
            title: 'How to download Arduino IDE',
            time: '10 min',
            content: `
                <h3 class="text-xl font-bold mb-2">Getting Started</h3>
                <p class="mb-4">The Arduino IDE is the primary tool we use to write and upload code to our ESP32 microcontrollers.</p>
                
                <h4 class="font-bold text-purple-300 mb-4">Select your Operating System:</h4>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <!-- Windows Card -->
                    <div class="bg-gray-800 p-4 rounded-lg border border-gray-700 flex flex-col items-center hover:border-blue-500 transition-colors">
                        <div class="text-4xl mb-2">🪟</div>
                        <h5 class="font-bold text-white mb-1">Windows</h5>
                        <p class="text-xs text-gray-400 mb-4">HP, DELL, Lenovo, etc.</p>
                        <a href="https://www.arduino.cc/en/software" target="_blank" class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm w-full text-center">Download for Windows</a>
                    </div>

                    <!-- macOS Card -->
                    <div class="bg-gray-800 p-4 rounded-lg border border-gray-700 flex flex-col items-center hover:border-gray-400 transition-colors">
                        <div class="text-4xl mb-2">🍎</div>
                        <h5 class="font-bold text-white mb-1">macOS</h5>
                        <p class="text-xs text-gray-400 mb-4">Apple MacBook, iMac, etc.</p>
                        <a href="https://www.arduino.cc/en/software" target="_blank" class="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded text-sm w-full text-center">Download for macOS</a>
                    </div>

                    <!-- Linux Card -->
                    <div class="bg-gray-800 p-4 rounded-lg border border-gray-700 flex flex-col items-center hover:border-yellow-500 transition-colors">
                        <div class="text-4xl mb-2">🐧</div>
                        <h5 class="font-bold text-white mb-1">Linux</h5>
                        <p class="text-xs text-gray-400 mb-4">Ubuntu, Debian, Fedora, etc.</p>
                        <a href="https://www.arduino.cc/en/software" target="_blank" class="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded text-sm w-full text-center">Download for Linux</a>
                    </div>
                </div>
                
                <div class="bg-purple-900/30 p-4 rounded-lg border border-purple-500/30 mb-6">
                    <h4 class="font-bold text-purple-300 mb-2">Installation Steps:</h4>
                    <ol class="list-decimal list-inside space-y-2 text-gray-300">
                        <li>Click the download button for your OS above.</li>
                        <li>Run the installer and follow the prompts.</li>
                        <li>Launch Arduino IDE.</li>
                    </ol>
                </div>
                
                <p>Once installed, we need to set it up for the ESP32.</p>
            `
        },
        {
            id: 'esp32-setup',
            title: 'How to add ESP32 library',
            time: '15 min',
            content: `
                <h3 class="text-xl font-bold mb-2">Adding ESP32 Board Support</h3>
                <p class="mb-4">By default, Arduino IDE only knows standard Arduino boards. We must add Espressif's package.</p>
                
                <div class="space-y-4">
                    <div class="bg-gray-800 p-4 rounded border-l-4 border-purple-500">
                        <p class="font-mono text-sm">File > Preferences > Additional Boards Manager URLs</p>
                        <p class="mt-2 text-sm text-gray-400">Paste this URL:</p>
                        <code class="block bg-black p-2 mt-1 rounded text-green-400 text-xs break-all">https://espressif.github.io/arduino-esp32/package_esp32_index.json</code>
                    </div>
                    
                    <ul class="list-disc list-inside text-gray-300 space-y-1">
                        <li>Go to <strong>Tools > Board > Boards Manager</strong>.</li>
                        <li>Search for <strong>"esp32"</strong>.</li>
                        <li>Install <strong>"esp32 by Espressif Systems"</strong>.</li>
                    </ul>
                </div>
            `
        },
        {
            id: 'data-types',
            title: 'Data types',
            time: '15 min',
            content: `
                <h3 class="text-xl font-bold mb-2">Core C++ Data Types</h3>
                <p class="mb-4">In embedded C++, choosing the right data type is crucial for memory management.</p>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div class="bg-gray-800 p-3 rounded">
                        <span class="text-pink-400 font-bold">int</span>
                        <p class="text-sm">Integers (-32,768 to 32,767 on Uno, but 32-bit on ESP32).</p>
                        <code class="text-xs text-green-400">int count = 42;</code>
                    </div>
                    <div class="bg-gray-800 p-3 rounded">
                        <span class="text-pink-400 font-bold">float</span>
                        <p class="text-sm">Decimal numbers. Uses more memory.</p>
                        <code class="text-xs text-green-400">float voltage = 3.3;</code>
                    </div>
                    <div class="bg-gray-800 p-3 rounded">
                        <span class="text-pink-400 font-bold">bool</span>
                        <p class="text-sm">True or False. Great for flags.</p>
                        <code class="text-xs text-green-400">bool isReady = true;</code>
                    </div>
                    <div class="bg-gray-800 p-3 rounded">
                        <span class="text-pink-400 font-bold">char</span>
                        <p class="text-sm">Single character.</p>
                        <code class="text-xs text-green-400">char grade = 'A';</code>
                    </div>
                </div>
            `
        },
        {
            id: 'variables',
            title: 'Variables',
            time: '10 min',
            hasPractice: true,
            practiceType: 'intro_variables',
            content: `
                <h3 class="text-xl font-bold mb-2">Using Variables</h3>
                <p class="mb-4">Variables store data. In SpacePoint software, meaningful names are mandatory.</p>
                <pre class="bg-black p-4 rounded text-sm text-green-400 mb-4">
// Bad
int x = 1000;

// Good (SpacePoint style)
int sensorReadInterval = 1000; // Time in ms
bool performCalibration = false;</pre>
                <ul class="list-disc list-inside text-gray-300">
                    <li>Always initialize your variables: <code>int x = 0;</code></li>
                    <li>Use <code>const</code> for values that never change (like pin numbers).</li>
                </ul>
            `
        },
        {
            id: 'loops',
            title: 'Loops',
            time: '20 min',
            hasPractice: true,
            practiceType: 'intro_loops',
            content: `
                <h3 class="text-xl font-bold mb-2">Control Flow: Loops</h3>
                <p class="mb-4">Loops repeat code. The two most common are <strong>for</strong> and <strong>while</strong>.</p>
                
                <h4 class="font-bold text-purple-300 mt-4">For Loop</h4>
                <p class="text-sm mb-2">Use when you know how many times to repeat.</p>
                <pre class="bg-black p-4 rounded text-sm text-green-400 mb-4">
for (int i = 0; i < 5; i++) {
    Serial.println(i); // Prints 0, 1, 2, 3, 4
}</pre>

                <h4 class="font-bold text-purple-300 mt-4">While Loop</h4>
                <p class="text-sm mb-2">Use when repeating until a condition changes.</p>
                <pre class="bg-black p-4 rounded text-sm text-green-400 mb-4">
while (WiFi.status() != WL_CONNECTED) {
    delay(500); // Wait for connection
}</pre>
            `
        },
        {
            id: 'if-statements',
            title: 'If statements',
            time: '15 min',
            hasPractice: true,
            practiceType: 'intro_if',
            content: `
                <h3 class="text-xl font-bold mb-2">Decision Making</h3>
                <p class="mb-4"><code>if</code> statements allow your satellite software to react to sensor data.</p>
                <pre class="bg-black p-4 rounded text-sm text-green-400 mb-4">
if (temperature > 30.0) {
    turnOnFan();
} else if (temperature < 10.0) {
    turnOnHeater();
} else {
    standBy();
}</pre>
                <p class="text-yellow-400 text-sm"><strong>Common Mistake:</strong> Using <code>=</code> (assignment) instead of <code>==</code> (comparison).</p>
            `
        },
        {
            id: 'functions',
            title: 'Functions',
            time: '25 min',
            hasPractice: true,
            practiceType: 'intro_functions',
            content: `
                <h3 class="text-xl font-bold mb-2">Modular Code</h3>
                <p class="mb-4">Functions group code into reusable blocks. This keeps <code>loop()</code> clean.</p>
                <pre class="bg-black p-4 rounded text-sm text-green-400 mb-4">
// Function Declaration
void blinkLed(int times) {
    for(int i = 0; i < times; i++) {
        digitalWrite(LED_PIN, HIGH);
        delay(100);
        digitalWrite(LED_PIN, LOW);
        delay(100);
    }
}

// Usage inside loop
void loop() {
    blinkLed(3); // Blinks 3 times
}</pre>
            `
        }
    ]
});

// Resources for Intro Lessons
window.spacePointData.resources['arduino-ide'] = [
    { type: 'Guide', title: 'Arduino IDE Download', org: 'Arduino', desc: 'Official download page.', url: 'https://www.arduino.cc/en/software' },
    { type: 'Guide', title: 'Installing Arduino IDE', org: 'Arduino', desc: 'Step-by-step installation instructions.', url: 'https://docs.arduino.cc/software/ide-v2/tutorials/getting-started-ide-v2' }
];

window.spacePointData.resources['esp32-setup'] = [
    { type: 'Article', title: 'Installing ESP32 in Arduino IDE 2.0', org: 'Random Nerd Tutorials', desc: 'Complete guide for Windows/Mac/Linux.', url: 'https://randomnerdtutorials.com/installing-esp32-arduino-ide-2-0/' },
    { type: 'Guide', title: 'ESP32 Board Manager URL', org: 'Espressif', desc: 'Official JSON link for boards manager.', url: 'https://espressif.github.io/arduino-esp32/package_esp32_index.json' }
];

window.spacePointData.resources['data-types'] = [
    { type: 'Reference', title: 'C++ Data Types', org: 'Arduino', desc: 'Official reference for Int, Float, Bool, Char, etc.', url: 'https://www.arduino.cc/reference/en/#variables' },
    { type: 'Article', title: 'Data Types in Arduino', org: 'SparkFun', desc: 'Understanding bits and bytes.', url: 'https://learn.sparkfun.com/tutorials/data-types-in-arduino/all' }
];

window.spacePointData.resources['variables'] = [
    { type: 'Article', title: 'Arduino Variables', org: 'Arduino', desc: 'How to declare and use variables.', url: 'https://docs.arduino.cc/learn/programming/variables' }
];

window.spacePointData.resources['loops'] = [
    { type: 'Reference', title: 'for Loop', org: 'Arduino', desc: 'Usage and examples of for loops.', url: 'https://www.arduino.cc/reference/en/language/structure/control-structure/for/' },
    { type: 'Reference', title: 'while Loop', org: 'Arduino', desc: 'Usage and examples of while loops.', url: 'https://www.arduino.cc/reference/en/language/structure/control-structure/while/' }
];

window.spacePointData.resources['if-statements'] = [
    { type: 'Reference', title: 'if...else', org: 'Arduino', desc: 'Control flow with conditional statements.', url: 'https://www.arduino.cc/reference/en/language/structure/control-structure/if/' }
];

window.spacePointData.resources['functions'] = [
    { type: 'Article', title: 'Using Functions in Arduino', org: 'SparkFun', desc: 'Modular coding best practices.', url: 'https://learn.sparkfun.com/tutorials/using-functions-in-arduino/all' },
    { type: 'Reference', title: 'Functions', org: 'Arduino', desc: 'Detailed guide on writing custom functions.', url: 'https://docs.arduino.cc/learn/programming/functions' }
];
