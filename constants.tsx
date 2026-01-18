
import React from 'react';
import { Chapter, GrowthData, RoboticComponent } from './types';

export const CHAPTERS: Chapter[] = [
  {
    id: '1',
    title: 'High-Torque Actuators',
    category: 'Hardware',
    description: 'The muscular system of humanoid robots, focusing on BLDC motors and harmonic drives.',
    content: 'Humanoid robotics requires a delicate balance of power density and precision. Modern actuators utilize high-efficiency Brushless DC (BLDC) motors paired with strain wave gearing (Harmonic Drives) to achieve the necessary torque for bipedal locomotion. Key metrics include Torque-to-Weight ratio and thermal management strategies in compact limb enclosures.'
  },
  {
    id: '2',
    title: 'Visual Transformers in Perception',
    category: 'AI',
    description: 'Applying Vision Transformers (ViT) for real-time spatial awareness and object manipulation.',
    content: 'Perception has moved beyond simple depth sensing. Leveraging end-to-end neural networks like Vision Transformers allows humanoids to understand complex spatial relationships. This chapter explores how temporal consistency and semantic segmentation enable a robot to navigate unstructured human environments safely.'
  },
  {
    id: '3',
    title: 'End-to-End Neural Control',
    category: 'Software',
    description: 'Bypassing classical inverse kinematics with Reinforcement Learning and Foundation Models.',
    content: 'While classical control provides stability, neural control offers adaptability. By training in simulation (Sim-to-Real), robots learn gait patterns and manipulation skills that are more robust than manually tuned PID loops. We discuss the transition from traditional Jacobian-based methods to direct policy inference.'
  },
  {
    id: '4',
    title: 'Industrial Humanoid Deployment',
    category: 'Ethics',
    description: 'The economic impact and safety protocols for humanoid-human collaborative workspaces.',
    content: 'As humanoid robots enter the workforce, the "Human-in-the-Loop" concept becomes vital. Safety standards (ISO/TS 15066) must evolve to address bipedal stability and power/force limiting. This section analyzes the ROI of humanoid deployment in logistics and high-mix manufacturing.'
  }
];

export const ERROR_CATEGORIES = [
  {
    title: 'Production Safety',
    description: 'Intrusion detection and emergency stop protocols.',
    icon: '🚨',
  },
  {
    title: 'Weld Integrity',
    description: 'Spot miss, spatter, and nugget quality analysis.',
    icon: '⚡',
  },
  {
    title: 'Tooling Maintenance',
    description: 'Electrode dressing and tip carbon cleanup cycles.',
    icon: '🛠️',
  },
  {
    title: 'Optical Drift',
    description: 'LiDAR and stereo vision calibration issues.',
    icon: '👁️',
  }
];

export const PRODUCTION_PRESETS = [
  {
    name: "Safety Breach: Human Intrusion",
    log: "CRITICAL_SAFETY_ALARM: Light curtain breach at Zone 4 (Production Jig). Proximity sensor detection: Human profile identified. IMU-STOP command broadcast. All kinetic movement halted. Robot state: LOCKED_EMERGENCY."
  },
  {
    name: "Spot Weld: Missing/Bad Finish",
    log: "WELD_QUALITY_FAIL: Spot miss detected at flange assembly P-24. High electrical resistance on shunt. Burr formation identified by profilometer. Weld nugget diameter < 4.5mm. Possible clamp misalignment or electrode wear."
  },
  {
    name: "Tip Dressing Required",
    log: "MAINTENANCE_REQUIRED: Electrode tip carbon buildup exceeded threshold (2000 cycles). Tip diameter flattened to 8mm. Spatter increase detected (+15%). Initiate dressing cycle on Station S-1."
  },
  {
    name: "CO2 Brazing Porosity",
    log: "FAULT_GAS_FLOW: CO2 Shielding pressure at 8.5L/min. Infrared sensor detects spatter increase. Arc stability index < 0.65. Check for nozzle blockage or gas line puncture."
  }
];

export const ERROR_PROFILES = [
  {
    environment: 'Domestic (Home)',
    type: 'Unstructured Failures',
    description: 'Errors stemming from unpredictable human environments.',
    errors: [
      { name: 'Semantic Misclassification', frequency: 'High', impact: 'Collision with pets/children', solution: 'Edge-AI Vision Transformers' },
      { name: 'HRI Timeout', frequency: 'Medium', impact: 'Social friction/user frustration', solution: 'LLM-based Intent Prediction' },
      { name: 'Navigation Deadlock', frequency: 'High', impact: 'Robot stuck on rugs/clutter', solution: 'Multi-modal SLAM fusion' }
    ],
    color: '#22d3ee'
  },
  {
    environment: 'Industrial (Production)',
    type: 'Root Cause Analytics',
    description: 'Specialized defects in high-precision welding and assembly lines.',
    errors: [
      { name: 'Spot Miss / Burr', frequency: 'Medium', impact: 'Structural weak points / Rejection', solution: 'Real-time resistance monitoring' },
      { name: 'Electrode Carbon Buildup', frequency: 'High', impact: 'Poor current flow / Spatter', solution: 'Automatic Tip Dressing Station' },
      { name: 'Safety Fence Breach', frequency: 'Low', impact: 'Physical injury / Total line stop', solution: 'Safety PLC & AI Vision Curtains' },
      { name: 'Jig Alignment Bias', frequency: 'Medium', impact: 'Geometric dimensioning fail', solution: 'Vision-based part-offset correction' }
    ],
    color: '#f59e0b'
  }
];

export const GROWTH_STATS: GrowthData[] = [
  { year: 2023, marketSize: 1.8, shipments: 5000 },
  { year: 2024, marketSize: 3.2, shipments: 12000 },
  { year: 2025, marketSize: 7.5, shipments: 45000 },
  { year: 2026, marketSize: 15.2, shipments: 120000 },
  { year: 2027, marketSize: 38.0, shipments: 350000 },
  { year: 2030, marketSize: 154.0, shipments: 1200000 },
];

export const COMPONENTS: RoboticComponent[] = [
  { name: 'NVIDIA Jetson AGX Orin', type: 'Compute', spec: '275 TOPS', icon: 'Cpu' },
  { name: 'Unitree H1 Torque Motor', type: 'Actuator', spec: '360 Nm Peak', icon: 'Zap' },
  { name: 'Ouster OS1 LiDAR', type: 'Sensor', spec: '128 Channels', icon: 'Eye' },
  { name: 'Industrial Weld Gun', type: 'Tool', spec: '10kA Resistance', icon: 'Hammer' },
  { name: 'Titanium Skeleton', type: 'Chassis', spec: '6061-T6 Grade', icon: 'Shield' },
];
