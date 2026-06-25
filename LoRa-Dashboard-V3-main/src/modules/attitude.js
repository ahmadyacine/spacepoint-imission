
let miniScene, miniCamera, miniRenderer, miniSat;
let megaScene, megaCamera, megaRenderer, megaSat;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

export function initAttitudeViz() {
    const miniContainer = document.getElementById('sat-viz-3d');
    if (!miniContainer) return;

    // Reset container (remove CSS satellite)
    miniContainer.innerHTML = '';
    miniContainer.style.background = 'transparent';
    miniContainer.style.overflow = 'visible';

    // Click to open modal
    miniContainer.parentElement.onclick = openAttitudeModal;

    // Mini View
    const width = 180;
    const height = 120;
    miniScene = new THREE.Scene();
    miniCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    miniCamera.position.set(1, 1, 1);
    miniCamera.lookAt(0, 0, 0);

    miniRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    miniRenderer.setSize(width, height);
    miniRenderer.setPixelRatio(window.devicePixelRatio);
    miniContainer.appendChild(miniRenderer.domElement);

    // CubeSat Model (High Detail)
    miniSat = createDetailedSatellite();
    miniScene.add(miniSat);

    // Lights
    const light = new THREE.DirectionalLight(0xffffff, 1.5);
    light.position.set(5, 5, 5);
    miniScene.add(light);
    miniScene.add(new THREE.AmbientLight(0x444444));

    function animateMini() {
        requestAnimationFrame(animateMini);
        // Handle binary flashing beacon (on for 400ms, off for 400ms)
        if (miniSat) {
            const beacon = miniSat.getObjectByName('satellite_beacon');
            if (beacon) {
                beacon.material.emissiveIntensity = (Date.now() % 800 < 400) ? 5 : 0;
            }
            // Continuous Cinematic Rotation
            miniSat.rotation.y += 0.003;
            miniSat.rotation.x += 0.001;
        }
        miniRenderer.render(miniScene, miniCamera);
    }
    animateMini();
    
    // Resize handler for initial check
    window.addEventListener('resize', () => {
        const w = miniContainer.clientWidth || 180;
        const h = miniContainer.clientHeight || 120;
        miniRenderer.setSize(w, h);
    });
}

function createDetailedSatellite() {
    const group = new THREE.Group();
    
    // --- Procedural Textures ---
    const createTexture = (color1, color2, size=256, isSolar=false) => {
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = color1;
        ctx.fillRect(0, 0, size, size);
        
        if (isSolar) {
            ctx.strokeStyle = color2;
            ctx.lineWidth = 2;
            for(let i=0; i<=size; i+=32) {
                ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
            }
            // Shimmer / Hex grid feel
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            for(let i=0; i<30; i++) ctx.fillRect(Math.random()*size, Math.random()*size, 4, 4);
        } else {
            // Electronics / Greeble texture
            ctx.strokeStyle = color2;
            ctx.lineWidth = 1;
            for(let i=0; i<40; i++) {
                ctx.strokeRect(Math.random()*size, Math.random()*size, Math.random()*40, Math.random()*40);
            }
        }
        return new THREE.CanvasTexture(canvas);
    };

    const solarTex = createTexture('#0a1a3a', '#4da3ff', 256, true);
    const bodyTex = createTexture('#1a1a1a', '#333333', 256, false);

    // --- Main Body (The Bus) ---
    // Using a multi-material approach for the box
    const bodyGeom = new THREE.BoxGeometry(0.5, 0.6, 0.5);
    const goldMat = new THREE.MeshStandardMaterial({ 
        color: 0xffd700, metalness: 0.9, roughness: 0.2, emissive: 0x110800 
    });
    const panelMat = new THREE.MeshStandardMaterial({ map: bodyTex, metalness: 0.5, roughness: 0.5 });
    
    // Front/Back = gold foil, Sides = component panels
    const bodyMats = [panelMat, panelMat, goldMat, goldMat, panelMat, panelMat];
    const body = new THREE.Mesh(bodyGeom, bodyMats);
    group.add(body);

    // Frame / Exoskeleton
    const frameGeom = new THREE.BoxGeometry(0.52, 0.62, 0.52);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 1, roughness: 0.2, wireframe: true });
    group.add(new THREE.Mesh(frameGeom, frameMat));

    // --- Solar Wings ---
    const wingGroup = new THREE.Group();
    const panelGeom = new THREE.BoxGeometry(1.2, 0.4, 0.02);
    const wingMat = new THREE.MeshStandardMaterial({ 
        map: solarTex, metalness: 0.8, roughness: 0.1, transparent: true, opacity: 0.95 
    });
    
    [-0.85, 0.85].forEach(x => {
        const wing = new THREE.Mesh(panelGeom, wingMat);
        wing.position.x = x;
        // Panel struts
        const strutGeom = new THREE.CylinderGeometry(0.01, 0.01, 0.4);
        const strutMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 1 });
        const strut = new THREE.Mesh(strutGeom, strutMat);
        strut.position.x = x > 0 ? -0.62 : 0.62;
        wing.add(strut);
        group.add(wing);
    });

    // --- Technical Assets (Greebles) ---
    
    // High-Gain Dish
    const dishArm = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.4), new THREE.MeshStandardMaterial({ color: 0xdddddd }));
    dishArm.position.y = 0.5;
    group.add(dishArm);

    const dish = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.3, roughness: 0.4, side: THREE.DoubleSide })
    );
    dish.position.y = 0.7;
    dish.rotation.x = Math.PI;
    group.add(dish);

    // Optical Payload (Camera)
    const cameraBody = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.15), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    cameraBody.position.set(0, 0, 0.26);
    cameraBody.rotation.x = Math.PI / 2;
    group.add(cameraBody);

    const lens = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 16), new THREE.MeshPhongMaterial({ 
        color: 0x00aaff, shininess: 100, transparent: true, opacity: 0.7 
    }));
    lens.position.set(0, 0, 0.33);
    group.add(lens);

    // Star Trackers (Small sensors)
    [ [0.2, 0.2, 0.25], [-0.2, 0.2, 0.25] ].forEach(pos => {
        const tracker = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), new THREE.MeshStandardMaterial({ color: 0x111111 }));
        tracker.position.set(...pos);
        group.add(tracker);
    });

    // RCS Thruster Nozzles
    const nozzleGeom = new THREE.ConeGeometry(0.03, 0.08, 12);
    const nozzleMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 });
    for (let i = 0; i < 4; i++) {
        const nozzle = new THREE.Mesh(nozzleGeom, nozzleMat);
        nozzle.position.set(i % 2 ? 0.2 : -0.2, -0.3, i < 2 ? 0.2 : -0.2);
        nozzle.rotation.x = Math.PI;
        group.add(nozzle);
    }

    // Flashing Beacon
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), new THREE.MeshStandardMaterial({ 
        color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 2 
    }));
    beacon.position.set(0, 0.32, 0);
    beacon.name = 'satellite_beacon';
    group.add(beacon);

    return group;
}

export function openAttitudeModal() {
    const modal = document.getElementById('attitude-modal');
    if (!modal) return;
    modal.classList.remove('hidden');

    const container = document.getElementById('expanded-sat-container');
    if (!container) return;

    if (megaRenderer) return;

    setTimeout(() => {
        const w = container.clientWidth || 800;
        const h = container.clientHeight || 500;

        megaScene = new THREE.Scene();
        megaCamera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
        megaCamera.position.set(1.5, 1.5, 1.5);
        megaCamera.lookAt(0, 0, 0);

        megaRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        megaRenderer.setSize(w, h);
        megaRenderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(megaRenderer.domElement);

        // STARFIELD
        const starGeometry = new THREE.BufferGeometry();
        const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 });
        const starVertices = [];
        for (let i = 0; i < 2000; i++) {
            starVertices.push((Math.random()-0.5)*100, (Math.random()-0.5)*100, (Math.random()-0.5)*100);
        }
        starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
        megaScene.add(new THREE.Points(starGeometry, starMaterial));

        megaSat = createDetailedSatellite();
        megaScene.add(megaSat);

        // Lights
        const light = new THREE.DirectionalLight(0xffffff, 2);
        light.position.set(5, 5, 5);
        megaScene.add(light);
        megaScene.add(new THREE.AmbientLight(0x444444));

        // Interaction
        container.onmousedown = (e) => { isDragging = true; previousMousePosition = { x: e.clientX, y: e.clientY }; };
        window.onmouseup = () => { isDragging = false; };
        window.onmousemove = (e) => {
            if (!isDragging) return;
            const delta = { x: e.clientX - previousMousePosition.x, y: e.clientY - previousMousePosition.y };
            
            // Manual camera Orbit simulation
            const angleX = delta.y * 0.01;
            const angleY = delta.x * 0.01;
            
            // Rotating camera around satellite
            const pos = megaCamera.position;
            const x = pos.x * Math.cos(angleY) + pos.z * Math.sin(angleY);
            const z = pos.z * Math.cos(angleY) - pos.x * Math.sin(angleY);
            megaCamera.position.set(x, pos.y, z);
            megaCamera.lookAt(0, 0, 0);

            previousMousePosition = { x: e.clientX, y: e.clientY };
        };

        // Scroll to zoom
        container.onwheel = (e) => {
            e.preventDefault();
            const factor = e.deltaY * 0.005;
            megaCamera.position.multiplyScalar(1 + factor);
            megaCamera.position.clampScalar(0.8, 10);
            megaCamera.lookAt(0, 0, 0);
        };

        function animateMega() {
            requestAnimationFrame(animateMega);
            // Handle binary flashing beacon (on for 400ms, off for 400ms)
            if (megaSat) {
                const beacon = megaSat.getObjectByName('satellite_beacon');
                if (beacon) {
                    beacon.material.emissiveIntensity = (Date.now() % 800 < 400) ? 5 : 0;
                }
                // Continuous Cinematic Rotation
                if (!isDragging) {
                    megaSat.rotation.y += 0.003;
                    megaSat.rotation.x += 0.001;
                }
            }
            megaRenderer.render(megaScene, megaCamera);
        }
        animateMega();
    }, 100);
}

export function updateSatOrientation(roll, pitch, yaw) {
    // Convert degrees to radians
    const r = roll * (Math.PI / 180);
    const p = pitch * (Math.PI / 180);
    const y = yaw * (Math.PI / 180);

    if (miniSat) {
        miniSat.rotation.set(p, y, r); // Assuming Three.js X, Y, Z order
    }
    if (megaSat && !isDragging) {
        megaSat.rotation.set(p, y, r);
    }
}

window.closeAttitudeModal = () => {
    document.getElementById('attitude-modal').classList.add('hidden');
};
