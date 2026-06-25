/**
 * SpacePoint Software Guide Platform
 * activities.js - Interactive Lesson Builders
 */

window.Activities = {
    state: {
        i2c: { devices: [] }, // { type: 'master'|'slave', name: string, icon: string }
        uart: { selectedPin: null, connections: [] },
        can: { nodes: [] }, // { type: 'engine'|'brakes', name: string }
        spi: {
            selectedSlave: null, // index 0, 1, 2
            isTransferring: false
        }
    },

    // ============================================
    // I2C ARCHITECTURE BUILDER
    // ============================================

    renderI2CBuilder(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Reset state on load
        this.state.i2c.devices = [];

        container.innerHTML = `
            <div class="bg-black/40 border border-purple-500/30 rounded-xl p-4 mt-4">
                <div class="flex items-center justify-between mb-4">
                    <h4 class="font-bold text-purple-300 flex items-center gap-2">
                        <i data-lucide="cpu" class="w-5 h-5"></i>
                        I2C Lab: Build the Network
                    </h4>
                    <div class="flex gap-2">
                        <select id="i2c-component-select" class="bg-purple-900/50 border border-purple-500/30 rounded px-3 py-1 text-sm text-white focus:outline-none">
                            <option value="master">Microcontroller (Master)</option>
                            <option value="temp">Temp Sensor (Slave)</option>
                            <option value="display">OLED Screen (Slave)</option>
                            <option value="gyro">Gyroscope (Slave)</option>
                        </select>
                        <button onclick="Activities.addI2CDevice()" class="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded text-sm font-bold transition-colors">
                            + Add Device
                        </button>
                    </div>
                </div>

                <!-- Visualization Area -->
                <div class="relative h-64 bg-[#1a0526] border border-gray-800 rounded-lg overflow-hidden mb-4" id="i2c-viz">
                    <!-- Bus Lines -->
                    <div class="absolute top-1/2 left-0 w-full h-8 -mt-4 flex flex-col justify-center space-y-2">
                        <div class="w-full h-1 bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)] relative group">
                            <span class="absolute right-2 -top-4 text-[10px] text-yellow-400 opacity-50 font-mono">SDA (Data)</span>
                        </div>
                        <div class="w-full h-1 bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.5)] relative">
                             <span class="absolute right-2 top-2 text-[10px] text-blue-400 opacity-50 font-mono">SCL (Clock)</span>
                        </div>
                    </div>
                    
                    <!-- Devices Container -->
                    <div id="i2c-devices" class="absolute inset-0 flex items-center justify-around px-8 pointer-events-none">
                        <!-- Devices injected here -->
                        <div class="text-gray-600 text-sm">Add devices to start building...</div>
                    </div>
                </div>

                <!-- Feedback Area -->
                <div class="flex justify-between items-center">
                    <div id="i2c-feedback" class="text-sm text-gray-400 italic">
                        Add a Master Controller to start.
                    </div>
                    <div class="flex gap-2">
                        <button onclick="Activities.resetI2C()" class="text-red-400 text-xs hover:text-red-300 underline">Reset</button>
                        <button onclick="Activities.verifyI2C()" class="bg-green-600 hover:bg-green-500 text-white px-4 py-1.5 rounded text-sm font-bold transition-colors shadow-lg shadow-green-900/20">
                            Check Connections
                        </button>
                    </div>
                </div>
            </div>
        `;
        lucide.createIcons();
    },

    addI2CDevice() {
        const select = document.getElementById('i2c-component-select');
        const type = select.value;
        const feedback = document.getElementById('i2c-feedback');
        
        // Validation Logic
        const hasMaster = this.state.i2c.devices.some(d => d.role === 'master');
        
        if (type === 'master') {
            if (hasMaster) {
                this.showFeedback('⚠️ Only one Master device is allowed!', 'text-yellow-400');
                return;
            }
            this.state.i2c.devices.push({
                role: 'master',
                name: 'MCU (Master)',
                icon: 'cpu',
                color: 'text-purple-400'
            });
        } else {
            if (this.state.i2c.devices.length >= 5) {
                this.showFeedback('⚠️ Bus is full!', 'text-yellow-400');
                return;
            }
            let name = 'Sensor';
            let icon = 'activity';
            if (type === 'temp') { name = 'TMP102'; icon = 'thermometer'; }
            if (type === 'display') { name = 'OLED'; icon = 'monitor'; }
            if (type === 'gyro') { name = 'IMU'; icon = 'compass'; }

            this.state.i2c.devices.push({
                role: 'slave',
                name: name,
                icon: icon,
                color: 'text-teal-400'
            });
        }

        this.updateI2CViz();
        this.showFeedback('Device added to bus.', 'text-gray-300');
    },

    updateI2CViz() {
        const container = document.getElementById('i2c-devices');
        if (this.state.i2c.devices.length === 0) {
            container.innerHTML = '<div class="text-gray-600 text-sm">Add devices to start building...</div>';
            return;
        }

        container.innerHTML = this.state.i2c.devices.map(device => `
            <div class="relative group pointer-events-auto transition-all p-2 rounded-lg bg-black/80 border ${device.role === 'master' ? 'border-purple-500 shadow-purple-500/20' : 'border-teal-500 shadow-teal-500/20'} border shadow-lg flex flex-col items-center gap-2 w-24">
                <!-- Data Lines Connection -->
                <div class="absolute -top-8 w-0.5 h-8 bg-gray-500 group-hover:bg-white transition-colors"></div>
                
                <i data-lucide="${device.icon}" class="w-8 h-8 ${device.color}"></i>
                <span class="text-[10px] font-bold text-gray-300">${device.name}</span>
                <span class="text-[8px] uppercase tracking-wider ${device.role === 'master' ? 'bg-purple-900 text-purple-200' : 'bg-teal-900 text-teal-200'} px-1 rounded">${device.role}</span>
            </div>
        `).join('');
        
        lucide.createIcons();
    },

    resetI2C() {
        this.state.i2c.devices = [];
        this.updateI2CViz();
        this.showFeedback('Lab reset.', 'text-gray-400');
    },

    verifyI2C() {
        const hasMaster = this.state.i2c.devices.some(d => d.role === 'master');
        const slaveCount = this.state.i2c.devices.filter(d => d.role === 'slave').length;

        if (!hasMaster) {
            this.showFeedback('❌ Missing a Master Controller!', 'text-red-400');
        } else if (slaveCount === 0) {
            this.showFeedback('❌ The Master is lonely. Add some sensors!', 'text-red-400');
        } else {
            this.showFeedback(`✅ SUCCESS! Master connected to ${slaveCount} device(s).`, 'text-green-400 font-bold');
        }
    },

    showFeedback(msg, classes) {
        const el = document.getElementById('i2c-feedback');
        if (el) {
            el.className = `text-sm ${classes} animate-pulse`;
            el.textContent = msg;
        }
    },

    // ============================================
    // UART LAB
    // ============================================

    renderUARTLab(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Reset UART State
        this.state.uart = {
            selectedPin: null, // { device: 'mcu'|'mod', pin: 'tx'|'rx'|'gnd' }
            connections: []    // { from: 'mcu-tx', to: 'mod-rx' }
        };

        const pinStyles = "cursor-pointer hover:scale-125 transition-transform w-4 h-4 rounded-full border-2 border-white shadow-[0_0_10px_white]";
        
        container.innerHTML = `
            <div class="bg-black/40 border border-purple-500/30 rounded-xl p-4 mt-4 select-none">
                <div class="flex items-center justify-between mb-4">
                    <h4 class="font-bold text-purple-300 flex items-center gap-2">
                        <i data-lucide="cable" class="w-5 h-5"></i>
                        UART Lab: Connect the Dots
                    </h4>
                    <div class="text-xs text-gray-400">
                        Click a pin on left, then click a pin on right.
                    </div>
                </div>

                <!-- Lab Area -->
                <div class="relative h-64 bg-[#1a0526] border border-gray-800 rounded-lg overflow-hidden mb-4 relative" id="uart-viz">
                    
                    <!-- SVG Overlay for Wires -->
                    <svg id="uart-wires" class="absolute inset-0 w-full h-full pointer-events-none z-10">
                        <!-- Wires injected here -->
                    </svg>

                    <!-- MCU (Left) -->
                    <div class="absolute left-[10%] top-1/2 -translate-y-1/2 w-32 bg-purple-900/40 border border-purple-500 rounded-lg p-3 z-20">
                        <div class="text-center text-xs font-bold text-purple-300 mb-2">Microcontroller</div>
                        <div class="flex flex-col gap-4 items-end pr-2">
                            <div class="flex items-center gap-2">
                                <span class="text-[10px] text-gray-400">TX</span>
                                <div id="pin-mcu-tx" onclick="Activities.handleUartPin('pin-mcu-tx')" class="${pinStyles} bg-green-500"></div>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="text-[10px] text-gray-400">RX</span>
                                <div id="pin-mcu-rx" onclick="Activities.handleUartPin('pin-mcu-rx')" class="${pinStyles} bg-blue-500"></div>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="text-[10px] text-gray-400">GND</span>
                                <div id="pin-mcu-gnd" onclick="Activities.handleUartPin('pin-mcu-gnd')" class="${pinStyles} bg-gray-500"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Module (Right) -->
                    <div class="absolute right-[10%] top-1/2 -translate-y-1/2 w-32 bg-teal-900/40 border border-teal-500 rounded-lg p-3 z-20">
                        <div class="text-center text-xs font-bold text-teal-300 mb-2">GPS Module</div>
                        <div class="flex flex-col gap-4 items-start pl-2">
                            <div class="flex items-center gap-2">
                                <div id="pin-mod-tx" onclick="Activities.handleUartPin('pin-mod-tx')" class="${pinStyles} bg-green-500"></div>
                                <span class="text-[10px] text-gray-400">TX</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <div id="pin-mod-rx" onclick="Activities.handleUartPin('pin-mod-rx')" class="${pinStyles} bg-blue-500"></div>
                                <span class="text-[10px] text-gray-400">RX</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <div id="pin-mod-gnd" onclick="Activities.handleUartPin('pin-mod-gnd')" class="${pinStyles} bg-gray-500"></div>
                                <span class="text-[10px] text-gray-400">GND</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Feedback -->
                <div class="flex justify-between items-center">
                    <div id="uart-feedback" class="text-sm text-gray-400 italic">
                        Connect TX, RX, and GND correctly.
                    </div>
                    <div class="flex gap-2">
                        <button onclick="Activities.renderUARTLab('${containerId}')" class="text-red-400 text-xs hover:text-red-300 underline">Reset</button>
                        <button onclick="Activities.verifyUART()" class="bg-green-600 hover:bg-green-500 text-white px-4 py-1.5 rounded text-sm font-bold transition-colors shadow-lg shadow-green-900/20">
                            Verify Connection
                        </button>
                    </div>
                </div>
            </div>
        `;
        lucide.createIcons();
        window.addEventListener('resize', () => this.drawWires());
    },

    handleUartPin(pinId) {
        const state = this.state.uart;
        const feedback = document.getElementById('uart-feedback');

        // Check if pin already used
        if (state.connections.some(c => c.from === pinId || c.to === pinId)) {
            feedback.textContent = "❌ Pin already connected! Reset to try again.";
            feedback.className = "text-sm text-red-400";
            return;
        }

        if (!state.selectedPin) {
            // First click
            state.selectedPin = pinId;
            document.getElementById(pinId).classList.add('ring-4', 'ring-white/50');
            feedback.textContent = "Select destination pin...";
            feedback.className = "text-sm text-blue-300 animate-pulse";
            
            // Start tracking mouse for temp wire
            document.onmousemove = (e) => this.updateTempWire(e);

        } else {
            // Second click
            const from = state.selectedPin;
            const to = pinId;

            // Stop tracking
            document.onmousemove = null;
            document.getElementById('uart-temp-wire')?.remove();

            // Prevent self-connection or same-side connection
            if (from === to) return;
            // Simple check: IDs start with 'pin-mcu' or 'pin-mod'
            const fromSide = from.includes('mcu') ? 'mcu' : 'mod';
            const toSide = to.includes('mcu') ? 'mcu' : 'mod';

            if (fromSide === toSide) {
                feedback.textContent = "❌ Connect to the OTHER device!";
                feedback.className = "text-sm text-red-400";
                this.clearSelection();
                return;
            }

            // Save connection
            state.connections.push({ from, to });
            this.clearSelection();
            this.drawWires();
            feedback.textContent = "Wire connected.";
            feedback.className = "text-sm text-gray-400";
        }
    },

    updateTempWire(e) {
        const svg = document.getElementById('uart-wires');
        // If lab is closed/reset, stop tracking
        if(!svg) {
            document.onmousemove = null;
            return;
        }

        let tempLine = document.getElementById('uart-temp-wire');
        if(!tempLine) {
            tempLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
            tempLine.id = 'uart-temp-wire';
            tempLine.setAttribute("stroke", "rgba(255,255,255,0.8)");
            tempLine.setAttribute("stroke-width", "3");
            tempLine.setAttribute("stroke-dasharray", "5,5");
            svg.appendChild(tempLine);
        }

        const startPos = this.getPinCenter(this.state.uart.selectedPin);
        const viz = document.getElementById('uart-viz');
        const rect = viz.getBoundingClientRect();

        const endX = e.clientX - rect.left;
        const endY = e.clientY - rect.top;

        tempLine.setAttribute("x1", startPos.x);
        tempLine.setAttribute("y1", startPos.y);
        tempLine.setAttribute("x2", endX);
        tempLine.setAttribute("y2", endY);
    },

    clearSelection() {
        if (this.state.uart.selectedPin) {
            document.getElementById(this.state.uart.selectedPin)?.classList.remove('ring-4', 'ring-white/50');
        }
        this.state.uart.selectedPin = null;
    },

    getPinCenter(elementId) {
        const el = document.getElementById(elementId);
        const container = document.getElementById('uart-viz');
        if (!el || !container) return { x: 0, y: 0 };

        const elRect = el.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        return {
            x: (elRect.left + elRect.width / 2) - containerRect.left,
            y: (elRect.top + elRect.height / 2) - containerRect.top
        };
    },

    drawWires() {
        const svg = document.getElementById('uart-wires');
        if (!svg) return;

        // Clear existing permanent wires (keep temp wire if exists?)
        // Safer to just rewrite innerHTML but save temp wire reference if needed.
        // For simplicity, we just rebuild mostly.
        
        const tempWire = document.getElementById('uart-temp-wire');
        const tempWireClone = tempWire ? tempWire.cloneNode(true) : null;
        
        svg.innerHTML = '';
        if(tempWireClone) svg.appendChild(tempWireClone);

        this.state.uart.connections.forEach(c => {
            const start = this.getPinCenter(c.from);
            const end = this.getPinCenter(c.to);

            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", start.x);
            line.setAttribute("y1", start.y);
            line.setAttribute("x2", end.x);
            line.setAttribute("y2", end.y);
            line.setAttribute("stroke", "cyan");
            line.setAttribute("stroke-width", "3");
            line.classList.add("drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]");
            
            svg.appendChild(line);
        });
    },

    verifyUART() {
        const conns = this.state.uart.connections;
        const feedback = document.getElementById('uart-feedback');
        
        // Count connection types using IDs
        let tx_rx = false;
        let rx_tx = false;
        let gnd_gnd = false;
        let errors = false;

        conns.forEach(c => {
            // IDs look like 'pin-mcu-tx' or 'pin-mod-rx'
            const p1 = c.from; 
            const p2 = c.to;
            
            // Extract types: 'tx', 'rx', 'gnd'
            const type1 = p1.split('-').pop(); // 'tx'
            const type2 = p2.split('-').pop(); // 'rx'

            // Valid Pairs: tx-rx or rx-tx (order agnostic), gnd-gnd
            const pair = [type1, type2].sort().join('-');
            
            if (pair === 'rx-tx') {
                // Determine direction based on device
                // We need mcu-tx -> mod-rx AND mod-tx -> mcu-rx
                // Wait, logic is just "TX connected to RX"
                if(p1.includes('tx')) tx_rx = true; 
                else rx_tx = true; 
                // Wait, pair 'rx-tx' covers both cases. 
                // We just need to know we have at least one valid data link? 
                // User requirement: "connect RT with TX and GND"
                // Let's count valid crossed wires.
            }

            if (type1 === 'gnd' && type2 === 'gnd') gnd_gnd = true;
            else if ((type1 === 'tx' && type2 === 'rx') || (type1 === 'rx' && type2 === 'tx')) {
               if (p1.includes('mcu-tx') || p2.includes('mcu-tx')) tx_rx = true;
               if (p1.includes('mcu-rx') || p2.includes('mcu-rx')) rx_tx = true;
            } else {
                errors = true;
            }
        });

        if (errors) {
            feedback.textContent = "❌ Check wires! TX goes to RX, GND goes to GND.";
            feedback.className = "text-sm text-red-400 font-bold";
        } else if (tx_rx && rx_tx && gnd_gnd) {
            feedback.textContent = "✅ Excellent! Communication link established.";
            feedback.className = "text-sm text-green-400 font-bold";
        } else if (!gnd_gnd) {
            feedback.textContent = "⚠️ Don't forget Ground (GND)!";
            feedback.className = "text-sm text-yellow-400";
        } else {
             feedback.textContent = "⚠️ Incomplete. Connect both TX->RX and RX->TX.";
             feedback.className = "text-sm text-yellow-400";
        }
    },

    // ============================================
    // CAN BUS LAB
    // ============================================



    renderCANLab(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Reset CAN State
        this.state.can = { nodes: [] };

        container.innerHTML = `
            <div class="bg-black/40 border border-purple-500/30 rounded-xl p-4 mt-4 select-none">
                <div class="flex items-center justify-between mb-4">
                    <h4 class="font-bold text-purple-300 flex items-center gap-2">
                        <i data-lucide="network" class="w-5 h-5"></i>
                        CAN Bus: The Group Chat
                    </h4>
                    <div class="flex gap-2">
                        <select id="can-node-select" class="bg-purple-900/50 border border-purple-500/30 rounded px-3 py-1 text-sm text-white focus:outline-none">
                            <option value="engine">Engine Control Unit</option>
                            <option value="brakes">ABS / Brakes</option>
                            <option value="radio">Radio / Infotainment</option>
                            <option value="lights">Headlights Controller</option>
                        </select>
                        <button onclick="Activities.addCANNode()" class="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded text-sm font-bold transition-colors">
                            + Add Node
                        </button>
                    </div>
                </div>

                <!-- Bus Viz -->
                <div class="relative h-48 bg-[#1a0526] border border-gray-800 rounded-lg overflow-hidden mb-4 flex items-center justify-center" id="can-viz">
                    
                    <!-- The Bus Backbone -->
                    <div class="absolute w-[90%] h-8 flex flex-col justify-center space-y-2 z-0">
                        <!-- CAN H -->
                        <div class="w-full h-1 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] relative">
                             <div class="absolute -left-2 -top-1 w-2 h-3 bg-gray-500 rounded-l" title="Terminator 120Ω"></div>
                             <div class="absolute -right-2 -top-1 w-2 h-3 bg-gray-500 rounded-r" title="Terminator 120Ω"></div>
                             <span class="absolute left-1/2 -top-4 text-[10px] text-red-500 -translate-x-1/2">CAN High</span>
                        </div>
                        <!-- CAN L -->
                        <div class="w-full h-1 bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] relative">
                             <div class="absolute -left-2 -top-1 w-2 h-3 bg-gray-500 rounded-l"></div>
                             <div class="absolute -right-2 -top-1 w-2 h-3 bg-gray-500 rounded-r"></div>
                             <span class="absolute left-1/2 top-2 text-[10px] text-green-500 -translate-x-1/2">CAN Low</span>
                        </div>
                    </div>

                    <!-- Signal Animation Layer -->
                    <div id="can-signal" class="absolute w-[90%] h-8 z-10 hidden">
                         <div class="w-full h-full bg-yellow-400/20 animate-pulse rounded"></div>
                    </div>

                    <!-- Nodes Container -->
                    <div id="can-nodes" class="absolute inset-0 flex items-end justify-center gap-8 pb-2 z-20 pointer-events-none">
                        <!-- Nodes go here -->
                        <div class="text-gray-600 mb-8">Add nodes to the bus...</div>
                    </div>

                </div>

                <!-- Controls -->
                <div class="flex justify-between items-center">
                    <div id="can-feedback" class="text-sm text-gray-400 italic">
                        All nodes hear every message!
                    </div>
                    <div class="flex gap-2">
                        <button onclick="Activities.renderCANLab('${containerId}')" class="text-red-400 text-xs hover:text-red-300 underline">Reset</button>
                        <button onclick="Activities.broadcastCAN()" class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded text-sm font-bold transition-colors shadow-lg shadow-blue-900/20">
                            📢 Broadcast Message
                        </button>
                    </div>
                </div>
            </div>
        `;
        lucide.createIcons();
    },

    addCANNode() {
        if (this.state.can.nodes.length >= 4) {
            this.showCANFeedback('⚠️ Bus is crowded! Max 4 nodes.', 'text-yellow-400');
            return;
        }

        const select = document.getElementById('can-node-select');
        const type = select.value;
        const name = select.options[select.selectedIndex].text;
        
        // Icon mapping
        let icon = 'box';
        if (type === 'engine') icon = 'cpu';
        if (type === 'brakes') icon = 'disc';
        if (type === 'radio') icon = 'music';
        if (type === 'lights') icon = 'lightbulb';

        this.state.can.nodes.push({ type, name, icon });
        this.updateCANViz();
        this.showCANFeedback('Node added. Connects to BOTH lines.', 'text-gray-300');
    },

    updateCANViz() {
        const container = document.getElementById('can-nodes');
        if (this.state.can.nodes.length === 0) {
            container.innerHTML = '<div class="text-gray-600 mb-8">Add nodes to the bus...</div>';
            return;
        }

        container.innerHTML = this.state.can.nodes.map(node => `
            <div class="flex flex-col items-center group relative can-node-el transition-transform">
                <!-- Drop Line to Bus -->
                <div class="h-8 w-0.5 bg-gray-500 mb-0 relative">
                    <div class="absolute -top-1 -left-1 w-2 h-2 bg-white rounded-full"></div>
                </div>
                
                <div class="bg-gray-800 border border-gray-600 p-2 rounded flex flex-col items-center w-20 shadow-lg">
                    <i data-lucide="${node.icon}" class="w-6 h-6 text-gray-300 mb-1"></i>
                    <span class="text-[9px] text-gray-400 text-center leading-tight">${node.name}</span>
                </div>
            </div>
        `).join('');
        lucide.createIcons();
    },

    broadcastCAN() {
        if (this.state.can.nodes.length < 2) {
            this.showCANFeedback('⚠️ Need at least 2 nodes to talk!', 'text-yellow-400');
            return;
        }

        const signal = document.getElementById('can-signal');
        const feedback = document.getElementById('can-feedback');

        // Animation
        feedback.textContent = "Broadcasting data packet...";
        feedback.className = "text-sm text-blue-400 animate-pulse";
        
        signal.classList.remove('hidden');
        signal.classList.add('animate-ping'); // Simple flash effect for whole bus
        
        // Flash nodes
        const nodes = document.querySelectorAll('.can-node-el .bg-gray-800');
        nodes.forEach(n => n.classList.add('border-yellow-400', 'bg-yellow-900/50'));

        setTimeout(() => {
            signal.classList.add('hidden');
            signal.classList.remove('animate-ping');
            nodes.forEach(n => n.classList.remove('border-yellow-400', 'bg-yellow-900/50'));
            
            feedback.textContent = "✅ Message received by ALL nodes!";
            feedback.className = "text-sm text-green-400";
        }, 1500);
    },
    
    showCANFeedback(msg, classes) {
        const el = document.getElementById('can-feedback');
        if (el) {
            el.className = `text-sm ${classes}`;
            el.textContent = msg;
        }
    },

    // ============================================
    // SPI LAB
    // ============================================



    renderSPILab(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        // Reset
        this.state.spi.selectedSlave = null;

        container.innerHTML = `
            <div class="bg-black/40 border border-purple-500/30 rounded-xl p-4 mt-4 select-none">
                <div class="flex items-center justify-between mb-4">
                    <h4 class="font-bold text-purple-300 flex items-center gap-2">
                        <i data-lucide="activity" class="w-5 h-5"></i>
                        SPI: The High-Speed Express
                    </h4>
                    <div class="text-xs text-gray-400">
                        Turn ON a Chip Select (CS) switch to talk to that device.
                    </div>
                </div>

                <!-- Lab Viz -->
                <div class="relative h-64 bg-[#1a0526] border border-gray-800 rounded-lg overflow-hidden mb-4 flex items-center justify-center p-4">
                    
                    <!-- Shared Bus Lines (Horizontal) -->
                    <div class="absolute top-[40%] left-[20%] right-[10%] h-12 flex flex-col justify-between pointer-events-none opacity-50">
                        <div class="w-full h-0.5 bg-blue-500"></div> <!-- MOSI -->
                        <div class="w-full h-0.5 bg-green-500"></div> <!-- MISO -->
                        <div class="w-full h-0.5 bg-yellow-500"></div> <!-- SCK -->
                    </div>

                    <!-- Master (MCU) -->
                    <div class="absolute left-4 top-1/2 -translate-y-1/2 w-24 h-40 bg-purple-900 border border-purple-500 rounded-lg flex flex-col items-center justify-center z-10 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                        <i data-lucide="cpu" class="w-8 h-8 text-purple-300 mb-2"></i>
                        <span class="text-xs font-bold text-white">Master</span>
                        <div class="mt-4 flex flex-col gap-1 w-full px-2">
                            <div class="flex justify-between text-[8px] text-gray-400"><span>CS1</span><div id="mcu-cs-0" class="w-2 h-2 rounded-full bg-red-500"></div></div>
                            <div class="flex justify-between text-[8px] text-gray-400"><span>CS2</span><div id="mcu-cs-1" class="w-2 h-2 rounded-full bg-red-500"></div></div>
                            <div class="flex justify-between text-[8px] text-gray-400"><span>CS3</span><div id="mcu-cs-2" class="w-2 h-2 rounded-full bg-red-500"></div></div>
                        </div>
                    </div>

                    <!-- Slaves Container -->
                    <div class="absolute right-4 top-0 bottom-0 w-3/4 flex justify-around items-center">
                        ${this.renderSPISlave(0, 'SD Card', 'hard-drive')}
                        ${this.renderSPISlave(1, 'Display', 'monitor')}
                        ${this.renderSPISlave(2, 'Sensor', 'thermometer')}
                    </div>

                    <!-- Data Packets (Hidden by default) -->
                    <div id="spi-packet-mosi" class="absolute w-3 h-3 bg-blue-400 rounded-full shadow-[0_0_5px_cyan] hidden z-20"></div>
                    <div id="spi-packet-miso" class="absolute w-3 h-3 bg-green-400 rounded-full shadow-[0_0_5px_lime] hidden z-20"></div>

                </div>

                <!-- Controls -->
                <div class="flex justify-between items-center">
                    <div id="spi-feedback" class="text-sm text-gray-400 italic">
                        Select a device to start transfer.
                    </div>
                    <div class="flex gap-2">
                        <button onclick="Activities.renderSPILab('${containerId}')" class="text-red-400 text-xs hover:text-red-300 underline">Reset</button>
                        <button onclick="Activities.transferSPI()" class="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded text-sm font-bold transition-colors shadow-lg shadow-indigo-900/20">
                            🚀 Transfer Data
                        </button>
                    </div>
                </div>
            </div>
        `;
        lucide.createIcons();
    },

    renderSPISlave(index, name, icon) {
        return `
            <div class="flex flex-col items-center gap-2 relative group slave-unit" id="slave-${index}">
                 <!-- CS Line (Vertical) -->
                 <div class="absolute -top-12 bottom-[100%] w-0.5 bg-gray-700 transition-colors" id="cs-line-${index}"></div>
                 
                 <!-- Toggle Switch -->
                 <button onclick="Activities.toggleSPICS(${index})" class="mb-2 relative w-8 h-4 bg-gray-700 rounded-full transition-colors focus:outline-none" id="cs-toggle-${index}">
                    <div class="absolute left-0.5 top-0.5 w-3 h-3 bg-white rounded-full transition-transform" id="cs-knob-${index}"></div>
                 </button>

                 <div class="w-20 h-24 bg-gray-800 border border-gray-600 rounded flex flex-col items-center justify-center shadow-lg transition-all" id="slave-box-${index}">
                    <i data-lucide="${icon}" class="w-6 h-6 text-gray-500 transition-colors" id="slave-icon-${index}"></i>
                    <span class="text-[10px] text-gray-400 mt-2">${name}</span>
                 </div>
            </div>
        `;
    },

    toggleSPICS(index) {
        const state = this.state.spi;
        
        // Deselect others (Simple logic: only 1 at a time for this lab)
        if (state.selectedSlave !== null && state.selectedSlave !== index) {
            this.updateCSVisuals(state.selectedSlave, false);
        }

        if (state.selectedSlave === index) {
            // Toggle Off
            this.updateCSVisuals(index, false);
            state.selectedSlave = null;
            this.showSPIFeedback("Device deselected.", "text-gray-400");
        } else {
            // Toggle On
            this.updateCSVisuals(index, true);
            state.selectedSlave = index;
            this.showSPIFeedback(`Selected Slave ${index+1}. High speed link ready.`, "text-green-400");
        }
    },

    updateCSVisuals(index, isActive) {
        const toggle = document.getElementById(`cs-toggle-${index}`);
        const knob = document.getElementById(`cs-knob-${index}`);
        const box = document.getElementById(`slave-box-${index}`);
        const icon = document.getElementById(`slave-icon-${index}`);
        const mcuLed = document.getElementById(`mcu-cs-${index}`);

        if (isActive) {
            toggle.classList.replace('bg-gray-700', 'bg-green-600');
            knob.classList.add('translate-x-4');
            box.classList.replace('border-gray-600', 'border-green-500');
            box.classList.add('shadow-green-500/20');
            icon.classList.replace('text-gray-500', 'text-green-300');
            mcuLed.classList.replace('bg-red-500', 'bg-green-400');
            mcuLed.classList.add('shadow-[0_0_5px_lime]');
        } else {
            toggle.classList.replace('bg-green-600', 'bg-gray-700');
            knob.classList.remove('translate-x-4');
            box.classList.replace('border-green-500', 'border-gray-600');
            box.classList.remove('shadow-green-500/20');
            icon.classList.replace('text-green-300', 'text-gray-500');
            mcuLed.classList.replace('bg-green-400', 'bg-red-500');
            mcuLed.classList.remove('shadow-[0_0_5px_lime]');
        }
    },

    transferSPI() {
        if (this.state.spi.selectedSlave === null) {
            this.showSPIFeedback("⚠️ Select a device (CS switch) first!", "text-yellow-400");
            return;
        }

        const index = this.state.spi.selectedSlave;
        this.showSPIFeedback("Transmitting Data chunks...", "text-blue-300 animate-pulse");

        // Animate Packets
        const mosi = document.getElementById('spi-packet-mosi');
        const miso = document.getElementById('spi-packet-miso');
        const target = document.getElementById(`slave-box-${index}`);
        const targetRect = target.getBoundingClientRect();
        const containerRect = document.querySelector('#spi-activity-container .relative').getBoundingClientRect(); // rough guess, or use parent
        // Actually better to get relative to parent
        const parent = target.offsetParent; 
        const mcu = parent.querySelector('.absolute.left-4'); // The Master

        // Reset anim
        mosi.classList.remove('hidden');
        miso.classList.remove('hidden');
        mosi.style.transition = 'none';
        miso.style.transition = 'none';
        
        // Start positions
        // MOSI: MCU -> Slave
        // MISO: Slave -> MCU
        const mcuX = 100; // approx center of MCU
        const mcuY = 120;
        
        // Slave Coords (approx)
        const slaveX = target.offsetLeft + 40;
        const slaveY = target.offsetTop + 40;

        mosi.style.left = mcuX + 'px';
        mosi.style.top = (mcuY - 10) + 'px';
        
        miso.style.left = slaveX + 'px';
        miso.style.top = (slaveY + 10) + 'px';

        // Trigger reflow
        void mosi.offsetWidth;

        // Animate
        mosi.style.transition = 'all 1s ease-in-out';
        miso.style.transition = 'all 1s ease-in-out';

        mosi.style.left = slaveX + 'px';
        mosi.style.top = (slaveY - 10) + 'px';

        miso.style.left = mcuX + 'px';
        miso.style.top = (mcuY + 10) + 'px';

        setTimeout(() => {
             mosi.classList.add('hidden');
             miso.classList.add('hidden');
             this.showSPIFeedback("✅ Data exchange complete! (Full Duplex)", "text-green-400");
        }, 1000);
    },

    showSPIFeedback(msg, classes) {
        const el = document.getElementById('spi-feedback');
        if (el) {
            el.className = `text-sm ${classes}`;
            el.textContent = msg;
        }
    }
};
    
