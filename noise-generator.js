import { createNoise2D } from 'https://cdn.skypack.dev/simplex-noise';

export class NoiseGenerator {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.noise2D = createNoise2D();
    }

    generate(params) {
        const { scale, octaves, persistence, lacunarity } = params;

        const data = new Float32Array(this.width * this.height);
        const centerX = this.width / 2;
        const centerY = this.height / 2;

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                
                let total = 0;
                let frequency = 1.0;
                let amplitude = 1.0;
                let maxValue = 0;

                for (let i = 0; i < octaves; i++) {
                    const nx = (x / this.width) * frequency;
                    const ny = (y / this.height) * frequency;

                    total += this.noise2D(nx * 5, ny * 5) * amplitude;
                    
                    maxValue += amplitude;
                    amplitude *= persistence;
                    frequency *= lacunarity;
                }

                let value = (total / maxValue + 1) / 2;

                const dx = x - centerX;
                const dy = y - centerY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
                
                let normalizedDistance = distance / maxDistance;
                normalizedDistance = Math.min(normalizedDistance * scale, 1.0);

                const gradient = 1.0 - normalizedDistance;

                value = Math.pow(value, 0.8); 
                value = value - (1.0 - gradient);

                data[y * this.width + x] = value;
            }
        }
        return data;
    }

    modifyTerrain(data, brushX, brushY, brushSize, intensity, action) {
        const startX = Math.max(0, brushX - brushSize);
        const endX = Math.min(this.width - 1, brushX + brushSize);
        const startY = Math.max(0, brushY - brushSize);
        const endY = Math.min(this.height - 1, brushY + brushSize);

        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                const dx = x - brushX;
                const dy = y - brushY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < brushSize) {
                    const falloff = 1.0 - (distance / brushSize);
                    const noiseModulation = this.noise2D(x / 50, y / 50);
                    const modulatedIntensity = intensity + (intensity * noiseModulation * 0.5); 

                    const index = y * this.width + x;
                    if (action === 'add') {
                        data[index] += modulatedIntensity * falloff;
                    } else if (action === 'remove') {
                        data[index] -= modulatedIntensity * falloff;
                    }
                    
                }
            }
        }
    }
}