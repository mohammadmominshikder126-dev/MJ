import React, { useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Code2,
  Sparkles,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';
import {
  buildWhatsAppUrl,
  isSafeHttpUrl,
  ProjectItem,
  SiteConfig,
} from '../lib/portfolioData';
import { ProjectBrowserPreview } from './ProjectPreviews';

interface ProjectModalProps {
  project: ProjectItem | null;
  siteConfig: SiteConfig;
  onClose: () => void;
}

export function ProjectModal({ project, siteConfig, onClose }: ProjectModalProps) {
  useEffect(() => {
    if (!project) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [project, onClose]);

  if (!project) return null;

  const whatsappHref = buildWhatsAppUrl(
    siteConfig.whatsappNumber,
    `${siteConfig.whatsappGreeting} I saw your "${project.title}" project and would like to discuss building a similar website.`
  );

  const validLiveUrl = isSafeHttpUrl(project.liveUrl) ? project.liveUrl : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-[#324685] bg-gradient-to-b from-[#11193d] to-[#080d24] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.7)] max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="text-xs text-[#9cb0e4] mb-1">
              {project.categoryLabel} <span aria-hidden="true">·</span> {project.year}
            </div>
            <h3 id="project-modal-title" className="text-xl font-bold text-white">
              {project.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close project details"
            className="w-9 h-9 rounded-xl border border-[#2d3e76] bg-[#0e1636] text-[#c7d3f5] hover:text-white hover:border-[#7c4dff] grid place-items-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <ProjectBrowserPreview
          type={project.previewType}
          title={project.title}
          thumbnailUrl={project.thumbnailUrl}
          liveUrl={validLiveUrl}
          large
        />

        <p className="mt-5 text-sm leading-relaxed text-[#c6d1ee]">{project.longDescription}</p>

        <div className="mt-4 grid sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-[#243467] bg-[#0a102a]/80 p-4">
            <h4 className="text-xs font-semibold text-white mb-2.5 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#a855f7]" />
              Website Features
            </h4>
            <ul className="space-y-2 text-xs text-[#b9c6e8]">
              {project.highlights.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#22d3ee] shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-[#243467] bg-[#0a102a]/80 p-4">
            <h4 className="text-xs font-semibold text-white mb-2.5 flex items-center gap-2">
              <Code2 className="w-3.5 h-3.5 text-[#38bdf8]" />
              Technology Stack
            </h4>
            <div className="text-xs text-[#b9c6e8] leading-relaxed">
              {project.techStack.join(' · ')}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-[#34467d] bg-[#0c1434] text-xs font-semibold text-[#d8e1fb] hover:border-[#7c4dff] transition-colors cursor-pointer whitespace-nowrap"
          >
            Close
          </button>

          {validLiveUrl && (
            <a
              href={validLiveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#3c59a8] bg-[#121e4d] text-xs font-semibold text-white hover:border-[#38bdf8] transition-colors whitespace-nowrap"
            >
              <span>Visit Live Site</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#16a34a] to-[#059669] text-xs font-semibold text-white shadow-[0_6px_22px_rgba(16,185,129,0.35)] hover:brightness-110 transition-all whitespace-nowrap"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Contact Me on WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
}

interface InfoModalProps {
  mode: 'about' | 'privacy' | 'terms' | null;
  siteConfig: SiteConfig;
  onClose: () => void;
}

export function InfoModal({ mode, siteConfig, onClose }: InfoModalProps) {
  useEffect(() => {
    if (!mode) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [mode, onClose]);

  if (!mode) return null;

  const content = {
    about: {
      title: siteConfig.aboutTitle,
      body: siteConfig.aboutDescription,
      bullets: [
        'Custom responsive websites & personal brand portfolios',
        'High-converting e-commerce storefronts and product catalogs',
        'Modern web apps powered by React, Tailwind CSS, Firebase & Supabase',
      ],
    },
    privacy: {
      title: 'Privacy Policy',
      body: siteConfig.privacyPolicyText,
      bullets: [
        'Direct communication via WhatsApp and Telegram',
        'No invasive tracking cookies or third-party ad scripts',
      ],
    },
    terms: {
      title: 'Terms & Conditions',
      body: siteConfig.termsText,
      bullets: [
        'Custom project scopes are confirmed prior to development',
        'Responsive cross-browser testing included on all web builds',
      ],
    },
  }[mode];

  const whatsappHref = buildWhatsAppUrl(
    siteConfig.whatsappNumber,
    `${siteConfig.whatsappGreeting} I read your profile and would like to work together on a web project.`
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="info-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-[#324685] bg-gradient-to-b from-[#11193d] to-[#080d24] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.7)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 mb-4">
          <h3 id="info-modal-title" className="text-lg font-bold text-white">
            {content.title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-9 h-9 rounded-xl border border-[#2d3e76] bg-[#0e1636] text-[#c7d3f5] hover:text-white hover:border-[#7c4dff] grid place-items-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm leading-relaxed text-[#c6d1ee]">{content.body}</p>

        <ul className="mt-4 space-y-2 text-xs text-[#b9c6e8]">
          {content.bullets.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#a855f7] shrink-0 mt-0.5" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#34467d] bg-[#0c1434] text-xs font-semibold text-[#d8e1fb] hover:border-[#7c4dff] transition-colors cursor-pointer"
          >
            Close
          </button>
          {mode === 'about' && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#16a34a] to-[#059669] text-xs font-semibold text-white hover:brightness-110 transition-all"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Contact Me on WhatsApp</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
