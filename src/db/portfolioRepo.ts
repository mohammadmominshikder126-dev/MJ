import { asc, desc, eq, sql } from 'drizzle-orm';
import {
  DEFAULT_PROJECTS,
  DEFAULT_SITE_CONFIG,
  DEFAULT_SKILLS,
  type ProjectItem,
  type SiteConfig,
  type SkillItem,
} from '../lib/portfolioData.ts';
import { db } from './index.ts';
import {
  adminCredentials,
  analyticsDaily,
  analyticsSummary,
  projects,
  siteConfig,
  skills,
} from './schema.ts';

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

let seedPromise: Promise<void> | null = null;
let seededDone = false;

export function getTodayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function ensureSeeded(): Promise<void> {
  if (seededDone) return;
  if (!seedPromise) {
    seedPromise = (async () => {
      try {
        await db
          .insert(siteConfig)
          .values({
            id: 'main',
            ...DEFAULT_SITE_CONFIG,
            updatedBy: 'system',
          })
          .onConflictDoNothing();

        const existingSkills = await db.select({ id: skills.id }).from(skills).limit(1);
        if (existingSkills.length === 0) {
          await db
            .insert(skills)
            .values(
              DEFAULT_SKILLS.map((s) => ({
                id: s.id,
                name: s.name,
                role: s.role,
                iconKey: s.iconKey,
                order: s.order,
              }))
            )
            .onConflictDoNothing();
        }

        const existingProjects = await db.select({ id: projects.id }).from(projects).limit(1);
        if (existingProjects.length === 0) {
          await db
            .insert(projects)
            .values(
              DEFAULT_PROJECTS.map((p) => ({
                id: p.id,
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
                status: 'Published',
              }))
            )
            .onConflictDoNothing();
        }

        await db
          .insert(analyticsSummary)
          .values({
            id: 'global',
            totalVisitors: 0,
            totalContactClicks: 0,
          })
          .onConflictDoNothing();

        seededDone = true;
      } catch (error) {
        seedPromise = null;
        throw error;
      }
    })();
  }
  await seedPromise;
}

function mapSiteConfigRow(row?: typeof siteConfig.$inferSelect): SiteConfig {
  if (!row) return DEFAULT_SITE_CONFIG;
  return {
    brandName: row.brandName,
    brandSubtitle: row.brandSubtitle,
    logoUrl: row.logoUrl,
    hireButtonText: row.hireButtonText,
    availabilityText: row.availabilityText,
    bannerGreeting: row.bannerGreeting,
    bannerHighlight: row.bannerHighlight,
    bannerSubtitle: row.bannerSubtitle,
    bannerDescription: row.bannerDescription,
    bannerImageUrl: row.bannerImageUrl,
    portfolioCtaText: row.portfolioCtaText,
    contactCtaText: row.contactCtaText,
    skillsHeading: row.skillsHeading,
    portfolioHeading: row.portfolioHeading,
    portfolioSubheading: row.portfolioSubheading,
    aboutTitle: row.aboutTitle,
    aboutDescription: row.aboutDescription,
    aboutImageUrl: row.aboutImageUrl,
    quickCard1Title: row.quickCard1Title,
    quickCard1Subtitle: row.quickCard1Subtitle,
    quickCard2Title: row.quickCard2Title,
    quickCard2Subtitle: row.quickCard2Subtitle,
    quickCard3Title: row.quickCard3Title,
    quickCard3Subtitle: row.quickCard3Subtitle,
    whatsappNumber: row.whatsappNumber,
    whatsappGreeting: row.whatsappGreeting,
    telegramGroupUrl: row.telegramGroupUrl,
    facebookUrl: row.facebookUrl,
    youtubeUrl: row.youtubeUrl,
    githubUrl: row.githubUrl,
    linkedinUrl: row.linkedinUrl,
    footerRightsText: row.footerRightsText,
    footerCreditText: row.footerCreditText,
    privacyPolicyText: row.privacyPolicyText,
    termsText: row.termsText,
  };
}

function mapSkillRow(row: typeof skills.$inferSelect): SkillItem {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    iconKey: row.iconKey,
    order: row.order,
  };
}

function mapProjectRow(row: typeof projects.$inferSelect): ProjectItem {
  const cat =
    row.category === 'ecommerce' || row.category === 'web-apps' ? row.category : 'business';
  const catLabel =
    cat === 'ecommerce' ? 'E-Commerce' : cat === 'web-apps' ? 'Web Apps' : 'Business';
  const pType =
    row.previewType === 'portfolio' ||
    row.previewType === 'ecommerce' ||
    row.previewType === 'business' ||
    row.previewType === 'custom'
      ? row.previewType
      : 'custom';
  return {
    id: row.id,
    title: row.title,
    category: cat,
    categoryLabel: catLabel,
    description: row.description,
    longDescription: row.longDescription,
    year: row.year,
    techStack: Array.isArray(row.techStack) ? row.techStack.map(String) : ['React'],
    highlights: Array.isArray(row.highlights) ? row.highlights.map(String) : ['Responsive build'],
    previewType: pType,
    liveUrl: row.liveUrl,
    thumbnailUrl: row.thumbnailUrl,
    status: row.status || 'Published',
  };
}

export async function getPublicPortfolioData() {
  try {
    await ensureSeeded();
    const [configRows, skillRows, projectRows] = await Promise.all([
      db.select().from(siteConfig).where(eq(siteConfig.id, 'main')).limit(1),
      db.select().from(skills).orderBy(asc(skills.order)),
      db.select().from(projects).orderBy(desc(projects.createdAt)),
    ]);

    return {
      siteConfig: mapSiteConfigRow(configRows[0]),
      skills: skillRows.map(mapSkillRow),
      projects: projectRows.map(mapProjectRow),
    };
  } catch (error) {
    console.error('Database query failed in getPublicPortfolioData:', error);
    throw new Error('Failed to load portfolio data. Please try again later.', { cause: error });
  }
}

export async function updateSiteConfigRecord(config: SiteConfig, updatedBy: string) {
  try {
    await ensureSeeded();
    const result = await db
      .insert(siteConfig)
      .values({
        id: 'main',
        ...config,
        updatedBy,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: siteConfig.id,
        set: {
          ...config,
          updatedBy,
          updatedAt: new Date(),
        },
      })
      .returning();

    return mapSiteConfigRow(result[0]);
  } catch (error) {
    console.error('Database query failed in updateSiteConfigRecord:', error);
    throw new Error('Failed to update website settings.', { cause: error });
  }
}

export async function upsertProjectRecord(project: ProjectItem, isNew: boolean) {
  try {
    await ensureSeeded();
    if (isNew) {
      const [inserted] = await db
        .insert(projects)
        .values({
          id: project.id,
          title: project.title,
          category: project.category,
          categoryLabel: project.categoryLabel,
          description: project.description,
          longDescription: project.longDescription,
          year: project.year,
          techStack: project.techStack,
          highlights: project.highlights,
          previewType: project.previewType,
          liveUrl: project.liveUrl,
          thumbnailUrl: project.thumbnailUrl,
          status: project.status || 'Published',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      return mapProjectRow(inserted);
    }

    const [updated] = await db
      .update(projects)
      .set({
        title: project.title,
        category: project.category,
        categoryLabel: project.categoryLabel,
        description: project.description,
        longDescription: project.longDescription,
        year: project.year,
        techStack: project.techStack,
        highlights: project.highlights,
        previewType: project.previewType,
        liveUrl: project.liveUrl,
        thumbnailUrl: project.thumbnailUrl,
        status: project.status || 'Published',
        updatedAt: new Date(),
      })
      .where(eq(projects.id, project.id))
      .returning();

    if (!updated) {
      return null;
    }
    return mapProjectRow(updated);
  } catch (error) {
    console.error('Database query failed in upsertProjectRecord:', error);
    throw new Error('Failed to save portfolio project.', { cause: error });
  }
}

export async function deleteProjectRecord(projectId: string) {
  try {
    await ensureSeeded();
    const deleted = await db.delete(projects).where(eq(projects.id, projectId)).returning();
    return deleted.length > 0;
  } catch (error) {
    console.error('Database query failed in deleteProjectRecord:', error);
    throw new Error('Failed to delete portfolio project.', { cause: error });
  }
}

export async function seedDefaultProjectsRecords() {
  try {
    await ensureSeeded();
    await db
      .insert(projects)
      .values(
        DEFAULT_PROJECTS.map((p) => ({
          id: p.id,
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
          status: 'Published',
        }))
      )
      .onConflictDoNothing();
  } catch (error) {
    console.error('Database query failed in seedDefaultProjectsRecords:', error);
    throw new Error('Failed to restore starter projects.', { cause: error });
  }
}

export async function upsertSkillRecord(skill: SkillItem, isNew: boolean) {
  try {
    await ensureSeeded();
    if (isNew) {
      const [inserted] = await db
        .insert(skills)
        .values({
          id: skill.id,
          name: skill.name,
          role: skill.role,
          iconKey: skill.iconKey,
          order: skill.order,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      return mapSkillRow(inserted);
    }

    const [updated] = await db
      .update(skills)
      .set({
        name: skill.name,
        role: skill.role,
        iconKey: skill.iconKey,
        order: skill.order,
        updatedAt: new Date(),
      })
      .where(eq(skills.id, skill.id))
      .returning();

    if (!updated) {
      return null;
    }
    return mapSkillRow(updated);
  } catch (error) {
    console.error('Database query failed in upsertSkillRecord:', error);
    throw new Error('Failed to save skill.', { cause: error });
  }
}

export async function deleteSkillRecord(skillId: string) {
  try {
    await ensureSeeded();
    const deleted = await db.delete(skills).where(eq(skills.id, skillId)).returning();
    return deleted.length > 0;
  } catch (error) {
    console.error('Database query failed in deleteSkillRecord:', error);
    throw new Error('Failed to delete skill.', { cause: error });
  }
}

export async function seedDefaultSkillsRecords() {
  try {
    await ensureSeeded();
    await db
      .insert(skills)
      .values(
        DEFAULT_SKILLS.map((s) => ({
          id: s.id,
          name: s.name,
          role: s.role,
          iconKey: s.iconKey,
          order: s.order,
        }))
      )
      .onConflictDoNothing();
  } catch (error) {
    console.error('Database query failed in seedDefaultSkillsRecords:', error);
    throw new Error('Failed to restore default skills.', { cause: error });
  }
}

export async function incrementVisitorMetric(dateKey = getTodayDateKey()) {
  try {
    await ensureSeeded();
    await Promise.all([
      db
        .insert(analyticsSummary)
        .values({
          id: 'global',
          totalVisitors: 1,
          totalContactClicks: 0,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: analyticsSummary.id,
          set: {
            totalVisitors: sql`${analyticsSummary.totalVisitors} + 1`,
            updatedAt: new Date(),
          },
        }),
      db
        .insert(analyticsDaily)
        .values({
          dateKey,
          visitors: 1,
          contactClicks: 0,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: analyticsDaily.dateKey,
          set: {
            visitors: sql`${analyticsDaily.visitors} + 1`,
            updatedAt: new Date(),
          },
        }),
    ]);
  } catch (error) {
    console.error('Database query failed in incrementVisitorMetric:', error);
    throw new Error('Failed to record visitor.', { cause: error });
  }
}

export async function incrementContactClickMetric(dateKey = getTodayDateKey()) {
  try {
    await ensureSeeded();
    await Promise.all([
      db
        .insert(analyticsSummary)
        .values({
          id: 'global',
          totalVisitors: 0,
          totalContactClicks: 1,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: analyticsSummary.id,
          set: {
            totalContactClicks: sql`${analyticsSummary.totalContactClicks} + 1`,
            updatedAt: new Date(),
          },
        }),
      db
        .insert(analyticsDaily)
        .values({
          dateKey,
          visitors: 0,
          contactClicks: 1,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: analyticsDaily.dateKey,
          set: {
            contactClicks: sql`${analyticsDaily.contactClicks} + 1`,
            updatedAt: new Date(),
          },
        }),
    ]);
  } catch (error) {
    console.error('Database query failed in incrementContactClickMetric:', error);
    throw new Error('Failed to record contact click.', { cause: error });
  }
}

export async function getAnalyticsReport(todayKey = getTodayDateKey()): Promise<AnalyticsOverview> {
  try {
    await ensureSeeded();
    const [summaryRows, todayRows, historyRows] = await Promise.all([
      db.select().from(analyticsSummary).where(eq(analyticsSummary.id, 'global')).limit(1),
      db.select().from(analyticsDaily).where(eq(analyticsDaily.dateKey, todayKey)).limit(1),
      db.select().from(analyticsDaily).orderBy(desc(analyticsDaily.dateKey)).limit(7),
    ]);

    return {
      totalVisitors: summaryRows[0]?.totalVisitors ?? 0,
      todayVisitors: todayRows[0]?.visitors ?? 0,
      totalContactClicks: summaryRows[0]?.totalContactClicks ?? 0,
      todayContactClicks: todayRows[0]?.contactClicks ?? 0,
      dailyHistory: historyRows.map((r) => ({
        dateKey: r.dateKey,
        visitors: r.visitors,
        contactClicks: r.contactClicks,
      })),
    };
  } catch (error) {
    console.error('Database query failed in getAnalyticsReport:', error);
    throw new Error('Failed to load visitor analytics.', { cause: error });
  }
}

export async function resetAnalyticsMetrics() {
  try {
    await ensureSeeded();
    await Promise.all([
      db
        .update(analyticsSummary)
        .set({ totalVisitors: 0, totalContactClicks: 0, updatedAt: new Date() })
        .where(eq(analyticsSummary.id, 'global')),
      db.delete(analyticsDaily),
    ]);
  } catch (error) {
    console.error('Database query failed in resetAnalyticsMetrics:', error);
    throw new Error('Failed to reset analytics.', { cause: error });
  }
}

export async function getAdminCredentialHash(): Promise<string | null> {
  try {
    const rows = await db
      .select()
      .from(adminCredentials)
      .where(eq(adminCredentials.id, 'primary'))
      .limit(1);
    return rows[0]?.passwordHash ?? null;
  } catch (error) {
    console.error('Database query failed in getAdminCredentialHash:', error);
    throw new Error('Failed to check admin credentials.', { cause: error });
  }
}

export async function claimAdminCredentialHash(passwordHash: string): Promise<boolean> {
  try {
    const inserted = await db
      .insert(adminCredentials)
      .values({
        id: 'primary',
        passwordHash,
      })
      .onConflictDoNothing()
      .returning();
    return inserted.length > 0;
  } catch (error) {
    console.error('Database query failed in claimAdminCredentialHash:', error);
    throw new Error('Failed to save admin passcode.', { cause: error });
  }
}

