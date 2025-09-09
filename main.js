import { Renderer } from './renderer.js';
import { NoiseGenerator } from './noise-generator.js';

const sunriseColor = [0.6, 0.7, 1.0]; 
const middayColor  = [1.0, 1.0, 0.95];
const sunsetColor  = [1.0, 0.6, 0.4];

async function main() {
    const canvas = document.getElementById("gl-canvas");
    const controlsContainer = document.getElementById('controls');
    const renderer = new Renderer(canvas);
    
    const noiseGenerator = new NoiseGenerator(512, 512);
    
    const noiseParams = {
        octaves: 4,
        scale: 1.6,
        persistence: 0.5,
        lacunarity: 2.0,
    };
    let baseNoiseData = noiseGenerator.generate(noiseParams);
    let modificationMap = new Float32Array(512 * 512).fill(0);
    let noiseData = new Float32Array(512 * 512);

    const sunPosition = { x: 0.5, y: 2.0, z: 0.5 };
    let sunColor = [1.0, 1.0, 0.95];
    let isModifyingTerrain = false;
    let terrainAction = 'add';
    let lastMousePosition = { x: 0, y: 0 };
    let isMouseOverUI = false;

    function regenerateNoise() {
        baseNoiseData = noiseGenerator.generate(noiseParams);
    }

    const controls = {
        octaves:     { slider: document.getElementById('octaves'), valueLabel: document.getElementById('octaves-value') },
        scale:       { slider: document.getElementById('scale'), valueLabel: document.getElementById('scale-value') },
        persistence: { slider: document.getElementById('persistence'), valueLabel: document.getElementById('persistence-value') },
        lacunarity:  { slider: document.getElementById('lacunarity'), valueLabel: document.getElementById('lacunarity-value') },
    };

    function setupControlListener(controlName) {
        const { slider, valueLabel } = controls[controlName];
        slider.addEventListener('input', (event) => {
            const value = parseFloat(event.target.value);
            noiseParams[controlName] = value;
            valueLabel.textContent = value.toFixed(2);
            regenerateNoise();
        });
    }
    Object.keys(controls).forEach(setupControlListener);
    controlsContainer.addEventListener('mouseenter', () => {
        isMouseOverUI = true;
    });
    controlsContainer.addEventListener('mouseleave', () => {
        isMouseOverUI = false;
    });
    

    function resizeCanvas() {
        const displayWidth  = canvas.clientWidth;
        const displayHeight = canvas.clientHeight;

        if (canvas.width  !== displayWidth || canvas.height !== displayHeight) {
            canvas.width  = displayWidth;
            canvas.height = displayHeight;
            renderer.gl.viewport(0, 0, canvas.width, canvas.height);
        }
    }

    window.addEventListener('resize', resizeCanvas, false);
    resizeCanvas();

    function modifyIsland(normalizedX, normalizedY) {
        const textureX = Math.floor(normalizedX * 512);
        const textureY = Math.floor(normalizedY * 512);

        const brushSize = 50;
        const intensity = 0.005;
        noiseGenerator.modifyTerrain(modificationMap, textureX, textureY, brushSize, intensity, terrainAction);
    }
    
    function handleMousePosition(event) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        const normalizedX = mouseX / canvas.clientWidth;
        const normalizedY = 1.0 - (mouseY / canvas.clientHeight);

        lastMousePosition.x = normalizedX;
        lastMousePosition.y = normalizedY;
        
        sunPosition.x = normalizedX;
        sunPosition.z = normalizedY; 

        if (sunPosition.x < 0.5) {
            const t = sunPosition.x * 2.0; 
            sunColor = [
                sunriseColor[0] * (1 - t) + middayColor[0] * t,
                sunriseColor[1] * (1 - t) + middayColor[1] * t,
                sunriseColor[2] * (1 - t) + middayColor[2] * t,
            ];
        } else {
            const t = (sunPosition.x - 0.5) * 2.0; 
            sunColor = [
                middayColor[0] * (1 - t) + sunsetColor[0] * t,
                middayColor[1] * (1 - t) + sunsetColor[1] * t,
                middayColor[2] * (1 - t) + sunsetColor[2] * t,
            ];
        }

        if (isModifyingTerrain) { modifyIsland(sunPosition.x, sunPosition.z); }
    }

    window.addEventListener('mousedown', (event) => {
        if (isMouseOverUI) {
            return;
        }
        
        isModifyingTerrain = true;
        if (event.button === 0) {
            terrainAction = 'add';
        } else if (event.button === 1) {
            terrainAction = 'remove';
        }
        handleMousePosition(event);
    });

    window.addEventListener('mouseup', () => {
        isModifyingTerrain = false;
    });

    window.addEventListener('mousemove', (event) => {
        handleMousePosition(event);
    });

    // canvas.addEventListener('contextmenu', (event) => {
    //     event.preventDefault();
    // });

    function animate() {

        if (isModifyingTerrain) {
            modifyIsland(lastMousePosition.x, lastMousePosition.y);
        }

        for (let i = 0; i < baseNoiseData.length; i++) {
            const combinedHeight = baseNoiseData[i] + modificationMap[i];
            noiseData[i] = Math.max(0.0, Math.min(combinedHeight, 1.0));
        }

        renderer.render(noiseData, sunPosition, sunColor, performance.now() / 1000);
        requestAnimationFrame(animate);
    }

    animate();
}

main();