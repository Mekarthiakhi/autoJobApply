import React, { useState } from 'react';
import { Search, ChevronDown, MoreHorizontal, Pause, Trash2, Plus } from 'lucide-react';
import FitScoreBadge from './FitScoreBadge';

interface Company {
  id: string;
  name: string;
  industry: string;
  roles: number;
  lastApplied: string;
  fitScore: number;
  status: 'active' | 'paused' | 'archived';
  location: string;
}

interface CompaniesTableProps {
  companies?: Company[];
  onAddToCampaign?: (company: Company) => void;
  onPause?: (company: Company) => void;
  onRemove?: (company: Company) => void;
}

const CompaniesTable: React.FC<CompaniesTableProps> = ({
  companies = [
    {
      id: '1',
      name: 'Google',
      industry: 'Technology',
      roles: 12,
      lastApplied: '2 days ago',
      fitScore: 94,
      status: 'active',
      location: 'Mountain View, CA',
    },
    {
      id: '2',
      name: 'Microsoft',
      industry: 'Technology',
      roles: 8,
      lastApplied: '5 days ago',
      fitScore: 87,
      status: 'active',
      location: 'Redmond, WA',
    },
    {
      id: '3',
      name: 'Apple',
      industry: 'Technology',
      roles: 5,
      lastApplied: '1 week ago',
      fitScore: 76,
      status: 'active',
      location: 'Cupertino, CA',
    },
    {
      id: '4',
      name: 'Meta',
      industry: 'Technology',
      roles: 15,
      lastApplied: '3 days ago',
      fitScore: 82,
      status: 'active',
      location: 'Menlo Park, CA',
    },
    {
      id: '5',
      name: 'Amazon',
      industry: 'Technology',
      roles: 20,
      lastApplied: 'Today',
      fitScore: 71,
      status: 'active',
      location: 'Seattle, WA',
    },
    {
      id: '6',
      name: 'Tesla',
      industry: 'Automotive/Technology',
      roles: 7,
      lastApplied: '1 week ago',
      fitScore: 65,
      status: 'paused',
      location: 'Austin, TX',
    },
  ],
  onAddToCampaign,
  onPause,
  onRemove,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'fitScore' | 'roles' | 'name'>('fitScore');
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);

  const filteredCompanies = companies.filter(
    (company) =>
      company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.industry.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedCompanies = [...filteredCompanies].sort((a, b) => {
    if (sortBy === 'fitScore') return b.fitScore - a.fitScore;
    if (sortBy === 'roles') return b.roles - a.roles;
    return a.name.localeCompare(b.name);
  });

  const toggleSelectAll = () => {
    if (selectedCompanies.length === sortedCompanies.length) {
      setSelectedCompanies([]);
    } else {
      setSelectedCompanies(sortedCompanies.map((c) => c.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedCompanies((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-accent-success/10 text-accent-success border-accent-success/20';
      case 'paused':
        return 'bg-accent-warning/10 text-accent-warning border-accent-warning/20';
      case 'archived':
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <div className="neumo-card p-4 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search companies by name or industry..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="neumo-input pl-10"
          />
        </div>

        <div className="flex gap-3">
          <div className="relative">
            <button className="neumo-btn inline-flex items-center gap-2 text-sm">
              <span>Sort by</span>
              <ChevronDown size={16} />
            </button>
            <div className="absolute right-0 mt-2 w-40 neumo-card rounded-lg overflow-hidden shadow-lg z-10 hidden group-hover:block">
              <button
                onClick={() => setSortBy('fitScore')}
                className={`w-full px-4 py-2 text-left text-sm font-medium hover:bg-accent-primary/10 ${
                  sortBy === 'fitScore' ? 'bg-accent-primary/20 text-accent-primary' : 'text-gray-300'
                }`}
              >
                Fit Score
              </button>
              <button
                onClick={() => setSortBy('roles')}
                className={`w-full px-4 py-2 text-left text-sm font-medium hover:bg-accent-primary/10 ${
                  sortBy === 'roles' ? 'bg-accent-primary/20 text-accent-primary' : 'text-gray-300'
                }`}
              >
                Open Roles
              </button>
              <button
                onClick={() => setSortBy('name')}
                className={`w-full px-4 py-2 text-left text-sm font-medium hover:bg-accent-primary/10 ${
                  sortBy === 'name' ? 'bg-accent-primary/20 text-accent-primary' : 'text-gray-300'
                }`}
              >
                Company Name
              </button>
            </div>
          </div>

          <button className="neumo-btn inline-flex items-center gap-2 text-sm">
            <span>Filter</span>
            <ChevronDown size={16} />
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedCompanies.length > 0 && (
        <div className="neumo-card p-4 bg-accent-primary/5 border-l-4 border-accent-primary flex items-center justify-between">
          <span className="text-sm font-medium text-gray-300">
            {selectedCompanies.length} company/companies selected
          </span>
          <div className="flex gap-3">
            <button className="neumo-btn text-sm inline-flex items-center gap-2">
              <Plus size={16} />
              Add to Campaign
            </button>
            <button className="neumo-btn text-sm text-accent-warning">
              Pause Selected
            </button>
            <button className="neumo-btn text-sm text-accent-error">
              Remove Selected
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="neumo-card overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-neumo-light border-b border-neumo-border font-semibold text-sm text-gray-400 uppercase tracking-wider">
          <div className="col-span-1 flex items-center">
            <input
              type="checkbox"
              checked={selectedCompanies.length === sortedCompanies.length && sortedCompanies.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded cursor-pointer"
            />
          </div>
          <div className="col-span-2">Company</div>
          <div className="col-span-2">Industry</div>
          <div className="col-span-1 text-center">Roles</div>
          <div className="col-span-2">Fit Score</div>
          <div className="col-span-2">Last Applied</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1 text-center">Actions</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-neumo-border">
          {sortedCompanies.length === 0 ? (
            <div className="col-span-12 px-6 py-12 text-center text-gray-400">
              <p className="text-sm">No companies found. Try adjusting your search or filters.</p>
            </div>
          ) : (
            sortedCompanies.map((company) => (
              <div
                key={company.id}
                className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-neumo-light/50 transition-colors"
              >
                {/* Checkbox */}
                <div className="col-span-1 flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedCompanies.includes(company.id)}
                    onChange={() => toggleSelect(company.id)}
                    className="w-4 h-4 rounded cursor-pointer accent-accent-primary"
                  />
                </div>

                {/* Company Name */}
                <div className="col-span-2">
                  <p className="font-semibold text-white">{company.name}</p>
                  <p className="text-xs text-gray-400">{company.location}</p>
                </div>

                {/* Industry */}
                <div className="col-span-2">
                  <p className="text-sm text-gray-300">{company.industry}</p>
                </div>

                {/* Roles Count */}
                <div className="col-span-1 text-center">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-accent-primary/20 text-accent-primary font-semibold text-sm">
                    {company.roles}
                  </span>
                </div>

                {/* Fit Score */}
                <div className="col-span-2">
                  <FitScoreBadge score={company.fitScore} />
                </div>

                {/* Last Applied */}
                <div className="col-span-2">
                  <p className="text-sm text-gray-300">{company.lastApplied}</p>
                </div>

                {/* Status */}
                <div className="col-span-1">
                  <span
                    className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full border ${getStatusColor(
                      company.status
                    )}`}
                  >
                    {company.status.charAt(0).toUpperCase() + company.status.slice(1)}
                  </span>
                </div>

                {/* Actions */}
                <div className="col-span-1 flex justify-center">
                  <div className="relative group">
                    <button className="p-2 hover:bg-neumo-light rounded-lg transition-colors">
                      <MoreHorizontal size={16} className="text-gray-400" />
                    </button>
                    <div className="absolute right-0 mt-2 w-40 neumo-card rounded-lg overflow-hidden shadow-lg z-10 hidden group-hover:block">
                      <button className="w-full px-4 py-2 text-left text-sm font-medium text-gray-300 hover:bg-accent-primary/10 hover:text-accent-primary transition-colors">
                        View Details
                      </button>
                      <button className="w-full px-4 py-2 text-left text-sm font-medium text-gray-300 hover:bg-accent-warning/10 hover:text-accent-warning transition-colors">
                        <Pause size={14} className="inline mr-2" />
                        Pause
                      </button>
                      <button className="w-full px-4 py-2 text-left text-sm font-medium text-gray-300 hover:bg-accent-error/10 hover:text-accent-error transition-colors">
                        <Trash2 size={14} className="inline mr-2" />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Results Summary */}
      <div className="text-sm text-gray-400 text-center">
        Showing <span className="font-semibold text-white">{sortedCompanies.length}</span> of{' '}
        <span className="font-semibold text-white">{companies.length}</span> companies
      </div>
    </div>
  );
};

export default CompaniesTable;
