'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function HeroSectionSimple() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    try {
      const canvas = canvasRef.current;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      const renderer = new THREE.WebGLRenderer({ 
        canvas, 
        antialias: true, 
        alpha: true 
      });

      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      // 简化版：只有粒子，没有连接线
      const particleCount = 500; // 大幅减少粒子数
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      const velocities: { x: number; y: number; z: number }[] = [];

      const color1 = new THREE.Color(0xb026ff); // Purple
      const color2 = new THREE.Color(0xff69b4); // Pink
      const color3 = new THREE.Color(0x00ffff); // Cyan

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        positions[i3] = (Math.random() - 0.5) * 20;
        positions[i3 + 1] = (Math.random() - 0.5) * 20;
        positions[i3 + 2] = (Math.random() - 0.5) * 20;

        velocities.push({
          x: (Math.random() - 0.5) * 0.01,
          y: (Math.random() - 0.5) * 0.01,
          z: (Math.random() - 0.5) * 0.01,
        });

        const mixRatio = Math.random();
        const color = mixRatio < 0.33 ? color1 : mixRatio < 0.66 ? color2 : color3;
        colors[i3] = color.r;
        colors[i3 + 1] = color.g;
        colors[i3 + 2] = color.b;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const material = new THREE.PointsMaterial({
        size: 0.08,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
      });

      const particles = new THREE.Points(geometry, material);
      scene.add(particles);

      camera.position.z = 8;

      // Mouse interaction
      let mouseX = 0;
      let mouseY = 0;

      const handleMouseMove = (event: MouseEvent) => {
        mouseX = (event.clientX / window.innerWidth) * 2 - 1;
        mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
      };

      window.addEventListener('mousemove', handleMouseMove);

      // Animation
      let animationId: number;

      const animate = () => {
        animationId = requestAnimationFrame(animate);

        // Update particle positions
        const posArray = geometry.attributes.position.array as Float32Array;
        
        for (let i = 0; i < particleCount; i++) {
          const i3 = i * 3;
          posArray[i3] += velocities[i].x;
          posArray[i3 + 1] += velocities[i].y;
          posArray[i3 + 2] += velocities[i].z;

          // Boundary check
          if (Math.abs(posArray[i3]) > 10) velocities[i].x *= -1;
          if (Math.abs(posArray[i3 + 1]) > 10) velocities[i].y *= -1;
          if (Math.abs(posArray[i3 + 2]) > 10) velocities[i].z *= -1;
        }

        geometry.attributes.position.needsUpdate = true;

        // Rotate based on mouse
        particles.rotation.x += 0.0005 + mouseY * 0.001;
        particles.rotation.y += 0.0005 + mouseX * 0.001;

        renderer.render(scene, camera);
      };

      animate();

      // Handle resize
      const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };

      window.addEventListener('resize', handleResize);

      return () => {
        cancelAnimationFrame(animationId);
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('mousemove', handleMouseMove);
        renderer.dispose();
        geometry.dispose();
        material.dispose();
      };
    } catch (error) {
      console.error('Three.js initialization error:', error);
    }
  }, []);

  return (
    <section id="home" className="relative h-screen w-full flex items-center justify-center overflow-hidden">
      {/* Three.js Canvas - 固定在背景 */}
      <canvas
        ref={canvasRef}
        className="fixed top-0 left-0 w-full h-full"
        style={{ position: 'fixed', zIndex: 0, pointerEvents: 'none' }}
      />

      {/* Gradient Overlay - 在Canvas之上 */}
      <div 
        className="fixed inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0a0f]" 
        style={{ position: 'fixed', zIndex: 1, pointerEvents: 'none' }}
      />

      {/* Content - 最上层，居中显示 */}
      <div className="relative z-10 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mb-6 inline-flex items-center px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
              <span className="text-sm text-purple-300">Web4.0 感知互联网已上线</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              <span className="text-white block">AI 与</span>
              <span 
                className="glitch-effect bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent block my-2"
                data-text="人类文明"
              >
                人类文明
              </span>
              <span className="text-white block">的下一代网络</span>
            </h1>

            <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-3xl mx-auto leading-relaxed">
              基于 <span className="text-purple-400 font-semibold">PoUE</span>（Proof of Useful Energy）共识机制
              <br className="hidden md:block" />
              将电力转化为对人类有用的 AI 智能
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <button className="group relative px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl text-lg font-semibold overflow-hidden transition-all hover:scale-105 neon-glow-pink">
                <span className="relative z-10 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                  </svg>
                  Ignite Spark
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              
              <button className="px-8 py-4 border border-purple-500/30 text-purple-300 rounded-xl text-lg font-semibold hover:bg-purple-500/10 transition-all neon-glow-purple">
                了解更多
              </button>
            </div>

            {/* Stats - 统计数据 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              {[
                { value: '21', label: '核心节点' },
                { value: '128', label: '子节点' },
                { value: '10K+', label: '普通节点' },
                { value: '99.9%', label: '可用性' },
              ].map((stat, idx) => (
                <div key={stat.label} className={`text-center count-up-animation count-up-delay-${idx + 1}`}>
                  <div className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm md:text-base text-gray-400 uppercase tracking-wider">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-500 z-10">
        <span className="text-xs uppercase tracking-widest">向下滚动</span>
        <div className="w-6 h-10 border-2 border-gray-600 rounded-full flex justify-center pt-2">
          <div className="w-1 h-2 bg-purple-500 rounded-full animate-bounce" />
        </div>
      </div>
    </section>
  );
}
