import React, { useEffect, useState } from 'react';
import { InvestmentData, InvestmentScore } from '../types';
import { Link } from 'react-router-dom';

interface CompanyScoreSummary {
  rank: number;
  companyName: string;
  averageScore: number;
  categoryScores: Partial<InvestmentScore>;
}

interface TopCompaniesByScoreTableProps {
  investments: InvestmentData[];
}

type SortDirection = 'asc' | 'desc';
type SortColumn = 'averageScore' | keyof InvestmentScore;

const SCORE_LABELS: Record<keyof InvestmentScore, string> = {
  "Business Model & Traction": "Biz Model",
  "Competitive Advantage": "Advantage",
  "Market Opportunity": "Market",
  "Presentation & Storytelling": "Pitch",
  "Problem and Solution": "Problem",
  "Team": "Team",
};

const TopCompaniesByScoreTable: React.FC<TopCompaniesByScoreTableProps> = ({ investments }) => {
  const [rankedCompanies, setRankedCompanies] = useState<CompanyScoreSummary[]>([]);
  const [sortColumn, setSortColumn] = useState<SortColumn>('averageScore');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    if (investments.length === 0) {
      setRankedCompanies([]);
      return;
    }

    // Get all unique categories present in the data
    const allCategories = new Set<keyof InvestmentScore>();
    investments.forEach(inv => {
      Object.keys(inv.scores).forEach(key => allCategories.add(key as keyof InvestmentScore));
    });

    const companyData: Record<string, { total: number; count: number; categoryTotals: Record<string, number> }> = {};

    investments.forEach(inv => {
      if (!companyData[inv.companyName]) {
        companyData[inv.companyName] = { total: 0, count: 0, categoryTotals: {} };
      }

      const totalScore = Object.values(inv.scores).reduce((sum, val) => sum + val, 0);
      companyData[inv.companyName].total += totalScore;
      companyData[inv.companyName].count += 1;

      Object.entries(inv.scores).forEach(([category, score]) => {
        companyData[inv.companyName].categoryTotals[category] = (companyData[inv.companyName].categoryTotals[category] || 0) + score;
      });
    });

    const summaries: CompanyScoreSummary[] = Object.entries(companyData).map(([companyName, data]) => {
      const categoryScores: Partial<InvestmentScore> = {};
      Object.entries(data.categoryTotals).forEach(([category, total]) => {
        categoryScores[category as keyof InvestmentScore] = total / data.count;
      });

      // Calculate overall average based on the average of category averages (to align with CompanyDetail logic)
      const categories = Object.keys(categoryScores) as (keyof InvestmentScore)[];
      const overallAverage = categories.length > 0
        ? categories.reduce((sum, cat) => sum + (categoryScores[cat] || 0), 0) / categories.length
        : 0;

      return {
        rank: 0, // Will be set after sorting
        companyName,
        averageScore: overallAverage,
        categoryScores,
      };
    });

    setRankedCompanies(summaries);
  }, [investments]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const getSortedCompanies = () => {
    const sorted = [...rankedCompanies].sort((a, b) => {
      let valA = 0;
      let valB = 0;

      if (sortColumn === 'averageScore') {
        valA = a.averageScore;
        valB = b.averageScore;
      } else {
        valA = a.categoryScores[sortColumn] || 0;
        valB = b.categoryScores[sortColumn] || 0;
      }

      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });

    return sorted.map((company, index) => ({ ...company, rank: index + 1 }));
  };

  const sortedCompanies = getSortedCompanies();
  const displayCategories = sortedCompanies.length > 0
    ? (Object.keys(sortedCompanies[0].categoryScores) as (keyof InvestmentScore)[])
    : [];

  // Sort categories to have a consistent order if needed, or rely on data order
  // For now, let's keep them consistent with constant.ts or simple alphabetical if dynamic
  displayCategories.sort();

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg overflow-hidden">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">
        <span role="img" aria-label="star" className="mr-2">⭐</span>
        Average Judge Score Rankings
      </h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 shadow-sm">Rank</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-16 bg-gray-50 z-10 shadow-sm min-w-[150px]">
                Company
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('averageScore')}
              >
                Avg. Score {sortColumn === 'averageScore' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              {displayCategories.map(category => (
                <th
                  key={category}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap"
                  onClick={() => handleSort(category)}
                >
                  {SCORE_LABELS[category] || category} {sortColumn === category && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedCompanies.length > 0 ? (
              sortedCompanies.map((company) => (
                <tr key={company.companyName} className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 shadow-sm">{company.rank}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 sticky left-16 bg-white z-10 shadow-sm">
                    <Link
                      to={`/company/${encodeURIComponent(company.companyName)}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                    >
                      {company.companyName}
                    </Link>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-bold bg-gray-50">
                    {company.averageScore.toFixed(1)}
                  </td>
                  {displayCategories.map(category => (
                    <td key={category} className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                      {(company.categoryScores[category] || 0).toFixed(1)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3 + displayCategories.length} className="px-6 py-4 text-center text-sm text-gray-500">
                  No investment data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TopCompaniesByScoreTable;
