import React, { useState } from 'react';
import { Search, ChevronDown, MoreHorizontal, Pause, Trash2, Plus } from 'lucide-react';
import FitScoreBadge from './FitScoreBadge';

export interface Company {
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
  companies = [],
  onAddToCampaign,
  onPause,
  onRemove,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'fitScore' | 'roles' | 'name'>('fitScore');
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [showSortMenu, setShowSortMenu] = useState(false);

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
      <div className="neumo-card p-4 flex flex-col md:flex-row items-stretch md:items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search companies by name or industry..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="neumo-input"
            style={{ paddingLeft: '38px' }}
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSortMenu((v) => !v)}
              className="neumo-btn"
            >
              <span>Sort: {sortBy === 'fitScore' ? 'Fit Score' : sortBy === 'roles' ? 'Open Roles' : 'Name'}</span>
              <ChevronDown size={15} />
            </button>
            {showSortMenu && (
              <div className="absolute right-0 mt-2 w-44 neumo-card rounded-xl overflow-hidden shadow-xl z-20 p-1">
                <button
                  type="button"
                  onClick={() => { setSortBy('fitScore'); setShowSortMenu(false); }}
                  className={`w-full px-3 py-2 rounded-lg text-left text-xs font-medium transition-colors ${
                    sortBy === 'fitScore' ? 'bg-indigo-600/30 text-indigo-300' : 'text-gray-300 hover:bg-white/5'
                  }`}
                >
                  Fit Score
                </button>
                <button
                  type="button"
                  onClick={() => { setSortBy('roles'); setShowSortMenu(false); }}
                  className={`w-full px-3 py-2 rounded-lg text-left text-xs font-medium transition-colors ${
                    sortBy === 'roles' ? 'bg-indigo-600/30 text-indigo-300' : 'text-gray-300 hover:bg-white/5'
                  }`}
                >
                  Open Roles
                </button>
                <button
                  type="button"
                  onClick={() => { setSortBy('name'); setShowSortMenu(false); }}
                  className={`w-full px-3 py-2 rounded-lg text-left text-xs font-medium transition-colors ${
                    sortBy === 'name' ? 'bg-indigo-600/30 text-indigo-300' : 'text-gray-300 hover:bg-white/5'
                  }`}
                >
                  Company Name
                </button>
              </div>
            )}
          </div>
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
