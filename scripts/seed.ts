import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocs, writeBatch } from 'firebase/firestore';
import { Organization, Company, InvestmentData, InvestmentScore } from '../types';

const firebaseConfig = {
    apiKey: "AIzaSyAkDprDP8Z5lsEJi-FFeUycgHMwO61mntg",
    authDomain: "ces2026-87861.firebaseapp.com",
    projectId: "ces2026-87861",
    storageBucket: "ces2026-87861.firebasestorage.app",
    messagingSenderId: "927583999358",
    appId: "1:927583999358:web:844940e2f8d67b94f04f2f",
    measurementId: "G-6KETBQ73PN"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const organizations: Organization[] = [
    {
        id: "daejeon-metropolitan",
        name: "Daejeon Metropolitan City",
        description: "Innovative startups from Daejeon Metropolitan City, the technology and research hub of Korea."
    },
    {
        id: "global-ventures-2026",
        name: "Global Ventures 2026 Summit",
        description: "The world's leading stage for disruptive technology and high-growth startups targeting international markets."
    }
];

const companies: Company[] = [
    // Organization 1: Daejeon
    {
        id: "ct-daejeon",
        name: "CT",
        organizationId: "daejeon-metropolitan",
        organizationName: "Daejeon Metropolitan City",
        isActive: true,
        displayOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        id: "daejeon-ai",
        name: "Daejeon AI Lab",
        organizationId: "daejeon-metropolitan",
        organizationName: "Daejeon Metropolitan City",
        isActive: true,
        displayOrder: 2,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    // Organization 2: Global Ventures
    {
        id: "nexus-ai",
        name: "Nexus AI Solutions",
        organizationId: "global-ventures-2026",
        organizationName: "Global Ventures 2026 Summit",
        isActive: true,
        displayOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date()
    }
];

const judges = ["kim@redbrick.ventures", "park@vc-group.com", "lee@angel.io", "choi@tech-fund.net", "jung@innovation.kr"];

const rationalePool = {
    "CT": {
        positive: [
            "Love the product, very intuitive and solves a real pain point.",
            "Strong technical execution and a clear path to market.",
            "The team has deep vertical expertise in this sector.",
            "Massive market opportunity if they can scale efficiently.",
            "Competitive advantage is well-defined through proprietary IP."
        ],
        negative: [
            "Competitive landscape is getting crowded quickly.",
            "Marketing strategy needs more refinement for global expansion.",
            "Burn rate is slightly higher than expected for this stage."
        ],
        tags: ["Product Love", "Deep Tech", "IP Moat"]
    },
    "Daejeon AI Lab": {
        positive: [
            "Exceptional algorithmic efficiency on the core platform.",
            "Partnership with local research institutes is a big plus.",
            "Founder is highly respected in the academic AI community.",
            "Modular design allows for easy integration with existing ERPs.",
            "High scalability potential due to the cloud-native architecture."
        ],
        negative: [
            "Needs a stronger B2B sales lead for sustainable growth.",
            "The data moat is still being built compared to incumbents.",
            "Regulatory compliance for AI in healthcare might take time."
        ],
        tags: ["AI Mastery", "Academic Edge", "Scalable"]
    },
    "Nexus AI Solutions": {
        positive: [
            "The proprietary transformer architecture shows 40% better efficiency than current benchmarks.",
            "Strong focus on vertical integration for edge-AI applications is a major differentiator.",
            "The founding team's background at OpenAI and DeepMind provides exceptional technical credibility.",
            "Impressive developer adoption and early pilot signs with Fortune 500 companies.",
            "Clear path to profitability through a high-margin enterprise SaaS model."
        ],
        negative: [
            "Heavy reliance on NVIDIA H100 availability could jeopardize near-term scaling.",
            "The competitive landscape in LLM optimization is becoming rapidly commoditized.",
            "GTM strategy for the European market seems underdeveloped compared to the US."
        ],
        tags: ["Disruptive Tech", "Founder Quality", "Scalability", "B2B SaaS"]
    }
};

const tagPool = ["Founder Quality", "Market Size", "High Returns", "Disruptive Tech", "Strategic Fit", "Scalability"];

const generateRealisticScores = (isTopTier: boolean): InvestmentScore => {
    const base = isTopTier ? 7.5 : 5.0;
    const spread = 2.5;

    return {
        "Business Model & Traction": Math.min(10, base + Math.random() * spread),
        "Competitive Advantage": Math.min(10, base + Math.random() * spread),
        "Market Opportunity": Math.min(10, base + Math.random() * spread),
        "Presentation & Storytelling": Math.min(10, base + Math.random() * spread),
        "Problem and Solution": Math.min(10, base + Math.random() * spread),
        "Team": Math.min(10, base + Math.random() * spread),
    };
};

async function seed() {
    console.log("🚀 Starting seed process...");

    try {
        // 0. Cleanup existing investments
        console.log("🧹 Cleaning up old data...");
        const invCollection = collection(db, "investments");
        const existingInvs = await getDocs(invCollection);
        const deleteBatch = writeBatch(db);
        existingInvs.forEach((document) => {
            deleteBatch.delete(doc(db, "investments", document.id));
        });
        await deleteBatch.commit();
        console.log(`✅ Deleted ${existingInvs.size} existing investments.`);

        // 1. Seed Organizations
        for (const org of organizations) {
            await setDoc(doc(db, "organizations", org.id), org);
            console.log(`✅ Seeded organization: ${org.name}`);
        }

        // 2. Seed Companies
        for (const company of companies) {
            await setDoc(doc(db, "companies", company.id), company);
            console.log(`✅ Seeded company: ${company.name}`);
        }

        // 3. Seed Investments
        console.log("⌛ Generating realistic investments...");
        const batch = writeBatch(db);
        let count = 0;

        for (const company of companies) {
            // Nexus AI, Orbital Edge, and SolarWeave are top tier for this demo
            const isTopTier = ["CT", "Nexus AI Solutions"].includes(company.name);
            const pool = (rationalePool as any)[company.name] || { positive: ["Great potential."], negative: ["Too early."], tags: ["N/A"] };

            for (const judge of judges) {
                const docId = `${judge}_${company.name.replace(/\s+/g, '_')}_1001`;

                // 80% positive for top tier, 50% for others
                const isPositive = Math.random() < (isTopTier ? 0.8 : 0.5);
                const feedbackArray = isPositive ? pool.positive : pool.negative;
                const feedback = feedbackArray[Math.floor(Math.random() * feedbackArray.length)];

                const investment: InvestmentData = {
                    "Document ID": docId,
                    companyName: company.name,
                    organization: company.organizationName,
                    investorName: judge,
                    lastUpdatedBy: judge,
                    overallComment: feedback,
                    projectId: 1001,
                    scores: generateRealisticScores(isTopTier),
                    submissionTimestamp: new Date().toISOString()
                };

                batch.set(doc(db, "investments", docId), investment);
                count++;
            }
        }

        await batch.commit();
        console.log(`✅ Seeded ${count} investment evaluations.`);
        console.log("🎉 Seeding complete!");

    } catch (error) {
        console.error("❌ Seeding failed:", error);
    }
}

seed();
