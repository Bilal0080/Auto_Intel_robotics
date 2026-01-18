
import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoboticComponent, Subsystem } from '../types';
import { analyzeTelemetryHealth } from '../services/geminiService';

interface Robot3DViewerProps {
  installedComponents: Record<string, RoboticComponent>;
  jointAngles: { theta1: number; theta2: number };
  isRunning: boolean;
  highlightedSubsystem?: Subsystem;
  isEmergencyStopped?: boolean;
  spatterDensity?: number;
  spatterSize?: number;
  spatterColor?: string;
  spatterLife?: number;
}

interface ComponentHealth {
  healthScore: number;
  state: string;
  briefAnalysis: string;
  nextCalibration: string;
  isScanning: boolean;
}

const Robot3DViewer: React.FC<Robot3DViewerProps> = ({ 
  installedComponents, 
  jointAngles, 
  isRunning, 
  highlightedSubsystem,
  isEmergencyStopped,
  spatterDensity = 0.5,
  spatterSize = 0.04,
  spatterColor = '#ffaa00',
  spatterLife = 1.0
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const robotRef = useRef<THREE.Group | null>(null);
  const limbsRef = useRef<{ thigh: THREE.Mesh; calf: THREE.Mesh } | null>(null);
  const sensorFieldRef = useRef<THREE.Mesh | null>(null);
  const brainRef = useRef<THREE.Mesh | null>(null);
  const actuatorHousingRef = useRef<THREE.Group | null>(null);
  const weldGunRef = useRef<THREE.Group | null>(null);
  const tipRef = useRef<THREE.Mesh | null>(null);
  const tipLightRef = useRef<THREE.PointLight | null>(null);
  const heatGlowRef = useRef<THREE.Mesh | null>(null);
  const shimmerRef = useRef<THREE.Mesh | null>(null);
  const spatterRef = useRef<THREE.Points | null>(null);
  const safetyZoneRef = useRef<THREE.Mesh | null>(null);
  const statusLedsRef = useRef<Map<Subsystem, THREE.Mesh>>(new Map());
  const chassisRef = useRef<THREE.Mesh | null>(null);

  // Animation synchronization refs
  const isTitaniumActiveRef = useRef(false);
  const hasToolRef = useRef(false);
  const isRunningRef = useRef(isRunning);
  const isEmergencyStoppedRef = useRef(isEmergencyStopped);
  const spatterDensityRef = useRef(spatterDensity);
  const spatterSizeRef = useRef(spatterSize);
  const spatterColorRef = useRef(spatterColor);
  const spatterLifeRef = useRef(spatterLife);
  const healthRef = useRef<Record<string, ComponentHealth>>({});

  // Spatter Particle Pool
  const MAX_SPARKS = 800;
  const particleVelocities = useRef<THREE.Vector3[]>(Array.from({ length: MAX_SPARKS }, () => new THREE.Vector3()));
  
  // Health and UI State
  const [healthOverlay, setHealthOverlay] = useState<Record<string, ComponentHealth>>({});

  useEffect(() => {
    if (!containerRef.current) return;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x020617);

    const camera = new THREE.PerspectiveCamera(75, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 1000);
    camera.position.set(2.5, 3.5, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // --- Lights ---
    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);

    const mainLight = new THREE.PointLight(0x22d3ee, 40, 15);
    mainLight.position.set(2, 5, 4);
    scene.add(mainLight);

    const backLight = new THREE.PointLight(0xffffff, 15, 10);
    backLight.position.set(-3, 3, -4);
    scene.add(backLight);

    // --- Floor ---
    const grid = new THREE.GridHelper(10, 20, 0x1e293b, 0x0f172a);
    scene.add(grid);

    // --- Safety Zone ---
    const safetyGeo = new THREE.RingGeometry(1.8, 2.1, 64);
    safetyGeo.rotateX(-Math.PI / 2);
    const safetyMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0 });
    const safetyZone = new THREE.Mesh(safetyGeo, safetyMat);
    safetyZone.position.y = 0.02;
    scene.add(safetyZone);
    safetyZoneRef.current = safetyZone;

    // --- Robot Group ---
    const robot = new THREE.Group();
    robotRef.current = robot;
    scene.add(robot);

    // --- Industrial Materials ---
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 1.0, roughness: 0.15 });
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });

    const createLED = (parent: THREE.Object3D, pos: THREE.Vector3, name: Subsystem) => {
      const ledGeo = new THREE.SphereGeometry(0.045, 8, 8);
      const ledMat = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 1.5 });
      const led = new THREE.Mesh(ledGeo, ledMat);
      led.position.copy(pos);
      parent.add(led);
      statusLedsRef.current.set(name, led);
    };

    // Main Body
    const torsoGeo = new THREE.BoxGeometry(0.7, 1.1, 0.45);
    const torso = new THREE.Mesh(torsoGeo, bodyMat.clone());
    torso.position.y = 2;
    robot.add(torso);
    chassisRef.current = torso;
    createLED(torso, new THREE.Vector3(0, 0.4, 0.23), 'Torso');

    const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const head = new THREE.Mesh(headGeo, metalMat.clone());
    head.position.y = 2.85;
    robot.add(head);
    createLED(head, new THREE.Vector3(0, 0.1, 0.21), 'Head');

    const brainGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const brainMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0 });
    const brain = new THREE.Mesh(brainGeo, brainMat);
    brain.position.y = 2.85;
    robot.add(brain);
    brainRef.current = brain;

    const sensorGeo = new THREE.IcosahedronGeometry(1.8, 2);
    const sensorMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0, wireframe: true });
    const sensorField = new THREE.Mesh(sensorGeo, sensorMat);
    sensorField.position.y = 2.85;
    robot.add(sensorField);
    sensorFieldRef.current = sensorField;

    const actuatorGroup = new THREE.Group();
    actuatorGroup.position.set(0.35, 1.45, 0);
    robot.add(actuatorGroup);
    actuatorHousingRef.current = actuatorGroup;

    const housingGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.2, 32);
    housingGeo.rotateZ(Math.PI / 2);
    const housing = new THREE.Mesh(housingGeo, metalMat.clone());
    actuatorGroup.add(housing);

    const glowRingGeo = new THREE.TorusGeometry(0.18, 0.02, 16, 64);
    glowRingGeo.rotateY(Math.PI / 2);
    const glowRingMat = new THREE.MeshBasicMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0 });
    const glowRing = new THREE.Mesh(glowRingGeo, glowRingMat);
    glowRing.position.x = 0.11;
    actuatorGroup.add(glowRing);

    // Weld Tool
    const weldGunGroup = new THREE.Group();
    weldGunGroup.position.set(-0.5, 1.2, 0.4);
    robot.add(weldGunGroup);
    weldGunRef.current = weldGunGroup;

    const gunBodyGeo = new THREE.BoxGeometry(0.2, 0.35, 0.5);
    const gunBody = new THREE.Mesh(gunBodyGeo, metalMat.clone());
    weldGunGroup.add(gunBody);

    const tipGeo = new THREE.CylinderGeometry(0.035, 0.02, 0.25);
    tipGeo.rotateX(Math.PI / 2);
    const tipMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, emissive: 0xff4400, emissiveIntensity: 0, metalness: 0.9, roughness: 0.1 });
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.z = 0.4;
    weldGunGroup.add(tip);
    tipRef.current = tip;

    // Weld Spatter Particle System
    const spatterGeo = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(new Float32Array(MAX_SPARKS * 3), 3);
    const lifeAttr = new THREE.BufferAttribute(new Float32Array(MAX_SPARKS), 1);
    const velAttr = new THREE.BufferAttribute(new Float32Array(MAX_SPARKS * 3), 3);
    spatterGeo.setAttribute('position', posAttr);
    spatterGeo.setAttribute('aLife', lifeAttr);
    spatterGeo.setAttribute('aVelocity', velAttr);
    
    const spatterShaderMat = new THREE.ShaderMaterial({
      uniforms: {
        uSize: { value: spatterSizeRef.current * 20.0 },
        uTime: { value: 0 },
        uBaseColor: { value: new THREE.Color(spatterColorRef.current) }
      },
      vertexShader: `
        attribute float aLife;
        attribute vec3 aVelocity;
        varying float vLife;
        uniform float uSize;
        void main() {
          vLife = aLife;
          // Calculate streak elongation based on velocity
          vec3 streakPos = position + (aVelocity * 0.15 * (1.0 - aLife));
          vec4 mvPosition = modelViewMatrix * vec4(streakPos, 1.0);
          gl_PointSize = uSize * (vLife * (1.2 - vLife * 0.5)) * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vLife;
        uniform vec3 uBaseColor;
        void main() {
          float d = distance(gl_PointCoord, vec2(0.5));
          if (d > 0.5) discard;
          
          vec3 white = vec3(1.0, 1.0, 1.0);
          vec3 orange = uBaseColor;
          vec3 red = uBaseColor * 0.5;
          
          vec3 color = mix(red, orange, smoothstep(0.0, 0.5, vLife));
          color = mix(color, white, smoothstep(0.5, 1.0, vLife));
          
          gl_FragColor = vec4(color, vLife * 1.0);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    const spatter = new THREE.Points(spatterGeo, spatterShaderMat);
    weldGunGroup.add(spatter);
    spatterRef.current = spatter;

    // Leg setup
    const thighGeo = new THREE.CylinderGeometry(0.09, 0.07, 0.9);
    thighGeo.translate(0, -0.45, 0); 
    const thigh = new THREE.Mesh(thighGeo, bodyMat.clone());
    thigh.position.set(0.35, 1.45, 0);
    robot.add(thigh);
    createLED(thigh, new THREE.Vector3(0, -0.45, 0.09), 'Leg_L');
    const calfGeo = new THREE.CylinderGeometry(0.07, 0.04, 0.85);
    calfGeo.translate(0, -0.4, 0); 
    const calf = new THREE.Mesh(calfGeo, bodyMat.clone());
    thigh.add(calf);
    calf.position.set(0, -0.9, 0);
    limbsRef.current = { thigh, calf };

    // --- Animation ---
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      const time = Date.now();
      const pulse = Math.sin(time * 0.005);
      const emergencyPulse = Math.sin(time * 0.04); // Higher frequency pulse for E-stop
      const isRunningNow = isRunningRef.current;
      const isEStoppedNow = isEmergencyStoppedRef.current;
      const healthMap = healthRef.current;

      // LED Updates
      statusLedsRef.current.forEach((led, subsystem) => {
        const mat = led.material as THREE.MeshStandardMaterial;
        let color = 0x00ff00;
        let intensity = 1.0;
        let compType = subsystem === 'Head' ? 'Compute' : subsystem === 'Torso' ? 'Chassis' : subsystem === 'Arm_R' ? 'Tool' : subsystem === 'Leg_L' ? 'Actuator' : '';
        const h = healthMap[compType];

        if (isEStoppedNow) { color = 0xff0000; intensity = 3.0 + Math.sin(time * 0.02) * 2.0; }
        else if (h) {
          if (h.state === 'Failed' || h.healthScore < 40) { color = 0xff0000; intensity = 2.0 + Math.random() * 2.0; }
          else if (h.state === 'Throttling' || h.healthScore < 70) { color = 0xfacc15; intensity = 1.5 + pulse; }
        }
        mat.color.setHex(color);
        mat.emissive.setHex(color);
        mat.emissiveIntensity = intensity;
      });

      // Weld Gun Tip Glow Logic
      if (tipRef.current && hasToolRef.current) {
        const mat = tipRef.current.material as THREE.MeshStandardMaterial;
        if (isEStoppedNow) {
          // Glow red and pulse faster when in emergency stop
          mat.emissive.setHex(0xff0000);
          mat.emissiveIntensity = 2.0 + emergencyPulse * 1.5;
        } else if (isRunningNow) {
          // Standard orange operating glow
          mat.emissive.setHex(0xff4400);
          mat.emissiveIntensity = 1.2 + pulse * 0.8;
        } else {
          mat.emissiveIntensity = 0;
        }
      }

      // Spatter Update
      if (isRunningNow && !isEStoppedNow && hasToolRef.current && spatterRef.current) {
        const spatter = spatterRef.current;
        const positions = spatter.geometry.attributes.position.array as Float32Array;
        const lifes = spatter.geometry.attributes.aLife.array as Float32Array;
        const vels = spatter.geometry.attributes.aVelocity.array as Float32Array;
        const density = spatterDensityRef.current;
        const lifeMult = spatterLifeRef.current;
        (spatter.material as THREE.ShaderMaterial).uniforms.uSize.value = spatterSizeRef.current * 20.0;
        (spatter.material as THREE.ShaderMaterial).uniforms.uBaseColor.value.set(spatterColorRef.current);
        (spatter.material as THREE.ShaderMaterial).uniforms.uTime.value = time * 0.001;

        const spawnRate = Math.floor(density * 20);
        let spawned = 0;
        
        for (let i = 0; i < MAX_SPARKS; i++) {
          if (lifes[i] <= 0) {
            if (spawned < spawnRate && Math.random() < 0.3) {
              lifes[i] = 1.0;
              positions[i * 3] = 0; positions[i * 3 + 1] = 0; positions[i * 3 + 2] = 0.5;
              const angle = Math.random() * Math.PI * 2;
              const spread = 0.05 + Math.random() * 0.2;
              vels[i * 3] = Math.cos(angle) * spread;
              vels[i * 3 + 1] = Math.sin(angle) * spread;
              vels[i * 3 + 2] = 0.1 + Math.random() * 0.3;
              spawned++;
            }
          } else {
            positions[i * 3] += vels[i * 3];
            positions[i * 3 + 1] += vels[i * 3 + 1];
            positions[i * 3 + 2] += vels[i * 3 + 2];
            vels[i * 3 + 1] -= 0.01; // Gravity
            // Adjust life decay based on spatterLife multiplier
            lifes[i] -= (0.015 + Math.random() * 0.01) / Math.max(0.1, lifeMult);
            if (positions[i * 3 + 1] < -1.5) lifes[i] = 0;
          }
        }
        spatter.geometry.attributes.position.needsUpdate = true;
        spatter.geometry.attributes.aLife.needsUpdate = true;
        spatter.geometry.attributes.aVelocity.needsUpdate = true;
      } else if (spatterRef.current) {
        const lifes = spatterRef.current.geometry.attributes.aLife.array as Float32Array;
        for (let i = 0; i < MAX_SPARKS; i++) lifes[i] = 0;
        spatterRef.current.geometry.attributes.aLife.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); renderer.dispose(); };
  }, []);

  useEffect(() => {
    if (!limbsRef.current || !brainRef.current || !weldGunRef.current || !tipRef.current || !chassisRef.current) return;
    limbsRef.current.thigh.rotation.x = jointAngles.theta1;
    limbsRef.current.calf.rotation.x = jointAngles.theta2;
    const hasTool = !!installedComponents['Tool'];
    hasToolRef.current = hasTool;
    isRunningRef.current = isRunning;
    isEmergencyStoppedRef.current = isEmergencyStopped;
    spatterDensityRef.current = spatterDensity;
    spatterSizeRef.current = spatterSize;
    spatterColorRef.current = spatterColor;
    spatterLifeRef.current = spatterLife;
    weldGunRef.current.visible = hasTool;
  }, [installedComponents, jointAngles, isRunning, highlightedSubsystem, isEmergencyStopped, spatterDensity, spatterSize, spatterColor, spatterLife]);

  useEffect(() => {
    const analyzeAll = async () => {
      const results: Record<string, ComponentHealth> = {};
      const types = Object.keys(installedComponents);
      for (const type of types) { results[type] = { healthScore: 100, state: 'Scanning', briefAnalysis: 'Acquiring...', nextCalibration: '--', isScanning: true }; }
      setHealthOverlay(results);
      healthRef.current = results;
      for (const type of types) {
        const comp = installedComponents[type];
        const analysis = await analyzeTelemetryHealth(`Component: ${comp.name}, System: ${type}`);
        const updated = { ...analysis, isScanning: false };
        setHealthOverlay(prev => { const newState = { ...prev, [type]: updated }; healthRef.current = newState; return newState; });
      }
    };
    if (isRunning) analyzeAll();
  }, [installedComponents, isRunning]);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden group">
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute top-0 right-0 p-6 flex flex-col gap-3 pointer-events-none w-full max-w-[280px]">
        <div className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-2 px-2 flex justify-between">
          <span>Subsystem Diagnostics</span>
          {isEmergencyStopped && <span className="text-red-500 animate-pulse">HALT</span>}
        </div>
        {(Object.entries(installedComponents) as [string, RoboticComponent][]).map(([type, comp]) => {
          const health = healthOverlay[type];
          if (!health) return null;
          const stateColor = health.state === 'Nominal' ? 'text-emerald-400' : health.state === 'Throttling' ? 'text-amber-400' : health.state === 'Failed' ? 'text-red-500' : 'text-cyan-400';
          const scoreColor = health.healthScore > 80 ? 'bg-emerald-500' : health.healthScore > 50 ? 'bg-amber-500' : 'bg-red-500';
          return (
            <div key={type} className="glass p-3 rounded-xl border-white/5 bg-slate-900/40 backdrop-blur-md transition-transform duration-500 animate-in slide-in-from-right-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{type}</div>
                  <div className="text-[11px] font-bold text-slate-200 truncate max-w-[140px]">{comp.name}</div>
                </div>
                <div className={`text-[10px] font-black px-1.5 py-0.5 rounded border border-current ${stateColor} opacity-80`}>
                  {health.isScanning ? 'SCAN' : health.state.toUpperCase()}
                </div>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-1000 ${scoreColor}`} style={{ width: `${health.healthScore}%` }} />
                </div>
                <span className="text-[10px] font-mono text-slate-400">{health.healthScore}%</span>
              </div>
              {!health.isScanning && (
                <div className="space-y-1">
                  <div className="text-[9px] text-slate-400 leading-tight italic line-clamp-2">"{health.briefAnalysis}"</div>
                  <div className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">Next Cal: {health.nextCalibration}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Robot3DViewer;
