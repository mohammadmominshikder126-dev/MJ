export type ProjectCategory = 'all' | 'business' | 'ecommerce' | 'web-apps';

export interface ProjectItem {
  id: string;
  title: string;
  category: Exclude<ProjectCategory, 'all'>;
  categoryLabel: 'Business' | 'E-Commerce' | 'Web Apps';
  description: string;
  longDescription: string;
  year: string;
  techStack: string[];
  highlights: string[];
  previewType: 'portfolio' | 'ecommerce' | 'business' | 'custom';
  liveUrl: string;
  thumbnailUrl: string;
  isDefault?: boolean;
}

export interface SkillItem {
  id: string;
  name: string;
  role: string;
  iconKey: string;
  order: number;
  isDefault?: boolean;
}

export interface SiteConfig {
  brandName: string;
  brandSubtitle: string;
  logoUrl: string;
  hireButtonText: string;
  availabilityText: string;
  bannerGreeting: string;
  bannerHighlight: string;
  bannerSubtitle: string;
  bannerDescription: string;
  bannerImageUrl: string;
  portfolioCtaText: string;
  contactCtaText: string;
  skillsHeading: string;
  portfolioHeading: string;
  portfolioSubheading: string;
  aboutTitle: string;
  aboutDescription: string;
  aboutImageUrl: string;
  quickCard1Title: string;
  quickCard1Subtitle: string;
  quickCard2Title: string;
  quickCard2Subtitle: string;
  quickCard3Title: string;
  quickCard3Subtitle: string;
  whatsappNumber: string;
  whatsappGreeting: string;
  telegramGroupUrl: string;
  facebookUrl: string;
  youtubeUrl: string;
  githubUrl: string;
  linkedinUrl: string;
  footerRightsText: string;
  footerCreditText: string;
  privacyPolicyText: string;
  termsText: string;
}

export const NAV_ITEMS = [
  { id: 'home', label: 'Home' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'skills', label: 'Skills' },
  { id: 'about', label: 'About' },
  { id: 'contact', label: 'Contact' },
] as const;

export const FILTER_TABS: { id: ProjectCategory; label: string }[] = [
  { id: 'all', label: 'All Projects' },
  { id: 'business', label: 'Business' },
  { id: 'ecommerce', label: 'E-Commerce' },
  { id: 'web-apps', label: 'Web Apps' },
];

export const SKILL_ICON_OPTIONS = [
  { key: 'html5', label: 'HTML5' },
  { key: 'css3', label: 'CSS3' },
  { key: 'javascript', label: 'JavaScript' },
  { key: 'react', label: 'React' },
  { key: 'tailwind', label: 'Tailwind CSS' },
  { key: 'firebase', label: 'Firebase' },
  { key: 'supabase', label: 'Supabase' },
  { key: 'typescript', label: 'TypeScript' },
  { key: 'nextjs', label: 'Next.js' },
  { key: 'nodejs', label: 'Node.js' },
  { key: 'wordpress', label: 'WordPress' },
  { key: 'figma', label: 'Figma / UI' },
  { key: 'custom', label: 'General Code' },
];

export const DEFAULT_SKILLS: SkillItem[] = [
  { id: 'html5', name: 'HTML5', role: 'Semantic Markup', iconKey: 'html5', order: 1, isDefault: true },
  { id: 'css3', name: 'CSS3', role: 'Modern Layouts', iconKey: 'css3', order: 2, isDefault: true },
  { id: 'javascript', name: 'JavaScript', role: 'Interactive Logic', iconKey: 'javascript', order: 3, isDefault: true },
  { id: 'react', name: 'React', role: 'Component UI', iconKey: 'react', order: 4, isDefault: true },
  { id: 'tailwind', name: 'Tailwind CSS', role: 'Design Systems', iconKey: 'tailwind', order: 5, isDefault: true },
  { id: 'firebase', name: 'Firebase', role: 'Auth & Realtime', iconKey: 'firebase', order: 6, isDefault: true },
  { id: 'supabase', name: 'Supabase', role: 'Postgres & API', iconKey: 'supabase', order: 7, isDefault: true },
];

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  brandName: 'MJ LAB',
  brandSubtitle: 'Web Developer',
  logoUrl: '',
  hireButtonText: 'Hire Me',
  availabilityText: 'Available for Freelance',
  bannerGreeting: "Hi, I'm",
  bannerHighlight: 'MJ LAB',
  bannerSubtitle: 'A Passionate Web Developer',
  bannerDescription:
    'I create modern, fast and responsive websites that help grow your business online.',
  bannerImageUrl: '/assets/crops/hero_art.png',
  portfolioCtaText: 'View My Portfolio',
  contactCtaText: 'Contact Me',
  skillsHeading: 'My Skills',
  portfolioHeading: 'My Portfolio',
  portfolioSubheading: 'Some of my recent projects',
  aboutTitle: 'About Me',
  aboutDescription:
    "I'm MJ LAB, a dedicated Web Developer with a passion for creating innovative and user-friendly web solutions. I always try to learn new technologies and deliver the best quality work.",
  aboutImageUrl: '/assets/crops/about_laptop.png',
  quickCard1Title: 'My Skill',
  quickCard1Subtitle: 'HTML5, CSS3, JavaScript, React & Tailwind CSS solutions',
  quickCard2Title: 'E-Commerce Website',
  quickCard2Subtitle: 'Online store, product catalog, cart & secure checkout',
  quickCard3Title: 'Business Website',
  quickCard3Subtitle: 'Professional company, agency & service websites',
  whatsappNumber: '8801700000000',
  whatsappGreeting: 'Hi MJ LAB,',
  telegramGroupUrl: 'https://t.me',
  facebookUrl: 'https://facebook.com',
  youtubeUrl: 'https://youtube.com',
  githubUrl: 'https://github.com',
  linkedinUrl: 'https://linkedin.com',
  footerRightsText: 'All Rights Reserved.',
  footerCreditText: 'Made with ♥ by MJ LAB',
  privacyPolicyText:
    'Visitor interactions and WhatsApp/Telegram inquiries go directly to your chosen messaging app. No personal visitor contact forms are stored on third-party ad networks.',
  termsText:
    'All portfolio designs, case study previews, and code samples showcased on this site belong to MJ LAB. Project timelines, milestones, and deliverables for freelance work are agreed upon in writing before kickoff.',
};

export const DEFAULT_PROJECTS: ProjectItem[] = [
  {
    id: 'mj-lab-portfolio',
    title: 'MJ LAB Portfolio',
    category: 'web-apps',
    categoryLabel: 'Web Apps',
    description: 'A modern portfolio website for personal branding.',
    longDescription:
      'A high-contrast personal developer showcase engineered for speed, responsive clarity, and interactive project exploration across desktop and mobile viewports.',
    year: '2026',
    techStack: ['React', 'TypeScript', 'Tailwind CSS', 'Firebase'],
    highlights: [
      'Scroll-synchronized navigation with mobile drawer menu',
      'Real-time Firebase Admin Panel & instant portfolio updates',
      'Direct WhatsApp contact workflow & Telegram group integration',
    ],
    previewType: 'portfolio',
    liveUrl: '',
    thumbnailUrl: '',
    isDefault: true,
  },
  {
    id: 'ecommerce-store',
    title: 'E-Commerce Store',
    category: 'ecommerce',
    categoryLabel: 'E-Commerce',
    description: 'Online shopping platform with secure payment.',
    longDescription:
      'A sleek consumer electronics storefront crafted around conversion-focused product merchandising, fast search filtering, and streamlined checkout flows.',
    year: '2026',
    techStack: ['React', 'Tailwind CSS', 'Supabase', 'Stripe Flow'],
    highlights: [
      'Hero product spotlight with variant and quick-add controls',
      'Persistent cart state and order summary calculations',
      'Mobile-first catalog grid tuned for rapid browsing',
    ],
    previewType: 'ecommerce',
    liveUrl: '',
    thumbnailUrl: '',
    isDefault: true,
  },
  {
    id: 'business-website',
    title: 'Business Website',
    category: 'business',
    categoryLabel: 'Business',
    description: 'A business website for company and services.',
    longDescription:
      'A corporate presence and lead-generation platform built to communicate service credibility, enterprise offerings, and frictionless client inquiry capture.',
    year: '2026',
    techStack: ['HTML5', 'CSS3', 'JavaScript', 'Firebase'],
    highlights: [
      'Clean above-the-fold value proposition and consultation CTA',
      'Structured service breakdown with responsive grid pacing',
      'Direct WhatsApp consultation and instant inquiry routing',
    ],
    previewType: 'business',
    liveUrl: '',
    thumbnailUrl: '',
    isDefault: true,
  },
];

export function buildWhatsAppUrl(whatsappNumber: string, text: string): string {
  const digits = whatsappNumber.replace(/\D/g, '') || DEFAULT_SITE_CONFIG.whatsappNumber;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function isSafeHttpUrl(urlStr?: string): boolean {
  if (!urlStr) return false;
  try {
    const parsed = new URL(urlStr);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isSafeImageSrc(src?: string): boolean {
  if (!src) return false;
  if (src.startsWith('/assets/')) return true;
  if (/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/.test(src)) {
    return src.length <= 350_000;
  }
  return isSafeHttpUrl(src);
}

export function categoryLabelFromId(
  category: Exclude<ProjectCategory, 'all'>
): 'Business' | 'E-Commerce' | 'Web Apps' {
  switch (category) {
    case 'business':
      return 'Business';
    case 'ecommerce':
      return 'E-Commerce';
    case 'web-apps':
      return 'Web Apps';
  }
}
