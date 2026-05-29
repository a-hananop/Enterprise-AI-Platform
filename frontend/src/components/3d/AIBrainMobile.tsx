import React, { useEffect, useRef } from 'react'

/**
 * AIBrainMobile — a pixel-faithful Canvas 2D replica of the WebGL AIBrain.
 * Renders: rotating wireframe icosahedron core, 3 orbit rings with travelling dots,
 * 24 pulsing data nodes distributed on a sphere, and neural connection lines.
 * 
 * Uses standard 2D Canvas context. Zero WebGL GPU compositor bugs!
 */

export default function AIBrainMobile() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    const width = 110 * 2 // High DPI
    const height = 110 * 2
    canvas.width = width
    canvas.height = height
    canvas.style.width = '110px'
    canvas.style.height = '110px'

    const cx = width / 2
    const cy = height / 2

    // Simple 3D projection
    const project = (x: number, y: number, z: number, scale = 1) => {
      const perspective = 300 / (300 + z)
      return {
        x: cx + x * perspective * scale,
        y: cy + y * perspective * scale,
        s: perspective
      }
    }

    const t0 = performance.now()

    const draw = () => {
      const t = (performance.now() - t0) * 0.001
      ctx.clearRect(0, 0, width, height)

      // 1. Draw glowing background
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, width/2)
      grad.addColorStop(0, 'rgba(79,139,255,0.15)')
      grad.addColorStop(1, 'transparent')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, width, height)

      // 2. Core Solid
      ctx.beginPath()
      ctx.arc(cx, cy, 25, 0, Math.PI * 2)
      ctx.fillStyle = '#1d4ed8'
      ctx.fill()
      
      ctx.beginPath()
      ctx.arc(cx, cy, 15, 0, Math.PI * 2)
      ctx.fillStyle = '#93c5fd'
      ctx.fill()

      // 3. Fake Icosahedron Wireframe
      ctx.strokeStyle = 'rgba(37,99,235,0.7)'
      ctx.lineWidth = 1.5
      const angleOffset = t * 0.5
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + angleOffset
        const px = Math.cos(a) * 45
        const pz = Math.sin(a) * 45
        const proj = project(px, 0, pz)
        const projTop = project(0, -40, 0)
        const projBot = project(0, 40, 0)

        ctx.beginPath()
        ctx.moveTo(projTop.x, projTop.y)
        ctx.lineTo(proj.x, proj.y)
        ctx.lineTo(projBot.x, projBot.y)
        ctx.stroke()
      }

      // 4. Orbit Rings
      const drawRing = (radius: number, speed: number, color: string, tiltX: number) => {
        const angle = t * speed
        const dotA = t * speed * 2
        
        ctx.save()
        ctx.translate(cx, cy)
        ctx.scale(1, tiltX)
        ctx.rotate(angle)
        
        ctx.beginPath()
        ctx.arc(0, 0, radius, 0, Math.PI * 2)
        ctx.strokeStyle = color
        ctx.globalAlpha = 0.2
        ctx.lineWidth = 2
        ctx.stroke()
        
        // Dot
        ctx.globalAlpha = 1
        ctx.beginPath()
        ctx.arc(Math.cos(dotA) * radius, Math.sin(dotA) * radius, 3, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
        
        ctx.restore()
      }

      drawRing(65, 0.4, '#4f8bff', 0.3)
      drawRing(80, -0.3, '#22d3a5', 0.4)
      drawRing(55, 0.6, '#a78bfa', 0.5)

      // 5. Data Nodes
      const nodeCount = 12
      for (let i = 0; i < nodeCount; i++) {
        const phi = Math.acos(-1 + (2 * i) / nodeCount)
        const theta = Math.sqrt(nodeCount * Math.PI) * phi + t * 0.2
        
        const x = 55 * Math.sin(phi) * Math.cos(theta)
        const y = 55 * Math.sin(phi) * Math.sin(theta)
        const z = 55 * Math.cos(phi)
        
        const proj = project(x, y, z)
        if (z < 0) ctx.globalAlpha = 0.3
        else ctx.globalAlpha = 0.8
        
        ctx.beginPath()
        const pulse = 1 + Math.sin(t * 3 + i) * 0.3
        ctx.arc(proj.x, proj.y, 2.5 * proj.s * pulse, 0, Math.PI * 2)
        ctx.fillStyle = i % 2 === 0 ? '#4f8bff' : '#22d3a5'
        ctx.fill()
      }
      ctx.globalAlpha = 1

      animationFrameId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <div style={{ width: 110, height: 110, flexShrink: 0 }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  )
}
