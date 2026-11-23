import type { ProjectItem, SiteConfig, SkillItem } from '../lib/portfolioData.ts';
import {
  claimAdminCredentialHash,
  deleteProjectRecord,
  deleteSkillRecord,
  getAdminCredentialHash,
  getAnalyticsReport,
  getPublicPortfolioData,
  incrementContactClickMetric,
  incrementVisitorMetric,
  resetAnalyticsMetrics,
  seedDefaultProjectsRecords,
  seedDefaultSkillsRecords,
  updateSiteConfigRecord,
  upsertProjectRecord,
  upsertSkillRecord,
} from './portfolioRepo.ts';
import {
  isSupabaseConfigured,
  supaClaimAdminCredentialHash,
  supaDeleteProject,
  supaDeleteSkill,
  supaGetAdminCredentialHash,
  supaGetAnalyticsReport,
  supaGetPublicPortfolioData,
  supaIncrementContactClick,
  supaIncrementVisitor,
  supaResetAnalytics,
  supaSeedDefaultProjects,
  supaSeedDefaultSkills,
  supaUpdateSiteConfig,
  supaUpsertProject,
  supaUpsertSkill,
} from './supabaseRepo.ts';

export const store = {
  isSupabaseActive: () => isSupabaseConfigured(),

  getPublicPortfolioData: () =>
    isSupabaseConfigured() ? supaGetPublicPortfolioData() : getPublicPortfolioData(),

  updateSiteConfig: (config: SiteConfig, updatedBy: string) =>
    isSupabaseConfigured()
      ? supaUpdateSiteConfig(config, updatedBy)
      : updateSiteConfigRecord(config, updatedBy),

  upsertProject: (project: ProjectItem, isNew: boolean) =>
    isSupabaseConfigured() ? supaUpsertProject(project, isNew) : upsertProjectRecord(project, isNew),

  deleteProject: (projectId: string) =>
    isSupabaseConfigured() ? supaDeleteProject(projectId) : deleteProjectRecord(projectId),

  seedDefaultProjects: () =>
    isSupabaseConfigured() ? supaSeedDefaultProjects() : seedDefaultProjectsRecords(),

  upsertSkill: (skill: SkillItem, isNew: boolean) =>
    isSupabaseConfigured() ? supaUpsertSkill(skill, isNew) : upsertSkillRecord(skill, isNew),

  deleteSkill: (skillId: string) =>
    isSupabaseConfigured() ? supaDeleteSkill(skillId) : deleteSkillRecord(skillId),

  seedDefaultSkills: () =>
    isSupabaseConfigured() ? supaSeedDefaultSkills() : seedDefaultSkillsRecords(),

  incrementVisitor: () =>
    isSupabaseConfigured() ? supaIncrementVisitor() : incrementVisitorMetric(),

  incrementContactClick: () =>
    isSupabaseConfigured() ? supaIncrementContactClick() : incrementContactClickMetric(),

  getAnalyticsReport: () =>
    isSupabaseConfigured() ? supaGetAnalyticsReport() : getAnalyticsReport(),

  resetAnalytics: () => (isSupabaseConfigured() ? supaResetAnalytics() : resetAnalyticsMetrics()),

  getAdminCredentialHash: () =>
    isSupabaseConfigured() ? supaGetAdminCredentialHash() : getAdminCredentialHash(),

  claimAdminCredentialHash: (passwordHash: string) =>
    isSupabaseConfigured()
      ? supaClaimAdminCredentialHash(passwordHash)
      : claimAdminCredentialHash(passwordHash),
};
