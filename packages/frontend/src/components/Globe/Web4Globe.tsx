'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface EcoNode {
  key: string;
  label: string;
  lat: number;
  lng: number;
  color: string;
  domain: string;
}

const ecosystemNodes: EcoNode[] = [
  { key: 'labor', label: '💼 数字劳动市场', lat: 35, lng: 105, color: '#f59e0b', domain: 'labor.net4.xyz' },
  { key: 'afc', label: '🔑 AFC 公链', lat: 25, lng: 120, color: '#a855f7', domain: 'afc.net4.xyz' },
  { key: 'soul', label: '🪪 DID 身份', lat: -5, lng: 110, color: '#06b6d4', domain: 'soul.net4.xyz' },
  { key: 'cloud', label: '☁️ 云手机', lat: 40, lng: -75, color: '#3b82f6', domain: 'cloud.net4.xyz' },
  { key: 'hardware', label: '🔧 B端硬件', lat: 50, lng: -5, color: '#f97316', domain: 'hardware.net4.xyz' },
  { key: 'dex', label: '📈 去中心交易所', lat: -8, lng: 80, color: '#22c55e', domain: 'dex.net4.xyz' },
  { key: 'bbs', label: '🤝 AI分身社区', lat: 48, lng: 2, color: '#ec4899', domain: 'bbs.net4.xyz' },
  { key: 'social', label: '📣 社交广场', lat: -15, lng: -45, color: '#6366f1', domain: 'social.net4.xyz' },
  { key: 'did', label: '🌐 域名系统', lat: 10, lng: -85, color: '#14b8a6', domain: 'did.net4.xyz' },
  { key: 'get', label: '📱 实体手机', lat: 55, lng: 38, color: '#f43f5e', domain: 'get.net4.xyz' },
  { key: 'partner', label: '🤝 代理商', lat: -30, lng: 150, color: '#d97706', domain: 'partner.net4.xyz' },
];

function latLngToVec3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

export default function Web4Globe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.set(0, 0.5, 3.8);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.3;
    controls.minDistance = 2;
    controls.maxDistance = 6;
    controls.enablePan = false;

    // Globe
    const globeRadius = 1.3;
    const globeGeo = new THREE.SphereGeometry(globeRadius, 64, 64);

    // Globe material — dark with grid
    const globeMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#1a1a2e') },
        uGridColor: { value: new THREE.Color('#2a1a4e') },
      },
      vertexShader: `
        varying vec3 vPos;
        varying vec2 vUv;
        void main() {
          vPos = position;
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vPos;
        varying vec2 vUv;
        uniform float uTime;
        uniform vec3 uColor;
        uniform vec3 uGridColor;
        void main() {
          // Grid pattern
          float gridX = abs(fract(vPos.x * 4.0) - 0.5);
          float gridY = abs(fract(vPos.z * 4.0) - 0.5);
          float grid = smoothstep(0.48, 0.5, gridX) + smoothstep(0.48, 0.5, gridY);
          // Ocean glow
          vec3 color = mix(uColor, uGridColor, grid * 0.5);
          // Edge glow
          float fresnel = pow(1.0 - abs(dot(normalize(vPos), vec3(0.0, 0.0, 1.0))), 3.0);
          color += vec3(0.08, 0.02, 0.2) * fresnel;
          gl_FragColor = vec4(color, 0.92);
        }
      `,
      transparent: true,
    });

    const globe = new THREE.Mesh(globeGeo, globeMat);
    scene.add(globe);

    // Atmosphere glow
    const atmosGeo = new THREE.SphereGeometry(globeRadius + 0.06, 64, 64);
    const atmosMat = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
          gl_FragColor = vec4(0.4, 0.1, 0.8, intensity * 0.25);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });
    const atmosphere = new THREE.Mesh(atmosGeo, atmosMat);
    scene.add(atmosphere);

    // Orbiting ring
    const ringGeo = new THREE.TorusGeometry(globeRadius + 0.25, 0.008, 16, 128);
    const ringMat = new THREE.MeshBasicMaterial({ color: '#b026ff', transparent: true, opacity: 0.3 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2.5;
    scene.add(ring);

    // Second ring
    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(globeRadius + 0.35, 0.005, 16, 100),
      new THREE.MeshBasicMaterial({ color: '#00d4ff', transparent: true, opacity: 0.2 })
    );
    ring2.rotation.x = Math.PI / 1.8;
    ring2.rotation.y = Math.PI / 4;
    scene.add(ring2);

    // Ecosystem nodes
    const nodeMeshes: THREE.Mesh[] = [];
    const connections: THREE.Line[] = [];

    ecosystemNodes.forEach(node => {
      const pos = latLngToVec3(node.lat, node.lng, globeRadius + 0.04);
      const dotGeo = new THREE.SphereGeometry(0.035, 16, 16);
      const dotMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(node.color) });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.copy(pos);
      dot.userData = node;
      globe.add(dot);
      nodeMeshes.push(dot);

      // Glow sprite
      const spriteMat = new THREE.SpriteMaterial({
        map: createGlowTexture(node.color),
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.6,
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.copy(pos.clone().multiplyScalar(1.15));
      sprite.scale.set(0.15, 0.15, 1);
      dot.add(sprite);
    });

    // Connections between nodes
    for (let i = 0; i < ecosystemNodes.length; i++) {
      for (let j = i + 1; j < ecosystemNodes.length; j++) {
        if (Math.random() > 0.65) continue;
        const a = latLngToVec3(ecosystemNodes[i].lat, ecosystemNodes[i].lng, globeRadius + 0.04);
        const b = latLngToVec3(ecosystemNodes[j].lat, ecosystemNodes[j].lng, globeRadius + 0.04);
        // Arc above surface
        const mid = a.clone().add(b).multiplyScalar(0.5).normalize().multiplyScalar(globeRadius + 0.2);
        const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
        const lineGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(32));
        const lineMat = new THREE.LineBasicMaterial({
          color: new THREE.Color('#b026ff'),
          transparent: true,
          opacity: 0.15,
        });
        const line = new THREE.Line(lineGeo, lineMat);
        globe.add(line);
        connections.push(line);
      }
    }

    // Stars background
    const starsGeo = new THREE.BufferGeometry();
    const starsCount = 600;
    const starsVerts = new Float32Array(starsCount * 3);
    for (let i = 0; i < starsCount; i++) {
      starsVerts[i * 3] = (Math.random() - 0.5) * 20;
      starsVerts[i * 3 + 1] = (Math.random() - 0.5) * 20;
      starsVerts[i * 3 + 2] = (Math.random() - 0.5) * 15;
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starsVerts, 3));
    const starsMat = new THREE.PointsMaterial({ color: '#ffffff', size: 0.015, transparent: true, opacity: 0.5 });
    const stars = new THREE.Points(starsGeo, starsMat);
    scene.add(stars);

    // Raycaster for hover
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points.threshold = 0.1;
    const mouse = new THREE.Vector2();

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onClick = (e: MouseEvent) => {
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodeMeshes);
      if (intersects.length > 0) {
        const node = intersects[0].object.userData as EcoNode;
        setSelectedNode(node.key);
      } else {
        setSelectedNode(null);
      }
    };

    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('click', onClick);

    // Animation
    let frame = 0;
    const animate = () => {
      requestAnimationFrame(animate);
      frame++;
      controls.update();

      // Pulse nodes
      const t = frame * 0.03;
      nodeMeshes.forEach((dot, i) => {
        const node = dot.userData as EcoNode;
        const scale = 1 + Math.sin(t + i) * 0.15;
        dot.scale.setScalar(scale);
        // Highlight hovered/selected
        if (node.key === selectedNode) {
          dot.scale.setScalar(1.6);
        }
      });

      // Update hover detection
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodeMeshes);
      if (intersects.length > 0) {
        setHoveredNode((intersects[0].object.userData as EcoNode).key);
      } else {
        setHoveredNode(null);
      }

      // Rotate rings
      ring.rotation.z += 0.002;
      ring2.rotation.z -= 0.001;

      // Rotate stars slowly
      stars.rotation.y += 0.0001;

      renderer.render(scene, camera);
    };

    animate();

    // Resize
    const onResize = () => {
      const w2 = container.clientWidth;
      const h2 = container.clientHeight;
      camera.aspect = w2 / h2;
      camera.updateProjectionMatrix();
      renderer.setSize(w2, h2);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('click', onClick);
      container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [selectedNode]);

  function createGlowTexture(color: string): THREE.Texture {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.3, color + '80');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  const selected = ecosystemNodes.find(n => n.key === selectedNode);
  const hovered = ecosystemNodes.find(n => n.key === hoveredNode);

  return (
    <div className="relative">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono mb-4">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          3D 交互 · Web4 生态网络
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Web4.0 全球节点网络</h2>
        <p className="text-gray-400 text-sm max-w-lg mx-auto">
          11 个生态节点分布全球 · 点击节点查看详情 · 拖拽旋转地球
        </p>
      </div>

      <div className="relative">
        <div
          ref={containerRef}
          className="w-full rounded-2xl overflow-hidden border border-purple-500/20 bg-black/30"
          style={{ height: '480px', cursor: 'grab' }}
        />

        {/* Node tooltip */}
        {(hovered || selected) && (
          <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl border backdrop-blur-xl transition-all ${
            selected ? 'border-purple-500/30 bg-purple-500/10' : 'border-white/10 bg-black/60'
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-lg">{(hovered || selected)!.label.split(' ')[0]}</span>
              <span className="text-sm text-gray-300">{(hovered || selected)!.label.split(' ').slice(1).join(' ')}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1 font-mono">
              {(hovered || selected)!.domain}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-3 mt-4">
        {ecosystemNodes.map(n => (
          <button
            key={n.key}
            onClick={() => setSelectedNode(n.key === selectedNode ? null : n.key)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all ${
              n.key === selectedNode
                ? 'bg-white/10 border border-white/20 text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: n.color }} />
            {n.key}
          </button>
        ))}
      </div>
    </div>
  );
}
