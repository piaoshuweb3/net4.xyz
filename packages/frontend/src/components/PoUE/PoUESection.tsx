'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Cpu, Zap, Activity, Server, TrendingUp, Shield } from 'lucide-react';

// 3D Node Map Component
function NodeMap3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });

    renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    // Create nodes
    const nodeGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const coreNodeMaterial = new THREE.MeshBasicMaterial({ color: 0xffd700 });
    const subNodeMaterial = new THREE.MeshBasicMaterial({ color: 0xfaad14 });
    const normalNodeMaterial = new THREE.MeshBasicMaterial({ color: 0x52c41a });

    const nodes: THREE.Mesh[] = [];
    
    // Core nodes (21)
    for (let i = 0; i < 21; i++) {
      const node = new THREE.Mesh(nodeGeometry, coreNodeMaterial);
      const angle = (i / 21) * Math.PI * 2;
      const radius = 3;
      node.position.set(
        Math.cos(angle) * radius,
        (Math.random() - 0.5) * 2,
        Math.sin(angle) * radius
      );
      scene.add(node);
      nodes.push(node);
    }

    // Sub nodes (128)
    for (let i = 0; i < 128; i++) {
      const node = new THREE.Mesh(nodeGeometry, subNodeMaterial);
      node.scale.setScalar(0.7);
      const angle = (i / 128) * Math.PI * 2;
      const radius = 5 + Math.random() * 2;
      node.position.set(
        Math.cos(angle) * radius,
        (Math.random() - 0.5) * 3,
        Math.sin(angle) * radius
      );
      scene.add(node);
      nodes.push(node);
    }

    // Normal nodes (1000)
    for (let i = 0; i < 1000; i++) {
      const node = new THREE.Mesh(nodeGeometry, normalNodeMaterial);
      node.scale.setScalar(0.3);
      const angle = Math.random() * Math.PI * 2;
      const radius = 7 + Math.random() * 5;
      node.position.set(
        Math.cos(angle) * radius,
        (Math.random() - 0.5) * 5,
        Math.sin(angle) * radius
      );
      scene.add(node);
      nodes.push(node);
    }

    camera.position.set(0, 5, 12);
    camera.lookAt(0, 0, 0);

    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      scene.rotation.y += 0.002;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-[300px] rounded-xl"
    />
  );
}

// Energy Flow Bar Component
function EnergyFlowBar() {
  const [energy, setEnergy] = useState(75);
  const [tasks, setTasks] = useState(1234);
  const [hashrate, setHashrate] = useState(8.5);

  useEffect(() => {
    const interval = setInterval(() => {
      setEnergy(prev => Math.min(100, Math.max(0, prev + (Math.random() - 0.5) * 10)));
      setTasks(prev => prev + Math.floor(Math.random() * 10));
      setHashrate(prev => prev + (Math.random() - 0.5) * 0.5);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">网络能量</span>
          <span className="text-purple-400">{energy.toFixed(1)}%</span>
        </div>
        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
            style={{ width: `${energy}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/5 rounded-lg p-4">
          <div className="text-2xl font-bold text-white">{tasks.toLocaleString()}</div>
          <div className="text-sm text-gray-400">今日任务数</div>
        </div>
        <div className="bg-white/5 rounded-lg p-4">
          <div className="text-2xl font-bold text-white">{hashrate.toFixed(1)} PH/s</div>
          <div className="text-sm text-gray-400">算力总量</div>
        </div>
      </div>
    </div>
  );
}

// Hardware Calculator Component
function HardwareCalculator() {
  const [gpu, setGpu] = useState('RTX 4090');
  const [count, setCount] = useState(1);
  const [electricity, setElectricity] = useState(0.45);
  const [earnings, setEarnings] = useState(0);

  const gpuOptions = [
    { name: 'RTX 4090', power: 450, earnings: 2.5 },
    { name: 'RTX 4080', power: 320, earnings: 1.8 },
    { name: 'A100', power: 400, earnings: 5.0 },
    { name: 'H100', power: 700, earnings: 8.0 },
  ];

  useEffect(() => {
    const selectedGpu = gpuOptions.find(g => g.name === gpu);
    if (selectedGpu) {
      setEarnings(selectedGpu.earnings * count);
      setElectricity((selectedGpu.power * count) / 1000);
    }
  }, [gpu, count]);

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm text-gray-400 block mb-2">GPU 型号</label>
        <select
          value={gpu}
          onChange={(e) => setGpu(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white"
        >
          {gpuOptions.map(opt => (
            <option key={opt.name} value={opt.name} className="bg-gray-900">
              {opt.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm text-gray-400 block mb-2">数量: {count}</label>
        <input
          type="range"
          min="1"
          max="8"
          value={count}
          onChange={(e) => setCount(parseInt(e.target.value))}
          className="w-full accent-purple-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/5 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">功耗</div>
          <div className="text-xl font-bold text-orange-400">{electricity.toFixed(1)} kW</div>
        </div>
        <div className="bg-white/5 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">预估日收益</div>
          <div className="text-xl font-bold text-green-400">${(earnings * count).toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}

// Live Feed Component
function LiveFeed() {
  const [events, setEvents] = useState([
    { id: 1, type: 'task', message: '新任务: 知识推理 #9823', time: '刚刚' },
    { id: 2, type: 'node', message: '节点 0x7a2f... 加入网络', time: '2秒前' },
    { id: 3, type: 'reward', message: '节点获得区块奖励 12.5 AFC', time: '5秒前' },
    { id: 4, type: 'task', message: '任务完成: 内容审核 #9821', time: '8秒前' },
  ]);

  useEffect(() => {
    const messages = [
      '新任务: 知识推理',
      '节点加入网络',
      '获得区块奖励',
      '任务完成: 翻译',
      '新用户注册',
      '域名解析更新',
    ];

    const interval = setInterval(() => {
      const newEvent = {
        id: Date.now(),
        type: ['task', 'node', 'reward'][Math.floor(Math.random() * 3)],
        message: `新任务: ${messages[Math.floor(Math.random() * messages.length)]} #${Math.floor(Math.random() * 10000)}`,
        time: '刚刚',
      };
      setEvents(prev => [newEvent, ...prev.slice(0, 9)]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'task': return <Activity className="w-4 h-4 text-purple-400" />;
      case 'node': return <Server className="w-4 h-4 text-green-400" />;
      case 'reward': return <Zap className="w-4 h-4 text-yellow-400" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-2 max-h-[300px] overflow-y-auto">
      {events.map((event) => (
        <div
          key={event.id}
          className="flex items-center gap-3 p-3 bg-white/5 rounded-lg animate-fade-in"
        >
          {getIcon(event.type)}
          <div className="flex-1 min-w-0">
            <div className="text-sm text-white truncate">{event.message}</div>
            <div className="text-xs text-gray-500">{event.time}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Main PoUE Section
export default function PoUESection() {
  const [activeTab, setActiveTab] = useState('map');

  const tabs = [
    { id: 'map', label: '节点地图', icon: Server },
    { id: 'energy', label: '能量流动', icon: Zap },
    { id: 'calculator', label: '收益计算', icon: Cpu },
    { id: 'feed', label: '实时动态', icon: Activity },
  ];

  return (
    <section id="poue" className="py-24 px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-purple-900/10 to-[#0a0a0f]" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full mb-6">
            <Zap className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-purple-300">The Engine Room</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              PoUE
            </span>
            <span className="text-white"> 共识引擎</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Proof of Useful Energy - 将电力转化为对人类有用的 AI 智能
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          {activeTab === 'map' && (
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <NodeMap3D />
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold text-white">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                  网络状态
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-2xl font-bold text-yellow-400">21</div>
                    <div className="text-sm text-gray-400">核心节点</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-2xl font-bold text-orange-400">128</div>
                    <div className="text-sm text-gray-400">子节点</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-400">10,234</div>
                    <div className="text-sm text-gray-400">普通节点</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-2xl font-bold text-purple-400">99.9%</div>
                    <div className="text-sm text-gray-400">在线率</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'energy' && <EnergyFlowBar />}
          {activeTab === 'calculator' && <HardwareCalculator />}
          {activeTab === 'feed' && <LiveFeed />}
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          {[
            {
              icon: Cpu,
              title: 'AI 任务分配',
              desc: 'AFC 网络分配 AI 任务，节点执行知识推理、内容审核、科学计算等任务',
            },
            {
              icon: Shield,
              title: 'ZK-ML 验证',
              desc: '通过零知识证明确认 AI 确实完成了任务，防止节点作弊',
            },
            {
              icon: TrendingUp,
              title: '奖励分发',
              desc: '验证通过后，节点获得区块奖励与手续费分成',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-purple-500/30 transition-all"
            >
              <feature.icon className="w-8 h-8 text-purple-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}