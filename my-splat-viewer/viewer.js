// my-splat-viewer/viewer.js

// NEW: Import OrbitControls from node_modules. Note the 'three/examples/jsm/' path.
import { OrbitControls } from './node_modules/three/examples/jsm/controls/OrbitControls.js';

// IMPORTANT: We still do NOT import THREE here. It's loaded globally in index.html.

// This is the main function that sets up your 3D viewer.
// It's exported so index.html can call it.
// Note: THREE is now assumed to be a global variable due to index.html's script tag.
export async function initSplatViewer(canvas, loadingOverlay, loadingBar) {
    // --- Scene Setup ---
    const scene = new THREE.Scene(); // Create a new 3D scene (THREE is global here)
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000); // Create a camera
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true }); // Create a WebGL renderer
    renderer.setSize(window.innerWidth, window.innerHeight); // Set renderer size to full window
    renderer.setPixelRatio(window.devicePixelRatio); // Adjust for high-resolution screens

    // --- Basic Lighting (for non-splat objects, like our placeholder box) ---
    scene.add(new THREE.AmbientLight(0x404040)); // Soft ambient light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8); // Directional light (like the sun)
    directionalLight.position.set(1, 1, 1).normalize(); // Position the light
    scene.add(directionalLight);

    // --- Camera Controls (OrbitControls allow you to drag and zoom) ---
    const controls = new OrbitControls(camera, renderer.domElement); // Create controls for the camera
    controls.enableDamping = true; // Makes camera movement smoother
    controls.dampingFactor = 0.05; // How much damping
    controls.screenSpacePanning = false; // Prevents camera from panning through the scene center
    controls.minDistance = 0.5; // Closest you can zoom in
    controls.maxDistance = 50; // Farthest you can zoom out
    controls.target.set(0, 0, 0); // Where the camera initially looks
    camera.position.set(0, 1.5, 3); // Initial camera position

    // --- Camera Bounding Box Definition ---
    // These values define the min/max X, Y, Z coordinates the camera is allowed to move within.
    // Adjust these numbers based on the size and location of your Gaussian Splat scene.
    const minCameraX = -5; // Minimum X coordinate for the camera
    const maxCameraX = 5;  // Maximum X coordinate for the camera
    const minCameraY = -1; // Minimum Y coordinate (allow slightly below ground)
    const maxCameraY = 5;  // Maximum Y coordinate
    const minCameraZ = -5; // Minimum Z coordinate
    const maxCameraZ = 5;  // Maximum Z coordinate

    // Create a Three.js Box3 object to represent the bounding box
    const cameraBoundingBox = new THREE.Box3(
        new THREE.Vector3(minCameraX, minCameraY, minCameraZ),
        new THREE.Vector3(maxCameraX, maxCameraY, maxCameraZ)
    );

    // --- Placeholder for Gaussian Splat Loading ---
    // IMPORTANT: This function currently just simulates loading a simple box.
    // YOU WILL NEED TO REPLACE THIS with actual code to load and parse your .ply file
    // once you confirm the basic setup is working.
    async function loadSplatPlaceholder(url, onProgress) {
        return new Promise(resolve => {
            let progress = 0;
            const interval = setInterval(() => {
                progress += 10; // Increment progress by 10%
                onProgress(progress / 100); // Call the progress callback
                if (progress >= 100) {
                    clearInterval(interval); // Stop the interval when 100%
                    // Create a simple wireframe box as a visual placeholder
                    const geometry = new THREE.BoxGeometry(2, 2, 2); // A 2x2x2 unit box
                    const material = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true });
                    const splatMesh = new THREE.Mesh(geometry, material);
                    resolve(splatMesh); // Resolve the promise with the placeholder mesh
                }
            }, 100); // Update every 100 milliseconds
        });
    }

    // --- Load the Splat (or placeholder) ---
    const splatUrl = './your_splat_file.ply'; // The name of your .ply file in the main folder
    let splatMesh = null; // Variable to hold the loaded 3D object

    try {
        // Call the loading function and update the loading bar
        splatMesh = await loadSplatPlaceholder(splatUrl, (progress) => {
            loadingBar.style.width = `${progress * 100}%`;
        });
        scene.add(splatMesh); // Add the loaded object to the scene
        loadingOverlay.style.display = 'none'; // Hide the loading screen
    } catch (error) {
        console.error("Failed to load splat:", error);
        // Show an error message if loading fails
        loadingOverlay.innerHTML = `<div style="color:red;">Error loading splat: ${error.message}. <br>Please ensure 'your_splat_file.ply' exists and is valid.</div>`;
    }

    // --- Keyboard Controls (for arrow key movement) ---
    const keyState = {}; // Object to track which keys are pressed
    document.addEventListener('keydown', (event) => {
        keyState[event.key] = true; // Mark key as pressed
    });
    document.addEventListener('keyup', (event) => {
        keyState[event.key] = false; // Mark key as released
    });

    const moveSpeed = 0.05; // How fast the camera moves with arrow keys

    // Function to update camera position based on arrow keys
    function updateCameraMovement() {
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection); // Get the direction the camera is looking

        const right = new THREE.Vector3();
        right.crossVectors(cameraDirection, camera.up); // Get the camera's right direction

        let moved = false; // Flag to check if camera actually moved
        if (keyState['ArrowUp']) {
            camera.position.addScaledVector(cameraDirection, moveSpeed); // Move forward
            moved = true;
        }
        if (keyState['ArrowDown']) {
            camera.position.addScaledVector(cameraDirection, -moveSpeed); // Move backward
            moved = true;
        }
        if (keyState['ArrowLeft']) {
                camera.position.addScaledVector(right, -moveSpeed); // Move left
            moved = true;
        }
        if (keyState['ArrowRight']) {
            camera.position.addScaledVector(right, moveSpeed); // Move right
            moved = true;
        }

        if (moved) {
            // After moving, make sure camera stays within the defined bounds
            camera.position.clamp(cameraBoundingBox.min, cameraBoundingBox.max);
            // Also, update the OrbitControls target to follow the clamped position
            controls.target.copy(camera.position);
            controls.update(); // Update controls to reflect manual camera position change
        }
    }


    // --- Animation Loop ---
    // This function runs continuously to render the scene
    function animate() {
        requestAnimationFrame(animate); // Request the next animation frame

        controls.update(); // Update OrbitControls (for mouse interaction)

        updateCameraMovement(); // Update camera based on arrow keys and apply bounds

        // This ensures the camera *always* stays within bounds, even after OrbitControls updates
        const currentCameraPosition = camera.position.clone();
        camera.position.clamp(cameraBoundingBox.min, cameraBoundingBox.max);

        // If clamping occurred (camera was pushed back into bounds), adjust the target
        // to prevent unexpected camera jumps or rotations.
        if (!currentCameraPosition.equals(camera.position)) {
            const delta = currentCameraPosition.sub(camera.position); // How much it moved back
            controls.target.sub(delta); // Adjust target by the same amount
            controls.update(); // Recalculate controls based on new target
        }

        renderer.render(scene, camera); // Render the scene with the camera
    }

    animate(); // Start the animation loop

    // --- Handle Window Resizing ---
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight; // Update camera aspect ratio
        camera.updateProjectionMatrix(); // Update camera projection
        renderer.setSize(window.innerWidth, window.innerHeight); // Resize renderer
    });
}