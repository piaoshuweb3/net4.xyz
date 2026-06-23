'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as THREE from 'three';

export default function HeroSection() {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLowPerf, setIsLowPerf] = useState(false);

  // Detect low-power devices
  useEffect(() => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const lowCPU = navigator.hardwareConcurrency <= 4;
    setIsLowPerf(isMobile || lowCPU);
  }, []);

  // Three.js neural network animation
  useEffect(() => {
    if (!canvasRef.current) return;

    let animationId: number;
    let renderer: THREE.WebGLRenderer;
    let geometry: THREE.BufferGeometry;
    let material: THREE.PointsMaterial;
    let lineGeometry: THREE.BufferGeometry;

    try {
      const canvas = canvasRef.current;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, isLowPerf ? 1 : 2));

      // Adaptive particle count
      const particleCount = isLowPerf ? 300 : 800;
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      const velocities: { x: number; y: number; z: number }[] = [];

      const goldColor = new THREE.Color(0xFFD700);
      const quantumColor = new THREE.Color(0x00D4FF);
      const purpleColor = new THREE.Color(0x8B5CF6);

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        positions[i3] = (Math.random() - 0.5) * 18;
        positions[i3 + 1] = (Math.random() - 0.5) * 18;
        positions[i3 + 2] = (Math.random() - 0.5) * 18;

        velocities.push({
          x: (Math.random() - 0.5) * 0.008,
          y: (Math.random() - 0.5) * 0.008,
          z: (Math.random() - 0.5) * 0.008,
        });

        const r = Math.random();
        const c = r < 0.4 ? goldColor : r < 0.7 ? quantumColor : purpleColor;
        colors[i3] = c.r;
        colors[i3 + 1] = c.g;
        colors[i3 + 2] = c.b;
      }

      geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      material = new THREE.PointsMaterial({
        size: 0.06,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const particles = new THREE.Points(geometry, material);
      scene.add(particles);

      // Neural connections
      lineGeometry = new THREE.BufferGeometry();
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0xFFD700,
        transparent: true,
        opacity: 0.08,
      });
      const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
      scene.add(lines);

      camera.position.z = 7;

      let mouseX = 0, mouseY = 0;
      const handleMouseMove = (e: MouseEvent) => {
        mouseX = (e.clientX / window.innerWidth) * 2 - 1;
        mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
      };
      window.addEventListener('mousemove', handleMouseMove);

      // WebGL context loss handler
      const handleContextLoss = (event: Event) => {
        event.preventDefault();
        cancelAnimationFrame(animationId);
      };
      canvas.addEventListener('webglcontextlost', handleContextLoss, false);

      const animate = () => {
        animationId = requestAnimationFrame(animate);

        const posArray = geometry.attributes.position.array as Float32Array;

        for (let i = 0; i < particleCount; i++) {
          const i3 = i * 3;
          posArray[i3] += velocities[i].x;
          posArray[i3 + 1] += velocities[i].y;
          posArray[i3 + 2] += velocities[i].z;

          if (Math.abs(posArray[i3]) > 9) velocities[i].x *= -1;
          if (Math.abs(posArray[i3 + 1]) > 9) velocities[i].y *= -1;
          if (Math.abs(posArray[i3 + 2]) > 9) velocities[i].z *= -1;
        }

        geometry.attributes.position.needsUpdate = true;

        particles.rotation.x += 0.0003 + mouseY * 0.0008;
        particles.rotation.y += 0.0003 + mouseX * 0.0008;

        // Update connections sparingly
        if (Math.random() < 0.08) {
          const linePositions: number[] = [];
          const maxDistSq = 1.5;
          const maxConnections = isLowPerf ? 150 : 400;
          let count = 0;
          const step = Math.max(1, Math.floor(particleCount / 80));

          for (let i = 0; i < particleCount && count < maxConnections; i += step) {
            for (let j = i + step; j < particleCount && count < maxConnections; j += step) {
              const i3 = i * 3, j3 = j * 3;
              const dx = posArray[i3] - posArray[j3];
              const dy = posArray[i3 + 1] - posArray[j3 + 1];
              const dz = posArray[i3 + 2] - posArray[j3 + 2];
              const distSq = dx * dx + dy * dy + dz * dz;

              if (distSq < maxDistSq) {
                linePositions.push(
                  posArray[i3], posArray[i3 + 1], posArray[i3 + 2],
                  posArray[j3], posArray[j3 + 1], posArray[j3 + 2]
                );
                count++;
              }
            }
          }

          if (linePositions.length > 0) {
            lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
          }
        }

        renderer.render(scene, camera);
      };

      animate();

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
        canvas.removeEventListener('webglcontextlost', handleContextLoss);
        renderer.dispose();
        geometry.dispose();
        material.dispose();
        lineGeometry.dispose();
      };
    } catch (error) {
      console.error('Three.js init error:', error);
    }
  }, [isLowPerf]);

  return (
    <section id="home" className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-space-900">
      {/* Three.js Neural Network Background */}
      <canvas
        ref={canvasRef}
        className="fixed top-0 left-0 w-full h-full"
        style={{ position: 'fixed', zIndex: 0, pointerEvents: 'none' }}
        aria-hidden="true"
      />

      {/* Vignette + Gradient Overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          position: 'fixed',
          zIndex: 1,
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(5,5,7,0.4) 60%, rgba(5,5,7,0.9) 100%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full px-6 sm:px-8 lg:px-12">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div
            className="mb-8 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold-300/20 bg-gold-300/5 backdrop-blur-sm animate-fade-in-up"
            style={{ animationDelay: '0.1s', opacity: 0 }}
          >
            <span className="w-2 h-2 bg-vital-400 rounded-full animate-pulse" />
            <span className="text-sm text-gold-200 tracking-wide font-medium">{t('hero.badge')}</span>
          </div>

          {/* Main Headline */}
          <h1
            className="text-hero font-serif font-bold mb-6 animate-fade-in-up"
            style={{ animationDelay: '0.3s', opacity: 0 }}
          >
            <span className="block text-white">{t('hero.title1')}</span>
            <span
              className="block my-3 bg-gradient-to-r from-gold-300 via-quantum-400 to-consciousness-400 bg-clip-text text-transparent"
              style={{ backgroundSize: '200% auto' }}
            >
              {t('hero.title2')}
            </span>
            <span className="block text-white">{t('hero.title3')}</span>
          </h1>

          {/* Subtitle */}
          <p
            className="text-lg md:text-xl text-ink-secondary mb-12 max-w-3xl mx-auto leading-relaxed animate-fade-in-up"
            style={{ animationDelay: '0.5s', opacity: 0 }}
          >
            {t('hero.subtitle')}{' '}
            <span className="text-gold-300 font-semibold">{t('hero.subtitlePoue')}</span>
            {t('hero.subtitlePoueDesc')}
            <br className="hidden md:block" />
            {t('hero.subtitleEnd')}
          </p>

          {/* Single Primary CTA — Flagship Approach */}
          <div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-20 animate-fade-in-up"
            style={{ animationDelay: '0.7s', opacity: 0 }}
          >
            <button className="group relative px-10 py-4 bg-gradient-to-r from-gold-300 to-gold-400 text-space-900 rounded-full text-lg font-bold overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(255,215,0,0.4)]">
              <span className="relative z-10 flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                </svg>
                {t('hero.ignite')}
              </span>
              <div className="absolute inset-0 bg-shimmer-gold bg-[length:200%_100%] opacity-0 group-hover:opacity-100 transition-opacity animate-shimmer" />
            </button>

            <button
              onClick={() => window.location.href = '/wallet'}
              className="px-8 py-4 border border-quantum-400/30 text-quantum-200 rounded-full text-base font-medium hover:bg-quantum-400/10 transition-all"
            >
              {t('hero.afcWallet')}
            </button>
          </div>

          {/* Stats — Minimal, Premium */}
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto animate-fade-in-up"
            style={{ animationDelay: '0.9s', opacity: 0 }}
          >
            {[
              { value: '21', label: t('hero.stats.coreNodes') },
              { value: '128', label: t('hero.stats.subNodes') },
              { value: '10K+', label: t('hero.stats.normalNodes') },
              { value: '99.9%', label: t('hero.stats.availability') },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-serif font-bold text-gold-300 mb-1">
                  {stat.value}
                </div>
                <div className="text-xs md:text-sm text-ink-tertiary uppercase tracking-widest">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 text-ink-muted z-10">
        <span className="text-[10px] uppercase tracking-[0.3em]">{t('hero.scrollDown')}</span>
        <div className="w-5 h-9 border border-ink-muted/40 rounded-full flex justify-center pt-2">
          <div className="w-0.5 h-2 bg-gold-300/60 rounded-full animate-bounce" />
        </div>
      </div>
    </section>
  );
}
