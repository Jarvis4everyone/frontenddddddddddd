import { useEffect, useRef, memo } from 'react';
import './AnimatedBackground.css';

const AnimatedBackground = memo(function AnimatedBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    let animationFrameId;
    let particles = [];
    let lastTime = 0;
    const targetFPS = 60;
    const frameInterval = 1000 / targetFPS;

    // Set canvas size with device pixel ratio for crisp rendering
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      
      // Recreate particles on resize with optimized count
      particles = [];
      const maxParticles = 80; // Cap at 80 particles for performance
      const calculatedParticles = Math.min(
        Math.floor((rect.width * rect.height) / 20000),
        maxParticles
      );
      
      for (let i = 0; i < calculatedParticles; i++) {
        particles.push(new Particle(rect.width, rect.height));
      }
    };
    
    resizeCanvas();
    const resizeHandler = () => {
      resizeCanvas();
    };
    window.addEventListener('resize', resizeHandler, { passive: true });

    // Particle class
    class Particle {
      constructor(width, height) {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 2 + 1;
        this.speedX = (Math.random() - 0.5) * 0.3;
        this.speedY = (Math.random() - 0.5) * 0.3;
        this.opacity = Math.random() * 0.5 + 0.2;
        this.width = width;
        this.height = height;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x > this.width) this.x = 0;
        if (this.x < 0) this.x = this.width;
        if (this.y > this.height) this.y = 0;
        if (this.y < 0) this.y = this.height;
      }

      draw() {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Optimized animation loop with frame throttling
    const animate = (currentTime) => {
      if (currentTime - lastTime >= frameInterval) {
        ctx.clearRect(0, 0, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));

        // Update and draw particles
        particles.forEach((particle) => {
          particle.update();
          particle.draw();
        });

        // Optimized connection drawing - limit checks per particle
        const connectionDistance = 120;
        const maxConnectionsPerParticle = 5; // Limit connections to improve performance
        
        for (let i = 0; i < particles.length; i++) {
          const particle = particles[i];
          let connectionCount = 0;
          
          for (let j = i + 1; j < particles.length && connectionCount < maxConnectionsPerParticle; j++) {
            const otherParticle = particles[j];
            const dx = particle.x - otherParticle.x;
            const dy = particle.y - otherParticle.y;
            const distanceSquared = dx * dx + dy * dy;
            
            // Use squared distance to avoid expensive sqrt calculation
            if (distanceSquared < connectionDistance * connectionDistance) {
              const distance = Math.sqrt(distanceSquared);
              const opacity = 0.1 * (1 - distance / connectionDistance);
              
              ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
              ctx.lineWidth = 0.5;
              ctx.beginPath();
              ctx.moveTo(particle.x, particle.y);
              ctx.lineTo(otherParticle.x, otherParticle.y);
              ctx.stroke();
              connectionCount++;
            }
          }
        }

        lastTime = currentTime;
      }
      
      animationFrameId = requestAnimationFrame(animate);
    };

    animate(0);

    return () => {
      window.removeEventListener('resize', resizeHandler);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      <div className="animated-bg-base" />
      <canvas ref={canvasRef} className="animated-bg-canvas" />
      <div className="animated-bg-overlay" />
      <div className="animated-bg-grid" />
      <div className="animated-bg-glow" />
    </>
  );
});

export default AnimatedBackground;

