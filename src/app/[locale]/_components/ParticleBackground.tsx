"use client";

import { useEffect, useRef } from 'react';

export function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particlesArray: Particle[] = [];

    class Particle {
      x: number;
      y: number;
      directionX: number;
      directionY: number;
      size: number;
      color: string;

      constructor(x: number, y: number, dX: number, dY: number, size: number, color: string) {
        this.x = x;
        this.y = y;
        this.directionX = dX;
        this.directionY = dY;
        this.size = size;
        this.color = color;
      }

      draw(context: CanvasRenderingContext2D) {
        context.beginPath();
        context.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
        context.fillStyle = '#1a1a1a';
        context.fill();
      }

      update(canvasEl: HTMLCanvasElement, context: CanvasRenderingContext2D) {
        if (this.x > canvasEl.width || this.x < 0) this.directionX = -this.directionX;
        if (this.y > canvasEl.height || this.y < 0) this.directionY = -this.directionY;
        this.x += this.directionX;
        this.y += this.directionY;
        this.draw(context);
      }
    }

    const init = (canvasEl: HTMLCanvasElement) => {
      particlesArray = [];
      const numberOfParticles = (canvasEl.height * canvasEl.width) / 9000;
      for (let i = 0; i < numberOfParticles * 0.5; i++) {
        const size = (Math.random() * 2) + 1;
        const x = Math.random() * (canvasEl.width - size * 2) + size * 2;
        const y = Math.random() * (canvasEl.height - size * 2) + size * 2;
        const dX = (Math.random() * 0.4) - 0.2;
        const dY = (Math.random() * 0.4) - 0.2;
        particlesArray.push(new Particle(x, y, dX, dY, size, '#1a1a1a'));
      }
    };

    const connect = (canvasEl: HTMLCanvasElement, context: CanvasRenderingContext2D) => {
      for (let a = 0; a < particlesArray.length; a++) {
        for (let b = a; b < particlesArray.length; b++) {
          const distance = ((particlesArray[a].x - particlesArray[b].x) ** 2) + ((particlesArray[a].y - particlesArray[b].y) ** 2);
          if (distance < (canvasEl.width / 8) * (canvasEl.height / 8)) {
            const opacityValue = 1 - (distance / 20000);
            context.strokeStyle = `rgba(102, 102, 102, ${opacityValue})`;
            context.lineWidth = 1;
            context.beginPath();
            context.moveTo(particlesArray[a].x, particlesArray[a].y);
            context.lineTo(particlesArray[b].x, particlesArray[b].y);
            context.stroke();
          }
        }
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesArray.forEach(p => p.update(canvas, ctx));
      connect(canvas, ctx);
      animationFrameId = requestAnimationFrame(animate);
    };

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      init(canvas);
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full z-0 opacity-25" />;
}
