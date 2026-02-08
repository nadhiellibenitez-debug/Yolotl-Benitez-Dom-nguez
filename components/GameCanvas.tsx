import React, { useEffect, useRef } from 'react';
import { RoadScriptInterpreter } from '../services/interpreter';
import { CANVAS_WIDTH, CANVAS_HEIGHT, UIElement, Entity } from '../types';

interface GameCanvasProps {
  code: string;
  isPlaying: boolean;
  resetKey: number;
  onError: (msg: string) => void;
}

export default function GameCanvas({ code, isPlaying, resetKey, onError }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const interpreterRef = useRef<RoadScriptInterpreter | null>(null);
  const requestRef = useRef<number>(0);
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const mouseRef = useRef({ x: 0, y: 0, isDown: false });
  
  // Media Cache
  const videoCache = useRef<Record<string, HTMLVideoElement>>({});
  const imageCache = useRef<Record<string, HTMLImageElement>>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => isPlaying && pressedKeysRef.current.add(e.code);
    const handleKeyUp = (e: KeyboardEvent) => pressedKeysRef.current.delete(e.code);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPlaying]);

  const handleMouseDown = (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      mouseRef.current = {
          x: (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width),
          y: (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height),
          isDown: true
      };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      mouseRef.current.x = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
      mouseRef.current.y = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
  };

  const handleMouseUp = () => { mouseRef.current.isDown = false; };

  useEffect(() => {
    interpreterRef.current = new RoadScriptInterpreter();
    // Clear cache on reset
    videoCache.current = {};
    Object.values(videoCache.current).forEach(v => v.pause());
    // We don't necessarily need to clear image cache as it's less resource intensive, but let's keep it clean
    imageCache.current = {};
  }, [resetKey]);

  useEffect(() => {
    if (!isPlaying) {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return;
    }

    if (!interpreterRef.current) interpreterRef.current = new RoadScriptInterpreter();
    const interpreter = interpreterRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const tick = () => {
      interpreter.setInputs(pressedKeysRef.current);
      
      // UI Interactions
      if (mouseRef.current.isDown) {
          Object.values(interpreter.gameState.ui).forEach((ui: UIElement) => {
              if (ui.type === 'slider' && !ui.hidden) {
                  const x = ui.position.x; const y = ui.position.y;
                  if (mouseRef.current.x >= x && mouseRef.current.x <= x + 200 &&
                      mouseRef.current.y >= y - 10 && mouseRef.current.y <= y + 30) {
                      const range = (ui.max || 100) - (ui.min || 0);
                      const percent = Math.max(0, Math.min(1, (mouseRef.current.x - x) / 200));
                      ui.value = (ui.min || 0) + (percent * range);
                  }
              }
          });
      }

      try {
        interpreter.execute(code);
      } catch (e: any) {
        onError(e.message || "Runtime Error");
        return; 
      }

      while (interpreter.gameState.audioQueue.length > 0) {
          const url = interpreter.gameState.audioQueue.shift();
          if (url) new Audio(url).play().catch(() => {});
      }

      if (interpreter.gameState.resetRequested) {
          interpreterRef.current = new RoadScriptInterpreter();
          return;
      }

      draw(ctx, interpreter);
      if (!interpreter.gameState.gameOver && !interpreter.gameState.stopped) {
        requestRef.current = requestAnimationFrame(tick);
      } else if (interpreter.gameState.stopped) {
          requestRef.current = requestAnimationFrame(tick);
      }
    };

    requestRef.current = requestAnimationFrame(tick);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [isPlaying, code, resetKey, onError]);

  // Static BG Draw
  useEffect(() => {
    if (!isPlaying && canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
            ctx.fillStyle = '#111'; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            ctx.strokeStyle = '#222'; ctx.lineWidth = 1;
            for(let i=0; i<CANVAS_WIDTH; i+=40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_HEIGHT); ctx.stroke(); }
            for(let i=0; i<CANVAS_HEIGHT; i+=40) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CANVAS_WIDTH, i); ctx.stroke(); }
        }
    }
  }, [isPlaying, resetKey]);

  const draw = (ctx: CanvasRenderingContext2D, interpreter: RoadScriptInterpreter) => {
    // BG
    ctx.fillStyle = '#18181b'; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const offset = interpreter.gameState.bgOffset;
    ctx.strokeStyle = '#3f3f46'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(100, 0); ctx.lineTo(100, CANVAS_HEIGHT); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(CANVAS_WIDTH - 100, 0); ctx.lineTo(CANVAS_WIDTH - 100, CANVAS_HEIGHT); ctx.stroke();
    for (let y = offset % 50; y < CANVAS_HEIGHT; y += 50) {
        ctx.beginPath(); ctx.moveTo(100, y); ctx.lineTo(CANVAS_WIDTH - 100, y); ctx.stroke();
    }

    // Entities
    interpreter.gameState.entities.forEach(ent => {
        if (ent.hidden) return;
        ctx.save();
        ctx.translate(ent.pos.x + ent.size.width / 2, ent.pos.y + ent.size.height / 2);
        if (ent.rotation) ctx.rotate((ent.rotation * Math.PI) / 180);

        if (ent.renderType === 'anim' && ent.renderContent) {
            const isVideo = ent.renderContent.match(/\.(mp4|webm|ogg)$/i);
            
            if (isVideo) {
                 // Video Handling
                if (!videoCache.current[ent.renderContent]) {
                    const vid = document.createElement('video');
                    vid.src = ent.renderContent;
                    vid.loop = true;
                    vid.muted = true;
                    vid.play().catch(() => {});
                    videoCache.current[ent.renderContent] = vid;
                }
                const vid = videoCache.current[ent.renderContent];
                try {
                    ctx.drawImage(vid, -ent.size.width/2, -ent.size.height/2, ent.size.width, ent.size.height);
                } catch (e) {
                    // Fallback
                    ctx.fillStyle = ent.color; ctx.fillRect(-ent.size.width/2, -ent.size.height/2, ent.size.width, ent.size.height);
                }
            } else {
                // GIF/Image Handling for Animation (Browser handles GIF animation in Image object)
                if (!imageCache.current[ent.renderContent]) {
                    const img = new Image();
                    img.src = ent.renderContent;
                    imageCache.current[ent.renderContent] = img;
                }
                const img = imageCache.current[ent.renderContent];
                ctx.drawImage(img, -ent.size.width/2, -ent.size.height/2, ent.size.width, ent.size.height);
            }

        } else if (ent.renderType === 'image' && ent.renderContent) {
            // Static Image
             if (!imageCache.current[ent.renderContent]) {
                const img = new Image();
                img.src = ent.renderContent;
                imageCache.current[ent.renderContent] = img;
             }
             const img = imageCache.current[ent.renderContent];
             ctx.drawImage(img, -ent.size.width/2, -ent.size.height/2, ent.size.width, ent.size.height);
        } else if (ent.renderType === 'text' || ent.renderType === 'emoji') {
            ctx.font = `${ent.size.height}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(ent.renderContent || '?', 0, 0);
        } else {
            ctx.fillStyle = ent.color; ctx.shadowColor = ent.color; ctx.shadowBlur = 15;
            ctx.fillRect(-ent.size.width/2, -ent.size.height/2, ent.size.width, ent.size.height);
        }
        ctx.restore();
    });

    // Particles (Notefyshics)
    interpreter.gameState.particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.font = `bold ${p.size}px Arial`;
        ctx.shadowColor = 'black'; ctx.shadowBlur = 4;
        ctx.fillText(p.text, p.pos.x, p.pos.y);
        ctx.restore();
    });

    // UI
    Object.values(interpreter.gameState.ui).forEach((el: UIElement) => {
        if (el.hidden) return;
        if (el.type === 'slider') {
            const x = el.position.x; const y = el.position.y;
            ctx.fillStyle = '#333'; ctx.fillRect(x, y, 200, 10);
            const range = (el.max || 100) - (el.min || 0);
            const percent = Math.max(0, Math.min(1, (Number(el.value) - (el.min || 0)) / range));
            ctx.fillStyle = el.color || '#a855f7'; ctx.fillRect(x, y, 200 * percent, 10);
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + 200 * percent, y + 5, 8, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#aaa'; ctx.font = '12px monospace'; ctx.fillText(`${el.tag}: ${Math.round(Number(el.value))}`, x + 210, y + 10);
        } else {
            ctx.font = 'bold 24px "JetBrains Mono", monospace'; ctx.fillStyle = el.color || '#fff';
            ctx.shadowColor = 'black'; ctx.shadowBlur = 4;
            ctx.fillText(String(el.value), el.position.x, el.position.y);
        }
    });

    // Overlay
    if (interpreter.gameState.overlay.active) {
        const o = interpreter.gameState.overlay;
        ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = 'white'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        
        if (o.type === 'text') {
            ctx.font = 'bold 48px Inter'; ctx.fillText(o.content, CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
        } else if (o.type === 'image') {
             if (!imageCache.current[o.content]) {
                const img = new Image(); img.src = o.content; imageCache.current[o.content] = img;
             }
             ctx.drawImage(imageCache.current[o.content], CANVAS_WIDTH/2 - 200, CANVAS_HEIGHT/2 - 150, 400, 300);
        }
    }
  };

  return (
    <canvas 
        ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT}
        className="w-full h-full object-contain bg-black cursor-crosshair"
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
    />
  );
}