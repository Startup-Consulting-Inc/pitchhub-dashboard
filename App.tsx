import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Dashboard from './components/Dashboard';
import CompanyDetail from './components/CompanyDetail';
import { Organization, Company, InvestmentData } from './types';
import { db } from './firebaseConfig';
import { collection, getDocs, query, where } from 'firebase/firestore';

const App: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedOrgData, setSelectedOrgData] = useState<Organization | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [investments, setInvestments] = useState<InvestmentData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Initial Load: Fetch all organizations
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const orgsCollection = collection(db, 'organizations');
        const orgsSnapshot = await getDocs(orgsCollection);
        const orgsList = orgsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Organization));

        setOrganizations(orgsList);

        // Auto-select first org if none selected and orgs exist
        if (orgsList.length > 0 && !selectedOrgId) {
          setSelectedOrgId(orgsList[0].id);
          setSelectedOrgData(orgsList[0]);
        }
      } catch (e) {
        console.error("Error fetching organizations: ", e);
        setError("Failed to fetch organizations. Please check your Firestore rules.");
      }
    };

    fetchOrganizations();
  }, [selectedOrgId]);

  const fetchInvestments = async (orgId: string, orgName: string, companyList: Company[]) => {
    console.log(`[Diagnostic] Fetching investments for "${orgName}" (ID: ${orgId})`);
    try {
      const investmentsCollection = collection(db, 'investments');
      let investmentsList: InvestmentData[] = [];

      // 1. Try fetching by organization (name) - Exact match
      const qName = query(investmentsCollection, where("organization", "==", orgName));
      const snapshotName = await getDocs(qName);

      if (!snapshotName.empty) {
        console.log(`[Diagnostic] Found ${snapshotName.docs.length} investments by exact organization name match.`);
        investmentsList = snapshotName.docs.map(doc => ({ ...doc.data() } as InvestmentData));
      } else {
        // 2. Try fetching by organization (name) - Trimmed match (handling trailing spaces)
        console.log(`[Diagnostic] No exact name match. Trying fallback strategies...`);
        const allInvsDocs = await getDocs(investmentsCollection);
        const trimmedOrgName = orgName.trim().toLowerCase();

        investmentsList = allInvsDocs.docs
          .map(doc => doc.data() as InvestmentData)
          .filter(inv => (inv.organization || "").trim().toLowerCase() === trimmedOrgName);

        if (investmentsList.length > 0) {
          console.log(`[Diagnostic] Found ${investmentsList.length} investments via trimmed/case-insensitive name match.`);
        } else {
          // 3. Fallback: Try fetching by organizationId (GUID)
          const qId = query(investmentsCollection, where("organizationId", "==", orgId));
          const snapshotId = await getDocs(qId);

          if (!snapshotId.empty) {
            console.log(`[Diagnostic] Found ${snapshotId.docs.length} investments by organizationId match.`);
            investmentsList = snapshotId.docs.map(doc => ({ ...doc.data() } as InvestmentData));
          } else {
            // 4. Final Fallback: Filter by company names that belong to this org
            const companyNames = new Set(companyList.map(c => c.name.trim().toLowerCase()));
            investmentsList = allInvsDocs.docs
              .map(doc => doc.data() as InvestmentData)
              .filter(inv => companyNames.has((inv.companyName || "").trim().toLowerCase()));

            console.log(`[Diagnostic] Found ${investmentsList.length} investments via company name mapping.`);
          }
        }
      }

      setInvestments(investmentsList);
      if (investmentsList.length === 0) {
        console.warn(`[Diagnostic] WARNING: No investments found for "${orgName}" after all fallback attempts.`);
      }
    } catch (e) {
      console.error("Error fetching investments: ", e);
      setError("Failed to fetch investments for this organization. Check your Firestore rules.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch companies and investments when organization changes
  useEffect(() => {
    if (!selectedOrgId) return;

    const fetchCompaniesAndInvestments = async () => {
      setLoading(true);
      console.log(`[Diagnostic] Loading data for Selected Org ID: ${selectedOrgId}`);
      try {
        // Get organization name for better matching
        const org = organizations.find(o => o.id === selectedOrgId);
        const orgName = org ? org.name : "";

        const companiesCollection = collection(db, 'companies');

        // 1. Try fetching companies by organizationId
        const q = query(companiesCollection, where("organizationId", "==", selectedOrgId));
        const snapshot = await getDocs(q);
        let companiesList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Company));

        // 2. Fallback: Fetch by organizationName if ID query returns nothing
        if (companiesList.length === 0 && orgName) {
          console.log(`[Diagnostic] No companies found by ID. Trying organization name: "${orgName}"`);
          const qName = query(companiesCollection, where("organizationName", "==", orgName));
          const snapshotName = await getDocs(qName);
          companiesList = snapshotName.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Company));
        }

        // 3. Last Fallback: Fetch all and filter (for edge cases like mismatched casing or spaces)
        if (companiesList.length === 0 && orgName) {
          console.log(`[Diagnostic] Still no companies. Trying case-insensitive/trimmed filter...`);
          const allCompaniesSnapshot = await getDocs(companiesCollection);
          const targetName = orgName.trim().toLowerCase();
          companiesList = allCompaniesSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Company))
            .filter(c => (c.organizationName || "").trim().toLowerCase() === targetName || c.organizationId === selectedOrgId);
        }

        console.log(`[Diagnostic] Found ${companiesList.length} companies for "${orgName}"`);
        setCompanies(companiesList);

        // After fetching companies, fetch investments
        await fetchInvestments(selectedOrgId, orgName, companiesList);
      } catch (e) {
        console.error("Error fetching companies: ", e);
        setError("Failed to fetch companies for this organization.");
        setLoading(false);
      }
    };

    fetchCompaniesAndInvestments();
  }, [selectedOrgId, organizations]);

  const handleOrgChange = (orgId: string) => {
    setSelectedOrgId(orgId);
    const orgData = organizations.find(o => o.id === orgId) || null;
    setSelectedOrgData(orgData);
  };

  return (
    <Router>
      <div className="flex flex-col min-h-screen bg-slate-100">
        <Header
          organizations={organizations}
          selectedOrgId={selectedOrgId}
          onOrgChange={handleOrgChange}
        />
        <main className="flex-grow container mx-auto px-4 py-8">
          {loading && (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600"></div>
              <p className="ml-4 text-xl text-gray-700">Loading data for {selectedOrgData?.name || 'Organization'}...</p>
            </div>
          )}
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-6 rounded-md shadow-md" role="alert">
              <h3 className="font-bold text-xl mb-2">Error</h3>
              <p>{error}</p>
            </div>
          )}
          {!loading && !error && (
            <Routes>
              <Route path="/" element={<Dashboard investments={investments} selectedOrg={selectedOrgData} />} />
              <Route path="/company/:companyName" element={<CompanyDetail investments={investments} />} />
            </Routes>
          )}
        </main>
        <Footer />
      </div>
    </Router>
  );
};

export default App;