import { Canvas, useFrame } from '@react-three/fiber'
import { Float, MeshDistortMaterial, Sphere, Torus, Trail, Stars, PointMaterial } from '@react-three/drei'
import { useRef, Suspense, useMemo } from 'react'
import * as THREE from 'three'
import type { Mesh, Points } from 'three'

// Orbiting particle ring
function OrbitRing({ radius, speed, color, tilt = 0 }: { radius: number; speed: number; color: string; tilt?: number }) {
  const groupRef = useRef<THREE.Group>(null)
  const dotRef = useRef<Mesh>(null)
  let angle = Math.random() * Math.PI * 2

  useFrame((_, delta) => {
    angle += delta * speed
    if (dotRef.current) {
      dotRef.current.position.x = Math.cos(angle) * radius
      dotRef.current.position.y = Math.sin(angle) * radius * 0.3
      dotRef.current.position.z = Math.sin(angle) * radius
    }
    if (groupRef.current) {
      groupRef.current.rotation.x = tilt
      groupRef.current.rotation.y += delta * 0.05
    }
  })

  return (
    <group ref={groupRef}>
      {/* Ring outline */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, 0.005, 8, 120]} />
        <meshBasicMaterial color={color} transparent opacity={0.15} />
      </mesh>
      {/* Orbiting dot */}
      <mesh ref={dotRef}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  )
}

// Floating data nodes
function DataNodes() {
  const count = 24
  const positions = useMemo(() => {
    const pos = []
    for (let i = 0; i < count; i++) {
      const phi = Math.acos(-1 + (2 * i) / count)
      const theta = Math.sqrt(count * Math.PI) * phi
      pos.push([
        2.1 * Math.sin(phi) * Math.cos(theta),
        2.1 * Math.sin(phi) * Math.sin(theta),
        2.1 * Math.cos(phi),
      ])
    }
    return pos
  }, [])

  const refs = useRef<Mesh[]>([])
  useFrame((state) => {
    refs.current.forEach((mesh, i) => {
      if (mesh) {
        const t = state.clock.elapsedTime + i * 0.4
        mesh.scale.setScalar(0.7 + Math.sin(t * 1.5) * 0.3)
        // @ts-ignore
        mesh.material.opacity = 0.3 + Math.sin(t * 2) * 0.3
      }
    })
  })

  return (
    <>
      {positions.map((pos, i) => (
        <mesh
          key={i}
          position={pos as [number, number, number]}
          ref={(el) => { if (el) refs.current[i] = el }}
        >
          <sphereGeometry args={[0.03, 6, 6]} />
          <meshBasicMaterial
            color={i % 3 === 0 ? '#4f8bff' : i % 3 === 1 ? '#22d3a5' : '#a78bfa'}
            transparent opacity={0.6}
          />
        </mesh>
      ))}
    </>
  )
}

// Pulsing connection lines
function NeuralConnections() {
  const linesRef = useRef<THREE.LineSegments>(null)

  const { geometry } = useMemo(() => {
    const points: number[] = []
    const count = 16
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2
      const b = ((i + 3) / count) * Math.PI * 2
      points.push(
        Math.cos(a) * 1.2, Math.sin(a) * 0.5, Math.sin(a) * 1.2,
        Math.cos(b) * 1.2, Math.sin(b) * 0.5, Math.sin(b) * 1.2,
      )
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    return { geometry }
  }, [])

  useFrame((state) => {
    if (linesRef.current) {
      // @ts-ignore
      linesRef.current.material.opacity = 0.08 + Math.sin(state.clock.elapsedTime * 1.2) * 0.07
      linesRef.current.rotation.y += 0.003
    }
  })

  return (
    <lineSegments ref={linesRef} geometry={geometry}>
      <lineBasicMaterial color="#4f8bff" transparent opacity={0.1} />
    </lineSegments>
  )
}

// Core brain mesh
function BrainCore() {
  const meshRef = useRef<Mesh>(null)
  const glowRef = useRef<Mesh>(null)

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.25
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.1
    }
    if (glowRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.8) * 0.04
      glowRef.current.scale.setScalar(pulse)
      // @ts-ignore
      glowRef.current.material.opacity = 0.05 + Math.sin(state.clock.elapsedTime * 1.8) * 0.03
    }
  })

  return (
    <Float speed={1.2} rotationIntensity={0.2} floatIntensity={0.4}>
      <group>
        {/* Outer glow sphere */}
        <mesh ref={glowRef}>
          <sphereGeometry args={[1.35, 32, 32]} />
          <meshBasicMaterial color="#4f8bff" transparent opacity={0.06} side={THREE.BackSide} />
        </mesh>

        {/* Main icosahedron */}
        <mesh ref={meshRef}>
          <icosahedronGeometry args={[1, 3]} />
          <MeshDistortMaterial
            color="#2563eb"
            wireframe
            distort={0.25}
            speed={1.5}
            transparent
            opacity={0.7}
          />
        </mesh>

        {/* Inner solid core */}
        <mesh>
          <icosahedronGeometry args={[0.55, 1]} />
          <meshStandardMaterial
            color="#1d4ed8"
            emissive="#4f8bff"
            emissiveIntensity={0.8}
            transparent
            opacity={0.6}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>

        {/* Innermost bright core */}
        <mesh>
          <sphereGeometry args={[0.22, 16, 16]} />
          <meshBasicMaterial color="#93c5fd" transparent opacity={0.9} />
        </mesh>

        {/* Orbit rings */}
        <OrbitRing radius={1.65} speed={1.2} color="#4f8bff" tilt={0.4} />
        <OrbitRing radius={1.85} speed={-0.8} color="#22d3a5" tilt={-0.6} />
        <OrbitRing radius={1.5} speed={1.6} color="#a78bfa" tilt={1.1} />

        {/* Neural connections */}
        <NeuralConnections />

        {/* Data nodes around sphere */}
        <DataNodes />
      </group>
    </Float>
  )
}

export default function AIBrain() {
  return (
    <Canvas
      style={{ width: '100%', height: '100%', background: 'transparent' }}
      camera={{ position: [0, 0, 4.5], fov: 45 }}
      gl={{ alpha: true, antialias: true }}
      dpr={[1, 2]}
    >
      <ambientLight intensity={0.3} />
      <pointLight position={[4, 4, 4]} color="#4f8bff" intensity={6} />
      <pointLight position={[-4, -2, -4]} color="#7c3aed" intensity={3} />
      <pointLight position={[0, 3, 0]} color="#22d3a5" intensity={2} />
      <Suspense fallback={null}>
        <BrainCore />
      </Suspense>
    </Canvas>
  )
}
