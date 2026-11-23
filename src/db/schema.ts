import { integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  role: text('role').notNull().default('user'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const siteConfig = pgTable('site_config', {
  id: text('id').primaryKey(),
  brandName: text('brand_name').notNull(),
  brandSubtitle: text('brand_subtitle').notNull(),
  logoUrl: text('logo_url').notNull().default(''),
  hireButtonText: text('hire_button_text').notNull(),
  availabilityText: text('availability_text').notNull(),
  bannerGreeting: text('banner_greeting').notNull(),
  bannerHighlight: text('banner_highlight').notNull(),
  bannerSubtitle: text('banner_subtitle').notNull(),
  bannerDescription: text('banner_description').notNull(),
  bannerImageUrl: text('banner_image_url').notNull(),
  portfolioCtaText: text('portfolio_cta_text').notNull(),
  contactCtaText: text('contact_cta_text').notNull(),
  skillsHeading: text('skills_heading').notNull(),
  portfolioHeading: text('portfolio_heading').notNull(),
  portfolioSubheading: text('portfolio_subheading').notNull(),
  aboutTitle: text('about_title').notNull(),
  aboutDescription: text('about_description').notNull(),
  aboutImageUrl: text('about_image_url').notNull(),
  quickCard1Title: text('quick_card1_title').notNull(),
  quickCard1Subtitle: text('quick_card1_subtitle').notNull(),
  quickCard2Title: text('quick_card2_title').notNull(),
  quickCard2Subtitle: text('quick_card2_subtitle').notNull(),
  quickCard3Title: text('quick_card3_title').notNull(),
  quickCard3Subtitle: text('quick_card3_subtitle').notNull(),
  whatsappNumber: text('whatsapp_number').notNull(),
  whatsappGreeting: text('whatsapp_greeting').notNull(),
  telegramGroupUrl: text('telegram_group_url').notNull().default(''),
  facebookUrl: text('facebook_url').notNull().default(''),
  youtubeUrl: text('youtube_url').notNull().default(''),
  githubUrl: text('github_url').notNull().default(''),
  linkedinUrl: text('linkedin_url').notNull().default(''),
  footerRightsText: text('footer_rights_text').notNull(),
  footerCreditText: text('footer_credit_text').notNull(),
  privacyPolicyText: text('privacy_policy_text').notNull(),
  termsText: text('terms_text').notNull(),
  updatedBy: text('updated_by').notNull().default(''),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const skills = pgTable('skills', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  iconKey: text('icon_key').notNull(),
  order: integer('order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  category: text('category').notNull(),
  categoryLabel: text('category_label').notNull(),
  description: text('description').notNull(),
  longDescription: text('long_description').notNull(),
  year: text('year').notNull(),
  techStack: jsonb('tech_stack').$type<string[]>().notNull(),
  highlights: jsonb('highlights').$type<string[]>().notNull(),
  previewType: text('preview_type').notNull().default('custom'),
  liveUrl: text('live_url').notNull().default(''),
  thumbnailUrl: text('thumbnail_url').notNull().default(''),
  status: text('status').notNull().default('Published'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const analyticsDaily = pgTable('analytics_daily', {
  dateKey: text('date_key').primaryKey(),
  visitors: integer('visitors').notNull().default(0),
  contactClicks: integer('contact_clicks').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const analyticsSummary = pgTable('analytics_summary', {
  id: text('id').primaryKey(),
  totalVisitors: integer('total_visitors').notNull().default(0),
  totalContactClicks: integer('total_contact_clicks').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow(),
});
