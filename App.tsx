
import React, { useState, useEffect, useRef } from 'react';
import { Page, RoboticComponent, Subsystem, TelemetryData } from './types';
import Navbar from './components/Navbar';
import AITutor from './components/AITutor';
import Robot3DViewer from './components/Robot3DViewer';
import { CHAPTERS, GROWTH_STATS, COMPONENTS, ERROR_PROFILES, ERROR_CATEGORIES, PRODUCTION_PRESETS } from './constants';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area, ScatterChart, Scatter, ZAxis } from 'recharts';
import { searchRobonexusContent, resolveRoboticsError, optimizeEnergy, analyzeRoboticCommand, analyzeTelemetryHealth } from './services/geminiService';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.Home);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Textbook Search State
  const [textbookSearch, setTextbookSearch] = useState('');

  // Simulation State
  const [gravity, setGravity] = useState(9.8);
  const [friction, setFriction] = useState(0.1);
  const [torque, setTorque] = useState(50);
  const [simRunning, setSimRunning] = useState(true);
  const [jointState, setJointState] = useState({ theta1: Math.PI / 4, theta2: Math.PI / 6 });
  const [isEmergencyStopped, setIsEmergencyStopped] = useState(false);
  
  // Tool Config State
  const [spatterDensity, setSpatterDensity] = useState(0.5);
  const [spatterSize, setSpatterSize] = useState(0.04);
  const [spatterColor, setSpatterColor] = useState('#ffaa00');
  const [spatterLife, setSpatterLife] = useState(1.0);
  
  // Build State: Drag and Drop
  const [installedComponents, setInstalledComponents] = useState<Record<string, RoboticComponent>>({
    'Actuator': COMPONENTS[1], // Default: Unitree H1 Torque Motor
    'Tool': COMPONENTS[3] // Default: Industrial Weld Gun
  });
  const [draggedItem, setDraggedItem] = useState<RoboticComponent | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const simRef = useRef({ theta1: Math.PI / 4, omega1: 0, theta2: Math.PI / 6, omega2: 0 });

  // Diagnostics State
  const [errorLog, setErrorLog] = useState('');
  const [diagResult, setDiagResult] = useState<any>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagMode, setDiagMode] = useState<'Telemetry' | 'Command' | 'LiveFeed'>('Telemetry');
  const [highlightedSubsystem, setHighlightedSubsystem] = useState<Subsystem>('General');
  const [showMaintenanceAlert, setShowMaintenanceAlert] = useState(true);

  // Live Component Registry State
  const [selectedCompTelemetry, setSelectedCompTelemetry] = useState<TelemetryData | null>(null);
  const [compAnalysis, setCompAnalysis] = useState<any>(null);
  const [isAnalyzingComp, setIsAnalyzingComp] = useState(false);

  // Command Specific State
  const [roboticCommand, setRoboticCommand] = useState('set_joint_torque("hip_left", 450, mode="FORCE_IMPEDANCE")');
  const [commandAnalysis, setCommandAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Energy State
  const [energyData, setEnergyData] = useState<{time: string, power: number}[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [energyAdvice, setEnergyAdvice] = useState('');
  const [batteryLevel, setBatteryLevel] = useState(84);

  // Connectivity State
  const [networkData, setNetworkData] = useState<{time: string, latency: number, errors: number}[]>([]);
  const [isDebugging, setIsDebugging] = useState(false);
  const [debugLog, setDebugLog] = useState('');

  // Simulation Physics Loop
  useEffect(() => {
    if (currentPage !== Page.Simulation || !simRunning || isEmergencyStopped) return;
    let animationFrameId: number;

    const render = () => {
      const dt = 0.016; 
      const g = gravity;
      
      const chassisEffect = installedComponents['Chassis'] ? 0.8 : 1.0;
      const damping = friction * 5 * chassisEffect;
      
      const actuator = installedComponents['Actuator'];
      let maxTorqueCapacity = 100;
      if (actuator && actuator.spec.includes('Nm')) {
        const parsed = parseInt(actuator.spec);
        if (!isNaN(parsed)) maxTorqueCapacity = parsed;
      }
      
      const appliedTorque = (torque / 100) * maxTorqueCapacity * 0.5;

      simRef.current.omega1 += (appliedTorque - g * Math.sin(simRef.current.theta1) - simRef.current.omega1 * damping) * dt;
      simRef.current.theta1 += simRef.current.omega1 * dt;
      simRef.current.omega2 += (-g * Math.sin(simRef.current.theta2) - simRef.current.omega2 * damping) * dt;
      simRef.current.theta2 += simRef.current.omega2 * dt;

      setJointState({ theta1: simRef.current.theta1, theta2: simRef.current.theta2 });
      animationFrameId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [currentPage, simRunning, gravity, friction, torque, installedComponents, isEmergencyStopped]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isEmergencyStopped) return;
      setEnergyData(prev => [...prev, { time: new Date().toLocaleTimeString().split(' ')[0], power: 200 + Math.random() * 150 + (currentPage === Page.Simulation ? Math.abs(torque) : 0) }].slice(-20));
      setNetworkData(prev => {
        const spike = Math.random() > 0.85 ? Math.floor(Math.random() * 15) : 0;
        return [...prev, { time: new Date().toLocaleTimeString().split(' ')[0], latency: 20 + Math.random() * 30 + (spike > 0 ? 150 : 0), errors: spike }].slice(-20);
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [currentPage, torque, isEmergencyStopped]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setCurrentPage(Page.Search);
    setIsSearching(true);
    const result = await searchRobonexusContent(query);
    setSearchResult(result);
    setIsSearching(false);
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return <>{parts.map((part, i) => part.toLowerCase() === query.toLowerCase() ? <mark key={i} className="bg-cyan-500/30 text-cyan-200 rounded-sm px-0.5">{part}</mark> : part)}</>;
  };

  const handleRunDiagnostics = async (log?: string) => {
    const input = log || errorLog;
    if (!input.trim()) return;
    
    // Safety auto-halt
    if (input.includes('Human profile identified') || input.includes('CRITICAL_SAFETY_ALARM')) {
      setIsEmergencyStopped(true);
      setSimRunning(false);
    }

    setIsDiagnosing(true);
    setHighlightedSubsystem('General');
    const result = await resolveRoboticsError(input);
    setDiagResult(result);
    setHighlightedSubsystem(result.subsystem as Subsystem);
    setIsDiagnosing(false);
  };

  const handleInspectComponent = async (comp: TelemetryData) => {
    setSelectedCompTelemetry(comp);
    setIsAnalyzingComp(true);
    const telemetryStr = comp.readings.map(r => `${r.label}: ${r.value}${r.unit}`).join(', ');
    const analysis = await analyzeTelemetryHealth(telemetryStr);
    setCompAnalysis(analysis);
    setIsAnalyzingComp(false);
    
    if (comp.name.includes('Limb') || comp.name.includes('Hip')) setHighlightedSubsystem('Leg_L');
    else if (comp.name.includes('Orin')) setHighlightedSubsystem('Head');
    else if (comp.name.includes('Ouster')) setHighlightedSubsystem('Head');
    else if (comp.name.includes('Power')) setHighlightedSubsystem('Torso');
    else if (comp.name.includes('Weld')) setHighlightedSubsystem('Arm_R');
  };

  const handleCommandAnalysis = async () => {
    if (!roboticCommand.trim()) return;
    setIsAnalyzing(true);
    const result = await analyzeRoboticCommand(roboticCommand);
    setCommandAnalysis(result);
    setIsAnalyzing(false);
  };

  const handleEnergyOptimize = async () => {
    setIsOptimizing(true);
    const result = await optimizeEnergy(`Battery: ${batteryLevel}%, Consumption: ${energyData[energyData.length-1]?.power.toFixed(0)}W`);
    setEnergyAdvice(result);
    setIsOptimizing(false);
  };

  const handleRunNetworkDebug = async () => {
    setIsDebugging(true);
    const result = await resolveRoboticsError(`Latency spikes detected in communication bus.`);
    setDebugLog(result.analysis || "Analysis failed.");
    setIsDebugging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedItem) { setInstalledComponents(prev => ({ ...prev, [draggedItem.type]: draggedItem })); }
    setDraggedItem(null);
    setIsDraggingOver(false);
  };

  const RobotTopologyMap = ({ activeSubsystem }: { activeSubsystem: Subsystem }) => (
    <div className="relative w-full h-[400px] flex items-center justify-center pointer-events-none">
      <svg viewBox="0 0 200 400" className="h-full opacity-60">
        <circle cx="100" cy="50" r="30" className={`transition-all duration-500 fill-slate-800 stroke-2 ${activeSubsystem === 'Head' ? 'fill-red-500/40 stroke-red-500' : 'stroke-slate-700'}`} />
        <rect x="70" y="90" width="60" height="120" rx="10" className={`transition-all duration-500 fill-slate-800 stroke-2 ${activeSubsystem === 'Torso' ? 'fill-red-500/40 stroke-red-500' : 'stroke-slate-700'}`} />
        <line x1="70" y1="110" x2="30" y2="200" className={`transition-all duration-500 stroke-slate-700 stroke-[12] ${activeSubsystem === 'Arm_L' ? 'stroke-red-500' : ''}`} />
        <line x1="130" y1="110" x2="170" y2="200" className={`transition-all duration-500 stroke-slate-700 stroke-[12] ${activeSubsystem === 'Arm_R' ? 'stroke-red-500' : ''}`} />
        <line x1="85" y1="210" x2="60" y2="350" className={`transition-all duration-500 stroke-slate-700 stroke-[12] ${activeSubsystem === 'Leg_L' ? 'stroke-red-500' : ''}`} />
        <line x1="115" y1="210" x2="140" y2="350" className={`transition-all duration-500 stroke-slate-700 stroke-[12] ${activeSubsystem === 'Leg_R' ? 'stroke-red-500' : ''}`} />
      </svg>
      {activeSubsystem !== 'General' && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"><div className="w-24 h-24 rounded-full border-2 border-red-500 animate-ping opacity-20" /></div>}
    </div>
  );

  const renderHome = () => (
    <div className="space-y-24 pb-20">
      <section className="relative h-[80vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full -z-10 opacity-20 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/30 blur-[100px] rounded-full animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-500/30 blur-[100px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        <h1 className="text-6xl md:text-8xl font-black mb-6 tracking-tighter uppercase">AutoIntel <br /><span className="gradient-text">Robotics</span></h1>
        <p className="max-w-2xl text-xl font-medium text-slate-300 mb-2">Where Machines Learn</p>
        <p className="max-w-2xl text-sm text-slate-400 mb-10">Professional AI-native diagnostics and technical textbook platform for the industrial humanoid age.</p>
        <div className="flex flex-wrap justify-center gap-4">
          <button onClick={() => setCurrentPage(Page.Diagnostics)} className="px-8 py-3 bg-cyan-600 text-slate-900 font-bold rounded-full hover:bg-cyan-500 transition-all shadow-lg shadow-cyan-600/20">System Diagnostics</button>
          <button onClick={() => setCurrentPage(Page.Textbook)} className="px-8 py-3 glass text-white font-bold rounded-full hover:bg-white/10 transition-all">Open AI Textbook</button>
        </div>
      </section>
      <section className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {ERROR_CATEGORIES.map((cat, i) => (
            <div key={i} onClick={() => setCurrentPage(Page.Diagnostics)} className="glass p-8 rounded-3xl border border-white/5 hover:border-cyan-500/50 transition-all cursor-pointer group">
              <div className="text-4xl mb-6 grayscale group-hover:grayscale-0 transition-all">{cat.icon}</div>
              <h3 className="text-xl font-bold mb-3">{cat.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{cat.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  const renderInsights = () => (
    <div className="container mx-auto px-6 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-black mb-2 uppercase tracking-tighter text-amber-500">Industrial Production Intelligence</h1>
        <p className="text-slate-400">Deep analysis of production line defects: Spot miss, Burr, Spatter, and Maintenance Cycles.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {ERROR_PROFILES.map((profile, i) => (
          <div key={i} className="glass p-8 rounded-[2rem] border-white/10 flex flex-col h-full group" style={{ borderColor: `${profile.color}20` }}>
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-black uppercase tracking-tight" style={{ color: profile.color }}>{profile.environment}</h2>
              <span className="text-[10px] font-black text-slate-500 bg-white/5 px-3 py-1 rounded-full uppercase tracking-widest">{profile.type}</span>
            </div>
            <p className="text-slate-400 text-sm mb-8">{profile.description}</p>
            <div className="space-y-4 flex-1">
              {profile.errors.map((err, j) => (
                <div key={j} className="bg-slate-900/50 border border-white/5 p-4 rounded-xl hover:bg-white/5 transition-all">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="font-bold text-slate-200 text-sm">{err.name}</h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${err.frequency === 'High' ? 'bg-red-500/20 text-red-400' : 'bg-cyan-500/20 text-cyan-400'}`}>{err.frequency} FREQ</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-3">{err.impact}</p>
                  <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M5 13l4 4L19 7"/></svg>
                    REMEDY: {err.solution}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSimulation = () => {
    const actuator = installedComponents['Actuator'];
    let torqueLabel = "Motor Bias";
    let maxVal = 100;
    if (actuator && actuator.spec.includes('Nm')) {
      maxVal = parseInt(actuator.spec) || 100;
      torqueLabel = `Motor Force (Nm)`;
    }

    return (
      <div className="container mx-auto px-6 py-12">
          {isEmergencyStopped && (
            <div className="mb-12 glass p-8 border-red-500 bg-red-500/10 rounded-3xl animate-pulse">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center font-black text-xl">STOP</div>
                  <div>
                    <h2 className="text-2xl font-black text-red-500 uppercase">Kinetic Lock: Human In Zone</h2>
                    <p className="text-red-300 text-sm">Light curtain breach detected at Production Jig. Robot motion suspended indefinitely.</p>
                  </div>
                  <button onClick={() => setIsEmergencyStopped(false)} className="ml-auto px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-500">Reset E-Stop</button>
               </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
              <div><h1 className="text-4xl font-bold mb-2 tracking-tight uppercase">Simulation Lab</h1><p className="text-slate-400">Interactive 3D environment. Now featuring weld gun maintenance and safety monitors.</p></div>
              <div className="flex items-center gap-4">
                  <button onClick={() => setSimRunning(!simRunning)} className={`px-6 py-2 rounded-full font-bold text-xs uppercase tracking-widest transition-all ${simRunning ? 'bg-red-500/10 text-red-500 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>{simRunning ? 'Stop Sim' : 'Start Sim'}</button>
                  <button onClick={() => { simRef.current = { theta1: Math.PI / 4, omega1: 0, theta2: Math.PI / 6, omega2: 0 }; }} className="px-6 py-2 glass rounded-full font-bold text-xs uppercase tracking-widest hover:bg-white/5 transition-all">Reset Vectors</button>
              </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 flex flex-col gap-6">
                  <div onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }} onDragLeave={() => setIsDraggingOver(false)} onDrop={handleDrop} className={`glass rounded-[2rem] overflow-hidden bg-slate-950 flex flex-col border-2 transition-all shadow-2xl relative min-h-[500px] ${isDraggingOver ? 'border-cyan-500 bg-cyan-500/5' : 'border-white/10'}`}>
                      <div className="absolute top-6 left-6 flex flex-col gap-2 z-10 pointer-events-none">
                          <div className="glass px-4 py-2 rounded-xl text-[10px] font-black text-cyan-400 border-white/5 uppercase tracking-[0.2em]">{isDraggingOver ? 'Drop to Install Component' : 'High-Fidelity 3D Feed'}</div>
                          {isEmergencyStopped && <div className="px-4 py-2 bg-red-600/20 text-red-500 text-[10px] font-black rounded-xl uppercase tracking-widest border border-red-500/30">LOCKED: Safety Breach</div>}
                      </div>
                      <div className="flex-1 w-full min-h-[500px]">
                          <Robot3DViewer 
                            installedComponents={installedComponents} 
                            jointAngles={jointState} 
                            isRunning={simRunning && !isEmergencyStopped} 
                            highlightedSubsystem={highlightedSubsystem}
                            isEmergencyStopped={isEmergencyStopped}
                            spatterDensity={spatterDensity}
                            spatterSize={spatterSize}
                            spatterColor={spatterColor}
                            spatterLife={spatterLife}
                          />
                      </div>
                      <div className="p-6 bg-slate-900/50 border-t border-white/5 grid grid-cols-2 md:grid-cols-5 gap-4">
                          {['Compute', 'Actuator', 'Sensor', 'Tool', 'Chassis'].map(type => { 
                              const comp = installedComponents[type]; 
                              return (
                                  <div key={type} className={`p-4 rounded-2xl border transition-all flex flex-col gap-1 ${comp ? 'bg-cyan-500/5 border-cyan-500/20' : 'bg-slate-950/50 border-white/5 opacity-40'}`}>
                                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{type}</span>
                                      <span className="text-xs font-bold text-slate-200 truncate">{comp ? comp.name : 'Not Installed'}</span>
                                      {comp && <span className="text-[9px] text-cyan-500 font-mono">{comp.spec}</span>}
                                  </div>
                              );
                          })}
                      </div>
                  </div>
                  <div className="glass p-8 rounded-[2rem] border-white/5"><h3 className="text-xl font-black uppercase tracking-tight mb-6 text-cyan-400">Inventory</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{COMPONENTS.map((comp, i) => (<div key={i} draggable onDragStart={() => setDraggedItem(comp)} className="p-4 rounded-2xl bg-slate-900/50 border border-white/5 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all cursor-grab active:cursor-grabbing group flex items-center gap-4"><div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform"><span className="text-xs font-black uppercase tracking-widest">{comp.type.slice(0,3)}</span></div><div className="flex-1"><p className="text-xs font-bold text-slate-200">{comp.name}</p><p className="text-[10px] text-slate-500 uppercase tracking-tight">{comp.spec}</p></div></div>))}</div></div>
              </div>
              <div className="lg:col-span-4 space-y-6">
                <div className="glass p-8 rounded-[2rem] border-white/5 space-y-8">
                  <h3 className="text-lg font-black uppercase tracking-tight mb-2 text-slate-200">Global Parameters</h3>
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-500"><span>Gravity</span><span className="text-cyan-400">{gravity.toFixed(1)} m/s²</span></div>
                      <input type="range" min="0" max="20" step="0.1" value={gravity} onChange={(e) => setGravity(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-500"><span>Friction</span><span className="text-cyan-400">{(friction * 100).toFixed(0)}%</span></div>
                      <input type="range" min="0" max="1" step="0.01" value={friction} onChange={(e) => setFriction(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-500"><span>{torqueLabel}</span><span className="text-cyan-400">{(torque / 100 * maxVal * 0.5).toFixed(0)} Nm</span></div>
                      <input type="range" min="-200" max="200" step="1" value={torque} onChange={(e) => setTorque(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                    </div>
                  </div>

                  <div className="h-px bg-white/5 my-4" />

                  <h3 className="text-lg font-black uppercase tracking-tight mb-2 text-amber-500">Tool Configuration</h3>
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-500"><span>Weld Spatter Density</span><span className="text-amber-400">{(spatterDensity * 100).toFixed(0)}%</span></div>
                      <input type="range" min="0" max="1" step="0.05" value={spatterDensity} onChange={(e) => setSpatterDensity(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500" />
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-500"><span>Particle Size</span><span className="text-amber-400">{(spatterSize * 100).toFixed(1)}px</span></div>
                      <input type="range" min="0.01" max="0.15" step="0.01" value={spatterSize} onChange={(e) => setSpatterSize(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500" />
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-500"><span>Lifespan Multiplier</span><span className="text-amber-400">{spatterLife.toFixed(1)}x</span></div>
                      <input type="range" min="0.1" max="5.0" step="0.1" value={spatterLife} onChange={(e) => setSpatterLife(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500" />
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-500"><span>Weld Color</span></div>
                      <div className="flex items-center gap-4">
                        <input type="color" value={spatterColor} onChange={(e) => setSpatterColor(e.target.value)} className="w-12 h-12 bg-transparent border-none cursor-pointer rounded overflow-hidden" />
                        <span className="text-xs font-mono text-slate-400 uppercase">{spatterColor}</span>
                      </div>
                    </div>
                    <button onClick={() => { setIsEmergencyStopped(true); setSimRunning(false); handleRunDiagnostics(PRODUCTION_PRESETS[0].log); }} className="w-full py-4 bg-red-600/20 text-red-500 font-black uppercase text-xs tracking-widest rounded-xl border border-red-500/30 hover:bg-red-600 hover:text-white transition-all">Simulate Human Intrusion</button>
                  </div>
                </div>
              </div>
          </div>
      </div>
    );
  };

  const renderTextbook = () => {
    const filtered = CHAPTERS.filter(c => 
      c.title.toLowerCase().includes(textbookSearch.toLowerCase()) || 
      c.content.toLowerCase().includes(textbookSearch.toLowerCase())
    );

    return (
      <div className="container mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-bold mb-2 tracking-tight uppercase">AI Robotics Textbook</h1>
            <p className="text-slate-400">Master the core concepts of humanoid machine learning and hardware.</p>
          </div>
          <div className="relative w-full md:w-64">
            <input 
              type="text" 
              placeholder="Search chapters..." 
              value={textbookSearch}
              onChange={(e) => setTextbookSearch(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filtered.map(chapter => (
            <div key={chapter.id} className="glass p-8 rounded-[2rem] border-white/5 hover:border-cyan-500/30 transition-all group">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[10px] font-black bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded-full uppercase tracking-widest">{chapter.category}</span>
              </div>
              <h2 className="text-2xl font-black mb-4 group-hover:text-cyan-400 transition-colors">{chapter.title}</h2>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">{chapter.description}</p>
              <div className="p-6 bg-slate-900/50 rounded-2xl border border-white/5 text-slate-300 text-sm italic leading-relaxed">
                {chapter.content}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSearch = () => (
    <div className="container mx-auto px-6 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-black mb-2 uppercase tracking-tighter text-cyan-500">Search Results</h1>
        <p className="text-slate-400">Querying: <span className="text-cyan-400 font-mono">"{searchQuery}"</span></p>
      </div>
      {isSearching ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
          <p className="text-cyan-500 font-black uppercase tracking-widest text-xs">Querying Knowledge Base...</p>
        </div>
      ) : searchResult ? (
        <div className="space-y-8">
          <div className="glass p-8 rounded-[2rem] border-white/5 bg-cyan-500/5">
            <div className="prose prose-invert max-w-none text-slate-300 text-lg leading-relaxed whitespace-pre-wrap">
              {searchResult.text}
            </div>
          </div>
          {searchResult.groundingChunks && searchResult.groundingChunks.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Sources & References</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResult.groundingChunks.map((chunk: any, i: number) => (
                  chunk.web && (
                    <a 
                      key={i} 
                      href={chunk.web.uri} 
                      target="_blank" 
                      rel="noreferrer"
                      className="p-4 bg-slate-900 border border-white/5 rounded-xl hover:border-cyan-500/50 transition-all flex flex-col gap-2"
                    >
                      <span className="text-[10px] font-black text-cyan-500 uppercase">External Source</span>
                      <span className="text-sm font-bold text-slate-200 line-clamp-1">{chunk.web.title || chunk.web.uri}</span>
                      <span className="text-[10px] text-slate-500 truncate">{chunk.web.uri}</span>
                    </a>
                  )
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-20 text-slate-500">No results found.</div>
      )}
    </div>
  );

  const renderDiagnostics = () => (
    <div className="container mx-auto px-6 py-12">
      <div className="mb-12"><h1 className="text-4xl font-bold mb-2 tracking-tight uppercase">System Diagnostics</h1><p className="text-slate-400">Analyze telemetry, robotic commands, and live system health.</p></div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="glass p-8 rounded-[2rem] border-white/5">
            <h3 className="text-xl font-black uppercase mb-6">Diagnostic Mode</h3>
            <div className="flex flex-col gap-2">
              {(['Telemetry', 'Command', 'LiveFeed'] as const).map(mode => (
                <button key={mode} onClick={() => setDiagMode(mode)} className={`w-full py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest border transition-all text-left ${diagMode === mode ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : 'bg-slate-900/50 border-white/5 text-slate-500 hover:bg-white/5'}`}>{mode}</button>
              ))}
            </div>
          </div>
          <RobotTopologyMap activeSubsystem={highlightedSubsystem} />
        </div>
        <div className="lg:col-span-8 space-y-8">
          {diagMode === 'Telemetry' && (
            <div className="glass p-8 rounded-[2rem] border-white/5 space-y-6">
              <h3 className="text-xl font-black uppercase">Log Analysis</h3>
              <textarea value={errorLog} onChange={(e) => setErrorLog(e.target.value)} placeholder="Paste error log or select a preset..." className="w-full h-40 bg-slate-950 border border-white/10 rounded-2xl p-4 text-sm font-mono focus:outline-none focus:border-cyan-500" />
              <div className="flex flex-wrap gap-2">
                {PRODUCTION_PRESETS.map((preset, i) => (<button key={i} onClick={() => setErrorLog(preset.log)} className="px-4 py-2 bg-slate-900 border border-white/5 rounded-full text-[10px] font-bold text-slate-400 hover:text-white transition-colors">{preset.name}</button>))}
              </div>
              <button onClick={() => handleRunDiagnostics()} disabled={isDiagnosing} className="w-full py-4 bg-cyan-600 text-slate-900 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-cyan-500 transition-all disabled:opacity-50">{isDiagnosing ? 'Analyzing...' : 'Execute Analysis'}</button>
              {diagResult && (
                <div className="p-6 bg-slate-900/80 border border-cyan-500/30 rounded-2xl space-y-4 animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex justify-between items-center"><span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em]">Analysis Result</span><span className="px-3 py-1 bg-red-500/10 text-red-500 text-[10px] font-black rounded-full border border-red-500/20">{diagResult.subsystem}</span></div>
                  <p className="text-sm text-slate-300 leading-relaxed"><span className="text-white font-bold">Analysis:</span> {diagResult.analysis}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl"><span className="text-[9px] font-black text-emerald-400 uppercase">Hotfix</span><p className="text-xs text-slate-300 mt-1">{diagResult.hotfix}</p></div>
                    <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-xl"><span className="text-[9px] font-black text-cyan-400 uppercase">Long-term Fix</span><p className="text-xs text-slate-300 mt-1">{diagResult.permanentFix}</p></div>
                  </div>
                </div>
              )}
            </div>
          )}
          {diagMode === 'Command' && (
             <div className="glass p-8 rounded-[2rem] border-white/5 space-y-6">
                <h3 className="text-xl font-black uppercase">Command Architect</h3>
                <textarea value={roboticCommand} onChange={(e) => setRoboticCommand(e.target.value)} className="w-full h-40 bg-slate-950 border border-white/10 rounded-2xl p-4 text-sm font-mono text-cyan-400 focus:outline-none focus:border-cyan-500" />
                <button onClick={handleCommandAnalysis} disabled={isAnalyzing} className="w-full py-4 bg-cyan-600 text-slate-900 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-cyan-500 transition-all">{isAnalyzing ? 'Decoding Logic...' : 'Analyze Command'}</button>
                {commandAnalysis && (<div className="p-6 bg-slate-900/80 border border-white/5 rounded-2xl text-slate-300 text-sm whitespace-pre-wrap font-mono">{commandAnalysis}</div>)}
             </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderEnergy = () => (
    <div className="container mx-auto px-6 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start mb-12 gap-6">
        <div><h1 className="text-4xl font-bold mb-2 uppercase tracking-tighter">Metabolic Hub</h1><p className="text-slate-400">Energy consumption and duty-cycle optimization.</p></div>
        <div className="glass px-8 py-4 rounded-3xl border-white/5 flex items-center gap-6">
          <div className="text-center">
            <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">State of Charge</span>
            <span className={`text-3xl font-black ${batteryLevel < 20 ? 'text-red-500' : 'text-emerald-400'}`}>{batteryLevel}%</span>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div className="text-center">
            <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Estimated Uptime</span>
            <span className="text-3xl font-black text-slate-200">4.2h</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass p-8 rounded-[2rem] border-white/5 h-[400px]">
          <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] mb-8">Real-time Power Draw (Watts)</h3>
          <ResponsiveContainer width="100%" height="85%">
            <AreaChart data={energyData}>
              <defs><linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/><stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis stroke="#ffffff20" fontSize={10} tickFormatter={(v) => `${v}W`} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px' }} />
              <Area type="monotone" dataKey="power" stroke="#06b6d4" fillOpacity={1} fill="url(#colorPower)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="glass p-8 rounded-[2rem] border-white/5 flex flex-col gap-6">
          <h3 className="text-xl font-black uppercase">Optimization</h3>
          <p className="text-sm text-slate-400">Run AI-driven energy profiling to extend battery life in industrial environments.</p>
          <button onClick={handleEnergyOptimize} disabled={isOptimizing} className="w-full py-4 bg-cyan-600 text-slate-900 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-cyan-500 transition-all">{isOptimizing ? 'Profiling...' : 'Extend Uptime'}</button>
          {energyAdvice && (<div className="flex-1 p-6 bg-slate-900 border border-cyan-500/20 rounded-2xl text-xs text-slate-300 leading-relaxed italic whitespace-pre-wrap">{energyAdvice}</div>)}
        </div>
      </div>
    </div>
  );

  const renderConnectivity = () => (
    <div className="container mx-auto px-6 py-12">
      <div className="mb-12"><h1 className="text-4xl font-bold mb-2 uppercase tracking-tighter">Connectivity & Bus</h1><p className="text-slate-400">Communication latency and error rates on the ROS2 internal bus.</p></div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 glass p-8 rounded-[2rem] border-white/5 h-[400px]">
          <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] mb-8">Bus Latency (ms)</h3>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={networkData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis stroke="#ffffff20" fontSize={10} tickFormatter={(v) => `${v}ms`} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px' }} />
              <Line type="stepAfter" dataKey="latency" stroke="#22d3ee" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="errors" stroke="#ef4444" strokeWidth={1} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="lg:col-span-4 glass p-8 rounded-[2rem] border-white/5 flex flex-col gap-6">
          <h3 className="text-xl font-black uppercase">Bus Debugger</h3>
          <button onClick={handleRunNetworkDebug} disabled={isDebugging} className="w-full py-4 bg-slate-800 text-white font-black uppercase text-xs tracking-widest rounded-2xl border border-white/10 hover:bg-white/5 transition-all">{isDebugging ? 'Sniffing Packets...' : 'Trace Communication'}</button>
          {debugLog && (<div className="flex-1 p-6 bg-slate-900/80 border border-white/5 rounded-2xl text-xs font-mono text-cyan-400 leading-relaxed overflow-y-auto max-h-[200px]">{debugLog}</div>)}
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (currentPage) {
      case Page.Home: return renderHome();
      case Page.Textbook: return renderTextbook();
      case Page.Simulation: return renderSimulation();
      case Page.Insights: return renderInsights();
      case Page.Energy: return renderEnergy();
      case Page.Diagnostics: return renderDiagnostics();
      case Page.Connectivity: return renderConnectivity();
      case Page.Search: return renderSearch();
      default: return renderHome();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      <Navbar currentPage={currentPage} setPage={setCurrentPage} onSearch={handleSearch} />
      <main className="transition-all duration-500">
        {renderContent()}
      </main>
      <AITutor />
      <footer className="py-20 border-t border-white/5 flex flex-col items-center gap-6 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-slate-800 rounded flex items-center justify-center font-bold text-[10px]">AI</div>
          <span className="text-xs font-black uppercase tracking-widest">AutoIntel Robotics Corp</span>
        </div>
        <p className="text-[10px] font-medium text-slate-500">WHERE MACHINES LEARN • © 2024-2030</p>
      </footer>
    </div>
  );
};

export default App;
