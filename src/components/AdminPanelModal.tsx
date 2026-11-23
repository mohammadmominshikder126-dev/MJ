import React, { useEffect, useState } from 'react';
import { User, signInWithPopup, signOut } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  CheckCircle2,
  Code2,
  ExternalLink,
  ImagePlus,
  LayoutTemplate,
  LogOut,
  MessageCircle,
  Pencil,
  Plus,
  Save,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  buildWhatsAppUrl,
  categoryLabelFromId,
  DEFAULT_PROJECTS,
  DEFAULT_SITE_CONFIG,
  DEFAULT_SKILLS,
  isSafeHttpUrl,
  isSafeImageSrc,
  ProjectCategory,
  ProjectItem,
  SiteConfig,
  SKILL_ICON_OPTIONS,
  SkillItem,
} from '../lib/portfolioData';
import {
  ADMIN_EMAIL,
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import { SkillIcon } from './BrandAndSkillIcons';

interface AdminPanelModalProps {
  open: boolean;
  user: User | null;
  isAdminUser: boolean;
  authReady: boolean;
  projects: ProjectItem[];
  hasFirestoreProjects: boolean;
  skills: SkillItem[];
  hasFirestoreSkills: boolean;
  siteConfig: SiteConfig;
  onClose: () => void;
  onNotify: (message: string) => void;
}

type AdminTab = 'upload' | 'manage' | 'banner' | 'sections' | 'social';

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

export function AdminPanelModal({
  open,
  user,
  isAdminUser,
  authReady,
  projects,
  hasFirestoreProjects,
  skills,
  hasFirestoreSkills,
  siteConfig,
  onClose,
  onNotify,
}: AdminPanelModalProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('upload');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Project Upload / Edit Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Exclude<ProjectCategory, 'all'>>('business');
  const [description, setDescription] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [featuresText, setFeaturesText] = useState(
    'Responsive mobile & desktop design\nFast loading & SEO friendly\nDirect WhatsApp contact integration'
  );
  const [liveUrl, setLiveUrl] = useState('');
  const [techStackInput, setTechStackInput] = useState('React, Tailwind CSS, Firebase');
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

  // Full A-to-Z SiteConfig State
  const [brandName, setBrandName] = useState(siteConfig.brandName);
  const [brandSubtitle, setBrandSubtitle] = useState(siteConfig.brandSubtitle);
  const [logoUrl, setLogoUrl] = useState(siteConfig.logoUrl);
  const [hireButtonText, setHireButtonText] = useState(siteConfig.hireButtonText);
  const [availabilityText, setAvailabilityText] = useState(siteConfig.availabilityText);
  const [bannerGreeting, setBannerGreeting] = useState(siteConfig.bannerGreeting);
  const [bannerHighlight, setBannerHighlight] = useState(siteConfig.bannerHighlight);
  const [bannerSubtitle, setBannerSubtitle] = useState(siteConfig.bannerSubtitle);
  const [bannerDescription, setBannerDescription] = useState(siteConfig.bannerDescription);
  const [bannerImageUrl, setBannerImageUrl] = useState(siteConfig.bannerImageUrl);
  const [portfolioCtaText, setPortfolioCtaText] = useState(siteConfig.portfolioCtaText);
  const [contactCtaText, setContactCtaText] = useState(siteConfig.contactCtaText);

  const [skillsHeading, setSkillsHeading] = useState(siteConfig.skillsHeading);
  const [portfolioHeading, setPortfolioHeading] = useState(siteConfig.portfolioHeading);
  const [portfolioSubheading, setPortfolioSubheading] = useState(siteConfig.portfolioSubheading);
  const [aboutTitle, setAboutTitle] = useState(siteConfig.aboutTitle);
  const [aboutDescription, setAboutDescription] = useState(siteConfig.aboutDescription);
  const [aboutImageUrl, setAboutImageUrl] = useState(siteConfig.aboutImageUrl);

  const [quickCard1Title, setQuickCard1Title] = useState(siteConfig.quickCard1Title);
  const [quickCard1Subtitle, setQuickCard1Subtitle] = useState(siteConfig.quickCard1Subtitle);
  const [quickCard2Title, setQuickCard2Title] = useState(siteConfig.quickCard2Title);
  const [quickCard2Subtitle, setQuickCard2Subtitle] = useState(siteConfig.quickCard2Subtitle);
  const [quickCard3Title, setQuickCard3Title] = useState(siteConfig.quickCard3Title);
  const [quickCard3Subtitle, setQuickCard3Subtitle] = useState(siteConfig.quickCard3Subtitle);

  const [whatsappNumber, setWhatsappNumber] = useState(siteConfig.whatsappNumber);
  const [whatsappGreeting, setWhatsappGreeting] = useState(siteConfig.whatsappGreeting);
  const [telegramGroupUrl, setTelegramGroupUrl] = useState(siteConfig.telegramGroupUrl);
  const [facebookUrl, setFacebookUrl] = useState(siteConfig.facebookUrl);
  const [youtubeUrl, setYoutubeUrl] = useState(siteConfig.youtubeUrl);
  const [githubUrl, setGithubUrl] = useState(siteConfig.githubUrl);
  const [linkedinUrl, setLinkedinUrl] = useState(siteConfig.linkedinUrl);

  const [footerRightsText, setFooterRightsText] = useState(siteConfig.footerRightsText);
  const [footerCreditText, setFooterCreditText] = useState(siteConfig.footerCreditText);
  const [privacyPolicyText, setPrivacyPolicyText] = useState(siteConfig.privacyPolicyText);
  const [termsText, setTermsText] = useState(siteConfig.termsText);

  const [configBusy, setConfigBusy] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    setBrandName(siteConfig.brandName);
    setBrandSubtitle(siteConfig.brandSubtitle);
    setLogoUrl(siteConfig.logoUrl);
    setHireButtonText(siteConfig.hireButtonText);
    setAvailabilityText(siteConfig.availabilityText);
    setBannerGreeting(siteConfig.bannerGreeting);
    setBannerHighlight(siteConfig.bannerHighlight);
    setBannerSubtitle(siteConfig.bannerSubtitle);
    setBannerDescription(siteConfig.bannerDescription);
    setBannerImageUrl(siteConfig.bannerImageUrl);
    setPortfolioCtaText(siteConfig.portfolioCtaText);
    setContactCtaText(siteConfig.contactCtaText);
    setSkillsHeading(siteConfig.skillsHeading);
    setPortfolioHeading(siteConfig.portfolioHeading);
    setPortfolioSubheading(siteConfig.portfolioSubheading);
    setAboutTitle(siteConfig.aboutTitle);
    setAboutDescription(siteConfig.aboutDescription);
    setAboutImageUrl(siteConfig.aboutImageUrl);
    setQuickCard1Title(siteConfig.quickCard1Title);
    setQuickCard1Subtitle(siteConfig.quickCard1Subtitle);
    setQuickCard2Title(siteConfig.quickCard2Title);
    setQuickCard2Subtitle(siteConfig.quickCard2Subtitle);
    setQuickCard3Title(siteConfig.quickCard3Title);
    setQuickCard3Subtitle(siteConfig.quickCard3Subtitle);
    setWhatsappNumber(siteConfig.whatsappNumber);
    setWhatsappGreeting(siteConfig.whatsappGreeting);
    setTelegramGroupUrl(siteConfig.telegramGroupUrl);
    setFacebookUrl(siteConfig.facebookUrl);
    setYoutubeUrl(siteConfig.youtubeUrl);
    setGithubUrl(siteConfig.githubUrl);
    setLinkedinUrl(siteConfig.linkedinUrl);
    setFooterRightsText(siteConfig.footerRightsText);
    setFooterCreditText(siteConfig.footerCreditText);
    setPrivacyPolicyText(siteConfig.privacyPolicyText);
    setTermsText(siteConfig.termsText);
  }, [siteConfig]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleGoogleLogin = async () => {
    setAuthError(null);
    setAuthBusy(true);
    try {
      await signInWithPopup(auth, googleProvider);
      onNotify('Signed in with Google');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    onNotify('Signed out of Admin Panel');
  };

  const resetProjectForm = () => {
    setEditingId(null);
    setTitle('');
    setCategory('business');
    setDescription('');
    setLongDescription('');
    setFeaturesText(
      'Responsive mobile & desktop design\nFast loading & SEO friendly\nDirect WhatsApp contact integration'
    );
    setLiveUrl('');
    setTechStackInput('React, Tailwind CSS, Firebase');
    setThumbnailUrl('');
    setProjectError(null);
  };

  const startEditingProject = (item: ProjectItem) => {
    setEditingId(item.id);
    setTitle(item.title);
    setCategory(item.category);
    setDescription(item.description);
    setLongDescription(item.longDescription);
    setFeaturesText(item.highlights.join('\n'));
    setLiveUrl(item.liveUrl || '');
    setTechStackInput(item.techStack.join(', '));
    setThumbnailUrl(item.thumbnailUrl || '');
    setProjectError(null);
    setActiveTab('upload');
  };

  const resetSkillForm = () => {
    setEditingSkillId(null);
    setSkillName('');
    setSkillRole('');
    setSkillIconKey('react');
    setSkillOrder(String(skills.length + 1));
    setSkillError(null);
  };

  const startEditingSkill = (skill: SkillItem) => {
    setEditingSkillId(skill.id);
    setSkillName(skill.name);
    setSkillRole(skill.role);
    setSkillIconKey(skill.iconKey);
    setSkillOrder(String(skill.order));
    setSkillError(null);
  };

  const handleUploadImage = async (
    file: File,
    setter: (val: string) => void,
    label: string,
    maxDim = 960
  ) => {
    try {
      const compressed = await compressImageFile(file, maxDim);
      setter(compressed);
      onNotify(`${label} ready to save`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Image upload failed.';
      setProjectError(msg);
      setConfigError(msg);
    }
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isAdminUser) return;
    setProjectError(null);

    const trimmedTitle = title.trim().slice(0, 100);
    const trimmedDesc = description.trim().slice(0, 300);
    const trimmedLong = (longDescription.trim() || trimmedDesc).slice(0, 1200);
    const trimmedLive = liveUrl.trim().slice(0, 300);
    const trimmedThumb = thumbnailUrl.trim();

    if (!trimmedTitle || !trimmedDesc) {
      setProjectError('Website name and short description are required.');
      return;
    }
    if (trimmedLive && !isSafeHttpUrl(trimmedLive)) {
      setProjectError('Live URL must start with http:// or https://.');
      return;
    }
    if (trimmedThumb && !isSafeImageSrc(trimmedThumb)) {
      setProjectError('Thumbnail must be a compressed image file or https:// URL.');
      return;
    }

    const techStack = techStackInput
      .split(',')
      .map((s) => s.trim().slice(0, 40))
      .filter(Boolean)
      .slice(0, 10);

    const highlights = featuresText
      .split(/\n|,/)
      .map((s) => s.trim().slice(0, 160))
      .filter(Boolean)
      .slice(0, 12);

    const safeTech = techStack.length > 0 ? techStack : ['React', 'Tailwind CSS'];
    const safeHighlights =
      highlights.length > 0
        ? highlights
        : ['Responsive desktop & mobile design', 'Fast performance & clean UI'];

    const projectId =
      editingId ||
      `${trimmedTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'site'}-${Date.now().toString(36)}`;

    const existingItem = editingId ? projects.find((p) => p.id === editingId) : undefined;
    const previewType = trimmedThumb
      ? 'custom'
      : existingItem && existingItem.previewType !== 'custom'
        ? existingItem.previewType
        : category === 'ecommerce'
          ? 'ecommerce'
          : category === 'business'
            ? 'business'
            : 'portfolio';

    setProjectBusy(true);
    try {
      const ref = doc(db, 'projects', projectId);
      if (editingId && existingItem && !existingItem.isDefault) {
        await setDoc(
          ref,
          {
            title: trimmedTitle,
            category,
            categoryLabel: categoryLabelFromId(category),
            description: trimmedDesc,
            longDescription: trimmedLong,
            year: existingItem.year || String(new Date().getFullYear()),
            techStack: safeTech,
            highlights: safeHighlights,
            previewType,
            liveUrl: trimmedLive,
            thumbnailUrl: trimmedThumb,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        onNotify(`"${trimmedTitle}" updated in real time!`);
      } else {
        await setDoc(ref, {
          title: trimmedTitle,
          category,
          categoryLabel: categoryLabelFromId(category),
          description: trimmedDesc,
          longDescription: trimmedLong,
          year: String(new Date().getFullYear()),
          techStack: safeTech,
          highlights: safeHighlights,
          previewType,
          liveUrl: trimmedLive,
          thumbnailUrl: trimmedThumb,
          authorId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        onNotify(`"${trimmedTitle}" published to portfolio in real time!`);
      }
      resetProjectForm();
      setActiveTab('manage');
    } catch (err) {
      handleFirestoreError(
        err,
        editingId ? OperationType.UPDATE : OperationType.CREATE,
        `projects/${projectId}`
      );
    } finally {
      setProjectBusy(false);
    }
  };

  const handleSeedDefaults = async () => {
    if (!user || !isAdminUser) return;
    setProjectBusy(true);
    try {
      const batch = writeBatch(db);
      for (const p of DEFAULT_PROJECTS) {
        batch.set(doc(db, 'projects', p.id), {
          title: p.title,
          category: p.category,
          categoryLabel: p.categoryLabel,
          description: p.description,
          longDescription: p.longDescription,
          year: p.year,
          techStack: p.techStack,
          highlights: p.highlights,
          previewType: p.previewType,
          liveUrl: p.liveUrl,
          thumbnailUrl: p.thumbnailUrl,
          authorId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
      onNotify('Starter websites synced to Firebase Firestore!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'projects');
    } finally {
      setProjectBusy(false);
    }
  };

  const handleDeleteProject = async (id: string, projectTitle: string) => {
    if (!user || !isAdminUser) return;
    try {
      await deleteDoc(doc(db, 'projects', id));
      onNotify(`Removed "${projectTitle}" from Firebase`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `projects/${id}`);
    }
  };

  const handleSeedDefaultSkills = async () => {
    if (!user || !isAdminUser) return;
    setSkillBusy(true);
    try {
      const batch = writeBatch(db);
      for (const s of DEFAULT_SKILLS) {
        batch.set(doc(db, 'skills', s.id), {
          name: s.name,
          role: s.role,
          iconKey: s.iconKey,
          order: s.order,
          authorId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
      onNotify('Starter skills synced to Firebase Firestore!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'skills');
    } finally {
      setSkillBusy(false);
    }
  };

  const handleSaveSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isAdminUser) return;
    setSkillError(null);

    const trimmedName = skillName.trim().slice(0, 40);
    const trimmedRole = (skillRole.trim() || 'Web Development').slice(0, 60);
    const parsedOrder = Math.min(1000, Math.max(0, Number(skillOrder) || 0));

    if (!trimmedName) {
      setSkillError('Skill name is required.');
      return;
    }

    const skillId =
      editingSkillId ||
      `${trimmedName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 32) || 'skill'}-${Date.now().toString(36)}`;

    const existingSkill = editingSkillId ? skills.find((s) => s.id === editingSkillId) : undefined;

    setSkillBusy(true);
    try {
      const ref = doc(db, 'skills', skillId);
      if (editingSkillId && existingSkill && !existingSkill.isDefault) {
        await setDoc(
          ref,
          {
            name: trimmedName,
            role: trimmedRole,
            iconKey: skillIconKey.slice(0, 30),
            order: parsedOrder,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        onNotify(`Skill "${trimmedName}" updated in real time!`);
      } else {
        await setDoc(ref, {
          name: trimmedName,
          role: trimmedRole,
          iconKey: skillIconKey.slice(0, 30),
          order: parsedOrder,
          authorId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        onNotify(`Skill "${trimmedName}" saved to Firebase!`);
      }
      resetSkillForm();
    } catch (err) {
      handleFirestoreError(
        err,
        editingSkillId ? OperationType.UPDATE : OperationType.CREATE,
        `skills/${skillId}`
      );
    } finally {
      setSkillBusy(false);
    }
  };

  const handleDeleteSkill = async (id: string, name: string) => {
    if (!user || !isAdminUser) return;
    try {
      await deleteDoc(doc(db, 'skills', id));
      onNotify(`Removed skill "${name}"`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `skills/${id}`);
    }
  };

  const handleSaveSiteConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isAdminUser) return;
    setConfigError(null);

    const cleanedWa = whatsappNumber.replace(/[^0-9+\-\s]/g, '').trim();
    if (cleanedWa.replace(/\D/g, '').length < 7) {
      setConfigError('Please enter a valid WhatsApp number with country code (7-15 digits).');
      return;
    }

    if (logoUrl.trim() && !isSafeImageSrc(logoUrl.trim())) {
      setConfigError('Logo must be a valid image file or https:// URL.');
      return;
    }
    if (bannerImageUrl.trim() && !isSafeImageSrc(bannerImageUrl.trim())) {
      setConfigError('Banner image must be a valid image file or https:// URL.');
      return;
    }
    if (aboutImageUrl.trim() && !isSafeImageSrc(aboutImageUrl.trim())) {
      setConfigError('About image must be a valid image file or https:// URL.');
      return;
    }

    const validateSocial = (u: string) =>
      !u.trim() ? '' : isSafeHttpUrl(u.trim()) ? u.trim().slice(0, 240) : null;
    const tg = validateSocial(telegramGroupUrl);
    const fb = validateSocial(facebookUrl);
    const yt = validateSocial(youtubeUrl);
    const gh = validateSocial(githubUrl);
    const li = validateSocial(linkedinUrl);

    if ([tg, fb, yt, gh, li].some((v) => v === null)) {
      setConfigError('Social and Telegram group links must start with http:// or https://.');
      return;
    }

    setConfigBusy(true);
    try {
      await setDoc(doc(db, 'siteConfig', 'main'), {
        brandName: (brandName.trim() || DEFAULT_SITE_CONFIG.brandName).slice(0, 60),
        brandSubtitle: (brandSubtitle.trim() || DEFAULT_SITE_CONFIG.brandSubtitle).slice(0, 60),
        logoUrl: logoUrl.trim(),
        hireButtonText: (hireButtonText.trim() || DEFAULT_SITE_CONFIG.hireButtonText).slice(0, 40),
        availabilityText: (availabilityText.trim() || DEFAULT_SITE_CONFIG.availabilityText).slice(0, 80),
        bannerGreeting: (bannerGreeting.trim() || DEFAULT_SITE_CONFIG.bannerGreeting).slice(0, 60),
        bannerHighlight: (bannerHighlight.trim() || DEFAULT_SITE_CONFIG.bannerHighlight).slice(0, 60),
        bannerSubtitle: (bannerSubtitle.trim() || DEFAULT_SITE_CONFIG.bannerSubtitle).slice(0, 100),
        bannerDescription: (bannerDescription.trim() || DEFAULT_SITE_CONFIG.bannerDescription).slice(0, 300),
        bannerImageUrl: bannerImageUrl.trim() || DEFAULT_SITE_CONFIG.bannerImageUrl,
        portfolioCtaText: (portfolioCtaText.trim() || DEFAULT_SITE_CONFIG.portfolioCtaText).slice(0, 40),
        contactCtaText: (contactCtaText.trim() || DEFAULT_SITE_CONFIG.contactCtaText).slice(0, 40),
        skillsHeading: (skillsHeading.trim() || DEFAULT_SITE_CONFIG.skillsHeading).slice(0, 60),
        portfolioHeading: (portfolioHeading.trim() || DEFAULT_SITE_CONFIG.portfolioHeading).slice(0, 60),
        portfolioSubheading: (
          portfolioSubheading.trim() || DEFAULT_SITE_CONFIG.portfolioSubheading
        ).slice(0, 120),
        aboutTitle: (aboutTitle.trim() || DEFAULT_SITE_CONFIG.aboutTitle).slice(0, 60),
        aboutDescription: (aboutDescription.trim() || DEFAULT_SITE_CONFIG.aboutDescription).slice(0, 500),
        aboutImageUrl: aboutImageUrl.trim() || DEFAULT_SITE_CONFIG.aboutImageUrl,
        quickCard1Title: (quickCard1Title.trim() || DEFAULT_SITE_CONFIG.quickCard1Title).slice(0, 60),
        quickCard1Subtitle: (
          quickCard1Subtitle.trim() || DEFAULT_SITE_CONFIG.quickCard1Subtitle
        ).slice(0, 120),
        quickCard2Title: (quickCard2Title.trim() || DEFAULT_SITE_CONFIG.quickCard2Title).slice(0, 60),
        quickCard2Subtitle: (
          quickCard2Subtitle.trim() || DEFAULT_SITE_CONFIG.quickCard2Subtitle
        ).slice(0, 120),
        quickCard3Title: (quickCard3Title.trim() || DEFAULT_SITE_CONFIG.quickCard3Title).slice(0, 60),
        quickCard3Subtitle: (
          quickCard3Subtitle.trim() || DEFAULT_SITE_CONFIG.quickCard3Subtitle
        ).slice(0, 120),
        whatsappNumber: cleanedWa.slice(0, 20),
        whatsappGreeting: (whatsappGreeting.trim() || DEFAULT_SITE_CONFIG.whatsappGreeting).slice(0, 160),
        telegramGroupUrl: tg || '',
        facebookUrl: fb || '',
        youtubeUrl: yt || '',
        githubUrl: gh || '',
        linkedinUrl: li || '',
        footerRightsText: (footerRightsText.trim() || DEFAULT_SITE_CONFIG.footerRightsText).slice(0, 120),
        footerCreditText: (footerCreditText.trim() || DEFAULT_SITE_CONFIG.footerCreditText).slice(0, 120),
        privacyPolicyText: (privacyPolicyText.trim() || DEFAULT_SITE_CONFIG.privacyPolicyText).slice(
          0,
          800
        ),
        termsText: (termsText.trim() || DEFAULT_SITE_CONFIG.termsText).slice(0, 800),
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
      onNotify('All site settings updated in real time!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'siteConfig/main');
    } finally {
      setConfigBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl border border-[#354888] bg-gradient-to-b from-[#11193f] to-[#080d24] p-5 sm:p-6 shadow-[0_24px_70px_rgba(0,0,0,0.78)] max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#24346a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#a844ff] to-[#4f46e5] grid place-items-center text-white shadow-[0_0_18px_rgba(140,62,255,0.45)]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 id="admin-modal-title" className="font-display text-lg font-extrabold text-white">
                A-to-Z Firebase Real-Time Admin Panel
              </h3>
              <p className="text-xs text-[#9cb0e4]">
                Full live control over Logo, Banner, Skills, Portfolio, About, Cards, WhatsApp &amp;
                Footer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user && (
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#34467d] bg-[#0e1638] text-xs font-semibold text-[#d2ddfa] hover:border-[#f43f5e] hover:text-white transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Admin Panel"
              className="w-9 h-9 rounded-xl border border-[#2d3e76] bg-[#0e1636] text-[#c7d3f5] hover:text-white hover:border-[#7c4dff] grid place-items-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Auth Gate */}
        {!authReady ? (
          <div className="py-12 text-center text-sm text-[#b9c6e8]">Connecting to Firebase...</div>
        ) : !user ? (
          <div className="mt-6 space-y-4 max-w-md mx-auto text-center">
            <div className="rounded-xl border border-[#27386e] bg-[#0a102b]/85 p-5 text-xs text-[#c5d1ee] leading-relaxed">
              Sign in with your Google Admin account (<strong className="text-white">{ADMIN_EMAIL}</strong>)
              to manage every section of your website in real time.
            </div>

            {authError && (
              <div className="rounded-xl border border-[#f43f5e]/50 bg-[#3a0d1e]/60 px-3.5 py-2 text-xs text-[#fecdd3]">
                {authError}
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={authBusy}
              className="w-full inline-flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-gradient-to-r from-[#a844ff] to-[#6333ff] text-sm font-bold text-white shadow-[0_8px_22px_rgba(124,58,237,0.45)] hover:brightness-110 disabled:opacity-60 transition-all cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{authBusy ? 'Signing in...' : 'Sign in with Google'}</span>
            </button>
          </div>
        ) : !isAdminUser ? (
          <div className="mt-6 max-w-md mx-auto rounded-xl border border-[#7f1d1d] bg-[#2c0d16]/75 p-5 text-center space-y-3">
            <ShieldAlert className="w-8 h-8 text-[#fda4af] mx-auto" />
            <div className="text-sm font-bold text-white">Unauthorized Account</div>
            <p className="text-xs text-[#fecdd3] leading-relaxed">
              Signed in as <strong>{user.email}</strong>. Admin access is restricted to{' '}
              <strong>{ADMIN_EMAIL}</strong>.
            </p>
            <button
              type="button"
              onClick={handleSignOut}
              className="px-4 py-2 rounded-xl bg-[#be123c] text-xs font-bold text-white cursor-pointer"
            >
              Switch Google Account
            </button>
          </div>
        ) : (
          <div className="mt-5">
            {/* Live Sync Status Bar */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#14532d] bg-[#06281e]/75 px-3.5 py-2 text-[11px] text-[#86efac]">
              <div className="flex items-center gap-2 truncate">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#4ade80] shrink-0" />
                <span className="truncate">
                  Live Firebase Connected · {user.email} · Instant User Panel Sync
                </span>
              </div>
              <span className="text-[10px] text-[#6ee7b7]/80">
                Projects: {projects.length} · Skills: {skills.length}
              </span>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-5">
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'upload'
                    ? 'bg-gradient-to-r from-[#8f38ff] to-[#4f46e5] text-white shadow-md'
                    : 'bg-[#0b1231] border border-[#27386e] text-[#c7d3f5] hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{editingId ? 'Edit Project' : 'Upload Project'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('manage')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'manage'
                    ? 'bg-gradient-to-r from-[#8f38ff] to-[#4f46e5] text-white shadow-md'
                    : 'bg-[#0b1231] border border-[#27386e] text-[#c7d3f5] hover:text-white'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Projects ({projects.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('banner')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'banner'
                    ? 'bg-gradient-to-r from-[#8f38ff] to-[#4f46e5] text-white shadow-md'
                    : 'bg-[#0b1231] border border-[#27386e] text-[#c7d3f5] hover:text-white'
                }`}
              >
                <LayoutTemplate className="w-3.5 h-3.5" />
                <span>Banner &amp; Logo</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('sections')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'sections'
                    ? 'bg-gradient-to-r from-[#0284c7] to-[#4f46e5] text-white shadow-md'
                    : 'bg-[#0b1231] border border-[#27386e] text-[#c7d3f5] hover:text-white'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Skills, About &amp; Cards</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('social')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'social'
                    ? 'bg-gradient-to-r from-[#16a34a] to-[#059669] text-white shadow-md'
                    : 'bg-[#0b1231] border border-[#27386e] text-[#c7d3f5] hover:text-white'
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp, Telegram &amp; Footer</span>
              </button>
            </div>

            {/* TAB 1: UPLOAD / EDIT WEBSITE PROJECT */}
            {activeTab === 'upload' && (
              <form onSubmit={handleSaveProject} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#dbe4ff] mb-1.5">
                      Website / Project Name *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Multi-Vendor E-Commerce"
                      required
                      className="w-full rounded-xl border border-[#2a3b72] bg-[#070d26] px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-[#7f8fbb] focus:border-[#9d4dff] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#dbe4ff] mb-1.5">
                      Category *
                    </label>
                    <select
                      value={category}
                      onChange={(e) =>
                        setCategory(e.target.value as Exclude<ProjectCategory, 'all'>)
                      }
                      className="w-full rounded-xl border border-[#2a3b72] bg-[#070d26] px-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-[#9d4dff] focus:outline-none"
                    >
                      <option value="business">Business Website</option>
                      <option value="ecommerce">E-Commerce Website</option>
                      <option value="web-apps">Web Apps / Portfolio</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#dbe4ff] mb-1.5">
                    Short Description *
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Short 1-line summary shown on portfolio card"
                    required
                    className="w-full rounded-xl border border-[#2a3b72] bg-[#070d26] px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-[#7f8fbb] focus:border-[#9d4dff] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#dbe4ff] mb-1.5">
                    <span className="inline-flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#a855f7]" />
                      <span>Website Features (one feature per line) *</span>
                    </span>
                  </label>
                  <textarea
                    value={featuresText}
                    onChange={(e) => setFeaturesText(e.target.value)}
                    placeholder="Admin Dashboard&#10;Online Payment Checkout&#10;Mobile Responsive UI"
                    rows={3}
                    className="w-full rounded-xl border border-[#2a3b72] bg-[#070d26] px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-[#7f8fbb] focus:border-[#9d4dff] focus:outline-none resize-y"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#dbe4ff] mb-1.5">
                    Full Description (Optional)
                  </label>
                  <textarea
                    value={longDescription}
                    onChange={(e) => setLongDescription(e.target.value)}
                    placeholder="Detailed explanation of what this website does..."
                    rows={2}
                    className="w-full rounded-xl border border-[#2a3b72] bg-[#070d26] px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-[#7f8fbb] focus:border-[#9d4dff] focus:outline-none resize-y"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#dbe4ff] mb-1.5">
                      Live Website URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={liveUrl}
                      onChange={(e) => setLiveUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full rounded-xl border border-[#2a3b72] bg-[#070d26] px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-[#7f8fbb] focus:border-[#9d4dff] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#dbe4ff] mb-1.5">
                      Tech Stack (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={techStackInput}
                      onChange={(e) => setTechStackInput(e.target.value)}
                      placeholder="React, Tailwind CSS, Firebase"
                      className="w-full rounded-xl border border-[#2a3b72] bg-[#070d26] px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-[#7f8fbb] focus:border-[#9d4dff] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-dashed border-[#3b4e8f] bg-[#0a102a]/70 p-4 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 text-xs font-semibold text-white">
                      <ImagePlus className="w-4 h-4 text-[#a855f7]" />
                      <span>Website Screenshot / Thumbnail</span>
                    </span>
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#192659] border border-[#435aa8] text-[11px] font-semibold text-white hover:border-[#a855f7] cursor-pointer">
                      <Upload className="w-3 h-3" />
                      <span>Upload Image</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void handleUploadImage(f, setThumbnailUrl, 'Project screenshot');
                        }}
                        className="sr-only"
                      />
                    </label>
                  </div>

                  <input
                    type="text"
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    placeholder="Or paste image URL (https://...)"
                    className="w-full rounded-lg border border-[#28386d] bg-[#070d26] px-3 py-2 text-xs text-white placeholder-[#7f8fbb] focus:border-[#9d4dff] focus:outline-none"
                  />

                  {thumbnailUrl && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#34d399]">Screenshot attached</span>
                      <button
                        type="button"
                        onClick={() => setThumbnailUrl('')}
                        className="text-[#fda4af] hover:underline cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>

                {projectError && (
                  <div className="rounded-xl border border-[#f43f5e]/50 bg-[#3a0d1e]/60 px-3.5 py-2 text-xs text-[#fecdd3]">
                    {projectError}
                  </div>
                )}

                <div className="flex gap-2.5">
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetProjectForm}
                      className="px-4 py-3 rounded-xl border border-[#34467d] bg-[#0c1434] text-xs font-bold text-[#d8e1fb] cursor-pointer"
                    >
                      Cancel Edit
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={projectBusy}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#a844ff] to-[#6333ff] text-xs sm:text-sm font-bold text-white shadow-[0_8px_22px_rgba(124,58,237,0.45)] hover:brightness-110 disabled:opacity-60 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>
                      {projectBusy
                        ? 'Saving to Firebase...'
                        : editingId
                          ? 'Update Website Project'
                          : 'Upload Website to Portfolio'}
                    </span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: MANAGE PROJECTS */}
            {activeTab === 'manage' && (
              <div className="space-y-3">
                {!hasFirestoreProjects && (
                  <div className="rounded-xl border border-[#364d94] bg-[#0e1945]/90 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-[#dbe4ff]">
                    <span>
                      Showing default starter websites. Sync them to Firebase if you want to edit or
                      remove them directly.
                    </span>
                    <button
                      type="button"
                      onClick={handleSeedDefaults}
                      disabled={projectBusy}
                      className="px-3 py-1.5 rounded-lg bg-[#6333ff] text-white font-bold cursor-pointer whitespace-nowrap"
                    >
                      Sync Starter Websites
                    </button>
                  </div>
                )}

                {projects.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[#26376d] bg-[#0b1231] p-3.5"
                  >
                    <div className="min-w-0">
                      <div className="text-[11px] text-[#9cb0e4]">
                        {item.categoryLabel} <span aria-hidden="true">·</span>{' '}
                        {item.highlights.length} features
                      </div>
                      <div className="text-sm font-bold text-white truncate">{item.title}</div>
                      <div className="text-xs text-[#b8c4e4] truncate">{item.description}</div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isSafeHttpUrl(item.liveUrl) && (
                        <a
                          href={item.liveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Open ${item.title}`}
                          className="w-9 h-9 rounded-lg border border-[#2f4280] bg-[#121c47] text-[#9ec5ff] hover:text-white grid place-items-center"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => startEditingProject(item)}
                        aria-label={`Edit ${item.title}`}
                        className="w-9 h-9 rounded-lg border border-[#2f4280] bg-[#121c47] text-[#c4b5fd] hover:text-white grid place-items-center cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {!item.isDefault && (
                        <button
                          type="button"
                          onClick={() => void handleDeleteProject(item.id, item.title)}
                          aria-label={`Delete ${item.title}`}
                          className="w-9 h-9 rounded-lg border border-[#4c243a] bg-[#241021] text-[#fda4af] hover:bg-[#be123c] hover:text-white grid place-items-center transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 3: BANNER & LOGO */}
            {activeTab === 'banner' && (
              <form onSubmit={handleSaveSiteConfig} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#dbe4ff] mb-1.5">
                      Brand / Logo Name
                    </label>
                    <input
                      type="text"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      required
                      className="w-full rounded-xl border border-[#2a3b72] bg-[#070d26] px-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-[#9d4dff] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#dbe4ff] mb-1.5">
                      Logo Subtitle
                    </label>
                    <input
                      type="text"
                      value={brandSubtitle}
                      onChange={(e) => setBrandSubtitle(e.target.value)}
                      required
                      className="w-full rounded-xl border border-[#2a3b72] bg-[#070d26] px-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-[#9d4dff] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#dbe4ff] mb-1.5">
                      Top Hire Button Text
                    </label>
                    <input
                      type="text"
                      value={hireButtonText}
                      onChange={(e) => setHireButtonText(e.target.value)}
                      required
                      className="w-full rounded-xl border border-[#2a3b72] bg-[#070d26] px-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-[#9d4dff] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Custom Logo Upload */}
                <div className="rounded-xl border border-dashed border-[#3b4e8f] bg-[#0a102a]/70 p-3.5 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-white">
                      Brand Logo Image (leave empty for default MJ icon)
                    </span>
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#192659] border border-[#435aa8] text-[11px] font-semibold text-white cursor-pointer">
                      <Upload className="w-3 h-3" />
                      <span>Upload Logo</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void handleUploadImage(f, setLogoUrl, 'Logo image', 256);
                        }}
                        className="sr-only"
                      />
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="Paste logo URL or upload above"
                      className="flex-1 rounded-lg border border-[#28386d] bg-[#070d26] px-3 py-2 text-xs text-white placeholder-[#7f8fbb] focus:border-[#9d4dff] focus:outline-none"
                    />
                    {logoUrl && (
                      <button
                        type="button"
                        onClick={() => setLogoUrl('')}
                        className="px-3 py-2 rounded-lg border border-[#4c243a] text-xs text-[#fda4af] cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Banner Text & Image */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#dbe4ff] mb-1.5">
                      Banner Greeting
                    </label>
                    <input
                      type="text"
                      value={bannerGreeting}
                      onChange={(e) => setBannerGreeting(e.target.value)}
                      required
                      className="w-full rounded-xl border border-[#2a3b72] bg-[#070d26] px-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-[#9d4dff] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#dbe4ff] mb-1.5">
                      Banner Highlight Name
                    </label>
                    <input
                      type="text"
                      value={bannerHighlight}
                      onChange={(e) => setBannerHighlight(e.target.value)}
                      required
                      className="w-full rounded-xl border border-[#2a3b72] bg-[#070d26] px-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-[#9d4dff] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#dbe4ff] mb-1.5">
                      Banner Role / Subtitle
                    </label>
                    <input
                      type="text"
                      value={bannerSubtitle}
                      onChange={(e) => setBannerSubtitle(e.target.value)}
                      required
                      className="w-full rounded-xl border border-[#2a3b72] bg-[#070d26] px-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-[#9d4dff] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#dbe4ff] mb-1.5">
                      Availability Badge
                    </label>
                    <input
                      type="text"
                      value={availabilityText}
                      onChange={(e) => setAvailabilityText(e.target.value)}
                      required
                      className="w-full rounded-xl border border-[#2a3b72] bg-[#070d26] px-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-[#9d4dff] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#dbe4ff] mb-1.5">
                      Primary CTA Label
                    </label>
                    <input
                      type="text"
                      value={portfolioCtaText}
                      onChange={(e) => setPortfolioCtaText(e.target.value)}
                      required
                      className="w-full rounded-xl border border-[#2a3b72] bg-[#070d26] px-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-[#9d4dff] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#dbe4ff] mb-1.5">
                      Contact CTA Label
                    </label>
                    <input
                      type="text"
                      value={contactCtaText}
                      onChange={(e) => setContactCtaText(e.target.value)}
                      required
                      className="w-full rounded-xl border border-[#2a3b72] bg-[#070d26] px-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-[#9d4dff] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#dbe4ff] mb-1.5">
                    Banner Description
                  </label>
                  <textarea
                    value={bannerDescription}
                    onChange={(e) => setBannerDescription(e.target.value)}
                    rows={2}
                    required
                    className="w-full rounded-xl border border-[#2a3b72] bg-[#070d26] px-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-[#9d4dff] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#dbe4ff] mb-1.5">
                      Portfolio Section Title
                    </label>
                    <input
                      type="text"
                      value={portfolioHeading}
                      onChange={(e) => setPortfolioHeading(e.target.value)}
                      required
                      className="w-full rounded-xl border border-[#2a3b72] bg-[#070d26] px-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-[#9d4dff] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#dbe4ff] mb-1.5">
                      Portfolio Subtitle
                    </label>
                    <input
                      type="text"
                      value={portfolioSubheading}
                      onChange={(e) => setPortfolioSubheading(e.target.value)}
                      required
                      className="w-full rounded-xl border border-[#2a3b72] bg-[#070d26] px-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-[#9d4dff] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-dashed border-[#3b4e8f] bg-[#0a102a]/70 p-3.5 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-white">Banner Portrait / Artwork</span>
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#192659] border border-[#435aa8] text-[11px] font-semibold text-white cursor-pointer">
                      <Upload className="w-3 h-3" />
                      <span>Upload Banner</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void handleUploadImage(f, setBannerImageUrl, 'Banner image', 960);
                        }}
                        className="sr-only"
                      />
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={bannerImageUrl}
                      onChange={(e) => setBannerImageUrl(e.target.value)}
                      placeholder="/assets/crops/hero_art.png or https://..."
                      className="flex-1 rounded-lg border border-[#28386d] bg-[#070d26] px-3 py-2 text-xs text-white focus:border-[#9d4dff] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setBannerImageUrl(DEFAULT_SITE_CONFIG.bannerImageUrl)}
                      className="px-3 py-2 rounded-lg border border-[#34467d] text-xs text-[#d2ddfa] cursor-pointer"
                    >
                      Default
                    </button>
                  </div>
                </div>

                {configError && (
                  <div className="rounded-xl border border-[#f43f5e]/50 bg-[#3a0d1e]/60 px-3.5 py-2 text-xs text-[#fecdd3]">
                    {configError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={configBusy}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#a844ff] to-[#6333ff] text-xs sm:text-sm font-bold text-white shadow-[0_8px_22px_rgba(124,58,237,0.45)] hover:brightness-110 disabled:opacity-60 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{configBusy ? 'Updating Firebase...' : 'Save Banner & Logo Changes'}</span>
                </button>
              </form>
            )}

            {/* TAB 4: SKILLS, ABOUT & SERVICE CARDS */}
            {activeTab === 'sections' && (
              <div className="space-y-6">
                {/* Real-Time Skills CRUD */}
                <div className="rounded-2xl border border-[#283a74] bg-[#0a112d]/85 p-4 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-white">Manage My Skills (Real-Time)</h4>
                      <p className="text-[11px] text-[#9cb0e4]">
                        Add, edit, reorder, or remove skill cards shown in My Skills
                      </p>
                    </div>
                    {!hasFirestoreSkills && (
                      <button
                        type="button"
                        onClick={handleSeedDefaultSkills}
                        disabled={skillBusy}
                        className="px-3 py-1.5 rounded-lg bg-[#6333ff] text-[11px] text-white font-bold cursor-pointer"
                      >
                        Sync Starter Skills
                      </button>
                    )}
                  </div>

                  <form onSubmit={handleSaveSkill} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                    <input
                      type="text"
                      value={skillName}
                      onChange={(e) => setSkillName(e.target.value)}
                      placeholder="Skill Name (e.g. Next.js)"
                      required
                      className="rounded-xl border border-[#2a3b72] bg-[#070d26] px-3 py-2 text-xs text-white placeholder-[#7f8fbb] focus:border-[#9d4dff] focus:outline-none"
                    />
                    <input
                      type="text"
                      value={skillRole}
                      onChange={(e) => setSkillRole(e.target.value)}
                      placeholder="Role (e.g. Full-Stack SSR)"
                      required
                      className="rounded-xl border border-[#2a3b72] bg-[#070d26] px-3 py-2 text-xs text-white placeholder-[#7f8fbb] focus:border-[#9d4dff] focus:outline-none"
                    />
                    <select
                      value={skillIconKey}
                      onChange={(e) => setSkillIconKey(e.target.value)}
                      className="rounded-xl border border-[#2a3b72] bg-[#070d26] px-3 py-2 text-xs text-white focus:border-[#9d4dff] focus:outline-none"
                    >
                      {SKILL_ICON_OPTIONS.map((opt) => (
                        <option key={opt.key} value={opt.key}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={0}
                        max={1000}
                        value={skillOrder}
                        onChange={(e) => setSkillOrder(e.target.value)}
                        title="Display order"
                        className="w-16 rounded-xl border border-[#2a3b72] bg-[#070d26] px-2.5 py-2 text-xs text-white focus:border-[#9d4dff] focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={skillBusy}
                        className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#4f46e5] text-xs font-bold text-white cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{editingSkillId ? 'Update' : 'Add'}</span>
                      </button>
                      {editingSkillId && (
                        <button
                          type="button"
                          onClick={resetSkillForm}
                          className="px-2.5 py-2 rounded-xl border border-[#34467d] text-xs text-[#d8e1fb] cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>

                  {skillError && (
                    <div className="rounded-lg border border-[#f43f5e]/50 bg-[#3a0d1e]/60 px-3 py-1.5 text-xs text-[#fecdd3]">
                      {skillError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {skills.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-[#25366c] bg-[#070d26] px-3 py-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 shrink-0 [&>svg]:w-7 [&>svg]:h-7 [&>div]:w-7 [&>div]:h-7">
                            <SkillIcon id={s.iconKey} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">
                              #{s.order} · {s.name}
                            </div>
                            <div className="text-[10px] text-[#9cb0e4] truncate">{s.role}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEditingSkill(s)}
                            aria-label={`Edit ${s.name}`}
                            className="w-7 h-7 rounded-lg border border-[#2f4280] bg-[#121c47] text-[#c4b5fd] hover:text-white grid place-items-center cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          {!s.isDefault && (
                            <button
                              type="button"
                              onClick={() => void handleDeleteSkill(s.id, s.name)}
                              aria-label={`Delete ${s.name}`}
                              className="w-7 h-7 rounded-lg border border-[#4c243a] bg-[#241021] text-[#fda4af] hover:bg-[#be123c] hover:text-white grid place-items-center cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* About Me + Headings + 3 Quick Cards */}
                <form onSubmit={handleSaveSiteConfig} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-[#dbe4ff] mb-1.5">
                        Skills Section Title
                      </label>
                      <input
                        type="text"
                        value={skillsHeading}
                        onChange={(e) => setSkillsHeading(e.target.value)}
                        required
                        className="w-full rounded-xl border border-[#2a3b72] bg-[#070d26] px-3.5 py-2 text-xs sm:text-sm text-white focus:border-[#9d4dff] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#dbe4ff] mb-1.5">
                        About Section Title
                      </label>
                      <input
                        type="text"
                        value={aboutTitle}
                        onChange={(e) => setAboutTitle(e.target.value)}
                        required
                        className="w-full rounded-xl border border-[#2a3b72] bg-[#070d26] px-3.5 py-2 text-xs sm:text-sm text-white focus:border-[#9d4dff] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#dbe4ff] mb-1.5">
                      About Me Description
                    </label>
                    <textarea
                      value={aboutDescription}
                      onChange={(e) => setAboutDescription(e.target.value)}
                      rows={3}
                      required
                      className="w-full rounded-xl border border-[#2a3b72] bg-[#070d26] px-3.5 py-2 text-xs sm:text-sm text-white focus:border-[#9d4dff] focus:outline-none"
                    />
                  </div>

                  <div className="rounded-xl border border-dashed border-[#3b4e8f] bg-[#0a102a]/70 p-3 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-white">About Section Image</span>
                      <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#192659] border border-[#435aa8] text-[11px] font-semibold text-white cursor-pointer">
                        <Upload className="w-3 h-3" />
                        <span>Upload Image</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) void handleUploadImage(f, setAboutImageUrl, 'About image', 720);
                          }}
                          className="sr-only"
                        />
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={aboutImageUrl}
                        onChange={(e) => setAboutImageUrl(e.target.value)}
                        className="flex-1 rounded-lg border border-[#28386d] bg-[#070d26] px-3 py-1.5 text-xs text-white focus:border-[#9d4dff] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setAboutImageUrl(DEFAULT_SITE_CONFIG.aboutImageUrl)}
                        className="px-3 py-1.5 rounded-lg border border-[#34467d] text-xs text-[#d2ddfa] cursor-pointer"
                      >
                        Default
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-1">
                    <div className="text-xs font-bold text-[#c4b5fd]">
                      3 Quick Service Cards (Below About Me)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        value={quickCard1Title}
                        onChange={(e) => setQuickCard1Title(e.target.value)}
                        placeholder="Card 1 Title"
                        required
                        className="rounded-xl border border-[#2a3b72] bg-[#070d26] px-3 py-2 text-xs text-white focus:border-[#9d4dff] focus:outline-none"
                      />
                      <input
                        type="text"
                        value={quickCard1Subtitle}
                        onChange={(e) => setQuickCard1Subtitle(e.target.value)}
                        placeholder="Card 1 Subtitle"
                        required
                        className="rounded-xl border border-[#2a3b72] bg-[#070d26] px-3 py-2 text-xs text-white focus:border-[#9d4dff] focus:outline-none"
                      />
                      <input
                        type="text"
                        value={quickCard2Title}
                        onChange={(e) => setQuickCard2Title(e.target.value)}
                        placeholder="Card 2 Title"
                        required
                        className="rounded-xl border border-[#2a3b72] bg-[#070d26] px-3 py-2 text-xs text-white focus:border-[#9d4dff] focus:outline-none"
                      />
                      <input
                        type="text"
                        value={quickCard2Subtitle}
                        onChange={(e) => setQuickCard2Subtitle(e.target.value)}
                        placeholder="Card 2 Subtitle"
                        required
                        className="rounded-xl border border-[#2a3b72] bg-[#070d26] px-3 py-2 text-xs text-white focus:border-[#9d4dff] focus:outline-none"
                      />
                      <input
                        type="text"
                        value={quickCard3Title}
                        onChange={(e) => setQuickCard3Title(e.target.value)}
                        placeholder="Card 3 Title"
                        required
                        className="rounded-xl border border-[#2a3b72] bg-[#070d26] px-3 py-2 text-xs text-white focus:border-[#9d4dff] focus:outline-none"
                      />
                      <input
                        type="text"
                        value={quickCard3Subtitle}
                        onChange={(e) => setQuickCard3Subtitle(e.target.value)}
                        placeholder="Card 3 Subtitle"
                        required
                        className="rounded-xl border border-[#2a3b72] bg-[#070d26] px-3 py-2 text-xs text-white focus:border-[#9d4dff] focus:outline-none"
                      />
                    </div>
                  </div>

                  {configError && (
                    <div className="rounded-xl border border-[#f43f5e]/50 bg-[#3a0d1e]/60 px-3.5 py-2 text-xs text-[#fecdd3]">
                      {configError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={configBusy}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#4f46e5] text-xs sm:text-sm font-bold text-white shadow-lg hover:brightness-110 disabled:opacity-60 transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{configBusy ? 'Updating Firebase...' : 'Save About & Quick Cards'}</span>
                  </button>
                </form>
              </div>
            )}

            {/* TAB 5: WHATSAPP, TELEGRAM & FOOTER */}
            {activeTab === 'social' && (
              <form onSubmit={handleSaveSiteConfig} className="space-y-4">
                <div className="rounded-xl border border-[#14532d] bg-[#07261c]/70 p-3.5 text-xs text-[#bbf7d0] leading-relaxed">
                  Every <strong>Contact</strong>, <strong>Hire Me</strong>, and{' '}
                  <strong>Contact Me</strong> button across the site opens your WhatsApp account
                  directly. Test link:{' '}
                  <a
                    href={buildWhatsAppUrl(whatsappNumber, whatsappGreeting)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-bold text-white"
                  >
                    wa.me/{whatsappNumber.replace(/\D/g, '') || '...'}
                  </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#dbe4ff] mb-1.5">
                      WhatsApp Number (with country code) *
                    </label>
                    <input
                      type="text"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="8801700000000"
                      required
                      className="w-full rounded-xl border border-[#2a3b72] bg-[#070d26] px-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-[#22c55e] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#dbe4ff] mb-1.5">
                      Default WhatsApp Greeting
                    </label>
                    <input
                      type="text"
                      value={whatsappGreeting}
                      onChange={(e) => setWhatsappGreeting(e.target.value)}
                      required
                      className="w-full rounded-xl border border-[#2a3b72] bg-[#070d26] px-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-[#22c55e] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#dbe4ff] mb-1.5">
                    Telegram Group / Channel Link
                  </label>
                  <input
                    type="url"
                    value={telegramGroupUrl}
                    onChange={(e) => setTelegramGroupUrl(e.target.value)}
                    placeholder="https://t.me/your_group_link"
                    className="w-full rounded-xl border border-[#2a3b72] bg-[#070d26] px-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-[#38bdf8] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#b9c6e8] mb-1">
                      Facebook URL
                    </label>
                    <input
                      type="url"
                      value={facebookUrl}
                      onChange={(e) => setFacebookUrl(e.target.value)}
                      className="w-full rounded-xl border border-[#2a3b72] bg-[#070d26] px-3 py-2 text-xs text-white focus:border-[#9d4dff] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#b9c6e8] mb-1">
                      YouTube URL
                    </label>
                    <input
                      type="url"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      className="w-full rounded-xl border border-[#2a3b72] bg-[#070d26] px-3 py-2 text-xs text-white focus:border-[#9d4dff] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#b9c6e8] mb-1">
                      GitHub URL
                    </label>
                    <input
                      type="url"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      className="w-full rounded-xl border border-[#2a3b72] bg-[#070d26] px-3 py-2 text-xs text-white focus:border-[#9d4dff] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#b9c6e8] mb-1">
                      LinkedIn URL
                    </label>
                    <input
                      type="url"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      className="w-full rounded-xl border border-[#2a3b72] bg-[#070d26] px-3 py-2 text-xs text-white focus:border-[#9d4dff] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Footer & Legal Text */}
                <div className="pt-2 border-t border-[#223266] space-y-3">
                  <div className="text-xs font-bold text-[#c4b5fd]">Footer &amp; Policy Text</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#b9c6e8] mb-1">
                        Footer Rights Text
                      </label>
                      <input
                        type="text"
                        value={footerRightsText}
                        onChange={(e) => setFooterRightsText(e.target.value)}
                        required
                        className="w-full rounded-xl border border-[#2a3b72] bg-[#070d26] px-3 py-2 text-xs text-white focus:border-[#9d4dff] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#b9c6e8] mb-1">
                        Footer Credit Text
                      </label>
                      <input
                        type="text"
                        value={footerCreditText}
                        onChange={(e) => setFooterCreditText(e.target.value)}
                        required
                        className="w-full rounded-xl border border-[#2a3b72] bg-[#070d26] px-3 py-2 text-xs text-white focus:border-[#9d4dff] focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#b9c6e8] mb-1">
                        Privacy Policy Content
                      </label>
                      <textarea
                        value={privacyPolicyText}
                        onChange={(e) => setPrivacyPolicyText(e.target.value)}
                        rows={2}
                        required
                        className="w-full rounded-xl border border-[#2a3b72] bg-[#070d26] px-3 py-2 text-xs text-white focus:border-[#9d4dff] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#b9c6e8] mb-1">
                        Terms &amp; Conditions Content
                      </label>
                      <textarea
                        value={termsText}
                        onChange={(e) => setTermsText(e.target.value)}
                        rows={2}
                        required
                        className="w-full rounded-xl border border-[#2a3b72] bg-[#070d26] px-3 py-2 text-xs text-white focus:border-[#9d4dff] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {configError && (
                  <div className="rounded-xl border border-[#f43f5e]/50 bg-[#3a0d1e]/60 px-3.5 py-2 text-xs text-[#fecdd3]">
                    {configError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={configBusy}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#16a34a] to-[#059669] text-xs sm:text-sm font-bold text-white shadow-[0_8px_22px_rgba(16,185,129,0.38)] hover:brightness-110 disabled:opacity-60 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {configBusy ? 'Saving to Firebase...' : 'Save WhatsApp, Telegram & Footer'}
                  </span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
