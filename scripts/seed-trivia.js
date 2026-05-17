const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc } = require('firebase/firestore');

// Firebase config is read from .env — run this script with:
//   npm run seed       (or)   node --env-file=.env ./scripts/seed-trivia.js
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('❌ Missing Firebase env vars. Run with: npm run seed');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const today = new Date().toISOString().split('T')[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
const dayAfter = new Date(Date.now() + 172800000).toISOString().split('T')[0];

const triviaQuestions = [
  {
    id: 'trivia_001',
    question: 'Which government body is primarily responsible for maintaining local roads and drains?',
    options: ['State Government', 'Municipal Corporation', 'Federal Government', 'Traffic Police'],
    correctIndex: 1,
    category: 'infrastructure',
    activeDate: today,
  },
  {
    id: 'trivia_002',
    question: 'What is the primary purpose of the Solid Waste Management Act in urban areas?',
    options: ['Regulate factories', 'Manage garbage collection and disposal', 'Control air pollution', 'Regulate water supply'],
    correctIndex: 1,
    category: 'waste',
    activeDate: tomorrow,
  },
  {
    id: 'trivia_003',
    question: 'Which traffic signal color means "slow down and be prepared to stop"?',
    options: ['Red', 'Green', 'Amber/Yellow', 'Blue'],
    correctIndex: 2,
    category: 'traffic',
    activeDate: dayAfter,
  },
  {
    id: 'trivia_004',
    question: 'What does a "No Dumping" zone violation typically result in?',
    options: ['A verbal warning', 'A fine or penalty from the municipality', 'Community service only', 'Nothing happens'],
    correctIndex: 1,
    category: 'waste',
    activeDate: new Date(Date.now() + 259200000).toISOString().split('T')[0],
  },
  {
    id: 'trivia_005',
    question: 'What is a civic duty that every citizen in a democracy has?',
    options: ['Paying taxes only', 'Reporting civic issues', 'Voting, paying taxes, and following laws', 'Nothing is mandatory'],
    correctIndex: 2,
    category: 'general',
    activeDate: new Date(Date.now() + 345600000).toISOString().split('T')[0],
  },
];

async function seed() {
  console.log('🌱 Seeding Firestore trivia collection...');
  const triviaCol = collection(db, 'trivia');
  
  for (const q of triviaQuestions) {
    await setDoc(doc(triviaCol, q.id), q);
    console.log(`  ✅ Seeded: [${q.activeDate}] ${q.question.substring(0, 50)}...`);
  }
  
  console.log('\n🎉 Trivia seed complete! 5 questions added.');
  console.log('   Today\'s question is active for:', today);
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
