import React from 'react';
import { Organization } from '../types';

interface HeaderProps {
  organizations: Organization[];
  selectedOrgId: string;
  onOrgChange: (orgId: string) => void;
}

const Header: React.FC<HeaderProps> = ({ organizations, selectedOrgId, onOrgChange }) => {
  const selectedOrg = organizations.find(org => org.id === selectedOrgId);

  return (
    <header className="bg-brand-dark shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center">
          {/* Placeholder for logo - could be an SVG or img tag */}
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-brand-primary mr-2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
          </svg>
          <div>
            <h1 className="text-xl font-bold text-white leading-tight">PitchHub</h1>
            <p className="text-xs text-gray-400">Fair, fast, transparent judging</p>
          </div>
        </div>

        {/* Organization Dropdown */}
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <label htmlFor="org-select" className="text-sm font-medium text-gray-300 whitespace-nowrap hidden sm:block">
            Organization:
          </label>
          <div className="relative w-full md:w-64">
            <select
              id="org-select"
              value={selectedOrgId}
              onChange={(e) => onOrgChange(e.target.value)}
              className="w-full bg-slate-800 text-white rounded-lg border border-slate-700 px-4 py-2 focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none appearance-none transition-all cursor-pointer text-sm"
            >
              {organizations.length === 0 ? (
                <option value="">Loading organizations...</option>
              ) : (
                organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))
              )}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          </div>

          {selectedOrg?.logoUrl && (
            <img
              src={selectedOrg.logoUrl}
              alt={selectedOrg.name}
              className="h-8 w-8 rounded bg-white p-0.5 object-contain hidden sm:block"
            />
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
