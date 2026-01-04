import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { InvestmentData, CompanyInvestmentSummary } from '../types';

interface TopCompaniesTableProps {
  investments: InvestmentData[];
}

const TopCompaniesTable: React.FC<TopCompaniesTableProps> = ({ investments }) => {
  const [rankedCompanies, setRankedCompanies] = useState<CompanyInvestmentSummary[]>([]);

  useEffect(() => {
    const companyTotals: { [key: string]: number } = {};
    investments.forEach(investment => {
      const amount = investment.investmentAmount || 0;
      companyTotals[investment.companyName] = (companyTotals[investment.companyName] || 0) + amount;
    });

    const sortedCompanies = Object.entries(companyTotals)
      .map(([companyName, totalInvestment]) => ({ companyName, totalInvestment }))
      .sort((a, b) => b.totalInvestment - a.totalInvestment)
      .map((company, index) => ({
        ...company,
        rank: index + 1,
      }));

    setRankedCompanies(sortedCompanies);
  }, [investments]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-semibold text-gray-800 mb-1">
        <span role="img" aria-label="chart increasing" className="mr-2">��</span>
        Total Investment Secured Rankings
      </h2>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rank
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Company Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Investment (USD)
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rankedCompanies.length > 0 ? (
              rankedCompanies.map((company) => (
                <tr key={company.companyName} className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{company.rank}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    <Link
                      to={`/company/${encodeURIComponent(company.companyName)}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                    >
                      {company.companyName}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-semibold">
                    {formatCurrency(company.totalInvestment)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
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

export default TopCompaniesTable;
