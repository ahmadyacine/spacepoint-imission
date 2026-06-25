
// 3D Scene Config (Stars, Planets, etc.) with Physics

export function initScene() {
    createSpaceTheme();
}

function createSpaceTheme() {
    const starfield = document.getElementById('starfield');
    const spaceObjects = document.getElementById('space-objects');
    if (!starfield || !spaceObjects) return;

    // Generate Stars with Parallax Layers
    const starColors = ['#ffffff', '#e6f2ff', '#fff5e6', '#ffe6e6']; // White, Blue-ish, Yellow-ish, Red-ish
    const starLayers = [
        { count: 120, size: 1, speed: 0.5, opacity: 0.3, class: 'star-far' },
        { count: 60, size: 2, speed: 1.2, opacity: 0.6, class: 'star-mid' },
        { count: 20, size: 3, speed: 2.5, opacity: 0.8, class: 'star-near' }
    ];

    starLayers.forEach(layer => {
        for (let i = 0; i < layer.count; i++) {
            const star = document.createElement('div');
            star.className = `star ${layer.class}`;
            const color = starColors[Math.floor(Math.random() * starColors.length)];
            star.style.width = `${layer.size}px`;
            star.style.height = `${layer.size}px`;
            star.style.left = `${Math.random() * 100}%`;
            star.style.top = `${Math.random() * 100}%`;
            star.style.background = color;
            star.style.opacity = layer.opacity;
            star.style.setProperty('--duration', `${3 + Math.random() * 5}s`);
            starfield.appendChild(star);
        }
    });

    // Define Planets
    const planetConfigs = [
        { name: 'Aquea', size: 100, bg: 'linear-gradient(135deg, #1e3c72, #2a5298)', left: 15, top: 60, glow: 'rgba(30, 60, 114, 0.6)' },
        { name: 'Ignis', size: 80, bg: 'linear-gradient(135deg, #ff416c, #ff4b2b)', left: 70, top: 20, glow: 'rgba(255, 65, 108, 0.6)', rings: true },
        { name: 'Terra', size: 140, bg: 'linear-gradient(135deg, #1e3c72, #2a5298)', left: 45, top: 75, glow: 'rgba(0, 210, 255, 0.4)' },
        { name: 'Vesper', size: 60, bg: 'linear-gradient(135deg, #8e2de2, #4a00e0)', left: 85, top: 70, glow: 'rgba(142, 45, 226, 0.6)' }
    ];

    const objects = [];

    const planets = planetConfigs.map(config => {
        const p = document.createElement('div');
        p.className = 'planet';
        p.dataset.name = config.name;
        const size = config.size;
        p.style.width = `${size}px`;
        p.style.height = `${size}px`;
        p.style.background = config.bg;
        p.style.left = `${config.left}%`;
        p.style.top = `${config.top}%`;
        p.style.setProperty('--planet-glow', config.glow);

        if (config.rings) {
            const ring = document.createElement('div');
            ring.className = 'planet-ring';
            p.appendChild(ring);
        }

        spaceObjects.appendChild(p);

        // Add Craters for more detail on rocky planets
        if (config.name === 'Ignis' || config.name === 'Terra') {
            for (let i = 0; i < 5; i++) {
                const crater = document.createElement('div');
                crater.className = 'crater';
                const cSize = Math.random() * 15 + 5;
                crater.style.width = `${cSize}px`;
                crater.style.height = `${cSize * 0.8}px`;
                crater.style.left = `${Math.random() * 60 + 20}%`;
                crater.style.top = `${Math.random() * 60 + 20}%`;
                crater.style.transform = `rotate(${Math.random() * 360}deg)`;
                p.appendChild(crater);
            }
        }

        if (config.name === 'Terra') {
            const halo = document.createElement('div');
            halo.className = 'earth-halo';
            p.appendChild(halo);

            const land = document.createElement('div');
            land.className = 'terra-land';
            p.appendChild(land);

            const cityLights = document.createElement('div');
            cityLights.className = 'city-lights';
            p.appendChild(cityLights);
        }

        const obj = {
            el: p,
            radius: size / 2,
            type: 'planet',
            vx: 0, vy: 0,
            mass: size / 10
        };

        makeDraggable(obj, () => updateLighting(sunEl, planets));
        objects.push(obj);
        return p;
    });

    // 5. Shooting Star System
    function spawnShootingStar() {
        const star = document.createElement('div');
        star.className = 'shooting-star';

        // Random side and direction
        const isForeground = Math.random() > 0.5;
        star.style.zIndex = isForeground ? '50' : '-5'; // In front of or behind dashboard

        const startX = Math.random() * 100;
        const startY = Math.random() * 100;
        const angle = Math.random() * Math.PI * 2;
        const speed = 15 + Math.random() * 25;

        star.style.left = `${startX}%`;
        star.style.top = `${startY}%`;
        star.style.transform = `rotate(${angle}rad)`;

        document.body.appendChild(star);

        let pos = 0;
        const animateStar = () => {
            pos += speed;
            const x = startX + (Math.cos(angle) * pos) / window.innerWidth * 100;
            const y = startY + (Math.sin(angle) * pos) / window.innerHeight * 100;

            star.style.left = `${x}%`;
            star.style.top = `${y}%`;

            if (x < -20 || x > 120 || y < -20 || y > 120) {
                star.remove();
            } else {
                requestAnimationFrame(animateStar);
            }
        };
        animateStar();

        // Schedule next
        setTimeout(spawnShootingStar, 3000 + Math.random() * 7000);
    }
    setTimeout(spawnShootingStar, 5000);

    // Create Draggable Sun
    const sunEl = document.createElement('div');
    sunEl.className = 'sun';
    sunEl.style.left = '40%';
    sunEl.style.top = '10%';

    spaceObjects.appendChild(sunEl);


    const sunObj = { el: sunEl, radius: 75, type: 'sun', vx: 0, vy: 0, mass: 50 };
    makeDraggable(sunObj, () => {
        updateLighting(sunEl, planets);
    });
    objects.push(sunObj);

    // Draggable Asteroids
    for (let i = 0; i < 15; i++) {
        const asteroidEl = document.createElement('div');
        asteroidEl.className = 'meteor';
        asteroidEl.style.left = `${Math.random() * 95}%`;
        asteroidEl.style.top = `${Math.random() * 95}%`;
        const rockSize = Math.random() * 20 + 20;
        asteroidEl.style.width = `${rockSize}px`;
        asteroidEl.style.height = `${rockSize}px`;
        asteroidEl.style.borderRadius = `${30 + Math.random() * 40}% ${30 + Math.random() * 40}% ${30 + Math.random() * 40}% ${30 + Math.random() * 40}%`;

        spaceObjects.appendChild(asteroidEl);
        const astObj = { el: asteroidEl, radius: rockSize / 2, type: 'asteroid', vx: 0, vy: 0, mass: rockSize / 15 };
        makeDraggable(astObj);
        objects.push(astObj);
    }

    // Create Draggable Rocket (with AI)
    const rocketEl = document.createElement('div');
    rocketEl.className = 'rocket';
    rocketEl.style.left = '20%';
    rocketEl.style.top = '20%';
    const flame = document.createElement('div');
    flame.className = 'rocket-flame';
    rocketEl.appendChild(flame);
    spaceObjects.appendChild(rocketEl);

    const rocketObj = {
        el: rocketEl,
        radius: 25,
        type: 'rocket',
        vx: 0, vy: 0,
        rotation: -45,
        spin: 0,
        mass: 2
    };
    makeDraggable(rocketObj);
    objects.push(rocketObj);

    // Create Terra's Moon
    const terraObj = objects.find(o => o.el.dataset.name === 'Terra');
    const moonEl = document.createElement('div');
    moonEl.className = 'moon';
    spaceObjects.appendChild(moonEl);
    const moonObj = {
        el: moonEl,
        radius: 12,
        type: 'moon',
        vx: 0, vy: 0,
        mass: 0.5,
        orbitAngle: 0,
        orbitRadius: 150, // Increased distance
        orbitSpeed: 0.005,
        parent: terraObj
    };
    objects.push(moonObj);

    // Create Satellites for Terra
    for (let i = 0; i < 3; i++) {
        const satEl = document.createElement('div');
        satEl.className = 'satellite';
        spaceObjects.appendChild(satEl);
        const satObj = {
            el: satEl,
            radius: 6,
            type: 'satellite',
            vx: 0, vy: 0,
            mass: 0.1,
            orbitAngle: Math.random() * Math.PI * 2,
            orbitRadius: 100 + Math.random() * 30,
            orbitSpeed: 0.01 + Math.random() * 0.01,
            parent: terraObj
        };

        const led = document.createElement('div');
        led.className = 'satellite-led';
        satEl.appendChild(led);

        objects.push(satObj);
    }

    updateLighting(sunEl, planets);

    let time = 0;
    const friction = 0.985;

    function animate() {
        time += 0.005;

        objects.forEach((obj, i) => {
            // Evasion Logic for Rocket
            if (obj.type === 'rocket' && obj.el.dataset.isDragging !== 'true') {
                objects.forEach(other => {
                    if (other === obj) return;
                    const rectA = obj.el.getBoundingClientRect();
                    const rectB = other.el.getBoundingClientRect();
                    const dx = (rectA.left + rectA.width / 2) - (rectB.left + rectB.width / 2);
                    const dy = (rectA.top + rectA.height / 2) - (rectB.top + rectB.height / 2);
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 200) { // Evasion range
                        const force = (200 - dist) * 0.0005;
                        obj.vx += (dx / dist) * force;
                        obj.vy += (dy / dist) * force;
                    }
                });

                // Update orientation based on velocity
                if (Math.abs(obj.vx) > 0.01 || Math.abs(obj.vy) > 0.01) {
                    const targetRot = Math.atan2(obj.vy, obj.vx) * (180 / Math.PI) + 90;
                    obj.rotation += (targetRot - obj.rotation) * 0.1;
                }

                // Update spin decay
                obj.rotation += obj.spin;
                obj.spin *= 0.95;
            }

            // Apply momentum & friction
            obj.vx *= friction;
            obj.vy *= friction;

            if (obj.el.dataset.isDragging !== 'true') {
                const currentLeft = parseFloat(obj.el.style.left) || 0;
                const currentTop = parseFloat(obj.el.style.top) || 0;

                obj.el.style.left = `${currentLeft + obj.vx}%`;
                obj.el.style.top = `${currentTop + obj.vy}%`;

                // Wall Bounce
                if (currentLeft <= 0 && obj.vx < 0) obj.vx *= -0.8;
                if (currentLeft >= 95 && obj.vx > 0) obj.vx *= -0.8;
                if (currentTop <= 0 && obj.vy < 0) obj.vy *= -0.8;
                if (currentTop >= 95 && obj.vy > 0) obj.vy *= -0.8;
            }

            // Floating movement (subtle background drift) - only for non-rockets or stationary
            const isMoving = Math.abs(obj.vx) > 0.05 || Math.abs(obj.vy) > 0.05;
            // const freq = obj.type === 'asteroid' ? 0.8 : 1;
            const amp = obj.type === 'asteroid' ? 4 : 8;
            const fX = Math.sin(time + i) * (amp / window.innerWidth) * 10;
            const fY = Math.cos(time + i) * (amp * 0.5 / window.innerHeight) * 10;

            // Base rotation for non-spin objects
            const rotBase = obj.type === 'rocket' ? obj.rotation : 0;
            obj.el.style.transform = `translate(${fX * 100}px, ${fY * 100}px) rotate(${rotBase}deg)`;

            // Moon & Satellite Orbit Update
            if ((obj.type === 'moon' || obj.type === 'satellite') && obj.parent) {
                obj.orbitAngle += obj.orbitSpeed || 0.01;
                const orbitRadius = obj.orbitRadius || (obj.parent.radius * 2);
                const pxLeft = parseFloat(obj.parent.el.style.left);
                const pxTop = parseFloat(obj.parent.el.style.top);

                const mX = pxLeft + (Math.cos(obj.orbitAngle) * orbitRadius / window.innerWidth) * 100;
                const mY = pxTop + (Math.sin(obj.orbitAngle) * orbitRadius / window.innerHeight) * 100;

                obj.el.style.left = `${mX}%`;
                obj.el.style.top = `${mY}%`;
            }

            if (isMoving && obj.type === 'sun') updateLighting(obj.el, planets);
        });

        // Collision Resolution
        for (let i = 0; i < objects.length; i++) {
            for (let j = i + 1; j < objects.length; j++) {
                const objA = objects[i];
                const objB = objects[j];

                const rectA = objA.el.getBoundingClientRect();
                const rectB = objB.el.getBoundingClientRect();

                const centerA = { x: rectA.left + rectA.width / 2, y: rectA.top + rectA.height / 2 };
                const centerB = { x: rectB.left + rectB.width / 2, y: rectB.top + rectB.height / 2 };

                const dx = centerB.x - centerA.x;
                const dy = centerB.y - centerA.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const minDistance = objA.radius + objB.radius;

                // Prevent orbiters from colliding with their parent
                if ((objA.parent === objB) || (objB.parent === objA)) continue;

                if (distance < minDistance && distance > 0) {
                    const overlap = minDistance - distance;
                    const nx = dx / distance;
                    const ny = dy / distance;

                    // Static resolution
                    const totalMass = objA.mass + objB.mass;
                    const ratioA = objB.mass / totalMass;
                    const ratioB = objA.mass / totalMass;

                    if (objA.el.dataset.isDragging !== 'true') {
                        objA.el.style.left = `${parseFloat(objA.el.style.left) - (nx * overlap * ratioA / window.innerWidth) * 100}%`;
                        objA.el.style.top = `${parseFloat(objA.el.style.top) - (ny * overlap * ratioA / window.innerHeight) * 100}%`;
                    }
                    if (objB.el.dataset.isDragging !== 'true') {
                        objB.el.style.left = `${parseFloat(objB.el.style.left) + (nx * overlap * ratioB / window.innerWidth) * 100}%`;
                        objB.el.style.top = `${parseFloat(objB.el.style.top) + (ny * overlap * ratioB / window.innerHeight) * 100}%`;
                    }

                    // Dynamic resolution
                    const vRelativeX = objA.vx - objB.vx;
                    const vRelativeY = objA.vy - objB.vy;
                    const velocityInNormal = vRelativeX * nx + vRelativeY * ny;

                    if (velocityInNormal > 0) {
                        const restitution = 0.8;
                        const impulse = (2 * velocityInNormal) / totalMass;

                        if (objA.el.dataset.isDragging !== 'true') {
                            objA.vx -= impulse * objB.mass * nx * restitution;
                            objA.vy -= impulse * objB.mass * ny * restitution;
                            if (objA.type === 'rocket') objA.spin = 30; // Spin on hit!
                        }
                        if (objB.el.dataset.isDragging !== 'true') {
                            objB.vx += impulse * objA.mass * nx * restitution;
                            objB.vy += impulse * objA.mass * ny * restitution;
                            if (objB.type === 'rocket') objB.spin = 30; // Spin on hit!
                        }
                    }

                    if (objA.type === 'sun' || objB.type === 'sun') updateLighting(sunEl, planets);
                }
            }
        }

        requestAnimationFrame(animate);
    }
    animate();
}

function makeDraggable(obj, onMove) {
    const el = obj.el;
    let isDragging = false;
    let lastX, lastY;
    let lastTime;

    el.addEventListener('pointerdown', (e) => {
        isDragging = true;
        el.dataset.isDragging = 'true';
        document.body.classList.add('dragging');

        lastX = e.clientX;
        lastY = e.clientY;
        lastTime = Date.now();

        el.setPointerCapture(e.pointerId);
        e.stopPropagation();
    });

    el.addEventListener('pointermove', (e) => {
        if (!isDragging) return;

        const now = Date.now();
        const dt = now - lastTime || 1; // Time difference in ms

        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;

        // Direct position update
        const pLeft = parseFloat(el.style.left) || 0;
        const pTop = parseFloat(el.style.top) || 0;

        el.style.left = `${pLeft + (dx / window.innerWidth) * 100}%`;
        el.style.top = `${pTop + (dy / window.innerHeight) * 100}%`;

        // Track velocity for collisions WHILE dragging
        obj.vx = (dx / window.innerWidth) * 100 / (dt / 16);
        obj.vy = (dy / window.innerHeight) * 100 / (dt / 16);

        lastX = e.clientX;
        lastY = e.clientY;
        lastTime = now;

        if (onMove) onMove();
    });

    el.addEventListener('pointerup', (e) => {
        isDragging = false;
        el.dataset.isDragging = 'false';
        document.body.classList.remove('dragging');
        el.releasePointerCapture(e.pointerId);
    });
}

function updateLighting(sunEl, planets) {
    const sunRect = sunEl.getBoundingClientRect();
    const sunCenter = {
        x: sunRect.left + sunRect.width / 2,
        y: sunRect.top + sunRect.height / 2
    };

    planets.forEach(planet => {
        const planetRect = planet.getBoundingClientRect();
        const planetCenter = {
            x: planetRect.left + planetRect.width / 2,
            y: planetRect.top + planetRect.height / 2
        };

        const dx = planetCenter.x - sunCenter.x;
        const dy = planetCenter.y - sunCenter.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        const maxOffset = 60; // Increased shadow depth
        const shadowX = -(dx / dist) * maxOffset;
        const shadowY = -(dy / dist) * maxOffset;

        planet.style.setProperty('--shadow-x', `${shadowX}px`);
        planet.style.setProperty('--shadow-y', `${shadowY}px`);
    });
}
