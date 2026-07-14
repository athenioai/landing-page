import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const SEPARATION = 34;
const AMOUNT_X = 34;
const AMOUNT_Y = 20;
const DOT_COLOR = 0x6ee0d6;

function makeDotTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.7)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

/**
 * Mounts an animated wave of dots inside `container`, sized to fill it.
 * Returns a teardown function that disposes the Three.js scene.
 */
export function initDottedSurface(container) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    62,
    container.clientWidth / Math.max(container.clientHeight, 1),
    1,
    3000,
  );
  camera.position.set(0, 230, 560);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const positions = [];
  const color = new THREE.Color(DOT_COLOR);
  const colors = [];

  for (let ix = 0; ix < AMOUNT_X; ix++) {
    for (let iy = 0; iy < AMOUNT_Y; iy++) {
      const x = ix * SEPARATION - (AMOUNT_X * SEPARATION) / 2;
      const z = iy * SEPARATION - (AMOUNT_Y * SEPARATION) / 2;
      positions.push(x, 0, z);
      colors.push(color.r, color.g, color.b);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const dotTexture = makeDotTexture();
  const material = new THREE.PointsMaterial({
    size: 6,
    map: dotTexture,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  let count = 0;
  let frameId = null;
  let running = true;

  function tick() {
    if (!running) return;
    frameId = requestAnimationFrame(tick);

    const positionAttribute = geometry.attributes.position;
    const array = positionAttribute.array;
    let i = 0;
    for (let ix = 0; ix < AMOUNT_X; ix++) {
      for (let iy = 0; iy < AMOUNT_Y; iy++) {
        const index = i * 3;
        array[index + 1] =
          Math.sin((ix + count) * 0.3) * 22 + Math.sin((iy + count) * 0.5) * 22;
        i++;
      }
    }
    positionAttribute.needsUpdate = true;

    renderer.render(scene, camera);
    count += 0.035;
  }

  const resizeObserver = new ResizeObserver(() => {
    const { clientWidth, clientHeight } = container;
    if (!clientWidth || !clientHeight) return;
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(clientWidth, clientHeight);
  });
  resizeObserver.observe(container);

  tick();

  return function destroy() {
    running = false;
    if (frameId !== null) cancelAnimationFrame(frameId);
    resizeObserver.disconnect();
    geometry.dispose();
    material.dispose();
    dotTexture.dispose();
    renderer.dispose();
    if (renderer.domElement.parentElement === container) {
      container.removeChild(renderer.domElement);
    }
  };
}
