import React, { useState, useEffect } from 'react';
import { resumeVersionsAPI } from '../../api/auth';
import { FileText, Star, Trash2, Upload, Plus } from 'lucide-react';
import { useToast } from '../../context/ToastContext';


interface ResumeVersion {
  id: string;
  label: string;
  file_name: string | null;
  is_default: number;
  created_at: string;
  updated_at: string;
}

const ResumeVersions: React.FC = () => {
  const toast = useToast();
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchVersions();
  }, []);

  const fetchVersions = async () => {
    try {
      const response = await resumeVersionsAPI.getVersions();
      setVersions(response.data);
    } catch (error) {
      console.error('Failed to fetch resume versions', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const label = file.name.replace(/\.[^.]+$/, '') || 'Resume Version';

    const formData = new FormData();
    formData.append('resume', file);
    formData.append('label', label);

    setIsUploading(true);
    try {
      await resumeVersionsAPI.createVersion(formData);
      await fetchVersions();
      toast.success(`"${file.name}" uploaded successfully!`);
    } catch (error) {
      console.error('Failed to upload resume', error);
      toast.error('Failed to upload resume');
    } finally {
      setIsUploading(false);
      // Reset input
      event.target.value = '';
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await resumeVersionsAPI.setDefault(id);
      await fetchVersions();
      toast.success('Default resume version updated.');
    } catch (error) {
      console.error('Failed to set default', error);
      toast.error('Failed to set default version.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await resumeVersionsAPI.deleteVersion(id);
      setVersions(versions.filter(v => v.id !== id));
      toast.success('Resume version deleted.');
    } catch (error) {
      console.error('Failed to delete version', error);
      toast.error('Failed to delete version.');
    }
  };

  if (loading) return <div className="p-6">Loading resume versions...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Resume Versions</h1>
          <p className="text-gray-400">Manage tailored resumes for different roles.</p>
        </div>
        
        <div className="relative">
          <input
            type="file"
            id="resume-upload"
            accept=".pdf,.txt"
            onChange={handleFileUpload}
            className="hidden"
            disabled={isUploading}
          />
          <label 
            htmlFor="resume-upload" 
            className={`btn-primary flex items-center gap-2 cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isUploading ? <span className="animate-spin text-xl">⟳</span> : <Plus size={18} />}
            {isUploading ? 'Uploading...' : 'New Version'}
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {versions.map((version) => (
          <div 
            key={version.id} 
            className={`glass-dark rounded-xl p-6 border-2 transition-colors ${
              version.is_default ? 'border-accent' : 'border-transparent hover:border-gray-700'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${version.is_default ? 'bg-accent/20 text-accent' : 'bg-gray-800 text-gray-400'}`}>
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">{version.label}</h3>
                  <p className="text-sm text-gray-400 truncate max-w-[150px]" title={version.file_name || 'Text Entry'}>
                    {version.file_name || 'Text Entry'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(version.id)}
                className="text-gray-500 hover:text-red-400 transition-colors p-2"
                title="Delete version"
              >
                <Trash2 size={18} />
              </button>
            </div>

            <div className="text-sm text-gray-500 mb-6">
              Updated: {new Date(version.updated_at).toLocaleDateString()}
            </div>

            <div className="flex justify-between items-center">
              {version.is_default ? (
                <div className="flex items-center gap-2 text-accent font-medium">
                  <Star size={16} fill="currentColor" /> Default
                </div>
              ) : (
                <button
                  onClick={() => handleSetDefault(version.id)}
                  className="text-gray-400 hover:text-white transition-colors text-sm font-medium"
                >
                  Set as Default
                </button>
              )}
            </div>
          </div>
        ))}

        {versions.length === 0 && !isUploading && (
          <div className="col-span-full glass-dark p-12 rounded-xl text-center border border-dashed border-gray-700">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-500">
              <Upload size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No resumes uploaded</h3>
            <p className="text-gray-400 mb-6">Upload your first resume to let the AI start matching jobs.</p>
            <label htmlFor="resume-upload" className="btn-primary inline-flex items-center gap-2 cursor-pointer">
              <Upload size={18} /> Upload PDF
            </label>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResumeVersions;
