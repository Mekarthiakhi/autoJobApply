import { StructuredResume } from './types.js';
import { logger } from '../utils/logger.js';
import { chromium, Browser } from 'playwright';

export class PDFExporter {
  private browserInstance: Browser | null = null;

  /**
   * Render structured resume data to clean, ATS-compliant HTML
   */
  renderToHTML(resume: StructuredResume): string {
    const { basics, skills, experience, education, projects, certifications } = resume;

    const contactParts = [
      basics.email,
      basics.phone,
      basics.location,
      basics.linkedinUrl ? `<a href="${basics.linkedinUrl}">LinkedIn</a>` : null,
      basics.githubUrl ? `<a href="${basics.githubUrl}">GitHub</a>` : null,
      basics.portfolioUrl ? `<a href="${basics.portfolioUrl}">Portfolio</a>` : null,
    ].filter(Boolean).join(' • ');

    const experienceHTML = (experience || []).map(exp => `
      <div class="item">
        <div class="item-header">
          <div class="title-company">
            <strong>${this.escape(exp.role)}</strong>, <em>${this.escape(exp.company)}</em>
          </div>
          <div class="dates">${this.escape(exp.startDate)} – ${this.escape(exp.endDate)}</div>
        </div>
        ${exp.location ? `<div class="location">${this.escape(exp.location)}</div>` : ''}
        <ul class="bullets">
          ${(exp.highlights || []).map(h => `<li>${this.escape(h)}</li>`).join('')}
        </ul>
      </div>
    `).join('');

    const educationHTML = (education || []).map(edu => `
      <div class="item">
        <div class="item-header">
          <div class="title-company">
            <strong>${this.escape(edu.degree)}</strong> ${edu.fieldOfStudy ? `in ${this.escape(edu.fieldOfStudy)}` : ''}
          </div>
          <div class="dates">${edu.graduationYear ? this.escape(edu.graduationYear) : ''}</div>
        </div>
        <div class="institution">${this.escape(edu.institution)}</div>
      </div>
    `).join('');

    const projectsHTML = (projects || []).map(proj => `
      <div class="item">
        <div class="item-header">
          <div class="title-company">
            <strong>${this.escape(proj.name)}</strong>
          </div>
          ${proj.link ? `<div class="dates"><a href="${proj.link}">View Project</a></div>` : ''}
        </div>
        <p class="description">${this.escape(proj.description)}</p>
        ${proj.technologies && proj.technologies.length > 0 ? `
          <div class="skills-line"><strong>Technologies:</strong> ${this.escape(proj.technologies.join(', '))}</div>
        ` : ''}
      </div>
    `).join('');

    const certificationsHTML = (certifications || []).map(cert => `
      <div class="cert-item">
        <strong>${this.escape(cert.name)}</strong> – ${this.escape(cert.issuer)} ${cert.issueDate ? `(${this.escape(cert.issueDate)})` : ''}
      </div>
    `).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${this.escape(basics.fullName)} - Resume</title>
<style>
  @page {
    size: A4;
    margin: 0.5in;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #1f2937;
    background: #ffffff;
    line-height: 1.45;
    font-size: 10.5pt;
    margin: 0;
    padding: 0;
  }
  .header {
    text-align: center;
    border-bottom: 2px solid #2563eb;
    padding-bottom: 8px;
    margin-bottom: 14px;
  }
  .header h1 {
    margin: 0 0 4px 0;
    font-size: 22pt;
    font-weight: 700;
    color: #111827;
    letter-spacing: -0.5px;
  }
  .contact {
    font-size: 9.5pt;
    color: #4b5563;
  }
  .contact a {
    color: #2563eb;
    text-decoration: none;
  }
  .section {
    margin-bottom: 14px;
  }
  .section-title {
    font-size: 11.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #1e3a8a;
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 3px;
    margin-bottom: 8px;
  }
  .summary {
    font-size: 10pt;
    color: #374151;
    margin: 0;
  }
  .item {
    margin-bottom: 10px;
    page-break-inside: avoid;
  }
  .item-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .title-company {
    font-size: 10.5pt;
    color: #111827;
  }
  .dates {
    font-size: 9.5pt;
    color: #6b7280;
    font-weight: 500;
  }
  .location, .institution {
    font-size: 9pt;
    color: #6b7280;
    margin-top: 1px;
  }
  .bullets {
    margin: 4px 0 0 0;
    padding-left: 18px;
  }
  .bullets li {
    font-size: 10pt;
    color: #374151;
    margin-bottom: 3px;
  }
  .skills-table {
    display: table;
    width: 100%;
    font-size: 10pt;
  }
  .skill-row {
    display: table-row;
    line-height: 1.6;
  }
  .skill-label {
    display: table-cell;
    font-weight: 600;
    width: 140px;
    color: #111827;
  }
  .skill-val {
    display: table-cell;
    color: #374151;
  }
  .cert-item {
    font-size: 10pt;
    margin-bottom: 4px;
  }
</style>
</head>
<body>
  <div class="header">
    <h1>${this.escape(basics.fullName)}</h1>
    <div class="contact">${contactParts}</div>
  </div>

  ${basics.summary ? `
  <div class="section">
    <div class="section-title">Professional Summary</div>
    <p class="summary">${this.escape(basics.summary)}</p>
  </div>` : ''}

  ${skills.all && skills.all.length > 0 ? `
  <div class="section">
    <div class="section-title">Technical Skills</div>
    <div class="skills-table">
      ${skills.languages && skills.languages.length > 0 ? `
      <div class="skill-row"><div class="skill-label">Languages:</div><div class="skill-val">${this.escape(skills.languages.join(', '))}</div></div>` : ''}
      ${skills.frameworks && skills.frameworks.length > 0 ? `
      <div class="skill-row"><div class="skill-label">Frameworks & Libs:</div><div class="skill-val">${this.escape(skills.frameworks.join(', '))}</div></div>` : ''}
      ${skills.cloudDevOps && skills.cloudDevOps.length > 0 ? `
      <div class="skill-row"><div class="skill-label">Cloud & DevOps:</div><div class="skill-val">${this.escape(skills.cloudDevOps.join(', '))}</div></div>` : ''}
      ${skills.databases && skills.databases.length > 0 ? `
      <div class="skill-row"><div class="skill-label">Databases:</div><div class="skill-val">${this.escape(skills.databases.join(', '))}</div></div>` : ''}
      ${skills.tools && skills.tools.length > 0 ? `
      <div class="skill-row"><div class="skill-label">Developer Tools:</div><div class="skill-val">${this.escape(skills.tools.join(', '))}</div></div>` : ''}
      ${skills.softSkills && skills.softSkills.length > 0 ? `
      <div class="skill-row"><div class="skill-label">Core Competencies:</div><div class="skill-val">${this.escape(skills.softSkills.join(', '))}</div></div>` : ''}
    </div>
  </div>` : ''}

  ${experience && experience.length > 0 ? `
  <div class="section">
    <div class="section-title">Work Experience</div>
    ${experienceHTML}
  </div>` : ''}

  ${education && education.length > 0 ? `
  <div class="section">
    <div class="section-title">Education</div>
    ${educationHTML}
  </div>` : ''}

  ${projects && projects.length > 0 ? `
  <div class="section">
    <div class="section-title">Featured Projects</div>
    ${projectsHTML}
  </div>` : ''}

  ${certifications && certifications.length > 0 ? `
  <div class="section">
    <div class="section-title">Certifications</div>
    ${certificationsHTML}
  </div>` : ''}
</body>
</html>`;
  }

  /**
   * Export resume as PDF buffer using Playwright headless Chromium
   */
  async exportToPDF(resume: StructuredResume): Promise<Buffer> {
    const html = this.renderToHTML(resume);
    let browser: Browser | null = null;

    try {
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.setContent(html, { waitUntil: 'load' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0.5in',
          bottom: '0.5in',
          left: '0.5in',
          right: '0.5in',
        },
      });

      return pdfBuffer;
    } catch (error: any) {
      logger.error('Playwright PDF generation failed', { error: error.message });
      throw new Error(`Failed to generate PDF: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close().catch(() => {});
      }
    }
  }

  private escape(str?: string): string {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

export const pdfExporter = new PDFExporter();

