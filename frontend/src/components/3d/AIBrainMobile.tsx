import { useEffect, useRef } from 'react'

/**
 * AIBrainMobile — a pixel-faithful Canvas 2D replica of the WebGL AIBrain.
 * Renders: rotating wireframe icosahedron core, 3 orbit rings with travelling dots,
 * 24 pulsing data nodes distributed on a sphere, neural connection lines.
 * Uses standard 2D Canvas API → zero WebGL/GPU compositor conflicts on mobile.
 */

function project(
  x: number, y: number, z: number,
  rotY: number, rotX: number,
  cx: number, cy: number, fov: number
): [number, number, number] {
  // Rotate around Y
  const cosY = Math.cos(rotY), sinY = Math.sin(rotY)
  const x1 = cosY * x + sinY * z
  const z1 = -sinY * x + cosY * z
  // Rotate around X
  const cosX = Math.cos(rotX), sinX = Math.sin(rotX)
  const y2 = cosX * y - sinX * z1
  const z2 = sinX * y + cosX * z1
  const scale = fov / (fov + z2)
  return [cx + x1 * scale, cy + y2 * scale, scale]
}

// Icosahedron vertices (unit sphere)
const PHI = (1 + Math.sqrt(5)) / 2
const RAW_VERTS: [number, number, number][] = [
  [-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0],
  [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI],
  [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1],
]
const NORM = Math.sqrt(1 + PHI * PHI)
const VERTS: [number, number, number][] = RAW_VERTS.map(([x, y, z]) => [x / NORM, y / NORM, z / NORM])

// Icosahedron edges
const EDGES: [number, number][] = [
  [0,1],[0,5],[0,7],[0,10],[0,11],
  [1,5],[1,7],[1,8],[1,9],
  [2,3],[2,4],[2,10],[2,11],
  [3,4],[3,6],[3,8],[3,9],
  [4,5],[4,9],[4,11],
  [5,9],[5,11],
  [6,7],[6,8],[6,10],
  [7,8],[7,10],
  [8,9],[10,11],
]

// 24 data nodes on sphere surface (Fibonacci lattice)
const NODES: [number, number, number][] = Array.from({ length: 24 }, (_, i) => {
  const phi = Math.acos(-1 + (2 * i) / 24)
  const theta = Math.sqrt(24 * Math.PI) * phi
  return [
    2.1 * Math.sin(phi) * Math.cos(theta),
    2.1 * Math.sin(phi) * Math.sin(theta),
    2.1 * Math.cos(phi),
  ]
})

const NODE_COLORS = ['#4f8bff', '#22d3a5', '#a78bfa']

// Orbit ring definitions
const RINGS = [
  { radius: 1.65, speed: 1.2, color: '#4f8bff', tilt: 0.4, angle: 0 },
  { radius: 1.85, speed: -0.8, color: '#22d3a5', tilt: -0.6, angle: 2.1 },
  { radius: 1.5, speed: 1.6, color: '#a78bfa', tilt: 1.1, angle: 4.2 },
]

export default function AIBrainMobile({ size = 110 }: { size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const ringsRef = useRef(RINGS.map(r => ({ ...r })))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    const cx = size / 2
    const cy = size / 2
    const scale = size / 4.8       // map unit sphere → canvas pixels
    const fov = size * 2.2

    let rotY = 0
    let rotX = 0
    let t = 0
    let last = performance.now()

    function draw(now: number) {
      const delta = Math.min((now - last) / 1000, 0.05)
      last = now
      t += delta
      rotY += delta * 0.25
      rotX = Math.sin(t * 0.3) * 0.1

      ctx!.clearRect(0, 0, size, size)

      // ── Outer glow ──
      const glow = ctx!.createRadialGradient(cx, cy, size * 0.05, cx, cy, size * 0.52)
      glow.addColorStop(0, 'rgba(79,139,255,0.13)')
      glow.addColorStop(1, 'rgba(79,139,255,0)')
      ctx!.fillStyle = glow
      ctx!.beginPath()
      ctx!.arc(cx, cy, size * 0.52, 0, Math.PI * 2)
      ctx!.fill()

      // ── Neural connection lines (behind icosahedron) ──
      const lineOpacity = 0.08 + Math.sin(t * 1.2) * 0.07
      ctx!.strokeStyle = `rgba(79,139,255,${lineOpacity})`
      ctx!.lineWidth = 0.7
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 + rotY * 0.5
        const b = ((i + 3) / 16) * Math.PI * 2 + rotY * 0.5
        const r = scale * 1.2
        const [ax, ay] = [cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.42]
        const [bx, by] = [cx + Math.cos(b) * r, cy + Math.sin(b) * r * 0.42]
        ctx!.beginPath()
        ctx!.moveTo(ax, ay)
        ctx!.lineTo(bx, by)
        ctx!.stroke()
      }

      // ── Icosahedron wireframe ──
      const projected = VERTS.map(([x, y, z]) =>
        project(x * scale, y * scale, z * scale, rotY, rotX, cx, cy, fov)
      )

      ctx!.strokeStyle = 'rgba(37,99,235,0.75)'
      ctx!.lineWidth = 0.85
      for (const [a, b] of EDGES) {
        const [ax, ay, sa] = projected[a]
        const [bx, by, sb] = projected[b]
        const avgScale = (sa + sb) / 2
        ctx!.globalAlpha = 0.3 + avgScale * 0.5
        ctx!.beginPath()
        ctx!.moveTo(ax, ay)
        ctx!.lineTo(bx, by)
        ctx!.stroke()
      }
      ctx!.globalAlpha = 1

      // ── Inner solid core (glow) ──
      const coreGlow = ctx!.createRadialGradient(cx, cy, 0, cx, cy, scale * 0.55)
      coreGlow.addColorStop(0, 'rgba(147,197,253,0.95)')
      coreGlow.addColorStop(0.35, 'rgba(29,78,216,0.7)')
      coreGlow.addColorStop(0.7, 'rgba(79,139,255,0.3)')
      coreGlow.addColorStop(1, 'rgba(79,139,255,0)')
      ctx!.fillStyle = coreGlow
      ctx!.beginPath()
      ctx!.arc(cx, cy, scale * 0.55, 0, Math.PI * 2)
      ctx!.fill()

      // Bright center dot
      const pulse = 0.22 + Math.sin(t * 1.8) * 0.04
      ctx!.fillStyle = 'rgba(147,197,253,0.9)'
      ctx!.beginPath()
      ctx!.arc(cx, cy, scale * pulse, 0, Math.PI * 2)
      ctx!.fill()

      // ── Data nodes ──
      NODES.forEach(([nx, ny, nz], i) => {
        const [px, py, ps] = project(nx * scale * 0.48, ny * scale * 0.48, nz * scale * 0.48, rotY, rotX, cx, cy, fov)
        const nodePulse = 0.7 + Math.sin(t * 1.5 + i * 0.4) * 0.3
        const opacity = 0.3 + Math.sin(t * 2 + i * 0.4) * 0.3
        const r = Math.max(0.8, 1.4 * ps * nodePulse)
        ctx!.fillStyle = NODE_COLORS[i % 3]
        ctx!.globalAlpha = opacity
        ctx!.beginPath()
        ctx!.arc(px, py, r, 0, Math.PI * 2)
        ctx!.fill()
      })
      ctx!.globalAlpha = 1

      // ── Orbit rings ──
      for (const ring of ringsRef.current) {
        ring.angle += delta * ring.speed

        // Draw ellipse for tilted ring
        const r = ring.radius * scale * 0.48
        const tiltFactor = Math.cos(ring.tilt)
        ctx!.strokeStyle = ring.color
        ctx!.lineWidth = 0.6
        ctx!.globalAlpha = 0.15
        ctx!.beginPath()
        ctx!.ellipse(cx, cy, r, r * Math.abs(tiltFactor) * 0.42, rotY * 0.3, 0, Math.PI * 2)
        ctx!.stroke()
        ctx!.globalAlpha = 1

        // Travelling dot
        const dotX = cx + Math.cos(ring.angle) * r
        const dotY = cy + Math.sin(ring.angle) * r * Math.abs(tiltFactor) * 0.42
        ctx!.fillStyle = ring.color
        ctx!.shadowColor = ring.color
        ctx!.shadowBlur = 6
        ctx!.beginPath()
        ctx!.arc(dotX, dotY, 2.2, 0, Math.PI * 2)
        ctx!.fill()
        ctx!.shadowBlur = 0
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [size])

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: size,
        height: size,
        display: 'block',
        background: 'transparent',
      }}
    />
  )
}
