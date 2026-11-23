import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  categoryLabelFromId,
  DEFAULT_SITE_CONFIG,
  isSafeHttpUrl,
  isSafeImageSrc,
  type ProjectCategory,
  type ProjectItem,
  type SiteConfig,
  type SkillItem,
} from './src/lib/portfolioData.ts';
import {
  deleteProjectRecord,
  deleteSkillRecord,
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
} from './src/db/portfolioRepo.ts';
import { requireAdmin, type AuthRequest } from './src/middleware/auth.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

const sseClients = new Set<Response>();

function broadcastRealtime(channel: string) {
  const payload = `event: update\ndata: ${JSON.stringify({ channel, ts: Date.now() })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

function clampString(val: unknown, fallback: string, maxLen: number): string {
  if (typeof val !== 'string') return fallback;
  const trimmed = val.trim();
  return trimmed ? trimmed.slice(0, maxLen) : fallback;
}

function clampOptionalUrl(val: unknown, maxLen: number): string {
  if (typeof val !== 'string') return '';
  const trimmed = val.trim().slice(0, maxLen);
  if (!trimmed) return '';
  return isSafeHttpUrl(trimmed) ? trimmed : '';
}

function clampOptionalImage(val: unknown, fallback = ''): string {
  if (typeof val !== 'string') return fallback;
  const trimmed = val.trim();
  if (!trimmed) return '';
  return isSafeImageSrc(trimmed) ? trimmed : fallback;
}

function isValidEntityId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{1,128}$/.test(id);
}

function sanitizeSiteConfigInput(body: Record<string, unknown>): {
  ok: true;
  data: SiteConfig;
} | {
  ok: false;
  error: string;
} {
  const rawPhone = typeof body.whatsappNumber === 'string' ? body.whatsappNumber.trim() : '';
  const digitsOnly = rawPhone.replace(/\D/g, '');
  if (digitsOnly.length < 7 || digitsOnly.length > 20) {
    return { ok: false, error: 'Please enter a valid WhatsApp number (7–20 digits).' };
  }

  const data: SiteConfig = {
    brandName: clampString(body.brandName, DEFAULT_SITE_CONFIG.brandName, 60),
    brandSubtitle: clampString(body.brandSubtitle, DEFAULT_SITE_CONFIG.brandSubtitle, 60),
    logoUrl: clampOptionalImage(body.logoUrl, ''),
    hireButtonText: clampString(body.hireButtonText, DEFAULT_SITE_CONFIG.hireButtonText, 40),
    availabilityText: clampString(body.availabilityText, DEFAULT_SITE_CONFIG.availabilityText, 80),
    bannerGreeting: clampString(body.bannerGreeting, DEFAULT_SITE_CONFIG.bannerGreeting, 60),
    bannerHighlight: clampString(body.bannerHighlight, DEFAULT_SITE_CONFIG.bannerHighlight, 60),
    bannerSubtitle: clampString(body.bannerSubtitle, DEFAULT_SITE_CONFIG.bannerSubtitle, 100),
    bannerDescription: clampString(body.bannerDescription, DEFAULT_SITE_CONFIG.bannerDescription, 300),
    bannerImageUrl: clampOptionalImage(body.bannerImageUrl, DEFAULT_SITE_CONFIG.bannerImageUrl),
    portfolioCtaText: clampString(body.portfolioCtaText, DEFAULT_SITE_CONFIG.portfolioCtaText, 40),
    contactCtaText: clampString(body.contactCtaText, DEFAULT_SITE_CONFIG.contactCtaText, 40),
    skillsHeading: clampString(body.skillsHeading, DEFAULT_SITE_CONFIG.skillsHeading, 60),
    portfolioHeading: clampString(body.portfolioHeading, DEFAULT_SITE_CONFIG.portfolioHeading, 60),
    portfolioSubheading: clampString(
      body.portfolioSubheading,
      DEFAULT_SITE_CONFIG.portfolioSubheading,
      120
    ),
    aboutTitle: clampString(body.aboutTitle, DEFAULT_SITE_CONFIG.aboutTitle, 60),
    aboutDescription: clampString(body.aboutDescription, DEFAULT_SITE_CONFIG.aboutDescription, 500),
    aboutImageUrl: clampOptionalImage(body.aboutImageUrl, DEFAULT_SITE_CONFIG.aboutImageUrl),
    quickCard1Title: clampString(body.quickCard1Title, DEFAULT_SITE_CONFIG.quickCard1Title, 60),
    quickCard1Subtitle: clampString(
      body.quickCard1Subtitle,
      DEFAULT_SITE_CONFIG.quickCard1Subtitle,
      120
    ),
    quickCard2Title: clampString(body.quickCard2Title, DEFAULT_SITE_CONFIG.quickCard2Title, 60),
    quickCard2Subtitle: clampString(
      body.quickCard2Subtitle,
      DEFAULT_SITE_CONFIG.quickCard2Subtitle,
      120
    ),
    quickCard3Title: clampString(body.quickCard3Title, DEFAULT_SITE_CONFIG.quickCard3Title, 60),
    quickCard3Subtitle: clampString(
      body.quickCard3Subtitle,
      DEFAULT_SITE_CONFIG.quickCard3Subtitle,
      120
    ),
    whatsappNumber: rawPhone.slice(0, 20),
    whatsappGreeting: clampString(body.whatsappGreeting, DEFAULT_SITE_CONFIG.whatsappGreeting, 160),
    telegramGroupUrl: clampOptionalUrl(body.telegramGroupUrl, 240),
    facebookUrl: clampOptionalUrl(body.facebookUrl, 240),
    youtubeUrl: clampOptionalUrl(body.youtubeUrl, 240),
    githubUrl: clampOptionalUrl(body.githubUrl, 240),
    linkedinUrl: clampOptionalUrl(body.linkedinUrl, 240),
    footerRightsText: clampString(body.footerRightsText, DEFAULT_SITE_CONFIG.footerRightsText, 120),
    footerCreditText: clampString(body.footerCreditText, DEFAULT_SITE_CONFIG.footerCreditText, 120),
    privacyPolicyText: clampString(
      body.privacyPolicyText,
      DEFAULT_SITE_CONFIG.privacyPolicyText,
      800
    ),
    termsText: clampString(body.termsText, DEFAULT_SITE_CONFIG.termsText, 800),
  };

  return { ok: true, data };
}

function sanitizeProjectInput(
  id: string,
  body: Record<string, unknown>
): { ok: true; data: ProjectItem } | { ok: false; error: string } {
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 100) : '';
  const description =
    typeof body.description === 'string' ? body.description.trim().slice(0, 300) : '';
  if (!title || !description) {
    return { ok: false, error: 'Project name and short description are required.' };
  }

  const rawCat = body.category;
  const category: Exclude<ProjectCategory, 'all'> =
    rawCat === 'ecommerce' || rawCat === 'web-apps' ? rawCat : 'business';
  const categoryLabel = categoryLabelFromId(category);

  const longDescriptionRaw =
    typeof body.longDescription === 'string' && body.longDescription.trim()
      ? body.longDescription.trim()
      : description;

  const techStack = Array.isArray(body.techStack)
    ? body.techStack
        .map((t) => String(t).trim().slice(0, 40))
        .filter(Boolean)
        .slice(0, 10)
    : [];
  const highlights = Array.isArray(body.highlights)
    ? body.highlights
        .map((h) => String(h).trim().slice(0, 160))
        .filter(Boolean)
        .slice(0, 12)
    : [];

  const previewType =
    body.previewType === 'portfolio' ||
    body.previewType === 'ecommerce' ||
    body.previewType === 'business' ||
    body.previewType === 'custom'
      ? body.previewType
      : category === 'ecommerce'
        ? 'ecommerce'
        : category === 'business'
          ? 'business'
          : 'custom';

  const thumbnailUrl = clampOptionalImage(body.thumbnailUrl, '');
  const liveUrl = clampOptionalUrl(body.liveUrl, 300);

  return {
    ok: true,
    data: {
      id,
      title,
      category,
      categoryLabel,
      description,
      longDescription: longDescriptionRaw.slice(0, 1200),
      year: clampString(body.year, String(new Date().getFullYear()), 10),
      techStack: techStack.length > 0 ? techStack : ['React', 'Tailwind CSS'],
      highlights: highlights.length > 0 ? highlights : ['Responsive modern web build'],
      previewType: thumbnailUrl ? 'custom' : previewType,
      liveUrl,
      thumbnailUrl,
      status: 'Published',
    },
  };
}

function sanitizeSkillInput(
  id: string,
  body: Record<string, unknown>
): { ok: true; data: SkillItem } | { ok: false; error: string } {
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 40) : '';
  if (!name) {
    return { ok: false, error: 'Skill name is required.' };
  }
  const role = clampString(body.role, 'Web Development', 60);
  const iconKey = clampString(body.iconKey, 'custom', 30);
  const parsedOrder = Number(body.order);
  const order = Number.isFinite(parsedOrder)
    ? Math.max(0, Math.min(1000, Math.round(parsedOrder)))
    : 10;

  return {
    ok: true,
    data: { id, name, role, iconKey, order },
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Real-time Server-Sent Events stream for instant User <-> Admin updates
  app.get('/api/realtime', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    res.write(`event: connected\ndata: ${JSON.stringify({ ok: true, ts: Date.now() })}\n\n`);
    sseClients.add(res);

    const keepAlive = setInterval(() => {
      try {
        res.write(': keepalive\n\n');
      } catch {
        clearInterval(keepAlive);
        sseClients.delete(res);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(keepAlive);
      sseClients.delete(res);
    });
  });

  // Public portfolio data endpoint
  app.get('/api/portfolio', async (_req: Request, res: Response) => {
    try {
      const payload = await getPublicPortfolioData();
      res.json(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load portfolio.';
      res.status(500).json({ error: message });
    }
  });

  // Public analytics tracking endpoints (Visitor & Contact Click counters)
  app.post('/api/analytics/visit', async (_req: Request, res: Response) => {
    try {
      await incrementVisitorMetric();
      broadcastRealtime('analytics');
      res.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to track visit.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/analytics/click', async (_req: Request, res: Response) => {
    try {
      await incrementContactClickMetric();
      broadcastRealtime('analytics');
      res.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to track click.';
      res.status(500).json({ error: message });
    }
  });

  // Protected Admin Overview (includes Visitor Analytics + full config/skills/projects)
  app.get('/api/admin/overview', requireAdmin, async (_req: AuthRequest, res: Response) => {
    try {
      const [portfolio, analytics] = await Promise.all([
        getPublicPortfolioData(),
        getAnalyticsReport(),
      ]);
      res.json({ ...portfolio, analytics });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load admin overview.';
      res.status(500).json({ error: message });
    }
  });

  // Protected Admin: Update Website Config (Logo, Banner, Telegram, Social, About, Cards, Footer)
  app.put('/api/admin/config', requireAdmin, async (req: AuthRequest, res: Response) => {
    const parsed = sanitizeSiteConfigInput((req.body || {}) as Record<string, unknown>);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    try {
      const updated = await updateSiteConfigRecord(parsed.data, req.user?.uid || 'admin');
      broadcastRealtime('config');
      res.json({ siteConfig: updated });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save configuration.';
      res.status(500).json({ error: message });
    }
  });

  // Protected Admin: Create Project
  app.post('/api/admin/projects', requireAdmin, async (req: AuthRequest, res: Response) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const rawId =
      typeof body.id === 'string' && isValidEntityId(body.id) ? body.id : `proj-${Date.now()}`;
    const parsed = sanitizeProjectInput(rawId, body);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    try {
      const saved = await upsertProjectRecord(parsed.data, true);
      broadcastRealtime('projects');
      res.status(201).json({ project: saved });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create project.';
      res.status(500).json({ error: message });
    }
  });

  // Protected Admin: Update Project
  app.put('/api/admin/projects/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id || '');
    if (!isValidEntityId(id)) {
      res.status(400).json({ error: 'Invalid project ID.' });
      return;
    }
    const parsed = sanitizeProjectInput(id, (req.body || {}) as Record<string, unknown>);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    try {
      const saved = await upsertProjectRecord(parsed.data, false);
      if (!saved) {
        res.status(404).json({ error: 'Project not found.' });
        return;
      }
      broadcastRealtime('projects');
      res.json({ project: saved });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update project.';
      res.status(500).json({ error: message });
    }
  });

  // Protected Admin: Delete Project
  app.delete('/api/admin/projects/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id || '');
    if (!isValidEntityId(id)) {
      res.status(400).json({ error: 'Invalid project ID.' });
      return;
    }
    try {
      const deleted = await deleteProjectRecord(id);
      if (!deleted) {
        res.status(404).json({ error: 'Project not found.' });
        return;
      }
      broadcastRealtime('projects');
      res.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete project.';
      res.status(500).json({ error: message });
    }
  });

  // Protected Admin: Restore Starter Projects
  app.post('/api/admin/projects/seed', requireAdmin, async (_req: AuthRequest, res: Response) => {
    try {
      await seedDefaultProjectsRecords();
      broadcastRealtime('projects');
      res.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to restore projects.';
      res.status(500).json({ error: message });
    }
  });

  // Protected Admin: Create Skill
  app.post('/api/admin/skills', requireAdmin, async (req: AuthRequest, res: Response) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const rawId =
      typeof body.id === 'string' && isValidEntityId(body.id) ? body.id : `skill-${Date.now()}`;
    const parsed = sanitizeSkillInput(rawId, body);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    try {
      const saved = await upsertSkillRecord(parsed.data, true);
      broadcastRealtime('skills');
      res.status(201).json({ skill: saved });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create skill.';
      res.status(500).json({ error: message });
    }
  });

  // Protected Admin: Update Skill
  app.put('/api/admin/skills/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id || '');
    if (!isValidEntityId(id)) {
      res.status(400).json({ error: 'Invalid skill ID.' });
      return;
    }
    const parsed = sanitizeSkillInput(id, (req.body || {}) as Record<string, unknown>);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    try {
      const saved = await upsertSkillRecord(parsed.data, false);
      if (!saved) {
        res.status(404).json({ error: 'Skill not found.' });
        return;
      }
      broadcastRealtime('skills');
      res.json({ skill: saved });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update skill.';
      res.status(500).json({ error: message });
    }
  });

  // Protected Admin: Delete Skill
  app.delete('/api/admin/skills/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id || '');
    if (!isValidEntityId(id)) {
      res.status(400).json({ error: 'Invalid skill ID.' });
      return;
    }
    try {
      const deleted = await deleteSkillRecord(id);
      if (!deleted) {
        res.status(404).json({ error: 'Skill not found.' });
        return;
      }
      broadcastRealtime('skills');
      res.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete skill.';
      res.status(500).json({ error: message });
    }
  });

  // Protected Admin: Restore Default Skills
  app.post('/api/admin/skills/seed', requireAdmin, async (_req: AuthRequest, res: Response) => {
    try {
      await seedDefaultSkillsRecords();
      broadcastRealtime('skills');
      res.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to restore skills.';
      res.status(500).json({ error: message });
    }
  });

  // Protected Admin: Reset Visitor Analytics
  app.post(
    '/api/admin/analytics/reset',
    requireAdmin,
    async (_req: AuthRequest, res: Response) => {
      try {
        await resetAnalyticsMetrics();
        broadcastRealtime('analytics');
        res.json({ ok: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to reset analytics.';
        res.status(500).json({ error: message });
      }
    }
  );

  // Vite Dev Middleware or Static Production Build
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
