/**
 * SpacePoint Software Guide Platform
 * data/communication.js - Communication Interfaces
 */

if (window.getUserType() !== 'school') {
window.spacePointData.categories.push({
    id: 'comms',
    title: 'Communication Interfaces',
    description: 'Protocols for talking to sensors and other chips.',
    icon: 'network',
    timeEstimate: '1.2 hours',
    color: 'from-green-500 to-teal-500',
    lessons: [
        { 
            id: 'can', 
            title: 'CAN Bus', 
            time: '20 min', 
            content: `
                <h3 class="text-xl font-bold mb-2">Controller Area Network (CAN)</h3>
                <p class="mb-4">The Controller Area Network (CAN) is a robust communication standard designed for high-reliability applications, allowing microcontrollers and devices to communicate with each other without a host computer. Originally developed for the automotive industry to reduce wiring harness weight and complexity, it is now widely used in industrial automation and aerospace (like satellites!).</p>

                <div class="mb-6 rounded-lg overflow-hidden border border-purple-500/30">
                    <img src="https://blog.seeedstudio.com/wp-content/uploads/2019/11/image-158.png" alt="CAN Bus Diagram" class="w-full h-auto bg-white/90 p-4">
                    <p class="text-xs text-gray-400 p-2 bg-black/50">CAN Bus Architecture (Source: Seeed Studio)</p>
                </div>

                <div class="bg-purple-900/20 p-4 rounded-lg border border-purple-500/20 mb-6">
                    <h4 class="font-bold text-purple-300 mb-2">How It Works</h4>
                    <p class="mb-3 text-sm text-gray-300">CAN uses a broadcast message system where data is transmitted to all devices on the network. There is no central master; any node can transmit when the bus is free.</p>
                    <ul class="list-disc list-inside space-y-2 text-sm text-gray-300">
                        <li><strong>Differential Signaling:</strong> Uses two wires, CAN High (CANH) and CAN Low (CANL). The receiver looks at the voltage difference (Vdiff = CANH - CANL), making it highly resistant to electromagnetic interference (EMI).</li>
                        <li><strong>Message ID & Arbitration:</strong> Every message has a unique ID (Standard 11-bit or Extended 29-bit). If two nodes transmit simultaneously, the one with the lower ID (higher priority) wins, and the other waits.</li>
                        <li><strong>Termination:</strong> To prevent signal reflection, the bus must be terminated with 120Ω resistors at both ends of the main line.</li>
                        <li><strong>Error Checking:</strong> CAN has built-in CRC checking and error confinement. Faulty nodes automatically switch off to prevent jamming the bus.</li>
                    </ul>
                </div>

                <!-- Interactive Lab -->
                <div id="can-activity-container" class="mt-8">
                    <button onclick="Activities.renderCANLab('can-activity-container')" class="w-full py-4 bg-gradient-to-r from-red-800 to-orange-900 rounded-xl border border-red-500/50 hover:border-red-400 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all group">
                        <div class="flex flex-col items-center gap-2">
                             <div class="p-3 rounded-full bg-black/40 group-hover:bg-red-500/20 transition-colors">
                                <i data-lucide="network" class="w-8 h-8 text-red-300 group-hover:text-white"></i>
                             </div>
                             <span class="font-bold text-white text-lg">Open CAN Lab</span>
                             <span class="text-red-300 text-sm">Visualize the Bus Broadcast</span>
                        </div>
                    </button>
                </div>
            ` 
        },
        { 
            id: 'uart', 
            title: 'UART', 
            time: '15 min', 
            content: `
                <h3 class="text-xl font-bold mb-2">Universal Asynchronous Receiver-Transmitter (UART)</h3>
                <p class="mb-4">UART is a simple, peer-to-peer serial communication protocol. It is "asynchronous," meaning there is no shared clock signal wire between the two devices. Instead, both sides must agree on a timing speed, known as the <strong>Baud Rate</strong>, before communication applies.</p>

                <div class="mb-6 rounded-lg overflow-hidden border border-purple-500/30">
                    <img src="https://vanhunteradams.com/Protocols/UART/uart_hardware.png" alt="UART Timing" class="w-full h-auto bg-white/90 p-4">
                    <p class="text-xs text-gray-400 p-2 bg-black/50">UART Timing Diagram (Source: Van Hunter Adams)</p>
                </div>

                <div class="bg-purple-900/20 p-4 rounded-lg border border-purple-500/20 mb-6">
                    <h4 class="font-bold text-purple-300 mb-2">Key Features</h4>
                    <ul class="list-disc list-inside space-y-2 text-sm text-gray-300">
                        <li><strong>Wiring:</strong> Requires two data lines: TX (Transmit) and RX (Receive). Ground must also be shared.</li>
                        <li><strong>Connection Rule:</strong> Crossover is required! Connect Device A's TX to Device B's RX, and vice-versa.</li>
                        <li><strong>Data Frame:</strong> Data is sent in packets, usually starting with a Start Bit (low), followed by 5-9 data bits (usually 8), a Parity Bit (optional), and 1 or 2 Stop Bits (high).</li>
                        <li><strong>Usage:</strong> Commonly used for debugging (printing to Serial Monitor), GPS modules, and Bluetooth modules.</li>
                    </ul>
                </div>

                <!-- Interactive Lab -->
                <div id="uart-activity-container" class="mt-8">
                    <button onclick="Activities.renderUARTLab('uart-activity-container')" class="w-full py-4 bg-gradient-to-r from-teal-800 to-emerald-900 rounded-xl border border-teal-500/50 hover:border-teal-400 hover:shadow-[0_0_20px_rgba(45,212,191,0.3)] transition-all group">
                        <div class="flex flex-col items-center gap-2">
                             <div class="p-3 rounded-full bg-black/40 group-hover:bg-teal-500/20 transition-colors">
                                <i data-lucide="cable" class="w-8 h-8 text-teal-300 group-hover:text-white"></i>
                             </div>
                             <span class="font-bold text-white text-lg">Open UART Lab</span>
                             <span class="text-teal-300 text-sm">Wire up TX/RX</span>
                        </div>
                    </button>
                </div>
            ` 
        },
        { 
            id: 'i2c', 
            title: 'I2C', 
            time: '25 min', 
            content: `
                <h3 class="text-xl font-bold mb-2">Inter-Integrated Circuit (I2C)</h3>
                <p class="mb-4">I2C (pronounced "I-squared-C") is a synchronous, multi-master, multi-slave bus. It is extremely popular for connecting low-speed sensors and peripherals to a processor over short distances using just two wires.</p>

                <div class="mb-6 rounded-lg overflow-hidden border border-purple-500/30">
                    <img src="https://www.analog.com/en/_/media/analog/en/landing-pages/technical-articles/i2c-primer-what-is-i2c-part-1-/36684.png?la=en&w=900" alt="I2C Data Transfer" class="w-full h-auto bg-white/90 p-4">
                    <p class="text-xs text-gray-400 p-2 bg-black/50">I2C Data Transfer (Source: Analog Devices)</p>
                </div>

                <div class="bg-purple-900/20 p-4 rounded-lg border border-purple-500/20 mb-6">
                    <h4 class="font-bold text-purple-300 mb-2">Protocol Details</h4>
                    <ul class="list-disc list-inside space-y-2 text-sm text-gray-300">
                        <li><strong>Lines:</strong>
                            <ul class="list-disc list-inside ml-6 text-xs text-gray-400">
                                <li><strong>SDA (Serial Data):</strong> Carries the data.</li>
                                <li><strong>SCL (Serial Clock):</strong> Synchronizes the data transfer.</li>
                            </ul>
                        </li>
                        <li><strong>Addressing:</strong> Every slave device has a unique 7-bit (or 10-bit) address. The master initiates communication by sending the target address. Only the device with that address responds.</li>
                        <li><strong>Open Drain:</strong> The lines are "open drain," meaning devices can pull the line Low (0V) but cannot drive it High. External or internal <strong>pull-up resistors</strong> are required to pull the line High (3.3V/5V) when idle.</li>
                        <li><strong>Speeds:</strong> Standard Mode (100 kbps), Fast Mode (400 kbps), and High Speed Mode (3.4 Mbps).</li>
                    </ul>
                </div>

                <!-- Interactive Lab -->
                <div id="i2c-activity-container" class="mt-8">
                    <button onclick="Activities.renderI2CBuilder('i2c-activity-container')" class="w-full py-4 bg-gradient-to-r from-purple-800 to-indigo-900 rounded-xl border border-purple-500/50 hover:border-purple-400 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all group">
                        <div class="flex flex-col items-center gap-2">
                             <div class="p-3 rounded-full bg-black/40 group-hover:bg-purple-500/20 transition-colors">
                                <i data-lucide="flask-conical" class="w-8 h-8 text-purple-300 group-hover:text-white"></i>
                             </div>
                             <span class="font-bold text-white text-lg">Open I2C Lab</span>
                             <span class="text-purple-300 text-sm">Build the Master-Slave Network</span>
                        </div>
                    </button>
                </div>
            ` 
        },
        { 
            id: 'spi', 
            title: 'SPI', 
            time: '20 min', 
            content: `
                <h3 class="text-xl font-bold mb-2">Serial Peripheral Interface (SPI)</h3>
                <p class="mb-4">SPI is a high-speed, synchronous, full-duplex serial communication interface. It is typically faster than I2C and is used when higher data rates are required, such as for SD cards, displays, or fast sensors.</p>

                <div class="mb-6 rounded-lg overflow-hidden border border-purple-500/30">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/SPI_timing_diagram2.svg/800px-SPI_timing_diagram2.svg.png" alt="SPI Timing" class="w-full h-auto bg-white/90 p-4">
                    <p class="text-xs text-gray-400 p-2 bg-black/50">SPI Timing Diagram (Source: Wikimedia)</p>
                </div>

                <div class="bg-purple-900/20 p-4 rounded-lg border border-purple-500/20">
                    <h4 class="font-bold text-purple-300 mb-2">4-Wire Interface</h4>
                    <p class="mb-2 text-sm text-gray-300">SPI uses a Master-Slave architecture, usually with four lines:</p>
                    <ul class="list-disc list-inside space-y-2 text-sm text-gray-300">
                        <li><strong>SCLK (Serial Clock):</strong> Generated by the Master to synchronize data.</li>
                        <li><strong>MOSI (Master Out Slave In):</strong> Data sent from Master to Slave.</li>
                        <li><strong>MISO (Master In Slave Out):</strong> Data sent from Slave to Master.</li>
                        <li><strong>CS/SS (Chip Select / Slave Select):</strong> A separate line for each slave device. The Master pulls this line LOW to activate a specific slave. This differs from I2C, which uses addresses.</li>
                    </ul>
                </div>

                <!-- Interactive Lab -->
                <div id="spi-activity-container" class="mt-8">
                    <button onclick="Activities.renderSPILab('spi-activity-container')" class="w-full py-4 bg-gradient-to-r from-indigo-800 to-blue-900 rounded-xl border border-indigo-500/50 hover:border-indigo-400 hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all group">
                        <div class="flex flex-col items-center gap-2">
                             <div class="p-3 rounded-full bg-black/40 group-hover:bg-indigo-500/20 transition-colors">
                                <i data-lucide="activity" class="w-8 h-8 text-indigo-300 group-hover:text-white"></i>
                             </div>
                             <span class="font-bold text-white text-lg">Open SPI Lab</span>
                             <span class="text-indigo-300 text-sm">Experiment with Chip Select</span>
                        </div>
                    </button>
                </div>
            ` 
        }
    ]
});
}
