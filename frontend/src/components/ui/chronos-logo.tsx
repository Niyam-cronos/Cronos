'use client';

import React from 'react';

interface ChronosLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export function ChronosLogo({ size = 'md', showText = true, className = '' }: ChronosLogoProps) {
  const sizeMap = {
    sm: { box: 'h-8 w-8 rounded-lg', text: 'text-lg' },
    md: { box: 'h-11 w-11 rounded-2xl', text: 'text-xl' },
    lg: { box: 'h-14 w-14 rounded-2xl', text: 'text-2xl' },
    xl: { box: 'h-18 w-18 rounded-3xl', text: 'text-3xl' },
  };

  const s = sizeMap[size];

  return (
    <div className={`flex items-center gap-3.5 ${className}`}>
      {/* Sleek Modern Geometric Chronos Badge Logo */}
      <div className={`relative flex items-center justify-center bg-gradient-to-br from-[#4355FF] to-[#2E3DE0] text-white shadow-lg shadow-[#4355FF]/25 border border-white/20 shrink-0 ${s.box}`}>
        
        {/* Custom Vector Geometry: Stylized Chronos Time Arc */}
        <svg
          width="26"
          height="26"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Chronos Outer Precision Arc */}
          <path
            d="M16 4C9.37258 4 4 9.37258 4 16C4 22.6274 9.37258 28 16 28C21.306 28 25.8073 24.5574 27.3486 19.7895"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
          />

          {/* Inner Glowing Checkmark Indicator */}
          <path
            d="M11 16L14.5 19.5L25 9"
            stroke="#FFE600"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Center Time Dot Accent */}
          <circle cx="16" cy="16" r="1.5" fill="currentColor" opacity="0.8" />
        </svg>
      </div>

      {/* Brand Name & Tagline */}
      {showText && (
        <div className="flex flex-col">
          <span className={`font-black tracking-[0.18em] text-slate-900 leading-none ${s.text}`}>
            CHRONOS
          </span>
          <span className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#4355FF] mt-1">
            ATTENDANCE
          </span>
        </div>
      )}
    </div>
  );
}
