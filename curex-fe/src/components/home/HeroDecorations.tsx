const floatStyle = (
  duration: number,
  delay: number,
  y: number,
  rotate?: number,
): React.CSSProperties => ({
  animation: `float ${duration}s ease-in-out infinite ${delay}s`,
  ['--float-y' as string]: `${y}px`,
  ...(rotate != null && { ['--float-rotate' as string]: `${rotate}deg` }),
})

export function HeroDecorations() {
  return (
    <>
      {/* Ambient glow orbs */}
      <div className="pointer-events-none absolute -right-32 -top-32 h-[28rem] w-[28rem] animate-[pulse_6s_ease-in-out_infinite] rounded-full bg-accent-sky/20 blur-[100px]" aria-hidden />
      <div className="pointer-events-none absolute -bottom-40 -left-32 h-[32rem] w-[32rem] animate-[pulse_8s_ease-in-out_infinite_1s] rounded-full bg-accent-mint/15 blur-[120px]" aria-hidden />
      <div className="pointer-events-none absolute right-1/4 top-1/3 h-72 w-72 animate-[pulse_7s_ease-in-out_infinite_2s] rounded-full bg-accent-peach/10 blur-[80px]" aria-hidden />

      {/* Geometric shapes */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-16 -top-16 h-64 w-64 rounded-full border-[3px] border-accent-sky/15 lg:-left-8 lg:-top-8 lg:h-80 lg:w-80" />
        <div className="absolute -bottom-12 -right-12 h-52 w-52 rounded-full border-[2.5px] border-accent-mint/15 lg:h-72 lg:w-72" />
        <div className="absolute right-[12%] top-[15%] h-3 w-3 rounded-full bg-accent-peach/40" />
        <div className="absolute right-[14%] top-[18%] h-2 w-2 rounded-full bg-accent-sky/30" />
        <div className="absolute bottom-[18%] left-[8%] h-2.5 w-2.5 rounded-full bg-accent-sky/25" />
        <div className="absolute bottom-[15%] left-[10%] h-2 w-2 rounded-full bg-accent-peach/30" />
        <div className="absolute left-[5%] top-[45%] h-10 w-10 rotate-45 rounded-md border-2 border-primary-light/10 lg:h-14 lg:w-14" />
        <div className="absolute right-[6%] top-[55%] h-8 w-8 rotate-45 rounded-sm border-2 border-accent-peach/15 lg:h-12 lg:w-12" />
        <div className="absolute left-0 top-[70%] h-px w-1/3 bg-gradient-to-r from-transparent via-primary/5 to-transparent" />
        <div className="absolute right-0 top-[30%] h-px w-1/4 bg-gradient-to-l from-transparent via-accent-sky/8 to-transparent" />
      </div>

      {/* Floating health icons */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <svg className="absolute left-[6%] top-[12%] h-9 w-9 text-error/20 lg:h-12 lg:w-12" style={floatStyle(5, 0, -12)} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>

        <svg className="absolute right-[5%] top-[28%] h-10 w-10 text-accent-sky/25 lg:h-14 lg:w-14" style={floatStyle(6, 0.5, -14, 8)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2v6a6 6 0 0 0 12 0V2" />
          <circle cx="18" cy="16" r="2" />
          <path d="M18 14v-2" />
          <path d="M12 8a6 6 0 0 1-6 6v1a5 5 0 0 0 5 5h1a2 2 0 0 0 2-2v-1" />
        </svg>

        <svg className="absolute bottom-[22%] left-[12%] h-8 w-8 text-accent-mint/30 lg:h-11 lg:w-11" style={floatStyle(7, 1, -10, -12)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.5 1.5l-8.485 8.485a6 6 0 0 0 8.485 8.485l8.485-8.485a6 6 0 0 0-8.485-8.485z" />
          <line x1="6.343" y1="14.343" x2="14.343" y2="6.343" />
        </svg>

        <svg className="absolute right-[15%] top-[8%] h-8 w-8 text-primary-light/15 lg:h-11 lg:w-11" style={floatStyle(5.5, 1.5, -11)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2l7 4v5c0 5.25-3.5 9.74-7 11-3.5-1.26-7-5.75-7-11V6l7-4z" />
          <line x1="12" y1="9" x2="12" y2="15" />
          <line x1="9" y1="12" x2="15" y2="12" />
        </svg>

        <svg className="absolute left-[3%] top-[60%] h-10 w-10 text-error/15 lg:h-14 lg:w-14" style={floatStyle(6.5, 2, -8)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="2 12 5.5 12 8 6 11 18 14 9 16.5 12 22 12" />
        </svg>

        <svg className="absolute bottom-[15%] right-[10%] h-8 w-8 text-accent-peach/25 lg:h-11 lg:w-11" style={floatStyle(5.8, 0.8, -13, 6)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
        </svg>

        <svg className="absolute bottom-[35%] left-[18%] h-7 w-7 text-accent-sky/20 lg:h-10 lg:w-10" style={floatStyle(7.5, 2.5, -9, 15)} viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7V2z" opacity="0.35" />
        </svg>

        <svg className="absolute left-[35%] top-[5%] h-8 w-8 text-primary-light/12 lg:h-10 lg:w-10" style={floatStyle(6, 3, -10, -8)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M2 2c6 0 6 4 12 4s6-4 12-4" />
          <path d="M2 10c6 0 6 4 12 4s6-4 12-4" />
          <path d="M2 18c6 0 6 4 12 4s6-4 12-4" />
          <line x1="7" y1="4" x2="7" y2="12" />
          <line x1="17" y1="12" x2="17" y2="20" />
        </svg>
      </div>
    </>
  )
}
