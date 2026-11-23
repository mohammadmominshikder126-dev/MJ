import React from 'react';

export function MjLogoMark({ className = 'w-11 h-11' }: { className?: string }) {
  return (
    <div
      className={`${className} relative rounded-xl bg-gradient-to-br from-[#00c8ff] via-[#3b5bff] to-[#8f2cff] p-[1px] shadow-[0_0_24px_rgba(61,106,255,0.55)] shrink-0`}
      aria-hidden="true"
    >
      <div className="w-full h-full rounded-[11px] bg-gradient-to-br from-[#00b7ff]/90 via-[#384ef5]/95 to-[#7d24f2]/95 flex items-center justify-center">
        <svg viewBox="0 0 40 40" className="w-7 h-7" fill="none">
          <path
            d="M7 29V11.5L14.5 21.5L22 11.5V29"
            stroke="#FFFFFF"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M27.5 11.5V23.5C27.5 26.8 25.3 29 22.2 29C20.5 29 19.2 28.3 18.4 27.3"
            stroke="#E5F4FF"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M24.5 11.5H31.5" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

export function SkillIcon({ id }: { id: string }) {
  switch (id) {
    case 'html5':
      return (
        <svg viewBox="0 0 48 48" className="w-11 h-11 mx-auto drop-shadow-[0_6px_14px_rgba(227,79,38,0.35)]" aria-hidden="true">
          <path fill="#E34F26" d="M8 5h32l-2.9 32.8L24 41.5 10.9 37.8 8 5z" />
          <path fill="#EF652A" d="M24 7.7v31l10.6-3L37 7.7H24z" />
          <path
            fill="#FFFFFF"
            d="M24 18.2h-6.6l-.4-4.1H24v-4H12.7l1.1 12.1H24v-4zm0 10.5l-4.5-1.2-.3-3.3h-4l.5 6.4 8.3 2.3v-4.2z"
          />
          <path
            fill="#EBEBEB"
            d="M24 18.2v4h5.9l-.6 6.2-5.3 1.4v4.2l8.3-2.3 1.1-13.5H24zm0-8.1v4h10.8l.4-4H24z"
          />
        </svg>
      );
    case 'css3':
      return (
        <svg viewBox="0 0 48 48" className="w-11 h-11 mx-auto drop-shadow-[0_6px_14px_rgba(21,114,182,0.35)]" aria-hidden="true">
          <path fill="#1572B6" d="M8 5h32l-2.9 32.8L24 41.5 10.9 37.8 8 5z" />
          <path fill="#33A9DC" d="M24 7.7v31l10.6-3L37 7.7H24z" />
          <path
            fill="#FFFFFF"
            d="M24 18.2h-6.2l-.4-4.1H24v-4H13l1.1 12.1H24v-4zm0 10.6l-4.4-1.2-.3-3.2h-4l.5 6.3 8.2 2.3v-4.2z"
          />
          <path
            fill="#EBEBEB"
            d="M24 18.2v4h5.8l-.6 6.2-5.2 1.4v4.2l8.3-2.3 1.1-13.5H24zm0-8.1v4h10.8l.4-4H24z"
          />
        </svg>
      );
    case 'javascript':
      return (
        <svg viewBox="0 0 48 48" className="w-11 h-11 mx-auto drop-shadow-[0_6px_14px_rgba(247,223,30,0.3)]" aria-hidden="true">
          <rect x="6" y="6" width="36" height="36" rx="4" fill="#F7DF1E" />
          <path
            fill="#141414"
            d="M25.6 33.4c.7 1.2 1.7 2.1 3.4 2.1 1.4 0 2.3-.7 2.3-1.7 0-1.2-.9-1.6-2.5-2.3l-.9-.4c-2.5-1.1-4.1-2.4-4.1-5.2 0-2.6 2-4.6 5.1-4.6 2.2 0 3.8.8 4.9 2.8l-2.7 1.7c-.6-1.1-1.2-1.5-2.2-1.5-1 0-1.6.6-1.6 1.5 0 1 .6 1.4 2.1 2.1l.9.4c2.9 1.2 4.6 2.5 4.6 5.4 0 3.1-2.5 4.8-5.7 4.8-3.2 0-5.3-1.5-6.3-3.5l2.7-1.6zm-11.2.3c.5.9 1 1.7 2.2 1.7 1.1 0 1.8-.4 1.8-2.1V21.7h3.4v11.7c0 3.5-2.1 5.1-5.1 5.1-2.7 0-4.3-1.4-5.1-3.1l2.8-1.7z"
          />
        </svg>
      );
    case 'react':
      return (
        <svg viewBox="0 0 48 48" className="w-11 h-11 mx-auto drop-shadow-[0_6px_14px_rgba(56,189,248,0.35)]" aria-hidden="true">
          <circle cx="24" cy="24" r="3.6" fill="#38BDF8" />
          <g stroke="#38BDF8" strokeWidth="2.2" fill="none">
            <ellipse cx="24" cy="24" rx="17" ry="6.8" />
            <ellipse cx="24" cy="24" rx="17" ry="6.8" transform="rotate(60 24 24)" />
            <ellipse cx="24" cy="24" rx="17" ry="6.8" transform="rotate(120 24 24)" />
          </g>
        </svg>
      );
    case 'tailwind':
      return (
        <svg viewBox="0 0 48 48" className="w-11 h-11 mx-auto drop-shadow-[0_6px_14px_rgba(6,182,212,0.35)]" aria-hidden="true">
          <path
            fill="#22D3EE"
            d="M24 12c-5.3 0-8.7 2.7-10 8 2-2.7 4.3-3.7 7-3 1.5.4 2.6 1.5 3.8 2.7 2 2 4.3 4.3 9.2 4.3 5.3 0 8.7-2.7 10-8-2 2.7-4.3 3.7-7 3-1.5-.4-2.6-1.5-3.8-2.7-2-2-4.3-4.3-9.2-4.3zM14 24c-5.3 0-8.7 2.7-10 8 2-2.7 4.3-3.7 7-3 1.5.4 2.6 1.5 3.8 2.7 2 2 4.3 4.3 9.2 4.3 5.3 0 8.7-2.7 10-8-2 2.7-4.3 3.7-7 3-1.5-.4-2.6-1.5-3.8-2.7-2-2-4.3-4.3-9.2-4.3z"
          />
        </svg>
      );
    case 'firebase':
      return (
        <svg viewBox="0 0 48 48" className="w-11 h-11 mx-auto drop-shadow-[0_6px_14px_rgba(255,179,0,0.35)]" aria-hidden="true">
          <path fill="#FFA000" d="M12.5 34.8L17.4 8.2c.2-1 1.5-1.2 2-.3l4.6 8.5-11.5 18.4z" />
          <path fill="#F57C00" d="M24 16.4l4.8-4.7c.7-.7 1.9-.3 2.1.7l4.6 22.4L24 41.5l-11.5-6.7L24 16.4z" />
          <path fill="#FFCA28" d="M12.5 34.8L30.8 17c.6-.6 1.7-.3 1.9.6L35.5 34.8 24 41.5l-11.5-6.7z" />
        </svg>
      );
    case 'supabase':
      return (
        <svg viewBox="0 0 48 48" className="w-11 h-11 mx-auto drop-shadow-[0_6px_14px_rgba(62,207,142,0.35)]" aria-hidden="true">
          <path
            fill="#3ECF8E"
            d="M27.3 40.3c-1 1.3-3 .6-3-1V26.2h12.2c2.2 0 3.4 2.5 2 4.2L27.3 40.3z"
          />
          <path
            fill="#24B47E"
            d="M20.7 7.7c1-1.3 3-.6 3 1v13.1H11.5c-2.2 0-3.4-2.5-2-4.2L20.7 7.7z"
          />
        </svg>
      );
    default:
      return null;
  }
}

export function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="currentColor" aria-hidden="true">
      <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z" />
    </svg>
  );
}

export function YoutubeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="currentColor" aria-hidden="true">
      <path d="M21.58 7.19a2.75 2.75 0 0 0-1.94-1.95C17.93 4.75 12 4.75 12 4.75s-5.93 0-7.64.49A2.75 2.75 0 0 0 2.42 7.2 28.6 28.6 0 0 0 2 12a28.6 28.6 0 0 0 .42 4.81 2.75 2.75 0 0 0 1.94 1.95c1.71.49 7.64.49 7.64.49s5.93 0 7.64-.49a2.75 2.75 0 0 0 1.94-1.95A28.6 28.6 0 0 0 22 12a28.6 28.6 0 0 0-.42-4.81zM10 15.1V8.9l5.35 3.1L10 15.1z" />
    </svg>
  );
}

export function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.71.5.09.68-.22.68-.49 0-.24-.01-1.04-.01-1.89-2.78.62-3.37-1.21-3.37-1.21-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.55-1.13-4.55-5.05 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.27 2.75 1.05A9.38 9.38 0 0 1 12 6.84c.85 0 1.71.12 2.51.35 1.91-1.32 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.33 4.79-4.56 5.04.36.31.68.93.68 1.88 0 1.36-.01 2.45-.01 2.79 0 .27.18.59.69.49A10.22 10.22 0 0 0 22 12.23C22 6.58 17.52 2 12 2z" />
    </svg>
  );
}

export function LinkedinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-[17px] h-[17px]" fill="currentColor" aria-hidden="true">
      <path d="M6.94 5a2 2 0 1 1-4-.002 2 2 0 0 1 4 .002zM7 8.48H3V21h4V8.48zm6.32 0H9.34V21h3.94v-6.57c0-3.66 4.77-4 4.77 0V21H22v-7.93c0-6.17-7.06-5.94-8.72-2.91l.04-1.68z" />
    </svg>
  );
}

export function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-[17px] h-[17px]" fill="currentColor" aria-hidden="true">
      <path d="M21.94 4.66a1.1 1.1 0 0 0-1.15-.16L2.95 11.75a1.05 1.05 0 0 0 .08 1.98l4.47 1.46 1.72 5.36a.95.95 0 0 0 1.6.38l2.53-2.54 4.73 3.47a1.1 1.1 0 0 0 1.72-.67l2.55-15.4a1.1 1.1 0 0 0-.41-1.13zm-3.67 3.35-7.46 6.72-.57 3.06-1.18-3.68 9.21-6.1z" />
    </svg>
  );
}
