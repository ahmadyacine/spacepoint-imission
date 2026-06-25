/**
 * SpacePoint Software Guide Platform
 * data/overview.js - Mission Briefing / Platform Overview
 */

window.spacePointData.categories.push({
    id: 'overview',
    title: 'Mission Briefing',
    description: 'Start here: Understand your mission to program the SpacePoint CubeSat.',
    icon: 'rocket',
    timeEstimate: '10 min',
    color: 'from-orange-500 to-yellow-500', // Gold/Orange for "Top Secret Mission" feel
    lessons: [
        {
            id: 'welcome',
            title: 'Welcome to SpacePoint',
            time: '2 min',
            content: `
                <h3 class="text-xl font-bold mb-2">Welcome, Engineer.</h3>
                <p class="mb-4">You have arrived at the <strong>SpacePoint Software Guide Platform</strong>. This is not just a textbook—it is your command center for mastering the software that drives real satellites.</p>
                
                <div class="mb-6 rounded-lg overflow-hidden border border-purple-500/30">
                    <div class="bg-gradient-to-r from-purple-900 via-black to-purple-900 p-8 text-center">
                        <i data-lucide="satellite" class="w-24 h-24 text-white mx-auto mb-4 animate-pulse"></i>
                        <h2 class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">SpacePoint CubeSat Mission</h2>
                    </div>
                </div>

                <p class="mb-4">This platform bridges the gap between theory and orbit. You will not just read code; you will write it, test it, and deploy it to simulate a real mission environment.</p>
            `
        },
        {
            id: 'objectives',
            title: 'What You Will Do',
            time: '5 min',
            content: `
                <h3 class="text-xl font-bold mb-2">Your Training Path</h3>
                <p class="mb-4">To successfully program the CubeSat, you need to master three core pillars:</p>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div class="bg-gray-800/50 p-4 rounded-lg border border-purple-500/20">
                        <div class="text-blue-400 mb-2"><i data-lucide="cpu" class="w-8 h-8"></i></div>
                        <h4 class="font-bold text-white mb-1">1. Foundations</h4>
                        <p class="text-xs text-gray-400">Master the ESP32 microcontroller, C++ basics, and the Arduino IDE development environment.</p>
                    </div>
                    <div class="bg-gray-800/50 p-4 rounded-lg border border-purple-500/20">
                        <div class="text-green-400 mb-2"><i data-lucide="network" class="w-8 h-8"></i></div>
                        <h4 class="font-bold text-white mb-1">2. Communications</h4>
                        <p class="text-xs text-gray-400">Learn the languages of hardware: I2C (Sensors), SPI (Memory), UART (GPS), and CAN (System Bus).</p>
                    </div>
                    <div class="bg-gray-800/50 p-4 rounded-lg border border-purple-500/20">
                        <div class="text-orange-400 mb-2"><i data-lucide="activity" class="w-8 h-8"></i></div>
                        <h4 class="font-bold text-white mb-1">3. Systems</h4>
                        <p class="text-xs text-gray-400">Interface with real hardware: Temperature sensors, FRAM memory, Gyroscopes, and Reaction Wheels.</p>
                    </div>
                </div>

                <p>You will complete interactive coding challenges for each hardware component to verify your skills.</p>
            `
        },
        {
            id: 'the-output',
            title: 'The Output (Mission Goal)',
            time: '3 min',
            content: `
                <h3 class="text-xl font-bold mb-2">The Final Product</h3>
                <p class="mb-4">What is the result of all this work? You will have written the flight software for the <strong>CDHS (Command & Data Handling System)</strong>.</p>
                
                <div class="bg-purple-900/20 p-5 rounded-xl border border-purple-500/30 flex items-start gap-4">
                    <div class="p-3 bg-green-500/20 rounded-full text-green-400">
                        <i data-lucide="check-circle" class="w-6 h-6"></i>
                    </div>
                    <div>
                        <h4 class="font-bold text-white text-lg">Your Code Will:</h4>
                        <ul class="list-disc list-inside space-y-2 text-sm text-gray-300 mt-2">
                            <li>Initialize and monitor the spacecraft's health.</li>
                            <li>Read critical telemetry (Temperature, Voltage, Current).</li>
                            <li>Store mission data reliably in Non-Volatile Memory (FRAM).</li>
                            <li>communicate with the Ground Station (Simulated).</li>
                        </ul>
                    </div>
                </div>

                <p class="mt-6 text-center text-gray-400 italic">"The hardware is the body, but your code is the soul of the satellite."</p>
            `
        }
    ]
});
