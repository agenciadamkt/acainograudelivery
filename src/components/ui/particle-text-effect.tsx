"use client"

import { useEffect, useRef } from "react"

interface Vector2D {
  x: number
  y: number
}

class Particle {
  pos: Vector2D = { x: 0, y: 0 }
  vel: Vector2D = { x: 0, y: 0 }
  acc: Vector2D = { x: 0, y: 0 }
  target: Vector2D = { x: 0, y: 0 }

  closeEnoughTarget = 100
  maxSpeed = 1.0
  maxForce = 0.1
  particleSize = 10
  isKilled = false

  startColor = { r: 0, g: 0, b: 0 }
  targetColor = { r: 0, g: 0, b: 0 }
  colorWeight = 0
  colorBlendRate = 0.01

  move() {
    let proximityMult = 1
    const distance = Math.sqrt(Math.pow(this.pos.x - this.target.x, 2) + Math.pow(this.pos.y - this.target.y, 2))
    if (distance < this.closeEnoughTarget) proximityMult = distance / this.closeEnoughTarget

    const towardsTarget = { x: this.target.x - this.pos.x, y: this.target.y - this.pos.y }
    const magnitude = Math.sqrt(towardsTarget.x ** 2 + towardsTarget.y ** 2)
    if (magnitude > 0) {
      towardsTarget.x = (towardsTarget.x / magnitude) * this.maxSpeed * proximityMult
      towardsTarget.y = (towardsTarget.y / magnitude) * this.maxSpeed * proximityMult
    }

    const steer = { x: towardsTarget.x - this.vel.x, y: towardsTarget.y - this.vel.y }
    const steerMag = Math.sqrt(steer.x ** 2 + steer.y ** 2)
    if (steerMag > 0) {
      steer.x = (steer.x / steerMag) * this.maxForce
      steer.y = (steer.y / steerMag) * this.maxForce
    }

    this.acc.x += steer.x
    this.acc.y += steer.y
    this.vel.x += this.acc.x
    this.vel.y += this.acc.y
    this.pos.x += this.vel.x
    this.pos.y += this.vel.y
    this.acc.x = 0
    this.acc.y = 0
  }

  draw(ctx: CanvasRenderingContext2D, drawAsPoints: boolean) {
    if (this.colorWeight < 1.0) this.colorWeight = Math.min(this.colorWeight + this.colorBlendRate, 1.0)
    const r = Math.round(this.startColor.r + (this.targetColor.r - this.startColor.r) * this.colorWeight)
    const g = Math.round(this.startColor.g + (this.targetColor.g - this.startColor.g) * this.colorWeight)
    const b = Math.round(this.startColor.b + (this.targetColor.b - this.startColor.b) * this.colorWeight)
    ctx.fillStyle = `rgb(${r},${g},${b})`
    if (drawAsPoints) {
      ctx.fillRect(this.pos.x, this.pos.y, 2, 2)
    } else {
      ctx.beginPath()
      ctx.arc(this.pos.x, this.pos.y, this.particleSize / 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  kill(width: number, height: number) {
    if (!this.isKilled) {
      const pos = randomPos(width / 2, height / 2, (width + height) / 2)
      this.target.x = pos.x
      this.target.y = pos.y
      this.startColor = {
        r: this.startColor.r + (this.targetColor.r - this.startColor.r) * this.colorWeight,
        g: this.startColor.g + (this.targetColor.g - this.startColor.g) * this.colorWeight,
        b: this.startColor.b + (this.targetColor.b - this.startColor.b) * this.colorWeight,
      }
      this.targetColor = { r: 0, g: 0, b: 0 }
      this.colorWeight = 0
      this.isKilled = true
    }
  }
}

function randomPos(x: number, y: number, mag: number): Vector2D {
  const rx = Math.random() * 1000
  const ry = Math.random() * 500
  const dir = { x: rx - x, y: ry - y }
  const m = Math.sqrt(dir.x ** 2 + dir.y ** 2)
  if (m > 0) { dir.x = (dir.x / m) * mag; dir.y = (dir.y / m) * mag }
  return { x: x + dir.x, y: y + dir.y }
}

interface ParticleTextEffectProps {
  words?: string[]
  className?: string
}

const DEFAULT_WORDS = ["BORA!", "TRANSFORME", "SUA FRANQUIA", "MÁQUINA DE LUCRO"]

export function ParticleTextEffect({ words = DEFAULT_WORDS, className }: ParticleTextEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const particlesRef = useRef<Particle[]>([])
  const frameCountRef = useRef(0)
  const wordIndexRef = useRef(0)
  const mouseRef = useRef({ x: 0, y: 0, isPressed: false, isRightClick: false })

  const pixelSteps = 6
  const drawAsPoints = true

  const nextWord = (word: string, canvas: HTMLCanvasElement) => {
    const off = document.createElement("canvas")
    off.width = canvas.width
    off.height = canvas.height
    const offCtx = off.getContext("2d")!

    const fontSize = Math.min(canvas.width / (word.length * 0.6), 120)
    offCtx.fillStyle = "white"
    offCtx.font = `bold ${fontSize}px Arial`
    offCtx.textAlign = "center"
    offCtx.textBaseline = "middle"
    offCtx.fillText(word, canvas.width / 2, canvas.height / 2)

    const imageData = offCtx.getImageData(0, 0, canvas.width, canvas.height)
    const pixels = imageData.data
    const newColor = { r: Math.random() * 200 + 55, g: Math.random() * 100, b: Math.random() * 255 }
    const particles = particlesRef.current
    let particleIndex = 0

    const coordsIndexes: number[] = []
    for (let i = 0; i < pixels.length; i += pixelSteps * 4) coordsIndexes.push(i)
    for (let i = coordsIndexes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [coordsIndexes[i], coordsIndexes[j]] = [coordsIndexes[j], coordsIndexes[i]]
    }

    for (const coordIndex of coordsIndexes) {
      if (pixels[coordIndex + 3] > 0) {
        const x = (coordIndex / 4) % canvas.width
        const y = Math.floor(coordIndex / 4 / canvas.width)
        let particle: Particle
        if (particleIndex < particles.length) {
          particle = particles[particleIndex]
          particle.isKilled = false
          particleIndex++
        } else {
          particle = new Particle()
          const pos = randomPos(canvas.width / 2, canvas.height / 2, (canvas.width + canvas.height) / 2)
          particle.pos.x = pos.x
          particle.pos.y = pos.y
          particle.maxSpeed = Math.random() * 6 + 4
          particle.maxForce = particle.maxSpeed * 0.05
          particle.particleSize = Math.random() * 6 + 6
          particle.colorBlendRate = Math.random() * 0.0275 + 0.0025
          particles.push(particle)
        }
        particle.startColor = {
          r: particle.startColor.r + (particle.targetColor.r - particle.startColor.r) * particle.colorWeight,
          g: particle.startColor.g + (particle.targetColor.g - particle.startColor.g) * particle.colorWeight,
          b: particle.startColor.b + (particle.targetColor.b - particle.startColor.b) * particle.colorWeight,
        }
        particle.targetColor = newColor
        particle.colorWeight = 0
        particle.target.x = x
        particle.target.y = y
      }
    }
    for (let i = particleIndex; i < particles.length; i++) particles[i].kill(canvas.width, canvas.height)
  }

  const animate = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!
    const particles = particlesRef.current

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      p.move()
      p.draw(ctx, drawAsPoints)
      if (p.isKilled && (p.pos.x < 0 || p.pos.x > canvas.width || p.pos.y < 0 || p.pos.y > canvas.height)) {
        particles.splice(i, 1)
      }
    }

    if (mouseRef.current.isPressed && mouseRef.current.isRightClick) {
      particles.forEach(p => {
        const d = Math.sqrt((p.pos.x - mouseRef.current.x) ** 2 + (p.pos.y - mouseRef.current.y) ** 2)
        if (d < 50) p.kill(canvas.width, canvas.height)
      })
    }

    frameCountRef.current++
    if (frameCountRef.current % 240 === 0) {
      wordIndexRef.current = (wordIndexRef.current + 1) % words.length
      nextWord(words[wordIndexRef.current], canvas)
    }

    animationRef.current = requestAnimationFrame(animate)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = 1000
    canvas.height = 300
    nextWord(words[0], canvas)
    animate()

    const handleMouseDown = (e: MouseEvent) => {
      mouseRef.current.isPressed = true
      mouseRef.current.isRightClick = e.button === 2
      const rect = canvas.getBoundingClientRect()
      mouseRef.current.x = (e.clientX - rect.left) * (canvas.width / rect.width)
      mouseRef.current.y = (e.clientY - rect.top) * (canvas.height / rect.height)
    }
    const handleMouseUp = () => { mouseRef.current.isPressed = false; mouseRef.current.isRightClick = false }
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current.x = (e.clientX - rect.left) * (canvas.width / rect.width)
      mouseRef.current.y = (e.clientY - rect.top) * (canvas.height / rect.height)
    }
    const handleContextMenu = (e: MouseEvent) => e.preventDefault()

    canvas.addEventListener("mousedown", handleMouseDown)
    canvas.addEventListener("mouseup", handleMouseUp)
    canvas.addEventListener("mousemove", handleMouseMove)
    canvas.addEventListener("contextmenu", handleContextMenu)

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      canvas.removeEventListener("mousedown", handleMouseDown)
      canvas.removeEventListener("mouseup", handleMouseUp)
      canvas.removeEventListener("mousemove", handleMouseMove)
      canvas.removeEventListener("contextmenu", handleContextMenu)
    }
  }, [])

  return (
    <div className={`flex flex-col items-center justify-center w-full ${className ?? ""}`}>
      <canvas ref={canvasRef} className="w-full" style={{ height: "auto" }} />
    </div>
  )
}
