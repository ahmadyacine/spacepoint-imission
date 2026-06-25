let miniScene, miniCamera, miniRenderer, miniEarth, miniSat, miniSatGroup;
let megaScene, megaCamera, megaRenderer, megaEarth, megaSat, megaSatGroup;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

const TEXTURES = {
    earth: 'https://unpkg.com/three-globe@2.31.0/example/img/earth-blue-marble.jpg',
    clouds: 'https://unpkg.com/three-globe@2.31.0/example/img/earth-clouds.png',
    bump: 'https://unpkg.com/three-globe@2.31.0/example/img/earth-topology.png',
    stars: 'https://unpkg.com/three-globe@2.31.0/example/img/night-sky.png'
};

function createSatelliteModel() {
    const group = new THREE.Group();
    
    // Procedural Solar Panel Texture
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#102a5a';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#4da3ff';
    ctx.lineWidth = 2;
    for(let i=0; i<128; i+=16) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 128); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(128, i); ctx.stroke();
    }
    const panelTexture = new THREE.CanvasTexture(canvas);

    // Body - Golden Kapton Foil
    const bodyGeom = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    const bodyMat = new THREE.MeshStandardMaterial({ 
        color: 0xffd710, // Bright Gold
        metalness: 0.9, 
        roughness: 0.2,
        emissive: 0x332200
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    group.add(body);

    // Solar Panels
    const panelGeom = new THREE.PlaneGeometry(0.8, 0.3);
    const panelMat = new THREE.MeshStandardMaterial({ 
        map: panelTexture,
        side: THREE.DoubleSide,
        metalness: 0.5,
        roughness: 0.2
    });

    const leftPanel = new THREE.Mesh(panelGeom, panelMat);
    leftPanel.position.x = -0.48;
    group.add(leftPanel);

    const rightPanel = new THREE.Mesh(panelGeom, panelMat);
    rightPanel.position.x = 0.48;
    group.add(rightPanel);

    // Flashing Beacon Light (Centered on top)
    const glassGeom = new THREE.SphereGeometry(0.04, 8, 8);
    const glassMat = new THREE.MeshStandardMaterial({ 
        color: 0xff0000, 
        emissive: 0xff0000, 
        emissiveIntensity: 5
    });
    const beacon = new THREE.Mesh(glassGeom, glassMat);
    beacon.position.set(0, 0.08, 0); 
    beacon.name = 'satellite_beacon';
    group.add(beacon);

    return group;
}

function createStarfield() {
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.1,
        transparent: true
    });

    const starVertices = [];
    for (let i = 0; i < 5000; i++) {
        const x = (Math.random() - 0.5) * 1000;
        const y = (Math.random() - 0.5) * 1000;
        const z = (Math.random() - 0.5) * 1000;
        starVertices.push(x, y, z);
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    return new THREE.Points(starGeometry, starMaterial);
}

export function initEarthViz() {
    const miniContainer = document.getElementById('earth-viz-3d');
    if (!miniContainer) return;

    // Reset container (remove CSS earth)
    miniContainer.innerHTML = '';
    miniContainer.style.background = 'transparent';
    miniContainer.style.overflow = 'visible';

    // Click to open modal
    miniContainer.parentElement.onclick = openEarthModal;

    // Mini View
    const miniSize = 140;
    miniScene = new THREE.Scene();
    miniCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    miniCamera.position.z = 2.8; // Move camera back to prevent clipping atmosphere

    miniRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    miniRenderer.setSize(miniSize, miniSize);
    miniRenderer.setPixelRatio(window.devicePixelRatio);
    miniContainer.appendChild(miniRenderer.domElement);

    // Earth
    const geometry = new THREE.SphereGeometry(1, 64, 64);
    const textureLoader = new THREE.TextureLoader();
    
    // Using a reliable Earth texture from a known CDN
    const earthTexture = textureLoader.load(TEXTURES.earth);
    const material = new THREE.MeshPhongMaterial({
        map: earthTexture,
        shininess: 5
    });
    miniEarth = new THREE.Mesh(geometry, material);
    miniScene.add(miniEarth);

    // Atmosphere Glow
    const atmosphereGeom = new THREE.SphereGeometry(1.05, 64, 64);
    const atmosphereMat = new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.BackSide,
        uniforms: {
            glowColor: { value: new THREE.Color(0x00d2ff) },
            viewVector: { value: miniCamera.position }
        },
        vertexShader: `
            varying float intensity;
            void main() {
                vec3 vNormal = normalize(normalMatrix * normal);
                vec3 vNormel = normalize(normalMatrix * vec3(0.0, 0.0, 1.0));
                intensity = pow(0.7 - dot(vNormal, vNormel), 4.0);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 glowColor;
            varying float intensity;
            void main() {
                gl_FragColor = vec4(glowColor, intensity * 0.6);
            }
        `
    });
    const atmosphere = new THREE.Mesh(atmosphereGeom, atmosphereMat);
    miniScene.add(atmosphere);

    // Lights
    const light = new THREE.DirectionalLight(0xffffff, 1.5);
    light.position.set(5, 3, 5);
    miniScene.add(light);
    miniScene.add(new THREE.AmbientLight(0x333333));

    // 3D Satellite Model (Mini)
    miniSatGroup = createSatelliteModel();
    miniSatGroup.scale.set(0.15, 0.15, 0.15); 
    miniEarth.add(miniSatGroup); // Parent to Earth so it rotates with it

    // Initial position at 0,0 orbit
    updateEarthSatPos(0, 0, 400);
    function animateMini() {
        requestAnimationFrame(animateMini);
        miniEarth.rotation.y += 0.002;
        // Keep satellite oriented towards earth center (0,0,0)
        if (miniSatGroup) {
            miniSatGroup.lookAt(0, 0, 0); 
            // Handle binary flashing beacon (on for 400ms, off for 400ms)
            const beacon = miniSatGroup.getObjectByName('satellite_beacon');
            if (beacon) {
                beacon.material.emissiveIntensity = (Date.now() % 800 < 400) ? 5 : 0;
            }
        }
        miniRenderer.render(miniScene, miniCamera);
    }
    animateMini();

    // Global Modal Functions
    // Global Modal Functions
    window.closeEarthModal = () => {
        document.getElementById('earth-modal').classList.add('hidden');
    };

    // Global Simulation Functions
    window.toggleTestCoords = () => {
        const panel = document.getElementById('test-coord-panel');
        panel.classList.toggle('hidden');
        
        // Trigger resize after DOM update to prevent Earth compression
        setTimeout(() => {
            const container = document.getElementById('expanded-earth-container');
            if (megaRenderer && megaCamera && container) {
                const w = container.clientWidth;
                const h = container.clientHeight;
                megaCamera.aspect = w / h;
                megaCamera.updateProjectionMatrix();
                megaRenderer.setSize(w, h);
            }
        }, 50); 
    };

    window.applyTestCoords = () => {
        const lat = parseFloat(document.getElementById('test-lat').value);
        const lon = parseFloat(document.getElementById('test-lon').value);
        const alt = parseFloat(document.getElementById('test-alt').value) || 400;
        if (isNaN(lat) || isNaN(lon)) return;

        // Force update 3D
        updateEarthSatPos(lat, lon, alt);

        // Update UI labels 
        const setValText = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.innerText = text;
        };
        const fmt = (v, d) => (v != null ? v.toFixed(d) : '---');
        setValText('viz-lat', fmt(lat, 4) + '°');
        setValText('viz-lon', fmt(lon, 4) + '°');
        setValText('viz-alt', fmt(alt, 1) + ' km');
    };
}

export function openEarthModal() {
    const modal = document.getElementById('earth-modal');
    modal.classList.remove('hidden');

    // Wait for modal to be visible so we get real dimensions
    setTimeout(() => {
        const container = document.getElementById('expanded-earth-container');
        if (!container) return;

        if (megaRenderer) {
            // Re-sync size in case window resized while closed
            const w = container.clientWidth;
            const h = container.clientHeight;
            megaCamera.aspect = w / h;
            megaCamera.updateProjectionMatrix();
            megaRenderer.setSize(w, h);
            return;
        }

        const width = container.clientWidth || 800;
        const height = container.clientHeight || 600;

        megaScene = new THREE.Scene();
        megaCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        megaCamera.position.z = 2.8; // Move camera closer to make earth bigger

        megaRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        megaRenderer.setSize(width, height);
        megaRenderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(megaRenderer.domElement);

        const textureLoader = new THREE.TextureLoader();

    // Procedural STARFIELD (Reliable space background)
    megaScene.add(createStarfield());

    // HIGH RES Earth
    const geometry = new THREE.SphereGeometry(1, 64, 64);
    const earthTexture = textureLoader.load(TEXTURES.earth);
    const bumpMap = textureLoader.load(TEXTURES.bump);
    
    const material = new THREE.MeshPhongMaterial({
        map: earthTexture,
        bumpMap: bumpMap,
        bumpScale: 0.05,
        shininess: 15,
        color: 0x5a88c3 // Brighter base fallback
    });
    megaEarth = new THREE.Mesh(geometry, material);
    megaScene.add(megaEarth);

    // Clouds
    const cloudGeom = new THREE.SphereGeometry(1.02, 64, 64);
    const cloudTexture = textureLoader.load(TEXTURES.clouds);
    const cloudMat = new THREE.MeshPhongMaterial({
        map: cloudTexture,
        transparent: true,
        opacity: 0.35
    });
    const clouds = new THREE.Mesh(cloudGeom, cloudMat);
    megaScene.add(clouds);

    // Atmosphere Glow (Mega) - Subtler
    const atmosphereGeom = new THREE.SphereGeometry(1.12, 64, 64);
    const atmosphereMat = new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.BackSide,
        uniforms: {
            glowColor: { value: new THREE.Color(0x00d2ff) },
            viewVector: { value: megaCamera.position }
        },
        vertexShader: `
            varying float intensity;
            void main() {
                vec3 vNormal = normalize(normalMatrix * normal);
                vec3 vNormel = normalize(normalMatrix * vec3(0.0, 0.0, 1.0));
                intensity = pow(0.6 - dot(vNormal, vNormel), 6.0);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 glowColor;
            varying float intensity;
            void main() {
                gl_FragColor = vec4(glowColor, intensity * 0.5);
            }
        `
    });
    const atmosphere = new THREE.Mesh(atmosphereGeom, atmosphereMat);
    megaScene.add(atmosphere);

        // Lights - BRIGHTER
        const mainLight = new THREE.DirectionalLight(0xffffff, 3);
        mainLight.position.set(5, 5, 5);
        megaScene.add(mainLight);

        const backLight = new THREE.DirectionalLight(0xffffff, 1);
        backLight.position.set(-5, -2, -5);
        megaScene.add(backLight);

        megaScene.add(new THREE.AmbientLight(0x666666));

        // 3D Satellite Model (Mega)
        megaSatGroup = createSatelliteModel();
        megaSatGroup.scale.set(0.04, 0.04, 0.04); // Significantly smaller for realism
        megaEarth.add(megaSatGroup); // Parent to Earth

        // Initial position (Use cached or default orbit)
        updateEarthSatPos(window.lastLat || 0, window.lastLon || 0, window.lastAlt || 400);

        // Interaction
        container.addEventListener('mousedown', (e) => { 
            isDragging = true;
            previousMousePosition = { x: e.clientX, y: e.clientY };
        });
        window.addEventListener('mouseup', (e) => { isDragging = false; });
        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const deltaMove = {
                x: e.clientX - previousMousePosition.x,
                y: e.clientY - previousMousePosition.y
            };
            
            megaEarth.rotation.y += deltaMove.x * 0.005;
            megaEarth.rotation.x += deltaMove.y * 0.005;
            clouds.rotation.y += deltaMove.x * 0.0055;
            clouds.rotation.x += deltaMove.y * 0.0005;

            previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        // Zoom
        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            megaCamera.position.z += e.deltaY * 0.005;
            megaCamera.position.z = Math.max(1.8, Math.min(10, megaCamera.position.z));
        });

        function animateMega() {
            requestAnimationFrame(animateMega);
            if (!isDragging) {
                megaEarth.rotation.y += 0.001;
                clouds.rotation.y += 0.0012;
                clouds.rotation.x += 0.0002;
            }
            // Keep satellite oriented towards center
            if (megaSatGroup) {
                megaSatGroup.lookAt(0, 0, 0);
                // Handle binary flashing beacon (on for 400ms, off for 400ms)
                const beacon = megaSatGroup.getObjectByName('satellite_beacon');
                if (beacon) {
                    beacon.material.emissiveIntensity = (Date.now() % 800 < 400) ? 5 : 0;
                }
            }
            megaRenderer.render(megaScene, megaCamera);
        }
        animateMega();

        // Resize handler
        window.addEventListener('resize', () => {
            if (!megaRenderer || !megaCamera || !container) return;
            const w = container.clientWidth;
            const h = container.clientHeight;
            megaCamera.aspect = w / h;
            megaCamera.updateProjectionMatrix();
            megaRenderer.setSize(w, h);
        });
    }, 100);
}

export function updateEarthSatPos(lat, lon, alt) {
    if (!miniSatGroup && !megaSatGroup) return;

    // Cache for modal re-opening
    window.lastLat = lat;
    window.lastLon = lon;
    window.lastAlt = alt;

    // Default to last known or 0,0 orbit if null
    const safeLat = lat != null ? lat : (window.lastLat || 0);
    const safeLon = lon != null ? lon : (window.lastLon || 0);
    const safeAlt = alt != null ? alt : (window.lastAlt || 400);

    // Convert lat/lon to 3D Cartesian
    // Since it's a child of Earth, we use the local spherical coords.
    // Three.js Lat/Lon to Cartesian mapping (Standard)
    const phi = (90 - safeLat) * (Math.PI / 180);
    const theta = (safeLon + 180) * (Math.PI / 180); 

    const r = 1.0 + (safeAlt / 6371) + 0.01; 

    // Spherical to Cartesian (Standard alignment for Three.js Sphere + Equirectangular map)
    const x = -r * Math.sin(phi) * Math.cos(theta);
    const z = r * Math.sin(phi) * Math.sin(theta);
    const y = r * Math.cos(phi);

    if (miniSatGroup) {
        miniSatGroup.position.set(x, y, z);
        miniSatGroup.lookAt(0,0,0);
        miniSatGroup.scale.set(0.24, 0.24, 0.24); // Middle ground scale
    }
    if (megaSatGroup) {
        megaSatGroup.position.set(x, y, z);
        megaSatGroup.lookAt(0,0,0);
        megaSatGroup.scale.set(0.16, 0.16, 0.16); // Middle ground scale
    }
}
