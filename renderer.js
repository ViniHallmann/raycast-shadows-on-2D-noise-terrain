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
        this.u_sunPositionLocation      = this.gl.getUniformLocation(this.program, "u_sunPosition");
        this.u_sunColorLocation         = this.gl.getUniformLocation(this.program, "u_sunColor");
        this.u_timeLocation             = this.gl.getUniformLocation(this.program, "u_time");
        
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

    render(noiseData, sunPosition, sunColor, time) {
        this.gl.clearColor(0.44, 0.68, 0.73, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        this.gl.useProgram(this.program);
        

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.noiseTexture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.R32F, 512, 512, 0, this.gl.RED, this.gl.FLOAT, noiseData);
        this.gl.uniform1i(this.u_noiseTextureLocation, 0);

        this.gl.uniform3f(this.u_sunPositionLocation, sunPosition.x, sunPosition.y, sunPosition.z);
        this.gl.uniform3fv(this.u_sunColorLocation, sunColor);
        this.gl.uniform1f(this.u_timeLocation, time);
        
        this.gl.bindVertexArray(this.vao);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }
}