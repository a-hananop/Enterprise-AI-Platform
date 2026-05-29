import React from 'react'

/**
 * AIBrainCSS — A pure CSS fallback for mobile devices.
 * Uses standard DOM elements and CSS animations to completely bypass WebGL driver bugs (e.g. Mali GPUs).
 * Guaranteed to never smear or ghost.
 */

const cssStyles = `
@keyframes core-pulse {
  0% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.6; }
  50% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.6; }
}

@keyframes spin-x {
  from { transform: translate(-50%, -50%) rotateX(0deg) rotateY(0deg) rotateZ(0deg); }
  to { transform: translate(-50%, -50%) rotateX(360deg) rotateY(180deg) rotateZ(360deg); }
}

@keyframes spin-y {
  from { transform: translate(-50%, -50%) rotateX(60deg) rotateY(0deg) rotateZ(0deg); }
  to { transform: translate(-50%, -50%) rotateX(60deg) rotateY(360deg) rotateZ(180deg); }
}

@keyframes spin-z {
  from { transform: translate(-50%, -50%) rotateX(120deg) rotateY(0deg) rotateZ(0deg); }
  to { transform: translate(-50%, -50%) rotateX(120deg) rotateY(360deg) rotateZ(360deg); }
}

@keyframes orbit {
  from { transform: rotate(0deg) translateX(45px) rotate(0deg); }
  to { transform: rotate(360deg) translateX(45px) rotate(-360deg); }
}

@keyframes orbit-reverse {
  from { transform: rotate(360deg) translateX(55px) rotate(-360deg); }
  to { transform: rotate(0deg) translateX(55px) rotate(0deg); }
}

@keyframes node-pulse {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 0.8; transform: scale(1.2); }
}
`

export default function AIBrainCSS({ size = 110 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, position: 'relative', perspective: 800 }}>
      <style>{cssStyles}</style>

      {/* Main Container */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', width: '100%', height: '100%',
        transformStyle: 'preserve-3d', transform: 'translate(-50%, -50%)'
      }}>

        {/* Outer Glow */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: '90%', height: '90%',
          background: 'radial-gradient(circle, rgba(79,139,255,0.4) 0%, transparent 70%)',
          transform: 'translate(-50%, -50%)',
        }} />

        {/* Inner Solid Core */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: '35%', height: '35%',
          background: 'radial-gradient(circle, #93c5fd 0%, #2563eb 60%, transparent 100%)',
          boxShadow: '0 0 20px #4f8bff, inset 0 0 10px #ffffff',
          borderRadius: '50%',
          animation: 'core-pulse 3s ease-in-out infinite',
        }} />

        {/* Rotating Rings (Simulating 3D structure) */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%', width: '70%', height: '70%',
          border: '1px solid rgba(37,99,235,0.5)', borderRadius: '50%',
          animation: 'spin-x 8s linear infinite',
          boxShadow: 'inset 0 0 10px rgba(37,99,235,0.2)',
        }} />
        <div style={{
          position: 'absolute', top: '50%', left: '50%', width: '70%', height: '70%',
          border: '1px solid rgba(34,211,165,0.4)', borderRadius: '50%',
          animation: 'spin-y 12s linear infinite',
          boxShadow: 'inset 0 0 10px rgba(34,211,165,0.1)',
        }} />
        <div style={{
          position: 'absolute', top: '50%', left: '50%', width: '70%', height: '70%',
          border: '1px solid rgba(167,139,250,0.4)', borderRadius: '50%',
          animation: 'spin-z 10s linear infinite',
          boxShadow: 'inset 0 0 10px rgba(167,139,250,0.1)',
        }} />

        {/* Orbiting Dots */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%', width: 6, height: 6,
          background: '#4f8bff', borderRadius: '50%', boxShadow: '0 0 8px #4f8bff',
          animation: 'orbit 4s linear infinite',
        }} />
        <div style={{
          position: 'absolute', top: '50%', left: '50%', width: 5, height: 5,
          background: '#22d3a5', borderRadius: '50%', boxShadow: '0 0 8px #22d3a5',
          animation: 'orbit-reverse 6s linear infinite',
        }} />

        {/* Data Nodes */}
        {[
          { t: '10%', l: '20%', d: '0s', c: '#4f8bff' },
          { t: '80%', l: '80%', d: '1s', c: '#22d3a5' },
          { t: '20%', l: '85%', d: '0.5s', c: '#a78bfa' },
          { t: '85%', l: '15%', d: '1.5s', c: '#4f8bff' },
          { t: '45%', l: '5%', d: '0.2s', c: '#a78bfa' },
          { t: '50%', l: '95%', d: '1.2s', c: '#22d3a5' },
        ].map((node, i) => (
          <div key={i} style={{
            position: 'absolute', top: node.t, left: node.l,
            width: 4, height: 4, borderRadius: '50%',
            background: node.c, boxShadow: `0 0 6px ${node.c}`,
            animation: `node-pulse 2s ease-in-out ${node.d} infinite`,
          }} />
        ))}

      </div>
    </div>
  )
}
