import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

const FULLSCREEN_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/*
 * A small, self-contained bloom. UnrealBloomPass renders black on the
 * Intel/D3D11 headless path used for screenshots, so we use a simple
 * threshold -> separable blur -> additive composite pipeline instead.
 */
class BloomPass extends Pass {
  constructor() {
    super();
    this.needsSwap = false;
    this.strength = 0.55;
    this.threshold = 0.9;
    this.radius = 1.0;
    this.texture = null;
    this.bw = 2;
    this.bh = 2;

    const rtOpts = {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
    };
    this.rtBright = new THREE.WebGLRenderTarget(2, 2, rtOpts);
    this.rtA = new THREE.WebGLRenderTarget(2, 2, rtOpts);
    this.rtB = new THREE.WebGLRenderTarget(2, 2, rtOpts);

    this.extractMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        uThreshold: { value: this.threshold },
        uKnee: { value: 0.35 },
      },
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse;
        uniform float uThreshold;
        uniform float uKnee;
        varying vec2 vUv;
        vec3 safeColor(vec3 c) {
          if (!(c.r >= 0.0)) c.r = 0.0;
          if (!(c.g >= 0.0)) c.g = 0.0;
          if (!(c.b >= 0.0)) c.b = 0.0;
          return clamp(c, 0.0, 32.0);
        }
        void main() {
          vec3 c = safeColor(texture2D(tDiffuse, vUv).rgb);
          float br = max(c.r, max(c.g, c.b));
          float soft = clamp(br - uThreshold + uKnee, 0.0, 2.0 * uKnee);
          soft = soft * soft / (4.0 * uKnee + 0.0001);
          float contribution = max(soft, br - uThreshold) / max(br, 0.0001);
          gl_FragColor = vec4(c * contribution, 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false,
    });

    this.blurMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        uDirection: { value: new THREE.Vector2(1, 0) },
      },
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse;
        uniform vec2 uDirection;
        varying vec2 vUv;
        void main() {
          vec3 c = texture2D(tDiffuse, vUv).rgb * 0.227027;
          c += texture2D(tDiffuse, vUv + uDirection * 1.384615).rgb * 0.316216;
          c += texture2D(tDiffuse, vUv - uDirection * 1.384615).rgb * 0.316216;
          c += texture2D(tDiffuse, vUv + uDirection * 3.230769).rgb * 0.070270;
          c += texture2D(tDiffuse, vUv - uDirection * 3.230769).rgb * 0.070270;
          gl_FragColor = vec4(c, 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false,
    });

    this.quad = new FullScreenQuad(this.extractMaterial);
    this.texture = this.rtB.texture;
  }

  setSize(width, height) {
    const bw = Math.max(2, Math.floor(width / 4));
    const bh = Math.max(2, Math.floor(height / 4));
    this.bw = bw;
    this.bh = bh;
    this.rtBright.setSize(bw, bh);
    this.rtA.setSize(bw, bh);
    this.rtB.setSize(bw, bh);
  }

  render(renderer, writeBuffer, readBuffer) {
    const previousTarget = renderer.getRenderTarget();
    const previousAutoClear = renderer.autoClear;
    renderer.autoClear = true;
    this.extractMaterial.uniforms.tDiffuse.value = readBuffer.texture;
    this.extractMaterial.uniforms.uThreshold.value = this.threshold;
    renderer.setRenderTarget(this.rtBright);
    this.quad.material = this.extractMaterial;
    this.quad.render(renderer);

    this.blurMaterial.uniforms.tDiffuse.value = this.rtBright.texture;
    this.blurMaterial.uniforms.uDirection.value.set(1.6 / this.bw, 0);
    renderer.setRenderTarget(this.rtA);
    this.quad.material = this.blurMaterial;
    this.quad.render(renderer);

    this.blurMaterial.uniforms.tDiffuse.value = this.rtA.texture;
    this.blurMaterial.uniforms.uDirection.value.set(0, 1.6 / this.bh);
    renderer.setRenderTarget(this.rtB);
    this.quad.material = this.blurMaterial;
    this.quad.render(renderer);

    renderer.autoClear = previousAutoClear;
    renderer.setRenderTarget(previousTarget);
    this.texture = this.rtB.texture;
  }

  dispose() {
    this.rtBright.dispose();
    this.rtA.dispose();
    this.rtB.dispose();
    this.extractMaterial.dispose();
    this.blurMaterial.dispose();
    this.quad.dispose();
  }
}

const MiniatureGradeShader = {
  name: 'MiniatureGradeShader',
  uniforms: {
    tDiffuse: { value: null },
    tBloom: { value: null },
    uBloom: { value: 0.42 },
    resolution: { value: new THREE.Vector2(1600, 1000) },
    uTime: { value: 0 },
    uTilt: { value: 2.2 },
    uFocus: { value: 0.52 },
    uBand: { value: 0.18 },
    uVignette: { value: 0.71 },
    uGrain: { value: 0.005 },
    uSaturation: { value: 1.2 },
    uContrast: { value: 1.15 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform sampler2D tBloom;
    uniform float uBloom;
    uniform vec2 resolution;
    uniform float uTime;
    uniform float uTilt;
    uniform float uFocus;
    uniform float uBand;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uSaturation;
    uniform float uContrast;
    varying vec2 vUv;

    vec3 blur9(vec2 uv, vec2 px) {
      vec3 c = texture2D(tDiffuse, uv).rgb * 0.25;
      c += texture2D(tDiffuse, uv + vec2(px.x, 0.0)).rgb * 0.125;
      c += texture2D(tDiffuse, uv + vec2(-px.x, 0.0)).rgb * 0.125;
      c += texture2D(tDiffuse, uv + vec2(0.0, px.y)).rgb * 0.125;
      c += texture2D(tDiffuse, uv + vec2(0.0, -px.y)).rgb * 0.125;
      c += texture2D(tDiffuse, uv + vec2(px.x, px.y)).rgb * 0.0625;
      c += texture2D(tDiffuse, uv + vec2(-px.x, px.y)).rgb * 0.0625;
      c += texture2D(tDiffuse, uv + vec2(px.x, -px.y)).rgb * 0.0625;
      c += texture2D(tDiffuse, uv + vec2(-px.x, -px.y)).rgb * 0.0625;
      return c;
    }

    void main() {
      vec2 uv = vUv;
      float band = abs(uv.y - uFocus);
      float amt = smoothstep(uBand, uBand + 0.34, band);
      amt *= 0.82 + 0.18 * smoothstep(0.1, 0.5, abs(uv.x - 0.5));
      float blurPx = amt * uTilt;
      vec3 col;
      if (blurPx > 0.25) {
        col = blur9(uv, vec2(blurPx, blurPx) / resolution);
      } else {
        col = texture2D(tDiffuse, uv).rgb;
      }

      // bloom: keep it slightly warm and keep the shadows clean
      vec3 bloom = texture2D(tBloom, uv).rgb;
      if (!(bloom.r >= 0.0)) bloom.r = 0.0;
      if (!(bloom.g >= 0.0)) bloom.g = 0.0;
      if (!(bloom.b >= 0.0)) bloom.b = 0.0;
      bloom = clamp(bloom, 0.0, 8.0);
      col += bloom * uBloom * vec3(1.02, 0.98, 0.92);

      // cool shadows / warm highlights
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      vec3 cool = col * vec3(0.84, 0.94, 1.21);
      vec3 warm = col * vec3(1.12, 1.0, 0.86);
      col = mix(cool, warm, smoothstep(0.16, 0.92, l));

      // gentle S-curve + saturation
      col = (col - 0.5) * uContrast + 0.5;
      col = col * 0.99 + vec3(0.003, 0.006, 0.014);
      float grey = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(grey), col, uSaturation);

      // vignette
      vec2 v = uv - 0.5;
      float vig = 1.0 - dot(v * vec2(1.12, 1.0), v * vec2(1.12, 1.0)) * uVignette;
      col *= clamp(vig, 0.5, 1.0);

      // very light animated grain to unify the frame
      float n = fract(sin(dot(uv * resolution + fract(uTime) * 91.7, vec2(12.9898, 78.233))) * 43758.5453);
      col += (n - 0.5) * uGrain;

      gl_FragColor = vec4(max(col, vec3(0.0)), 1.0);
    }
  `,
};

export function setupPost(renderer, scene, camera, width, height, dpr) {
  const rt = new THREE.WebGLRenderTarget(width * dpr, height * dpr, {
    type: THREE.HalfFloatType,
    samples: 0,
  });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(dpr);
  composer.setSize(width, height);

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloom = new BloomPass();
  bloom.strength = 0.42;
  bloom.threshold = 0.9;
  bloom.setSize(width * dpr, height * dpr);
  composer.addPass(bloom);

  const grade = new ShaderPass(MiniatureGradeShader);
  grade.uniforms.resolution.value.set(width * dpr, height * dpr);
  grade.uniforms.tBloom.value = bloom.texture;
  grade.uniforms.uBloom.value = bloom.strength;
  composer.addPass(grade);

  composer.addPass(new OutputPass());

  function setSize(w, h, ratio) {
    composer.setPixelRatio(ratio);
    composer.setSize(w, h);
    bloom.setSize(w * ratio, h * ratio);
    grade.uniforms.resolution.value.set(w * ratio, h * ratio);
  }

  function render(time) {
    grade.uniforms.uBloom.value = bloom.strength;
    grade.uniforms.uTime.value = time;
    composer.render();
  }

  return { composer, bloom, grade, render, setSize };
}
