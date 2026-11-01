import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ThreeBackground({ className = "absolute inset-0 z-0 pointer-events-none overflow-hidden" }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect WebGL support safely
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) return;
    } catch (e) {
      return;
    }

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0e1a, 0.018);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(
      45,
      width / height,
      0.1,
      1000
    );
    camera.position.set(0, 15, 42);
    camera.lookAt(0, 5, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // 2. Lights
    const ambientLight = new THREE.AmbientLight(0x3b82f6, 0.6);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x6366f1, 2.5, 80);
    pointLight1.position.set(15, 20, 15);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x06b6d4, 2.2, 80);
    pointLight2.position.set(-15, 12, 10);
    scene.add(pointLight2);

    const pointLight3 = new THREE.PointLight(0xa855f7, 2, 60);
    pointLight3.position.set(0, 25, -10);
    scene.add(pointLight3);

    // 3. Central Smart City / Apartment Blocks Cluster
    const cityGroup = new THREE.Group();
    scene.add(cityGroup);

    // Building definitions: [x, z, width, height, depth, color, isMain]
    const buildingsData = [
      // Central Twin Towers representing NNG & NB blocks
      { x: -4.5, z: 0, w: 4.5, h: 18, d: 4.5, color: 0x4f46e5, main: true, label: 'NNG' },
      { x: 4.5, z: 0, w: 4.5, h: 18, d: 4.5, color: 0x06b6d4, main: true, label: 'NB' },
      // Surrounding modern architectural blocks
      { x: -11, z: -5, w: 3.5, h: 12, d: 3.5, color: 0x6366f1, main: false },
      { x: 11, z: -5, w: 3.5, h: 13, d: 3.5, color: 0x8b5cf6, main: false },
      { x: -9, z: 6, w: 3, h: 9, d: 3, color: 0x3b82f6, main: false },
      { x: 9, z: 6, w: 3, h: 10, d: 3, color: 0x0ea5e9, main: false },
      { x: 0, z: -9, w: 5, h: 14, d: 3.5, color: 0x7c3aed, main: false },
      { x: -16, z: 0, w: 3, h: 7, d: 3, color: 0x4338ca, main: false },
      { x: 16, z: 0, w: 3, h: 8, d: 3, color: 0x0284c7, main: false },
      { x: -6, z: 10, w: 2.5, h: 6, d: 2.5, color: 0x6366f1, main: false },
      { x: 6, z: 10, w: 2.5, h: 6, d: 2.5, color: 0x06b6d4, main: false },
    ];

    const windowMaterials = [
      new THREE.MeshBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.85 }),
      new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.9 }),
      new THREE.MeshBasicMaterial({ color: 0xc4b5fd, transparent: true, opacity: 0.85 }),
    ];

    buildingsData.forEach((b) => {
      // Solid glass-tinted building body
      const geom = new THREE.BoxGeometry(b.w, b.h, b.d);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        metalness: 0.85,
        roughness: 0.2,
        transparent: true,
        opacity: 0.88,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(b.x, b.h / 2, b.z);
      cityGroup.add(mesh);

      // Glowing edges wireframe
      const edges = new THREE.EdgesGeometry(geom);
      const lineMat = new THREE.LineBasicMaterial({
        color: b.color,
        transparent: true,
        opacity: b.main ? 0.95 : 0.45,
        linewidth: b.main ? 2 : 1,
      });
      const wireframe = new THREE.LineSegments(edges, lineMat);
      wireframe.position.copy(mesh.position);
      cityGroup.add(wireframe);

      // Add architectural window grid dots on the facade
      const floors = Math.floor(b.h / 1.6);
      const cols = Math.floor(b.w / 1.2);
      if (floors > 1 && cols > 0) {
        const winGeom = new THREE.BoxGeometry(0.35, 0.4, 0.05);
        for (let f = 1; f < floors; f++) {
          for (let c = 0; c < cols; c++) {
            // Randomly illuminate some apartments
            if (Math.random() > 0.35) {
              const winMat = windowMaterials[Math.floor(Math.random() * windowMaterials.length)];
              const winMesh = new THREE.Mesh(winGeom, winMat);
              const xOffset = (c - (cols - 1) / 2) * 1.0;
              const yOffset = f * 1.5 - b.h / 2 + 1;
              winMesh.position.set(b.x + xOffset, b.h / 2 + yOffset, b.z + b.d / 2 + 0.04);
              cityGroup.add(winMesh);
            }
          }
        }
      }

      // Beacon on top of the main towers
      if (b.main) {
        const beaconGeom = new THREE.SphereGeometry(0.25, 12, 12);
        const beaconMat = new THREE.MeshBasicMaterial({
          color: b.color,
          transparent: true,
          opacity: 0.95,
        });
        const beacon = new THREE.Mesh(beaconGeom, beaconMat);
        beacon.position.set(b.x, b.h + 0.3, b.z);
        cityGroup.add(beacon);

        // Antenna
        const antennaGeom = new THREE.CylinderGeometry(0.04, 0.06, 2, 8);
        const antennaMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
        const antenna = new THREE.Mesh(antennaGeom, antennaMat);
        antenna.position.set(b.x, b.h + 1, b.z);
        cityGroup.add(antenna);
      }
    });

    // 4. Ground Cyber Grid & Concentric Data Rings
    const gridHelper = new THREE.GridHelper(70, 50, 0x6366f1, 0x1e293b);
    gridHelper.position.y = 0;
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.4;
    scene.add(gridHelper);

    // Glowing Concentric Rings
    const ringGroup = new THREE.Group();
    scene.add(ringGroup);
    [10, 18, 26, 34].forEach((radius, idx) => {
      const ringGeom = new THREE.RingGeometry(radius, radius + 0.08, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: idx % 2 === 0 ? 0x06b6d4 : 0x8b5cf6,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.35 - idx * 0.07,
      });
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.y = 0.05 + idx * 0.02;
      ringGroup.add(ringMesh);
    });


    // 6. Interactive Mouse Orbit / Parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (event) => {
      const windowHalfX = window.innerWidth / 2;
      const windowHalfY = window.innerHeight / 2;
      mouseX = (event.clientX - windowHalfX) * 0.0008;
      mouseY = (event.clientY - windowHalfY) * 0.0008;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // 7. Window & Container Resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);

    // 8. Animation Loop
    let animationFrameId;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth camera parallax
      targetX = mouseX * 25;
      targetY = 15 - mouseY * 15;
      camera.position.x += (targetX - camera.position.x) * 0.035;
      camera.position.y += (Math.max(6, targetY) - camera.position.y) * 0.035;
      camera.lookAt(0, 5, 0);

      // Slow majestic city rotation
      cityGroup.rotation.y = elapsedTime * 0.05;
      ringGroup.rotation.z = -elapsedTime * 0.03;

      // Orbiting lights
      pointLight1.position.x = Math.sin(elapsedTime * 0.4) * 22;
      pointLight1.position.z = Math.cos(elapsedTime * 0.4) * 22;

      pointLight2.position.x = Math.cos(elapsedTime * 0.35) * 20;
      pointLight2.position.z = Math.sin(elapsedTime * 0.35) * 20;

      renderer.render(scene, camera);
    };

    animate();

    // 9. Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);

      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }

      // Dispose geometries & materials
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={className}
      aria-hidden="true"
    />
  );
}
