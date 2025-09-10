export const vertexShaderSource = `#version 300 es
    in vec2 a_position;
    out vec2 v_texCoord;

    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_position * 0.5 + 0.5;
    }
`;

export const fragmentShaderSource = `#version 300 es
    precision highp float;

    uniform sampler2D u_noiseTexture;
    uniform sampler2D u_waterTexture;
    uniform vec3 u_sunPosition;
    uniform vec3 u_sunColor;
    uniform float u_time;

    uniform float u_shadowIntensity;
    uniform int u_shadowSteps;
    uniform float u_shadowPenumbra;
    uniform float u_shadowStepSize;
    uniform vec3 u_shadowColor;

    uniform float u_terrainVariation;

    uniform float u_waterLevel;
    uniform float u_sandLevel;
    uniform float u_grassLevel;
    uniform float u_forestLevel;
    uniform float u_rockLevel;
    uniform float u_snowLevel;
    uniform float u_slopeStart;

    uniform float u_waveAmplitude;
    uniform float u_waveFrequency;
    uniform float u_waveSpeed;

    uniform float u_specularPower;
    uniform float u_specularIntensity;

    uniform float u_biomeFreq1;
    uniform float u_biomeFreq2;

    uniform float u_waveAngle;
    uniform float u_foamSpeed;
    uniform float u_foamFrequency;
    uniform float u_foamIntensity;

    in vec2 v_texCoord;
    out vec4 outColor;

    vec4 getCoastalWaterColor() { return vec4(0.1, 0.6, 0.9, 1.0); }
    vec4 getDeepOceanColor()    { return vec4(0.0, 0.43, 0.69, 1.0); }

    vec4 getSandColor(float variation) {
        vec4 sand1 = vec4(0.95, 0.85, 0.65, 1.0); vec4 sand2 = vec4(0.9, 0.8, 0.55, 1.0);
        vec4 sand3 = vec4(0.98, 0.9, 0.75, 1.0); vec4 sand4 = vec4(0.85, 0.75, 0.5, 1.0);
        if (variation < 0.25) return mix(sand1, sand2, variation * 4.0);
        else if (variation < 0.5) return mix(sand2, sand3, (variation - 0.25) * 4.0);
        else if (variation < 0.75) return mix(sand3, sand4, (variation - 0.5) * 4.0);
        else return mix(sand4, sand1, (variation - 0.75) * 4.0);
    }
    vec4 getGrassColor(float variation) {
        vec4 grass1 = vec4(0.3, 0.8, 0.2, 1.0); vec4 grass2 = vec4(0.5, 0.85, 0.3, 1.0);
        vec4 grass3 = vec4(0.25, 0.7, 0.15, 1.0); vec4 grass4 = vec4(0.4, 0.75, 0.35, 1.0);
        if (variation < 0.25) return mix(grass1, grass2, variation * 4.0);
        else if (variation < 0.5) return mix(grass2, grass3, (variation - 0.25) * 4.0);
        else if (variation < 0.75) return mix(grass3, grass4, (variation - 0.5) * 4.0);
        else return mix(grass4, grass1, (variation - 0.75) * 4.0);
    }
    vec4 getForestColor(float variation) {
        vec4 forest1 = vec4(0.15, 0.6, 0.1, 1.0); vec4 forest2 = vec4(0.2, 0.5, 0.15, 1.0);
        vec4 forest3 = vec4(0.1, 0.55, 0.05, 1.0); vec4 forest4 = vec4(0.25, 0.45, 0.2, 1.0);
        if (variation < 0.25) return mix(forest1, forest2, variation * 4.0);
        else if (variation < 0.5) return mix(forest2, forest3, (variation - 0.25) * 4.0);
        else if (variation < 0.75) return mix(forest3, forest4, (variation - 0.5) * 4.0);
        else return mix(forest4, forest1, (variation - 0.75) * 4.0);
    }
    vec4 getRockColor(float variation) {
        vec4 rock1 = vec4(0.6, 0.6, 0.65, 1.0); vec4 rock2 = vec4(0.55, 0.5, 0.45, 1.0);
        vec4 rock3 = vec4(0.7, 0.7, 0.7, 1.0); vec4 rock4 = vec4(0.45, 0.4, 0.4, 1.0);
        if (variation < 0.25) return mix(rock1, rock2, variation * 4.0);
        else if (variation < 0.5) return mix(rock2, rock3, (variation - 0.25) * 4.0);
        else if (variation < 0.75) return mix(rock3, rock4, (variation - 0.5) * 4.0);
        else return mix(rock4, rock1, (variation - 0.75) * 4.0);
    }
    vec4 getSnowColor(float variation) {
        vec4 snow1 = vec4(0.98, 0.98, 1.0, 1.0); vec4 snow2 = vec4(0.95, 0.95, 0.98, 1.0);
        vec4 snow3 = vec4(0.92, 0.94, 0.98, 1.0);
        if (variation < 0.5) return mix(snow1, snow2, variation * 2.0);
        else return mix(snow2, snow3, (variation - 0.5) * 2.0);
    }
    
    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
    }

    float hash2(vec2 p) {
        return fract(sin(dot(p, vec2(41.123, 67.891))) * 23421.6789);
    }

    float easeOut(float x, float factor) {
        return clamp(1.0 - pow(1.0 - x, factor), 0.0, 1.0);
    }

    vec4 classifyTerrain(float height, vec2 worldPos) {
        float variation1 = hash(worldPos * u_biomeFreq1);
        float variation2 = hash2(worldPos * u_biomeFreq2);
        float combinedVariation = fract(variation1 + variation2 * 0.5);
        
        float randomFactor = (hash(gl_FragCoord.xy) * 2.0 - 1.0) * u_terrainVariation;;
        height += randomFactor;
        
        if (height < u_sandLevel)   return getSandColor(combinedVariation);
        if (height < u_grassLevel)  return getGrassColor(combinedVariation);
        if (height < u_forestLevel) return getForestColor(combinedVariation);
        if (height < u_rockLevel)   return getRockColor(combinedVariation);
        return getSnowColor(combinedVariation);
    }

    float getWaterNoise(vec2 position) {
        return u_waveAmplitude * (texture(u_waterTexture, fract(position * u_waveFrequency)).r * 2.0 - 1.0);
    }

    float getWaterLevel(vec2 position) {
        float t = u_time * u_waveSpeed;
        
        float waveHeight = getWaterNoise(position + t);
        
        float angle = u_waveAngle;
        mat2 rotationMatrix = mat2(cos(angle), sin(angle), -sin(angle), cos(angle));
        waveHeight += getWaterNoise(position * rotationMatrix - vec2(t, 0.0));
        
        return u_waterLevel + waveHeight;
    }

    vec3 getNormal(vec2 texCoord, float terrainHeight) {
        if (terrainHeight < u_waterLevel) {
            float pixel = 0.001; 
            float hL = getWaterLevel(texCoord - vec2(pixel, 0.0));
            float hR = getWaterLevel(texCoord + vec2(pixel, 0.0));
            float hD = getWaterLevel(texCoord - vec2(0.0, pixel));
            float hU = getWaterLevel(texCoord + vec2(0.0, pixel));
            
            return normalize(vec3(hL - hR, pixel * 2.0, hD - hU));
        }

        float pixel = 1.0 / 512.0;
        float hL = texture(u_noiseTexture, texCoord - vec2(pixel, 0.0)).r;
        float hR = texture(u_noiseTexture, texCoord + vec2(pixel, 0.0)).r;
        float hD = texture(u_noiseTexture, texCoord - vec2(0.0, pixel)).r;
        float hU = texture(u_noiseTexture, texCoord + vec2(0.0, pixel)).r;
        
        return normalize(vec3(hL - hR, 2.0 * pixel, hD - hU));
    }

    float calculateShadow(vec3 startPosition, vec3 lightDirection, out float outIntensity) {
        float inShadow = 0.0;
        float intensity = 1.0;
        float dist = 0.0;

        vec3 p = startPosition + lightDirection * u_shadowStepSize * 5.0;

        for (int i = 0; i <  u_shadowSteps; i++) {
            float heightAtPoint = texture(u_noiseTexture, p.xz).r;
            heightAtPoint = max(heightAtPoint, u_waterLevel);
            
            float occlusion = clamp(heightAtPoint - p.y, 0.0, u_shadowPenumbra) / u_shadowPenumbra;
            inShadow = max(inShadow, occlusion);

            if (heightAtPoint > p.y) {
                dist = p.y - heightAtPoint;
                float dynamicStep = max(u_shadowStepSize, dist * 0.05);
                p += lightDirection * dynamicStep;
            } else {
                p += lightDirection * u_shadowStepSize;
            }

            if (inShadow >= 1.0) {
                break;
            }
        }
        
        intensity = inShadow * 0.5 * (1.0 - smoothstep(0.0, u_shadowIntensity, abs(dist)));
        outIntensity = intensity;
        return inShadow;
    }

    float calculateLighting(vec3 normal, vec3 worldPos, float terrainHeight) {
        vec3 lightDirection = normalize(u_sunPosition - worldPos);

        float lightFactor = clamp(dot(normal, lightDirection), 0.0, 1.0);

        float shadowIntensity;
        float shadowOcclusion = calculateShadow(worldPos, lightDirection, shadowIntensity);
        
        float shadowFactor = 1.0 - shadowOcclusion * shadowIntensity;

        return shadowFactor * lightFactor;
    }

    vec4 applyWaterEffects(vec4 terrainColor, float waterDepth, float waterHeight) {
        float waterLerp = easeOut(waterDepth / waterHeight, 1.0);
        
        vec4 waterShallowColor = getCoastalWaterColor();
        vec4 waterDeepColor = getDeepOceanColor();
        vec4 waterColor = mix(waterShallowColor, waterDeepColor, easeOut(waterDepth / waterHeight, 2.0));

        vec4 sceneColor = mix(terrainColor, waterColor, waterLerp);

        float foamFactor = 1.0 - smoothstep(0.0, 0.05, waterDepth);
        foamFactor *= (sin(u_time * u_foamSpeed + waterDepth * u_foamFrequency) + 1.0) / 2.0;
        
        sceneColor.rgb += foamFactor * u_foamIntensity;

        return sceneColor;
    }

    void main() {
        float terrainHeight = texture(u_noiseTexture, v_texCoord).r;
        vec3 normal = getNormal(v_texCoord, terrainHeight);
        vec4 baseColor = classifyTerrain(terrainHeight, v_texCoord);

        if (terrainHeight > u_sandLevel) {
            float slope = 1.0 - normal.y;
            float rockFactor = smoothstep(u_slopeStart, 1.0, slope);
            float slopeVariation = hash(v_texCoord * 80.0);
            vec4 slopeRockColor = getRockColor(slopeVariation);
            baseColor = mix(baseColor, slopeRockColor, rockFactor);
        }

        float waterHeight = getWaterLevel(v_texCoord);
        vec3 worldPos = vec3(v_texCoord.x, max(terrainHeight, waterHeight), v_texCoord.y);
        float visibility = calculateLighting(normal, worldPos, terrainHeight);

        float waterDepth = max(0.0, waterHeight - terrainHeight);
        
        vec4 color;
        if (waterDepth > 0.0) {
           color = applyWaterEffects(baseColor, waterDepth, waterHeight);
        } else {
           color = baseColor;
        }

        vec3 ambient = u_shadowColor * 0.8;
        vec3 directional = u_sunColor * visibility;
        vec3 light = ambient + directional;

        if (waterDepth > 0.0) {
            vec3 sunDir = normalize(u_sunPosition - worldPos);
            vec3 viewDir = normalize(vec3(0.5, 0.5, 2.0) - worldPos);
            vec3 halfwayDir = normalize(sunDir + viewDir);
            float spec = pow(max(dot(normal, halfwayDir), 0.0), u_specularPower);
            light += u_sunColor * spec * u_specularIntensity;
        }
        
        outColor = vec4(color.rgb * light, 1.0);
    }
`;