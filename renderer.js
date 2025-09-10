import { vertexShaderSource, fragmentShaderSource } from './shaders.js';
import { createShader, createProgram } from './webgl-utils.js';

export class Renderer {
    constructor(canvas) {
        this.gl = canvas.getContext("webgl2");
        if (!this.gl) {
            console.error("WebGL 2 not available");
            return;
        }

        const ext = this.gl.getExtension('OES_texture_float_linear');
        if (ext) {
            console.log("Extensão OES_texture_float_linear habilitada");
            this.supportsLinearFloat = true;
        } else {
            console.warn("OES_texture_float_linear não suportada");
            this.supportsLinearFloat = false;
        }

        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

        this.program = createProgram(
            this.gl,
            createShader(this.gl, this.gl.VERTEX_SHADER, vertexShaderSource),
            createShader(this.gl, this.gl.FRAGMENT_SHADER, fragmentShaderSource)
        );

        this.positionAttributeLocation  = this.gl.getAttribLocation(this.program, "a_position");
        this.u_noiseTextureLocation     = this.gl.getUniformLocation(this.program, "u_noiseTexture");
        this.u_waterTextureLocation     = this.gl.getUniformLocation(this.program, "u_waterTexture");
        this.u_sunPositionLocation      = this.gl.getUniformLocation(this.program, "u_sunPosition");
        this.u_sunColorLocation         = this.gl.getUniformLocation(this.program, "u_sunColor");
        this.u_timeLocation             = this.gl.getUniformLocation(this.program, "u_time");
        this.u_terrainVariationLocation = this.gl.getUniformLocation(this.program, "u_terrainVariation");

        this.u_waterLevelLocation  = this.gl.getUniformLocation(this.program, "u_waterLevel");
        this.u_sandLevelLocation   = this.gl.getUniformLocation(this.program, "u_sandLevel");
        this.u_grassLevelLocation  = this.gl.getUniformLocation(this.program, "u_grassLevel");
        this.u_forestLevelLocation = this.gl.getUniformLocation(this.program, "u_forestLevel");
        this.u_rockLevelLocation   = this.gl.getUniformLocation(this.program, "u_rockLevel");
        this.u_snowLevelLocation   = this.gl.getUniformLocation(this.program, "u_snowLevel");
        this.u_slopeStartLocation  = this.gl.getUniformLocation(this.program, "u_slopeStart");

        this.u_shadowIntensityLocation = this.gl.getUniformLocation(this.program, "u_shadowIntensity");
        this.u_shadowStepsLocation     = this.gl.getUniformLocation(this.program, "u_shadowSteps");
        this.u_shadowPenumbraLocation  = this.gl.getUniformLocation(this.program, "u_shadowPenumbra");

        this.u_waveAmplitudeLocation = this.gl.getUniformLocation(this.program, "u_waveAmplitude");
        this.u_waveFrequencyLocation = this.gl.getUniformLocation(this.program, "u_waveFrequency");
        this.u_waveSpeedLocation     = this.gl.getUniformLocation(this.program, "u_waveSpeed");

        this.u_specularPowerLocation     = this.gl.getUniformLocation(this.program, "u_specularPower");
        this.u_specularIntensityLocation = this.gl.getUniformLocation(this.program, "u_specularIntensity");

        this.u_biomeFreq1Location = this.gl.getUniformLocation(this.program, "u_biomeFreq1");
        this.u_biomeFreq2Location = this.gl.getUniformLocation(this.program, "u_biomeFreq2");


        this.u_shadowStepSizeLocation = this.gl.getUniformLocation(this.program, "u_shadowStepSize");
        this.u_shadowColorLocation    = this.gl.getUniformLocation(this.program, "u_shadowColor");

        this.u_waveAngleLocation     = this.gl.getUniformLocation(this.program, "u_waveAngle");
        this.u_foamSpeedLocation     = this.gl.getUniformLocation(this.program, "u_foamSpeed");
        this.u_foamFrequencyLocation = this.gl.getUniformLocation(this.program, "u_foamFrequency");
        this.u_foamIntensityLocation = this.gl.getUniformLocation(this.program, "u_foamIntensity");
        
        const positions = [ -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1 ];
        this.positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);

        this.vao = this.gl.createVertexArray();
        this.gl.bindVertexArray(this.vao);
        this.gl.enableVertexAttribArray(this.positionAttributeLocation);
        this.gl.vertexAttribPointer(this.positionAttributeLocation, 2, this.gl.FLOAT, false, 0, 0);

        this.noiseTexture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.noiseTexture);
        
        //this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        //this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT);

        this.gl.bindVertexArray(null);
    }

    

    loadTexture(url) {
        const gl = this.gl;
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);

        const level = 0;
        const internalFormat = gl.RGBA;
        const width = 1;
        const height = 1;
        const border = 0;
        const srcFormat = gl.RGBA;
        const srcType = gl.UNSIGNED_BYTE;
        const pixel = new Uint8Array([0, 0, 255, 255]);
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border, srcFormat, srcType, pixel);

        return new Promise((resolve) => {
            const image = new Image();
            image.onload = () => {
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, srcFormat, srcType, image);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                resolve(texture);
            };
            image.src = url;
        });
    }

    render(noiseData, waterTexture, sunPosition, sunColor, time, shaderParams) {
        this.gl.clearColor(0.44, 0.68, 0.73, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        this.gl.useProgram(this.program);
        

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.noiseTexture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.R32F, 512, 512, 0, this.gl.RED, this.gl.FLOAT, noiseData);
        this.gl.uniform1i(this.u_noiseTextureLocation, 0);

        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, waterTexture);
        this.gl.uniform1i(this.u_waterTextureLocation, 1);

        this.gl.uniform3f(this.u_sunPositionLocation, sunPosition.x, sunPosition.y, sunPosition.z);
        this.gl.uniform3fv(this.u_sunColorLocation, sunColor);
        this.gl.uniform1f(this.u_timeLocation, time);

        this.gl.uniform1f(this.u_terrainVariationLocation, shaderParams.terrainVariation);

        this.gl.uniform1f(this.u_waterLevelLocation, shaderParams.waterLevel);
        this.gl.uniform1f(this.u_sandLevelLocation, shaderParams.sandLevel);
        this.gl.uniform1f(this.u_grassLevelLocation, shaderParams.grassLevel);
        this.gl.uniform1f(this.u_forestLevelLocation, shaderParams.forestLevel);
        this.gl.uniform1f(this.u_rockLevelLocation, shaderParams.rockLevel);
        this.gl.uniform1f(this.u_snowLevelLocation, shaderParams.snowLevel);
        this.gl.uniform1f(this.u_slopeStartLocation, shaderParams.slopeStart);

        this.gl.uniform1f(this.u_shadowIntensityLocation, shaderParams.shadowIntensity);
        this.gl.uniform1i(this.u_shadowStepsLocation, shaderParams.shadowSteps);
        this.gl.uniform1f(this.u_shadowPenumbraLocation, shaderParams.shadowPenumbra);

        this.gl.uniform1f(this.u_waveAmplitudeLocation, shaderParams.waveAmplitude);
        this.gl.uniform1f(this.u_waveFrequencyLocation, shaderParams.waveFrequency);
        this.gl.uniform1f(this.u_waveSpeedLocation, shaderParams.waveSpeed);

        this.gl.uniform1f(this.u_specularPowerLocation, shaderParams.specularPower);
        this.gl.uniform1f(this.u_specularIntensityLocation, shaderParams.specularIntensity);

        this.gl.uniform1f(this.u_biomeFreq1Location, shaderParams.biomeFreq1);
        this.gl.uniform1f(this.u_biomeFreq2Location, shaderParams.biomeFreq2);
        
        this.gl.uniform1f(this.u_shadowStepSizeLocation, shaderParams.shadowStepSize);
        this.gl.uniform3fv(this.u_shadowColorLocation, shaderParams.shadowColor);

        this.gl.uniform1f(this.u_waveAngleLocation, shaderParams.waveAngle);
        this.gl.uniform1f(this.u_foamSpeedLocation, shaderParams.foamSpeed);
        this.gl.uniform1f(this.u_foamFrequencyLocation, shaderParams.foamFrequency);
        this.gl.uniform1f(this.u_foamIntensityLocation, shaderParams.foamIntensity);

        this.gl.bindVertexArray(this.vao);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }
}