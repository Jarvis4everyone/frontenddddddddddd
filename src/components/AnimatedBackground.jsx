import { useEffect, useRef, memo } from 'react';
import './AnimatedBackground.css';

const AnimatedBackground = memo(function AnimatedBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];

    // Set canvas size with debouncing for performance
    let resizeTimeout;
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      // Recreate particles on resize
      particles = [];
      const isMobile = window.innerWidth <= 768;
      const baseArea = isMobile ? 15000 : 25000;
      const maxParticles = isMobile ? 80 : 60;
      const particleCount = Math.min(Math.floor((canvas.width * canvas.height) / baseArea), maxParticles);
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    };
    resizeCanvas();
    
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(resizeCanvas, 250); // Debounce resize
    };
    window.addEventListener('resize', handleResize, { passive: true });

    // Particle class
    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 1;
        this.speedX = (Math.random() - 0.5) * 0.5;
        this.speedY = (Math.random() - 0.5) * 0.5;
        this.opacity = Math.random() * 0.5 + 0.2;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x > canvas.width) this.x = 0;
        if (this.x < 0) this.x = canvas.width;
        if (this.y > canvas.height) this.y = 0;
        if (this.y < 0) this.y = canvas.height;
      }

      draw() {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Create particles - optimized for performance
    // Reduce particle count on larger screens to maintain 60fps
    const isMobile = window.innerWidth <= 768;
    const baseArea = isMobile ? 15000 : 25000; // Less particles on desktop
    const maxParticles = isMobile ? 80 : 60; // Cap maximum particles
    const particleCount = Math.min(Math.floor((canvas.width * canvas.height) / baseArea), maxParticles);
    
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    // Optimized animation loop with reduced connection checks
    let frameCount = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frameCount++;

      // Update and draw particles
      particles.forEach((particle) => {
        particle.update();
        particle.draw();
      });

      // Only draw connections every other frame on desktop for better performance
      const shouldDrawConnections = isMobile || frameCount % 2 === 0;
      
      if (shouldDrawConnections) {
        // Optimized connection drawing - use distance squared to avoid sqrt when possible
        const connectionDistance = 120;
        const connectionDistanceSq = connectionDistance * connectionDistance;
        
        for (let i = 0; i < particles.length; i++) {
          const particle = particles[i];
          // Only check nearby particles (skip every other particle on desktop)
          const step = isMobile ? 1 : 2;
          
          for (let j = i + step; j < particles.length; j += step) {
            const otherParticle = particles[j];
            const dx = particle.x - otherParticle.x;
            const dy = particle.y - otherParticle.y;
            const distanceSq = dx * dx + dy * dy;

            if (distanceSq < connectionDistanceSq) {
              const distance = Math.sqrt(distanceSq);
              const opacity = 0.1 * (1 - distance / connectionDistance);
              ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
              ctx.lineWidth = 0.5;
              ctx.beginPath();
              ctx.moveTo(particle.x, particle.y);
              ctx.lineTo(otherParticle.x, otherParticle.y);
              ctx.stroke();
            }
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
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

