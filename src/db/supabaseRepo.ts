import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  DEFAULT_PROJECTS,
  DEFAULT_SITE_CONFIG,
  DEFAULT_SKILLS,
  type ProjectItem,
  type SiteConfig,
  type SkillItem,
} from '../lib/portfolioData.ts';
import type { AnalyticsOverview } from './portfolioRepo.ts';

let cachedClient: SupabaseClient | null = null;
let supabaseSeeded = false;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

function getSupabaseClient(): SupabaseClient {
  if (!cachedClient) {
    const url = process.env.SUPABASE_URL?.trim() || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';
    if (!url || !key) {
      throw new Error('Supabase environment variables are not configured.');
    }
    cachedClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cachedClient;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function toDbSiteConfig(config: SiteConfig, updatedBy: string) {
  return {
    id: 'main',
    brand_name: config.brandName,
    brand_subtitle: config.brandSubtitle,
    logo_url: config.logoUrl,
    hire_button_text: config.hireButtonText,
    availability_text: config.availabilityText,
    banner_greeting: config.bannerGreeting,
    banner_highlight: config.bannerHighlight,
    banner_subtitle: config.bannerSubtitle,
    banner_description: config.bannerDescription,
    banner_image_url: config.bannerImageUrl,
    portfolio_cta_text: config.portfolioCtaText,
    contact_cta_text: config.contactCtaText,
    skills_heading: config.skillsHeading,
    portfolio_heading: config.portfolioHeading,
    portfolio_subheading: config.portfolioSubheading,
    about_title: config.aboutTitle,
    about_description: config.aboutDescription,
    about_image_url: config.aboutImageUrl,
    quick_card1_title: config.quickCard1Title,
    quick_card1_subtitle: config.quickCard1Subtitle,
    quick_card2_title: config.quickCard2Title,
    quick_card2_subtitle: config.quickCard2Subtitle,
    quick_card3_title: config.quickCard3Title,
    quick_card3_subtitle: config.quickCard3Subtitle,
    whatsapp_number: config.whatsappNumber,
    whatsapp_greeting: config.whatsappGreeting,
    telegram_group_url: config.telegramGroupUrl,
    facebook_url: config.facebookUrl,
    youtube_url: config.youtubeUrl,
    github_url: config.githubUrl,
    linkedin_url: config.linkedinUrl,
    footer_rights_text: config.footerRightsText,
    footer_credit_text: config.footerCreditText,
    privacy_policy_text: config.privacyPolicyText,
    terms_text: config.termsText,
    updated_by: updatedBy,
    updated_at: new Date().toISOString(),
  };
}

function fromDbSiteConfig(row: Record<string, unknown> | null | undefined): SiteConfig {
  if (!row) return DEFAULT_SITE_CONFIG;
  return {
    brandName: String(row.brand_name || DEFAULT_SITE_CONFIG.brandName),
    brandSubtitle: String(row.brand_subtitle || DEFAULT_SITE_CONFIG.brandSubtitle),
    logoUrl: String(row.logo_url || ''),
    hireButtonText: String(row.hire_button_text || DEFAULT_SITE_CONFIG.hireButtonText),
    availabilityText: String(row.availability_text || DEFAULT_SITE_CONFIG.availabilityText),
    bannerGreeting: String(row.banner_greeting || DEFAULT_SITE_CONFIG.bannerGreeting),
    bannerHighlight: String(row.banner_highlight || DEFAULT_SITE_CONFIG.bannerHighlight),
    bannerSubtitle: String(row.banner_subtitle || DEFAULT_SITE_CONFIG.bannerSubtitle),
    bannerDescription: String(row.banner_description || DEFAULT_SITE_CONFIG.bannerDescription),
    bannerImageUrl: String(row.banner_image_url || DEFAULT_SITE_CONFIG.bannerImageUrl),
    portfolioCtaText: String(row.portfolio_cta_text || DEFAULT_SITE_CONFIG.portfolioCtaText),
    contactCtaText: String(row.contact_cta_text || DEFAULT_SITE_CONFIG.contactCtaText),
    skillsHeading: String(row.skills_heading || DEFAULT_SITE_CONFIG.skillsHeading),
    portfolioHeading: String(row.portfolio_heading || DEFAULT_SITE_CONFIG.portfolioHeading),
    portfolioSubheading: String(
      row.portfolio_subheading || DEFAULT_SITE_CONFIG.portfolioSubheading
    ),
    aboutTitle: String(row.about_title || DEFAULT_SITE_CONFIG.aboutTitle),
    aboutDescription: String(row.about_description || DEFAULT_SITE_CONFIG.aboutDescription),
    aboutImageUrl: String(row.about_image_url || DEFAULT_SITE_CONFIG.aboutImageUrl),
    quickCard1Title: String(row.quick_card1_title || DEFAULT_SITE_CONFIG.quickCard1Title),
    quickCard1Subtitle: String(
      row.quick_card1_subtitle || DEFAULT_SITE_CONFIG.quickCard1Subtitle
    ),
    quickCard2Title: String(row.quick_card2_title || DEFAULT_SITE_CONFIG.quickCard2Title),
    quickCard2Subtitle: String(
      row.quick_card2_subtitle || DEFAULT_SITE_CONFIG.quickCard2Subtitle
    ),
    quickCard3Title: String(row.quick_card3_title || DEFAULT_SITE_CONFIG.quickCard3Title),
    quickCard3Subtitle: String(
      row.quick_card3_subtitle || DEFAULT_SITE_CONFIG.quickCard3Subtitle
    ),
    whatsappNumber: String(row.whatsapp_number || DEFAULT_SITE_CONFIG.whatsappNumber),
    whatsappGreeting: String(row.whatsapp_greeting || DEFAULT_SITE_CONFIG.whatsappGreeting),
    telegramGroupUrl: String(row.telegram_group_url ?? ''),
    facebookUrl: String(row.facebook_url ?? ''),
    youtubeUrl: String(row.youtube_url ?? ''),
    githubUrl: String(row.github_url ?? ''),
    linkedinUrl: String(row.linkedin_url ?? ''),
    footerRightsText: String(row.footer_rights_text || DEFAULT_SITE_CONFIG.footerRightsText),
    footerCreditText: String(row.footer_credit_text || DEFAULT_SITE_CONFIG.footerCreditText),
    privacyPolicyText: String(row.privacy_policy_text || DEFAULT_SITE_CONFIG.privacyPolicyText),
    termsText: String(row.terms_text || DEFAULT_SITE_CONFIG.termsText),
  };
}

function fromDbProject(row: Record<string, unknown>): ProjectItem {
  const cat =
    row.category === 'ecommerce' || row.category === 'web-apps' ? row.category : 'business';
  const catLabel =
    cat === 'ecommerce' ? 'E-Commerce' : cat === 'web-apps' ? 'Web Apps' : 'Business';
  const pType =
    row.preview_type === 'portfolio' ||
    row.preview_type === 'ecommerce' ||
    row.preview_type === 'business' ||
    row.preview_type === 'custom'
      ? row.preview_type
      : 'custom';
  return {
    id: String(row.id),
    title: String(row.title || 'Untitled Project'),
    category: cat,
    categoryLabel: catLabel,
    description: String(row.description || ''),
    longDescription: String(row.long_description || row.description || ''),
    year: String(row.year || new Date().getFullYear()),
    techStack: Array.isArray(row.tech_stack) ? row.tech_stack.map(String) : ['React'],
    highlights: Array.isArray(row.highlights)
      ? row.highlights.map(String)
      : ['Responsive web build'],
    previewType: pType,
    liveUrl: String(row.live_url || ''),
    thumbnailUrl: String(row.thumbnail_url || ''),
    status: String(row.status || 'Published'),
  };
}

function fromDbSkill(row: Record<string, unknown>): SkillItem {
  return {
    id: String(row.id),
    name: String(row.name || 'Skill'),
    role: String(row.role || 'Web Development'),
    iconKey: String(row.icon_key || 'custom'),
    order: typeof row.order === 'number' ? row.order : Number(row.order) || 0,
  };
}

async function ensureSupabaseSeeded() {
  if (supabaseSeeded) return;
  const supabase = getSupabaseClient();

  const { data: cfg } = await supabase
    .from('site_config')
    .select('id')
    .eq('id', 'main')
    .maybeSingle();
  if (!cfg) {
    await supabase.from('site_config').upsert(toDbSiteConfig(DEFAULT_SITE_CONFIG, 'system'));
  }

  const { data: existingSkills } = await supabase.from('skills').select('id').limit(1);
  if (!existingSkills || existingSkills.length === 0) {
    await supabase.from('skills').upsert(
      DEFAULT_SKILLS.map((s) => ({
        id: s.id,
        name: s.name,
        role: s.role,
        icon_key: s.iconKey,
        order: s.order,
      }))
    );
  }

  const { data: existingProjects } = await supabase.from('projects').select('id').limit(1);
  if (!existingProjects || existingProjects.length === 0) {
    await supabase.from('projects').upsert(
      DEFAULT_PROJECTS.map((p) => ({
        id: p.id,
        title: p.title,
        category: p.category,
        category_label: p.categoryLabel,
        description: p.description,
        long_description: p.longDescription,
        year: p.year,
        tech_stack: p.techStack,
        highlights: p.highlights,
        preview_type: p.previewType,
        live_url: p.liveUrl,
        thumbnail_url: p.thumbnailUrl,
        status: 'Published',
      }))
    );
  }

  const { data: summary } = await supabase
    .from('analytics_summary')
    .select('id')
    .eq('id', 'global')
    .maybeSingle();
  if (!summary) {
    await supabase.from('analytics_summary').upsert({
      id: 'global',
      total_visitors: 0,
      total_contact_clicks: 0,
    });
  }

  supabaseSeeded = true;
}

export async function supaGetPublicPortfolioData() {
  await ensureSupabaseSeeded();
  const supabase = getSupabaseClient();
  const [cfgRes, skillsRes, projRes] = await Promise.all([
    supabase.from('site_config').select('*').eq('id', 'main').maybeSingle(),
    supabase.from('skills').select('*').order('order', { ascending: true }),
    supabase.from('projects').select('*').order('created_at', { ascending: false }),
  ]);

  if (cfgRes.error) throw new Error(cfgRes.error.message);
  if (skillsRes.error) throw new Error(skillsRes.error.message);
  if (projRes.error) throw new Error(projRes.error.message);

  return {
    siteConfig: fromDbSiteConfig(cfgRes.data as Record<string, unknown> | null),
    skills: (skillsRes.data || []).map((r) => fromDbSkill(r as Record<string, unknown>)),
    projects: (projRes.data || []).map((r) => fromDbProject(r as Record<string, unknown>)),
  };
}

export async function supaUpdateSiteConfig(config: SiteConfig, updatedBy: string) {
  await ensureSupabaseSeeded();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('site_config')
    .upsert(toDbSiteConfig(config, updatedBy))
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return fromDbSiteConfig(data as Record<string, unknown>);
}

export async function supaUpsertProject(project: ProjectItem, isNew: boolean) {
  await ensureSupabaseSeeded();
  const supabase = getSupabaseClient();
  const payload = {
    id: project.id,
    title: project.title,
    category: project.category,
    category_label: project.categoryLabel,
    description: project.description,
    long_description: project.longDescription,
    year: project.year,
    tech_stack: project.techStack,
    highlights: project.highlights,
    preview_type: project.previewType,
    live_url: project.liveUrl,
    thumbnail_url: project.thumbnailUrl,
    status: project.status || 'Published',
    updated_at: new Date().toISOString(),
  };

  if (isNew) {
    const { data, error } = await supabase.from('projects').insert(payload).select('*').single();
    if (error) throw new Error(error.message);
    return fromDbProject(data as Record<string, unknown>);
  }

  const { data, error } = await supabase
    .from('projects')
    .update(payload)
    .eq('id', project.id)
    .select('*')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? fromDbProject(data as Record<string, unknown>) : null;
}

export async function supaDeleteProject(projectId: string) {
  await ensureSupabaseSeeded();
  const supabase = getSupabaseClient();
  const { error, count } = await supabase
    .from('projects')
    .delete({ count: 'exact' })
    .eq('id', projectId);
  if (error) throw new Error(error.message);
  return (count || 0) > 0;
}

export async function supaSeedDefaultProjects() {
  await ensureSupabaseSeeded();
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('projects').upsert(
    DEFAULT_PROJECTS.map((p) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      category_label: p.categoryLabel,
      description: p.description,
      long_description: p.longDescription,
      year: p.year,
      tech_stack: p.techStack,
      highlights: p.highlights,
      preview_type: p.previewType,
      live_url: p.liveUrl,
      thumbnail_url: p.thumbnailUrl,
      status: 'Published',
    })),
    { onConflict: 'id', ignoreDuplicates: true }
  );
  if (error) throw new Error(error.message);
}

export async function supaUpsertSkill(skill: SkillItem, isNew: boolean) {
  await ensureSupabaseSeeded();
  const supabase = getSupabaseClient();
  const payload = {
    id: skill.id,
    name: skill.name,
    role: skill.role,
    icon_key: skill.iconKey,
    order: skill.order,
    updated_at: new Date().toISOString(),
  };

  if (isNew) {
    const { data, error } = await supabase.from('skills').insert(payload).select('*').single();
    if (error) throw new Error(error.message);
    return fromDbSkill(data as Record<string, unknown>);
  }

  const { data, error } = await supabase
    .from('skills')
    .update(payload)
    .eq('id', skill.id)
    .select('*')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? fromDbSkill(data as Record<string, unknown>) : null;
}

export async function supaDeleteSkill(skillId: string) {
  await ensureSupabaseSeeded();
  const supabase = getSupabaseClient();
  const { error, count } = await supabase
    .from('skills')
    .delete({ count: 'exact' })
    .eq('id', skillId);
  if (error) throw new Error(error.message);
  return (count || 0) > 0;
}

export async function supaSeedDefaultSkills() {
  await ensureSupabaseSeeded();
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('skills').upsert(
    DEFAULT_SKILLS.map((s) => ({
      id: s.id,
      name: s.name,
      role: s.role,
      icon_key: s.iconKey,
      order: s.order,
    })),
    { onConflict: 'id', ignoreDuplicates: true }
  );
  if (error) throw new Error(error.message);
}

export async function supaIncrementVisitor(dateKey = todayKey()) {
  await ensureSupabaseSeeded();
  const supabase = getSupabaseClient();

  const { data: summary } = await supabase
    .from('analytics_summary')
    .select('total_visitors, total_contact_clicks')
    .eq('id', 'global')
    .maybeSingle();

  await supabase.from('analytics_summary').upsert({
    id: 'global',
    total_visitors: (summary?.total_visitors || 0) + 1,
    total_contact_clicks: summary?.total_contact_clicks || 0,
    updated_at: new Date().toISOString(),
  });

  const { data: dayRow } = await supabase
    .from('analytics_daily')
    .select('visitors, contact_clicks')
    .eq('date_key', dateKey)
    .maybeSingle();

  await supabase.from('analytics_daily').upsert({
    date_key: dateKey,
    visitors: (dayRow?.visitors || 0) + 1,
    contact_clicks: dayRow?.contact_clicks || 0,
    updated_at: new Date().toISOString(),
  });
}

export async function supaIncrementContactClick(dateKey = todayKey()) {
  await ensureSupabaseSeeded();
  const supabase = getSupabaseClient();

  const { data: summary } = await supabase
    .from('analytics_summary')
    .select('total_visitors, total_contact_clicks')
    .eq('id', 'global')
    .maybeSingle();

  await supabase.from('analytics_summary').upsert({
    id: 'global',
    total_visitors: summary?.total_visitors || 0,
    total_contact_clicks: (summary?.total_contact_clicks || 0) + 1,
    updated_at: new Date().toISOString(),
  });

  const { data: dayRow } = await supabase
    .from('analytics_daily')
    .select('visitors, contact_clicks')
    .eq('date_key', dateKey)
    .maybeSingle();

  await supabase.from('analytics_daily').upsert({
    date_key: dateKey,
    visitors: dayRow?.visitors || 0,
    contact_clicks: (dayRow?.contact_clicks || 0) + 1,
    updated_at: new Date().toISOString(),
  });
}

export async function supaGetAnalyticsReport(dateKey = todayKey()): Promise<AnalyticsOverview> {
  await ensureSupabaseSeeded();
  const supabase = getSupabaseClient();
  const [summaryRes, todayRes, histRes] = await Promise.all([
    supabase.from('analytics_summary').select('*').eq('id', 'global').maybeSingle(),
    supabase.from('analytics_daily').select('*').eq('date_key', dateKey).maybeSingle(),
    supabase
      .from('analytics_daily')
      .select('*')
      .order('date_key', { ascending: false })
      .limit(7),
  ]);

  return {
    totalVisitors: summaryRes.data?.total_visitors ?? 0,
    todayVisitors: todayRes.data?.visitors ?? 0,
    totalContactClicks: summaryRes.data?.total_contact_clicks ?? 0,
    todayContactClicks: todayRes.data?.contact_clicks ?? 0,
    dailyHistory: (histRes.data || []).map((r) => ({
      dateKey: String(r.date_key),
      visitors: Number(r.visitors) || 0,
      contactClicks: Number(r.contact_clicks) || 0,
    })),
  };
}

export async function supaResetAnalytics() {
  await ensureSupabaseSeeded();
  const supabase = getSupabaseClient();
  await Promise.all([
    supabase
      .from('analytics_summary')
      .update({ total_visitors: 0, total_contact_clicks: 0, updated_at: new Date().toISOString() })
      .eq('id', 'global'),
    supabase.from('analytics_daily').delete().neq('date_key', ''),
  ]);
}

export async function supaGetAdminCredentialHash(): Promise<string | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('admin_credentials')
    .select('password_hash')
    .eq('id', 'primary')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.password_hash ?? null;
}

export async function supaClaimAdminCredentialHash(passwordHash: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const existing = await supaGetAdminCredentialHash();
  if (existing) return false;
  const { error } = await supabase.from('admin_credentials').insert({
    id: 'primary',
    password_hash: passwordHash,
  });
  return !error;
}
