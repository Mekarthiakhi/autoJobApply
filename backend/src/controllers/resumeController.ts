import { Request, Response } from 'express';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
// pdf-parse is a CommonJS package; require() works reliably in ESM via createRequire
const pdf = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string }>;
import { resumeService } from '../services/resumeService.js';
import { AppError } from '../middleware/errorHandler.js';
import { getDatabase } from '../config/database.js';

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
    
    // We can save a placeholder file path or similar
    const filePath = `uploads/${userId}-${Date.now()}-${fileName}`;

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
      // Fallback for docx or txt (just reading buffer as string)
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

    const sql = getDatabase();
    const result = await sql`
      SELECT id, file_name, uploaded_at, skills, experience, education, keywords 
      FROM resumes 
      WHERE user_id = ${userId}
    `;

    if (result.length === 0) {
      return res.json(null);
    }

    res.json(result[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve resume' });
  }
}
