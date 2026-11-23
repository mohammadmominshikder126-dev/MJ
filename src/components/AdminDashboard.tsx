import React, { useEffect, useState } from 'react';
import { User, signInWithPopup, signOut } from 'firebase/auth';
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  Folder,
  FolderPlus,
  Image as ImageIcon,
  Images,
  LogOut,
  MessageCircle,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Send,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import {
  buildWhatsAppUrl,
  categoryLabelFromId,
  DEFAULT_SITE_CONFIG,
  isSafeHttpUrl,
  isSafeImageSrc,
  ProjectCategory,
  ProjectItem,
  SiteConfig,
  SKILL_ICON_OPTIONS,
  SkillItem,
} from '../lib/portfolioData';
import { ADMIN_EMAIL, auth, FIREBASE_PROJECT_ID, googleProvider } from '../lib/firebase';
import { MjLogoMark, SkillIcon } from './BrandAndSkillIcons';

export interface DailyAnalyticsRow {
  dateKey: string;
  visitors: number;
  contactClicks: number;
}

export interface AnalyticsOverview {
  totalVisitors: number;
  todayVisitors: number;
  totalContactClicks: number;
  todayContactClicks: number;
  dailyHistory: DailyAnalyticsRow[];
}

interface AdminDashboardProps {
  user: User | null;
  isAdminUser: boolean;
  authReady: boolean;
  projects: ProjectItem[];
  skills: SkillItem[];
  siteConfig: SiteConfig;
  analytics: AnalyticsOverview;
  analyticsLoading: boolean;
  onRefreshData: () => Promise<void>;
  onClose: () => void;
  onNotify: (message: string) => void;
}

type DashboardView =
  | 'overview'
  | 'add-project'
  | 'edit-banner'
  | 'website-logo'
  | 'visitors'
  | 'telegram-link'
  | 'site-settings';

type SiteSettingsSubTab = 'skills' | 'about-cards' | 'footer-headings';

async function compressImageFile(file: File, maxDim = 960, maxBytes = 280_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read selected image.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file.'));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas unavailable.'));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        let quality = 0.82;
        let dataUrl = canvas.toDataURL('image/webp', quality);
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        while (dataUrl.length > maxBytes && quality > 0.35) {
          quality -= 0.12;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        if (dataUrl.length > 340_000) {
          reject(new Error('Image is still too large after compression. Choose a smaller image.'));
          return;
        }
        resolve(dataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

async function authorizedFetch(
  url: string,
  user: User,
  options: RequestInit = {}
): Promise<Response> {
  const token = await user.getIdToken();
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(url, { ...options, headers });
}

export function AdminDashboard({
  user,
  isAdminUser,
  authReady,
  projects,
  skills,
  siteConfig,
  analytics,
  analyticsLoading,
  onRefreshData,
  onClose,
  onNotify,
}: AdminDashboardProps) {
  const [view, setView] = useState<DashboardView>('overview');
  const [settingsTab, setSettingsTab] = useState<SiteSettingsSubTab>('skills');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [unauthorizedHost, setUnauthorizedHost] = useState<string | null>(null);

  const [projectSearch, setProjectSearch] = useState('');
  const [confirmDeleteProjectId, setConfirmDeleteProjectId] = useState<string | null>(null);
  const [confirmResetAnalytics, setConfirmResetAnalytics] = useState(false);

  // Project Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Exclude<ProjectCategory, 'all'>>('business');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [description, setDescription] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [featuresText, setFeaturesText] = useState(
    'Responsive mobile & desktop design\nFast loading & SEO friendly\nDirect WhatsApp contact integration'
  );
  const [liveUrl, setLiveUrl] = useState('');
  const [techStackInput, setTechStackInput] = useState('React, Tailwind CSS, PostgreSQL');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [projectBusy, setProjectBusy] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);

  // Skill CRUD State
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [skillName, setSkillName] = useState('');
  const [skillRole, setSkillRole] = useState('');
  const [skillIconKey, setSkillIconKey] = useState('react');
  const [skillOrder, setSkillOrder] = useState('8');
  const [skillBusy, setSkillBusy] = useState(false);
  const [skillError, setSkillError] = useState<string | null>(null);

  // Full A-to-Z Site Config State
  const [formConfig, setFormConfig] = useState<SiteConfig>(siteConfig);
  const [configBusy, setConfigBusy] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    setFormConfig(siteConfig);
  }, [siteConfig]);

  const updateField = <K extends keyof SiteConfig>(key: K, value: SiteConfig[K]) => {
    setFormConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleGoogleLogin = async () => {
    setAuthError(null);
    setUnauthorizedHost(null);
    setAuthBusy(true);
    try {
      await signInWithPopup(auth, googleProvider);
      onNotify('Signed in to Admin Control Center');
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      const rawMessage = err instanceof Error ? err.message : 'Google Sign-In failed.';
      if (code === 'auth/unauthorized-domain' || rawMessage.includes('auth/unauthorized-domain')) {
        const host = typeof window !== 'undefined' ? window.location.hostname : '';
        setUnauthorizedHost(host || 'your-domain');
        setAuthError(
          `Domain "${host}" is not yet authorized in Firebase Authentication. Add it in Firebase Console → Authentication → Settings → Authorized domains.`
        );
      } else {
        setAuthError(rawMessage);
      }
    } finally {
      setAuthBusy(false);
    }
  };

  const handleCopyHost = async () => {
    if (!unauthorizedHost || typeof navigator === 'undefined') return;
    try {
      await navigator.clipboard.writeText(unauthorizedHost);
      onNotify(`Copied "${unauthorizedHost}"`);
    } catch {
      onNotify(unauthorizedHost);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setView('overview');
      onNotify('Signed out from Admin Control Center');
    } catch {
      onNotify('Could not sign out');
    }
  };

  const resetProjectForm = () => {
    setEditingId(null);
    setTitle('');
    setCategory('business');
    setYear(String(new Date().getFullYear()));
    setDescription('');
    setLongDescription('');
    setFeaturesText(
      'Responsive mobile & desktop design\nFast loading & SEO friendly\nDirect WhatsApp contact integration'
    );
    setLiveUrl('');
    setTechStackInput('React, Tailwind CSS, PostgreSQL');
    setThumbnailUrl('');
    setProjectError(null);
  };

  const handleStartEditProject = (project: ProjectItem) => {
    setEditingId(project.id);
    setTitle(project.title);
    setCategory(project.category);
    setYear(project.year || String(new Date().getFullYear()));
    setDescription(project.description);
    setLongDescription(project.longDescription);
    setFeaturesText(project.highlights.join('\n'));
    setLiveUrl(project.liveUrl);
    setTechStackInput(project.techStack.join(', '));
    setThumbnailUrl(project.thumbnailUrl);
    setProjectError(null);
    setView('add-project');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImageFileSelect = async (
    file: File | undefined,
    setter: (val: string) => void,
    maxDim = 960
  ) => {
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, maxDim);
      setter(compressed);
      onNotify('Image uploaded and optimized');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to process image.';
      onNotify(msg);
    }
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isAdminUser) return;
    setProjectError(null);

    const cleanTitle = title.trim();
    const cleanDesc = description.trim();
    const cleanLong = longDescription.trim() || cleanDesc;
    const cleanLiveUrl = liveUrl.trim();
    const cleanThumb = thumbnailUrl.trim();

    if (!cleanTitle || !cleanDesc) {
      setProjectError('Project Name and Short Description are required.');
      return;
    }
    if (cleanLiveUrl && !isSafeHttpUrl(cleanLiveUrl)) {
      setProjectError('Live URL must start with https:// or http://.');
      return;
    }
    if (cleanThumb && !isSafeImageSrc(cleanThumb)) {
      setProjectError('Project Image must be a valid https:// URL or uploaded image.');
      return;
    }

    const highlights = featuresText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 12);

    const techStack = techStackInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 10);

    setProjectBusy(true);
    try {
      const payload = {
        id: editingId || `proj-${Date.now()}`,
        title: cleanTitle.slice(0, 100),
        category,
        categoryLabel: categoryLabelFromId(category),
        description: cleanDesc.slice(0, 300),
        longDescription: cleanLong.slice(0, 1200),
        year: year.trim().slice(0, 10) || String(new Date().getFullYear()),
        techStack: techStack.length > 0 ? techStack : ['React', 'Tailwind CSS'],
        highlights: highlights.length > 0 ? highlights : ['Responsive modern web build'],
        previewType: cleanThumb
          ? 'custom'
          : category === 'ecommerce'
            ? 'ecommerce'
            : category === 'business'
              ? 'business'
              : 'custom',
        liveUrl: cleanLiveUrl.slice(0, 300),
        thumbnailUrl: cleanThumb,
      };

      const res = await authorizedFetch(
        editingId ? `/api/admin/projects/${encodeURIComponent(editingId)}` : '/api/admin/projects',
        user,
        {
          method: editingId ? 'PUT' : 'POST',
          body: JSON.stringify(payload),
        }
      );

      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Could not save project.');
      }

      await onRefreshData();
      onNotify(editingId ? 'Project updated in real time' : 'New project published live');
      resetProjectForm();
      setView('overview');
    } catch (err) {
      setProjectError(err instanceof Error ? err.message : 'Failed to save project.');
    } finally {
      setProjectBusy(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!user || !isAdminUser) return;
    try {
      const res = await authorizedFetch(`/api/admin/projects/${encodeURIComponent(projectId)}`, user, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || 'Delete failed.');
      }
      setConfirmDeleteProjectId(null);
      if (editingId === projectId) {
        resetProjectForm();
      }
      await onRefreshData();
      onNotify('Project removed from portfolio');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Could not delete project.');
    }
  };

  const handleSeedProjects = async () => {
    if (!user || !isAdminUser) return;
    setProjectBusy(true);
    try {
      const res = await authorizedFetch('/api/admin/projects/seed', user, { method: 'POST' });
      if (!res.ok) throw new Error('Could not restore starter projects.');
      await onRefreshData();
      onNotify('Starter projects restored');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Restore failed');
    } finally {
      setProjectBusy(false);
    }
  };

  const handleSaveSiteConfig = async (e?: React.FormEvent, successMsg?: string) => {
    if (e) e.preventDefault();
    if (!user || !isAdminUser) return;
    setConfigError(null);

    const digits = formConfig.whatsappNumber.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 20) {
      setConfigError('Please enter a valid WhatsApp number with country code (e.g. 8801700000000).');
      return;
    }

    const urlChecks: [string, string][] = [
      [formConfig.telegramGroupUrl.trim(), 'Telegram Link'],
      [formConfig.facebookUrl.trim(), 'Facebook URL'],
      [formConfig.youtubeUrl.trim(), 'YouTube URL'],
      [formConfig.githubUrl.trim(), 'GitHub URL'],
      [formConfig.linkedinUrl.trim(), 'LinkedIn URL'],
    ];
    for (const [val, label] of urlChecks) {
      if (val && !isSafeHttpUrl(val)) {
        setConfigError(`${label} must start with https:// or http://.`);
        return;
      }
    }

    setConfigBusy(true);
    try {
      const res = await authorizedFetch('/api/admin/config', user, {
        method: 'PUT',
        body: JSON.stringify(formConfig),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Could not save site settings.');
      }
      await onRefreshData();
      onNotify(successMsg || 'Website changes applied live to User Panel');
    } catch (err) {
      setConfigError(err instanceof Error ? err.message : 'Failed to save website settings.');
    } finally {
      setConfigBusy(false);
    }
  };

  const resetSkillForm = () => {
    setEditingSkillId(null);
    setSkillName('');
    setSkillRole('');
    setSkillIconKey('react');
    setSkillOrder(String(skills.length + 1));
    setSkillError(null);
  };

  const handleStartEditSkill = (skill: SkillItem) => {
    setEditingSkillId(skill.id);
    setSkillName(skill.name);
    setSkillRole(skill.role);
    setSkillIconKey(skill.iconKey);
    setSkillOrder(String(skill.order));
    setSkillError(null);
  };

  const handleSaveSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isAdminUser) return;
    setSkillError(null);
    if (!skillName.trim()) {
      setSkillError('Skill name is required.');
      return;
    }
    setSkillBusy(true);
    try {
      const payload = {
        id: editingSkillId || `skill-${Date.now()}`,
        name: skillName.trim().slice(0, 40),
        role: (skillRole.trim() || 'Web Development').slice(0, 60),
        iconKey: skillIconKey || 'custom',
        order: Math.max(0, Math.min(1000, Math.round(Number(skillOrder) || 10))),
      };
      const res = await authorizedFetch(
        editingSkillId ? `/api/admin/skills/${encodeURIComponent(editingSkillId)}` : '/api/admin/skills',
        user,
        {
          method: editingSkillId ? 'PUT' : 'POST',
          body: JSON.stringify(payload),
        }
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Failed to save skill.');
      await onRefreshData();
      resetSkillForm();
      onNotify(editingSkillId ? 'Skill updated live' : 'New skill added to website');
    } catch (err) {
      setSkillError(err instanceof Error ? err.message : 'Could not save skill.');
    } finally {
      setSkillBusy(false);
    }
  };

  const handleDeleteSkill = async (skillId: string) => {
    if (!user || !isAdminUser) return;
    try {
      const res = await authorizedFetch(`/api/admin/skills/${encodeURIComponent(skillId)}`, user, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete skill.');
      await onRefreshData();
      onNotify('Skill removed');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Could not delete skill.');
    }
  };

  const handleSeedSkills = async () => {
    if (!user || !isAdminUser) return;
    setSkillBusy(true);
    try {
      const res = await authorizedFetch('/api/admin/skills/seed', user, { method: 'POST' });
      if (!res.ok) throw new Error('Restore failed.');
      await onRefreshData();
      onNotify('Default skills restored');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Could not restore skills');
    } finally {
      setSkillBusy(false);
    }
  };

  const handleResetAnalytics = async () => {
    if (!user || !isAdminUser) return;
    try {
      const res = await authorizedFetch('/api/admin/analytics/reset', user, { method: 'POST' });
      if (!res.ok) throw new Error('Could not reset analytics.');
      setConfirmResetAnalytics(false);
      await onRefreshData();
      onNotify('Visitor analytics counters reset');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Reset failed.');
    }
  };

  const filteredProjects = projects.filter((p) => {
    const q = projectSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.categoryLabel.toLowerCase().includes(q)
    );
  });

  const safePreviewLogo = isSafeImageSrc(formConfig.logoUrl) ? formConfig.logoUrl : '';
  const safePreviewBanner = isSafeImageSrc(formConfig.bannerImageUrl)
    ? formConfig.bannerImageUrl
    : '/assets/crops/hero_art.png';
  const safePreviewAbout = isSafeImageSrc(formConfig.aboutImageUrl)
    ? formConfig.aboutImageUrl
    : '/assets/crops/about_laptop.png';

  const managementTiles = [
    {
      id: 'add-project' as DashboardView,
      title: 'Add Project',
      subtitle: 'নতুন প্রজেক্ট আপলোড',
      icon: <FolderPlus className="w-6 h-6 text-[#818cf8]" />,
      onClick: () => {
        resetProjectForm();
        setView('add-project');
      },
    },
    {
      id: 'edit-banner' as DashboardView,
      title: 'Edit Banner',
      subtitle: 'ব্যানার পরিবর্তন',
      icon: <Images className="w-6 h-6 text-[#a855f7]" />,
      onClick: () => setView('edit-banner'),
    },
    {
      id: 'website-logo' as DashboardView,
      title: 'Website Logo',
      subtitle: 'লোগো পরিবর্তন',
      icon: <ImageIcon className="w-6 h-6 text-[#c084fc]" />,
      onClick: () => setView('website-logo'),
    },
    {
      id: 'visitors' as DashboardView,
      title: 'Visitors',
      subtitle: 'ভিজিটর রিপোর্ট',
      icon: <Users className="w-6 h-6 text-[#a78bfa]" />,
      onClick: () => setView('visitors'),
    },
    {
      id: 'telegram-link' as DashboardView,
      title: 'Telegram Link',
      subtitle: 'গ্রুপ লিংক সেটিংস',
      icon: <Send className="w-6 h-6 text-[#a855f7]" />,
      onClick: () => setView('telegram-link'),
    },
    {
      id: 'site-settings' as DashboardView,
      title: 'Site Settings',
      subtitle: 'ওয়েবসাইট সেটিংস',
      icon: <Settings className="w-6 h-6 text-[#a855f7]" />,
      onClick: () => setView('site-settings'),
    },
  ];

  const inputCls =
    'w-full px-3.5 py-2.5 rounded-xl bg-[#070d26] border border-[#24346b] text-sm text-white placeholder-[#6879ad] focus:outline-none focus:border-[#8f44ff] transition-colors';

  const viewTitles: Record<DashboardView, { title: string; subtitle: string }> = {
    overview: {
      title: 'Dashboard Overview',
      subtitle: 'আপনার ওয়েবসাইটের সম্পূর্ণ কন্ট্রোল প্যানেল',
    },
    'add-project': {
      title: editingId ? 'Edit Portfolio Project' : 'Add Project',
      subtitle: 'নতুন প্রজেক্ট আপলোড ও ফিচার বিবরণ লিখুন',
    },
    'edit-banner': {
      title: 'Edit Banner',
      subtitle: 'হোমপেজ ব্যানার, শিরোনাম ও ছবি পরিবর্তন করুন',
    },
    'website-logo': {
      title: 'Website Logo',
      subtitle: 'ব্র্যান্ড নাম, সাবটাইটেল ও লোগো পরিবর্তন করুন',
    },
    visitors: {
      title: 'Visitors Analytics',
      subtitle: 'মোট ভিজিটর, দৈনিক ভিজিটর ও কন্টাক্ট ক্লিক রিপোর্ট',
    },
    'telegram-link': {
      title: 'Telegram & Social Links',
      subtitle: 'টেলিগ্রাম গ্রুপ, হোয়াটসঅ্যাপ ও সোশ্যাল মিডিয়া লিংক সেটিংস',
    },
    'site-settings': {
      title: 'Site Settings',
      subtitle: 'স্কিলস, About Me, সার্ভিস কার্ড ও ফুটার কন্ট্রোল',
    },
  };

  return (
    <div className="min-h-screen bg-[#05091d] text-[#f5f7ff] relative overflow-x-clip">
      <div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse 46% 36% at 85% 12%, rgba(56, 40, 178, 0.28), transparent 72%), radial-gradient(ellipse 42% 34% at 10% 75%, rgba(28, 22, 128, 0.22), transparent 72%)',
        }}
      />

      {/* Sticky Top Control Header matching Screenshot 1 */}
      <header className="sticky top-0 z-30 border-b border-[#1b2754] bg-[#060b22]/92 backdrop-blur-xl">
        <div className="max-w-[1060px] mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {isSafeImageSrc(siteConfig.logoUrl) ? (
              <img
                src={siteConfig.logoUrl}
                alt={`${siteConfig.brandName} logo`}
                referrerPolicy="no-referrer"
                className="w-11 h-11 rounded-xl object-cover border border-[#3d56a8] shrink-0"
              />
            ) : (
              <MjLogoMark className="w-11 h-11 shrink-0" />
            )}
            <div className="min-w-0 leading-tight">
              <div className="font-display text-lg sm:text-xl font-extrabold tracking-tight text-white truncate">
                {siteConfig.brandName}
              </div>
              <div className="text-[10px] sm:text-[11px] font-bold tracking-[0.14em] text-[#8fa1d4] uppercase truncate">
                ADMIN CONTROL CENTER
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase border whitespace-nowrap ${
                isAdminUser
                  ? 'border-[#10b981]/35 bg-[#062d26]/90 text-[#34d399]'
                  : 'border-amber-400/35 bg-amber-950/50 text-amber-300'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isAdminUser ? 'bg-[#10b981] shadow-[0_0_8px_#10b981]' : 'bg-amber-400'
                }`}
              />
              <span>{isAdminUser ? 'ADMIN ONLINE' : 'AUTH REQUIRED'}</span>
            </span>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#2a3b75] bg-[#0b1335] text-xs font-semibold text-[#e2e8ff] hover:border-[#7b52ff] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View Site</span>
            </button>

            {user && (
              <button
                type="button"
                onClick={handleLogout}
                title="Sign Out"
                aria-label="Sign Out"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#2a3b75] bg-[#0b1335] text-xs font-semibold text-[#c7d3f7] hover:border-rose-400/60 hover:text-rose-200 transition-colors cursor-pointer whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-[1060px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {!authReady ? (
          <div className="rounded-2xl border border-[#233267] bg-[#0a1130]/90 p-10 text-center text-sm text-[#b9c7eb]">
            Checking administrator session...
          </div>
        ) : !user ? (
          <div className="max-w-md mx-auto rounded-2xl border border-[#273873] bg-[#0a1130]/95 p-7 text-center shadow-[0_20px_50px_rgba(0,0,0,0.55)]">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#2563eb] grid place-items-center mb-4 shadow-lg">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <h1 className="font-display text-2xl font-bold text-white">Admin Sign In</h1>
            <p className="mt-2 text-xs sm:text-sm text-[#aebbe0] leading-relaxed">
              Sign in with your verified Google Admin account (
              <span className="text-white font-semibold">{ADMIN_EMAIL}</span>) to unlock A-to-Z
              real-time website controls.
            </p>

            {authError && (
              <div className="mt-4 p-3.5 rounded-xl border border-rose-500/45 bg-rose-950/45 text-xs text-rose-200 text-left space-y-2.5">
                <p>{authError}</p>
                {unauthorizedHost && (
                  <div className="pt-2 border-t border-rose-500/30 space-y-2">
                    <div className="flex items-center justify-between gap-2 bg-[#070d25] border border-[#2a3b72] rounded-lg px-2.5 py-1.5">
                      <code className="text-[11px] text-[#7dd3fc] truncate">{unauthorizedHost}</code>
                      <button
                        type="button"
                        onClick={handleCopyHost}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#18265c] text-[10px] font-bold text-white hover:bg-[#243884] cursor-pointer shrink-0"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </button>
                    </div>
                    <a
                      href={`https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/authentication/settings`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#93c5fd] hover:text-white underline"
                    >
                      <span>Open Firebase Authorized Domains</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={authBusy}
              className="mt-6 w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#8b3eff] to-[#4f46e5] text-sm font-bold text-white shadow-[0_10px_28px_rgba(124,58,237,0.45)] hover:brightness-110 transition-all cursor-pointer disabled:opacity-60"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{authBusy ? 'Connecting...' : 'Sign in with Google'}</span>
            </button>
          </div>
        ) : !isAdminUser ? (
          <div className="max-w-md mx-auto rounded-2xl border border-rose-500/40 bg-[#0a1130]/95 p-7 text-center space-y-4">
            <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto" />
            <div>
              <h1 className="font-display text-lg font-bold text-white">Access Restricted</h1>
              <p className="mt-1.5 text-xs sm:text-sm text-[#c7d3f7]">
                Signed in as <span className="text-white font-semibold">{user.email}</span>. Only{' '}
                <span className="text-white font-semibold">{ADMIN_EMAIL}</span> has Admin Control
                Center access.
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#2f4280] bg-[#101944] text-xs font-semibold text-white hover:border-[#8f44ff] cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Switch Google Account</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Sub-view Breadcrumb Bar */}
            {view !== 'overview' && (
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#1c2854]">
                <button
                  type="button"
                  onClick={() => setView('overview')}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#2a3c78] bg-[#0b1336] text-xs font-semibold text-[#e2e8ff] hover:border-[#8f44ff] hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Dashboard</span>
                </button>
                <div className="text-right">
                  <div className="font-display text-base sm:text-lg font-bold text-white">
                    {viewTitles[view].title}
                  </div>
                  <div className="text-xs text-[#94a6d8]">{viewTitles[view].subtitle}</div>
                </div>
              </div>
            )}

            {/* 1. DASHBOARD OVERVIEW (Exact layout from Screenshots) */}
            {view === 'overview' && (
              <div className="space-y-7">
                {/* Heading + Mobile Online Pill */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h1 className="font-display text-2xl sm:text-[28px] font-extrabold tracking-tight text-white">
                      {viewTitles.overview.title}
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-[#95a7d8]">
                      {viewTitles.overview.subtitle}
                    </p>
                  </div>
                  <span className="sm:hidden inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border border-[#10b981]/35 bg-[#062d26]/90 text-[#34d399] whitespace-nowrap shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                    <span>ONLINE</span>
                  </span>
                </div>

                {/* 2x2 KPI Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <div className="rounded-2xl border border-[#233267] bg-[#0a1130]/95 p-4 sm:p-5 flex flex-col justify-between">
                    <div className="w-9 h-9 rounded-xl bg-[#a855f7]/15 border border-[#a855f7]/30 grid place-items-center">
                      <Users className="w-5 h-5 text-[#a855f7]" />
                    </div>
                    <div className="mt-3.5 font-display text-2xl sm:text-[32px] font-extrabold tracking-tight text-white tabular-nums leading-none">
                      {analyticsLoading ? '—' : analytics.totalVisitors.toLocaleString()}
                    </div>
                    <div className="mt-1.5 text-xs sm:text-[13px] font-medium text-[#95a7d8]">
                      Total Visitors
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#233267] bg-[#0a1130]/95 p-4 sm:p-5 flex flex-col justify-between">
                    <div className="w-9 h-9 rounded-xl bg-[#38bdf8]/15 border border-[#38bdf8]/30 grid place-items-center">
                      <Folder className="w-5 h-5 text-[#38bdf8]" />
                    </div>
                    <div className="mt-3.5 font-display text-2xl sm:text-[32px] font-extrabold tracking-tight text-white tabular-nums leading-none">
                      {projects.length.toLocaleString()}
                    </div>
                    <div className="mt-1.5 text-xs sm:text-[13px] font-medium text-[#95a7d8]">
                      Total Projects
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#233267] bg-[#0a1130]/95 p-4 sm:p-5 flex flex-col justify-between">
                    <div className="w-9 h-9 rounded-xl bg-[#22c55e]/15 border border-[#22c55e]/30 grid place-items-center">
                      <Eye className="w-5 h-5 text-[#22c55e]" />
                    </div>
                    <div className="mt-3.5 font-display text-2xl sm:text-[32px] font-extrabold tracking-tight text-white tabular-nums leading-none">
                      {analyticsLoading ? '—' : analytics.todayVisitors.toLocaleString()}
                    </div>
                    <div className="mt-1.5 text-xs sm:text-[13px] font-medium text-[#95a7d8]">
                      Today&apos;s Visitors
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#233267] bg-[#0a1130]/95 p-4 sm:p-5 flex flex-col justify-between">
                    <div className="w-9 h-9 rounded-xl bg-[#f59e0b]/15 border border-[#f59e0b]/30 grid place-items-center">
                      <MessageCircle className="w-5 h-5 text-[#f59e0b]" />
                    </div>
                    <div className="mt-3.5 font-display text-2xl sm:text-[32px] font-extrabold tracking-tight text-white tabular-nums leading-none">
                      {analyticsLoading ? '—' : analytics.totalContactClicks.toLocaleString()}
                    </div>
                    <div className="mt-1.5 text-xs sm:text-[13px] font-medium text-[#95a7d8]">
                      Contact Clicks
                    </div>
                  </div>
                </div>

                {/* Website Management 2x3 Grid */}
                <div className="pt-5 border-t border-[#1c2854]">
                  <h2 className="font-display text-lg sm:text-xl font-bold text-white mb-4">
                    Website Management
                  </h2>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {managementTiles.map((tile) => (
                      <button
                        key={tile.id}
                        type="button"
                        onClick={tile.onClick}
                        className="group text-left rounded-2xl border border-[#233267] bg-[#0a1130]/95 p-4 sm:p-5 hover:border-[#8f44ff] hover:bg-[#0e1740] transition-all cursor-pointer"
                      >
                        <div className="mb-3 transition-transform duration-150 group-hover:scale-105">
                          {tile.icon}
                        </div>
                        <div className="font-display text-base sm:text-lg font-bold text-white">
                          {tile.title}
                        </div>
                        <div className="mt-1 text-xs text-[#95a7d8]">{tile.subtitle}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recent Projects / Portfolio Projects List */}
                <div className="pt-5 border-t border-[#1c2854] space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="font-display text-lg sm:text-xl font-bold text-white">
                        Recent Projects
                      </h2>
                      <div className="mt-1 flex items-center gap-3">
                        <span className="text-sm font-semibold text-[#dce4ff]">
                          Portfolio Projects
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-[#10b981]/35 bg-[#062d26]/90 text-[#34d399] tabular-nums">
                          {projects.length} Active
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="relative flex-1 sm:w-56">
                        <Search className="w-3.5 h-3.5 text-[#7f91c7] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={projectSearch}
                          onChange={(e) => setProjectSearch(e.target.value)}
                          placeholder="Search projects..."
                          className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#070d26] border border-[#24346b] text-xs text-white placeholder-[#6879ad] focus:outline-none focus:border-[#8f44ff]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          resetProjectForm();
                          setView('add-project');
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#8b3eff] to-[#4f46e5] text-xs font-bold text-white hover:brightness-110 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>New</span>
                      </button>
                    </div>
                  </div>

                  {filteredProjects.length === 0 ? (
                    <div className="rounded-2xl border border-[#233267] bg-[#0a1130]/95 p-8 text-center space-y-3">
                      <p className="text-sm text-[#9fb0df]">
                        {projectSearch.trim()
                          ? 'No matching projects found.'
                          : 'No portfolio projects published yet.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          resetProjectForm();
                          setView('add-project');
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#8b3eff] to-[#4f46e5] text-xs font-bold text-white cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add First Project</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredProjects.map((project) => (
                        <div
                          key={project.id}
                          className="rounded-2xl border border-[#233267] bg-[#0a1130]/95 p-4 sm:p-5 flex flex-col gap-3 hover:border-[#394f9a] transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="font-display text-base sm:text-lg font-bold text-white truncate">
                                {project.title}
                              </h3>
                              <p className="mt-1 text-xs sm:text-sm text-[#a6b5df] line-clamp-2">
                                {project.description}
                              </p>
                            </div>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border border-[#10b981]/35 bg-[#062d26]/90 text-[#34d399] shrink-0">
                              {project.status || 'Published'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-3 pt-1 border-t border-[#18224a]">
                            <span className="text-[11px] font-medium text-[#8fa1d4]">
                              {project.categoryLabel} · {project.highlights.length} features
                            </span>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleStartEditProject(project)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#a78bfa] hover:text-white hover:bg-[#16214f] transition-colors cursor-pointer"
                              >
                                <Pencil className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                              <span className="text-[#4a5a8e]" aria-hidden="true">
                                ·
                              </span>
                              {confirmDeleteProjectId === project.id ? (
                                <span className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteProject(project.id)}
                                    className="px-2 py-1 rounded-lg bg-rose-600 text-[11px] font-bold text-white hover:bg-rose-500 cursor-pointer"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteProjectId(null)}
                                    className="px-2 py-1 rounded-lg bg-[#16214f] text-[11px] text-[#c7d3f7] cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteProjectId(project.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-400 hover:text-rose-200 hover:bg-rose-950/50 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Delete</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. ADD / EDIT PROJECT VIEW */}
            {view === 'add-project' && (
              <form
                onSubmit={handleSaveProject}
                className="rounded-2xl border border-[#233267] bg-[#0a1130]/95 p-5 sm:p-6 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#1b2754]">
                  <h2 className="font-display text-lg font-bold text-white">
                    {editingId ? 'Update Project Details' : 'Upload New Website Project'}
                  </h2>
                  <button
                    type="button"
                    onClick={handleSeedProjects}
                    disabled={projectBusy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#2b3f7d] bg-[#0e1740] text-xs font-semibold text-[#c7d3f7] hover:text-white cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore Starter Projects</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#c6d3f7] mb-1.5">
                      Project Name *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={100}
                      placeholder="e.g. Modern Online Store"
                      className={inputCls}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#c6d3f7] mb-1.5">
                      Website Category *
                    </label>
                    <select
                      value={category}
                      onChange={(e) =>
                        setCategory(e.target.value as Exclude<ProjectCategory, 'all'>)
                      }
                      className={inputCls}
                    >
                      <option value="business">Business Website</option>
                      <option value="ecommerce">E-Commerce Website</option>
                      <option value="web-apps">Web Apps</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#c6d3f7] mb-1.5">
                      Year
                    </label>
                    <input
                      type="text"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      maxLength={10}
                      placeholder="2026"
                      className={inputCls}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-[#c6d3f7] mb-1.5">
                      Live Website URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={liveUrl}
                      onChange={(e) => setLiveUrl(e.target.value)}
                      maxLength={300}
                      placeholder="https://example.com"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#c6d3f7] mb-1.5">
                    Project Description (Short Card Summary) *
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={300}
                    placeholder="Responsive website built for high conversion..."
                    className={inputCls}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#c6d3f7] mb-1.5">
                    Detailed Overview (Modal Description)
                  </label>
                  <textarea
                    rows={3}
                    value={longDescription}
                    onChange={(e) => setLongDescription(e.target.value)}
                    maxLength={1200}
                    placeholder="Full details of the project architecture, client goals, and speed..."
                    className={`${inputCls} resize-none`}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#c6d3f7] mb-1.5">
                      Website Features (One feature per line)
                    </label>
                    <textarea
                      rows={4}
                      value={featuresText}
                      onChange={(e) => setFeaturesText(e.target.value)}
                      className={`${inputCls} resize-none`}
                    />
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#c6d3f7] mb-1.5">
                        Tech Stack (Comma separated)
                      </label>
                      <input
                        type="text"
                        value={techStackInput}
                        onChange={(e) => setTechStackInput(e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#c6d3f7] mb-1.5">
                        Project Image (Upload or Image URL)
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#2f4280] bg-[#0e1740] text-xs font-semibold text-white hover:border-[#8f44ff] cursor-pointer">
                          <Upload className="w-3.5 h-3.5 text-[#a855f7]" />
                          <span>Upload Image</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(e) =>
                              handleImageFileSelect(e.target.files?.[0], setThumbnailUrl, 900)
                            }
                          />
                        </label>
                        {thumbnailUrl && (
                          <button
                            type="button"
                            onClick={() => setThumbnailUrl('')}
                            className="px-3 py-2 rounded-xl border border-rose-500/40 bg-rose-950/35 text-xs text-rose-200 cursor-pointer"
                          >
                            Clear Image
                          </button>
                        )}
                      </div>
                      <input
                        type="url"
                        value={thumbnailUrl.startsWith('data:') ? '' : thumbnailUrl}
                        onChange={(e) => setThumbnailUrl(e.target.value)}
                        placeholder="https://... (optional)"
                        className={`${inputCls} mt-2`}
                      />
                    </div>
                  </div>
                </div>

                {isSafeImageSrc(thumbnailUrl) && (
                  <div className="rounded-xl border border-[#24346b] bg-[#070d26] p-3 flex items-center gap-3">
                    <img
                      src={thumbnailUrl}
                      alt="Project preview"
                      referrerPolicy="no-referrer"
                      className="w-24 h-16 rounded-lg object-cover border border-[#2f4280]"
                    />
                    <span className="text-xs text-[#95a7d8]">Project thumbnail preview ready</span>
                  </div>
                )}

                {projectError && (
                  <div className="p-3 rounded-xl border border-rose-500/45 bg-rose-950/45 text-xs text-rose-200">
                    {projectError}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={projectBusy}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#8b3eff] to-[#4f46e5] text-sm font-bold text-white shadow-lg hover:brightness-110 transition-all cursor-pointer disabled:opacity-60"
                  >
                    <Save className="w-4 h-4" />
                    <span>
                      {projectBusy
                        ? 'Saving...'
                        : editingId
                          ? 'Save Project Changes'
                          : 'Publish Project'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetProjectForm();
                      setView('overview');
                    }}
                    className="px-4 py-3 rounded-xl border border-[#2a3c78] bg-[#0b1336] text-xs font-semibold text-[#c7d3f7] hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* 3. EDIT BANNER VIEW */}
            {view === 'edit-banner' && (
              <form
                onSubmit={(e) => handleSaveSiteConfig(e, 'Homepage banner updated in real time')}
                className="rounded-2xl border border-[#233267] bg-[#0a1130]/95 p-5 sm:p-6 space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#c6d3f7] mb-1.5">
                      Availability Badge
                    </label>
                    <input
                      type="text"
                      value={formConfig.availabilityText}
                      onChange={(e) => updateField('availabilityText', e.target.value)}
                      maxLength={80}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#c6d3f7] mb-1.5">
                      Banner Subtitle
                    </label>
                    <input
                      type="text"
                      value={formConfig.bannerSubtitle}
                      onChange={(e) => updateField('bannerSubtitle', e.target.value)}
                      maxLength={100}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#c6d3f7] mb-1.5">
                      Banner Greeting
                    </label>
                    <input
                      type="text"
                      value={formConfig.bannerGreeting}
                      onChange={(e) => updateField('bannerGreeting', e.target.value)}
                      maxLength={60}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#c6d3f7] mb-1.5">
                      Banner Highlight Name
                    </label>
                    <input
                      type="text"
                      value={formConfig.bannerHighlight}
                      onChange={(e) => updateField('bannerHighlight', e.target.value)}
                      maxLength={60}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#c6d3f7] mb-1.5">
                    Banner Description
                  </label>
                  <textarea
                    rows={3}
                    value={formConfig.bannerDescription}
                    onChange={(e) => updateField('bannerDescription', e.target.value)}
                    maxLength={300}
                    className={`${inputCls} resize-none`}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#c6d3f7] mb-1.5">
                      Portfolio CTA Button Text
                    </label>
                    <input
                      type="text"
                      value={formConfig.portfolioCtaText}
                      onChange={(e) => updateField('portfolioCtaText', e.target.value)}
                      maxLength={40}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#c6d3f7] mb-1.5">
                      Contact CTA Button Text
                    </label>
                    <input
                      type="text"
                      value={formConfig.contactCtaText}
                      onChange={(e) => updateField('contactCtaText', e.target.value)}
                      maxLength={40}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-[#24346b] bg-[#070d26] p-4 flex flex-col sm:flex-row items-center gap-4">
                  <img
                    src={safePreviewBanner}
                    alt="Banner preview"
                    referrerPolicy="no-referrer"
                    className="w-28 h-24 rounded-xl object-contain border border-[#2f4280] bg-[#0b1335] shrink-0"
                  />
                  <div className="flex-1 w-full space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#2f4280] bg-[#0e1740] text-xs font-semibold text-white hover:border-[#8f44ff] cursor-pointer">
                        <Upload className="w-3.5 h-3.5 text-[#a855f7]" />
                        <span>Upload Banner Image</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(e) =>
                            handleImageFileSelect(
                              e.target.files?.[0],
                              (val) => updateField('bannerImageUrl', val),
                              960
                            )
                          }
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          updateField('bannerImageUrl', DEFAULT_SITE_CONFIG.bannerImageUrl)
                        }
                        className="px-3 py-2 rounded-xl border border-[#2f4280] bg-[#0b1335] text-xs font-semibold text-[#c7d3f7] hover:text-white cursor-pointer"
                      >
                        Reset Default Artwork
                      </button>
                    </div>
                    <input
                      type="text"
                      value={
                        formConfig.bannerImageUrl.startsWith('data:')
                          ? ''
                          : formConfig.bannerImageUrl
                      }
                      onChange={(e) => updateField('bannerImageUrl', e.target.value)}
                      placeholder="/assets/crops/hero_art.png or https://..."
                      className={inputCls}
                    />
                  </div>
                </div>

                {configError && (
                  <div className="p-3 rounded-xl border border-rose-500/45 bg-rose-950/45 text-xs text-rose-200">
                    {configError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={configBusy}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#8b3eff] to-[#4f46e5] text-sm font-bold text-white shadow-lg hover:brightness-110 transition-all cursor-pointer disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  <span>{configBusy ? 'Saving...' : 'Save Banner Settings'}</span>
                </button>
              </form>
            )}

            {/* 4. WEBSITE LOGO VIEW */}
            {view === 'website-logo' && (
              <form
                onSubmit={(e) => handleSaveSiteConfig(e, 'Brand logo settings updated live')}
                className="rounded-2xl border border-[#233267] bg-[#0a1130]/95 p-5 sm:p-6 space-y-5"
              >
                <div className="rounded-xl border border-[#24346b] bg-[#070d26] p-4 flex items-center gap-4">
                  {safePreviewLogo ? (
                    <img
                      src={safePreviewLogo}
                      alt="Brand logo preview"
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 rounded-xl object-cover border border-[#3d56a8]"
                    />
                  ) : (
                    <MjLogoMark className="w-14 h-14 shrink-0" />
                  )}
                  <div>
                    <div className="font-display text-lg font-extrabold text-white">
                      {formConfig.brandName || 'MJ LAB'}
                    </div>
                    <div className="text-xs text-[#9fb0df]">
                      {formConfig.brandSubtitle || 'Web Developer'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#c6d3f7] mb-1.5">
                      Brand Name
                    </label>
                    <input
                      type="text"
                      value={formConfig.brandName}
                      onChange={(e) => updateField('brandName', e.target.value)}
                      maxLength={60}
                      className={inputCls}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#c6d3f7] mb-1.5">
                      Brand Subtitle
                    </label>
                    <input
                      type="text"
                      value={formConfig.brandSubtitle}
                      onChange={(e) => updateField('brandSubtitle', e.target.value)}
                      maxLength={60}
                      className={inputCls}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#c6d3f7] mb-1.5">
                      Header Button Text
                    </label>
                    <input
                      type="text"
                      value={formConfig.hireButtonText}
                      onChange={(e) => updateField('hireButtonText', e.target.value)}
                      maxLength={40}
                      className={inputCls}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2.5">
                  <label className="block text-xs font-semibold text-[#c6d3f7]">
                    Custom Logo Image (Upload or URL)
                  </label>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <label className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-[#2f4280] bg-[#0e1740] text-xs font-semibold text-white hover:border-[#8f44ff] cursor-pointer">
                      <Upload className="w-3.5 h-3.5 text-[#a855f7]" />
                      <span>Upload Logo File</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) =>
                          handleImageFileSelect(
                            e.target.files?.[0],
                            (val) => updateField('logoUrl', val),
                            512
                          )
                        }
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => updateField('logoUrl', '')}
                      className="px-3.5 py-2.5 rounded-xl border border-[#2f4280] bg-[#0b1335] text-xs font-semibold text-[#c7d3f7] hover:text-white cursor-pointer"
                    >
                      Use Default MJ Logo
                    </button>
                  </div>
                  <input
                    type="url"
                    value={formConfig.logoUrl.startsWith('data:') ? '' : formConfig.logoUrl}
                    onChange={(e) => updateField('logoUrl', e.target.value)}
                    placeholder="https://example.com/logo.png (optional)"
                    className={inputCls}
                  />
                </div>

                {configError && (
                  <div className="p-3 rounded-xl border border-rose-500/45 bg-rose-950/45 text-xs text-rose-200">
                    {configError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={configBusy}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#8b3eff] to-[#4f46e5] text-sm font-bold text-white shadow-lg hover:brightness-110 transition-all cursor-pointer disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  <span>{configBusy ? 'Saving...' : 'Save Logo Settings'}</span>
                </button>
              </form>
            )}

            {/* 5. VISITORS ANALYTICS REPORT VIEW */}
            {view === 'visitors' && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <div className="rounded-2xl border border-[#233267] bg-[#0a1130]/95 p-4">
                    <div className="text-xs text-[#95a7d8]">Total Visitors</div>
                    <div className="mt-2 font-display text-2xl font-extrabold text-white tabular-nums">
                      {analytics.totalVisitors.toLocaleString()}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[#233267] bg-[#0a1130]/95 p-4">
                    <div className="text-xs text-[#95a7d8]">Today&apos;s Visitors</div>
                    <div className="mt-2 font-display text-2xl font-extrabold text-[#34d399] tabular-nums">
                      {analytics.todayVisitors.toLocaleString()}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[#233267] bg-[#0a1130]/95 p-4">
                    <div className="text-xs text-[#95a7d8]">Total Contact Clicks</div>
                    <div className="mt-2 font-display text-2xl font-extrabold text-[#fbbf24] tabular-nums">
                      {analytics.totalContactClicks.toLocaleString()}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[#233267] bg-[#0a1130]/95 p-4">
                    <div className="text-xs text-[#95a7d8]">Today&apos;s Contact Clicks</div>
                    <div className="mt-2 font-display text-2xl font-extrabold text-[#38bdf8] tabular-nums">
                      {analytics.todayContactClicks.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#233267] bg-[#0a1130]/95 p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-display text-base font-bold text-white">
                      Daily Visitor Breakdown (Last 7 Active Days)
                    </h2>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void onRefreshData()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#2b3f7d] bg-[#0e1740] text-xs font-semibold text-[#e2e8ff] hover:border-[#8f44ff] cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Refresh</span>
                      </button>

                      {confirmResetAnalytics ? (
                        <span className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleResetAnalytics}
                            className="px-3 py-1.5 rounded-xl bg-rose-600 text-xs font-bold text-white cursor-pointer"
                          >
                            Confirm Reset
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmResetAnalytics(false)}
                            className="px-3 py-1.5 rounded-xl bg-[#16214f] text-xs text-[#c7d3f7] cursor-pointer"
                          >
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmResetAnalytics(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/40 bg-rose-950/35 text-xs font-semibold text-rose-200 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Reset Counters</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {analytics.dailyHistory.length === 0 ? (
                    <div className="rounded-xl border border-[#1d2a58] bg-[#070d26] p-6 text-center text-xs text-[#95a7d8]">
                      No visitor events recorded yet. Visits on the public portfolio appear here
                      automatically in real time.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-[#1c2854] text-[11px] uppercase tracking-wider text-[#8fa1d4]">
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3 text-right">Visitors</th>
                            <th className="py-2.5 px-3 text-right">Contact Clicks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#18224a] text-sm">
                          {analytics.dailyHistory.map((row) => (
                            <tr key={row.dateKey} className="hover:bg-[#0e1740]/60">
                              <td className="py-2.5 px-3 font-mono text-xs text-white">
                                {row.dateKey}
                              </td>
                              <td className="py-2.5 px-3 text-right font-semibold text-[#34d399] tabular-nums">
                                {row.visitors.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-right font-semibold text-[#fbbf24] tabular-nums">
                                {row.contactClicks.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 6. TELEGRAM LINK, WHATSAPP & SOCIAL LINKS VIEW */}
            {view === 'telegram-link' && (
              <form
                onSubmit={(e) =>
                  handleSaveSiteConfig(e, 'Telegram, WhatsApp & social links updated live')
                }
                className="rounded-2xl border border-[#233267] bg-[#0a1130]/95 p-5 sm:p-6 space-y-5"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#c6d3f7] mb-1.5">
                      Telegram Group / Account URL
                    </label>
                    <input
                      type="url"
                      value={formConfig.telegramGroupUrl}
                      onChange={(e) => updateField('telegramGroupUrl', e.target.value)}
                      placeholder="https://t.me/your_group_or_username"
                      maxLength={240}
                      className={inputCls}
                    />
                    {isSafeHttpUrl(formConfig.telegramGroupUrl) && (
                      <a
                        href={formConfig.telegramGroupUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-semibold text-[#38bdf8] hover:underline"
                      >
                        <span>Test Telegram Link</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#c6d3f7] mb-1.5">
                      WhatsApp Number (with country code) *
                    </label>
                    <input
                      type="text"
                      value={formConfig.whatsappNumber}
                      onChange={(e) => updateField('whatsappNumber', e.target.value)}
                      placeholder="8801700000000"
                      maxLength={20}
                      className={inputCls}
                      required
                    />
                    <a
                      href={buildWhatsAppUrl(formConfig.whatsappNumber, formConfig.whatsappGreeting)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-semibold text-[#34d399] hover:underline"
                    >
                      <span>Test WhatsApp Direct Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#c6d3f7] mb-1.5">
                    Default WhatsApp Greeting Message
                  </label>
                  <input
                    type="text"
                    value={formConfig.whatsappGreeting}
                    onChange={(e) => updateField('whatsappGreeting', e.target.value)}
                    maxLength={160}
                    className={inputCls}
                  />
                </div>

                <div className="pt-3 border-t border-[#1c2854]">
                  <h3 className="font-display text-sm font-bold text-white mb-3">
                    Social Media Links
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#c6d3f7] mb-1.5">
                        Facebook URL
                      </label>
                      <input
                        type="url"
                        value={formConfig.facebookUrl}
                        onChange={(e) => updateField('facebookUrl', e.target.value)}
                        placeholder="https://facebook.com/..."
                        maxLength={240}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#c6d3f7] mb-1.5">
                        YouTube URL
                      </label>
                      <input
                        type="url"
                        value={formConfig.youtubeUrl}
                        onChange={(e) => updateField('youtubeUrl', e.target.value)}
                        placeholder="https://youtube.com/..."
                        maxLength={240}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#c6d3f7] mb-1.5">
                        GitHub URL
                      </label>
                      <input
                        type="url"
                        value={formConfig.githubUrl}
                        onChange={(e) => updateField('githubUrl', e.target.value)}
                        placeholder="https://github.com/..."
                        maxLength={240}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#c6d3f7] mb-1.5">
                        LinkedIn URL
                      </label>
                      <input
                        type="url"
                        value={formConfig.linkedinUrl}
                        onChange={(e) => updateField('linkedinUrl', e.target.value)}
                        placeholder="https://linkedin.com/in/..."
                        maxLength={240}
                        className={inputCls}
                      />
                    </div>
                  </div>
                </div>

                {configError && (
                  <div className="p-3 rounded-xl border border-rose-500/45 bg-rose-950/45 text-xs text-rose-200">
                    {configError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={configBusy}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#8b3eff] to-[#4f46e5] text-sm font-bold text-white shadow-lg hover:brightness-110 transition-all cursor-pointer disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  <span>{configBusy ? 'Saving...' : 'Save Links & Messaging'}</span>
                </button>
              </form>
            )}

            {/* 7. SITE SETTINGS (A-TO-Z USER PANEL CONTROL) VIEW */}
            {view === 'site-settings' && (
              <div className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'skills' as SiteSettingsSubTab, label: `My Skills (${skills.length})` },
                    { id: 'about-cards' as SiteSettingsSubTab, label: 'About & 3 Service Cards' },
                    { id: 'footer-headings' as SiteSettingsSubTab, label: 'Headings & Footer' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSettingsTab(tab.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        settingsTab === tab.id
                          ? 'bg-gradient-to-r from-[#8b3eff] to-[#4f46e5] text-white'
                          : 'border border-[#24346b] bg-[#0a1130] text-[#b9c7eb] hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {settingsTab === 'skills' && (
                  <div className="space-y-5">
                    <form
                      onSubmit={handleSaveSkill}
                      className="rounded-2xl border border-[#233267] bg-[#0a1130]/95 p-5 space-y-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-display text-base font-bold text-white">
                          {editingSkillId ? 'Edit Skill' : 'Add New Skill'}
                        </h3>
                        <button
                          type="button"
                          onClick={handleSeedSkills}
                          disabled={skillBusy}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#2b3f7d] bg-[#0e1740] text-xs font-semibold text-[#c7d3f7] hover:text-white cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restore Default Skills</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
                        <div>
                          <label className="block text-xs font-semibold text-[#c6d3f7] mb-1.5">
                            Skill Name *
                          </label>
                          <input
                            type="text"
                            value={skillName}
                            onChange={(e) => setSkillName(e.target.value)}
                            maxLength={40}
                            placeholder="e.g. Next.js"
                            className={inputCls}
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#c6d3f7] mb-1.5">
                            Role / Subtitle
                          </label>
                          <input
                            type="text"
                            value={skillRole}
                            onChange={(e) => setSkillRole(e.target.value)}
                            maxLength={60}
                            placeholder="Full-Stack React"
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#c6d3f7] mb-1.5">
                            Icon Style
                          </label>
                          <select
                            value={skillIconKey}
                            onChange={(e) => setSkillIconKey(e.target.value)}
                            className={inputCls}
                          >
                            {SKILL_ICON_OPTIONS.map((opt) => (
                              <option key={opt.key} value={opt.key}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#c6d3f7] mb-1.5">
                            Order
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={1000}
                            value={skillOrder}
                            onChange={(e) => setSkillOrder(e.target.value)}
                            className={inputCls}
                          />
                        </div>
                      </div>

                      {skillError && (
                        <div className="p-3 rounded-xl border border-rose-500/45 bg-rose-950/45 text-xs text-rose-200">
                          {skillError}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          type="submit"
                          disabled={skillBusy}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8b3eff] to-[#4f46e5] text-xs font-bold text-white cursor-pointer disabled:opacity-60"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            {skillBusy
                              ? 'Saving...'
                              : editingSkillId
                                ? 'Update Skill'
                                : 'Add Skill'}
                          </span>
                        </button>
                        {editingSkillId && (
                          <button
                            type="button"
                            onClick={resetSkillForm}
                            className="px-4 py-2.5 rounded-xl border border-[#2a3c78] bg-[#0b1336] text-xs text-[#c7d3f7] cursor-pointer"
                          >
                            Cancel Edit
                          </button>
                        )}
                      </div>
                    </form>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {skills.map((sk) => (
                        <div
                          key={sk.id}
                          className="rounded-2xl border border-[#233267] bg-[#0a1130]/95 p-3.5 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="scale-75 origin-left shrink-0">
                              <SkillIcon id={sk.iconKey} />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-sm text-white truncate">{sk.name}</div>
                              <div className="text-[11px] text-[#95a7d8] truncate">
                                #{sk.order} · {sk.role}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartEditSkill(sk)}
                              className="p-2 rounded-lg border border-[#2a3c78] bg-[#0e1740] text-[#c7d3f7] hover:text-white cursor-pointer"
                              aria-label={`Edit ${sk.name}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSkill(sk.id)}
                              className="p-2 rounded-lg border border-rose-500/35 bg-rose-950/35 text-rose-300 hover:bg-rose-600 hover:text-white cursor-pointer"
                              aria-label={`Delete ${sk.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {settingsTab === 'about-cards' && (
                  <form
                    onSubmit={(e) => handleSaveSiteConfig(e, 'About & Service Cards updated live')}
                    className="rounded-2xl border border-[#233267] bg-[#0a1130]/95 p-5 sm:p-6 space-y-5"
                  >
                    <div className="space-y-4">
                      <h3 className="font-display text-base font-bold text-white">About Me Card</h3>
                      <div>
                        <label className="block text-xs font-semibold text-[#c6d3f7] mb-1.5">
                          About Title
                        </label>
                        <input
                          type="text"
                          value={formConfig.aboutTitle}
                          onChange={(e) => updateField('aboutTitle', e.target.value)}
                          maxLength={60}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#c6d3f7] mb-1.5">
                          About Description
                        </label>
                        <textarea
                          rows={3}
                          value={formConfig.aboutDescription}
                          onChange={(e) => updateField('aboutDescription', e.target.value)}
                          maxLength={500}
                          className={`${inputCls} resize-none`}
                        />
                      </div>
                      <div className="rounded-xl border border-[#24346b] bg-[#070d26] p-3.5 flex flex-col sm:flex-row items-center gap-3.5">
                        <img
                          src={safePreviewAbout}
                          alt="About preview"
                          referrerPolicy="no-referrer"
                          className="w-20 h-16 rounded-lg object-contain border border-[#2f4280]"
                        />
                        <div className="flex-1 w-full space-y-2">
                          <div className="flex flex-wrap gap-2">
                            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2f4280] bg-[#0e1740] text-xs font-semibold text-white cursor-pointer">
                              <Upload className="w-3.5 h-3.5 text-[#a855f7]" />
                              <span>Upload About Visual</span>
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className="hidden"
                                onChange={(e) =>
                                  handleImageFileSelect(
                                    e.target.files?.[0],
                                    (val) => updateField('aboutImageUrl', val),
                                    800
                                  )
                                }
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                updateField('aboutImageUrl', DEFAULT_SITE_CONFIG.aboutImageUrl)
                              }
                              className="px-3 py-1.5 rounded-lg border border-[#2f4280] bg-[#0b1335] text-xs text-[#c7d3f7] cursor-pointer"
                            >
                              Reset Default
                            </button>
                          </div>
                          <input
                            type="text"
                            value={
                              formConfig.aboutImageUrl.startsWith('data:')
                                ? ''
                                : formConfig.aboutImageUrl
                            }
                            onChange={(e) => updateField('aboutImageUrl', e.target.value)}
                            className={inputCls}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#1c2854] space-y-3">
                      <h3 className="font-display text-base font-bold text-white">
                        3 Quick Service Cards
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                        <div className="rounded-xl border border-[#24346b] bg-[#070d26] p-3.5 space-y-2">
                          <div className="text-[11px] font-bold text-[#38bdf8]">Card 1</div>
                          <input
                            type="text"
                            value={formConfig.quickCard1Title}
                            onChange={(e) => updateField('quickCard1Title', e.target.value)}
                            maxLength={60}
                            className={inputCls}
                          />
                          <input
                            type="text"
                            value={formConfig.quickCard1Subtitle}
                            onChange={(e) => updateField('quickCard1Subtitle', e.target.value)}
                            maxLength={120}
                            className={inputCls}
                          />
                        </div>
                        <div className="rounded-xl border border-[#24346b] bg-[#070d26] p-3.5 space-y-2">
                          <div className="text-[11px] font-bold text-[#a855f7]">Card 2</div>
                          <input
                            type="text"
                            value={formConfig.quickCard2Title}
                            onChange={(e) => updateField('quickCard2Title', e.target.value)}
                            maxLength={60}
                            className={inputCls}
                          />
                          <input
                            type="text"
                            value={formConfig.quickCard2Subtitle}
                            onChange={(e) => updateField('quickCard2Subtitle', e.target.value)}
                            maxLength={120}
                            className={inputCls}
                          />
                        </div>
                        <div className="rounded-xl border border-[#24346b] bg-[#070d26] p-3.5 space-y-2">
                          <div className="text-[11px] font-bold text-[#22d3ee]">Card 3</div>
                          <input
                            type="text"
                            value={formConfig.quickCard3Title}
                            onChange={(e) => updateField('quickCard3Title', e.target.value)}
                            maxLength={60}
                            className={inputCls}
                          />
                          <input
                            type="text"
                            value={formConfig.quickCard3Subtitle}
                            onChange={(e) => updateField('quickCard3Subtitle', e.target.value)}
                            maxLength={120}
                            className={inputCls}
                          />
                        </div>
                      </div>
                    </div>

                    {configError && (
                      <div className="p-3 rounded-xl border border-rose-500/45 bg-rose-950/45 text-xs text-rose-200">
                        {configError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={configBusy}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#8b3eff] to-[#4f46e5] text-sm font-bold text-white shadow-lg cursor-pointer disabled:opacity-60"
                    >
                      <Save className="w-4 h-4" />
                      <span>{configBusy ? 'Saving...' : 'Save About & Cards'}</span>
                    </button>
                  </form>
                )}

                {settingsTab === 'footer-headings' && (
                  <form
                    onSubmit={(e) => handleSaveSiteConfig(e, 'Headings & Footer saved live')}
                    className="rounded-2xl border border-[#233267] bg-[#0a1130]/95 p-5 sm:p-6 space-y-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#c6d3f7] mb-1.5">
                          Skills Section Heading
                        </label>
                        <input
                          type="text"
                          value={formConfig.skillsHeading}
                          onChange={(e) => updateField('skillsHeading', e.target.value)}
                          maxLength={60}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#c6d3f7] mb-1.5">
                          Portfolio Heading
                        </label>
                        <input
                          type="text"
                          value={formConfig.portfolioHeading}
                          onChange={(e) => updateField('portfolioHeading', e.target.value)}
                          maxLength={60}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#c6d3f7] mb-1.5">
                          Portfolio Subheading
                        </label>
                        <input
                          type="text"
                          value={formConfig.portfolioSubheading}
                          onChange={(e) => updateField('portfolioSubheading', e.target.value)}
                          maxLength={120}
                          className={inputCls}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#c6d3f7] mb-1.5">
                          Footer Copyright Rights
                        </label>
                        <input
                          type="text"
                          value={formConfig.footerRightsText}
                          onChange={(e) => updateField('footerRightsText', e.target.value)}
                          maxLength={120}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#c6d3f7] mb-1.5">
                          Footer Credit Text
                        </label>
                        <input
                          type="text"
                          value={formConfig.footerCreditText}
                          onChange={(e) => updateField('footerCreditText', e.target.value)}
                          maxLength={120}
                          className={inputCls}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#c6d3f7] mb-1.5">
                          Privacy Policy Text
                        </label>
                        <textarea
                          rows={3}
                          value={formConfig.privacyPolicyText}
                          onChange={(e) => updateField('privacyPolicyText', e.target.value)}
                          maxLength={800}
                          className={`${inputCls} resize-none`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#c6d3f7] mb-1.5">
                          Terms & Conditions Text
                        </label>
                        <textarea
                          rows={3}
                          value={formConfig.termsText}
                          onChange={(e) => updateField('termsText', e.target.value)}
                          maxLength={800}
                          className={`${inputCls} resize-none`}
                        />
                      </div>
                    </div>

                    {configError && (
                      <div className="p-3 rounded-xl border border-rose-500/45 bg-rose-950/45 text-xs text-rose-200">
                        {configError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={configBusy}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#8b3eff] to-[#4f46e5] text-sm font-bold text-white shadow-lg cursor-pointer disabled:opacity-60"
                    >
                      <Save className="w-4 h-4" />
                      <span>{configBusy ? 'Saving...' : 'Save Headings & Footer'}</span>
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
