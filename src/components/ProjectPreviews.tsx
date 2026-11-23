import React, { useState } from 'react';
import { Globe } from 'lucide-react';

interface ProjectPreviewProps {
  type: 'portfolio' | 'ecommerce' | 'business' | 'custom';
  title?: string;
  thumbnailUrl?: string;
  liveUrl?: string;
  large?: boolean;
}

function isSafeImageSrc(src?: string): boolean {
  if (!src) return false;
  if (src.startsWith('/assets/')) return true;
  if (/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/.test(src)) return true;
  try {
    const parsed = new URL(src);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function ProjectBrowserPreview({
  type,
  title = 'Website Preview',
  thumbnailUrl,
  liveUrl,
  large = false,
}: ProjectPreviewProps) {
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [headphoneFailed, setHeadphoneFailed] = useState(false);
  const [buildingsFailed, setBuildingsFailed] = useState(false);
  const [customFailed, setCustomFailed] = useState(false);

  const safeCustomSrc = isSafeImageSrc(thumbnailUrl) ? thumbnailUrl : undefined;

  return (
    <div
      className={`w-full overflow-hidden rounded-xl border border-[#44549a]/70 bg-[#0b1335] shadow-[0_10px_28px_rgba(0,0,0,0.45)] ${
        large ? 'h-64 sm:h-72' : 'h-[178px]'
      }`}
    >
      {/* macOS Window Chrome */}
      <div className="flex items-center justify-between h-6 px-3 bg-gradient-to-r from-[#1a1847] via-[#172154] to-[#1a1847] border-b border-white/10 gap-2">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-[#ff5f56]" />
          <span className="w-2 h-2 rounded-full bg-[#ffbd2e]" />
          <span className="w-2 h-2 rounded-full bg-[#27c93f]" />
        </div>
        {liveUrl && (
          <span className="text-[9px] text-[#9fb2e8] truncate max-w-[180px]">{liveUrl}</span>
        )}
        <div className="flex items-center gap-1 opacity-40 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-white" />
          <span className="w-1.5 h-1.5 rounded-full bg-white" />
          <span className="w-1.5 h-1.5 rounded-full bg-white" />
        </div>
      </div>

      {/* Custom Uploaded Thumbnail */}
      {type === 'custom' && (
        <div className="relative h-[calc(100%-24px)] bg-gradient-to-br from-[#111c48] via-[#192866] to-[#0b1230] overflow-hidden">
          {safeCustomSrc && !customFailed ? (
            <img
              src={safeCustomSrc}
              alt={`${title} website screenshot`}
              referrerPolicy="no-referrer"
              onError={() => setCustomFailed(true)}
              className="w-full h-full object-cover object-top"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00c8ff]/25 to-[#8f2cff]/30 border border-[#5668c4]/50 grid place-items-center text-[#7cd4ff] mb-2">
                <Globe className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-white truncate max-w-full">{title}</div>
              <div className="text-[10px] text-[#9eb2e6] mt-0.5">Live Web Project</div>
            </div>
          )}
        </div>
      )}

      {/* Portfolio Built-in Preview */}
      {type === 'portfolio' && (
        <div className="relative h-[calc(100%-24px)] bg-[radial-gradient(circle_at_75%_35%,#2232a8_0%,#090f32_65%,#05091d_100%)] p-3 flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between text-[8px] text-white/80 z-10">
            <div className="flex items-center gap-1.5 font-bold text-white">
              <span className="w-3.5 h-3.5 rounded bg-gradient-to-br from-[#00c8ff] to-[#8f2cff] grid place-items-center text-[6px]">
                MJ
              </span>
              <span>MJ LAB</span>
            </div>
            <div className="flex items-center gap-2 text-[7px] text-slate-300">
              <span className="px-1.5 py-0.5 rounded bg-[#4f2ee8]/70 text-white">Home</span>
              <span>Portfolio</span>
              <span>Skills</span>
              <span className="px-1.5 py-0.5 rounded bg-[#9333ea] text-white">Hire Me</span>
            </div>
          </div>

          <div className="grid grid-cols-[1.15fr_0.85fr] items-center gap-2 my-auto z-10">
            <div>
              <div className="text-[11px] sm:text-xs font-extrabold leading-tight text-white">
                MJ LAB
              </div>
              <div className="text-[10px] sm:text-[11px] font-bold bg-gradient-to-r from-[#00d2ff] to-[#b845ff] bg-clip-text text-transparent leading-tight">
                Modern Web Dev
              </div>
              <p className="mt-1 text-[7px] leading-relaxed text-slate-300 max-w-[140px]">
                Fast, responsive personal brand website crafted with React &amp; Tailwind.
              </p>
              <span className="inline-block mt-2 px-2.5 py-1 rounded-full bg-gradient-to-r from-[#a844ff] to-[#5e38ff] text-[7px] font-semibold text-white">
                Explore Work
              </span>
            </div>

            <div className="relative h-24 sm:h-28 flex items-end justify-end overflow-hidden rounded-lg">
              {!heroImgFailed ? (
                <img
                  src="/assets/crops/hero_art.png"
                  alt="MJ LAB Portfolio preview visual"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgFailed(true)}
                  className="w-full h-full object-cover object-top rounded-lg"
                />
              ) : (
                <div className="w-full h-full rounded-lg bg-gradient-to-br from-[#1d4ed8] to-[#7c3aed]" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* E-Commerce Built-in Preview */}
      {type === 'ecommerce' && (
        <div className="relative h-[calc(100%-24px)] bg-gradient-to-br from-[#f8fbff] via-[#edf4ff] to-[#dbe9ff] text-[#0f1c42] p-3 flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between text-[7px] font-semibold text-[#1e3163]">
            <span className="font-extrabold text-[#1658e8]">ShopWave</span>
            <div className="flex items-center gap-2 text-[#4c5f8c]">
              <span>Audio</span>
              <span>Gear</span>
              <span>Deals</span>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-[#1658e8] text-white text-[6px]">Cart (2)</span>
          </div>

          <div className="grid grid-cols-[1.05fr_0.95fr] items-center gap-2 my-auto">
            <div>
              <div className="text-[11px] sm:text-xs font-extrabold leading-tight text-[#0d1a3e]">
                Premium
                <br />
                Headphone
              </div>
              <p className="mt-1 text-[7px] text-[#51638f] leading-snug">
                Studio wireless sound with active noise cancellation.
              </p>
              <span className="inline-block mt-2 px-2.5 py-1 rounded bg-[#1658e8] text-[7px] font-semibold text-white shadow-sm">
                Shop Now
              </span>
            </div>

            <div className="h-24 sm:h-28 rounded-lg overflow-hidden bg-[#e7f0ff] flex items-center justify-center">
              {!headphoneFailed ? (
                <img
                  src="/assets/crops/headphone.png"
                  alt="Premium wireless headphone product showcase"
                  referrerPolicy="no-referrer"
                  onError={() => setHeadphoneFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#dbeafe] to-[#bfdbfe]" />
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-[#c9daf8]/80 text-[6px] text-[#3a4f7d]">
            <div className="rounded bg-white/80 px-1.5 py-0.5 truncate">Studio Pro · $249</div>
            <div className="rounded bg-white/80 px-1.5 py-0.5 truncate">AirLite · $129</div>
            <div className="rounded bg-white/80 px-1.5 py-0.5 truncate">Bass Max · $189</div>
          </div>
        </div>
      )}

      {/* Business Built-in Preview */}
      {type === 'business' && (
        <div className="relative h-[calc(100%-24px)] bg-gradient-to-br from-[#f8fbff] via-[#eef5ff] to-[#dceaff] text-[#0f1c42] flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 bg-[#0f4fd1] text-white text-[7px]">
            <span className="font-bold">ApexCorp</span>
            <div className="flex items-center gap-2 text-blue-100">
              <span>Solutions</span>
              <span>Pricing</span>
              <span>Contact</span>
            </div>
          </div>

          <div className="grid grid-cols-[1.05fr_0.95fr] items-center gap-2 p-3 my-auto">
            <div>
              <div className="text-[11px] sm:text-xs font-extrabold leading-tight text-[#0d1a3e]">
                Grow Your
                <br />
                Business
              </div>
              <p className="mt-1 text-[7px] text-[#51638f] leading-snug">
                Strategic web platforms and digital services for modern teams.
              </p>
              <span className="inline-block mt-2 px-2.5 py-1 rounded bg-[#1658e8] text-[7px] font-semibold text-white">
                Get Started
              </span>
            </div>

            <div className="h-24 sm:h-28 rounded-lg overflow-hidden bg-[#dbeafe]">
              {!buildingsFailed ? (
                <img
                  src="/assets/crops/buildings.png"
                  alt="Modern corporate architecture showcase"
                  referrerPolicy="no-referrer"
                  onError={() => setBuildingsFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#93c5fd] to-[#2563eb]" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
