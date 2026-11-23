import React, { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import {
  ArrowRight,
  ArrowUp,
  Briefcase,
  Building2,
  Code2,
  Home,
  Mail,
  Menu,
  MessageCircle,
  Rocket,
  Send,
  Settings,
  ShieldCheck,
  ShoppingBag,
  User,
  X,
} from 'lucide-react';
import { AdminPanelModal } from './components/AdminPanelModal';
import {
  FacebookIcon,
  GithubIcon,
  LinkedinIcon,
  MjLogoMark,
  SkillIcon,
  TelegramIcon,
  YoutubeIcon,
} from './components/BrandAndSkillIcons';
import { InfoModal, ProjectModal } from './components/Modals';
import { ProjectBrowserPreview } from './components/ProjectPreviews';
import {
  buildWhatsAppUrl,
  DEFAULT_PROJECTS,
  DEFAULT_SITE_CONFIG,
  FILTER_TABS,
  isSafeHttpUrl,
  isSafeImageSrc,
  NAV_ITEMS,
  ProjectCategory,
  ProjectItem,
  SiteConfig,
  SKILLS,
} from './data/portfolioData';
import { ADMIN_EMAIL, auth, db, handleFirestoreError, OperationType } from './lib/firebase';

export default function App() {
  const [activeNav, setActiveNav] = useState<string>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ProjectCategory>('all');
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const [infoModal, setInfoModal] = useState<'about' | 'privacy' | 'terms' | null>(null);

  const [siteConfig, setSiteConfig] = useState<SiteConfig>(DEFAULT_SITE_CONFIG);
  const [firestoreProjects, setFirestoreProjects] = useState<ProjectItem[]>([]);
  const [hasFirestoreProjects, setHasFirestoreProjects] = useState<boolean>(false);

  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdminUser, setIsAdminUser] = useState<boolean>(false);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [adminOpen, setAdminOpen] = useState<boolean>(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [heroArtFailed, setHeroArtFailed] = useState(false);
  const [logoImgFailed, setLogoImgFailed] = useState(false);
  const [aboutLaptopFailed, setAboutLaptopFailed] = useState(false);

  const toastTimerRef = useRef<number | null>(null);
  const currentYear = new Date().getFullYear();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  // Firebase Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setIsAdminUser(false);
        setAuthReady(true);
        return;
      }
      if (nextUser.email === ADMIN_EMAIL && nextUser.emailVerified) {
        setIsAdminUser(true);
        setAuthReady(true);
        return;
      }
      try {
        const adminDoc = await getDoc(doc(db, 'admins', nextUser.uid));
        setIsAdminUser(adminDoc.exists() && nextUser.emailVerified);
      } catch {
        setIsAdminUser(false);
      } finally {
        setAuthReady(true);
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time Firestore listener: siteConfig/main
  useEffect(() => {
    const configRef = doc(db, 'siteConfig', 'main');
    const unsubscribe = onSnapshot(
      configRef,
      (snap) => {
        if (!snap.exists()) {
          setSiteConfig(DEFAULT_SITE_CONFIG);
          return;
        }
        const data = snap.data() as Partial<SiteConfig>;
        setLogoImgFailed(false);
        setHeroArtFailed(false);
        setSiteConfig({
          brandName: data.brandName || DEFAULT_SITE_CONFIG.brandName,
          brandSubtitle: data.brandSubtitle || DEFAULT_SITE_CONFIG.brandSubtitle,
          logoUrl: data.logoUrl || '',
          availabilityText: data.availabilityText || DEFAULT_SITE_CONFIG.availabilityText,
          bannerGreeting: data.bannerGreeting || DEFAULT_SITE_CONFIG.bannerGreeting,
          bannerHighlight: data.bannerHighlight || DEFAULT_SITE_CONFIG.bannerHighlight,
          bannerSubtitle: data.bannerSubtitle || DEFAULT_SITE_CONFIG.bannerSubtitle,
          bannerDescription: data.bannerDescription || DEFAULT_SITE_CONFIG.bannerDescription,
          bannerImageUrl: data.bannerImageUrl || DEFAULT_SITE_CONFIG.bannerImageUrl,
          whatsappNumber: data.whatsappNumber || DEFAULT_SITE_CONFIG.whatsappNumber,
          whatsappGreeting: data.whatsappGreeting || DEFAULT_SITE_CONFIG.whatsappGreeting,
          telegramGroupUrl: data.telegramGroupUrl ?? DEFAULT_SITE_CONFIG.telegramGroupUrl,
          facebookUrl: data.facebookUrl ?? DEFAULT_SITE_CONFIG.facebookUrl,
          youtubeUrl: data.youtubeUrl ?? DEFAULT_SITE_CONFIG.youtubeUrl,
          githubUrl: data.githubUrl ?? DEFAULT_SITE_CONFIG.githubUrl,
          linkedinUrl: data.linkedinUrl ?? DEFAULT_SITE_CONFIG.linkedinUrl,
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'siteConfig/main');
      }
    );
    return () => unsubscribe();
  }, []);

  // Real-time Firestore listener: projects collection
  useEffect(() => {
    const projectsQuery = query(
      collection(db, 'projects'),
      where('category', 'in', ['business', 'ecommerce', 'web-apps'])
    );
    const unsubscribe = onSnapshot(
      projectsQuery,
      (snapshot) => {
        if (snapshot.empty) {
          setFirestoreProjects([]);
          setHasFirestoreProjects(false);
          return;
        }
        const rows: (ProjectItem & { sortMs: number })[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data() as Record<string, unknown>;
          const created = d.createdAt as { toMillis?: () => number } | undefined;
          const sortMs = typeof created?.toMillis === 'function' ? created.toMillis() : 0;
          const cat =
            d.category === 'ecommerce' || d.category === 'web-apps' ? d.category : 'business';
          const catLabel =
            cat === 'ecommerce'
              ? 'E-Commerce'
              : cat === 'web-apps'
                ? 'Web Apps'
                : 'Business';
          const pType =
            d.previewType === 'portfolio' ||
            d.previewType === 'ecommerce' ||
            d.previewType === 'business' ||
            d.previewType === 'custom'
              ? d.previewType
              : 'custom';
          return {
            id: docSnap.id,
            title: String(d.title || 'Untitled Project'),
            category: cat,
            categoryLabel: catLabel,
            description: String(d.description || ''),
            longDescription: String(d.longDescription || d.description || ''),
            year: String(d.year || currentYear),
            techStack: Array.isArray(d.techStack) ? d.techStack.map(String) : ['React'],
            highlights: Array.isArray(d.highlights)
              ? d.highlights.map(String)
              : ['Responsive modern web build'],
            previewType: pType,
            liveUrl: typeof d.liveUrl === 'string' ? d.liveUrl : '',
            thumbnailUrl: typeof d.thumbnailUrl === 'string' ? d.thumbnailUrl : '',
            sortMs,
          };
        });
        rows.sort((a, b) => b.sortMs - a.sortMs);
        setFirestoreProjects(rows.map(({ sortMs: _s, ...item }) => item));
        setHasFirestoreProjects(true);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'projects');
      }
    );
    return () => unsubscribe();
  }, [currentYear]);

  // Scroll-spy for visible sections
  useEffect(() => {
    const sectionIds = ['home', 'skills', 'portfolio', 'about'];
    const handleScroll = () => {
      const scrollPos = window.scrollY + 150;
      let current = 'home';
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el && scrollPos >= el.offsetTop) {
          current = id;
        }
      }
      setActiveNav(current);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    setActiveNav(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const displayProjects = hasFirestoreProjects ? firestoreProjects : DEFAULT_PROJECTS;
  const filteredProjects =
    selectedCategory === 'all'
      ? displayProjects
      : displayProjects.filter((project) => project.category === selectedCategory);

  const heroWhatsappHref = buildWhatsAppUrl(
    siteConfig.whatsappNumber,
    `${siteConfig.whatsappGreeting} I visited your portfolio and would like to discuss a website project.`
  );

  const safeLogoUrl = isSafeImageSrc(siteConfig.logoUrl) && !logoImgFailed ? siteConfig.logoUrl : '';
  const safeBannerUrl =
    isSafeImageSrc(siteConfig.bannerImageUrl) && !heroArtFailed
      ? siteConfig.bannerImageUrl
      : '/assets/crops/hero_art.png';

  const renderNavIcon = (id: string) => {
    const cls = 'w-3.5 h-3.5 shrink-0';
    switch (id) {
      case 'home':
        return <Home className={cls} />;
      case 'portfolio':
        return <Briefcase className={cls} />;
      case 'skills':
        return <Settings className={cls} />;
      case 'about':
        return <User className={cls} />;
      case 'contact':
        return <Mail className={cls} />;
      default:
        return null;
    }
  };

  const socialItems = [
    {
      label: 'Facebook',
      href: isSafeHttpUrl(siteConfig.facebookUrl) ? siteConfig.facebookUrl : 'https://facebook.com',
      icon: <FacebookIcon />,
    },
    {
      label: 'YouTube',
      href: isSafeHttpUrl(siteConfig.youtubeUrl) ? siteConfig.youtubeUrl : 'https://youtube.com',
      icon: <YoutubeIcon />,
    },
    {
      label: 'GitHub',
      href: isSafeHttpUrl(siteConfig.githubUrl) ? siteConfig.githubUrl : 'https://github.com',
      icon: <GithubIcon />,
    },
    {
      label: 'LinkedIn',
      href: isSafeHttpUrl(siteConfig.linkedinUrl) ? siteConfig.linkedinUrl : 'https://linkedin.com',
      icon: <LinkedinIcon />,
    },
    {
      label: 'Telegram Group',
      href: isSafeHttpUrl(siteConfig.telegramGroupUrl)
        ? siteConfig.telegramGroupUrl
        : 'https://t.me',
      icon: <TelegramIcon />,
    },
  ];

  const bottomQuickCards = [
    {
      id: 'quick-skill',
      title: 'My Skill',
      subtitle: 'HTML5, CSS3, JavaScript, React & Tailwind CSS solutions',
      icon: <Code2 className="w-5 h-5 text-[#38bdf8]" />,
      accentBorder: 'hover:border-[#38bdf8]/70',
      iconBox: 'from-[#0ea5e9]/25 to-[#3b82f6]/25 border-[#38bdf8]/40',
      whatsappText: `${siteConfig.whatsappGreeting} I want to work with you based on your web development skills.`,
      onCardAction: () => scrollToSection('skills'),
    },
    {
      id: 'quick-ecommerce',
      title: 'E-Commerce Website',
      subtitle: 'Online store, product catalog, cart & secure checkout',
      icon: <ShoppingBag className="w-5 h-5 text-[#a855f7]" />,
      accentBorder: 'hover:border-[#a855f7]/70',
      iconBox: 'from-[#a855f7]/25 to-[#6366f1]/25 border-[#a855f7]/40',
      whatsappText: `${siteConfig.whatsappGreeting} I would like to build an E-Commerce Website.`,
      onCardAction: () => {
        setSelectedCategory('ecommerce');
        scrollToSection('portfolio');
      },
    },
    {
      id: 'quick-business',
      title: 'Business Website',
      subtitle: 'Professional company, agency & service websites',
      icon: <Building2 className="w-5 h-5 text-[#22d3ee]" />,
      accentBorder: 'hover:border-[#22d3ee]/70',
      iconBox: 'from-[#06b6d4]/25 to-[#3b82f6]/25 border-[#22d3ee]/40',
      whatsappText: `${siteConfig.whatsappGreeting} I would like to build a Business Website.`,
      onCardAction: () => {
        setSelectedCategory('business');
        scrollToSection('portfolio');
      },
    },
  ];

  const availabilityParts = siteConfig.availabilityText.split(' ');
  const availabilityLast = availabilityParts.length > 1 ? availabilityParts.pop() : '';
  const availabilityPrefix = availabilityParts.join(' ');

  return (
    <div className="min-h-screen bg-[#05091d] text-[#f7f8ff] relative overflow-x-clip">
      {/* Ambient Background Layers */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse 46% 36% at 80% 18%, rgba(45, 36, 178, 0.34), transparent 70%), radial-gradient(ellipse 40% 34% at 10% 65%, rgba(28, 22, 128, 0.25), transparent 72%), radial-gradient(ellipse 45% 28% at 62% 88%, rgba(89, 28, 175, 0.18), transparent 70%)',
        }}
      />

      {/* Sticky Top Header */}
      <header className="sticky top-0 z-40 border-b border-[#1c2954]/85 bg-[#05091d]/90 backdrop-blur-xl">
        <div className="max-w-[1160px] mx-auto px-4 sm:px-6 h-[74px] flex items-center justify-between gap-4">
          {/* Brand Logo Zone */}
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('home');
            }}
            className="flex items-center gap-3 shrink-0 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8f44ff] rounded-xl"
          >
            {safeLogoUrl ? (
              <img
                src={safeLogoUrl}
                alt={`${siteConfig.brandName} logo`}
                referrerPolicy="no-referrer"
                onError={() => setLogoImgFailed(true)}
                className="w-11 h-11 rounded-xl object-cover border border-[#3d56a8] shadow-[0_0_20px_rgba(61,106,255,0.45)] transition-transform duration-200 group-hover:scale-105"
              />
            ) : (
              <MjLogoMark className="w-11 h-11 transition-transform duration-200 group-hover:scale-105" />
            )}
            <div className="leading-tight">
              <span className="block font-display text-[19px] sm:text-[21px] font-extrabold tracking-tight text-white whitespace-nowrap">
                {siteConfig.brandName}
              </span>
              <span className="block text-[11px] font-medium text-[#b8c4e6] tracking-wide whitespace-nowrap">
                {siteConfig.brandSubtitle}
              </span>
            </div>
          </a>

          {/* Center Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1.5 lg:gap-2" aria-label="Primary Navigation">
            {NAV_ITEMS.map((item) => {
              if (item.id === 'contact') {
                return (
                  <a
                    key={item.id}
                    href={heroWhatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap shrink-0 transition-all duration-150 text-[#dfe6ff] hover:text-white hover:bg-[#141f4a]/70 border border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]"
                  >
                    {renderNavIcon(item.id)}
                    <span>{item.label}</span>
                  </a>
                );
              }
              const isActive = activeNav === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection(item.id);
                  }}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap shrink-0 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8f44ff] ${
                    isActive
                      ? 'bg-gradient-to-r from-[#4b23b8] to-[#233ba1] text-white border border-[#7252ff]/60 shadow-[0_0_18px_rgba(91,54,255,0.45)]'
                      : 'text-[#dfe6ff] hover:text-white hover:bg-[#141f4a]/70 border border-transparent'
                  }`}
                >
                  {renderNavIcon(item.id)}
                  <span>{item.label}</span>
                </a>
              );
            })}
          </nav>

          {/* Right CTA & Mobile Toggle */}
          <div className="flex items-center gap-2.5 shrink-0">
            <a
              href={heroWhatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#a63fff] to-[#6832ff] text-[13px] font-bold text-white shadow-[0_6px_22px_rgba(128,53,255,0.48)] hover:brightness-110 active:scale-[0.98] transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c084fc]"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Hire Me</span>
            </a>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              className="md:hidden w-11 h-11 rounded-xl border border-[#2a3b72] bg-[#0e173a] text-white grid place-items-center hover:border-[#8f44ff] transition-colors cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Responsive Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#1e2c5c] bg-[#080f2b]/98 px-4 py-3 space-y-1.5 shadow-2xl">
            {NAV_ITEMS.map((item) => {
              if (item.id === 'contact') {
                return (
                  <a
                    key={item.id}
                    href={heroWhatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-[#6ee7b7] hover:bg-[#131e47] transition-colors"
                  >
                    <MessageCircle className="w-4 h-4 shrink-0" />
                    <span>Contact (WhatsApp)</span>
                  </a>
                );
              }
              const isActive = activeNav === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection(item.id);
                  }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-gradient-to-r from-[#4b23b8] to-[#233ba1] text-white'
                      : 'text-[#dce4ff] hover:bg-[#131e47]'
                  }`}
                >
                  {renderNavIcon(item.id)}
                  <span>{item.label}</span>
                </a>
              );
            })}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <a
                href={heroWhatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-[#a63fff] to-[#6832ff] text-sm font-bold text-white shadow-lg"
              >
                <Send className="w-4 h-4" />
                <span>Hire Me</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setAdminOpen(true);
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-[#324685] bg-[#0e173c] text-sm font-bold text-white cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-[#a855f7]" />
                <span>Admin Panel</span>
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="relative z-10">
        {/* HERO BANNER SECTION */}
        <section id="home" className="relative pt-8 pb-6 sm:pt-12 sm:pb-10">
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-28 opacity-65"
            aria-hidden="true"
            style={{
              background:
                'radial-gradient(ellipse 70% 100% at 50% 100%, rgba(45, 76, 224, 0.22), transparent 72%)',
            }}
          />

          <div className="max-w-[1160px] mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-[1.04fr_0.96fr] items-center gap-8 lg:gap-4">
            {/* Left Copy & Actions */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-[#0b7e86] bg-[#062d38]/85 text-xs font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-[#12e77b] shadow-[0_0_10px_#12e77b]" />
                <span className="text-[#e7f9ff]">
                  {availabilityPrefix ? `${availabilityPrefix} ` : ''}
                  <span className="text-[#26eadc] font-bold">{availabilityLast}</span>
                </span>
              </div>

              <h1 className="mt-5 font-display text-[42px] sm:text-[56px] lg:text-[64px] font-extrabold leading-[1.06] tracking-[-0.03em] text-white [text-wrap:balance]">
                {siteConfig.bannerGreeting}{' '}
                <span className="bg-gradient-to-r from-[#00c8ff] via-[#538bff] to-[#b243ff] bg-clip-text text-transparent">
                  {siteConfig.bannerHighlight}
                </span>
              </h1>

              <h2 className="mt-2 font-display text-[21px] sm:text-[27px] lg:text-[30px] font-bold tracking-tight text-white">
                {siteConfig.bannerSubtitle}
              </h2>

              <p className="mt-4 max-w-[460px] mx-auto lg:mx-0 text-[15px] leading-[1.68] text-[#c5d0ea]">
                {siteConfig.bannerDescription}
              </p>

              {/* Hero CTAs */}
              <div className="mt-7 flex flex-wrap items-center justify-center lg:justify-start gap-3.5">
                <button
                  type="button"
                  onClick={() => scrollToSection('portfolio')}
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full bg-gradient-to-r from-[#b445ff] via-[#8433ff] to-[#5938ff] text-sm font-bold text-white shadow-[0_10px_28px_rgba(130,52,255,0.48)] hover:-translate-y-0.5 hover:brightness-110 transition-all duration-150 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c084fc]"
                >
                  <Rocket className="w-4 h-4" />
                  <span>View My Portfolio</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <a
                  href={heroWhatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full border border-[#7282b4] bg-[#09102d]/85 text-sm font-bold text-white hover:border-[#22c55e] hover:bg-[#0b252c] hover:-translate-y-0.5 transition-all duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]"
                >
                  <MessageCircle className="w-4 h-4 text-[#4ade80]" />
                  <span>Contact Me</span>
                </a>
              </div>

              {/* Social Icons (including Telegram Group) */}
              <div className="mt-6 flex items-center justify-center lg:justify-start gap-3">
                {socialItems.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    title={social.label}
                    className="w-10 h-10 rounded-full bg-[#131c44]/95 border border-[#2a3971] text-[#e4ebff] grid place-items-center hover:bg-gradient-to-br hover:from-[#8338ff] hover:to-[#3b5bff] hover:border-[#9d68ff] hover:-translate-y-0.5 hover:text-white transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8f44ff]"
                  >
                    {social.icon}
                  </a>
                ))}
              </div>
            </div>

            {/* Right Developer Portrait / Custom Banner Artwork */}
            <div className="relative flex items-center justify-center lg:justify-end">
              <div
                className="pointer-events-none absolute w-[320px] h-[320px] sm:w-[400px] sm:h-[360px] rounded-full bg-gradient-to-tr from-[#2343dc]/45 via-[#7c3aed]/35 to-[#00c8ff]/35 blur-3xl"
                aria-hidden="true"
              />
              {!heroArtFailed ? (
                <img
                  src={safeBannerUrl}
                  alt={`${siteConfig.brandName} banner visual`}
                  referrerPolicy="no-referrer"
                  onError={() => setHeroArtFailed(true)}
                  className="relative z-10 w-full max-w-[540px] max-h-[420px] h-auto object-contain hero-mask select-none rounded-3xl"
                />
              ) : (
                <div className="relative z-10 w-full max-w-[440px] h-[340px] rounded-3xl border border-[#2f4280] bg-gradient-to-br from-[#132158] to-[#080d27] grid place-items-center p-8 text-center">
                  <div>
                    <div className="font-display text-4xl font-extrabold bg-gradient-to-r from-[#00c8ff] to-[#b243ff] bg-clip-text text-transparent">
                      &lt;/&gt;
                    </div>
                    <p className="mt-2 text-sm text-[#c5d0ea]">
                      {siteConfig.brandName} · {siteConfig.brandSubtitle}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="max-w-[1160px] mx-auto px-4 sm:px-6 mt-4">
            <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[#344cb3]/60 to-transparent" />
          </div>
        </section>

        {/* SKILLS SECTION */}
        <section id="skills" className="py-7 sm:py-9">
          <div className="max-w-[1160px] mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-center gap-4 mb-6">
              <span className="h-[3px] w-12 sm:w-20 rounded-full bg-gradient-to-r from-transparent via-[#9d35ff] to-[#3478ff]" />
              <h2 className="font-display text-[24px] sm:text-[28px] font-extrabold tracking-tight text-white">
                My Skills
              </h2>
              <span className="h-[3px] w-12 sm:w-20 rounded-full bg-gradient-to-l from-transparent via-[#9d35ff] to-[#3478ff]" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-3.5">
              {SKILLS.map((skill) => {
                const skillWhatsappHref = buildWhatsAppUrl(
                  siteConfig.whatsappNumber,
                  `${siteConfig.whatsappGreeting} I want to hire you for a ${skill.name} (${skill.role}) project.`
                );
                return (
                  <div
                    key={skill.id}
                    className="group rounded-2xl border border-[#25356b] bg-gradient-to-b from-[#111940]/95 to-[#0a102b]/95 px-2.5 py-4 text-center transition-all duration-150 hover:-translate-y-1 hover:border-[#8f44ff] hover:shadow-[0_10px_28px_rgba(93,52,255,0.28)] flex flex-col items-center justify-between"
                  >
                    <div>
                      <div className="transition-transform duration-150 group-hover:scale-105">
                        <SkillIcon id={skill.id} />
                      </div>
                      <span className="mt-2.5 block text-[13px] font-bold text-[#eef2ff] whitespace-nowrap">
                        {skill.name}
                      </span>
                    </div>

                    <a
                      href={skillWhatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#1f5e48] bg-[#082b27]/85 text-[10px] font-semibold text-[#6ee7b7] hover:bg-[#16a34a] hover:text-white hover:border-[#22c55e] transition-colors whitespace-nowrap"
                    >
                      <MessageCircle className="w-2.5 h-2.5 shrink-0" />
                      <span>Contact Me</span>
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* PORTFOLIO SECTION */}
        <section id="portfolio" className="py-7 sm:py-9">
          <div className="max-w-[1160px] mx-auto px-4 sm:px-6">
            <div className="relative flex flex-col items-center justify-center mb-5">
              <div className="flex items-center justify-center gap-4">
                <span className="h-[3px] w-12 sm:w-20 rounded-full bg-gradient-to-r from-transparent via-[#9d35ff] to-[#3478ff]" />
                <h2 className="font-display text-[24px] sm:text-[28px] font-extrabold tracking-tight text-white">
                  My Portfolio
                </h2>
                <span className="h-[3px] w-12 sm:w-20 rounded-full bg-gradient-to-l from-transparent via-[#9d35ff] to-[#3478ff]" />
              </div>
              <p className="mt-1 text-xs sm:text-[13px] text-[#b8c4e4]">
                Some of my recent projects
              </p>

              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  showToast('Showing all portfolio projects');
                }}
                className="mt-3 sm:mt-0 sm:absolute sm:right-0 sm:top-1/2 sm:-translate-y-1/2 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#5648a8] bg-[#10183c]/90 text-xs font-semibold text-[#eef2ff] hover:border-[#9d54ff] hover:bg-[#192356] transition-all cursor-pointer whitespace-nowrap"
              >
                <span>View All Projects</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Category Filter Controls */}
            <div
              className="flex flex-wrap items-center justify-center gap-2 mb-6"
              role="group"
              aria-label="Filter projects by category"
            >
              {FILTER_TABS.map((tab) => {
                const active = selectedCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedCategory(tab.id)}
                    aria-pressed={active}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8f44ff] ${
                      active
                        ? 'bg-gradient-to-r from-[#7934f5] to-[#3b52e6] text-white border border-[#a86eff] shadow-[0_4px_16px_rgba(121,52,245,0.4)]'
                        : 'bg-[#0e173a]/90 text-[#c9d4f2] border border-[#27386e] hover:border-[#7652e8] hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Project Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProjects.map((project) => {
                const projectWhatsappHref = buildWhatsAppUrl(
                  siteConfig.whatsappNumber,
                  `${siteConfig.whatsappGreeting} I liked "${project.title}" and want to discuss a similar website.`
                );
                return (
                  <article
                    key={project.id}
                    className="group rounded-2xl border border-[#2a3a72] bg-gradient-to-b from-[#11193f]/95 to-[#090f29]/95 p-3.5 transition-all duration-200 hover:-translate-y-1 hover:border-[#8c4dff] hover:shadow-[0_18px_40px_rgba(14,19,58,0.8)] flex flex-col"
                  >
                    <div
                      onClick={() => setSelectedProject(project)}
                      className="cursor-pointer"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedProject(project);
                        }
                      }}
                      aria-label={`Open ${project.title} details`}
                    >
                      <ProjectBrowserPreview
                        type={project.previewType}
                        title={project.title}
                        thumbnailUrl={project.thumbnailUrl}
                        liveUrl={project.liveUrl}
                      />
                    </div>

                    <div className="pt-3.5 px-1 flex flex-col justify-between gap-3 flex-1">
                      <div>
                        <div className="text-[11px] text-[#9cb0e4] mb-0.5">
                          {project.categoryLabel} <span aria-hidden="true">·</span>{' '}
                          {project.highlights.length} features
                        </div>
                        <h3 className="font-display text-[15px] font-bold text-white truncate">
                          {project.title}
                        </h3>
                        <p className="mt-1 text-xs leading-relaxed text-[#b9c5e6]">
                          {project.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <a
                          href={projectWhatsappHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#1f624a] bg-[#082c27]/90 text-[11px] font-bold text-[#6ee7b7] hover:bg-[#16a34a] hover:text-white hover:border-[#22c55e] transition-all whitespace-nowrap"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>Contact Me</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => setSelectedProject(project)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#7b35f5] to-[#3f4ee4] text-[11px] font-bold text-white shadow-[0_4px_16px_rgba(98,55,245,0.4)] hover:brightness-110 transition-all cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c084fc]"
                        >
                          <span>View Project</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ABOUT ME & 3 QUICK SERVICE CARDS SECTION (Contact form removed per user request) */}
        <section className="py-7 sm:py-9">
          <div className="max-w-[1160px] mx-auto px-4 sm:px-6 space-y-6">
            {/* About Me Banner Card */}
            <div
              id="about"
              className="relative overflow-hidden rounded-2xl border border-[#283970] bg-gradient-to-br from-[#0e1639] via-[#09102d] to-[#11123d] p-6 sm:p-8 flex flex-col justify-between min-h-[240px]"
            >
              <div
                className="pointer-events-none absolute -right-8 -bottom-8 w-64 h-64 rounded-full bg-gradient-to-tr from-[#3b44f5]/30 to-[#a844ff]/25 blur-2xl"
                aria-hidden="true"
              />

              <div className="relative z-10 sm:max-w-[65%]">
                <div className="flex items-center gap-3 mb-3.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#a545ff]/25 to-[#4f46e5]/25 border border-[#7c4dff]/40 grid place-items-center text-[#a855f7]">
                    <User className="w-5 h-5" />
                  </div>
                  <h2 className="font-display text-[22px] sm:text-[26px] font-extrabold text-white">
                    About Me
                  </h2>
                </div>

                <p className="text-[13.5px] sm:text-sm leading-[1.7] text-[#c2cde9]">
                  I&apos;m {siteConfig.brandName}, a dedicated Web Developer with a passion for
                  creating innovative and user-friendly web solutions. I always try to learn new
                  technologies and deliver the best quality work.
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setInfoModal('about')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#a63fff] to-[#6333ff] text-xs font-bold text-white shadow-[0_6px_20px_rgba(130,52,255,0.42)] hover:brightness-110 hover:-translate-y-0.5 transition-all duration-150 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c084fc]"
                  >
                    <span>Learn More</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  {isSafeHttpUrl(siteConfig.telegramGroupUrl) && (
                    <a
                      href={siteConfig.telegramGroupUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-[#2d4a88] bg-[#0b153a] text-xs font-bold text-[#93c5fd] hover:border-[#38bdf8] hover:text-white transition-all whitespace-nowrap"
                    >
                      <TelegramIcon />
                      <span>Join Telegram Group</span>
                    </a>
                  )}
                </div>
              </div>

              {!aboutLaptopFailed && (
                <div className="hidden sm:block pointer-events-none absolute right-2 bottom-0 w-[230px] md:w-[270px] h-[220px]">
                  <img
                    src="/assets/crops/about_laptop.png"
                    alt="Developer laptop displaying code icon"
                    referrerPolicy="no-referrer"
                    onError={() => setAboutLaptopFailed(true)}
                    className="w-full h-full object-contain object-bottom about-laptop-mask select-none"
                  />
                </div>
              )}
            </div>

            {/* 3 Quick Service Icons Below About */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {bottomQuickCards.map((card) => (
                <div
                  key={card.id}
                  className={`rounded-2xl border border-[#27386e] bg-gradient-to-br from-[#10183d]/95 to-[#090f29]/95 p-4 flex items-center justify-between gap-3 transition-all duration-150 hover:-translate-y-0.5 ${card.accentBorder}`}
                >
                  <button
                    type="button"
                    onClick={card.onCardAction}
                    className="flex items-center gap-3.5 text-left min-w-0 cursor-pointer group"
                  >
                    <div
                      className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.iconBox} border grid place-items-center shrink-0 transition-transform group-hover:scale-105`}
                    >
                      {card.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="font-display text-sm font-bold text-white truncate">
                        {card.title}
                      </div>
                      <div className="text-[11px] text-[#aebbe0] truncate">{card.subtitle}</div>
                    </div>
                  </button>

                  <a
                    href={buildWhatsAppUrl(siteConfig.whatsappNumber, card.whatsappText)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-[#1f624a] bg-[#082c27]/90 text-[11px] font-bold text-[#6ee7b7] hover:bg-[#16a34a] hover:text-white hover:border-[#22c55e] transition-colors whitespace-nowrap"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Contact Me</span>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-[#1e2c5c] bg-[#04071a]/80 mt-2">
        <div className="max-w-[1160px] mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] sm:text-xs text-[#b8c4e4]">
          <div>
            <span className="font-bold text-white">{siteConfig.brandName}</span> &copy;{' '}
            <span className="tabular-nums">{currentYear}</span>. All Rights Reserved.
          </div>

          <div className="flex items-center gap-1.5">
            <span>Made with</span>
            <span className="text-[#ef4444]" aria-label="love">
              &#9829;
            </span>
            <span>by</span>
            <span className="font-bold text-[#a855f7]">{siteConfig.brandName}</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setAdminOpen(true)}
              className="inline-flex items-center gap-1.5 text-[#c4b5fd] hover:text-white font-semibold transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#a855f7]" />
              <span>Admin Panel</span>
            </button>
            <span className="text-[#4a5a8e]" aria-hidden="true">
              |
            </span>
            <button
              type="button"
              onClick={() => setInfoModal('privacy')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <span className="text-[#4a5a8e]" aria-hidden="true">
              |
            </span>
            <button
              type="button"
              onClick={() => setInfoModal('terms')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Terms &amp; Conditions
            </button>
            <span className="text-[#4a5a8e]" aria-hidden="true">
              |
            </span>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="inline-flex items-center gap-1 text-[#d5dfff] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>Back to top</span>
              <ArrowUp className="w-3 h-3" />
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <ProjectModal
        project={selectedProject}
        siteConfig={siteConfig}
        onClose={() => setSelectedProject(null)}
      />
      <InfoModal mode={infoModal} siteConfig={siteConfig} onClose={() => setInfoModal(null)} />
      <AdminPanelModal
        open={adminOpen}
        user={user}
        isAdminUser={isAdminUser}
        authReady={authReady}
        projects={displayProjects}
        hasFirestoreProjects={hasFirestoreProjects}
        siteConfig={siteConfig}
        onClose={() => setAdminOpen(false)}
        onNotify={showToast}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl border border-[#7c4dff]/70 bg-[#111b44]/95 text-xs sm:text-sm font-medium text-white shadow-[0_12px_32px_rgba(0,0,0,0.65)] backdrop-blur-md"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
