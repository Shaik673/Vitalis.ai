import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  Camera,
  CameraOff,
  CalendarDays,
  ChevronDown,
  CheckCircle2,
  CircleUserRound,
  Download,
  Dumbbell,
  Flame,
  Globe2,
  HeartPulse,
  Instagram,
  Leaf,
  Linkedin,
  LineChart as LineChartIcon,
  LockKeyhole,
  Mail,
  MapPin,
  MessageCircle,
  Moon,
  QrCode,
  RefreshCw,
  Salad,
  Save,
  ScanFace,
  SendHorizonal,
  ShieldCheck,
  CloudSun,
  PhoneCall,
  Sparkles,
  Star,
  Target,
  Trophy,
  Upload,
  Utensils,
  Users,
  WandSparkles,
  X,
  Zap,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import './styles.css';

const API_URL = 'http://127.0.0.1:8000';

const features = [
  {
    id: 'skin',
    title: 'Skin Analysis',
    eyebrow: 'Derm AI',
    icon: ScanFace,
    route: 'skin',
    color: '#7cfff3',
    description: 'Detect acne, pigmentation, pores, oil balance, hydration, fine lines, and routine opportunities.',
    tags: ['Skin score', 'Ingredients', 'Routine'],
  },
  {
    id: 'food',
    title: 'Food Analysis',
    eyebrow: 'Nutrition Lens',
    icon: Salad,
    route: 'food',
    color: '#c6ff72',
    description: 'Identify food, estimate macros, flag additives or allergens, and tune choices to your goals.',
    tags: ['Macros', 'Allergens', 'Health score'],
  },
  {
    id: 'vitals',
    title: 'Body Vitals',
    eyebrow: 'Metabolic Engine',
    icon: HeartPulse,
    route: 'vitals',
    color: '#ff9ecf',
    description: 'Calculate BMI, BMR, body fat, visceral fat, skeletal muscle, body age, and ideal weight.',
    tags: ['BMI', 'BMR', 'Progress'],
  },
];

const statesByCountry = {
  India: ['Andhra Pradesh', 'Delhi', 'Karnataka', 'Maharashtra', 'Tamil Nadu', 'Telangana'],
  'United States': ['California', 'Florida', 'New York', 'Texas', 'Washington'],
  Canada: ['Alberta', 'British Columbia', 'Ontario', 'Quebec'],
  'United Kingdom': ['England', 'Northern Ireland', 'Scotland', 'Wales'],
  Australia: ['New South Wales', 'Queensland', 'Victoria', 'Western Australia'],
};

const previewRows = [
  { label: 'Face scan', value: 86, color: '#7cfff3' },
  { label: 'Food score', value: 78, color: '#c6ff72' },
  { label: 'Vitals sync', value: 91, color: '#ff9ecf' },
];

const weekData = [
  { day: 'Mon', score: 72, calories: 210 },
  { day: 'Tue', score: 78, calories: 260 },
  { day: 'Wed', score: 75, calories: 230 },
  { day: 'Thu', score: 84, calories: 310 },
  { day: 'Fri', score: 88, calories: 350 },
  { day: 'Sat', score: 92, calories: 420 },
  { day: 'Sun', score: 89, calories: 390 },
];

const skinPositiveLabels = ['clear_skin', 'attractive', 'sharp_jawline'];

const skinInsightData = {
  dark_circles: {
    observation: 'Visible under-eye pigmentation or fatigue pattern.',
    factors: ['Poor sleep quality', 'Dehydration', 'Screen exposure', 'Stress'],
    habits: ['Sleep 7-8 hours', 'Reduce screen time before bed', 'Use a cold compress'],
    diet: ['Vitamin C foods', 'Iron-rich foods such as spinach or lentils'],
    nutrient: 'May indicate low iron or vitamin C support.',
  },
  oily_skin: {
    observation: 'Excess oil production is visible.',
    factors: ['Hormonal changes', 'Humidity', 'Over-cleansing'],
    habits: ['Use a gentle cleanser twice daily', 'Avoid harsh scrubbing'],
    diet: ['Reduce fried foods', 'Increase fruit and water intake'],
    nutrient: 'May relate to zinc or vitamin B balance.',
  },
  wrinkle: {
    observation: 'Early texture or fine-line signs are visible.',
    factors: ['Sun exposure', 'Dehydration', 'Collagen loss'],
    habits: ['Use sunscreen daily', 'Moisturize consistently'],
    diet: ['Vitamin E from nuts', 'Protein-rich collagen-support foods'],
    nutrient: 'May relate to vitamin E or collagen support.',
  },
  double_chin: {
    observation: 'Fullness under the chin is detected.',
    factors: ['Weight changes', 'Posture'],
    habits: ['Neck mobility exercises', 'Maintain upright posture'],
    diet: ['Balanced calorie intake', 'Reduce excess sugar'],
    nutrient: '',
  },
  chubby: {
    observation: 'Facial fullness is detected.',
    factors: ['High calorie intake', 'Water retention'],
    habits: ['Exercise regularly', 'Reduce high-salt snacks'],
    diet: ['High-fiber foods', 'Steady hydration'],
    nutrient: '',
  },
  clear_skin: {
    observation: 'Skin clarity can be protected or improved.',
    factors: ['Pollution', 'Routine inconsistency', 'Touching face often'],
    habits: ['Cleanse and moisturize daily', 'Avoid touching the face'],
    diet: ['Vitamin A foods such as carrots', 'Vitamin C foods'],
    nutrient: '',
  },
  attractive: {
    observation: 'Facial harmony and presentation are part of the model score.',
    factors: ['Expression', 'Grooming', 'Skin quality'],
    habits: ['Maintain grooming', 'Use consistent sleep and skincare rhythms'],
    diet: [],
    nutrient: '',
  },
  sharp_jawline: {
    observation: 'Jawline definition can improve.',
    factors: ['Body fat percentage', 'Posture'],
    habits: ['Jaw and neck exercises', 'Practice upright posture'],
    diet: [],
    nutrient: '',
  },
};

function makeAvatar(name = 'Vitalis User', gender = 'Prefer not to say') {
  const palette = gender === 'Male'
    ? ['#7cfff3', '#4f46e5']
    : gender === 'Female'
      ? ['#ff9ecf', '#f97316']
      : ['#c6ff72', '#14b8a6'];
  const initials = (name || 'Vitalis User')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'VA';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
      <defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="${palette[0]}"/><stop offset="1" stop-color="${palette[1]}"/></linearGradient></defs>
      <rect width="180" height="180" rx="48" fill="#08131f"/>
      <circle cx="90" cy="74" r="38" fill="url(#g)" opacity=".95"/>
      <path d="M34 164c8-38 31-58 56-58s48 20 56 58" fill="url(#g)" opacity=".85"/>
      <text x="90" y="102" text-anchor="middle" font-family="Arial, sans-serif" font-size="38" font-weight="800" fill="#061017">${initials}</text>
    </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function saveAnalysisReport(user, kind, result) {
  return api('/reports/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: user.id,
      kind,
      score: result.score,
      title: result.identifiedFood || result.title || `${kind} analysis report`,
      payload: result,
    }),
  });
}

function getWeatherForUser(user) {
  const country = user.country || 'India';
  const state = user.state || 'Telangana';
  const weatherMap = {
    India: { temp: 31, condition: 'Warm haze', detail: 'SPF and hydration recommended' },
    'United States': { temp: 22, condition: 'Mild clouds', detail: 'Good walk window today' },
    Canada: { temp: 13, condition: 'Cool breeze', detail: 'Warm up before outdoor cardio' },
    'United Kingdom': { temp: 15, condition: 'Light rain', detail: 'Indoor mobility works well' },
    Australia: { temp: 26, condition: 'Sunny', detail: 'Use SPF before midday' },
  };
  return { location: `${state}, ${country}`, ...(weatherMap[country] || weatherMap.India) };
}

function cls(...classes) {
  return classes.filter(Boolean).join(' ');
}

async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, options);
  } catch {
    throw new Error('Cannot connect to Vitalis API. Start the FastAPI backend on http://127.0.0.1:8000, then try again.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || 'Vitalis API request failed.');
  }
  return data;
}

function useLocalUser() {
  const [user, setUserState] = useState(() => {
    const saved = localStorage.getItem('vitalis:user');
    return saved ? JSON.parse(saved) : null;
  });

  const setUser = (nextUser) => {
    setUserState(nextUser);
    if (nextUser) localStorage.setItem('vitalis:user', JSON.stringify(nextUser));
    else localStorage.removeItem('vitalis:user');
  };

  return [user, setUser];
}

function App() {
  const [user, setUser] = useLocalUser();
  const [page, setPage] = useState(user ? (user.profileComplete ? 'home' : 'profile') : 'auth');

  useEffect(() => {
    if (!user) setPage('auth');
  }, [user]);

  const navigate = (nextPage) => setPage(nextPage);

  if (page === 'auth') {
    return <AuthPage setUser={setUser} navigate={navigate} />;
  }

  if (page === 'profile') {
    return (
      <>
        <ProfilePage user={user} setUser={setUser} navigate={navigate} />
        <GlobalFooter navigate={navigate} />
      </>
    );
  }

  return (
    <div className="app-shell">
      <Nav user={user} navigate={navigate} page={page} setUser={setUser} />
      {page === 'home' && <HomePage navigate={navigate} />}
      {page === 'dashboard' && <Dashboard user={user} />}
      {['skin', 'food', 'vitals'].includes(page) && <AnalysisPage type={page} user={user} />}
      <GlobalFooter navigate={navigate} />
      {['home', 'dashboard', 'skin', 'food', 'vitals'].includes(page) && <VitaSupportWidget domain={page} user={user} />}
    </div>
  );
}

function AuthPage({ setUser, navigate }) {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await api(mode === 'signin' ? '/auth/signin' : '/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      setUser(result.user);
      navigate(result.existing && result.user.profileComplete ? 'home' : 'profile');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <section className="auth-showcase">
        <div className="brand-chip"><Sparkles size={16} /> Vitalis AI Online</div>
        <h1>Personal health intelligence for skin, food, and body signals.</h1>
        <p>
          Sign in if you already have an account, or create a new Vitalis profile in local SQLite and complete onboarding.
        </p>
        <div className="orbital-panel">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div className={`orbit-card orbit-${index}`} key={feature.id}>
                <Icon size={24} />
                <span>{feature.title}</span>
              </div>
            );
          })}
          <div className="scan-core"><BrainCircuit size={48} /></div>
        </div>
      </section>
      <section className="auth-card glass-card">
        <div className="auth-heading">
          <div className="logo-mark"><HeartPulse /></div>
          <div>
            <span>Welcome to</span>
            <h2>Vitalis AI</h2>
          </div>
        </div>
        <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
          <button type="button" className={cls(mode === 'signin' && 'active')} onClick={() => { setMode('signin'); setError(''); }}>
            Sign in
          </button>
          <button type="button" className={cls(mode === 'signup' && 'active')} onClick={() => { setMode('signup'); setError(''); }}>
            Sign up
          </button>
        </div>
        <p className="auth-mode-copy">
          {mode === 'signin'
            ? 'Existing users go straight to Home after verification. New emails can still continue to profile setup.'
            : 'New users are saved in SQLite first, then routed to profile setup.'}
        </p>
        <form onSubmit={handleSubmit}>
          <label>
            Email
            <div className="input-shell">
              <Mail size={18} />
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={mode === 'signin' ? 'existing@example.com' : 'new@example.com'} required />
            </div>
          </label>
          <label>
            Password
            <div className="input-shell">
              <LockKeyhole size={18} />
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === 'signin' ? 'Enter password' : 'Create password'} required />
            </div>
          </label>
          {error && <div className="error-text">{error}</div>}
          <button className="primary-button" disabled={loading}>
            {loading ? 'Checking...' : mode === 'signin' ? 'Sign in' : 'Create account'} <ArrowRight size={18} />
          </button>
        </form>
      </section>
    </main>
  );
}

function ProfilePage({ user, setUser, navigate }) {
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    age: user?.age || 24,
    country: user?.country || 'India',
    state: user?.state || 'Telangana',
    gender: user?.gender || 'Female',
    avatar: user?.avatar || '',
  });
  const [error, setError] = useState('');
  const stateOptions = statesByCountry[form.country] || [];
  const previewAvatar = form.avatar || makeAvatar(form.fullName || form.email, form.gender);

  function update(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === 'country' ? { state: statesByCountry[value][0] } : {}),
    }));
  }

  async function saveProfile(event) {
    event.preventDefault();
    setError('');
    try {
      const avatar = form.avatar || makeAvatar(form.fullName || form.email, form.gender);
      const result = await api('/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, ...form, avatar }),
      });
      setUser(result.user);
      navigate('home');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAvatarUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 900000) {
      setError('Please choose an image below 900 KB for the local profile database.');
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      update('avatar', dataUrl);
      setError('');
    } catch {
      setError('Could not read that image. Please try another file.');
    }
  }

  return (
    <main className="profile-page">
      <section className="profile-card glass-card">
        <button className="profile-back-button" type="button" onClick={() => navigate('auth')}>
          <ArrowRight size={17} /> Back to landing
        </button>
        <div className="profile-avatar">
          <img src={previewAvatar} alt="" />
          <span><Camera size={16} /> Profile setup</span>
        </div>
        <form onSubmit={saveProfile} className="profile-form">
          <label className="profile-upload">Profile picture
            <input type="file" accept="image/*" onChange={handleAvatarUpload} />
            <span><Upload size={16} /> {form.avatar ? 'Change uploaded photo' : 'Upload photo or use avatar'}</span>
          </label>
          <label>Full Name<input value={form.fullName} onChange={(event) => update('fullName', event.target.value)} required /></label>
          <label>Email<input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} required /></label>
          <label>Age<input type="number" min="12" max="100" value={form.age} onChange={(event) => update('age', Number(event.target.value))} required /></label>
          <label>Country<select value={form.country} onChange={(event) => update('country', event.target.value)}>{Object.keys(statesByCountry).map((country) => <option key={country}>{country}</option>)}</select></label>
          <label>State<select value={form.state} onChange={(event) => update('state', event.target.value)}>{stateOptions.map((state) => <option key={state}>{state}</option>)}</select></label>
          <label>Gender<select value={form.gender} onChange={(event) => update('gender', event.target.value)}>{['Female', 'Male', 'Non-binary', 'Prefer not to say'].map((gender) => <option key={gender}>{gender}</option>)}</select></label>
          {error && <div className="error-text">{error}</div>}
          <button className="primary-button">Enter Vitalis <ArrowRight size={18} /></button>
        </form>
      </section>
    </main>
  );
}

function Nav({ user, navigate, page, setUser }) {
  return (
    <header className="navbar">
      <button className="brand" onClick={() => navigate('home')}><HeartPulse /> Vitalis<span>AI</span></button>
      <nav>
        <button className={cls(page === 'home' && 'active')} onClick={() => navigate('home')}>Home</button>
        <button className={cls(page === 'dashboard' && 'active')} onClick={() => navigate('dashboard')}>Dashboard</button>
        {features.map((feature) => (
          <button key={feature.id} className={cls(page === feature.route && 'active')} onClick={() => navigate(feature.route)}>{feature.title}</button>
        ))}
      </nav>
      <button className="profile-pill" onClick={() => navigate('profile')}>
        {user?.avatar ? <img src={user.avatar} alt="" /> : <CircleUserRound size={24} />}
        <span><i /> AI Online</span>
      </button>
      <button className="ghost-button compact" onClick={() => setUser(null)}>Sign out</button>
    </header>
  );
}

function HomePage({ navigate }) {
  return (
    <main>
      <Hero navigate={navigate} />
      <Features navigate={navigate} />
      <LivePreview />
      <Benefits />
      <Testimonials />
    </main>
  );
}

function Hero({ navigate }) {
  return (
    <section className="hero-section">
      <div className="hero-grid">
        <div className="hero-copy">
          <div className="brand-chip"><Sparkles size={16} /> AI-powered personal wellness</div>
          <h1>Analyze your face, food, and body vitals in one luminous health cockpit.</h1>
          <p>
            Vitalis turns everyday inputs into personalized skincare, nutrition, and body metric guidance with smooth, modern visual reports.
          </p>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => navigate('skin')}>Start analysis <WandSparkles size={18} /></button>
            <button className="secondary-button" onClick={() => navigate('dashboard')}>View dashboard <LineChartIcon size={18} /></button>
          </div>
        </div>
        <div className="holo-device">
          <div className="phone-frame">
            <div className="phone-top" />
            <div className="face-map">
              <div className="face-outline" />
              <span className="scan-line" />
              <div className="metric-bubble bubble-a">Hydration 84</div>
              <div className="metric-bubble bubble-b">BMI 22.4</div>
              <div className="metric-bubble bubble-c">Macros 78</div>
            </div>
            <div className="phone-metrics">
              {previewRows.map((row) => <span key={row.label} style={{ '--bar': `${row.value}%`, '--tone': row.color }}>{row.label}</span>)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Features({ navigate }) {
  return (
    <section className="section-block">
      <div className="section-heading">
        <span>Feature suite</span>
        <h2>Three intelligent tools, one adaptive health profile.</h2>
      </div>
      <div className="feature-grid">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <button className="feature-card glass-card" key={feature.id} onClick={() => navigate(feature.route)} style={{ '--tone': feature.color }}>
              <div className="feature-icon"><Icon /></div>
              <span>{feature.eyebrow}</span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              <div className="tag-row">{feature.tags.map((tag) => <b key={tag}>{tag}</b>)}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function LivePreview() {
  return (
    <section className="preview-section">
      <div className="preview-copy">
        <span>Live animated preview</span>
        <h2>Upload, scan, score, improve.</h2>
        <p>Animated cards demonstrate the loop users follow across all analysis modes, from image capture to personalized action cards.</p>
      </div>
      <div className="preview-stage glass-card">
        <div className="preview-phone">
          <div className="preview-feed">
            <div className="pulse-dot" />
            <ScanFace />
            <span>Scanning face mesh</span>
          </div>
          <div className="preview-feed delay-one">
            <Utensils />
            <span>Estimating nutrition</span>
          </div>
          <div className="preview-feed delay-two">
            <Activity />
            <span>Plotting vitals</span>
          </div>
        </div>
        <div className="preview-chart">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={weekData}>
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7cfff3" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#7cfff3" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} />
              <XAxis dataKey="day" stroke="#9fb5c8" />
              <YAxis hide domain={[50, 100]} />
              <Tooltip contentStyle={{ background: '#08131f', border: '1px solid rgba(255,255,255,.14)', borderRadius: 14 }} />
              <Area type="monotone" dataKey="score" stroke="#7cfff3" fill="url(#scoreGradient)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

function Benefits() {
  const items = [
    ['Personalized routines', 'Skincare and nutrition guidance adapts to your reports, goals, and current body data.', ShieldCheck],
    ['Fast visual insight', 'Scores, charts, and tags turn complex wellness signals into decisions you can use today.', Zap],
    ['Progress momentum', 'Dashboard trends, streaks, and badges make improvement visible and easier to repeat.', BadgeCheck],
  ];
  return (
    <section className="section-block benefits">
      <div className="section-heading">
        <span>Why use Vitalis</span>
        <h2>A calmer way to understand your health signals.</h2>
      </div>
      <div className="benefit-grid">
        {items.map(([title, copy, Icon]) => (
          <article className="benefit-card" key={title}>
            <Icon />
            <h3>{title}</h3>
            <p>{copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Testimonials() {
  const quotes = [
    ['Aarav', 'The skin routine suggestions finally made my reports feel actionable.'],
    ['Maya', 'I use the food scanner before dinner and the dashboard keeps me honest.'],
    ['Nina', 'The vitals graphs are beautiful and clear enough to check every week.'],
    ['Sam', 'Vitalis feels like a health dashboard from the future.'],
  ];
  return (
    <section className="testimonial-band">
      <div className="ticker">
        {[...quotes, ...quotes].map(([name, quote], index) => (
          <article className="testimonial-card" key={`${name}-${index}`}>
            <Star size={16} />
            <p>{quote}</p>
            <span>{name}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div><HeartPulse /> Vitalis AI</div>
      <span>Skin intelligence, nutrition clarity, and body metrics in one modern interface.</span>
    </footer>
  );
}

function Dashboard({ user }) {
  const [data, setData] = useState(null);
  const [leaderboardFilter, setLeaderboardFilter] = useState('All');

  useEffect(() => {
    api(`/dashboard/${user.id}`).then(setData).catch(() => setData(null));
  }, [user.id]);

  const stats = data?.stats || { activityScore: 87, streak: 8, calories: 2460, goal: 92 };
  const weekly = data?.weekly || weekData.map((item) => ({ ...item, skin: item.score, food: item.score - 6, vitals: item.score + 3 }));
  const avatar = user.avatar || makeAvatar(user.fullName || user.email, user.gender);
  const weather = getWeatherForUser(user);
  const savedReports = data?.savedReports || [];
  const comparison = data?.comparison || weekly.map((item, index) => ({
    day: item.day,
    skin: item.skin,
    food: item.food,
    vitals: item.vitals,
    previousSkin: Math.max(45, item.skin - 7 - (index % 2)),
    previousFood: Math.max(45, item.food - 5 + (index % 3)),
    previousVitals: Math.max(45, item.vitals - 6 - (index % 2)),
  }));
  const categoryChanges = data?.categoryMomentum || [
    makeChange('Skin Analysis', weekly, 'skin', comparison, 'previousSkin', '#7cfff3'),
    makeChange('Nutrition Analysis', weekly, 'food', comparison, 'previousFood', '#c6ff72'),
    makeChange('Body Vitals', weekly, 'vitals', comparison, 'previousVitals', '#ff9ecf'),
  ];
  const leaderboard = makeLeaderboard(user, avatar, stats, leaderboardFilter);
  const heatmap = makeHeatmap(stats.streak);
  const broadInsights = [
    { title: 'Skin Analysis', icon: ScanFace, text: `Skin consistency is ${categoryChanges[0].change >= 0 ? 'improving' : 'slipping'} by ${Math.abs(categoryChanges[0].change)}%. ${categoryChanges[0].count || 0} saved skin reports are shaping the trend line. Latest: ${categoryChanges[0].latestTitle || 'No saved skin report yet'}. In ${weather.location}, ${weather.detail.toLowerCase()} while you maintain barrier support and hydration.` },
    { title: 'Nutrition Analysis', icon: Salad, text: `Nutrition activity is ${categoryChanges[1].change >= 0 ? 'up' : 'down'} ${Math.abs(categoryChanges[1].change)}%. ${categoryChanges[1].count || 0} saved food reports now shape weekly dashboard values. Latest: ${categoryChanges[1].latestTitle || 'No saved food report yet'}. Focus first on protein, fiber, lower sodium, and lower added sugar.` },
    { title: 'Body Vitals', icon: HeartPulse, text: `Vitals progress changed ${categoryChanges[2].change >= 0 ? '+' : '-'}${Math.abs(categoryChanges[2].change)}%. ${categoryChanges[2].count || 0} saved vitals reports are included. Latest: ${categoryChanges[2].latestTitle || 'No saved vitals report yet'}. Compare weekly averages rather than single-day swings.` },
  ];

  function exportPdf() {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const now = new Date();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 38;
    const contentWidth = pageWidth - margin * 2;
    const latestSkin = savedReports.find((report) => report.kind === 'skin')?.payload;
    const latestFood = savedReports.find((report) => report.kind === 'food')?.payload;
    const latestVitals = savedReports.find((report) => report.kind === 'vitals')?.payload;
    const skinMetrics = buildSkinMetrics(latestSkin || { metrics: [] });
    const skinAnnotations = buildSkinAnnotations(skinMetrics);
    const foodNutrition = latestFood?.nutrition || { calories: stats.calories, protein: 0, carbohydrates: 0, fats: 0, sugar: 0, sodium: 0 };
    const vitalsMetrics = latestVitals?.metrics || {
      BMI: 24.1,
      BMR: 1680,
      'Body Fat %': 21.4,
      'Visceral Fat %': 10.6,
      'Estimated Body Age': user.age || 28,
      'Trunk Subcutaneous Fat %': 12.8,
      'Skeletal Muscle %': 41.8,
      'Overall Ideal Weight': 68.5,
    };
    const summary = `VitalisAI analyzed ${savedReports.length} saved reports across skin, nutrition, and body vitals. Your current activity score is ${stats.activityScore}/100 with a ${stats.streak}-day consistency streak. ${categoryChanges.map((item) => `${item.name}: ${item.count || 0} reports, ${item.change >= 0 ? '+' : ''}${item.change || 0}% momentum`).join('; ')}.`;

    const addPageShell = (title, kicker = 'VitalisAI Health Intelligence') => {
      doc.setFillColor(246, 250, 252);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      doc.setFillColor(5, 12, 20);
      doc.rect(0, 0, pageWidth, 82, 'F');
      doc.setFillColor(124, 255, 243);
      doc.roundedRect(margin, 24, 34, 34, 10, 10, 'F');
      doc.setTextColor(6, 16, 23);
      doc.setFontSize(16);
      doc.text('V', margin + 12, 47);
      doc.setTextColor(191, 254, 250);
      doc.setFontSize(9);
      doc.text(kicker.toUpperCase(), margin + 48, 34);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(19);
      doc.text(title, margin + 48, 56);
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(8);
      doc.text(`Generated ${now.toLocaleDateString()} • Confidential wellness report`, margin, pageHeight - 22);
      doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - margin - 34, pageHeight - 22);
    };

    const addSectionHeader = (title, subtitle, y, colors = [20, 184, 166]) => {
      doc.setFillColor(colors[0], colors[1], colors[2]);
      doc.roundedRect(margin, y, contentWidth, 46, 14, 14, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.text(title, margin + 18, y + 20);
      doc.setFontSize(9);
      doc.setTextColor(230, 255, 252);
      doc.text(subtitle, margin + 18, y + 36);
    };

    const card = (x, y, w, h, title, value, meta, color = [20, 184, 166]) => {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x, y, w, h, 14, 14, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x, y, w, h, 14, 14, 'S');
      doc.setFillColor(color[0], color[1], color[2]);
      doc.roundedRect(x + 12, y + 12, 8, h - 24, 4, 4, 'F');
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8);
      doc.text(String(title).toUpperCase(), x + 30, y + 22);
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(20);
      doc.text(String(value), x + 30, y + 47);
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(8);
      doc.text(doc.splitTextToSize(String(meta || ''), w - 42), x + 30, y + 64);
    };

    const pill = (text, x, y, status = 'good') => {
      const fill = status === 'critical' ? [251, 113, 133] : status === 'caution' ? [251, 191, 36] : [94, 234, 212];
      doc.setFillColor(fill[0], fill[1], fill[2]);
      doc.roundedRect(x, y, Math.max(58, doc.getTextWidth(text) + 18), 18, 9, 9, 'F');
      doc.setTextColor(6, 16, 23);
      doc.setFontSize(7);
      doc.text(text.toUpperCase(), x + 9, y + 12);
    };

    const progress = (x, y, w, label, value, color = [20, 184, 166], range = '0-100') => {
      doc.setTextColor(51, 65, 85);
      doc.setFontSize(8);
      doc.text(label, x, y);
      doc.text(`${value}%`, x + w - 24, y);
      doc.setFillColor(226, 232, 240);
      doc.roundedRect(x, y + 7, w, 7, 4, 4, 'F');
      doc.setFillColor(color[0], color[1], color[2]);
      doc.roundedRect(x, y + 7, Math.max(6, w * Math.min(100, Number(value) || 0) / 100), 7, 4, 4, 'F');
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(7);
      doc.text(range, x, y + 25);
    };

    const addImageSafe = (image, x, y, w, h) => {
      doc.setFillColor(226, 232, 240);
      doc.roundedRect(x, y, w, h, 14, 14, 'F');
      if (!image) {
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(10);
        doc.text('No image saved yet', x + 24, y + h / 2);
        return;
      }
      try {
        doc.addImage(image, image.includes('image/png') ? 'PNG' : 'JPEG', x, y, w, h);
      } catch {
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(10);
        doc.text('Image preview unavailable', x + 24, y + h / 2);
      }
    };

    const drawGauge = (x, y, radius, value, label, color = [20, 184, 166]) => {
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(10);
      doc.circle(x, y, radius, 'S');
      doc.setDrawColor(color[0], color[1], color[2]);
      doc.setLineWidth(10);
      const end = Math.max(0.1, Math.min(1, value / 100));
      for (let i = 0; i < end * 28; i += 1) {
        const a = (-210 + i * 10) * Math.PI / 180;
        const a2 = (-210 + (i + 0.75) * 10) * Math.PI / 180;
        doc.line(x + Math.cos(a) * radius, y + Math.sin(a) * radius, x + Math.cos(a2) * radius, y + Math.sin(a2) * radius);
      }
      doc.setLineWidth(1);
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(22);
      doc.text(`${value}`, x - 16, y + 6);
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(label, x - doc.getTextWidth(label) / 2, y + radius + 22);
    };

    addPageShell('Personal AI Health Report');
    doc.setFillColor(5, 12, 20);
    doc.rect(0, 82, pageWidth, 270, 'F');
    doc.setFillColor(124, 255, 243);
    doc.circle(pageWidth - 88, 148, 58, 'F');
    doc.setFillColor(255, 158, 207);
    doc.circle(pageWidth - 132, 232, 42, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(30);
    doc.text('VitalisAI Medical Dashboard', margin, 142);
    doc.setFontSize(13);
    doc.setTextColor(203, 213, 225);
    doc.text(doc.splitTextToSize('A professional AI wellness report combining skin analysis, nutrition intelligence, and body vitals into one shareable health overview.', 360), margin, 170);
    card(margin, 382, 158, 84, 'Health score', `${stats.activityScore}/100`, 'AI activity composite', [20, 184, 166]);
    card(margin + 176, 382, 158, 84, 'Report date', now.toLocaleDateString(), 'Generated locally', [236, 72, 153]);
    card(margin + 352, 382, 158, 84, 'Saved reports', savedReports.length, 'Skin, food, vitals', [132, 204, 22]);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, 492, contentWidth, 134, 16, 16, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(15);
    doc.text('User Profile', margin + 18, 518);
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    [
      `Name: ${user.fullName || user.email || 'Vitalis member'}`,
      `Age: ${user.age || 'N/A'}    Gender: ${user.gender || 'N/A'}`,
      `Location: ${weather.location}`,
      `Email: ${user.email || 'N/A'}`,
    ].forEach((line, index) => doc.text(line, margin + 18, 544 + index * 18));
    drawGauge(pageWidth - 125, 560, 44, stats.activityScore, 'Overall score', [20, 184, 166]);
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42);
    doc.text('AI-Generated Summary', margin, 666);
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.text(doc.splitTextToSize(summary, contentWidth), margin, 688);

    doc.addPage();
    addPageShell('Analytics Overview');
    addSectionHeader('Weekly & Monthly Momentum', 'Dynamic visual metrics based on saved reports and category scores', 104, [20, 184, 166]);
    drawPdfLineChart(doc, comparison, margin, 178, contentWidth, 170);
    categoryChanges.forEach((item, index) => {
      const y = 390 + index * 66;
      const status = item.change < -10 ? 'critical' : item.change < 0 ? 'caution' : 'good';
      card(margin, y, contentWidth, 52, item.name, `${item.change >= 0 ? '+' : ''}${item.change || 0}%`, `${item.count || 0} saved reports • ${item.latestTitle || 'No latest report'}`, index === 0 ? [20, 184, 166] : index === 1 ? [132, 204, 22] : [236, 72, 153]);
      pill(status === 'good' ? 'Healthy momentum' : status === 'caution' ? 'Caution' : 'Critical', pageWidth - margin - 118, y + 17, status);
    });
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('AI Insights', margin, 618);
    broadInsights.forEach((item, index) => {
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.text(doc.splitTextToSize(`${item.title}: ${item.text}`, contentWidth), margin, 642 + index * 44);
    });

    doc.addPage();
    addPageShell('Skin Analysis');
    addSectionHeader('AI Face Mapping & Skin Quality', 'Annotated visual findings, confidence scores, severity badges, and personalized skincare guidance', 104, [20, 184, 166]);
    addImageSafe(latestSkin?.imagePreview, margin, 172, 236, 260);
    doc.setDrawColor(20, 184, 166);
    doc.setLineWidth(1);
    skinAnnotations.forEach((item, index) => {
      const sx = margin + 70 + (index % 2) * 84;
      const sy = 222 + Math.floor(index / 2) * 52;
      const tx = margin + 276;
      const ty = 176 + index * 34;
      doc.line(sx, sy, tx - 8, ty + 10);
      card(tx, ty, 244, 28, item.label, `${item.confidence}%`, `${item.severityLabel} severity`, item.severityClass === 'high' ? [251, 113, 133] : item.severityClass === 'moderate' ? [251, 191, 36] : [20, 184, 166]);
    });
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(13);
    doc.text('Segmented Skin Regions', margin, 472);
    ['Forehead', 'Cheeks', 'Nose', 'Chin', 'Under-eye'].forEach((label, index) => {
      progress(margin + (index % 2) * 260, 500 + Math.floor(index / 2) * 42, 210, label, Math.max(24, Math.min(92, skinMetrics[index]?.percentage || 58)), index % 2 ? [251, 191, 36] : [20, 184, 166], 'severity visualization');
    });
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text('Personalized Skincare Recommendations', margin, 650);
    Object.entries(latestSkin?.recommendations || { Routine: ['AM cleanser, antioxidant serum, moisturizer, SPF 50.', 'PM cleanser, niacinamide or retinoid as tolerated, moisturizer.'] }).slice(0, 3).forEach(([group, items], index) => {
      doc.setFontSize(9);
      doc.setTextColor(20, 184, 166);
      doc.text(group, margin, 674 + index * 42);
      doc.setTextColor(51, 65, 85);
      doc.text(doc.splitTextToSize((Array.isArray(items) ? items : [items]).join(' '), contentWidth), margin + 84, 674 + index * 42);
    });

    doc.addPage();
    addPageShell('Food Analysis');
    addSectionHeader('Nutrition Intelligence', 'Detected meal details, macro balance, quality indicators, and AI dietary suggestions', 104, [132, 204, 22]);
    addImageSafe(latestFood?.imagePreview, margin, 172, 198, 170);
    card(margin + 218, 172, 140, 76, 'Detected food', latestFood?.identifiedFood || 'No saved meal', 'Latest nutrition scan', [132, 204, 22]);
    card(margin + 374, 172, 136, 76, 'Nutrition score', `${latestFood?.score || 0}/100`, 'Meal quality index', [20, 184, 166]);
    const macroTotal = Number(foodNutrition.protein || 0) + Number(foodNutrition.carbohydrates || 0) + Number(foodNutrition.fats || 0) || 1;
    [
      ['Calories', foodNutrition.calories || 0, 900, [236, 72, 153]],
      ['Protein', foodNutrition.protein || 0, macroTotal, [99, 102, 241]],
      ['Carbs', foodNutrition.carbohydrates || 0, macroTotal, [245, 158, 11]],
      ['Fat', foodNutrition.fats || 0, macroTotal, [236, 72, 153]],
      ['Sugar', foodNutrition.sugar || 0, 60, [251, 191, 36]],
      ['Sodium', foodNutrition.sodium || 0, 1200, [251, 113, 133]],
    ].forEach(([label, value, max, color], index) => {
      progress(margin + (index % 2) * 260, 382 + Math.floor(index / 2) * 48, 220, label, Math.round((Number(value) / Number(max)) * 100), color, `${value}${label === 'Calories' ? ' kcal' : label === 'Sodium' ? ' mg' : ' g'}`);
    });
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text('Meal Quality Indicators', margin, 552);
    const flags = latestFood?.flags || { harmfulIngredients: ['No saved flags'], possibleAllergens: ['No saved allergens'] };
    [...(flags.harmfulIngredients || []), ...(flags.possibleAllergens || [])].slice(0, 6).forEach((flag, index) => pill(flag, margin + (index % 3) * 170, 574 + Math.floor(index / 3) * 26, index < 3 ? 'good' : 'caution'));
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text('AI Dietary Suggestions', margin, 650);
    Object.entries(latestFood?.recommendations || { 'Goal-Based Tips': ['Save a food report to unlock meal-specific recommendations.'] }).slice(0, 3).forEach(([group, items], index) => {
      doc.setFontSize(9);
      doc.setTextColor(132, 204, 22);
      doc.text(group, margin, 674 + index * 38);
      doc.setTextColor(51, 65, 85);
      doc.text(doc.splitTextToSize((Array.isArray(items) ? items : [items]).join(' '), contentWidth - 120), margin + 100, 674 + index * 38);
    });

    doc.addPage();
    addPageShell('Body Vitals');
    addSectionHeader('Metabolic & Body Composition Dashboard', 'BMI, BMR, body fat, visceral fat, muscle, age, ideal weight, and trend indicators', 104, [236, 72, 153]);
    const vitalsRows = [
      ['BMI', vitalsMetrics.BMI, '18.5-24.9', 22, 'healthy'],
      ['BMR', vitalsMetrics.BMR, 'varies by age/body', 70, 'healthy'],
      ['Body Fat %', vitalsMetrics['Body Fat %'], '15-24%', Number(vitalsMetrics['Body Fat %']) * 3, Number(vitalsMetrics['Body Fat %']) > 28 ? 'caution' : 'healthy'],
      ['Visceral Fat', vitalsMetrics['Visceral Fat %'], '<10', Number(vitalsMetrics['Visceral Fat %']) * 6, Number(vitalsMetrics['Visceral Fat %']) > 14 ? 'critical' : Number(vitalsMetrics['Visceral Fat %']) > 10 ? 'caution' : 'healthy'],
      ['Skeletal Muscle', vitalsMetrics['Skeletal Muscle %'], '35-45%', Number(vitalsMetrics['Skeletal Muscle %']) * 2, 'healthy'],
      ['Body Age', vitalsMetrics['Estimated Body Age'], 'near actual age', 62, 'healthy'],
      ['Ideal Weight', `${vitalsMetrics['Overall Ideal Weight']} kg`, 'BMI 22 target', 76, 'healthy'],
      ['Trunk Fat', `${vitalsMetrics['Trunk Subcutaneous Fat %']}%`, '8-20%', Number(vitalsMetrics['Trunk Subcutaneous Fat %']) * 4, 'healthy'],
    ];
    vitalsRows.forEach(([label, value, range, percent, state], index) => {
      const x = margin + (index % 2) * 260;
      const y = 178 + Math.floor(index / 2) * 74;
      card(x, y, 238, 60, label, value, `Reference: ${range}`, state === 'critical' ? [251, 113, 133] : state === 'caution' ? [251, 191, 36] : [20, 184, 166]);
      progress(x + 30, y + 68, 190, state === 'critical' ? 'Critical' : state === 'caution' ? 'Caution' : 'Healthy', Math.min(100, Number(percent) || 0), state === 'critical' ? [251, 113, 133] : state === 'caution' ? [251, 191, 36] : [20, 184, 166], `Balanced range: ${range}`);
    });
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text('Weekly Progress Comparison', margin, 548);
    drawPdfLineChart(doc, comparison, margin, 568, contentWidth, 140);

    doc.addPage();
    addPageShell('Final Health Overview');
    addSectionHeader('Improvement Plan & Executive Summary', 'Actionable next steps for skin, nutrition, body composition, and weekly consistency', 104, [99, 102, 241]);
    [
      ['Skin priority', categoryChanges[0].latestTitle || 'Save a skin scan', broadInsights[0].text],
      ['Nutrition priority', categoryChanges[1].latestTitle || 'Save a meal scan', broadInsights[1].text],
      ['Vitals priority', categoryChanges[2].latestTitle || 'Save body vitals', broadInsights[2].text],
    ].forEach(([title, value, text], index) => {
      card(margin, 176 + index * 112, contentWidth, 86, title, value, text, index === 0 ? [20, 184, 166] : index === 1 ? [132, 204, 22] : [236, 72, 153]);
    });
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(15);
    doc.text('Final AI Recommendations', margin, 540);
    [
      'Repeat the strongest category twice this week and save each report to improve dashboard precision.',
      'Keep image capture conditions consistent so skin and food comparisons reflect real changes.',
      'Use weekly averages for vitals rather than single-day swings, especially for weight and body fat.',
      'Pair nutrition quality, hydration, sleep, and strength training for the highest combined improvement.',
    ].forEach((line, index) => {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, 568 + index * 38, contentWidth, 28, 8, 8, 'F');
      doc.setTextColor(51, 65, 85);
      doc.setFontSize(9);
      doc.text(`${index + 1}. ${line}`, margin + 14, 586 + index * 38);
    });
    doc.save('vitalis-ai-professional-health-report.pdf');
  }

  return (
    <main className="dashboard-page">
      <section className="dashboard-hero glass-card">
        <div>
          <span>Welcome back</span>
          <h1>{user.fullName || 'Vitalis member'}, your health signals are trending upward.</h1>
          <p>Small consistent actions compound into visible progress. {savedReports.length} saved reports are shaping your weekly dashboard trends.</p>
        </div>
        <div className="dashboard-profile-weather">
          <div className="dashboard-avatar"><img src={avatar} alt="" /></div>
          <div className="weather-card">
            <span><MapPin size={14} /> {weather.location}</span>
            <strong><CloudSun size={18} /> {weather.temp}°C · {weather.condition}</strong>
            <small>{weather.detail}</small>
          </div>
        </div>
      </section>
      <div className="dashboard-actions">
        <button className="primary-button" onClick={exportPdf}><Download size={18} /> Export activity PDF</button>
      </div>
      <div className="stat-grid">
        <StatCard icon={Target} label="Activity score" value={stats.activityScore} suffix="/100" trend={`${stats.activityTrend >= 0 ? '+' : ''}${stats.activityTrend || 0}%`} />
        <StatCard icon={Flame} label="Streak" value={stats.streak} suffix=" days" trend={`+${stats.streakTrend || 0} saved`} />
        <StatCard icon={Dumbbell} label="Calories tracked" value={stats.calories} trend={`${savedReports.length} reports`} />
        <CircularStat value={stats.goal} />
      </div>
      <section className="analytics-grid">
        <article className="chart-card glass-card">
          <div className="chart-head"><h3>Current week vs previous week</h3><button>Weekly <ChevronDown size={16} /></button></div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={comparison}>
              <defs>
                <linearGradient id="skinArea" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#7cfff3" stopOpacity=".42" /><stop offset="1" stopColor="#7cfff3" stopOpacity=".04" /></linearGradient>
                <linearGradient id="foodArea" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#c6ff72" stopOpacity=".32" /><stop offset="1" stopColor="#c6ff72" stopOpacity=".03" /></linearGradient>
                <linearGradient id="vitalsArea" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#ff9ecf" stopOpacity=".34" /><stop offset="1" stopColor="#ff9ecf" stopOpacity=".03" /></linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} />
              <XAxis dataKey="day" stroke="#9fb5c8" />
              <YAxis stroke="#9fb5c8" domain={[50, 100]} />
              <Tooltip contentStyle={{ background: '#08131f', border: '1px solid rgba(255,255,255,.14)', borderRadius: 14 }} />
              <Area type="monotone" dataKey="skin" stroke="#7cfff3" fill="url(#skinArea)" strokeWidth={3} />
              <Area type="monotone" dataKey="food" stroke="#c6ff72" fill="url(#foodArea)" strokeWidth={3} />
              <Area type="monotone" dataKey="vitals" stroke="#ff9ecf" fill="url(#vitalsArea)" strokeWidth={3} />
              <Line type="monotone" dataKey="previousSkin" stroke="rgba(124,255,243,.42)" strokeDasharray="5 5" dot={false} />
              <Line type="monotone" dataKey="previousFood" stroke="rgba(198,255,114,.38)" strokeDasharray="5 5" dot={false} />
              <Line type="monotone" dataKey="previousVitals" stroke="rgba(255,158,207,.4)" strokeDasharray="5 5" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </article>
        <article className="chart-card glass-card">
          <div className="chart-head"><h3>Category momentum</h3><span className="up">Monthly view</span></div>
          <div className="change-grid">
            {categoryChanges.map((item) => (
              <article className="change-card" key={item.name} style={{ '--tone': item.color }}>
                <span>{item.name}</span>
                <strong>{item.change >= 0 ? '+' : ''}{item.change}% {item.change >= 0 ? 'up' : 'down'}</strong>
                <i><em style={{ width: `${Math.min(100, Math.abs(item.change) * 4 + 35)}%` }} /></i>
              </article>
            ))}
          </div>
        </article>
      </section>
      <section className="dashboard-wide-grid">
        <article className="chart-card glass-card leaderboard-card">
          <div className="chart-head"><h3><Trophy size={19} /> Community leaderboard</h3><LeaderboardFilters value={leaderboardFilter} setValue={setLeaderboardFilter} /></div>
          <div className="rank-list">
            {leaderboard.map((entry) => <LeaderboardRow key={entry.name} entry={entry} current={entry.current} />)}
          </div>
        </article>
        <article className="chart-card glass-card streak-card">
          <div className="chart-head"><h3><CalendarDays size={19} /> Streak & consistency tracker</h3><span className="up">{stats.streak} day streak</span></div>
          <div className="heatmap">
            {heatmap.map((cell) => <span key={cell.id} className={`heat-${cell.level}`} title={`${cell.label}: ${cell.level * 25}% activity`} />)}
          </div>
        </article>
      </section>
      <section className="insight-grid insight-grid-large">
        {broadInsights.map((insight) => {
          const Icon = insight.icon;
          return <article className="insight-card large" key={insight.title}><Icon /><h3>{insight.title}</h3><p>{insight.text}</p></article>;
        })}
      </section>
      <div className="badge-row">{(data?.badges || ['Hydration Focus', 'Skin Streak', 'Balanced Plate']).map((badge) => <span key={badge}><BadgeCheck size={16} /> {badge}</span>)}</div>
    </main>
  );
}

function makeChange(name, currentRows, currentKey, previousRows, previousKey, color) {
  const current = currentRows.reduce((sum, item) => sum + Number(item[currentKey] || 0), 0) / currentRows.length;
  const previous = previousRows.reduce((sum, item) => sum + Number(item[previousKey] || 0), 0) / previousRows.length;
  return { name, change: Math.round(((current - previous) / previous) * 100), color };
}

function makeLeaderboard(user, avatar, stats, filter) {
  const base = [
    { name: 'Maya Chen', avatar: makeAvatar('Maya Chen', 'Female'), score: 96, consistency: 94, usage: 91, category: 'Skin Analysis', badge: 'Glow Pro' },
    { name: user.fullName || 'You', avatar, score: stats.activityScore, consistency: Math.min(98, stats.streak * 8), usage: stats.goal, category: filter === 'All' ? 'Body Vitals' : filter, badge: 'You', current: true },
    { name: 'Arjun Rao', avatar: makeAvatar('Arjun Rao', 'Male'), score: 88, consistency: 86, usage: 90, category: 'Nutrition Analysis', badge: 'Macro Ace' },
    { name: 'Nina Park', avatar: makeAvatar('Nina Park', 'Female'), score: 84, consistency: 82, usage: 87, category: 'Body Vitals', badge: 'Vitals Climber' },
    { name: 'Sam Rivera', avatar: makeAvatar('Sam Rivera', 'Non-binary'), score: 79, consistency: 78, usage: 81, category: 'Skin Analysis', badge: 'Steady' },
  ];
  return base
    .filter((entry) => filter === 'All' || entry.category === filter || entry.current)
    .map((entry) => ({ ...entry, points: Math.round(entry.score * 6 + entry.consistency * 2 + entry.usage * 2) }))
    .sort((a, b) => b.points - a.points)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

function makeHeatmap(streak) {
  return Array.from({ length: 56 }, (_, index) => {
    const level = index > 55 - streak ? 4 : (index * 7 + streak) % 5;
    return { id: index, level, label: `Day ${index + 1}` };
  });
}

function LeaderboardFilters({ value, setValue }) {
  return (
    <div className="leaderboard-filters">
      {['All', 'Skin Analysis', 'Nutrition Analysis', 'Body Vitals'].map((item) => (
        <button className={cls(value === item && 'active')} key={item} onClick={() => setValue(item)}>{item}</button>
      ))}
    </div>
  );
}

function LeaderboardRow({ entry, current }) {
  return (
    <article className={cls('leaderboard-row', current && 'current')}>
      <strong>#{entry.rank}</strong>
      <img src={entry.avatar} alt="" />
      <div>
        <h4>{entry.name}</h4>
        <span>{entry.badge} · {entry.category}</span>
      </div>
      <div className="rank-progress"><i><em style={{ width: `${Math.min(100, entry.score)}%` }} /></i><b>{entry.points} pts</b></div>
    </article>
  );
}

function GlobalFooter({ navigate }) {
  return (
    <footer className="dashboard-footer glass-card">
      <section>
        <div className="footer-brand"><HeartPulse /> VitalisAI</div>
        <p>VitalisAI combines visual analysis, nutrition intelligence, and body metric tracking into one calm health interface. It helps users understand patterns, save progress over time, and turn scattered wellness data into practical next steps. The experience is designed for repeat use, clear interpretation, and lightweight support whenever users feel stuck or want a second opinion.</p>
      </section>
      <section>
        <h3>Quick links</h3>
        <button onClick={() => navigate('dashboard')}>Dashboard</button>
        <button onClick={() => navigate('skin')}>Skin Analysis</button>
        <button onClick={() => navigate('food')}>Nutrition Analysis</button>
        <button onClick={() => navigate('vitals')}>Body Vitals</button>
      </section>
      <section>
        <h3>Disclaimer</h3>
        <p>VitalisAI provides wellness insights, not medical diagnosis. For health concerns, consult a qualified clinician.</p>
        <a className="qr-box" href={`${API_URL}/redirect/discord`} target="_blank" rel="noreferrer">
          <img src={`${API_URL}/qr/discord`} alt="Discord QR code" />
          <span>Discord community</span>
        </a>
      </section>
      <section>
        <h3>Contact support</h3>
        <a href="mailto:support@vitalisai.com"><Mail size={15} /> support@vitalisai.com</a>
        <a href="https://vitalisai.com" target="_blank" rel="noreferrer"><Globe2 size={15} /> vitalisai.com</a>
        <a href="https://www.instagram.com/sk_mastery67/" target="_blank" rel="noreferrer"><Instagram size={15} /> Instagram</a>
        <a href="https://www.linkedin.com/in/shaik-73142a336/" target="_blank" rel="noreferrer"><Linkedin size={15} /> LinkedIn</a>
        <a href="https://discord.gg/5HnSbYQY8" target="_blank" rel="noreferrer"><MessageCircle size={15} /> Discord</a>
      </section>
    </footer>
  );
}

function VitaOrbMark({ small = false }) {
  return (
    <span className={cls('vita-orb-mark', small && 'small')}>
      <span className="vita-ring ring-one" />
      <span className="vita-ring ring-two" />
      <span className="vita-particle particle-one" />
      <span className="vita-particle particle-two" />
      <span className="vita-particle particle-three" />
        <span className="vita-orb-core">
          <span className="vita-ecg">
            <i />
          </span>
          <span className="vita-chat-core">
            <PhoneCall size={small ? 13 : 16} />
          </span>
        </span>
      </span>
    );
  }

function VitaSupportWidget({ domain, user }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi, I’m Vita AI. I can help with ${domain === 'skin' ? 'skin reports' : domain === 'food' ? 'food analysis' : 'body vitals'} and support questions.`,
    },
  ]);

  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content: `Hi, I'm Vita AI. I can help with ${domain === 'skin' ? 'skin reports' : domain === 'food' ? 'food analysis' : domain === 'vitals' ? 'body vitals' : domain === 'dashboard' ? 'dashboard activity questions' : 'support questions'}.`,
      },
    ]);
  }, [domain]);

  async function sendMessage(event) {
    event?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    const nextMessages = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    try {
      const data = await api('/support/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, domain, message: text, history: nextMessages }),
      });
      setMessages((current) => [...current, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setMessages((current) => [...current, { role: 'assistant', content: err.message }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cls('vita-widget', open && 'open')}>
      {open && (
        <section className="vita-panel glass-card">
          <header>
            <div className="vita-header-brand"><strong>Vita AI</strong><span>Your AI Health Assistant</span></div>
            <button onClick={() => setOpen(false)}><X size={18} /></button>
          </header>
          <div className="vita-messages">
            {messages.map((message, index) => (
              <article className={cls('vita-message', message.role)} key={`${message.role}-${index}`}>{message.content}</article>
            ))}
            {loading && (
              <article className="vita-message assistant vita-loading-message" aria-live="polite">
                <span className="vita-typing">
                  <i />
                  <i />
                  <i />
                </span>
                <span>Vita AI is thinking</span>
              </article>
            )}
          </div>
          <form onSubmit={sendMessage} className="vita-form">
            <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask Vita AI for help" />
            <button type="submit"><SendHorizonal size={16} /></button>
          </form>
        </section>
      )}
      <button className="vita-trigger" onClick={() => setOpen((current) => !current)} aria-label="Open Vita AI customer support">
        <VitaOrbMark />
      </button>
    </div>
  );
}

function drawPdfLineChart(doc, rows, x, y, width, height) {
  const values = rows.flatMap((row) => [row.skin, row.food, row.vitals, row.previousSkin, row.previousFood, row.previousVitals]);
  const min = Math.min(...values) - 4;
  const max = Math.max(...values) + 4;
  doc.setDrawColor(220, 226, 232);
  doc.roundedRect(x, y, width, height, 8, 8);
  const drawLine = (key, color) => {
    doc.setDrawColor(...color);
    let previous = null;
    rows.forEach((row, index) => {
      const px = x + 24 + (index * (width - 48)) / (rows.length - 1);
      const py = y + height - 20 - ((row[key] - min) / (max - min)) * (height - 42);
      if (previous) doc.line(previous.x, previous.y, px, py);
      previous = { x: px, y: py };
    });
  };
  drawLine('skin', [20, 184, 166]);
  drawLine('food', [132, 204, 22]);
  drawLine('vitals', [236, 72, 153]);
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text('Skin   Nutrition   Body Vitals', x + 18, y + height - 6);
}

function StatCard({ icon: Icon, label, value, suffix = '', trend }) {
  return (
    <article className="stat-card glass-card">
      <Icon />
      <span>{label}</span>
      <strong>{value}{suffix}</strong>
      <b>{trend}</b>
    </article>
  );
}

function CircularStat({ value }) {
  const data = [{ name: 'done', value }, { name: 'left', value: 100 - value }];
  return (
    <article className="stat-card glass-card circular">
      <ResponsiveContainer width="100%" height={108}>
        <PieChart>
          <Pie data={data} innerRadius={34} outerRadius={50} dataKey="value" startAngle={90} endAngle={-270}>
            <Cell fill="#7cfff3" />
            <Cell fill="rgba(255,255,255,.1)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <span>Goal completion</span>
      <strong>{value}%</strong>
    </article>
  );
}

function AnalysisPage({ type, user }) {
  if (type === 'skin') return <SkinAnalysisPage user={user} />;
  if (type === 'food') return <FoodAnalysisPage user={user} />;
  if (type === 'vitals') return <VitalsAnalysisPage user={user} />;

  const feature = features.find((item) => item.route === type);
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [foodText, setFoodText] = useState('');
  const [goal, setGoal] = useState('general health');
  const [vitals, setVitals] = useState({ height: 168, weight: 64, age: user.age || 26, gender: user.gender || 'Female' });
  const Icon = feature.icon;

  async function runAnalysis(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (type === 'vitals') {
        const data = await api('/analysis/vitals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, ...vitals }),
        });
        setResult(data);
      } else {
        const form = new FormData();
        form.append('userId', user.id);
        if (file) form.append('image', file);
        if (type === 'food') {
          form.append('description', foodText);
          form.append('goal', goal);
        }
        const data = await api(`/analysis/${type}`, { method: 'POST', body: form });
        setResult(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const metricData = useMemo(() => {
    if (!result) return [];
    if (result.metrics && Array.isArray(result.metrics)) return result.metrics;
    if (result.metrics) return Object.entries(result.metrics).map(([name, value]) => ({ name, value: Number(value) || 0 }));
    if (result.nutrition) return Object.entries(result.nutrition).map(([name, value]) => ({ name, value }));
    return [];
  }, [result]);

  return (
    <main className="analysis-page">
      <section className="analysis-hero glass-card" style={{ '--tone': feature.color }}>
        <div className="feature-icon"><Icon /></div>
        <div>
          <span>{feature.eyebrow}</span>
          <h1>{feature.title}</h1>
          <p>{feature.description}</p>
        </div>
      </section>
      <section className="analysis-grid">
        <form className="analysis-form glass-card" onSubmit={runAnalysis}>
          {type !== 'vitals' ? (
            <>
              <label className="upload-zone">
                <Upload size={34} />
                <strong>{file ? file.name : type === 'skin' ? 'Upload a face image' : 'Upload a food image'}</strong>
                <span>PNG or JPG works best</span>
                <input type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0])} required={type === 'skin'} />
              </label>
              {type === 'food' && (
                <>
                  <label>Food notes<input value={foodText} onChange={(event) => setFoodText(event.target.value)} placeholder="Example: salad bowl, rice, grilled paneer" /></label>
                  <label>Goal<select value={goal} onChange={(event) => setGoal(event.target.value)}><option>general health</option><option>fitness</option><option>weight management</option></select></label>
                </>
              )}
            </>
          ) : (
            <div className="vitals-inputs">
              {['height', 'weight', 'age'].map((key) => (
                <label key={key}>{key}<input type="number" value={vitals[key]} onChange={(event) => setVitals((current) => ({ ...current, [key]: Number(event.target.value) }))} /></label>
              ))}
              <label>gender<select value={vitals.gender} onChange={(event) => setVitals((current) => ({ ...current, gender: event.target.value }))}><option>Female</option><option>Male</option><option>Non-binary</option></select></label>
            </div>
          )}
          {error && <div className="error-text">{error}</div>}
          <button className="primary-button" disabled={loading}>{loading ? 'Analyzing...' : 'Generate AI report'} <Sparkles size={18} /></button>
        </form>
        <article className="result-panel glass-card">
          {!result ? (
            <div className="empty-result">
              <Moon size={46} />
              <h2>Your report will appear here.</h2>
              <p>Vitalis will score the input, visualize patterns, and recommend practical next steps.</p>
            </div>
          ) : (
            <Report result={result} metricData={metricData} type={type} />
          )}
        </article>
      </section>
    </main>
  );
}

function Report({ result, metricData, type }) {
  return (
    <div className="report">
      <div className="score-orb">
        <span>{result.score}</span>
        <small>AI score</small>
      </div>
      <h2>{result.title || result.identifiedFood || 'Body health report'}</h2>
      <div className="mini-chart">
        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={metricData.slice(0, 8)}>
            <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} />
            <XAxis dataKey="name" stroke="#9fb5c8" tick={{ fontSize: 11 }} />
            <YAxis hide />
            <Tooltip contentStyle={{ background: '#08131f', border: '1px solid rgba(255,255,255,.14)', borderRadius: 14 }} />
            <Bar dataKey="value" fill="#7cfff3" radius={[10, 10, 4, 4]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {type === 'vitals' && result.weeklyProgress && (
        <ResponsiveContainer width="100%" height={170}>
          <LineChart data={result.weeklyProgress}>
            <XAxis dataKey="day" stroke="#9fb5c8" />
            <YAxis hide />
            <Line dataKey="score" stroke="#ff9ecf" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
      <div className="report-list">
        {(result.observations || result.recommendations || []).map((item) => <p key={item}><Sparkles size={15} /> {item}</p>)}
        {result.flags && <p><ShieldCheck size={15} /> Flags: {[...result.flags.harmfulIngredients, ...result.flags.possibleAllergens].join(', ')}</p>}
        {result.ingredients && <p><Leaf size={15} /> Ingredients: {result.ingredients.join(', ')}</p>}
      </div>
    </div>
  );
}

function normalizeSkinKey(key = '') {
  return key.toLowerCase().replace(/[\s-]+/g, '_');
}

function getSkinTone(status) {
  if (status === 'Good') return '#5eead4';
  if (status === 'Average') return '#fbbf24';
  return '#fb7185';
}

function buildSkinMetrics(result) {
  if (!result?.metrics) return [];
  return result.metrics.map((item) => {
    const key = normalizeSkinKey(item.key || item.name);
    const percentage = Number(item.percentage ?? item.value ?? 0);
    return {
      ...item,
      key,
      label: item.label || item.name,
      percentage,
      value: percentage,
      status: item.status || 'Average',
      positive: item.positive ?? skinPositiveLabels.includes(key),
    };
  });
}

function skinSeverityValue(item) {
  if (!item) return 0;
  return item.positive ? Math.max(0, 100 - item.percentage) : item.percentage;
}

function skinSeverityLabel(value) {
  if (value >= 68) return 'High';
  if (value >= 42) return 'Moderate';
  if (value >= 24) return 'Mild';
  return 'Clear';
}

function skinSeverityClass(value) {
  if (value >= 68) return 'high';
  if (value >= 42) return 'moderate';
  if (value >= 24) return 'mild';
  return 'clear';
}

function getMetric(metrics, key) {
  return metrics.find((item) => item.key === key);
}

function buildSkinAnnotations(metrics) {
  const clearSkin = getMetric(metrics, 'clear_skin');
  const oilySkin = getMetric(metrics, 'oily_skin');
  const wrinkle = getMetric(metrics, 'wrinkle');
  const darkCircles = getMetric(metrics, 'dark_circles');
  const sharpJawline = getMetric(metrics, 'sharp_jawline');
  const clearSeverity = skinSeverityValue(clearSkin);
  const oilSeverity = skinSeverityValue(oilySkin);
  const wrinkleSeverity = skinSeverityValue(wrinkle);
  const darkSeverity = skinSeverityValue(darkCircles);
  const jawSeverity = skinSeverityValue(sharpJawline);
  const candidates = [
    {
      key: 'pigmentation',
      label: 'Pigmentation',
      region: 'cheek-left',
      x: 19,
      y: 44,
      lineX: 37,
      lineY: 49,
      severity: Math.max(clearSeverity, darkSeverity * 0.8),
      confidence: Math.max(clearSkin?.percentage || 0, darkCircles?.percentage || 0),
    },
    {
      key: 'dark-spots',
      label: 'Dark spots',
      region: 'cheek-right',
      x: 71,
      y: 39,
      lineX: 61,
      lineY: 48,
      severity: Math.max(darkSeverity, clearSeverity * 0.75),
      confidence: Math.max(darkCircles?.percentage || 0, clearSkin ? 100 - clearSkin.percentage : 0),
    },
    {
      key: 'pores',
      label: 'Visible pores',
      region: 'nose',
      x: 70,
      y: 58,
      lineX: 53,
      lineY: 55,
      severity: oilSeverity,
      confidence: oilySkin?.percentage || 0,
    },
    {
      key: 'acne',
      label: 'Acne-prone zone',
      region: 'chin',
      x: 24,
      y: 78,
      lineX: 49,
      lineY: 76,
      severity: Math.max(oilSeverity * 0.9, clearSeverity * 0.65),
      confidence: Math.max(oilySkin?.percentage || 0, clearSkin ? 100 - clearSkin.percentage : 0),
    },
    {
      key: 'wrinkles',
      label: 'Fine lines',
      region: 'forehead',
      x: 68,
      y: 18,
      lineX: 51,
      lineY: 27,
      severity: wrinkleSeverity,
      confidence: wrinkle?.percentage || 0,
    },
    {
      key: 'under-eye',
      label: 'Under-eye tone',
      region: 'under-eye-right',
      x: 16,
      y: 25,
      lineX: 39,
      lineY: 39,
      severity: darkSeverity,
      confidence: darkCircles?.percentage || 0,
    },
    {
      key: 'uneven-tone',
      label: 'Uneven skin tone',
      region: 'cheek-left',
      x: 61,
      y: 72,
      lineX: 39,
      lineY: 61,
      severity: Math.max(clearSeverity, jawSeverity * 0.45),
      confidence: clearSkin ? 100 - clearSkin.percentage : 0,
    },
  ];
  return candidates
    .filter((item) => item.severity >= 24 || item.confidence >= 42)
    .slice(0, 6)
    .map((item) => ({
      ...item,
      severityLabel: skinSeverityLabel(item.severity),
      severityClass: skinSeverityClass(item.severity),
      confidence: Math.max(18, Math.min(98, Math.round(item.confidence))),
    }));
}

function buildSkinRegions(metrics) {
  const clearSeverity = skinSeverityValue(getMetric(metrics, 'clear_skin'));
  const oilSeverity = skinSeverityValue(getMetric(metrics, 'oily_skin'));
  const wrinkleSeverity = skinSeverityValue(getMetric(metrics, 'wrinkle'));
  const darkSeverity = skinSeverityValue(getMetric(metrics, 'dark_circles'));
  const chinSeverity = skinSeverityValue(getMetric(metrics, 'double_chin'));
  return [
    { key: 'forehead', label: 'Forehead', className: 'forehead', severity: Math.max(wrinkleSeverity, clearSeverity * 0.55) },
    { key: 'cheek-left', label: 'Left cheek', className: 'cheek-left', severity: Math.max(clearSeverity, darkSeverity * 0.7) },
    { key: 'cheek-right', label: 'Right cheek', className: 'cheek-right', severity: Math.max(clearSeverity, darkSeverity * 0.72) },
    { key: 'nose', label: 'Nose', className: 'nose', severity: oilSeverity },
    { key: 'chin', label: 'Chin', className: 'chin', severity: Math.max(chinSeverity, oilSeverity * 0.7) },
    { key: 'under-eye-left', label: 'Under eye', className: 'under-eye-left', severity: darkSeverity },
    { key: 'under-eye-right', label: 'Under eye', className: 'under-eye-right', severity: darkSeverity },
  ].map((item) => ({
    ...item,
    severityClass: skinSeverityClass(item.severity),
    opacity: Math.max(0.16, Math.min(0.58, item.severity / 100)),
  }));
}

function SkinAnalysisPage({ user }) {
  const [mode, setMode] = useState('upload');
  const [source, setSource] = useState('upload');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showInsights, setShowInsights] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [stream, setStream] = useState(null);
  const [faceDetector, setFaceDetector] = useState(null);
  const [faceStatus, setFaceStatus] = useState('Initializing camera...');
  const [isAligned, setIsAligned] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const alignedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    async function initDetector() {
      try {
        const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm');
        const detector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
        });
        if (mounted) setFaceDetector(detector);
      } catch {
        if (mounted) setFaceStatus('Camera alignment helper is unavailable. Upload still works.');
      }
    }
    initDetector();
    return () => { mounted = false; };
  }, []);

  useEffect(() => () => stopCamera(), []);

  useEffect(() => {
    if (!stream || !videoRef.current) return;
    videoRef.current.srcObject = stream;
    videoRef.current.play().catch(() => setFaceStatus('Tap allow camera, then try again.'));
  }, [stream]);

  useEffect(() => {
    let frameId;
    let lastTime = -1;
    function detect() {
      const video = videoRef.current;
      if (!video || !faceDetector || mode !== 'camera') return;
      if (video.readyState >= 2 && video.currentTime !== lastTime) {
        lastTime = video.currentTime;
        try {
          const detections = faceDetector.detectForVideo(video, performance.now());
          processDetections(detections);
        } catch {
          setFaceStatus('Hold steady while the camera warms up.');
        }
      }
      frameId = requestAnimationFrame(detect);
    }
    if (mode === 'camera' && faceDetector) detect();
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [faceDetector, mode]);

  useEffect(() => {
    if (countdown === null) return undefined;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((current) => current - 1), 1000);
      return () => clearTimeout(timer);
    }
    captureImage();
    return undefined;
  }, [countdown]);

  function updateAlignment(nextAligned) {
    if (alignedRef.current === nextAligned) return;
    alignedRef.current = nextAligned;
    setIsAligned(nextAligned);
    setCountdown(nextAligned ? 5 : null);
  }

  function processDetections(detectionResult) {
    const video = videoRef.current;
    if (!video || !detectionResult?.detections?.length) {
      setFaceStatus('Please align your face inside the oval');
      updateAlignment(false);
      return;
    }
    const bbox = detectionResult.detections[0].boundingBox;
    const width = video.videoWidth || 1;
    const height = video.videoHeight || 1;
    const normalizedWidth = bbox.width / width;
    const centerX = (bbox.originX + bbox.width / 2) / width;
    const centerY = (bbox.originY + bbox.height / 2) / height;
    const centered = centerX > 0.35 && centerX < 0.65 && centerY > 0.34 && centerY < 0.68;
    if (!centered) {
      setFaceStatus('Please align your face inside the oval');
      updateAlignment(false);
    } else if (normalizedWidth <= 0.2) {
      setFaceStatus('Move closer');
      updateAlignment(false);
    } else if (normalizedWidth >= 0.5) {
      setFaceStatus('Move further away');
      updateAlignment(false);
    } else {
      setFaceStatus('Perfect. Hold still.');
      updateAlignment(true);
    }
  }

  async function startCamera() {
    setMode('camera');
    setSource('camera');
    setError('');
    setFaceStatus('Initializing camera...');
    setCountdown(null);
    updateAlignment(false);
    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setStream(nextStream);
    } catch {
      setError('Could not access camera. Please allow permission or upload a photo.');
      setMode('upload');
    }
  }

  function stopCamera() {
    setStream((current) => {
      current?.getTracks?.().forEach((track) => track.stop());
      return null;
    });
  }

  function captureImage() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const capturedFile = new File([blob], 'skin-capture.jpg', { type: 'image/jpeg' });
      setFile(capturedFile);
      setPreview(URL.createObjectURL(capturedFile));
      stopCamera();
      setMode('preview');
    }, 'image/jpeg', 0.95);
  }

  function handleFile(nextFile) {
    if (!nextFile) return;
    setSource('upload');
    setFile(nextFile);
    setPreview(URL.createObjectURL(nextFile));
    setResult(null);
    setSaveStatus('');
    setError('');
    setMode('preview');
  }

  async function analyzeSkin() {
    if (!file) {
      setError('Please upload or capture a face image first.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('userId', user.id);
      form.append('image', file);
      const data = await api('/analysis/skin', { method: 'POST', body: form });
      setResult(data);
      setMode('result');
      setShowInsights(false);
      setSaveStatus('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function resetSkinFlow() {
    stopCamera();
    setFile(null);
    setPreview('');
    setResult(null);
    setError('');
    setShowInsights(false);
    setSaveStatus('');
    setMode('upload');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function saveSkinReport() {
    if (!result) return;
    setSaveStatus('Saving...');
    try {
      await saveAnalysisReport(user, 'skin', { ...result, imagePreview: preview });
      setSaveStatus('Saved to dashboard trends');
    } catch (err) {
      setSaveStatus(err.message);
    }
  }

  const metrics = buildSkinMetrics(result);
  const score = result?.score || 0;
  const scoreLabel = score >= 85 ? 'Excellent Skin Health' : score >= 70 ? 'Good Condition' : score >= 50 ? 'Moderate Condition' : 'Needs Improvement';

  if (mode === 'camera') {
    return (
      <main className="skin-camera-page">
        <section className="skin-camera-shell">
          <div className="skin-camera-head">
            <button className="skin-icon-button" onClick={resetSkinFlow} type="button"><CameraOff size={18} /></button>
            <h1>Face Alignment</h1>
            <span />
          </div>
          <div className="skin-video-frame">
            <video ref={videoRef} autoPlay playsInline muted />
            <div className="skin-camera-overlay">
              <div className={cls('skin-face-oval', isAligned && 'aligned')} />
            </div>
            {countdown !== null && <div className="skin-countdown">{countdown}</div>}
          </div>
          <div className={cls('skin-face-status', isAligned && 'aligned')}>{faceStatus}</div>
          <canvas ref={canvasRef} hidden />
        </section>
      </main>
    );
  }

  return (
    <main className="reference-page skin-reference">
      <section className="reference-title skin-title">
        <div className="title-icon skin-icon"><ScanFace /></div>
        <div>
          <h1>Skin Analysis</h1>
          <p>CNN-powered face scan, camera alignment, score circles, and personalized skin insights</p>
        </div>
      </section>

      {mode === 'upload' && (
        <section className="skin-start-grid">
          <article
            className="reference-card skin-upload-card"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              handleFile(event.dataTransfer.files?.[0]);
            }}
          >
            {error && <div className="error-text">{error}</div>}
            <div className="skin-upload-icon"><Upload size={34} /></div>
            <h2>Upload Your Photo</h2>
            <p>Use a clear, front-facing JPG or PNG in even light.</p>
            <button className="skin-upload-zone" type="button" onClick={() => fileInputRef.current?.click()}>
              <Upload size={28} />
              <span>Click to browse or drag and drop</span>
              <small>Supports JPG and PNG</small>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={(event) => handleFile(event.target.files?.[0])} />
            <div className="skin-divider"><span>OR</span></div>
            <button className="primary-button skin-camera-button" onClick={startCamera} type="button"><Camera size={18} /> Use Camera</button>
          </article>
          <article className="reference-card skin-guidance-card">
            <h2>Capture quality</h2>
            <div className="skin-check-list">
              <p><CheckCircle2 size={17} /> Face centered and visible</p>
              <p><CheckCircle2 size={17} /> No heavy filters or shadows</p>
              <p><CheckCircle2 size={17} /> Avoid makeup when possible</p>
              <p><AlertTriangle size={17} /> Wellness guidance, not diagnosis</p>
            </div>
          </article>
        </section>
      )}

      {mode === 'preview' && (
        <section className="skin-preview-layout">
          <article className="reference-card skin-preview-card">
            {error && <div className="error-text">{error}</div>}
            <h2>Confirm Photo</h2>
            <p>Review your image before sending it to the skin CNN endpoint.</p>
            <div className="skin-preview-image"><img src={preview} alt="Selected skin analysis" /></div>
            <div className="skin-action-row">
              <button className="secondary-button" onClick={source === 'camera' ? startCamera : resetSkinFlow} type="button"><RefreshCw size={17} /> Retake</button>
              <button className="primary-button" onClick={analyzeSkin} type="button" disabled={loading}>{loading ? 'Analyzing...' : 'Analyze'} <Sparkles size={17} /></button>
            </div>
          </article>
        </section>
      )}

      {mode === 'result' && result && (
        <section className="skin-results-layout">
          <article className="reference-card skin-score-card">
            <div>
              <span className="skin-model-pill">{result.modelSource === 'cnn' ? 'CNN model' : 'Fallback mode'}</span>
              <h2>Overall Skin Score: {score}%</h2>
              <p>{scoreLabel}</p>
            </div>
            <div className="skin-score-grid">
              {metrics.map((item) => <SkinMetricCircle key={item.key} item={item} />)}
            </div>
            <p className="skin-disclaimer">Skin score may vary depending on lighting, camera quality, angle, and makeup.</p>
            <div className="skin-action-row">
              <button className="secondary-button" onClick={resetSkinFlow} type="button"><RefreshCw size={17} /> Next</button>
              <button className="primary-button" onClick={() => setShowInsights((current) => !current)} type="button">
                {showInsights ? 'Hide Insights' : 'View Personalized Skin Insights'}
              </button>
            </div>
          </article>
          <article className="reference-card skin-result-image-card">
            <SkinAnnotatedImage preview={preview} metrics={metrics} />
            <div className="skin-legend">
              <span><i style={{ background: '#fb7185' }} /> Needs attention</span>
              <span><i style={{ background: '#fbbf24' }} /> Average</span>
              <span><i style={{ background: '#5eead4' }} /> Good</span>
            </div>
            <RecommendationBox title="AI Recommendations" recommendations={result.recommendations} accent="skin" columns />
            <div className="report-actions">
              <button className="primary-button compact-save" onClick={saveSkinReport} type="button"><Save size={17} /> Save report</button>
              {saveStatus && <span>{saveStatus}</span>}
            </div>
          </article>
          {showInsights && <SkinInsights metrics={metrics} observations={result.observations} />}
        </section>
      )}
    </main>
  );
}

function SkinAnnotatedImage({ preview, metrics }) {
  const annotations = buildSkinAnnotations(metrics);
  const regions = buildSkinRegions(metrics);
  return (
    <div className="skin-annotated-frame">
      <img src={preview} alt="Skin analysis result with smart annotations" />
      <div className="skin-scan-line" />
      <div className="skin-mesh-overlay" aria-hidden="true">
        {regions.map((region) => (
          <span
            key={region.key}
            className={cls('skin-region', region.className, region.severityClass)}
            style={{ '--region-opacity': region.opacity }}
          >
            <b>{region.label}</b>
          </span>
        ))}
      </div>
      <svg className="skin-pointer-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {annotations.map((item) => (
          <line
            key={item.key}
            x1={item.x}
            y1={item.y}
            x2={item.lineX}
            y2={item.lineY}
            className={cls('skin-pointer-line', item.severityClass)}
          />
        ))}
      </svg>
      <div className="skin-hotspot-layer">
        {annotations.map((item) => (
          <span
            key={item.key}
            className={cls('skin-hotspot', item.severityClass)}
            style={{ left: `${item.lineX}%`, top: `${item.lineY}%` }}
          />
        ))}
      </div>
      <div className="skin-annotation-layer">
        {annotations.map((item) => (
          <article
            className={cls('skin-annotation', item.severityClass)}
            key={item.key}
            style={{ left: `${item.x}%`, top: `${item.y}%` }}
          >
            <strong>{item.label}</strong>
            <span>{item.confidence}% confidence</span>
            <em>{item.severityLabel}</em>
          </article>
        ))}
      </div>
      <div className="skin-analysis-badge">
        <ScanFace size={15} />
        <span>Live region mesh</span>
      </div>
    </div>
  );
}

function SkinMetricCircle({ item }) {
  const tone = getSkinTone(item.status);
  return (
    <div className="skin-circle-item">
      <div className="skin-circle" style={{ '--tone': tone, '--value': `${item.percentage}%` }}>
        <strong>{item.percentage}%</strong>
        <span>{item.status}</span>
      </div>
      <p>{item.label}</p>
    </div>
  );
}

function SkinInsights({ metrics, observations }) {
  return (
    <article className="reference-card skin-insights-card">
      <div className="skin-insights-head">
        <h2>Personalized Skin Insights & Wellness Report</h2>
        <p>This AI-generated report provides general wellness guidance and is not a medical diagnosis.</p>
      </div>
      {observations?.length > 0 && (
        <div className="skin-observation-strip">
          {observations.map((item) => <span key={item}>{item}</span>)}
        </div>
      )}
      <div className="skin-insights-grid">
        {metrics.map((item) => {
          const insight = skinInsightData[item.key];
          if (!insight) return null;
          return (
            <article className="skin-insight-card" key={item.key}>
              <div>
                <h3>{item.label}</h3>
                <span style={{ background: getSkinTone(item.status) }}>{item.percentage}% - {item.status}</span>
              </div>
              <p><b>Observation:</b> {insight.observation}</p>
              {insight.factors?.length > 0 && <p><b>Possible Factors:</b> {insight.factors.join(', ')}</p>}
              {insight.habits?.length > 0 && <p><b>Suggested Habits:</b> {insight.habits.join(', ')}</p>}
              {insight.diet?.length > 0 && <p><b>Diet Suggestions:</b> {insight.diet.join(', ')}</p>}
              {insight.nutrient && <p><b>Nutrient Notes:</b> {insight.nutrient}</p>}
            </article>
          );
        })}
      </div>
      <div className="skin-wellness-row">
        {['Drink 2-3L water daily', 'Sleep 7-8 hours', 'Eat fruits and vegetables', 'Avoid excessive oily food', 'Maintain a gentle routine'].map((item) => <span key={item}>{item}</span>)}
      </div>
    </article>
  );
}

function FoodAnalysisPage({ user }) {
  const sampleResult = {
    score: 85,
    identifiedFood: 'Grilled Salmon Bowl',
    nutrition: { calories: 485, protein: 38, carbohydrates: 32, fats: 22, sugar: 4.2, sodium: 285 },
    flags: { harmfulIngredients: ['No preservatives', 'No added sugar', 'Gluten-free'], possibleAllergens: ['Contains fish'] },
    recommendations: {
      'Nutrition Balance': [
        'Excellent post-workout meal. High protein plus healthy fats support muscle recovery.',
        'Consider adding leafy greens next time for extra micronutrients and fiber.',
      ],
      'Safety & Allergens': [
        'Fish is a likely allergen; keep preparation separate if serving others.',
      ],
      'Goal-Based Tips': [
        'For weight management, this portion is ideal 2-3 times per week.',
      ],
    },
  };
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [goal, setGoal] = useState('weight management');
  const [description, setDescription] = useState('grilled salmon bowl with rice, vegetables, corn, and herbs');
  const [result, setResult] = useState(sampleResult);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!file) {
      setPreview('');
      return undefined;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  async function analyzeFood(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('userId', user.id);
      form.append('goal', goal);
      form.append('description', description);
      if (file) form.append('image', file);
      const data = await api('/analysis/food', { method: 'POST', body: form });
      setResult(data);
      setSaveStatus('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveFoodReport() {
    setSaveStatus('Saving...');
    try {
      await saveAnalysisReport(user, 'food', { ...result, imagePreview: preview });
      setSaveStatus('Saved to dashboard trends');
    } catch (err) {
      setSaveStatus(err.message);
    }
  }

  const macroData = [
    { name: 'Protein', value: result.nutrition.protein, color: '#6366f1' },
    { name: 'Carbs', value: result.nutrition.carbohydrates, color: '#f59e0b' },
    { name: 'Fat', value: result.nutrition.fats, color: '#ec4899' },
  ];
  const macroTotal = macroData.reduce((sum, item) => sum + item.value, 0);

  return (
    <main className="reference-page food-reference">
      <section className="reference-title">
        <div className="title-icon food-icon"><Utensils /></div>
        <div>
          <h1>Food Analysis</h1>
          <p>Instant nutritional breakdown & health scoring</p>
        </div>
      </section>
      <section className="food-layout">
        <form className="reference-card food-upload-card" onSubmit={analyzeFood}>
          <h2>Upload meal photo or choose sample</h2>
          <label className="meal-photo">
            {preview ? <img src={preview} alt="Selected meal" /> : <div className="sample-meal-art" />}
            <span>{file?.name || 'grilled_bowl.webp'}</span>
            <input type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] || null)} />
          </label>
          <label>Meal notes<input value={description} onChange={(event) => setDescription(event.target.value)} /></label>
          <label>Goal<select value={goal} onChange={(event) => setGoal(event.target.value)}><option>general health</option><option>fitness</option><option>weight management</option></select></label>
          {error && <div className="error-text">{error}</div>}
          <button className="orange-button" disabled={loading}><RefreshCw size={17} /> {loading ? 'Analyzing...' : 'Analyze another'}</button>
        </form>
        <article className="reference-card food-report-card">
          <div className="food-report-head">
            <div>
              <h2>{result.identifiedFood}</h2>
              <div className="pill-row">
                <span className="good-pill">High protein</span>
                <span className="warn-pill">Omega-3 rich</span>
              </div>
            </div>
            <div className="health-score"><small>Health score</small><strong>{result.score}</strong></div>
          </div>
          <div className="nutrition-grid">
            <MetricTile label="Calories" value={result.nutrition.calories} helper="-120 from avg" />
            <MetricTile label="Protein" value={`${result.nutrition.protein}g`} helper="76% DV" />
            <MetricTile label="Carbs" value={`${result.nutrition.carbohydrates}g`} helper={`Net ${Math.max(0, result.nutrition.carbohydrates - 4)}g`} tone="warn" />
            <MetricTile label="Fat" value={`${result.nutrition.fats}g`} helper="Healthy fats" />
          </div>
          <div className="food-middle">
            <div>
              <h3>Macro distribution</h3>
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Tooltip
                    content={<MacroTooltip total={macroTotal} />}
                  />
                  <Pie data={macroData} innerRadius={54} outerRadius={82} paddingAngle={1} dataKey="value">
                    {macroData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="safety-bars">
              <ProgressBar label={`Sugar ${result.nutrition.sugar}g`} status="Low" value={18} color="#34d399" />
              <ProgressBar label={`Sodium ${result.nutrition.sodium}mg`} status="Moderate" value={42} color="#fbbf24" />
              <h3>Ingredient & safety scan</h3>
              <div className="safety-tags">
                {result.flags.harmfulIngredients.map((flag) => <span className="safe-tag" key={flag}>OK {flag}</span>)}
                {result.flags.possibleAllergens.map((flag) => <span className="risk-tag" key={flag}>Alert {flag}</span>)}
              </div>
            </div>
          </div>
          <RecommendationBox title="AI Recommendations" recommendations={result.recommendations} accent="food" />
          <div className="report-actions">
            <button className="orange-button" onClick={saveFoodReport} type="button"><Save size={17} /> Save report</button>
            {saveStatus && <span>{saveStatus}</span>}
          </div>
        </article>
      </section>
    </main>
  );
}

function VitalsAnalysisPage({ user }) {
  const [vitals, setVitals] = useState({ height: 175, weight: 78, age: user.age || 32, gender: 'Male' });
  const [activity, setActivity] = useState('Lightly active (1-3 days/week)');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [error, setError] = useState('');

  async function calculate(event) {
    event?.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await api('/analysis/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, ...vitals }),
      });
      setResult(data);
      setSaveStatus('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    calculate();
  }, []);

  const metrics = result?.metrics || {
    BMI: 25.5,
    BMR: 1791,
    'Body Fat %': 21.8,
    'Visceral Fat %': 17.9,
    'Estimated Body Age': 34,
    'Trunk Subcutaneous Fat %': 14.8,
    'Skeletal Muscle %': 52,
    'Overall Ideal Weight': 71.2,
  };
  const weekly = result?.weeklyProgress || [
    { day: '5w ago', weight: 82.3, bodyFat: 24.8 },
    { day: '4w ago', weight: 81.0, bodyFat: 24.1 },
    { day: '3w ago', weight: 80.2, bodyFat: 23.4 },
    { day: '2w ago', weight: 79.5, bodyFat: 22.7 },
    { day: 'Last week', weight: 78.6, bodyFat: 22.2 },
    { day: 'Now', weight: vitals.weight, bodyFat: metrics['Body Fat %'] },
  ];
  const normalizedWeekly = weekly.map((item, index) => ({
    day: item.day,
    weight: item.weight ?? vitals.weight - (weekly.length - index - 1) * 0.8,
    bodyFat: item.bodyFat ?? Math.max(12, metrics['Body Fat %'] - (weekly.length - index - 1) * 0.4),
  }));

  async function saveVitalsReport() {
    if (!result) return;
    setSaveStatus('Saving...');
    try {
      await saveAnalysisReport(user, 'vitals', result);
      setSaveStatus('Saved to dashboard trends');
    } catch (err) {
      setSaveStatus(err.message);
    }
  }

  return (
    <main className="reference-page vitals-reference">
      <section className="reference-title vitals-title">
        <div className="title-icon vitals-icon"><HeartPulse /></div>
        <div>
          <h1>Body Vitals</h1>
          <p>Comprehensive body composition & health metrics</p>
        </div>
        <button className="reset-button" onClick={() => setVitals({ height: 175, weight: 78, age: 32, gender: 'Male' })}><RefreshCw size={15} /> Reset to defaults</button>
      </section>
      <section className="vitals-layout">
        <form className="reference-card vitals-form" onSubmit={calculate}>
          <h2>Your metrics <span>Update anytime</span></h2>
          <label>Age<input type="range" min="12" max="90" value={vitals.age} onChange={(event) => setVitals((current) => ({ ...current, age: Number(event.target.value) }))} /></label>
          <div className="range-readout">{vitals.age}</div>
          <label>Gender</label>
          <div className="gender-toggle">
            {['Male', 'Female'].map((gender) => <button type="button" className={cls(vitals.gender === gender && 'active')} key={gender} onClick={() => setVitals((current) => ({ ...current, gender }))}>{gender}</button>)}
          </div>
          <div className="split-inputs">
            <label>Height (cm)<input type="number" value={vitals.height} onChange={(event) => setVitals((current) => ({ ...current, height: Number(event.target.value) }))} /></label>
            <label>Weight (kg)<input type="number" value={vitals.weight} onChange={(event) => setVitals((current) => ({ ...current, weight: Number(event.target.value) }))} /></label>
          </div>
          <label>Activity level<select value={activity} onChange={(event) => setActivity(event.target.value)}><option>Lightly active (1-3 days/week)</option><option>Moderately active (3-5 days/week)</option><option>Very active (6-7 days/week)</option></select></label>
          {error && <div className="error-text">{error}</div>}
          <button className="pink-button" disabled={loading}>{loading ? 'Calculating...' : 'Calculate full report'}</button>
        </form>
        <div className="vitals-content">
          <div className="vitals-metric-grid">
            <VitalsMetric title="BMI" value={metrics.BMI} label="Overweight" ideal="Ideal: 18.5-24.9" tone="warn" />
            <VitalsMetric title="Body Fat %" value={metrics['Body Fat %']} label="Good" ideal="Ideal: 15-20%" bar={55} />
            <VitalsMetric title="Visceral Fat" value={metrics['Visceral Fat %']} label="Moderate" ideal="Ideal: <10" tone="warn" />
            <VitalsMetric title="BMR (kcal/day)" value={metrics.BMR?.toLocaleString?.() || metrics.BMR} ideal="Basal Metabolic Rate" />
          </div>
          <div className="vitals-panels">
            <article className="reference-card composition-card">
              <h3>Advanced composition</h3>
              <MetricLine icon="BA" label="Estimated Body Age" value={`${metrics['Estimated Body Age']} yrs`} />
              <MetricLine icon="SM" label="Skeletal Muscle" value={`${metrics['Skeletal Muscle %']}%`} />
              <MetricLine icon="TF" label="Trunk Subcutaneous Fat" value={`${metrics['Trunk Subcutaneous Fat %']}%`} />
              <MetricLine label="Ideal Weight Range" value={`${Math.max(40, metrics['Overall Ideal Weight'] - 3.8).toFixed(1)}-${(metrics['Overall Ideal Weight'] + 3.8).toFixed(1)} kg`} />
            </article>
            <article className="reference-card progress-card">
              <div className="progress-head"><div><h3>Weekly progress</h3><p>Last 5 weeks trend</p></div><span>Improving</span></div>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={normalizedWeekly}>
                  <CartesianGrid stroke="rgba(255,255,255,.08)" />
                  <XAxis dataKey="day" stroke="#777b88" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" stroke="#6366f1" />
                  <YAxis yAxisId="right" orientation="right" stroke="#ec4899" />
                  <Tooltip contentStyle={{ background: '#151820', border: '1px solid #2b2f3a', borderRadius: 12 }} />
                  <Line yAxisId="left" dataKey="weight" stroke="#6366f1" strokeWidth={3} />
                  <Line yAxisId="right" dataKey="bodyFat" stroke="#ec4899" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </article>
          </div>
          <RecommendationBox title="Personalized Action Plan" recommendations={result?.recommendations || {
            'Balanced Diet': ['Increase protein to 1.8g/kg and add vegetables at lunch.'],
            'Exercise': ['Strength train 4 times weekly with compound lifts.'],
            'Recovery & Lifestyle': ['Sleep 7.5-8.5 hours consistently and add 10 minutes daily mobility.'],
          }} accent="vitals" columns />
          <div className="report-actions">
            <button className="pink-button compact-save" onClick={saveVitalsReport} type="button" disabled={!result}><Save size={17} /> Save report</button>
            {saveStatus && <span>{saveStatus}</span>}
          </div>
        </div>
      </section>
    </main>
  );
}

function MetricTile({ label, value, helper, tone }) {
  return <div className="nutrition-tile"><span>{label}</span><strong>{value}</strong><small className={tone}>{helper}</small></div>;
}

function ProgressBar({ label, status, value, color }) {
  return (
    <div className="progress-bar-row">
      <div><span>{label}</span><b>{status}</b></div>
      <i><em style={{ width: `${value}%`, background: color }} /></i>
    </div>
  );
}

function MacroTooltip({ active, payload, total }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const percent = Math.round((Number(item.value) / total) * 100);
  return (
    <div className="macro-tooltip">
      <span><i style={{ background: item.payload.color }} /> {item.name}</span>
      <strong>{percent}%</strong>
      <small>{item.value}g of tracked macros</small>
    </div>
  );
}

function RecommendationBox({ title, recommendations, accent, columns }) {
  const groups = Array.isArray(recommendations)
    ? { Recommendations: recommendations }
    : recommendations;

  return (
    <section className={cls('recommendation-box', accent, columns && 'columns')}>
      <h3>{title}</h3>
      <div>
        {Object.entries(groups).map(([group, items]) => (
          <article className="recommendation-group" key={group}>
            <h4>{group}</h4>
            {(Array.isArray(items) ? items : [items]).map((item) => <p key={item}>{item}</p>)}
          </article>
        ))}
      </div>
    </section>
  );
}

function VitalsMetric({ title, value, label, ideal, tone, bar }) {
  return (
    <article className="reference-card vitals-metric">
      <div><span>{title}</span>{label && <b className={tone}>{label}</b>}</div>
      <strong>{value}</strong>
      {bar && <i><em style={{ width: `${bar}%` }} /></i>}
      <small>{ideal}</small>
    </article>
  );
}

function MetricLine({ icon, label, value }) {
  return <div className="metric-line"><span>{icon}</span><p>{label}</p><strong>{value}</strong></div>;
}

createRoot(document.getElementById('root')).render(<App />);
