/**
 * SpacePoint Software Guide Platform
 * data/communication_school.js - Simplified Communication Interfaces (School Level)
 */

if (window.getUserType() === 'school') {
window.spacePointData.categories.push({
    id: 'comms',
    title: 'Communication Interfaces',
    description: 'How computer chips talk to each other.',
    icon: 'network',
    timeEstimate: '45 min',
    color: 'from-green-400 to-teal-400',
    lessons: [
        { 
            id: 'can', 
            title: 'CAN Bus', 
            time: '10 min', 
            content: `
                <h3 class="text-xl font-bold mb-2">CAN Bus: The Message Board</h3>
                <p class="mb-4">Imagine a classroom where everyone is talking. If everyone talks at once, it's chaos! CAN Bus is like raising your hand.</p>
                
                <div class="bg-purple-900/30 p-4 rounded-lg border border-purple-500/30 mb-6">
                    <h4 class="font-bold text-purple-300 mb-2">How it works:</h4>
                    <p class="text-gray-300 text-sm">
                        It's like a <strong>Group Chat</strong> for the satellite parts. Everyone can see every message, but you only listen to the ones meant for you.
                    </p>
                    <ul class="list-disc list-inside mt-2 text-sm text-gray-300">
                        <li><strong>Priority:</strong> Important messages (like "Battery Low") get to go first.</li>
                        <li><strong>Safe:</strong> It uses two wires to make sure the message doesn't get messed up by noise.</li>
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
                             <span class="text-red-300 text-sm">Tap to join the group chat</span>
                        </div>
                    </button>
                </div>
            ` 
        },
        { 
            id: 'uart', 
            title: 'UART', 
            time: '10 min', 
            content: `
                <h3 class="text-xl font-bold mb-2">UART: Passing Notes</h3>
                <p class="mb-4">UART is the simplest way for two chips to talk. It's like passing a note to your friend in class.</p>
                
                <div class="bg-purple-900/30 p-4 rounded-lg border border-purple-500/30 mb-6">
                    <h4 class="font-bold text-purple-300 mb-2">Key Concepts:</h4>
                    <ul class="list-disc list-inside mt-2 text-sm text-gray-300">
                        <li><strong>Direct Connection:</strong> Only two people can talk (You and Your Friend).</li>
                        <li><strong>Speed:</strong> You both have to agree on how fast to write/read (Baud Rate).</li>
                        <li><strong>TX & RX:</strong> Your mouth (TX) talks to their ear (RX).</li>
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
                             <span class="text-teal-300 text-sm">Tap to wire the connections</span>
                        </div>
                    </button>
                </div>
            ` 
        },
        { 
            id: 'i2c', 
            title: 'I2C', 
            time: '15 min', 
            content: `
                <h3 class="text-xl font-bold mb-2">I2C: The Master and Servants</h3>
                <p class="mb-4">I2C is used when one "Master" brain needs to control many "Slave" parts (like sensors).</p>
                
                <div class="bg-purple-900/30 p-4 rounded-lg border border-purple-500/30 mb-6">
                    <h4 class="font-bold text-purple-300 mb-2">Analogy:</h4>
                    <p class="text-gray-300 text-sm">
                        Think of a teacher (Master) calling on students (Slaves) by name.
                    </p>
                    <ul class="list-disc list-inside mt-2 text-sm text-gray-300">
                        <li><strong>Addresses:</strong> Every sensor has a unique ID number, like a name.</li>
                        <li><strong>Wires:</strong> Uses only 2 wires to connect many things!</li>
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
                             <span class="text-purple-300 text-sm">Tap to build your own network</span>
                        </div>
                    </button>
                </div>
            ` 
        },
        { 
            id: 'spi', 
            title: 'SPI', 
            time: '10 min', 
            content: `
                <h3 class="text-xl font-bold mb-2">SPI: The Fast Lane</h3>
                <p class="mb-4">SPI is much faster than I2C. We use it when we need to move data quickly, like saving photos to an SD card.</p>
                
                <div class="bg-purple-900/30 p-4 rounded-lg border border-purple-500/30 mb-6">
                    <h4 class="font-bold text-purple-300 mb-2">How it works:</h4>
                    <ul class="list-disc list-inside mt-2 text-sm text-gray-300">
                        <li><strong>Speedy:</strong> It's like a firehose of data!</li>
                        <li><strong>4 Wires:</strong> It needs more wires than I2C, but that's why it's faster.</li>
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
                             <span class="text-indigo-300 text-sm">Tap to toggle Chip Select lines</span>
                        </div>
                    </button>
                </div>
            ` 
        }
    ]
});
}
