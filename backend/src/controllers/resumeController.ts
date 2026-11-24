import { Request, Response } from 'express';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string }>;
import { resumeService } from '../services/resumeService.js';
import { AppError } from '../middleware/errorHandler.js';
import { getDatabase } from '../config/database.js';
import { ensureCandidateJobMatches } from './jobController.js';

export async function uploadResume(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    const request = req as any;
    if (!request.file) {
      throw new AppError(400, 'No file uploaded');
    }

    const fileBuffer = request.file.buffer;
    const fileName = request.file.originalname;

    // Persist uploaded PDF onto the persistent data volume so ATS submissions attach the candidate's real PDF
    const dbBaseDir = process.env.DB_PATH ? path.dirname(process.env.DB_PATH) : process.cwd();
    const uploadsDir = path.join(dbBaseDir, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]+/g, '_');
    const filePath = path.join(uploadsDir, `${userId}-${Date.now()}-${safeFileName}`);
    try {
      fs.writeFileSync(filePath, fileBuffer);
    } catch (writeErr) {
      console.warn('Could not persist resume file to disk:', writeErr);
    }

    let textContent = '';
    
    if (request.file.mimetype === 'application/pdf') {
      try {
        const parsed = await pdf(fileBuffer);
        textContent = parsed.text;
      } catch (pdfError) {
        console.error('PDF parsing error, attempting text fallback', pdfError);
        textContent = fileBuffer.toString('utf-8');
      }
    } else {
      textContent = fileBuffer.toString('utf-8');
    }

    if (!textContent || textContent.trim().length === 0) {
      throw new AppError(400, 'Failed to extract text from resume');
    }

    const extractedData = await resumeService.extractResumeData(textContent);
    
    const saved = await resumeService.saveResume(
      userId,
      fileName,
      filePath,
      textContent,
      extractedData
    );

    // Automatically calculate profile match scores across existing jobs for candidate
    try {
      await ensureCandidateJobMatches(userId);
    } catch (scoreErr) {
      console.warn('Failed to compute initial job match scores on resume upload:', scoreErr);
    }

    res.status(201).json({
      message: 'Resume uploaded and analyzed successfully',
      resume: saved[0]
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Upload resume controller error:', error);
      res.status(500).json({ error: 'Failed to upload resume' });
    }
  }
}

export async function getResume(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    const db = await getDatabase();
    const result = await db.get(
      `SELECT id, file_name, uploaded_at, skills, experience, education, keywords, builder_data 
       FROM resumes 
       WHERE user_id = ?`,
      [userId]
    );

    if (!result) {
      return res.json(null);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve resume' });
  }
}

export async function saveBuilderData(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    const { builder_data } = req.body;
    if (!builder_data) {
      throw new AppError(400, 'builder_data is required');
    }

    const db = await getDatabase();
    
    const existing = await db.get(`SELECT id FROM resumes WHERE user_id = ?`, [userId]);
    const builderDataJson = JSON.stringify(builder_data);
    
    if (existing) {
      await db.run(
        `UPDATE resumes 
         SET builder_data = ?, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`,
        [builderDataJson, userId]
      );
    } else {
      await db.run(
        `INSERT INTO resumes (user_id, builder_data)
         VALUES (?, ?)`,
        [userId, builderDataJson]
      );
    }

    res.json({ message: 'Resume builder data saved successfully' });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Save builder data error:', error);
      res.status(500).json({ error: 'Failed to save resume builder data' });
    }
  }
}
