import React, { useState, useEffect } from 'react';
import styles from './ResumeBuilder.module.css';
import client from '../../api/auth';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { useToast } from '../../context/ToastContext';

export interface Experience {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  year: string;
}

export interface ResumeData {
  fullName: string;
  email: string;
  phone: string;
  linkedin: string;
  summary: string;
  skills: string;
  experience: Experience[];
  education: Education[];
}

export const ResumeBuilder: React.FC = () => {
  const toast = useToast();
  const [data, setData] = useState<ResumeData>({
    fullName: '',
    email: '',
    phone: '',
    linkedin: '',
    summary: '',
    skills: '',
    experience: [],
    education: [],
  });
  
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchResumeData();
  }, []);

  const fetchResumeData = async () => {
    try {
      setLoading(true);
      const res = await client.get('/resumes');
      const raw = res.data?.builder_data;
      if (raw) {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        const contact = parsed.contact || {};
        const rawExp = Array.isArray(parsed.experience)
          ? parsed.experience
          : Array.isArray(parsed.experiences)
          ? parsed.experiences
          : [];
        const rawEdu = Array.isArray(parsed.education) ? parsed.education : [];
        const rawSkills = Array.isArray(parsed.skills)
          ? parsed.skills.map((s: any) => (typeof s === 'string' ? s : s.items?.join(', ') || s.name || '')).filter(Boolean).join(', ')
          : typeof parsed.skills === 'string'
          ? parsed.skills
          : '';

        setData({
          fullName: parsed.fullName || contact.fullName || parsed.name || '',
          email: parsed.email || contact.email || '',
          phone: parsed.phone || contact.phone || '',
          linkedin: parsed.linkedin || contact.linkedin || contact.portfolio || '',
          summary: parsed.summary || '',
          skills: rawSkills,
          experience: rawExp.map((exp: any, idx: number) => ({
            id: exp.id || `exp-${idx}`,
            company: exp.company || '',
            position: exp.position || exp.role || exp.title || '',
            startDate: exp.startDate || exp.start || '',
            endDate: exp.endDate || exp.end || '',
            description: Array.isArray(exp.bullets)
              ? exp.bullets.join('\n')
              : exp.description || '',
          })),
          education: rawEdu.map((edu: any, idx: number) => ({
            id: edu.id || `edu-${idx}`,
            institution: edu.institution || edu.school || '',
            degree: edu.degree || '',
            year: edu.year || edu.graduationDate || edu.dates || '',
          })),
        });
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch builder data', err);
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaveStatus('Saving...');
      await client.put('/resumes/builder', { builder_data: data });
      setSaveStatus('Saved successfully!');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus('Failed to save.');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleDownloadPdf = async () => {
    const input = document.getElementById('resume-preview-content');
    if (!input) return;
    
    try {
      const canvas = await html2canvas(input, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${data.fullName || 'Resume'}_ATS.pdf`);
      toast.success('ATS Resume PDF downloaded!');
    } catch (err) {
      console.error('Failed to generate PDF', err);
      toast.error('Failed to generate PDF');
    }
  };

  const handleInputChange = (field: keyof ResumeData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const addExperience = () => {
    setData((prev) => ({
      ...prev,
      experience: [
        ...prev.experience,
        { id: Date.now().toString(), company: '', position: '', startDate: '', endDate: '', description: '' },
      ],
    }));
  };

  const updateExperience = (id: string, field: keyof Experience, value: string) => {
    setData((prev) => ({
      ...prev,
      experience: prev.experience.map((exp) => (exp.id === id ? { ...exp, [field]: value } : exp)),
    }));
  };

  const removeExperience = (id: string) => {
    setData((prev) => ({
      ...prev,
      experience: prev.experience.filter((exp) => exp.id !== id),
    }));
  };

  const addEducation = () => {
    setData((prev) => ({
      ...prev,
      education: [
        ...prev.education,
        { id: Date.now().toString(), institution: '', degree: '', year: '' },
      ],
    }));
  };

  const updateEducation = (id: string, field: keyof Education, value: string) => {
    setData((prev) => ({
      ...prev,
      education: prev.education.map((edu) => (edu.id === id ? { ...edu, [field]: value } : edu)),
    }));
  };

  const removeEducation = (id: string) => {
    setData((prev) => ({
      ...prev,
      education: prev.education.filter((edu) => edu.id !== id),
    }));
  };

  if (loading) {
    return <div className={styles.builderContainer}>Loading...</div>;
  }

  return (
    <div className={styles.builderContainer}>
      <div className={styles.builderHeader}>
        <h1 className={styles.builderTitle}>ATS Resume Builder</h1>
        <div className={styles.actionButtons}>
          <button className="btn btn-secondary" onClick={handleSave}>
            {saveStatus || 'Save Data'}
          </button>
          <button className="btn btn-primary" onClick={handleDownloadPdf}>
            Download PDF
          </button>
        </div>
      </div>

      <div className={styles.builderContent}>
        {/* Form Section */}
        <div className={`${styles.formSection} glass`}>
          <h2 className={styles.sectionTitle}>Personal Details</h2>
          <div className={styles.formGroup}>
            <label>Full Name</label>
            <input type="text" value={data.fullName} onChange={(e) => handleInputChange('fullName', e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label>Email</label>
            <input type="email" value={data.email} onChange={(e) => handleInputChange('email', e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label>Phone</label>
            <input type="text" value={data.phone} onChange={(e) => handleInputChange('phone', e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label>LinkedIn/Website URL</label>
            <input type="text" value={data.linkedin} onChange={(e) => handleInputChange('linkedin', e.target.value)} />
          </div>
          
          <h2 className={styles.sectionTitle}>Professional Summary</h2>
          <div className={styles.formGroup}>
            <textarea value={data.summary} onChange={(e) => handleInputChange('summary', e.target.value)} placeholder="A brief summary of your professional background..." />
          </div>

          <h2 className={styles.sectionTitle}>Skills</h2>
          <div className={styles.formGroup}>
            <label>Comma separated skills</label>
            <textarea value={data.skills} onChange={(e) => handleInputChange('skills', e.target.value)} placeholder="React, Node.js, TypeScript..." />
          </div>

          <h2 className={styles.sectionTitle}>Experience</h2>
          <div className={styles.dynamicList}>
            {data.experience.map((exp) => (
              <div key={exp.id} className={styles.dynamicItem}>
                <button className={styles.removeBtn} onClick={() => removeExperience(exp.id)}>&times;</button>
                <div className={styles.formGroup}>
                  <label>Company</label>
                  <input type="text" value={exp.company} onChange={(e) => updateExperience(exp.id, 'company', e.target.value)} />
                </div>
                <div className={styles.formGroup}>
                  <label>Position</label>
                  <input type="text" value={exp.position} onChange={(e) => updateExperience(exp.id, 'position', e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div className={styles.formGroup} style={{ flex: 1 }}>
                    <label>Start Date</label>
                    <input type="text" value={exp.startDate} onChange={(e) => updateExperience(exp.id, 'startDate', e.target.value)} placeholder="e.g. Jan 2020" />
                  </div>
                  <div className={styles.formGroup} style={{ flex: 1 }}>
                    <label>End Date</label>
                    <input type="text" value={exp.endDate} onChange={(e) => updateExperience(exp.id, 'endDate', e.target.value)} placeholder="e.g. Present" />
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label>Description (bullet points separated by new lines)</label>
                  <textarea value={exp.description} onChange={(e) => updateExperience(exp.id, 'description', e.target.value)} />
                </div>
              </div>
            ))}
            <button className="btn btn-secondary" onClick={addExperience}>+ Add Experience</button>
          </div>

          <h2 className={styles.sectionTitle} style={{ marginTop: '24px' }}>Education</h2>
          <div className={styles.dynamicList}>
            {data.education.map((edu) => (
              <div key={edu.id} className={styles.dynamicItem}>
                <button className={styles.removeBtn} onClick={() => removeEducation(edu.id)}>&times;</button>
                <div className={styles.formGroup}>
                  <label>Institution</label>
                  <input type="text" value={edu.institution} onChange={(e) => updateEducation(edu.id, 'institution', e.target.value)} />
                </div>
                <div className={styles.formGroup}>
                  <label>Degree</label>
                  <input type="text" value={edu.degree} onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)} />
                </div>
                <div className={styles.formGroup}>
                  <label>Year</label>
                  <input type="text" value={edu.year} onChange={(e) => updateEducation(edu.id, 'year', e.target.value)} placeholder="e.g. 2018 - 2022" />
                </div>
              </div>
            ))}
            <button className="btn btn-secondary" onClick={addEducation}>+ Add Education</button>
          </div>
        </div>

        {/* Preview Section */}
        <div className={styles.previewSection}>
          <div className={styles.previewPaper} id="resume-preview-content">
            <div className={styles.previewHeader}>
              <h1 className={styles.previewName}>{data.fullName || 'YOUR NAME'}</h1>
              <div className={styles.previewContact}>
                {data.email && <span>{data.email} | </span>}
                {data.phone && <span>{data.phone} | </span>}
                {data.linkedin && <span>{data.linkedin}</span>}
              </div>
            </div>

            {data.summary && (
              <div className={styles.previewSectionBlock}>
                <div className={styles.previewSectionHeading}>Professional Summary</div>
                <div className={styles.previewItem}>{data.summary}</div>
              </div>
            )}

            {data.skills && (
              <div className={styles.previewSectionBlock}>
                <div className={styles.previewSectionHeading}>Skills</div>
                <div className={styles.previewItem}>{data.skills}</div>
              </div>
            )}

            {data.experience.length > 0 && (
              <div className={styles.previewSectionBlock}>
                <div className={styles.previewSectionHeading}>Experience</div>
                {data.experience.map((exp) => (
                  <div key={exp.id} className={styles.previewItem}>
                    <div className={styles.previewItemHeader}>
                      <span>{exp.position}</span>
                      <span>{exp.startDate} {exp.startDate && exp.endDate && '-'} {exp.endDate}</span>
                    </div>
                    <div className={styles.previewItemSub}>{exp.company}</div>
                    <ul className={styles.previewList}>
                      {exp.description.split('\n').filter(Boolean).map((bullet, i) => (
                        <li key={i}>{bullet.replace(/^- /, '')}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {data.education.length > 0 && (
              <div className={styles.previewSectionBlock}>
                <div className={styles.previewSectionHeading}>Education</div>
                {data.education.map((edu) => (
                  <div key={edu.id} className={styles.previewItem}>
                    <div className={styles.previewItemHeader}>
                      <span>{edu.degree}</span>
                      <span>{edu.year}</span>
                    </div>
                    <div className={styles.previewItemSub}>{edu.institution}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeBuilder;
