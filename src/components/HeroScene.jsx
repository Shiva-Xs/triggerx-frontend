import { useRef, useEffect, useState, useMemo, Suspense, Component } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Environment, useProgress } from '@react-three/drei';
import * as THREE from 'three';
import { reportScene } from '../utils/sceneProgress';

function createCrypticTextTexture() {

  const W = 512, H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;

  const FONT_SIZE = 7;
  const chars = '01₿ΞΔΘABCDEF@#$%<>{}[]ΩΨΦÐ◎⟠⬡₳'.split('');
  const cols = Math.floor(W / FONT_SIZE);
  const rows = Math.floor(H / FONT_SIZE);

  const drops = Array.from({ length: cols + 2 }, (_, i) => ({
    col: i < cols ? i : Math.floor(Math.random() * cols),
    y: Math.floor(Math.random() * rows),
    speed: 4 + Math.floor(Math.random() * 5),
    tick: 0,
  }));

  const brightness = new Float32Array(cols * rows).fill(0);

  const updateTexture = () => {

    for (let i = 0; i < brightness.length; i++) {
      const v = brightness[i] * 0.92;
      brightness[i] = v < 0.02 ? 0 : v;
    }

    for (let c = 0; c < drops.length; c++) {
      const d = drops[c];
      d.tick++;
      if (d.tick >= d.speed) {
        d.tick = 0;
        brightness[d.y * cols + d.col] = 1.0;
        d.y = (d.y + 1) % rows;
      }
    }

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);
    ctx.font = `${FONT_SIZE}px monospace`;
    ctx.textAlign = 'center';

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const b = brightness[r * cols + c];
        if (b === 0) continue;
        const x = c * FONT_SIZE + FONT_SIZE / 2;
        const y = r * FONT_SIZE + FONT_SIZE;
        const char = chars[Math.floor(Math.random() * chars.length)];
        if (b > 0.90) {
          ctx.fillStyle = 'rgba(255,240,180,1)';
        } else {
          ctx.fillStyle = `rgba(210,140,0,${b})`;
        }
        ctx.fillText(char, x, y);
      }
    }

    texture.needsUpdate = true;
  };

  return { texture, updateTexture };
}

import { getHeroVideos } from '../utils/videoLoader';

function createVisorMaterial() {

  const gradCanvas = document.createElement('canvas');
  gradCanvas.width = 4096;
  gradCanvas.height = 1;
  const gCtx = gradCanvas.getContext('2d');
  const g = gCtx.createLinearGradient(0, 0, 4096, 0);
  g.addColorStop(0.00, '#ff2200');
  g.addColorStop(0.10, '#ff4422');
  g.addColorStop(0.20, '#ff2288');
  g.addColorStop(0.30, '#ff22cc');
  g.addColorStop(0.40, '#dd22ff');
  g.addColorStop(0.50, '#4F5BD5');
  g.addColorStop(0.60, '#2979FF');
  g.addColorStop(0.70, '#22ddff');
  g.addColorStop(0.80, '#22ff99');
  g.addColorStop(0.90, '#22ffdd');
  g.addColorStop(1.00, '#2299ff');
  gCtx.fillStyle = g;
  gCtx.fillRect(0, 0, 4096, 1);
  const gradTex = new THREE.CanvasTexture(gradCanvas);
  gradTex.wrapS = THREE.ClampToEdgeWrapping;
  gradTex.wrapT = THREE.ClampToEdgeWrapping;
  gradTex.minFilter = THREE.LinearFilter;
  gradTex.magFilter = THREE.LinearFilter;
  gradTex.colorSpace = THREE.SRGBColorSpace;

  const { screen: video, overlay: videoOv } = getHeroVideos();
  video.play().catch(() => {});
  videoOv.play().catch(() => {});

  const videoTex = new THREE.VideoTexture(video);
  videoTex.minFilter = THREE.LinearFilter;
  videoTex.magFilter = THREE.LinearFilter;
  videoTex.colorSpace = THREE.SRGBColorSpace;

  const overlayTex = new THREE.VideoTexture(videoOv);
  overlayTex.minFilter = THREE.LinearFilter;
  overlayTex.magFilter = THREE.LinearFilter;
  overlayTex.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.ShaderMaterial({
    uniforms: {
      gradMap:      { value: gradTex },
      videoMap:     { value: videoTex },
      overlayMap:   { value: overlayTex },
      uAuthVisor:   { value: null },
      parallaxX:    { value: 0.0 },
      uVisorAlpha:  { value: 1.0 },
      uOpacity:     { value: 1.0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D gradMap;
      uniform sampler2D videoMap;
      uniform sampler2D overlayMap;
      uniform sampler2D uAuthVisor;
      uniform float parallaxX;
      uniform float uVisorAlpha;
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        vec2 gradUv = vec2(clamp(vUv.x * 0.5 + 0.25 + parallaxX, 0.0, 1.0), 0.5);
        vec3 grad = texture2D(gradMap, gradUv).rgb;
        float cropStart = 0.26; float cropRange = 0.44;
        vec2 vidUv = vec2(vUv.x, vUv.y * cropRange + cropStart);
        vec3 vid = texture2D(videoMap, vidUv).rgb;
        vec3 col = grad + vid - grad * vid;
        vec3 ov = texture2D(overlayMap, vUv).rgb;
        col = col + ov * 0.25 - col * ov * 0.25;
        col = col * 0.86;
        vec2 authUv = fract(vUv * 0.28);
        vec3 authCol = texture2D(uAuthVisor, authUv).rgb;
        vec3 final = mix(authCol, col, uVisorAlpha);
        gl_FragColor = vec4(final, uOpacity);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
  });

  let lastVideoTime = -1;
  let lastOverlayTime = -1;

  const tick = (px, visorAlpha = 1.0) => {
    material.uniforms.parallaxX.value = px;
    material.uniforms.uVisorAlpha.value = visorAlpha;
    if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
      videoTex.needsUpdate = true;
      lastVideoTime = video.currentTime;
    }
    if (videoOv.readyState >= 2 && videoOv.currentTime !== lastOverlayTime) {
      overlayTex.needsUpdate = true;
      lastOverlayTime = videoOv.currentTime;
    }
  };

  const cleanup = () => {

    gradTex.dispose();
    videoTex.dispose();
    overlayTex.dispose();
    material.dispose();
  };

  return { material, tick, cleanup };
}

function SkullModel({ mouseRef, authPhase, authInputPos, authMode, isMobile }) {
  const groupRef = useRef();
  const torusMatRef = useRef();
  const updateCyberTextRef = useRef(null);
  const rainFrameRef = useRef(0);
  const visorSetParallaxRef = useRef(null);
  const skullMatRef = useRef(null);
  const goggleMeshesRef = useRef([]);
  const goggleOrigPosRef = useRef([]);
  const visorMeshRef = useRef(null);
  const visorOrigScaleRef = useRef(new THREE.Vector3(1, 1, 1));
  const baseYRef = useRef(0);
  const authStateRef = useRef({ phase: null, t: 0, visorAlpha: 1, goggleDrop: 0, torusOp: 1, levY: 0 });
  const lastMouseRef = useRef({ x: 0, y: 0, t: 0 });
  const torusMeshesRef = useRef([]);
  const { scene: _gltfScene } = useGLTF('/hero.glb');
  const scene = useMemo(() => _gltfScene.clone(true), [_gltfScene]);

  const { size: canvasSize } = useThree();

  const { center, baseScale } = useMemo(() => {
    if (!scene) return { center: new THREE.Vector3(), baseScale: 1 };
    const box = new THREE.Box3().setFromObject(scene);
    const c = box.getCenter(new THREE.Vector3());
    const sz = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(sz.x, sz.y, sz.z);
    return { center: c, baseScale: (2.8 / maxDim) * 0.6009 };
  }, [scene]);

  const scaleFactor = useMemo(() => {
    const vwMul = THREE.MathUtils.clamp(canvasSize.width / 1440, 0.78, 1.2);
    return baseScale * vwMul;
  }, [baseScale, canvasSize.width]);

  useEffect(() => {
    if (!scene) return;

    const { texture: crypticTexture, updateTexture } = createCrypticTextTexture();
    updateCyberTextRef.current = updateTexture;

    const { material: visorMat, tick: tickVisor, cleanup: cleanupVisor } = createVisorMaterial();
    visorSetParallaxRef.current = tickVisor;

    visorMat.uniforms.uAuthVisor.value = crypticTexture;

    const skullMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#1e1a2e'),
      metalness: 0.95,
      roughness: 0.18,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      envMapIntensity: 3.5,
      emissive: new THREE.Color('#ff8c00'),
      emissiveMap: crypticTexture,
      emissiveIntensity: 0.65,
    });

    const frameGradCanvas = document.createElement('canvas');
    frameGradCanvas.width = 1;
    frameGradCanvas.height = 256;
    const frameGradCtx = frameGradCanvas.getContext('2d');
    const frameGrad = frameGradCtx.createLinearGradient(0, 0, 0, 256);
    frameGrad.addColorStop(0.0,  '#000000');
    frameGrad.addColorStop(0.35, '#0a0a14');
    frameGrad.addColorStop(0.5,  '#2e2b72');
    frameGrad.addColorStop(0.65, '#0a0a14');
    frameGrad.addColorStop(1.0,  '#000000');
    frameGradCtx.fillStyle = frameGrad;
    frameGradCtx.fillRect(0, 0, 1, 256);
    const frameGradTex = new THREE.CanvasTexture(frameGradCanvas);
    frameGradTex.wrapS = THREE.RepeatWrapping;
    frameGradTex.wrapT = THREE.RepeatWrapping;

    const frameMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#1a1a22'),
      metalness: 0.88,
      roughness: 0.14,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      envMapIntensity: 3.0,
      emissive: new THREE.Color('#3730a3'),
      emissiveMap: frameGradTex,
      emissiveIntensity: 0.38,
    });

    const torusGradCanvas = document.createElement('canvas');
    torusGradCanvas.width = 1;
    torusGradCanvas.height = 256;
    const torusGradCtx = torusGradCanvas.getContext('2d');
    const torusGrad = torusGradCtx.createLinearGradient(0, 0, 0, 256);
    torusGrad.addColorStop(0.0,  '#000000');
    torusGrad.addColorStop(0.45, '#0d0300');
    torusGrad.addColorStop(0.5,  '#c44a00');
    torusGrad.addColorStop(0.55, '#0d0300');
    torusGrad.addColorStop(1.0,  '#000000');
    torusGradCtx.fillStyle = torusGrad;
    torusGradCtx.fillRect(0, 0, 1, 256);
    const torusGradTex = new THREE.CanvasTexture(torusGradCanvas);
    torusGradTex.wrapS = THREE.RepeatWrapping;
    torusGradTex.wrapT = THREE.RepeatWrapping;

    const torusMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#000000'),
      metalness: 0.92,
      roughness: 0.04,
      emissive: new THREE.Color('#c44a00'),
      emissiveIntensity: 0.75,
      emissiveMap: torusGradTex,
      clearcoat: 0.5,
      envMapIntensity: 1.2,
      transparent: true,
      opacity: 1.0,
    });
    torusMatRef.current = torusMat;

    skullMatRef.current = skullMat;
    goggleMeshesRef.current = [];
    goggleOrigPosRef.current = [];
    torusMeshesRef.current = [];

    scene.traverse((child) => {
      if (!child.isMesh) return;

      if (child.geometry.attributes.color) {
        child.geometry.deleteAttribute('color');
      }

      const name = child.name.toLowerCase();
      child.castShadow = false;
      child.receiveShadow = false;

      if (name.includes('female_head') || name.includes('head')) {
        child.material = skullMat;
      } else if (name.includes('torus')) {
        child.material = torusMat;
        torusMeshesRef.current.push(child);
      } else if (name.includes('gogg')) {
        const vertCount = child.geometry.attributes.position.count;
        if (vertCount > 500) {

          const fm = frameMat.clone();
          fm.transparent = true;
          child.material = fm;
          goggleMeshesRef.current.push(child);
          goggleOrigPosRef.current.push(child.position.clone());
        } else {

          child.geometry.computeBoundingBox();
          const geoBox = child.geometry.boundingBox;
          const geoSize = geoBox.getSize(new THREE.Vector3());
          const positions = child.geometry.attributes.position;
          const uvs = new Float32Array(positions.count * 2);

          for (let v = 0; v < positions.count; v++) {
            const x = positions.getX(v);
            const y = positions.getY(v);
            uvs[v * 2] = (x - geoBox.min.x) / geoSize.x;
            uvs[v * 2 + 1] = (y - geoBox.min.y) / geoSize.y;
          }

          child.geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
          child.material = visorMat;
          visorMeshRef.current = child;
          visorOrigScaleRef.current.copy(child.scale);
        }
      } else {
        child.material = skullMat;
      }
    });

    baseYRef.current = 0;

    return () => {
      cleanupVisor();
      crypticTexture.dispose();
      skullMat.dispose();
      frameMat.dispose();
      frameGradTex.dispose();
      torusMat.dispose();
    };
  }, [scene]);

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;

    const dt = Math.min(delta, 0.05);
    const auth = authStateRef.current;
    const inAuth  = authPhase === 'email' || authPhase === 'otp' || authPhase === 'done';
    const inOtp   = authPhase === 'otp'   || authPhase === 'done';

    rainFrameRef.current = (rainFrameRef.current + 1) % 4;
    if (rainFrameRef.current === 0 && updateCyberTextRef.current) {
      updateCyberTextRef.current();
    }

    const targetVisorAlpha = inAuth ? 0.0 : 1.0;
    auth.visorAlpha = THREE.MathUtils.lerp(auth.visorAlpha, targetVisorAlpha, 1 - Math.exp(-2.5 * dt));
    const parallax = (groupRef.current && !authMode) ? -groupRef.current.rotation.y * 0.28 : 0;
    if (visorSetParallaxRef.current) {
      visorSetParallaxRef.current(parallax, auth.visorAlpha);
    }

    const targetTorusOp = inOtp ? 0 : 1;
    auth.torusOp = THREE.MathUtils.lerp(auth.torusOp, targetTorusOp, 1 - Math.exp(-2 * dt));
    if (torusMatRef.current) torusMatRef.current.opacity = auth.torusOp;

    if (inOtp) {
      auth.goggleDrop = Math.min(auth.goggleDrop + 1.5 * dt, 1);
    } else {
      auth.goggleDrop = Math.max(auth.goggleDrop - 3.6 * dt, 0);
    }
    goggleMeshesRef.current.forEach((mesh, i) => {
      const orig = goggleOrigPosRef.current[i];
      if (orig) mesh.position.copy(orig);
      mesh.rotation.z = 0;
      mesh.material.opacity = THREE.MathUtils.clamp(1 - auth.goggleDrop, 0, 1);
    });
    if (visorMeshRef.current) {
      visorMeshRef.current.scale.copy(visorOrigScaleRef.current);

      const visorOp = THREE.MathUtils.clamp(1 - auth.goggleDrop, 0, 1);
      if (visorMeshRef.current.material.uniforms) {
        visorMeshRef.current.material.uniforms.uOpacity.value = visorOp;
      }
    }

    const baseEI = inOtp ? 1.5 : (authPhase === 'email' ? 0.0 : 0.65);
    const targetEI = baseEI + (inAuth || authMode ? 0 : Math.sin(time * 0.32) * 0.07);
    if (skullMatRef.current) {
      skullMatRef.current.emissiveIntensity = THREE.MathUtils.lerp(
        skullMatRef.current.emissiveIntensity, targetEI, 1 - Math.exp(-2.5 * dt)
      );
    }

    const targetLevY = inAuth ? 0.55 : 0;
    auth.levY = THREE.MathUtils.lerp(auth.levY, targetLevY, 1 - Math.exp(-1.5 * dt));
    if (groupRef.current) {
      groupRef.current.position.y = baseYRef.current + auth.levY;
    }

    if (groupRef.current && !inAuth && !authMode) {
      const breathe = 1 + Math.sin(time * 0.5) * 0.008;
      groupRef.current.scale.setScalar(scaleFactor * breathe);
    }

    if (groupRef.current) {
      groupRef.current.rotation.order = 'YXZ';
      if (authMode || inAuth) {
        const aCenter = 1 - Math.exp(-2.5 * dt);
        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, 0, aCenter);
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, aCenter);
        groupRef.current.rotation.z = 0;
      } else if (isMobile) {
        const aMobile = 1 - Math.exp(-2 * dt);
        groupRef.current.rotation.y = THREE.MathUtils.lerp(
          groupRef.current.rotation.y, Math.sin(time * 0.28) * 0.10, aMobile
        );
        groupRef.current.rotation.x = THREE.MathUtils.lerp(
          groupRef.current.rotation.x, -0.18 + Math.sin(time * 0.16) * 0.03, aMobile
        );
        groupRef.current.rotation.z = 0;
      } else if (mouseRef?.current) {
        const raw = mouseRef.current;

        const dx = raw.x - lastMouseRef.current.x;
        const dy = raw.y - lastMouseRef.current.y;
        if (Math.abs(dx) > 0.004 || Math.abs(dy) > 0.004) {
          lastMouseRef.current = { x: raw.x, y: raw.y, t: time };
        }
        const idleSecs = time - lastMouseRef.current.t;
        if (idleSecs > 3) {
          const aIdle = 1 - Math.exp(-2 * dt);
          groupRef.current.rotation.y = THREE.MathUtils.lerp(
            groupRef.current.rotation.y, Math.sin(time * 0.18) * (5 * Math.PI / 180), aIdle
          );
          groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, aIdle);
        } else {

          const aTrack = 1 - Math.exp(-12 * dt);
          const targetY = raw.x * (42 * Math.PI / 180);
          const targetX = -raw.y * (28 * Math.PI / 180);
          groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetY, aTrack);
          groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetX, aTrack);
        }
        groupRef.current.rotation.z = 0;
      }
    }
  });

  return (
    <group
      ref={groupRef}
      scale={scaleFactor}
    >
      <group position={[-center.x, -center.y, -center.z]}>
        <primitive object={scene} />
      </group>
    </group>
  );
}

function DynamicLights() {
  return (
    <>

      <ambientLight intensity={0.06} color="#ffffff" />

      <pointLight position={[-4, 1, 3]} intensity={6} color="#aacfff" distance={22} />

      <pointLight position={[1, 3, -6]} intensity={17} color="#ff8833" distance={28} />

      <pointLight position={[0, -3, 1]} intensity={3} color="#1a2a55" distance={14} />
    </>
  );
}

function AmbientDust() {
  const COUNT = 60;

  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      uniform float uTime;
      attribute float aSpeed;
      attribute float aOffset;
      attribute float aSize;
      varying float vAlpha;
      void main() {
        float y = mod(position.y + uTime * aSpeed + aOffset, 4.0) - 2.0;
        float wobX = sin(uTime * 0.4 + aOffset * 2.1) * 0.12;
        vec4 mvPos = modelViewMatrix * vec4(position.x + wobX, y, position.z, 1.0);
        gl_Position  = projectionMatrix * mvPos;
        gl_PointSize = clamp(aSize * (180.0 / -mvPos.z), 0.5, 3.0);
        float mid = 1.0 - abs(y / 2.0);
        vAlpha = mid * 0.45;
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      void main() {
        vec2  uv = 2.0 * gl_PointCoord - 1.0;
        float r  = dot(uv, uv);
        if (r > 1.0) discard;
        float soft = 1.0 - smoothstep(0.0, 1.0, r);
        gl_FragColor = vec4(vec3(0.72, 0.76, 1.0), vAlpha * soft);
      }
    `,
    transparent: true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending,
  }), []);

  const geo = useMemo(() => {
    const pos     = new Float32Array(COUNT * 3);
    const speeds  = new Float32Array(COUNT);
    const offsets = new Float32Array(COUNT);
    const sizes   = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      pos[i*3]   = (Math.random() - 0.5) * 3.2;
      pos[i*3+1] = (Math.random() - 0.5) * 4.0;
      pos[i*3+2] = (Math.random() - 0.5) * 1.8;
      speeds[i]  = 0.06 + Math.random() * 0.10;
      offsets[i] = Math.random() * 10;
      sizes[i]   = 0.8 + Math.random() * 1.2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos,     3));
    g.setAttribute('aSpeed',   new THREE.BufferAttribute(speeds,  1));
    g.setAttribute('aOffset',  new THREE.BufferAttribute(offsets, 1));
    g.setAttribute('aSize',    new THREE.BufferAttribute(sizes,   1));
    return g;
  }, []);

  useFrame(({ clock }) => { mat.uniforms.uTime.value = clock.getElapsedTime(); });

  return <points geometry={geo} material={mat} />;
}

function SkullGrid({ isMobile }) {
  const meshRef = useRef();
  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        float COLS   = 28.0;
        float ROWS   = 16.0;
        float LINE_W = 0.012;

        vec2  cell = fract(vUv * vec2(COLS, ROWS));
        float lx   = 1.0 - smoothstep(0.0, LINE_W, min(cell.x, 1.0 - cell.x));
        float ly   = 1.0 - smoothstep(0.0, LINE_W, min(cell.y, 1.0 - cell.y));
        float line = max(lx, ly);

        vec2  d    = 1.0 - abs(vUv * 2.0 - 1.0);
        float fade = smoothstep(0.0, 0.08, d.x) * smoothstep(0.0, 0.08, d.y);

        float wave  = sin((vUv.x + vUv.y) * 6.0 - uTime * 1.4) * 0.5 + 0.5;
        float pulse = 0.38 + wave * 0.38;

        float breathe = 0.82 + 0.18 * sin(uTime * 0.7);

        vec3  col   = mix(vec3(0.28, 0.30, 0.85), vec3(0.55, 0.58, 1.00), wave);
        float alpha = line * fade * pulse * breathe * 0.76;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite:  false,
    side: THREE.DoubleSide,
  }), []);

  useFrame(({ clock, pointer }) => {
    mat.uniforms.uTime.value = clock.getElapsedTime();
    if (meshRef.current && !isMobile) {
      meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, -pointer.y * 0.03, 0.04);
      meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y,  pointer.x * 0.02, 0.04);
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -1.2]}>
      <planeGeometry args={[9.0, 5.2]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

class EnvironmentErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err) {
    console.warn('[HeroScene] Environment HDR failed to load, falling back to lights-only:', err?.message);
  }
  render() { return this.state.failed ? null : this.props.children; }
}

function SafeEnvironment() {
  return (
    <EnvironmentErrorBoundary>
      <Suspense fallback={null}>
        <Environment files="/env-night-256.hdr" background={false} blur={0.4} environmentIntensity={1.5} />
      </Suspense>
    </EnvironmentErrorBoundary>
  );
}

// Signals the landing page once the scene has actually put pixels on screen.
// Two frames, so the reveal never uncovers a half-drawn first frame.
function FirstFrameReporter() {
  const frames = useRef(0);
  useFrame(() => {
    if (frames.current > 2) return;
    frames.current += 1;
    if (frames.current === 3) reportScene({ firstFrame: true });
  });
  return null;
}

function SceneSetup({ mouseRef, authPhase, authInputPos, authMode, isMobile }) {
  return (
    <>
      <DynamicLights />
      <AmbientDust />
      <SkullGrid isMobile={isMobile} />
      <SafeEnvironment />
      <SkullModel mouseRef={isMobile ? null : mouseRef} authPhase={authPhase} authInputPos={authInputPos} authMode={authMode} isMobile={isMobile} />
      <FirstFrameReporter />
    </>
  );
}

// Mirrors drei's real asset-load progress into the drei-free store the landing
// page reads, so the loader bar stays truthful without App.jsx importing drei.
function ProgressBridge() {
  const { progress, active } = useProgress();
  useEffect(() => {
    reportScene({ progress: active ? Math.min(progress, 99) : Math.max(progress, 0) });
  }, [progress, active]);
  return null;
}

export default function HeroScene({ authPhase, authInputPos, authMode = false, onReady }) {
  const containerRef = useRef(null);
  const mouseRef     = useRef({ x: 0, y: 0 });
  const [isMobile,   setIsMobile]   = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [frameloop,  setFrameloop]  = useState('always');
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    if (authMode) return;
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      const { screen, overlay } = getHeroVideos();
      if (e.isIntersecting) {
        setFrameloop('always');
        screen.play().catch(() => {});
        overlay.play().catch(() => {});
      } else {
        setFrameloop('never');
        screen.pause();
        overlay.pause();
      }
    }, { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [authMode]);

  useEffect(() => {
    if (isMobile) return;
    const handlePointerMove = (e) => {

      const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      const last = events[events.length - 1];
      mouseRef.current = {
        x: (last.clientX / window.innerWidth)  * 2 - 1,
        y: -(last.clientY / window.innerHeight) * 2 + 1,
      };
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, [isMobile]);

  const camPos = authMode ? [0, 0.2, 2.1] : [0, 0, 4.0];

  return (
    <div className="hero-scene-container" ref={containerRef}>
      <ProgressBridge />
      <Canvas
        frameloop={frameloop}
        camera={{ position: camPos, fov: 45, near: 0.1, far: 100 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <Suspense fallback={null}>
          <SceneSetup
            mouseRef={mouseRef}
            authPhase={authPhase}
            authInputPos={authInputPos}
            authMode={authMode}
            isMobile={isMobile}
          />
        </Suspense>
      </Canvas>

      <div style={{
        position:       'absolute',
        inset:          0,
        pointerEvents:  'none',
        zIndex:         10,
        background: `
          linear-gradient(to right,  rgba(10,10,15,0.88) 0%, transparent 20%),
          linear-gradient(to left,   rgba(10,10,15,0.88) 0%, transparent 20%),
          linear-gradient(to bottom, rgba(10,10,15,0.85) 0%, transparent 20%),
          linear-gradient(to top,    rgba(10,10,15,0.85) 0%, transparent 20%)
        `,
      }} />
    </div>
  );
}

useGLTF.setDecoderPath('/draco/');
useGLTF.preload('/hero.glb');
