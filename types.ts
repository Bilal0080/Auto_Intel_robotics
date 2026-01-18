
export interface Chapter {
  id: string;
  title: string;
  description: string;
  content: string;
  category: 'Hardware' | 'Software' | 'AI' | 'Ethics';
}

export interface GrowthData {
  year: number;
  marketSize: number;
  shipments: number;
}

export interface RoboticComponent {
  name: string;
  type: string;
  spec: string;
  icon: string;
}

export interface TelemetryData {
  id: string;
  name: string;
  category: 'Electrical' | 'Mechanical' | 'Compute' | 'Software';
  readings: { label: string; value: string | number; unit: string; status: 'nominal' | 'warning' | 'critical' }[];
  description: string;
}

export type Subsystem = 'Head' | 'Torso' | 'Arm_L' | 'Arm_R' | 'Leg_L' | 'Leg_R' | 'General';

export enum Page {
  Home = 'home',
  Textbook = 'textbook',
  Insights = 'insights',
  Lab = 'lab',
  Search = 'search',
  Simulation = 'simulation',
  Diagnostics = 'diagnostics',
  Energy = 'energy',
  Connectivity = 'connectivity'
}
