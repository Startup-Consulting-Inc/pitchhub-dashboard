import React, { useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { InvestmentData, InvestmentScore } from '../types';
import { Radar } from 'react-chartjs-2';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface CompanyDetailProps {
  investments: InvestmentData[];
}

interface ScoreMetrics {
  average: number;
  rank: number;
  totalCompanies: number;
}

const CompanyDetail: React.FC<CompanyDetailProps> = ({ investments }) => {
  const { companyName } = useParams<{ companyName: string }>();
  const reportRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!companyName) {
    return <div className="p-8 text-center text-red-600">Company name is missing in the URL.</div>;
  }

  // Use decoded and trimmed name for comparison
  const decodedCompanyName = decodeURIComponent(companyName).trim();
  const companyInvestments = investments.filter(inv => inv.companyName.trim() === decodedCompanyName);

  if (companyInvestments.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center bg-white rounded-xl shadow-lg mt-10">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">No Data Found</h2>
        <p className="text-gray-600 mb-6 font-medium">No investment data found for "{decodedCompanyName}" in the current organization.</p>
        <Link to="/" className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200">
          ← Return to Dashboard
        </Link>
      </div>
    );
  }

  // Calculate average scores across all criteria
  const scoreCategories = Object.keys(companyInvestments[0].scores) as (keyof InvestmentScore)[];
  const averageScores: Record<keyof InvestmentScore, number> = {} as Record<keyof InvestmentScore, number>;

  scoreCategories.forEach(category => {
    const totalScore = companyInvestments.reduce((sum, inv) => sum + (inv.scores[category] || 0), 0);
    averageScores[category] = totalScore / companyInvestments.length;
  });

  // Calculate average investment score (across all categories)
  const avgInvestmentScore =
    scoreCategories.length > 0
      ? (
        scoreCategories.reduce((sum, cat) => sum + (averageScores[cat] || 0), 0) / scoreCategories.length
      )
      : 0;

  // Calculate rankings for each metric
  const allCompanies = Array.from(new Set(investments.map(inv => inv.companyName.trim())));
  const companyRankings: Record<keyof InvestmentScore, ScoreMetrics> = {} as Record<keyof InvestmentScore, ScoreMetrics>;

  scoreCategories.forEach(category => {
    const companyAverages = allCompanies.map(company => {
      const companyInvs = investments.filter(inv => inv.companyName.trim() === company);
      const avgScore = companyInvs.reduce((sum, inv) => sum + (inv.scores[category] || 0), 0) / companyInvs.length;
      return { company, avgScore };
    });

    companyAverages.sort((a, b) => b.avgScore - a.avgScore);
    const rank = companyAverages.findIndex(c => c.company === decodedCompanyName) + 1;

    companyRankings[category] = {
      average: averageScores[category],
      rank,
      totalCompanies: allCompanies.length
    };
  });

  // Mapping from score category keys to shorter display labels
  const scoreCategoryLabels: Record<keyof InvestmentScore, string> = {
    "Business Model & Traction": "Biz Model",
    "Competitive Advantage": "Advantage",
    "Market Opportunity": "Market",
    "Presentation & Storytelling": "Pitch",
    "Problem and Solution": "Problem/Sol",
    "Team": "Team"
  };

  const radarLabels = scoreCategories.map(cat => scoreCategoryLabels[cat] || cat);
  const radarDataArray = scoreCategories.map(cat => (averageScores[cat] as number) || 0);

  const radarData = {
    labels: radarLabels,
    datasets: [
      {
        label: 'Average Score',
        data: radarDataArray,
        backgroundColor: 'rgba(79, 70, 229, 0.2)',
        borderColor: 'rgba(79, 70, 229, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(79, 70, 229, 1)',
      },
    ],
  };
  const radarOptions = {
    scales: {
      r: {
        min: 0,
        max: 10,
        ticks: { stepSize: 2, color: '#64748b' },
        pointLabels: {
          color: '#334155',
          font: { size: 10, weight: 'bold' as const },
          padding: 20,
          callback: function (label: string) {
            return label;
          }
        },
        grid: { color: '#e5e7eb' },
        angleLines: { color: '#e5e7eb' },
      },
    },
    plugins: {
      legend: { display: false },
    },
    responsive: true,
    maintainAspectRatio: false,
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;

    setIsDownloading(true);
    try {
      const element = reportRef.current;
      const canvas = await (html2canvas as any)(element, {
        scale: 2, // Higher resolution
        useCORS: true,
        logging: false,
        backgroundColor: '#f8fafc' // slate-50 background
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`${decodedCompanyName}_Evaluation_Report.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Link to="/" className="text-blue-600 hover:text-blue-800 mb-4 inline-block font-medium">
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{decodedCompanyName}</h1>
          <p className="text-gray-600">Investment Analysis & Investor Feedback</p>
        </div>

        <button
          onClick={handleDownloadPDF}
          disabled={isDownloading}
          className={`inline-flex items-center px-5 py-2.5 rounded-lg font-bold transition-all duration-200 shadow-md ${isDownloading
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-lg active:transform active:scale-95'
            }`}
        >
          {isDownloading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating PDF...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
              </svg>
              Download PDF Report
            </>
          )}
        </button>
      </div>

      <div ref={reportRef} className="space-y-8 py-4">

        {/* Investment Summary */}
        <div className="mb-8 bg-white rounded-xl shadow-lg p-8 border border-gray-100">
          <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
            <span className="w-2 h-8 bg-indigo-600 rounded-full mr-3"></span>
            Summary Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-blue-50 p-6 rounded-xl text-center border border-blue-100 shadow-sm">
              <div className="text-4xl font-black text-blue-700 mb-1">
                {companyInvestments.length}
              </div>
              <div className="text-sm font-semibold text-blue-600 uppercase tracking-wider">Investor Evaluations</div>
            </div>
            <div className="bg-yellow-50 p-6 rounded-xl text-center border border-yellow-100 shadow-sm">
              <div className="text-4xl font-black text-yellow-700 mb-1">
                {isNaN(avgInvestmentScore) ? '0.0' : avgInvestmentScore.toFixed(1)}
              </div>
              <div className="text-sm font-semibold text-yellow-600 uppercase tracking-wider">Avg Investment Score</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Radar Chart */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
              <span className="w-2 h-8 bg-purple-600 rounded-full mr-3"></span>
              Evaluation Profile
            </h2>
            <div className="flex justify-center items-center py-4">
              <div style={{ width: '100%', height: '400px' }}>
                <Radar data={radarData} options={radarOptions} />
              </div>
            </div>
          </div>

          {/* Ranking Across Metrics */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
              <span className="w-2 h-8 bg-green-600 rounded-full mr-3"></span>
              Area Performance
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {scoreCategories.map(category => {
                const metrics = companyRankings[category];
                const isTopThree = metrics.rank <= 3;
                return (
                  <div key={category} className={`p-4 rounded-xl border flex items-center justify-between transition-all duration-200 ${isTopThree ? 'border-yellow-200 bg-yellow-50 shadow-sm' : 'border-gray-100 bg-gray-50'}`}>
                    <div>
                      <h3 className="font-bold text-sm text-gray-800 mb-1">{category}</h3>
                      <div className="flex items-center">
                        <span className={`text-xl font-black ${isTopThree ? 'text-yellow-600' : 'text-gray-600'}`}>#{metrics.rank}</span>
                        <span className="text-xs text-gray-500 ml-1.5 font-medium uppercase">of {metrics.totalCompanies}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-blue-700">{metrics.average.toFixed(1)}</div>
                      <div className="text-[10px] font-bold text-blue-500 uppercase tracking-tight">avg score</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Investor Feedback (Feedback & Notes) */}
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
          <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
            <span className="w-2 h-8 bg-blue-600 rounded-full mr-3"></span>
            Investor Feedback & Notes
          </h2>
          <div className="space-y-4">
            {companyInvestments.map((inv, idx) => (
              <div key={idx} className="p-6 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold mr-3 shadow-sm">
                      {inv.investorName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 leading-tight">{inv.investorName}</h4>
                      <p className="text-xs text-gray-500 font-medium">{new Date(inv.submissionTimestamp).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed italic border-l-4 border-indigo-200 pl-4 py-1">
                  "{inv.overallComment}"
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default CompanyDetail;