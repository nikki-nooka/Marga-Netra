import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  Layers,
  Sparkles,
  GitFork,
  Radio,
  Eye,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  RotateCcw,
  Zap,
  Activity,
  Compass,
  Box,
  Building,
  Flame,
  CloudRain,
  Sun,
  ShieldAlert,
  ChevronRight,
  TrendingUp,
  Clock,
  Gauge
} from 'lucide-react';
import type { RoadSegment, JunctionNode } from '../../types/neurax';

interface Network3DDigitalTwinProps {
  nodes: JunctionNode[];
  segments: RoadSegment[];
  onSelectRoad?: (segment: RoadSegment) => void;
  onTraceSpillback?: (segmentId: string) => void;
  onForecast?: (segmentId: string) => void;
  onPlanDiversion?: (segmentId: string) => void;
}

// Iconic Hyderabad Metropolitan Landmarks mapped to coordinate space
const METRO_LANDMARKS = [
  { name: 'HITEC Cyber Towers', x: 6, y: 5, height: 28, type: 'landmark' },
  { name: 'Gachibowli Financial Hub', x: 3, y: 7, height: 34, type: 'financial' },
  { name: 'Outer Ring Interchange', x: 10, y: 9, height: 22, type: 'interchange' },
  { name: 'Mindspace IT Park', x: 4, y: 4, height: 25, type: 'tech' },
  { name: 'Durgam Cable Bridge Link', x: 7, y: 3, height: 18, type: 'bridge' },
  { name: 'Madhapur Metro Hub', x: 8, y: 6, height: 20, type: 'transit' }
];

export const Network3DDigitalTwin: React.FC<Network3DDigitalTwinProps> = ({
  nodes,
  segments,
  onSelectRoad,
  onTraceSpillback,
  onForecast,
  onPlanDiversion
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // States
  const [selectedSegment, setSelectedSegment] = useState<RoadSegment | null>(null);
  const [hoveredSegment, setHoveredSegment] = useState<RoadSegment | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlayingParticles, setIsPlayingParticles] = useState(true);
  const [cameraPreset, setCameraPreset] = useState<'isometric' | 'topdown' | 'elevation' | 'flythrough'>('isometric');
  const [elevationMode, setElevationMode] = useState(false);
  const [showBuildings, setShowBuildings] = useState(true);
  const [showBeacons, setShowBeacons] = useState(true);
  const [weatherMode, setWeatherMode] = useState<'neon' | 'sunset' | 'rain'>('neon');
  const [visualTheme, setVisualTheme] = useState<'blueprint' | 'titanium' | 'neon'>('blueprint');
  const [adminFilter, setAdminFilter] = useState<'all' | 'critical' | 'arterials'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [shockwaveActive, setShockwaveActive] = useState(false);
  const [shockwaveSegment, setShockwaveSegment] = useState<string | null>(null);

  // Node coordinate lookup
  const nodeMap = useMemo(() => {
    const map = new Map<string, JunctionNode>();
    nodes.forEach((n) => map.set(n.node_id, n));
    return map;
  }, [nodes]);

  // Normalization bounds to scale node coords into 3D world [-150, 150]
  const bounds = useMemo(() => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodes.forEach((n) => {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    });
    return { minX, maxX, minY, maxY };
  }, [nodes]);

  // World coordinate projection
  const toWorld = useCallback((x: number, y: number): [number, number] => {
    const rangeX = bounds.maxX - bounds.minX || 1;
    const rangeY = bounds.maxY - bounds.minY || 1;
    const wx = ((x - bounds.minX) / rangeX - 0.5) * 260;
    const wz = ((y - bounds.minY) / rangeY - 0.5) * 200;
    return [wx, wz];
  }, [bounds]);

  // Critical segments
  const criticalSegments = useMemo(() => {
    return segments.filter((s) => s.ai_risk_level === 'CRITICAL');
  }, [segments]);

  // References for Three.js engine
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const groundMeshRef = useRef<THREE.Mesh | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const roadMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const roadLinesRef = useRef<Map<string, THREE.Line>>(new Map());
  const particlesRef = useRef<THREE.Points | null>(null);
  const particleDataRef = useRef<{ positions: Float32Array; velocities: number[]; segIndices: number[]; tValues: number[] } | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const buildingsGroupRef = useRef<THREE.Group | null>(null);
  const beaconsGroupRef = useRef<THREE.Group | null>(null);
  const shockwaveRingsRef = useRef<THREE.Mesh[]>([]);

  // Initialize Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene & Background Fog - Default Executive Blueprint Light Mode
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf1f5f9); // Slate-100 crisp light
    scene.fog = new THREE.FogExp2(0xf1f5f9, 0.003);
    sceneRef.current = scene;

    // 2. Camera setup
    const aspect = container.clientWidth / container.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, aspect, 1, 2000);
    camera.position.set(0, 220, 260);
    cameraRef.current = camera;

    // 3. Renderer with Antialiasing
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // 4. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // prevent going beneath ground
    controls.minDistance = 30;
    controls.maxDistance = 600;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // 5. Ground Plane with Holographic Matrix Grid
    const groundSize = 400;
    const gridHelper = new THREE.GridHelper(groundSize, 50, 0x0284c7, 0xcbd5e1);
    gridHelper.position.y = -0.1;
    scene.add(gridHelper);
    gridHelperRef.current = gridHelper;

    // Sub-ground architectural surface
    const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.1
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);
    groundMeshRef.current = groundMesh;

    // 6. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const dirLight = new THREE.DirectionalLight(0x1d4ed8, 1.3);
    dirLight.position.set(100, 200, 100);
    dirLight.castShadow = true;
    scene.add(dirLight);
    dirLightRef.current = dirLight;

    const accentLight = new THREE.PointLight(0x3b82f6, 2, 300);
    accentLight.position.set(0, 80, 0);
    scene.add(accentLight);

    // 7. Render 3D Road Conduits (Ribbons / Cylinders)
    const roadGroup = new THREE.Group();
    scene.add(roadGroup);

    roadMeshesRef.current.clear();
    roadLinesRef.current.clear();

    segments.forEach((seg) => {
      const u = nodeMap.get(seg.source_node);
      const v = nodeMap.get(seg.target_node);
      if (!u || !v) return;

      const [x1, z1] = toWorld(u.x, u.y);
      const [x2, z2] = toWorld(v.x, v.y);

      // Height elevation based on congestion
      const elev = elevationMode
        ? (seg.ai_risk_level === 'CRITICAL' ? 22 : seg.ai_risk_level === 'ELEVATED' ? 12 : 2)
        : 0;

      const p1 = new THREE.Vector3(x1, elev, z1);
      const p2 = new THREE.Vector3(x2, elev, z2);

      // Color coding
      let colorHex = 0x334155; // default slate
      let emissiveHex = 0x0f172a;
      let emissiveIntensity = 0.4;
      let tubeRadius = 0.55;

      if (seg.ai_risk_level === 'CRITICAL') {
        colorHex = 0xf43f5e; // rose neon
        emissiveHex = 0xe11d48;
        emissiveIntensity = 1.6;
        tubeRadius = 1.1;
      } else if (seg.ai_risk_level === 'ELEVATED') {
        colorHex = 0xf59e0b; // amber neon
        emissiveHex = 0xd97706;
        emissiveIntensity = 1.1;
        tubeRadius = 0.85;
      } else if (seg.speed_ratio > 0.75) {
        colorHex = 0x10b981; // emerald flow
        emissiveHex = 0x059669;
        emissiveIntensity = 0.8;
        tubeRadius = 0.65;
      }

      // 3D Tube Geometry
      const path = new THREE.LineCurve3(p1, p2);
      const tubeGeo = new THREE.TubeGeometry(path, 4, tubeRadius, 6, false);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: emissiveHex,
        emissiveIntensity: emissiveIntensity,
        roughness: 0.3,
        metalness: 0.6
      });

      const mesh = new THREE.Mesh(tubeGeo, tubeMat);
      mesh.userData = { segment: seg, originalColor: colorHex };
      mesh.castShadow = true;
      roadGroup.add(mesh);
      roadMeshesRef.current.set(seg.segment_id, mesh);
    });

    // 8. Junction Towers / Signal Beacons
    const nodesGroup = new THREE.Group();
    scene.add(nodesGroup);

    nodes.forEach((n) => {
      const [wx, wz] = toWorld(n.x, n.y);
      const isSignal = n.is_signalized;

      // Base cylinder
      const baseGeo = new THREE.CylinderGeometry(isSignal ? 1.6 : 0.9, isSignal ? 1.8 : 1.0, 1.2, 8);
      const baseMat = new THREE.MeshStandardMaterial({
        color: isSignal ? 0x0284c7 : 0x475569,
        emissive: isSignal ? 0x38bdf8 : 0x1e293b,
        emissiveIntensity: isSignal ? 1.2 : 0.3
      });
      const nodeMesh = new THREE.Mesh(baseGeo, baseMat);
      nodeMesh.position.set(wx, 0.6, wz);
      nodesGroup.add(nodeMesh);

      // Halo ring for signalized junctions
      if (isSignal) {
        const ringGeo = new THREE.RingGeometry(2.0, 2.4, 16);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.6
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = -Math.PI / 2;
        ringMesh.position.set(wx, 0.1, wz);
        nodesGroup.add(ringMesh);
      }
    });

    // 9. Procedural 3D City Skyline / Holographic Buildings
    const buildingsGroup = new THREE.Group();
    buildingsGroupRef.current = buildingsGroup;
    scene.add(buildingsGroup);

    // Create Cyber City Architecture Blocks
    const buildingGeo = new THREE.BoxGeometry(1, 1, 1);
    const buildingEdges = new THREE.EdgesGeometry(buildingGeo);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x1e293b, transparent: true, opacity: 0.7 });

    // Seeded procedural buildings around the grid junctions
    for (let bx = bounds.minX; bx <= bounds.maxX; bx += 1.8) {
      for (let by = bounds.minY; by <= bounds.maxY; by += 1.8) {
        const [wx, wz] = toWorld(bx + (Math.sin(bx * 7 + by) * 0.4), by + (Math.cos(by * 5) * 0.4));
        // Avoid placing on road centers
        const isNearCenter = Math.abs(wx) < 15 && Math.abs(wz) < 15;
        const bHeight = isNearCenter ? 26 + (Math.sin(wx) * 14) : 8 + ((bx * 3 + by * 7) % 24);
        const bWidth = 6 + ((bx + by) % 4);
        const bDepth = 6 + ((bx * 2) % 4);

        const bMat = new THREE.MeshStandardMaterial({
          color: 0x09101f,
          roughness: 0.8,
          metalness: 0.3,
          transparent: true,
          opacity: 0.85
        });

        const bMesh = new THREE.Mesh(buildingGeo, bMat);
        bMesh.scale.set(bWidth, bHeight, bDepth);
        bMesh.position.set(wx + 4, bHeight / 2, wz + 4);
        bMesh.castShadow = true;
        buildingsGroup.add(bMesh);

        // Neon roof edge highlight
        const wireframe = new THREE.LineSegments(buildingEdges, lineMat);
        wireframe.scale.set(bWidth, bHeight, bDepth);
        wireframe.position.copy(bMesh.position);
        buildingsGroup.add(wireframe);
      }
    }

    // Iconic Landmarks
    METRO_LANDMARKS.forEach((lm) => {
      const [lx, lz] = toWorld(lm.x, lm.y);
      const lmGeo = new THREE.CylinderGeometry(2, 4.5, lm.height, 6);
      const lmMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        emissive: 0x6366f1,
        emissiveIntensity: 0.9,
        roughness: 0.2,
        metalness: 0.8
      });
      const lmMesh = new THREE.Mesh(lmGeo, lmMat);
      lmMesh.position.set(lx - 2, lm.height / 2, lz - 2);
      buildingsGroup.add(lmMesh);

      // Floating landmark crown ring
      const crownGeo = new THREE.TorusGeometry(3.5, 0.4, 8, 24);
      const crownMat = new THREE.MeshBasicMaterial({ color: 0x818cf8, wireframe: true });
      const crownMesh = new THREE.Mesh(crownGeo, crownMat);
      crownMesh.position.set(lx - 2, lm.height + 1, lz - 2);
      crownMesh.rotation.x = Math.PI / 2;
      buildingsGroup.add(crownMesh);
    });

    // 10. Critical Bottleneck Holographic Laser Beacons & Shockwave Discs
    const beaconsGroup = new THREE.Group();
    beaconsGroupRef.current = beaconsGroup;
    scene.add(beaconsGroup);

    criticalSegments.slice(0, 5).forEach((seg) => {
      const u = nodeMap.get(seg.source_node);
      if (!u) return;
      const [bx, bz] = toWorld(u.x, u.y);

      // Vertical laser beam
      const beamGeo = new THREE.CylinderGeometry(0.3, 0.8, 80, 8);
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0xf43f5e,
        transparent: true,
        opacity: 0.65
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(bx, 40, bz);
      beaconsGroup.add(beam);

      // Ground shockwave pulsating disk
      const diskGeo = new THREE.RingGeometry(1, 8, 32);
      const diskMat = new THREE.MeshBasicMaterial({
        color: 0xf43f5e,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7
      });
      const disk = new THREE.Mesh(diskGeo, diskMat);
      disk.rotation.x = -Math.PI / 2;
      disk.position.set(bx, 0.3, bz);
      beaconsGroup.add(disk);
      shockwaveRingsRef.current.push(disk);
    });

    // 11. 3D Particle Vehicle Flow System (Hundreds of animated light packets)
    const particleCount = 1400;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    const particleVelocities: number[] = [];
    const segIndices: number[] = [];
    const tValues: number[] = [];

    const activeSegArray = segments.filter((s) => s.flow_vph > 0);

    for (let i = 0; i < particleCount; i++) {
      const segIndex = Math.floor(Math.random() * activeSegArray.length);
      const seg = activeSegArray[segIndex];
      const t = Math.random();

      const u = nodeMap.get(seg.source_node);
      const v = nodeMap.get(seg.target_node);
      if (u && v) {
        const [x1, z1] = toWorld(u.x, u.y);
        const [x2, z2] = toWorld(v.x, v.y);
        particlePositions[i * 3] = x1 + (x2 - x1) * t;
        particlePositions[i * 3 + 1] = 0.8;
        particlePositions[i * 3 + 2] = z1 + (z2 - z1) * t;
      }

      // Color by speed ratio
      const color = new THREE.Color(
        seg.ai_risk_level === 'CRITICAL' ? 0xf43f5e : seg.ai_risk_level === 'ELEVATED' ? 0xf59e0b : 0x38bdf8
      );
      particleColors[i * 3] = color.r;
      particleColors[i * 3 + 1] = color.g;
      particleColors[i * 3 + 2] = color.b;

      // Speed proportional to corridor flow velocity
      particleVelocities.push(0.003 + (seg.speed_kmh / 70) * 0.012);
      segIndices.push(segIndex);
      tValues.push(t);
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 2.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);
    particlesRef.current = particles;
    particleDataRef.current = { positions: particlePositions, velocities: particleVelocities, segIndices, tValues };

    // 12. Animation Render Loop
    let clock = new THREE.Clock();

    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      controls.update();

      // Animate Vehicles / Particles
      if (isPlayingParticles && particleDataRef.current && particlesRef.current) {
        const pData = particleDataRef.current;
        const posAttr = particlesRef.current.geometry.attributes.position as THREE.BufferAttribute;

        for (let i = 0; i < particleCount; i++) {
          pData.tValues[i] += pData.velocities[i];
          if (pData.tValues[i] > 1.0) {
            pData.tValues[i] = 0;
          }

          const seg = activeSegArray[pData.segIndices[i]];
          const u = nodeMap.get(seg.source_node);
          const v = nodeMap.get(seg.target_node);
          if (u && v) {
            const [x1, z1] = toWorld(u.x, u.y);
            const [x2, z2] = toWorld(v.x, v.y);
            const t = pData.tValues[i];
            const elev = elevationMode
              ? (seg.ai_risk_level === 'CRITICAL' ? 22 : seg.ai_risk_level === 'ELEVATED' ? 12 : 2)
              : 0;

            posAttr.setXYZ(i, x1 + (x2 - x1) * t, elev + 0.9, z1 + (z2 - z1) * t);
          }
        }
        posAttr.needsUpdate = true;
      }

      // Animate Shockwave Rings pulsing
      shockwaveRingsRef.current.forEach((ring, idx) => {
        const s = 1 + ((elapsed * 2 + idx) % 3);
        ring.scale.set(s, s, 1);
        (ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.8 - (s / 4));
      });

      renderer.render(scene, camera);
    };

    animate();

    // 13. Raycasting for 3D Click & Hover Selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshes = Array.from(roadMeshesRef.current.values());
      const intersects = raycaster.intersectObjects(meshes, false);

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        const seg = hit.userData.segment as RoadSegment;
        setHoveredSegment(seg);
        container.style.cursor = 'pointer';
      } else {
        setHoveredSegment(null);
        container.style.cursor = 'grab';
      }
    };

    const onPointerDown = (event: MouseEvent) => {
      if (event.button !== 0) return; // only left click
      const rect = container.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshes = Array.from(roadMeshesRef.current.values());
      const intersects = raycaster.intersectObjects(meshes, false);

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        const seg = hit.userData.segment as RoadSegment;
        setSelectedSegment(seg);
        onSelectRoad?.(seg);

        // Smoothly orbit camera to focus on this corridor
        const u = nodeMap.get(seg.source_node);
        if (u) {
          const [tx, tz] = toWorld(u.x, u.y);
          controls.target.set(tx, 0, tz);
        }
      }
    };

    container.addEventListener('mousemove', onPointerMove);
    container.addEventListener('click', onPointerDown);

    // 14. Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });

    resizeObserver.observe(container);

    // Cleanup
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      resizeObserver.disconnect();
      container.removeEventListener('mousemove', onPointerMove);
      container.removeEventListener('click', onPointerDown);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [nodes, segments, elevationMode, toWorld, nodeMap, isPlayingParticles, onSelectRoad, criticalSegments]);

  // Handle Camera Presets
  const applyCameraPreset = (preset: 'isometric' | 'topdown' | 'elevation' | 'flythrough') => {
    setCameraPreset(preset);
    if (!cameraRef.current || !controlsRef.current) return;
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;

    if (preset === 'isometric') {
      cam.position.set(0, 220, 240);
      ctrl.target.set(0, 0, 0);
      setElevationMode(false);
    } else if (preset === 'topdown') {
      cam.position.set(0, 360, 1);
      ctrl.target.set(0, 0, 0);
      setElevationMode(false);
    } else if (preset === 'elevation') {
      cam.position.set(-160, 180, 200);
      ctrl.target.set(0, 10, 0);
      setElevationMode(true);
    } else if (preset === 'flythrough') {
      cam.position.set(0, 35, 120);
      ctrl.target.set(0, 15, -40);
      setElevationMode(false);
    }
    ctrl.update();
  };

  // Trigger Shockwave Wave Simulation
  const triggerShockwaveScan = () => {
    setShockwaveActive(true);
    const target = criticalSegments[0]?.segment_id || 'R0435';
    setShockwaveSegment(target);

    // Camera target focus
    const seg = segments.find((s) => s.segment_id === target);
    if (seg && cameraRef.current && controlsRef.current) {
      const u = nodeMap.get(seg.source_node);
      if (u) {
        const [wx, wz] = toWorld(u.x, u.y);
        controlsRef.current.target.set(wx, 5, wz);
      }
    }

    setTimeout(() => {
      setShockwaveActive(false);
    }, 4500);
  };

  // Apply visual theme to 3D scene (Executive Blueprint / Tactical Titanium / Cyber Neon)
  useEffect(() => {
    if (!sceneRef.current) return;
    if (visualTheme === 'blueprint') {
      sceneRef.current.background = new THREE.Color(0xf1f5f9); // slate-100 crisp architectural light
      sceneRef.current.fog = new THREE.FogExp2(0xf1f5f9, 0.003);
      if (ambientLightRef.current) ambientLightRef.current.intensity = 1.6;
      if (dirLightRef.current) {
        dirLightRef.current.color.setHex(0x1d4ed8);
        dirLightRef.current.intensity = 1.3;
      }
      if (groundMeshRef.current) {
        (groundMeshRef.current.material as THREE.MeshStandardMaterial).color.setHex(0xffffff);
        (groundMeshRef.current.material as THREE.MeshStandardMaterial).roughness = 0.95;
      }
    } else if (visualTheme === 'titanium') {
      sceneRef.current.background = new THREE.Color(0x0f172a); // slate-900
      sceneRef.current.fog = new THREE.FogExp2(0x0f172a, 0.0035);
      if (ambientLightRef.current) ambientLightRef.current.intensity = 1.0;
      if (dirLightRef.current) {
        dirLightRef.current.color.setHex(0x38bdf8);
        dirLightRef.current.intensity = 1.2;
      }
      if (groundMeshRef.current) {
        (groundMeshRef.current.material as THREE.MeshStandardMaterial).color.setHex(0x090e17);
        (groundMeshRef.current.material as THREE.MeshStandardMaterial).roughness = 0.65;
      }
    } else {
      // neon
      sceneRef.current.background = new THREE.Color(0x030712); // slate-950
      sceneRef.current.fog = new THREE.FogExp2(0x030712, 0.0038);
      if (ambientLightRef.current) ambientLightRef.current.intensity = 0.8;
      if (dirLightRef.current) {
        dirLightRef.current.color.setHex(0x38bdf8);
        dirLightRef.current.intensity = 1.4;
      }
      if (groundMeshRef.current) {
        (groundMeshRef.current.material as THREE.MeshStandardMaterial).color.setHex(0x070d1a);
        (groundMeshRef.current.material as THREE.MeshStandardMaterial).roughness = 0.65;
      }
    }
  }, [visualTheme]);

  // Search & Focus Corridor
  const handleSearchFocus = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) return;
    const lower = query.toLowerCase().trim();
    const matched = segments.find(
      (s) =>
        s.segment_id.toLowerCase().includes(lower) ||
        s.source_node.toLowerCase().includes(lower) ||
        s.target_node.toLowerCase().includes(lower)
    );
    if (matched) {
      setSelectedSegment(matched);
      const u = nodeMap.get(matched.source_node);
      if (u && cameraRef.current && controlsRef.current) {
        const [wx, wz] = toWorld(u.x, u.y);
        controlsRef.current.target.set(wx, 5, wz);
        cameraRef.current.position.set(wx, 60, wz + 90);
        controlsRef.current.update();
      }
    }
  };

  // Weather atmosphere toggles
  const applyWeather = (mode: 'neon' | 'sunset' | 'rain') => {
    setWeatherMode(mode);
    if (!sceneRef.current) return;
    if (mode === 'neon') {
      sceneRef.current.background = new THREE.Color(visualTheme === 'blueprint' ? 0xf1f5f9 : 0x030712);
      sceneRef.current.fog = new THREE.FogExp2(visualTheme === 'blueprint' ? 0xf1f5f9 : 0x030712, 0.0035);
    } else if (mode === 'sunset') {
      sceneRef.current.background = new THREE.Color(visualTheme === 'blueprint' ? 0xffedd5 : 0x180d19);
      sceneRef.current.fog = new THREE.FogExp2(visualTheme === 'blueprint' ? 0xffedd5 : 0x180d19, 0.003);
    } else if (mode === 'rain') {
      sceneRef.current.background = new THREE.Color(visualTheme === 'blueprint' ? 0xe0f2fe : 0x04111d);
      sceneRef.current.fog = new THREE.FogExp2(visualTheme === 'blueprint' ? 0xe0f2fe : 0x04111d, 0.0045);
    }
  };

  // Toggle building visibility
  useEffect(() => {
    if (buildingsGroupRef.current) {
      buildingsGroupRef.current.visible = showBuildings;
    }
  }, [showBuildings]);

  // Toggle laser beacons visibility
  useEffect(() => {
    if (beaconsGroupRef.current) {
      beaconsGroupRef.current.visible = showBeacons;
    }
  }, [showBeacons]);

  const isBlueprint = visualTheme === 'blueprint';

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden border transition-all shadow-2xl ${
        isBlueprint
          ? 'border-slate-300 bg-slate-100 text-slate-800'
          : 'border-slate-800 bg-slate-950 text-white'
      } ${isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen' : 'h-[640px]'}`}
    >
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Floating Glassmorphic Administrator HUD Bar */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-3 pointer-events-none flex-wrap">
        {/* Left Title & Telemetry */}
        <div
          className={`backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-xl pointer-events-auto flex items-center gap-3 border ${
            isBlueprint
              ? 'bg-white/95 border-slate-200/90 text-slate-900'
              : 'bg-slate-900/90 border-slate-700/80 text-white'
          }`}
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-sm shrink-0">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wide">Administrator 3D Scope</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 border border-blue-500/30">
                {isBlueprint ? 'Architectural Blueprint' : 'Tactical Matrix'}
              </span>
            </div>
            <div className={`text-[11px] flex items-center gap-2 ${isBlueprint ? 'text-slate-500' : 'text-slate-400'}`}>
              <span>{nodes.length} Nodes</span>
              <span>•</span>
              <span>{segments.length} Conduits</span>
              <span>•</span>
              <span className="text-emerald-600 font-bold">1,400 Photons Active</span>
            </div>
          </div>
        </div>

        {/* Center Administrator Quick Search & Filter */}
        <div
          className={`backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-xl pointer-events-auto flex items-center gap-2 border text-xs ${
            isBlueprint
              ? 'bg-white/95 border-slate-200/90 text-slate-900'
              : 'bg-slate-900/90 border-slate-700/80 text-white'
          }`}
        >
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-700">
            <input
              type="text"
              placeholder="Search corridor (e.g. R0435, Cyber)..."
              value={searchQuery}
              onChange={(e) => handleSearchFocus(e.target.value)}
              className="bg-transparent text-xs outline-none w-36 sm:w-44 text-slate-900 placeholder:text-slate-400 font-medium"
            />
          </div>

          {/* Quick theme toggles for the administrator */}
          <div className="flex items-center bg-slate-100/90 p-0.5 rounded-xl border border-slate-200 gap-0.5">
            <button
              onClick={() => setVisualTheme('blueprint')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                visualTheme === 'blueprint'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Executive Blueprint (Crisp White Architecture)"
            >
              Blueprint
            </button>
            <button
              onClick={() => setVisualTheme('titanium')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                visualTheme === 'titanium'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Tactical Slate (Dark Mode)"
            >
              Titanium
            </button>
            <button
              onClick={() => setVisualTheme('neon')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                visualTheme === 'neon'
                  ? 'bg-cyan-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Cyber Neon"
            >
              Neon
            </button>
          </div>
        </div>

        {/* Right Camera & Shockwave Tools */}
        <div
          className={`backdrop-blur-md p-1.5 rounded-2xl shadow-xl pointer-events-auto flex items-center gap-1.5 border ${
            isBlueprint
              ? 'bg-white/95 border-slate-200/90 text-slate-900'
              : 'bg-slate-900/90 border-slate-700/80 text-white'
          }`}
        >
          {/* Shockwave Scan Button */}
          <button
            onClick={triggerShockwaveScan}
            title="Simulate 3D Backward Shockwave Pulse"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              shockwaveActive
                ? 'bg-rose-600 text-white animate-bounce'
                : isBlueprint
                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                : 'bg-slate-800 text-rose-300 hover:bg-rose-950/60 border border-rose-500/30'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-rose-500" />
            <span>{shockwaveActive ? 'Propagating Wave...' : 'Shockwave Pulse'}</span>
          </button>

          {/* Perspective Selector */}
          <button
            onClick={() =>
              applyCameraPreset(
                cameraPreset === 'isometric'
                  ? 'elevation'
                  : cameraPreset === 'elevation'
                  ? 'topdown'
                  : 'isometric'
              )
            }
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition ${
              isBlueprint
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Switch Camera Preset"
          >
            <Box className="w-3.5 h-3.5 inline mr-1" />
            <span className="capitalize">{cameraPreset}</span>
          </button>

          {/* Toggle Flow Animation */}
          <button
            onClick={() => setIsPlayingParticles(!isPlayingParticles)}
            title={isPlayingParticles ? 'Pause Traffic Stream' : 'Resume Traffic Stream'}
            className={`p-1.5 rounded-xl border transition ${
              isBlueprint
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            {isPlayingParticles ? <Pause className="w-4 h-4 text-blue-600" /> : <Play className="w-4 h-4 text-emerald-600" />}
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Command Scope'}
            className={`p-1.5 rounded-xl border transition ${
              isBlueprint
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Shockwave Active Floating Alert */}
      {shockwaveActive && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-rose-600 text-white px-4 py-2 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-2.5 animate-pulse pointer-events-none z-30">
          <ShieldAlert className="w-5 h-5 text-white" />
          <div>
            <div className="text-xs font-black">Back-Spill Shockwave Active (w = -18.4 km/h)</div>
            <div className="text-[11px] text-rose-100">Propagating backward through upstream interchange nodes</div>
          </div>
        </div>
      )}

      {/* Bottom Floating Legend & Quick Controls */}
      <div
        className={`absolute bottom-3 left-3 backdrop-blur-md text-[11px] p-2.5 rounded-2xl flex items-center gap-4 shadow-xl pointer-events-auto border ${
          isBlueprint
            ? 'bg-white/95 text-slate-700 border-slate-200/90'
            : 'bg-slate-900/90 text-slate-300 border-slate-800'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-xs shadow-rose-500" />
          <span className="font-semibold">Critical Bottleneck</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs shadow-amber-500" />
          <span className="font-semibold">Elevated Inflow</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500" />
          <span className="font-semibold">Green Wave Flow</span>
        </div>

        <div className={`h-3 w-px mx-1 ${isBlueprint ? 'bg-slate-200' : 'bg-slate-700'}`} />

        {/* 3D Layers Toggles */}
        <label className="flex items-center gap-1 cursor-pointer font-medium hover:opacity-80">
          <input
            type="checkbox"
            checked={showBuildings}
            onChange={(e) => setShowBuildings(e.target.checked)}
            className="rounded text-blue-600 focus:ring-0"
          />
          <span className="text-[10px]">Skyline Blocks</span>
        </label>

        <label className="flex items-center gap-1 cursor-pointer font-medium hover:opacity-80">
          <input
            type="checkbox"
            checked={showBeacons}
            onChange={(e) => setShowBeacons(e.target.checked)}
            className="rounded text-rose-500 focus:ring-0"
          />
          <span className="text-[10px]">Incident Beacons</span>
        </label>
      </div>

      {/* Selected / Hovered Segment Administrator Card */}
      {(hoveredSegment || selectedSegment) && (
        <div
          className={`absolute bottom-3 right-3 backdrop-blur-xl border p-4 rounded-3xl shadow-2xl w-84 pointer-events-auto space-y-3 z-30 animate-fadeIn ${
            isBlueprint
              ? 'bg-white/98 text-slate-900 border-slate-200'
              : 'bg-slate-900/95 text-white border-slate-700'
          }`}
        >
          {(() => {
            const seg = hoveredSegment || selectedSegment!;
            const isCritical = seg.ai_risk_level === 'CRITICAL';
            const isElevated = seg.ai_risk_level === 'ELEVATED';

            return (
              <div>
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono text-xs font-black px-2.5 py-1 rounded-xl border ${
                        isBlueprint
                          ? 'bg-slate-100 text-blue-700 border-slate-200'
                          : 'bg-slate-800 text-cyan-400 border-slate-700'
                      }`}
                    >
                      {seg.segment_id}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        isCritical
                          ? 'bg-rose-500/15 text-rose-600 border-rose-500/30'
                          : isElevated
                          ? 'bg-amber-500/15 text-amber-600 border-amber-500/30'
                          : 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                      }`}
                    >
                      {seg.ai_risk_level}
                    </span>
                  </div>

                  <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">
                    {seg.road_class}
                  </span>
                </div>

                <div className={`text-xs mt-2 font-medium ${isBlueprint ? 'text-slate-600' : 'text-slate-300'}`}>
                  Corridor <strong className={isBlueprint ? 'text-slate-900' : 'text-white'}>{seg.source_node}</strong> →{' '}
                  <strong className={isBlueprint ? 'text-slate-900' : 'text-white'}>{seg.target_node}</strong>
                  {seg.signal_id ? ` (Signal ${seg.signal_id})` : ''}
                </div>

                {/* Telemetry Visuals */}
                <div className={`grid grid-cols-2 gap-2 mt-2.5 pt-2.5 border-t text-xs ${isBlueprint ? 'border-slate-200' : 'border-slate-800'}`}>
                  <div className={`p-2.5 rounded-xl border ${isBlueprint ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/80 border-slate-700/60'}`}>
                    <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-500">
                      <Gauge className="w-3 h-3 text-blue-600" />
                      <span>Speed Ratio</span>
                    </div>
                    <div className={`text-sm font-bold mt-0.5 ${isBlueprint ? 'text-slate-900' : 'text-white'}`}>
                      {seg.speed_kmh} <span className="text-[10px] text-slate-400 font-normal">/ {seg.free_flow_speed_kmh} km/h</span>
                    </div>
                    <div className="text-[10px] text-blue-600 font-mono mt-0.5 font-bold">
                      {Math.round(seg.speed_ratio * 100)}% Throughput
                    </div>
                  </div>

                  <div className={`p-2.5 rounded-xl border ${isBlueprint ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/80 border-slate-700/60'}`}>
                    <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-500">
                      <Activity className="w-3 h-3 text-rose-500" />
                      <span>Queue & Delay</span>
                    </div>
                    <div className="text-sm font-bold text-rose-600 mt-0.5">
                      {seg.queue_length_veh} <span className="text-[10px] text-slate-400 font-normal">veh</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5 font-bold">
                      {seg.delay_min ? `${seg.delay_min}m delay` : 'Normal'}
                    </div>
                  </div>
                </div>

                {/* Physical corridor details */}
                <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between font-medium">
                  <span>Length: {seg.length_km} km</span>
                  <span>Lanes: {seg.lanes}</span>
                  <span>Cap: {seg.capacity_vph} vph</span>
                </div>

                {/* Instant Actions for Administrator */}
                <div className={`grid grid-cols-3 gap-1.5 mt-3 pt-2.5 border-t ${isBlueprint ? 'border-slate-200' : 'border-slate-800'}`}>
                  <button
                    onClick={() => onForecast?.(seg.segment_id)}
                    className="py-1.5 px-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Predict</span>
                  </button>
                  <button
                    onClick={() => onTraceSpillback?.(seg.segment_id)}
                    className="py-1.5 px-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer"
                  >
                    <Layers className="w-3 h-3" />
                    <span>Spillback</span>
                  </button>
                  <button
                    onClick={() => onPlanDiversion?.(seg.segment_id)}
                    className="py-1.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer"
                  >
                    <GitFork className="w-3 h-3" />
                    <span>Reroute</span>
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
