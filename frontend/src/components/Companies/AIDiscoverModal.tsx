import React, { useState } from 'react';
import { X, Sparkles, Loader } from 'lucide-react';

interface AIDiscoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDiscover?: () => void;
}

const AIDiscoverModal: React.FC<AIDiscoverModalProps> = ({
  isOpen,
  onClose,
  onDiscover,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const jobTags = [
    'Full Stack',
    'Frontend',
    'Backend',
    'DevOps',
    'Data Science',
    'Mobile',
    'AI/ML',
  ];

  const industrySuggestions = [
    'Tech Startups',
    'Fortune 500',
    'Fintech',
    'Healthcare Tech',
    'E-commerce',
    'SaaS',
  ];

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleDiscover = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsLoading(false);
    if (onDiscover) onDiscover();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      {/* Modal */}
      <div className="neumo-card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neumo-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent-primary/20">
              <Sparkles className="w-6 h-6 text-accent-primary" />
            </div>
            <div>
              <h2 className="text-xl font-display font-semibold text-white">
                Discover New Companies
              </h2>
              <p className="text-sm text-gray-400">
                Let AI find the best companies for you
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neumo-light rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Job Type Selection */}
          <div>
            <h3 className="text-sm font-semibold uppercase text-gray-300 mb-4 tracking-wider">
              What roles are you looking for?
            </h3>
            <div className="flex flex-wrap gap-3">
              {jobTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    selectedTags.includes(tag)
                      ? 'bg-accent-primary text-white shadow-glow-blue'
                      : 'bg-neumo-light text-gray-300 border border-neumo-border hover:border-accent-primary/50'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Company Size */}
          <div>
            <h3 className="text-sm font-semibold uppercase text-gray-300 mb-4 tracking-wider">
              Company Size Preference
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['Startup', 'Mid-Size', 'Large', 'Enterprise'].map((size) => (
                <button
                  key={size}
                  className="px-4 py-3 rounded-lg bg-neumo-light border border-neumo-border hover:border-accent-primary/50 text-gray-300 font-medium text-sm transition-colors"
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Industry Focus */}
          <div>
            <h3 className="text-sm font-semibold uppercase text-gray-300 mb-4 tracking-wider">
              Industry Focus (Optional)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {industrySuggestions.map((industry) => (
                <button
                  key={industry}
                  className="px-4 py-3 rounded-lg bg-neumo-light border border-neumo-border hover:border-accent-primary/50 text-gray-300 font-medium text-sm transition-colors"
                >
                  {industry}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-sm font-semibold uppercase text-gray-300 mb-4 tracking-wider">
              Tell us more (Optional)
            </h3>
            <textarea
              placeholder="E.g., 'I'm interested in companies using React and TypeScript with strong engineering culture'"
              className="neumo-input"
              rows={4}
            />
          </div>

          {/* Info Box */}
          <div className="neumo-card p-4 bg-accent-primary/5 border-l-4 border-accent-primary">
            <p className="text-sm text-gray-300">
              🤖 <span className="font-semibold">AI will analyze</span> your resume, skills, and preferences to suggest the most relevant companies with the highest match potential.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-neumo-border p-6 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="neumo-btn px-6 py-2 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleDiscover}
            disabled={isLoading}
            className="neumo-btn px-6 py-2 text-sm font-medium bg-accent-primary text-white shadow-glow-blue hover:shadow-glow-blue disabled:opacity-60"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader size={16} className="animate-spin" />
                Discovering...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles size={16} />
                Discover Companies
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIDiscoverModal;
