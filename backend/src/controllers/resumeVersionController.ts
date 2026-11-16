import { Request, Response } from 'express';
import { ResumeVersionRepository } from '../repositories/resumeVersionRepository.js';
import { ApplicationRepository } from '../repositories/applicationRepository.js';
import { JobRepository } from '../repositories/jobRepository.js';
import { 
  candidateExtractor, 
  atsEvaluator, 
  resumeTailoringEngine, 
  documentValidator, 
  pdfExporter,
  StructuredResume 
} from '../resumes/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string }>;

const resumeVersionRepository = new ResumeVersionRepository();
const applicationRepository = new ApplicationRepository();
const jobRepository = new JobRepository();

/**
 * Get all resume versions for the authenticated user
 */
export async function getResumeVersions(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const versions = await resumeVersionRepository.findByUserId(userId);
    const parsedVersions = versions.map(v => ({
      ...v,
      skills: v.skills ? JSON.parse(v.skills) : [],
      structured_data: v.structured_data ? JSON.parse(v.structured_data) : null,
    }));

    res.json(parsedVersions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch resume versions' });
  }
}

/**
 * Get single resume version by ID
 */
export async function getResumeVersion(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { id } = req.params;
    const version = await resumeVersionRepository.findById(id);
    if (!version) throw new AppError(404, 'Resume version not found');
    if (version.user_id !== userId) throw new AppError(403, 'Forbidden');

    res.json({
      ...version,
      skills: version.skills ? JSON.parse(version.skills) : [],
      structured_data: version.structured_data ? JSON.parse(version.structured_data) : null,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to fetch resume version' });
    }
  }
}

/**
 * Create a new resume version from upload or text
 */
export async function createResumeVersion(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { label } = req.body;
    if (!label || typeof label !== 'string' || label.trim().length === 0) {
      throw new AppError(400, 'label is required');
    }

    let textContent = '';
    let fileName: string | null = null;
    let structuredData: StructuredResume | null = null;

    const request = req as any;
    if (request.file) {
      fileName = request.file.originalname;
      const fileBuffer = request.file.buffer;

      if (request.file.mimetype === 'application/pdf') {
        try {
          const parsed = await pdf(fileBuffer);
          textContent = parsed.text;
        } catch {
          textContent = fileBuffer.toString('utf-8');
        }
      } else {
        textContent = fileBuffer.toString('utf-8');
      }

      // Extract full structured candidate data
      structuredData = await candidateExtractor.extract(textContent);
    } else if (req.body.textContent) {
      textContent = req.body.textContent;
      structuredData = req.body.structuredData || await candidateExtractor.extract(textContent);
    } else if (req.body.structuredData) {
      structuredData = req.body.structuredData;
      textContent = req.body.textContent || JSON.stringify(structuredData);
    }

    const skills = structuredData?.skills?.all || [];

    const version = await resumeVersionRepository.create(
      userId,
      label.trim(),
      fileName,
      textContent,
      skills,
      {
        structuredData,
      }
    );

    res.status(201).json({
      ...version,
      skills,
      structured_data: structuredData,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Create resume version error:', error);
      res.status(500).json({ error: 'Failed to create resume version' });
    }
  }
}

/**
 * Update an existing resume version (editable by candidate)
 */
export async function updateResumeVersion(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { id } = req.params;
    const existing = await resumeVersionRepository.findById(id);
    if (!existing) throw new AppError(404, 'Resume version not found');
    if (existing.user_id !== userId) throw new AppError(403, 'Forbidden');

    const { label, textContent, structuredData, skills, atsScore } = req.body;
    const updateData: any = {};
    if (label !== undefined) updateData.label = label;
    if (textContent !== undefined) updateData.textContent = textContent;
    if (structuredData !== undefined) updateData.structuredData = structuredData;
    if (skills !== undefined) updateData.skills = skills;
    if (atsScore !== undefined) updateData.atsScore = atsScore;

    const updated = await resumeVersionRepository.update(id, updateData);
    if (!updated) throw new AppError(500, 'Failed to update resume version');

    res.json({
      ...updated,
      skills: updated.skills ? JSON.parse(updated.skills) : [],
      structured_data: updated.structured_data ? JSON.parse(updated.structured_data) : null,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update resume version' });
    }
  }
}

/**
 * Delete a resume version
 */
export async function deleteResumeVersion(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { id } = req.params;
    const existing = await resumeVersionRepository.findById(id);
    if (!existing) throw new AppError(404, 'Resume version not found');
    if (existing.user_id !== userId) throw new AppError(403, 'Forbidden');

    const deleted = await resumeVersionRepository.delete(id, userId);
    if (!deleted) throw new AppError(404, 'Resume version not found or unauthorized');

    res.json({ message: 'Resume version deleted' });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to delete resume version' });
    }
  }
}

/**
 * Set default resume version
 */
export async function setDefaultResumeVersion(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { id } = req.params;
    const existing = await resumeVersionRepository.findById(id);
    if (!existing) throw new AppError(404, 'Resume version not found');
    if (existing.user_id !== userId) throw new AppError(403, 'Forbidden');

    await resumeVersionRepository.setDefault(userId, id);
    res.json({ message: 'Default resume version updated' });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to set default resume version' });
    }
  }
}

/**
 * Parse text or uploaded resume without saving (Live Preview / Candidate inspection)
 */
export async function parseResume(req: Request, res: Response) {
  try {
    let textContent = '';
    const request = req as any;

    if (request.file) {
      const fileBuffer = request.file.buffer;
      if (request.file.mimetype === 'application/pdf') {
        try {
          const parsed = await pdf(fileBuffer);
          textContent = parsed.text;
        } catch {
          textContent = fileBuffer.toString('utf-8');
        }
      } else {
        textContent = fileBuffer.toString('utf-8');
      }
    } else if (req.body.textContent) {
      textContent = req.body.textContent;
    }

    if (!textContent || !textContent.trim()) {
      throw new AppError(400, 'No resume text or file provided for parsing');
    }

    const structured = await candidateExtractor.extract(textContent);
    res.json(structured);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to extract structured resume' });
    }
  }
}

/**
 * Calculate ATS Compatibility Score & grounded suggestions
 */
export async function calculateATSScore(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { id } = req.params;
    const version = await resumeVersionRepository.findById(id);
    if (!version) throw new AppError(404, 'Resume version not found');
    if (version.user_id !== userId) throw new AppError(403, 'Forbidden');

    const { jobId, jobTitle, jobDescription, requiredSkills, companyName } = req.body;

    let targetJob: any = {
      title: jobTitle,
      description: jobDescription,
      requiredSkills,
      companyName,
    };

    if (jobId) {
      const foundJob = await jobRepository.findById(jobId);
      if (foundJob) {
        targetJob = {
          title: foundJob.title,
          description: foundJob.job_description || '',
          requiredSkills: Array.isArray(foundJob.required_skills)
            ? foundJob.required_skills
            : (typeof foundJob.required_skills === 'string' ? JSON.parse(foundJob.required_skills) : []),
          companyName: foundJob.company_name,
        };
      }
    }

    if (!targetJob.description && !targetJob.title) {
      throw new AppError(400, 'Target job information (jobId or title and description) is required');
    }

    const structuredData: StructuredResume = version.structured_data
      ? JSON.parse(version.structured_data)
      : candidateExtractor.extractDeterministically(version.text_content || '');

    const assessment = await atsEvaluator.evaluate(structuredData, targetJob);

    // Update the version's ats_score in database
    await resumeVersionRepository.update(id, { atsScore: assessment.overallScore });

    res.json(assessment);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Calculate ATS score error:', error);
      res.status(500).json({ error: 'Failed to calculate ATS compatibility score' });
    }
  }
}

/**
 * Generate job-specific resume draft (Never modifies original; creates child version)
 */
export async function generateTailoredDraft(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { id } = req.params;
    const parentVersion = await resumeVersionRepository.findById(id);
    if (!parentVersion) throw new AppError(404, 'Baseline resume version not found');
    if (parentVersion.user_id !== userId) throw new AppError(403, 'Forbidden');

    const { jobId, jobTitle, companyName, jobDescription, requiredSkills } = req.body;

    let targetJob: any = {
      id: jobId || 'custom-job',
      title: jobTitle,
      companyName: companyName,
      description: jobDescription,
      requiredSkills: requiredSkills || [],
    };

    if (jobId) {
      const foundJob = await jobRepository.findById(jobId);
      if (foundJob) {
        targetJob = {
          id: foundJob.id,
          title: foundJob.title,
          companyName: foundJob.company_name,
          description: foundJob.job_description || '',
          requiredSkills: Array.isArray(foundJob.required_skills)
            ? foundJob.required_skills
            : (typeof foundJob.required_skills === 'string' ? JSON.parse(foundJob.required_skills) : []),
        };
      }
    }

    if (!targetJob.title || !targetJob.description) {
      throw new AppError(400, 'Target job details (jobId or title and description) are required');
    }

    const baselineStructured: StructuredResume = parentVersion.structured_data
      ? JSON.parse(parentVersion.structured_data)
      : candidateExtractor.extractDeterministically(parentVersion.text_content || '');

    // Generate tailored draft
    const tailoredDraft = await resumeTailoringEngine.generateTailoredDraft(
      baselineStructured,
      id,
      targetJob
    );

    // Save as distinct child version preserving original
    const childLabel = `Tailored for ${targetJob.companyName || 'Job'} - ${targetJob.title}`;
    const savedChild = await resumeVersionRepository.create(
      userId,
      childLabel,
      parentVersion.file_name,
      JSON.stringify(tailoredDraft.fullStructuredData),
      tailoredDraft.tailoredSkills.all,
      {
        structuredData: tailoredDraft.fullStructuredData,
        parentVersionId: id,
        targetJobId: targetJob.id,
        atsScore: tailoredDraft.atsScoreExpected,
        versionNumber: (parentVersion.version_number || 1) + 1,
      }
    );

    res.status(201).json({
      draft: tailoredDraft,
      savedVersion: {
        ...savedChild,
        skills: tailoredDraft.tailoredSkills.all,
        structured_data: tailoredDraft.fullStructuredData,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Tailor resume draft error:', error);
      res.status(500).json({ error: 'Failed to generate tailored resume draft' });
    }
  }
}

/**
 * Validate resume completeness and formatting
 */
export async function validateResume(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { id } = req.params;
    const version = await resumeVersionRepository.findById(id);
    if (!version) throw new AppError(404, 'Resume version not found');
    if (version.user_id !== userId) throw new AppError(403, 'Forbidden');

    const structuredData: StructuredResume = version.structured_data
      ? JSON.parse(version.structured_data)
      : candidateExtractor.extractDeterministically(version.text_content || '');

    const validation = documentValidator.validate(structuredData);
    res.json(validation);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to validate resume' });
    }
  }
}

/**
 * Clone a resume version for candidate manual revision
 */
export async function cloneResumeVersion(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { id } = req.params;
    const { label } = req.body;
    const newLabel = label || `Copy of version`;

    const cloned = await resumeVersionRepository.clone(userId, id, newLabel);
    res.status(201).json({
      ...cloned,
      skills: cloned.skills ? JSON.parse(cloned.skills) : [],
      structured_data: cloned.structured_data ? JSON.parse(cloned.structured_data) : null,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to clone resume version' });
  }
}

/**
 * Export resume as ATS-compliant PDF
 */
export async function exportPDF(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { id } = req.params;
    const version = await resumeVersionRepository.findById(id);
    if (!version) throw new AppError(404, 'Resume version not found');
    if (version.user_id !== userId) throw new AppError(403, 'Forbidden');

    const structuredData: StructuredResume = version.structured_data
      ? JSON.parse(version.structured_data)
      : candidateExtractor.extractDeterministically(version.text_content || '');

    const pdfBuffer = await pdfExporter.exportToPDF(structuredData);

    const safeName = (structuredData.basics.fullName || 'Resume').replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}_Resume.pdf"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('PDF export error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate resume PDF' });
  }
}

/**
 * Export resume as HTML (for browser view or fallback)
 */
export async function exportHTML(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { id } = req.params;
    const version = await resumeVersionRepository.findById(id);
    if (!version) throw new AppError(404, 'Resume version not found');
    if (version.user_id !== userId) throw new AppError(403, 'Forbidden');

    const structuredData: StructuredResume = version.structured_data
      ? JSON.parse(version.structured_data)
      : candidateExtractor.extractDeterministically(version.text_content || '');

    const html = pdfExporter.renderToHTML(structuredData);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to generate resume HTML' });
  }
}

/**
 * Get applications that used this specific resume version (Requirement 12)
 */
export async function getVersionApplications(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { id } = req.params;
    const version = await resumeVersionRepository.findById(id);
    if (!version) throw new AppError(404, 'Resume version not found');
    if (version.user_id !== userId) throw new AppError(403, 'Forbidden');

    const applications = await applicationRepository.findByResumeVersionId(userId, id);
    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch version applications' });
  }
}
