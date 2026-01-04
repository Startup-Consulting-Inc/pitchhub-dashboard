import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { PROJECT_ID } from '../constant';

interface VoteData {
  companyName: string;
  voteCount: number;
  rank: number;
}

const TopCompaniesByInspiringPitch: React.FC = () => {
  const [rankedCompanies, setRankedCompanies] = useState<VoteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVotes = async () => {
      try {
        const votesRef = collection(db, 'Startup-World-Cup-Seattle-Regional-Votes');
        // Filter by PROJECT_ID if the field exists in the vote documents
        const votesQuery = query(
          votesRef,
          where("projectId", "==", PROJECT_ID)
        );
        const querySnapshot = await getDocs(votesQuery);

        // Count votes for each company based on inspiring_pitch field
        const voteCounts: { [key: string]: number } = {};
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const companyName = data.inspiring_pitch; // Using inspiring_pitch field
          if (companyName) { // Only count if inspiring_pitch field exists
            voteCounts[companyName] = (voteCounts[companyName] || 0) + 1;
          }
        });

        // Convert to array and sort by vote count
        const sortedCompanies = Object.entries(voteCounts)
          .map(([companyName, voteCount]) => ({ companyName, voteCount }))
          .sort((a, b) => b.voteCount - a.voteCount)
          .map((company, index) => ({
            ...company,
            rank: index + 1
          }));

        console.log(`Fetched ${querySnapshot.size} votes for project ID ${PROJECT_ID}`);
        setRankedCompanies(sortedCompanies);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch vote data');
        setLoading(false);
        console.error('Error fetching votes:', err);
      }
    };

    fetchVotes();
  }, []);

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Loading votes for Project {PROJECT_ID}...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Error</h2>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">
        <span role="img" aria-label="star" className="mr-2">⭐</span>
        Most Inspiring Pitch Rankings
      </h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Number of Votes</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rankedCompanies.length > 0 ? (
              rankedCompanies.map((company) => (
                <tr key={company.companyName} className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {company.rank}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    <Link
                      to={`/company/${encodeURIComponent(company.companyName)}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                    >
                      {company.companyName}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-semibold">
                    {company.voteCount}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                  No vote data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TopCompaniesByInspiringPitch; 