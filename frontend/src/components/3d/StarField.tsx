import { Canvas, useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { useRef, Suspense, useMemo } from 'react'
import * as THREE from 'three'
import type { Points } from 'three'

// Slowly drifting star field with depth layers
function Scene() {
  const starsRef = useRef<any>(null)
  const nebulaRef = useRef<Points>(null)

  // Create a soft nebula-like particle cloud
  const nebulaGeometry = useMemo(() => {
    const count = 300
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 120
      positions[i * 3 + 1] = (Math.random() - 0.5) * 60
      positions[i * 3 + 2] = (Math.random() - 0.5) * 80
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return geo
  }, [])

  useFrame((state, delta) => {
    if (starsRef.current) {
      starsRef.current.rotation.x += delta * 0.006
      starsRef.current.rotation.y += delta * 0.003
    }
    if (nebulaRef.current) {
      nebulaRef.current.rotation.y += delta * 0.002
      nebulaRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.05) * 0.1
    }
  })

  return (
    <>
      {/* Main star field - slow drift */}
      <Stars
        ref={starsRef}
        radius={100}
        depth={80}
        count={6000}
        factor={4}
        saturation={0.08}
        fade
        speed={0}
      />
      {/* Second layer - different depth */}
      <Stars
        radius={60}
        depth={40}
        count={1500}
        factor={2.5}
        saturation={0.15}
        fade
        speed={0}
      />
      {/* Nebula glow particles */}
      <points ref={nebulaRef} geometry={nebulaGeometry}>
        <pointsMaterial
          color="#2d4a8a"
          size={0.8}
          transparent
          opacity={0.3}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </>
  )
}

export default function StarField() {
  return (
    <Canvas
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
      camera={{ position: [0, 0, 1], fov: 75 }}
      gl={{ alpha: true, antialias: false }}
      dpr={[1, 1.5]}
    >
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
    </Canvas>
  )
}
