import * as THREE from 'three';

/*
 * Wet asphalt ground: a planar reflection (like three's Reflector) mixed with
 * asphalt colour through a hand-painted puddle mask, plus procedural rain ripple
 * distortion. Stylised, not physically correct: reflections are tinted, slightly
 * quantised and fade out where the ground is dry.
 */
export class WetGround extends THREE.Mesh {
  constructor(geometry, options = {}) {
    super(geometry);
    this.isReflector = true;
    this.type = 'WetGround';
    this.camera = new THREE.PerspectiveCamera();

    const scope = this;
    const textureWidth = options.textureWidth || 1024;
    const textureHeight = options.textureHeight || 1024;
    const clipBias = options.clipBias || 0;
    const updateInterval = options.updateInterval ?? 2;
    const renderTarget = new THREE.WebGLRenderTarget(textureWidth, textureHeight, {
      samples: 0,
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });

    const reflectorPlane = new THREE.Plane();
    const normal = new THREE.Vector3();
    const reflectorWorldPosition = new THREE.Vector3();
    const cameraWorldPosition = new THREE.Vector3();
    const rotationMatrix = new THREE.Matrix4();
    const lookAtPosition = new THREE.Vector3(0, 0, -1);
    const clipPlane = new THREE.Vector4();
    const view = new THREE.Vector3();
    const target = new THREE.Vector3();
    const q = new THREE.Vector4();
    const textureMatrix = new THREE.Matrix4();
    const textureMatrixWorld = new THREE.Matrix4();
    const virtualCamera = this.camera;
    let frame = 0;

    const material = new THREE.ShaderMaterial({
      name: 'WetGroundShader',
      fog: true,
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          tDiffuse: { value: null },
          textureMatrix: { value: textureMatrix },
          uBaseMap: { value: options.baseMap ?? null },
          uWetMap: { value: options.wetMap ?? null },
          uTime: { value: 0 },
          uAsphaltTint: { value: new THREE.Color(options.asphaltTint ?? '#ffffff') },
          uReflectTint: { value: new THREE.Color(options.reflectTint ?? '#b9d2ff') },
          uReflectStrength: { value: options.reflectStrength ?? 1.0 },
          uRippleStrength: { value: options.rippleStrength ?? 0.0032 },
          uBaseScale: { value: options.baseScale ?? 0.55 },
          uWetScale: { value: options.wetScale ?? 1.0 },
        },
      ]),
      vertexShader: /* glsl */ `
        uniform mat4 textureMatrix;
        varying vec4 vUv;
        varying vec2 vWorld;
        varying float vFresnel;
        #include <common>
        #include <fog_pars_vertex>
        #include <logdepthbuf_pars_vertex>
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorld = wp.xz;
          vUv = textureMatrix * vec4(position, 1.0);
          vec3 camWorld = cameraPosition;
          vec3 V = normalize(camWorld - wp.xyz);
          vFresnel = pow(1.0 - clamp(V.y, 0.0, 1.0), 2.4);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          #include <logdepthbuf_vertex>
          #include <fog_vertex>
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse;
        uniform sampler2D uBaseMap;
        uniform sampler2D uWetMap;
        uniform float uTime;
        uniform vec3 uAsphaltTint;
        uniform vec3 uReflectTint;
        uniform float uReflectStrength;
        uniform float uRippleStrength;
        uniform float uBaseScale;
        uniform float uWetScale;
        varying vec4 vUv;
        varying vec2 vWorld;
        varying float vFresnel;
        #include <common>
        #include <fog_pars_fragment>
        #include <logdepthbuf_pars_fragment>

        float hash21(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }

        void main() {
          #include <logdepthbuf_fragment>
          vec2 baseUv = vWorld * uBaseScale;
          vec3 base = texture2D(uBaseMap, baseUv).rgb * uAsphaltTint * 1.55 + vec3(0.004, 0.006, 0.012);
          vec2 wetUv = vWorld / 12.0 + 0.5;
          float wet = texture2D(uWetMap, wetUv).r * uWetScale;
          wet = smoothstep(0.08, 0.42, wet);
          wet = max(wet, 0.16);
          // slow broad undulation + many tiny rain rings
          vec2 p = vWorld;
          float wob = sin(p.x * 2.1 + uTime * 1.6) * 0.5
                    + sin(p.y * 2.9 - uTime * 1.9) * 0.5
                    + sin((p.x + p.y) * 1.25 + uTime * 2.3) * 0.55;
          float rings = 0.0;
          for (int i = 0; i < 3; i++) {
            vec2 q = p * (1.7 + float(i) * 0.9) + float(i) * 7.31;
            vec2 cell = floor(q);
            vec2 f = fract(q) - 0.5;
            float h = hash21(cell + float(i) * 13.0);
            float t = fract(uTime * (0.55 + h * 0.4) + h);
            float r = length(f - (vec2(hash21(cell + 3.1), hash21(cell + 9.7)) - 0.5) * 0.3);
            float ring = smoothstep(0.06, 0.0, abs(r - t * 0.42)) * (1.0 - t);
            rings += ring;
          }
          rings = clamp(rings, 0.0, 1.0);
          vec2 dist = vec2(cos(wob * 1.4 + rings), sin(wob * 1.1 - rings)) * uRippleStrength * (0.35 + wet);
          vec4 uv = vUv;
          uv.xy += dist * uv.w;
          vec4 refl = texture2DProj(tDiffuse, uv);
          // stylised quantisation keeps the cel-animation feel
          vec3 rc = refl.rgb * uReflectTint;
          rc = floor(rc * 18.0) / 18.0;
          float fres = 0.35 + vFresnel * 0.65;
          float mixAmt = clamp(wet * (0.22 + 0.78 * fres) * uReflectStrength, 0.0, 0.92);
          vec3 col = mix(base, rc * 1.25, mixAmt);
          // wet sheen highlights + rain ring glints
          col += vec3(0.30, 0.36, 0.50) * fres * (0.06 + wet * 0.14);
          col += vec3(0.38, 0.46, 0.6) * rings * wet * 0.07;
          // subtle vignette-esque darkening far from the corner
          gl_FragColor = vec4(col, 1.0);
          #include <fog_fragment>
        }
      `,
    });

    material.uniforms.tDiffuse.value = renderTarget.texture;
    this.material = material;

    this.onBeforeRender = (renderer, scene, camera) => {
      frame++;
      if (frame % updateInterval !== 0) return;
      reflectorWorldPosition.setFromMatrixPosition(scope.matrixWorld);
      cameraWorldPosition.setFromMatrixPosition(camera.matrixWorld);
      rotationMatrix.extractRotation(scope.matrixWorld);
      normal.set(0, 0, 1).applyMatrix4(rotationMatrix);
      view.subVectors(reflectorWorldPosition, cameraWorldPosition);
      if (view.dot(normal) > 0) return;
      view.reflect(normal).negate();
      view.add(reflectorWorldPosition);
      rotationMatrix.extractRotation(camera.matrixWorld);
      lookAtPosition.set(0, 0, -1).applyMatrix4(rotationMatrix).add(cameraWorldPosition);
      target.subVectors(reflectorWorldPosition, lookAtPosition);
      target.reflect(normal).negate();
      target.add(reflectorWorldPosition);
      virtualCamera.position.copy(view);
      virtualCamera.up.set(0, 1, 0).applyMatrix4(rotationMatrix).reflect(normal);
      virtualCamera.lookAt(target);
      virtualCamera.far = camera.far;
      virtualCamera.updateMatrixWorld();
      virtualCamera.projectionMatrix.copy(camera.projectionMatrix);

      textureMatrixWorld.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
      textureMatrixWorld.multiply(virtualCamera.projectionMatrix);
      textureMatrixWorld.multiply(virtualCamera.matrixWorldInverse);
      textureMatrix.copy(textureMatrixWorld).multiply(scope.matrixWorld);

      reflectorPlane.setFromNormalAndCoplanarPoint(normal, reflectorWorldPosition);
      reflectorPlane.applyMatrix4(virtualCamera.matrixWorldInverse);
      clipPlane.set(reflectorPlane.normal.x, reflectorPlane.normal.y, reflectorPlane.normal.z, reflectorPlane.constant);
      const projectionMatrix = virtualCamera.projectionMatrix;
      q.x = (Math.sign(clipPlane.x) + projectionMatrix.elements[8]) / projectionMatrix.elements[0];
      q.y = (Math.sign(clipPlane.y) + projectionMatrix.elements[9]) / projectionMatrix.elements[5];
      q.z = -1.0;
      q.w = (1.0 + projectionMatrix.elements[10]) / projectionMatrix.elements[14];
      clipPlane.multiplyScalar(2.0 / clipPlane.dot(q));
      projectionMatrix.elements[2] = clipPlane.x;
      projectionMatrix.elements[6] = clipPlane.y;
      projectionMatrix.elements[10] = clipPlane.z + 1.0 - clipBias;
      projectionMatrix.elements[14] = clipPlane.w;

      scope.visible = false;
      const currentRenderTarget = renderer.getRenderTarget();
      const currentXrEnabled = renderer.xr.enabled;
      const currentShadowAutoUpdate = renderer.shadowMap.autoUpdate;
      renderer.xr.enabled = false;
      renderer.shadowMap.autoUpdate = false;
      renderer.setRenderTarget(renderTarget);
      renderer.state.buffers.depth.setMask(true);
      if (renderer.autoClear === false) renderer.clear();
      renderer.render(scene, virtualCamera);
      renderer.xr.enabled = currentXrEnabled;
      renderer.shadowMap.autoUpdate = currentShadowAutoUpdate;
      renderer.setRenderTarget(currentRenderTarget);
      const viewport = camera.viewport;
      if (viewport !== undefined) renderer.state.viewport(viewport);
      scope.visible = true;
    };

    this.textureMatrixWorld = textureMatrixWorld;
    this.getRenderTarget = () => renderTarget;
    this.setTime = (t) => {
      material.uniforms.uTime.value = t;
    };
    this.dispose = () => {
      renderTarget.dispose();
      material.dispose();
    };
  }
}
