import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, Suspense, useMemo } from 'react'
import * as THREE from 'three'
import type { Mesh, Points } from 'three'

// Animated data stream particles flowing inward
function DataStream({ radius, count, color, speed }: { radius: number; count: number; color: string; speed: number }) {
  const pointsRef = useRef<Points>(null)

  const { geometry, phases } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const phases = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      positions[i * 3]     = Math.cos(angle) * radius
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.3
      positions[i * 3 + 2] = Math.sin(angle) * radius
      phases[i] = Math.random() * Math.PI * 2
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return { geometry: geo, phases }
  }, [radius, count])

  useFrame((state, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * speed
      // Pulse opacity
      const t = state.clock.elapsedTime
      // @ts-ignore
      pointsRef.current.material.opacity = 0.4 + Math.sin(t * 2 + phases[0]) * 0.3
    }
  })

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        color={color}
        size={0.05}
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

// Spinning orbit ring with glowing dot
function GlowRing({ radius, tubeRadius, color, speed, tilt }: {
  radius: number; tubeRadius: number; color: string; speed: number; tilt: number
}) {
  const groupRef = useRef<THREE.Group>(null)
  const dotRef = useRef<Mesh>(null)
  const trailRef = useRef<Mesh[]>([])
  let angle = Math.random() * Math.PI * 2

  useFrame((_, delta) => {
    angle += delta * speed
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.02
    if (dotRef.current) {
      dotRef.current.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * 0.15,
        Math.sin(angle) * radius,
      )
      // scale pulse
      const s = 1 + Math.sin(angle * 4) * 0.3
      dotRef.current.scale.setScalar(s)
    }
  })

  return (
    <group ref={groupRef} rotation={[tilt, 0, 0]}>
      <mesh>
        <torusGeometry args={[radius, tubeRadius, 8, 100]} />
        <meshBasicMaterial color={color} transparent opacity={0.2} />
      </mesh>
      <mesh ref={dotRef}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  )
}

// Central pulsing core
function CoreSphere() {
  const outerRef = useRef<Mesh>(null)
  const innerRef = useRef<Mesh>(null)
  const glowRef = useRef<Mesh>(null)

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime

    if (outerRef.current) {
      outerRef.current.rotation.y += delta * 0.8
      outerRef.current.rotation.z += delta * 0.3
    }
    if (innerRef.current) {
      innerRef.current.rotation.y -= delta * 1.2
      const s = 1 + Math.sin(t * 2) * 0.05
      innerRef.current.scale.setScalar(s)
    }
    if (glowRef.current) {
      const pulse = 1 + Math.sin(t * 3) * 0.08
      glowRef.current.scale.setScalar(pulse)
      // @ts-ignore
      glowRef.current.material.opacity = 0.08 + Math.sin(t * 3) * 0.04
    }
  })

  return (
    <group>
      {/* Outer glow halo */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshBasicMaterial color="#4f8bff" transparent opacity={0.1} side={THREE.BackSide} />
      </mesh>

      {/* Outer wireframe */}
      <mesh ref={outerRef}>
        <icosahedronGeometry args={[0.5, 2]} />
        <meshBasicMaterial color="#4f8bff" wireframe transparent opacity={0.5} />
      </mesh>

      {/* Inner solid */}
      <mesh ref={innerRef}>
        <icosahedronGeometry args={[0.28, 1]} />
        <meshStandardMaterial
          color="#1e40af"
          emissive="#3b82f6"
          emissiveIntensity={1.2}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>

      {/* Bright nucleus */}
      <mesh>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshBasicMaterial color="#93c5fd" transparent opacity={1} />
      </mesh>
    </group>
  )
}

function Scene({ isTraining }: { isTraining?: boolean }) {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[3, 3, 3]} color="#4f8bff" intensity={5} />
      <pointLight position={[-3, -3, -3]} color="#7c3aed" intensity={2} />
      <pointLight position={[0, 0, 2]} color="#22d3a5" intensity={isTraining ? 4 : 1.5} />

      <CoreSphere />

      <GlowRing radius={0.75} tubeRadius={0.008} color="#4f8bff" speed={isTraining ? 2.5 : 1.2} tilt={0.4} />
      <GlowRing radius={0.95} tubeRadius={0.006} color="#22d3a5" speed={isTraining ? -1.8 : -0.9} tilt={-0.6} />
      <GlowRing radius={1.15} tubeRadius={0.005} color="#a78bfa" speed={isTraining ? 3.0 : 1.5} tilt={1.0} />

      <DataStream radius={0.82} count={40} color="#4f8bff" speed={isTraining ? 1.5 : 0.6} />
      <DataStream radius={1.05} count={30} color="#22d3a5" speed={isTraining ? -1.2 : -0.4} />
    </>
  )
}

export default function TrainingVisual({ isTraining = false }: { isTraining?: boolean }) {
  return (
    <Canvas
      style={{ width: 160, height: 160 }}
      camera={{ position: [0, 0, 2.8], fov: 42 }}
      gl={{ alpha: true, antialias: true }}
      dpr={[1, 2]}
    >
      <Suspense fallback={null}>
        <Scene isTraining={isTraining} />
      </Suspense>
    </Canvas>
  )
}
