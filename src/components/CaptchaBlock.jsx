import React, { useState, useEffect, useRef } from 'react';
import { RotateCw, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

export default function CaptchaBlock({ onValidate, value, onChange, isInvalid }) {
  const [captchaCode, setCaptchaCode] = useState('');
  const canvasRef = useRef(null);

  const generateCaptcha = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaCode(code);
    if (onValidate) {
      onValidate(code);
    }
    drawCaptcha(code);
  };

  const drawCaptcha = (text) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas dimensions
    const width = canvas.width;
    const height = canvas.height;

    // Background gradient
    const bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, '#0c1322');
    bgGradient.addColorStop(0.5, '#162036');
    bgGradient.addColorStop(1, '#080d1a');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Add noise dots
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(${Math.floor(Math.random() * 200 + 55)}, ${Math.floor(Math.random() * 200 + 55)}, 255, 0.25)`;
      ctx.beginPath();
      ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Add random distorted lines
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(212, 175, 55, 0.4)' : 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(Math.random() * width, Math.random() * height);
      ctx.bezierCurveTo(
        Math.random() * width, Math.random() * height,
        Math.random() * width, Math.random() * height,
        Math.random() * width, Math.random() * height
      );
      ctx.stroke();
    }

    // Draw characters with distinct rotations and colors
    const charList = text.split('');
    const charSpacing = width / (charList.length + 1);

    charList.forEach((char, index) => {
      ctx.save();
      const x = charSpacing * (index + 0.85);
      const y = height / 2 + Math.random() * 6 - 3;
      const angle = (Math.random() - 0.5) * 0.45; // slight tilt

      ctx.translate(x, y);
      ctx.rotate(angle);

      // Color palette for characters (Gold / Cyan / White)
      const colors = ['#f59e0b', '#38bdf8', '#fbbf24', '#e2e8f0', '#34d399'];
      ctx.fillStyle = colors[index % colors.length];
      ctx.font = 'bold 22px monospace, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';

      // Subtle shadow
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.shadowBlur = 4;

      ctx.fillText(char, 0, 0);
      ctx.restore();
    });
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  return (
    <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-amber-400" /> Security Verification (CAPTCHA) *
        </label>
        <button
          type="button"
          onClick={generateCaptcha}
          className="text-[10px] text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 transition-colors px-2 py-0.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20"
          title="Generate New CAPTCHA"
        >
          <RotateCw size={11} /> Refresh Code
        </button>
      </div>

      <div className="flex items-center gap-3">
        {/* Distorted Canvas Image */}
        <div className="relative rounded-xl overflow-hidden border border-amber-400/40 shadow-inner bg-[#0c1322] shrink-0">
          <canvas
            ref={canvasRef}
            width={140}
            height={42}
            className="block cursor-pointer select-none"
            onClick={generateCaptcha}
            title="Click to refresh CAPTCHA code"
          />
        </div>

        {/* Input box for CAPTCHA code */}
        <div className="flex-1 min-w-0">
          <input
            type="text"
            required
            maxLength={6}
            value={value}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            placeholder="Type code here"
            className={`w-full px-3 py-2.5 bg-[#070a12] border rounded-xl text-white font-mono text-xs font-bold uppercase tracking-widest outline-none transition-all placeholder:normal-case placeholder:font-normal placeholder:text-gray-500 ${
              isInvalid
                ? 'border-rose-500 focus:border-rose-400'
                : 'border-white/15 focus:border-amber-400 focus:ring-1 focus:ring-amber-400'
            }`}
          />
        </div>
      </div>
      <p className="text-[10px] text-slate-400">
        Enter the 5 characters shown above to prove you are human.
      </p>
    </div>
  );
}
