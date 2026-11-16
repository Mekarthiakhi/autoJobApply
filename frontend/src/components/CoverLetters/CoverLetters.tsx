import React, { useState, useEffect } from 'react';
import { coverLettersAPI } from '../../api/auth';
import { FileText, Copy, CheckCircle, Trash2 } from 'lucide-react';

interface CoverLetter {
  id: string;
  job_title: string;
  company_name: string;
  content: string;
  generated_at: string;
}

const CoverLetters: React.FC = () => {
  const [letters, setLetters] = useState<CoverLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchLetters();
  }, []);

  const fetchLetters = async () => {
    try {
      const response = await coverLettersAPI.getLetters();
      setLetters(response.data);
    } catch (error) {
      console.error('Failed to fetch cover letters', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string) => {
    try {
      await coverLettersAPI.deleteLetter(id);
      setLetters(letters.filter(l => l.id !== id));
    } catch (error) {
      console.error('Failed to delete cover letter', error);
    }
  };

  if (loading) return <div className="p-6">Loading cover letters...</div>;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Cover Letters</h1>
        <p className="text-gray-400">AI-generated cover letters based on your resume and matched jobs.</p>
      </div>

      {letters.length === 0 ? (
        <div className="glass-dark p-8 rounded-xl text-center">
          <p className="text-gray-400">No cover letters generated yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {letters.map((letter) => (
            <div key={letter.id} className="glass-dark rounded-xl p-6 flex flex-col h-[300px]">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                    <FileText className="text-accent" size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{letter.company_name || 'General Application'}</h3>
                    <p className="text-sm text-gray-400">{letter.job_title || 'Cover Letter'}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(letter.id)}
                  className="text-gray-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="flex-1 bg-black/20 rounded-lg p-4 mb-4 overflow-y-auto text-sm text-gray-300 font-mono whitespace-pre-wrap">
                {letter.content}
              </div>

              <div className="flex justify-between items-center mt-auto">
                <span className="text-xs text-gray-500">
                  {new Date(letter.generated_at).toLocaleDateString()}
                </span>
                <button
                  onClick={() => handleCopy(letter.id, letter.content)}
                  className="btn-secondary flex items-center gap-2 text-sm"
                >
                  {copiedId === letter.id ? <><CheckCircle size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CoverLetters;
