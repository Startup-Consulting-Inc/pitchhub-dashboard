import React from 'react';
import { InvestmentData, Organization } from '../types';
import TopCompaniesByScoreTable from './TopCompaniesByScoreTable';
// import TopCompaniesByInspiringPitch from './TopCompaniesByInspiringPitch';

interface DashboardProps {
  investments: InvestmentData[];
  selectedOrg: Organization | null;
}

const PitchDescription: React.FC<{ org: Organization | null }> = ({ org }) => {
  if (!org) return null;

  return (
    <div className="bg-gradient-to-r from-indigo-700 to-purple-700 text-white p-8 rounded-xl shadow-2xl mb-10 overflow-hidden relative">
      <div className="relative z-10">
        <h2 className="text-4xl font-extrabold mb-4 tracking-tight"> {org.name}</h2>
        <p className="text-indigo-100 leading-relaxed text-lg max-w-4xl">
          {org.description || "Welcome to the pitch dashboard. Explore the latest investments and insights for this organization."}
        </p>
      </div>
      {/* Subtle decorative element */}
      <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-white opacity-5 rounded-full"></div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ investments, selectedOrg }) => {
  return (
    <div className="space-y-12 max-w-5xl mx-auto">
      <PitchDescription org={selectedOrg} />

      <div className="space-y-10">
        {/* Investment Based Rankings */}
        <div className="space-y-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-2 h-10 bg-indigo-600 rounded-full"></div>
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Judge Score Rankings</h2>
          </div>
          <TopCompaniesByScoreTable investments={investments} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
