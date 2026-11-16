import { StructuredResume, DocumentValidationResult } from './types.js';

export class DocumentValidator {
  /**
   * Validate a structured resume for completeness and ATS scannability
   */
  validate(resume: StructuredResume): DocumentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missingSections: string[] = [];

    // 1. Contact / Basics Validation
    if (!resume.basics.fullName || resume.basics.fullName.trim().length === 0 || resume.basics.fullName === 'Candidate') {
      errors.push('Candidate full name is missing.');
    }

    if (!resume.basics.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resume.basics.email)) {
      errors.push('A valid contact email address is required.');
    }

    if (!resume.basics.phone) {
      warnings.push('Phone number is missing. Most recruiters expect a contact phone number.');
    }

    if (!resume.basics.location) {
      warnings.push('Geographic location (City, State/Country) is missing.');
    }

    // 2. Sections Validation
    if (!resume.experience || resume.experience.length === 0) {
      errors.push('Work experience section is missing or empty.');
      missingSections.push('Experience');
    } else {
      for (const exp of resume.experience) {
        if (!exp.company || !exp.role) {
          warnings.push('One or more work experience entries lack a clear company or job title.');
        }
        if (!exp.highlights || exp.highlights.length === 0) {
          warnings.push(`Work experience at ${exp.company || 'a company'} lacks bullet point achievements.`);
        }
      }
    }

    if (!resume.skills || !resume.skills.all || resume.skills.all.length === 0) {
      errors.push('Skills section contains no technical competencies.');
      missingSections.push('Skills');
    } else if (resume.skills.all.length < 5) {
      warnings.push('Fewer than 5 skills listed. Consider adding core tools and languages.');
    }

    if (!resume.education || resume.education.length === 0) {
      warnings.push('Education history is missing.');
      missingSections.push('Education');
    }

    if (!resume.projects || resume.projects.length === 0) {
      missingSections.push('Projects');
    }

    // 3. Length & Page Count Estimation
    const serializedText = this.getSerializedText(resume);
    const charCount = serializedText.length;
    const words = serializedText.split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    // Standard single-column resume is ~450-550 words per page
    const estimatedPageCount = Math.max(1, Math.ceil(wordCount / 500));

    if (wordCount < 150) {
      errors.push(`Resume content is very brief (${wordCount} words). A standard resume is typically 350-800 words.`);
    } else if (estimatedPageCount > 2) {
      warnings.push(`Resume is approximately ${estimatedPageCount} pages (${wordCount} words). For standard ATS applications, a 1-to-2 page length is recommended.`);
    }

    // 4. Special characters check
    if (/[\uFF00-\uFFFF]/.test(serializedText)) {
      warnings.push('Contains full-width or non-standard unicode characters that may cause issues with legacy ATS parsers.');
    }

    const isValid = errors.length === 0;

    return {
      isValid,
      errors,
      warnings,
      charCount,
      wordCount,
      estimatedPageCount,
      missingSections,
    };
  }

  private getSerializedText(resume: StructuredResume): string {
    const parts = [
      resume.basics.fullName,
      resume.basics.email,
      resume.basics.phone || '',
      resume.basics.location || '',
      resume.basics.summary || '',
      (resume.skills?.all || []).join(', '),
      ...(resume.experience || []).flatMap(e => [e.company, e.role, ...(e.highlights || [])]),
      ...(resume.education || []).flatMap(e => [e.institution, e.degree, e.fieldOfStudy || '']),
      ...(resume.projects || []).flatMap(p => [p.name, p.description, ...(p.technologies || [])]),
      ...(resume.certifications || []).map(c => `${c.name} ${c.issuer}`),
    ];
    return parts.filter(Boolean).join(' ');
  }
}

export const documentValidator = new DocumentValidator();

