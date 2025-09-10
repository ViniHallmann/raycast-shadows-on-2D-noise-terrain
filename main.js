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

    const shaderParams = {
        terrainVariation: 0.015,
        waterLevel: 0.1,
        sandLevel: 0.18,
        grassLevel: 0.45,
        forestLevel: 0.6,
        rockLevel: 0.7,
        snowLevel: 0.9,
        slopeStart: 0.85,
        shadowIntensity: 0.5,
        shadowSteps: 225,
        shadowPenumbra: 0.02,
        waveAmplitude: 0.002,
        waveFrequency: 8.0,
        waveSpeed: 0.01,
        specularPower: 32.0,
        specularIntensity: 0.4,
        biomeFreq1: 50.0,
        biomeFreq2: 150.0,
        shadowStepSize: 0.01,
        shadowColor: [0.35, 0.35, 0.45],
        waveAngle: 0.5,
        foamSpeed: 5.0,
        foamFrequency: 500,
        foamIntensity: 0.25,
    };

    const noiseParams = {
        octaves: 4,
        scale: 1.6,
        persistence: 0.5,
        lacunarity: 2.0,
        noiseZoom: 5.0,
        gradientCurve: 0.8,
    };

    const brushParams = {
        brushSize: 50,
        brushIntensity: 0.005,
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
    let voronoiTexture = null;

    function regenerateNoise() {
        baseNoiseData = noiseGenerator.generate(noiseParams);
    }

    const controls = {
        octaves:          { slider: document.getElementById('octaves'), valueLabel: document.getElementById('octaves-value') },
        scale:            { slider: document.getElementById('scale'), valueLabel: document.getElementById('scale-value') },
        persistence:      { slider: document.getElementById('persistence'), valueLabel: document.getElementById('persistence-value') },
        lacunarity:       { slider: document.getElementById('lacunarity'), valueLabel: document.getElementById('lacunarity-value') },
        noiseZoom:        { slider: document.getElementById('noise-zoom'), valueLabel: document.getElementById('noise-zoom-value') },
        gradientCurve:    { slider: document.getElementById('gradient-curve'), valueLabel: document.getElementById('gradient-curve-value') },
        terrainVariation: { slider: document.getElementById('terrain-variation'), valueLabel: document.getElementById('terrain-variation-value') },
        waterLevel:       { slider: document.getElementById('water-level'), valueLabel: document.getElementById('water-level-value') },
        sandLevel:        { slider: document.getElementById('sand-level'), valueLabel: document.getElementById('sand-level-value') },
        grassLevel:       { slider: document.getElementById('grass-level'), valueLabel: document.getElementById('grass-level-value') },
        forestLevel:      { slider: document.getElementById('forest-level'), valueLabel: document.getElementById('forest-level-value') },
        rockLevel:        { slider: document.getElementById('rock-level'), valueLabel: document.getElementById('rock-level-value') },
        snowLevel:        { slider: document.getElementById('snow-level'), valueLabel: document.getElementById('snow-level-value') },
        slopeStart:       { slider: document.getElementById('slope-start'), valueLabel: document.getElementById('slope-start-value') },
        brushSize:        { slider: document.getElementById('brush-size'), valueLabel: document.getElementById('brush-size-value') },
        brushIntensity:   { slider: document.getElementById('brush-intensity'), valueLabel: document.getElementById('brush-intensity-value') },
        shadowIntensity:  { slider: document.getElementById('shadow-intensity'), valueLabel: document.getElementById('shadow-intensity-value') },
        shadowSteps:      { slider: document.getElementById('shadow-steps'), valueLabel: document.getElementById('shadow-steps-value') },
        shadowPenumbra:   { slider: document.getElementById('shadow-penumbra'), valueLabel: document.getElementById('shadow-penumbra-value') },
        waveAmplitude:    { slider: document.getElementById('wave-amplitude'), valueLabel: document.getElementById('wave-amplitude-value') },
        waveFrequency:    { slider: document.getElementById('wave-frequency'), valueLabel: document.getElementById('wave-frequency-value') },
        waveSpeed:        { slider: document.getElementById('wave-speed'), valueLabel: document.getElementById('wave-speed-value') },
        sunHeight:         { slider: document.getElementById('sun-height'), valueLabel: document.getElementById('sun-height-value') },
        specularPower:     { slider: document.getElementById('specular-power'), valueLabel: document.getElementById('specular-power-value') },
        specularIntensity: { slider: document.getElementById('specular-intensity'), valueLabel: document.getElementById('specular-intensity-value') },
        biomeFreq1:        { slider: document.getElementById('biome-freq1'), valueLabel: document.getElementById('biome-freq1-value') },
        biomeFreq2:        { slider: document.getElementById('biome-freq2'), valueLabel: document.getElementById('biome-freq2-value') },
        shadowStepSize:     { slider: document.getElementById('shadow-step-size'), valueLabel: document.getElementById('shadow-step-size-value') },
        shadowColorR:       { slider: document.getElementById('shadow-color-r'), valueLabel: document.getElementById('shadow-color-r-value') },
        shadowColorG:       { slider: document.getElementById('shadow-color-g'), valueLabel: document.getElementById('shadow-color-g-value') },
        shadowColorB:       { slider: document.getElementById('shadow-color-b'), valueLabel: document.getElementById('shadow-color-b-value') },
        waveAngle:          { slider: document.getElementById('wave-angle'), valueLabel: document.getElementById('wave-angle-value') },
        foamSpeed:          { slider: document.getElementById('foam-speed'), valueLabel: document.getElementById('foam-speed-value') },
        foamFrequency:      { slider: document.getElementById('foam-frequency'), valueLabel: document.getElementById('foam-frequency-value') },
        foamIntensity:      { slider: document.getElementById('foam-intensity'), valueLabel: document.getElementById('foam-intensity-value') },
    };

    function setupControlListener(controlName, paramsObject) {
        const { slider, valueLabel } = controls[controlName];
        slider.addEventListener('input', (event) => {
            const value = parseFloat(event.target.value);
            paramsObject[controlName] = value;

            if (controlName === 'brushIntensity' || controlName === 'terrainVariation' || controlName === 'shadowPenumbra' || controlName === 'waveSpeed') {
                valueLabel.textContent = value.toFixed(3);
            } else if (controlName === 'waveAmplitude') {
                valueLabel.textContent = value.toFixed(4);
            } else if (['brushSize', 'octaves', 'shadowSteps', 'specularPower', 'biomeFreq1', 'biomeFreq2', 'foamFrequency'].includes(controlName)) {
                valueLabel.textContent = value.toFixed(0);
            } else {
                valueLabel.textContent = value.toFixed(2);
            }

            if (paramsObject === noiseParams) {
                regenerateNoise();
            }
        });
    }
    ['octaves', 'scale', 'persistence', 'lacunarity', 'noiseZoom', 'gradientCurve'].forEach(name => {
        setupControlListener(name, noiseParams);
    });

    ['terrainVariation', 'shadowIntensity', 'shadowSteps', 'shadowPenumbra', 'shadowStepSize',
    'waveAmplitude', 'waveFrequency', 'waveSpeed', 'waveAngle',
    'specularPower', 'specularIntensity',
    'biomeFreq1', 'biomeFreq2',
    'foamSpeed', 'foamFrequency', 'foamIntensity'
    ].forEach(name => {
        setupControlListener(name, shaderParams);
    });
    ['brushSize', 'brushIntensity'].forEach(name => {
        setupControlListener(name, brushParams);
    });

    ['waterLevel', 'sandLevel', 'grassLevel', 'forestLevel', 'rockLevel', 'snowLevel', 'slopeStart'].forEach(name => {
        setupControlListener(name, shaderParams);
    });

    controls.sunHeight.slider.addEventListener('input', (event) => {
        const value = parseFloat(event.target.value);
        sunPosition.y = value;
        controls.sunHeight.valueLabel.textContent = value.toFixed(2);
    });

    controlsContainer.addEventListener('mouseenter', () => {
        isMouseOverUI = true;
    });
    controlsContainer.addEventListener('mouseleave', () => {
        isMouseOverUI = false;
    });
    
    function updateShadowColor() {
        shaderParams.shadowColor = [
            parseFloat(controls.shadowColorR.slider.value),
            parseFloat(controls.shadowColorG.slider.value),
            parseFloat(controls.shadowColorB.slider.value)
        ];
        controls.shadowColorR.valueLabel.textContent = shaderParams.shadowColor[0].toFixed(2);
        controls.shadowColorG.valueLabel.textContent = shaderParams.shadowColor[1].toFixed(2);
        controls.shadowColorB.valueLabel.textContent = shaderParams.shadowColor[2].toFixed(2);
    }

    controls.shadowColorR.slider.addEventListener('input', updateShadowColor);
    controls.shadowColorG.slider.addEventListener('input', updateShadowColor);
    controls.shadowColorB.slider.addEventListener('input', updateShadowColor);

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

        noiseGenerator.modifyTerrain(modificationMap, textureX, textureY, brushParams.brushSize, brushParams.brushIntensity, terrainAction);

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

    async function loadTexture(url) {
        return new Promise((resolve) => {
            const texture = renderer.gl.createTexture();
            const image = new Image();
            image.onload = () => {
                renderer.gl.bindTexture(renderer.gl.TEXTURE_2D, texture);
                renderer.gl.texImage2D(renderer.gl.TEXTURE_2D, 0, renderer.gl.RGBA, 
                                       renderer.gl.RGBA, renderer.gl.UNSIGNED_BYTE, image);
                renderer.gl.texParameteri(renderer.gl.TEXTURE_2D, renderer.gl.TEXTURE_WRAP_S, renderer.gl.REPEAT);
                renderer.gl.texParameteri(renderer.gl.TEXTURE_2D, renderer.gl.TEXTURE_WRAP_T, renderer.gl.REPEAT);
                renderer.gl.texParameteri(renderer.gl.TEXTURE_2D, renderer.gl.TEXTURE_MIN_FILTER, renderer.gl.LINEAR);
                renderer.gl.texParameteri(renderer.gl.TEXTURE_2D, renderer.gl.TEXTURE_MAG_FILTER, renderer.gl.LINEAR);
                renderer.gl.generateMipmap(renderer.gl.TEXTURE_2D);
                resolve(texture);
            };
            image.src = url;
        });
    }
    
    try {
        voronoiTexture = await loadTexture('voronoi2.png');
        console.log("Voronoi texture loaded successfully");
    } catch (error) {
        console.error("Failed to load voronoi texture:", error);
        voronoiTexture = renderer.gl.createTexture();
        renderer.gl.bindTexture(renderer.gl.TEXTURE_2D, voronoiTexture);
        renderer.gl.texImage2D(renderer.gl.TEXTURE_2D, 0, renderer.gl.RGBA, 1, 1, 0, renderer.gl.RGBA, renderer.gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
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

        renderer.render(noiseData, voronoiTexture, sunPosition, sunColor, performance.now() / 1000, shaderParams);
        requestAnimationFrame(animate);
    }

    animate();
}

main();