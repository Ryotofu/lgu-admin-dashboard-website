import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase'; // Adjust path based on your file structure
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from './firebase';
import Login from './Login';
import emailjs from '@emailjs/browser';
import IncidentHeatmap from './IncidentHeatmap';
import ResponderManagement from './ResponderManagement'; // 👈 ADD THIS LINE
import InstructionsManual from './InstructionsManual';
import InteractiveTutorial from './InteractiveTutorial'; // 👈 ADD THIS IMPORT

// Defensive image URL utility to handle mixed raw Base64 strings, complete data URIs, and HTTP links safely
const ensureImageSrc = (src) => {
  if (!src || typeof src !== 'string') return '';
  if (src.startsWith('data:') || src.startsWith('http:') || src.startsWith('https:')) {
    return src;
  }
  return `data:image/jpeg;base64,${src}`;
};
// -------------------------------------------------------------
// AUTHORIZED ADMIN EMAILS LIST
// -------------------------------------------------------------
const AUTHORIZED_ADMINS = ['admin@lgu.gov.ph'];

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Monitor real-time login session status with Whitelist Check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // 🛡️ CHECK IF LOGGED-IN EMAIL IS AUTHORIZED
        if (AUTHORIZED_ADMINS.includes(currentUser.email)) {
          setUser(currentUser);
        } else {
          // Reject and sign out any unauthorized accounts
          alert(`Access Denied: ${currentUser.email} is not authorized for Admin access.`);
          await signOut(auth);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ... rest of your App code stays the same

// Real Firebase Logout Handler
const handleLogout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
  }
};
  const [settingsTab, setSettingsTab] = useState('heatmap');
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false); // 👈 ADD THIS STATE
  const [historyFilter, setHistoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); 
  
  const [statTab, setStatTab] = useState('WEEKLY'); 
  const [statsDept, setStatsDept] = useState('ALL'); 
  
  const [sortOrder, setSortOrder] = useState('NEWEST'); 

  // Real-time Collections States
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);

  // Selection Directories States
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [selectedID, setSelectedID] = useState(null);
  const [approvalRole, setApprovalRole] = useState('SELECT APPROVAL ROLE');

  // Real-time Firestore Observers
  useEffect(() => {
    const unsubscribeReports = onSnapshot(collection(db, 'reports'), (snapshot) => {
      const reportsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReports(reportsData);
    });

    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersData);
    });

    return () => {
      unsubscribeReports();
      unsubscribeUsers();
    };
  }, []);

  // ID Verification Handlers with automated Email Notification dispatch
  const handleIDAction = async (action) => {
    if (approvalRole === "SELECT APPROVAL ROLE" && action === 'Approved') {
        alert("Please select an approved responder role before submitting!");
        return;
    }

    try {
        const userRef = doc(db, 'users', selectedID.id);

        if (action === 'Approved') {
            await updateDoc(userRef, {
                role: approvalRole,
                idStatus: 'Approved'
            });

            const templateParams = {
                to_email: selectedID.email,
                subject: `LGU Portal: Approved as ${approvalRole}`,
                message: `Hello ${selectedID.fullName},\n\nCongratulations! Your LGU responder ID verification has been approved. You are now officially registered as a ${approvalRole}.\n\nYou may now launch the Responder Mobile App and log in using the email and password you created during registration.\n\n- LGU Admin Team`
            };
            
            await emailjs.send(
                'service_id265eu',   
                'template_jj65n7c',  
                templateParams,
                { publicKey: 'G7C0i2J4eS7lsxFN_' }   
            );
            
            alert(`${selectedID.fullName} has been APPROVED! Database updated and email sent.`);
            
        } else if (action === 'Rejected') {
            await updateDoc(userRef, {
                role: 'REJECTED_RESPONDER',
                idStatus: 'Rejected'
            });

            const dept = selectedID.requestedRole || 'your department';
            const templateParams = {
                to_email: selectedID.email,
                subject: `LGU Portal: ID Verification Rejected`,
                message: `Hello ${selectedID.fullName},\n\nWe regret to inform you that your responder ID verification has been rejected by the LGU Admin.\n\nIf you are indeed an official active responder, please coordinate with your direct head of ${dept} for manual ID verification.\n\n- LGU Admin Team`
            };

            await emailjs.send(
                'service_id265eu',   
                'template_jj65n7c',  
                templateParams,
                { publicKey: 'G7C0i2J4eS7lsxFN_' }   
            );

            alert(`${selectedID.fullName} has been REJECTED. Email sent.`);
        }

        setSelectedID(null);
        setApprovalRole('SELECT APPROVAL ROLE');

    } catch (error) {
        console.error("Error processing user:", error);
        alert("An error occurred: " + error.message);
    }
  };

  // Helper Date Functions to handle rendering timestamps smoothly
  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'No Date/Time Logged';
    if (timestamp.toDate) return timestamp.toDate().toLocaleString();
    return timestamp.toString();
  };

  const parseDate = (timestamp) => {
    if (!timestamp) return new Date(0);
    if (timestamp.toDate) return timestamp.toDate();
    const cleanStr = timestamp.toString().replace(' at ', ' ');
    const parsed = new Date(cleanStr);
    return isNaN(parsed) ? new Date(0) : parsed;
  };

  // Helper Categorizer to accurately assign reports to respective departments
  const getDepartment = (report) => {
    const title = (report.incidentTitle || '').toUpperCase();
    const desc = (report.description || '').toUpperCase();
    const role = (report.requestedRole || '').toUpperCase();
    
    if (title.includes('FIRE') || desc.includes('FIRE') || role.includes('FIRE')) return 'FIRE';
    if (title.includes('HEALTH') || title.includes('MEDICAL') || title.includes('AMBULANCE') || desc.includes('HEALTH') || desc.includes('MEDICAL') || role.includes('HEALTH')) return 'HEALTH';
    return 'POLICE';
  };

 // THE ULTIMATE DEFENSIVE IMAGE PARSER (UPDATED TO READ NESTED COMPASS ANGLES)
  const getIncidentImages = (incident) => {
    if (!incident) return [];
    let imageList = [];

    // Added 'anglesBase64' explicitly to structural containers to match department schemas
    const structuralContainers = [
      'incidentImages', 'images', 'photos', 'imageUrls', 'urls', 'media', 'anglesBase64'
    ];
    
    structuralContainers.forEach(key => {
      const data = incident[key];
      if (!data) return;

      if (Array.isArray(data)) {
        data.forEach((src, idx) => {
          if (src) imageList.push({ label: `Angle ${idx + 1}`, src });
        });
      } else if (typeof data === 'object') {
        Object.entries(data).forEach(([k, value]) => {
          if (value) imageList.push({ label: k.toUpperCase(), src: value });
        });
      }
    });

    // Check flat numbered attributes (up to 6 slots)
    for (let i = 1; i <= 6; i++) {
      if (incident[`image${i}`]) imageList.push({ label: `Angle ${i}`, src: incident[`image${i}`] });
      if (incident[`photo${i}`]) imageList.push({ label: `Angle ${i}`, src: incident[`photo${i}`] });
    }

    // Check custom perspective / compass headings strings directly on the root object
    const trackingOrientations = [
      'imageFront', 'imageBack', 'imageLeft', 'imageRight', 'front', 'back', 'left', 'right',
      'imageNorth', 'imageEast', 'imageWest', 'imageSouth', 'North', 'East', 'West', 'South'
    ];
    trackingOrientations.forEach(key => {
      if (incident[key]) {
        const cleanLabel = key.replace('image', '').toUpperCase();
        imageList.push({ label: cleanLabel, src: incident[key] });
      }
    });

    // De-duplicate any collected assets to prevent rendering identical content blocks
    const cleanUniqueImages = [];
    const trackingCache = new Set();
    imageList.forEach(item => {
      if (!trackingCache.has(item.src)) {
        trackingCache.add(item.src);
        cleanUniqueImages.push(item);
      }
    });

    // Hard fallback if zero structured parameters were located
    if (cleanUniqueImages.length === 0 && incident.imageBase64) {
      cleanUniqueImages.push({ label: 'PRIMARY PHOTO', src: incident.imageBase64 });
    }

    return cleanUniqueImages;
  };

  // Incident History Filter & Sorting Logic
  const filteredReports = reports.filter(report => {
    const searchLower = searchQuery.toLowerCase();
    const reportDate = formatDateTime(report.createdAt).toLowerCase();
    
    const matchesSearch =
      (report.incidentTitle || '').toLowerCase().includes(searchLower) ||
      (report.reporterName || '').toLowerCase().includes(searchLower) ||
      (report.reporterEmail || report.email || '').toLowerCase().includes(searchLower) ||
      (report.description || '').toLowerCase().includes(searchLower) ||
      (report.location || report.address || '').toLowerCase().includes(searchLower) ||
      (report.severity || '').toLowerCase().includes(searchLower) ||
      (report.status || '').toLowerCase().includes(searchLower) ||
      reportDate.includes(searchLower);
    
    let matchesFilter = true;
    if (historyFilter !== 'ALL') {
        const dept = getDepartment(report);
        matchesFilter = (dept === historyFilter);
    }

    let matchesStatus = true;
    if (statusFilter === 'CLOSED') {
      const status = (report.status || '').toUpperCase();
      matchesStatus = (status === 'SOLVED' || status === 'CASE CLOSED' || status === 'RESOLVED');
    }

    return matchesSearch && matchesFilter && matchesStatus;
  }).sort((a, b) => {
    const dateA = parseDate(a.createdAt);
    const dateB = parseDate(b.createdAt);
    return sortOrder === 'NEWEST' ? dateB - dateA : dateA - dateB;
  });

  // User Verification Directory Filter Logic
  const filteredUsers = users.filter(user => {
    const role = (user.role || '').toUpperCase();
    const isNotCitizen = !role.includes('CITIZEN');
    const searchLower = userSearchQuery.toLowerCase();
    const matchesSearch =
        (user.fullName || '').toLowerCase().includes(searchLower) ||
        (user.email || '').toLowerCase().includes(searchLower);
    return isNotCitizen && matchesSearch;
  });

  // Consolidated operational analytics calculation engine
  const getStats = () => {
    const now = new Date();
    let daysToSubtract = 7;
    if (statTab === 'MONTHLY') daysToSubtract = 30;
    if (statTab === 'YEARLY') daysToSubtract = 365;

    const cutoffDate = new Date();
    cutoffDate.setDate(now.getDate() - daysToSubtract);

    const reportsInPeriod = reports.filter(r => parseDate(r.createdAt) >= cutoffDate);
    const filteredForStats = reportsInPeriod.filter(r => {
      if (statsDept === 'ALL') return true;
      return getDepartment(r) === statsDept;
    });

    let fire = 0, police = 0, health = 0;
    reportsInPeriod.forEach(r => {
        const dept = getDepartment(r);
        if (dept === 'FIRE') fire++;
        else if (dept === 'HEALTH') health++;
        else if (dept === 'POLICE') police++;
    });

    const totalAll = reportsInPeriod.length;
    const firePct = totalAll === 0 ? 0 : Math.round((fire / totalAll) * 100);
    const policePct = totalAll === 0 ? 0 : Math.round((police / totalAll) * 100);
    const healthPct = totalAll === 0 ? 0 : Math.round((health / totalAll) * 100);

    const total = filteredForStats.length;
    const resolved = filteredForStats.filter(r => {
      const status = (r.status || '').toUpperCase();
      return status === 'SOLVED' || status === 'CASE CLOSED' || status === 'RESOLVED';
    }).length;
    const active = total - resolved;

    let high = 0, medium = 0, low = 0;
    filteredForStats.forEach(r => {
      const sev = (r.severity || '').toUpperCase();
      if (sev.includes('HIGH') || sev.includes('CRITICAL')) high++;
      else if (sev.includes('LOW') || sev.includes('MINOR')) low++;
      else medium++;
    });

    return { 
      totalAll, fire, police, health, firePct, policePct, healthPct,
      total, resolved, active,
      resolvedPct: total === 0 ? 0 : Math.round((resolved / total) * 100),
      activePct: total === 0 ? 0 : Math.round((active / total) * 100),
      high, medium, low,
      highPct: total === 0 ? 0 : Math.round((high / total) * 100),
      mediumPct: total === 0 ? 0 : Math.round((medium / total) * 100),
      lowPct: total === 0 ? 0 : Math.round((low / total) * 100),
      reportList: filteredForStats
    };
  };
 
  const stats = getStats();
// 1. Show loading indicator while Firebase checks active login session
if (authLoading) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-bold text-sm uppercase tracking-widest">
      Authenticating Admin Access...
    </div>
  );
}

// 2. AUTH GUARD: Render Login screen if user is not logged in
if (!user) {
  return <Login />;
}
  return (
    <>
      <div className="min-h-screen text-gray-800 pb-12 print:hidden bg-gray-50">
        
        {/* Navigation Sticky Header */}
        <header className="bg-slate-900 text-white px-8 py-4 flex justify-between items-center shadow-lg sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏛️</span>
            <div>
              <h1 className="font-extrabold text-lg tracking-wider">LGU Emergency Portal</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Local Government Command Center</p>
            </div>
          </div>
         <div className="flex items-center gap-4">
  <span className="bg-slate-800 hover:bg-slate-700 transition-colors text-slate-300 px-3 py-1.5 rounded-full text-xs font-black tracking-widest cursor-default">
    🔴 🔴 ADMIN: {user?.email}
  </span>

  {/* 🎯 START TUTORIAL BUTTON */}
  <button 
    onClick={() => setIsTutorialOpen(true)}
    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded transition-all shadow-md uppercase flex items-center gap-1.5"
  >
    <span>🎯</span> Start Tutorial
  </button>

<button 
  data-tour="user-manual-btn"
  onClick={() => setIsManualOpen(true)}
  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded transition-all shadow-md uppercase flex items-center gap-1.5"
>
  <span>📖</span> User Manual
</button>
{/* 🚪 SIGN OUT BUTTON */}
<button 
  onClick={handleLogout}
  className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded transition-all shadow-md uppercase flex items-center gap-1.5"
>
  <span>🚪</span> Sign Out
</button>
</div>
        </header>

        <div className="p-8 max-w-6xl mx-auto">
          
          {/* DASHBOARD VIEW */}
          {activePage === 'dashboard' && (
            <section className="animate-fade-in space-y-8">
              <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-extrabold text-gray-900">Operations Control Center</h2>
                <p className="text-sm text-gray-500">Real-time emergency monitoring, responder auditing, and verified closures.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-md border-t-8 border-red-500 overflow-hidden hover:translate-y-[-4px] transition-all">
                  <div className="p-6">
                    <span className="text-3xl">🔥</span>
                    <h3 className="font-extrabold text-lg text-gray-900 mt-2">FIRE INCIDENTS</h3>
                    <p className="text-xs text-gray-400 mb-4 font-bold uppercase tracking-wider">MDRRMO Fire Services</p>
<button 
  data-tour="fire-card-btn"
  className="w-full bg-red-500 text-white font-bold py-2.5 rounded-lg hover:bg-red-600 transition-all text-xs uppercase shadow"
  onClick={() => { setActivePage('history'); setHistoryFilter('FIRE'); }}
>
  Audit Fire Alerts
</button>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md border-t-8 border-blue-600 overflow-hidden hover:translate-y-[-4px] transition-all">
                  <div className="p-6">
                    <span className="text-3xl">🛡️</span>
                    <h3 className="font-extrabold text-lg text-gray-900 mt-2">POLICE SECURITY</h3>
                    <p className="text-xs text-gray-400 mb-4 font-bold uppercase tracking-wider">PNP Law Enforcement</p>
<button 
  data-tour="police-card-btn"
  className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-lg hover:bg-blue-700 transition-all text-xs uppercase shadow"
  onClick={() => { setActivePage('history'); setHistoryFilter('POLICE'); }}
>
  Audit Police Reports
</button>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md border-t-8 border-green-500 overflow-hidden hover:translate-y-[-4px] transition-all">
                  <div className="p-6">
                    <span className="text-3xl">➕</span>
                    <h3 className="font-extrabold text-lg text-gray-900 mt-2">HEALTH / MEDICAL</h3>
                    <p className="text-xs text-gray-400 mb-4 font-bold uppercase tracking-wider">RHU Medical Response</p>
<button 
  data-tour="health-card-btn"
  className="w-full bg-green-500 text-white font-bold py-2.5 rounded-lg hover:bg-green-600 transition-all text-xs uppercase shadow"
  onClick={() => { setActivePage('history'); setHistoryFilter('HEALTH'); }}
>
  Audit Medical Cases
</button>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mt-8">
                <h3 className="text-md font-extrabold uppercase tracking-widest text-gray-500 mb-4">Command Actions Portal</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <button data-tour="incident-data-nav" onClick={() => { setActivePage('history'); setHistoryFilter('ALL'); }} className="flex flex-col items-center justify-center p-5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-slate-800 font-extrabold text-sm transition-all gap-2 hover:border-slate-300">
                    <span className="text-2xl">🗂️</span> INCIDENT DATA
                  </button>
                  <button data-tour="id-verification-nav" onClick={() => setActivePage('email')} className="flex flex-col items-center justify-center p-5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-slate-800 font-extrabold text-sm transition-all gap-2 hover:border-slate-300">
                    <span className="text-2xl">🆔</span> ID VERIFICATION
                  </button>
                  <button data-tour="metrics-nav" onClick={() => setActivePage('stats')} className="flex flex-col items-center justify-center p-5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-slate-800 font-extrabold text-sm transition-all gap-2 hover:border-slate-300">
                    <span className="text-2xl">📈</span> OPERATIONS METRICS
                  </button>
                <button data-tour="access-controls-nav" onClick={() => setActivePage('settings')} className="flex flex-col items-center justify-center p-5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-slate-800 font-extrabold text-sm transition-all gap-2 hover:border-slate-300">
                <span className="text-2xl">⚙️</span> ACCESS CONTROLS
                </button>
                </div>
              </div>
            </section>
          )}

          {/* CENTRALIZED DATA LEDGER */}
          {activePage === 'history' && (
            <section className="animate-fade-in space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-gray-900">Incident Command Center Ledger</h2>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Unified Registry & Resolution Audit</p>
                </div>
                
                <div className="flex bg-gray-200 p-1.5 rounded-lg border border-gray-300 shadow-inner">
                  <button 
                    onClick={() => setStatusFilter('ALL')}
                    className={`px-4 py-2 rounded-md text-xs font-black uppercase tracking-wider transition-all ${statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                  >
                    📂 Show All Alerts
                  </button>
                  <button 
                    onClick={() => setStatusFilter('CLOSED')}
                    className={`px-4 py-2 rounded-md text-xs font-black uppercase tracking-wider transition-all ${statusFilter === 'CLOSED' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500 hover:text-emerald-800'}`}
                  >
                    ✅ Audited Cases Only (Closed)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left side list panel */}
                <div className="lg:col-span-5 bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="font-extrabold text-gray-700 text-sm uppercase tracking-wider">Reports ({filteredReports.length})</h3>
                    <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded text-xs font-bold uppercase">{historyFilter}</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1 items-center">
                    {['ALL', 'FIRE', 'HEALTH', 'POLICE'].map(filter => (
                      <button
                        key={filter}
                        className={`px-3 py-1 rounded text-[11px] font-black tracking-widest uppercase transition-all ${historyFilter === filter ? 'bg-slate-800 text-white border-transparent' : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200'}`}
                        onClick={() => setHistoryFilter(filter)}
                      >
                        {filter}
                      </button>
                    ))}

                    <button
                      className="px-3 py-1 rounded text-[11px] font-black tracking-widest uppercase transition-all bg-amber-500 hover:bg-amber-600 text-white border border-transparent shadow-sm flex items-center gap-1 ml-auto"
                      onClick={() => setSortOrder(prev => prev === 'NEWEST' ? 'OLDEST' : 'NEWEST')}
                      title="Click to toggle chronologic order"
                    >
                      <span>⏳</span>
                      {sortOrder === 'NEWEST' ? 'Newest ➔ Oldest' : 'Oldest ➔ Newest'}
                    </button>
                  </div>

                  <input 
                    type="text" 
                    className="border border-gray-300 p-2.5 rounded-lg w-full text-xs" 
                    placeholder="Search details, titles, locations, dispatchers..." 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                  />

                  <div className="overflow-y-auto h-[450px] space-y-2 pr-1">
                    {filteredReports.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 border border-dashed rounded-lg">
                        <span className="text-3xl">📭</span>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">No matching cases logged.</p>
                      </div>
                    ) : null}
                    
                    {filteredReports.map((report) => (
                      <div
                        key={report.id}
                        className={`p-3 border rounded-xl flex items-center justify-between cursor-pointer transition-all hover:bg-slate-50 ${selectedIncident?.id === report.id ? 'bg-slate-50 border-slate-900 shadow-sm' : 'border-gray-200'}`}
                        onClick={() => setSelectedIncident(report)}
                      >
                        <div className="space-y-1">
                          <p className="text-xs font-black text-slate-800 uppercase leading-snug">{report.incidentTitle || 'Untitled Case'}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 font-bold uppercase">{formatDateTime(report.createdAt)}</span>
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                              report.severity?.toUpperCase().includes('HIGH') ? 'bg-red-100 text-red-800' :
                              report.severity?.toUpperCase().includes('LOW') ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                            }`}>{report.severity || 'UNKNOWN'}</span>
                          </div>
                        </div>
                        <span className="text-gray-400 font-bold text-sm">❯</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right side report detail panel */}
                <div data-tour="ledger-dossier-panel" className="lg:col-span-7 bg-white border border-gray-200 rounded-xl p-6 shadow-sm min-h-[500px]">
                  <h3 className="font-extrabold text-gray-700 text-sm uppercase tracking-wider border-b pb-3 mb-4">Incident Dossier & Evidence Log</h3>
                  
                  {selectedIncident ? (
                    <div className="space-y-6 animate-fade-in">
                      
                      <div className={`p-4 rounded-xl text-white ${
                        getDepartment(selectedIncident) === 'HEALTH' ? 'bg-emerald-600' : 
                        getDepartment(selectedIncident) === 'FIRE' ? 'bg-red-600' : 'bg-blue-700'
                      } shadow-sm flex items-center justify-between`}>
                        <div>
                          <strong className="text-sm uppercase tracking-widest block font-black">{selectedIncident.incidentTitle}</strong>
                          <span className="text-[10px] font-bold tracking-widest text-white/85 uppercase mt-0.5 block">DEPARTMENT: {getDepartment(selectedIncident)}</span>
                        </div>
                        <span className="bg-white/20 border border-white/20 rounded font-black text-[10px] tracking-wider uppercase px-2.5 py-1">
                          Severity: {selectedIncident.severity || 'Medium'}
                        </span>
                      </div>

                      {/* Incident Attributes Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 border-b pb-4 text-xs">
                        <p><strong>🚨 Current Status:</strong> <span className="uppercase bg-slate-100 text-slate-700 font-extrabold px-1.5 py-0.5 rounded text-[11px] border border-slate-200">{selectedIncident.status}</span></p>
                        <p><strong>🕒 Time Logged:</strong> <span className="text-gray-600">{formatDateTime(selectedIncident.createdAt)}</span></p>
                        
                        <p className="sm:col-span-2">
                          <strong>📍 Coordinates/Location:</strong>{' '}
                          <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedIncident.address || selectedIncident.location || '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 font-bold underline transition-all inline-flex items-center gap-0.5"
                          >
                            {selectedIncident.address || selectedIncident.location || 'No Location Data'} 🔗
                          </a>
                        </p>
                        
                        {/* 2. OMNICHANNEL USER CROSS-COLLECTION LINKER */}
                        <div className="sm:col-span-2 mt-1">
                          {(() => {
                            const reporterProfile = users.find(u => {
                              const reportUid = selectedIncident.userId || selectedIncident.uid || selectedIncident.user_id || selectedIncident.reporterId || selectedIncident.reporterID || selectedIncident.reporterUid;
                              const userUid = u.id || u.uid || u.userId;
                              if (reportUid && userUid && String(reportUid) === String(userUid)) return true;

                              const reportEmail = selectedIncident.reporterEmail || selectedIncident.email || selectedIncident.userEmail || selectedIncident.reporter_email;
                              if (reportEmail && u.email && reportEmail.toLowerCase().trim() === u.email.toLowerCase().trim()) return true;

                              return false;
                            });

                            const realEmail = selectedIncident.reporterEmail || selectedIncident.email || selectedIncident.userEmail || reporterProfile?.email || 'anonymous-source@lgu.gov';
                            const idImage = selectedIncident.reporterIdImage || selectedIncident.idImageBase64 || reporterProfile?.idImageBase64 || reporterProfile?.idCard;
                            const idStatus = selectedIncident.idStatus || reporterProfile?.idStatus || 'VALID ID';

                            return (
                              <div className="bg-slate-100 border border-slate-300 p-3 rounded-xl flex items-center justify-between gap-4 shadow-sm">
                                <div className="space-y-1">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">REPORTED BY & VERIFICATION ID</span>
                                  <p className="font-extrabold text-slate-800 text-sm">👤 {selectedIncident.reporterName || reporterProfile?.fullName || 'Anonymous Citizen'}</p>
                                  <p className="text-xs text-red-600 font-black">
                                    Real Email: <span className="underline select-all">{realEmail}</span>
                                  </p>
                                </div>
                                
                                {idImage ? (
                                  <div className="flex flex-col items-center bg-white p-1 rounded-lg border border-slate-300 shadow-sm w-20">
                                    <img 
                                      src={ensureImageSrc(idImage)} 
                                      alt="Verification ID Log" 
                                      className="w-full h-10 object-cover rounded border"
                                    />
                                    <span className="text-[8px] font-black text-emerald-700 mt-0.5 tracking-wider uppercase">{idStatus}</span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center justify-center bg-slate-200 p-1.5 rounded-lg border border-slate-300 text-slate-400 w-20 h-12">
                                    <span className="text-lg">🪪</span>
                                    <span className="text-[7px] font-black tracking-tighter uppercase">NO ID DATA</span>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      <div className={`p-3 border rounded-xl flex flex-col gap-1 shadow-inner ${
                        selectedIncident.aiAnalysis?.invalidAngles?.length > 0 ? 'bg-amber-50/50 border-amber-200' : 'bg-emerald-50/50 border-emerald-200'
                      }`}>
                        <p className="text-xs font-black flex items-center gap-1.5">
                          <strong>🛡️ Real-time AI Security Assessment:</strong>{' '}
                          <span className={`font-black ${selectedIncident.aiAnalysis?.invalidAngles?.length > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                            {selectedIncident.aiAnalysis?.invalidAngles?.length > 0 ? '⚠️ IRREGULARITIES DETECTED' : '✅ ASSIGNMENT VALIDATED PASS'}
                          </span>
                        </p>
                        {selectedIncident.aiAnalysis?.invalidAngles?.length > 0 && (
                          <p className="text-[10px] text-red-600 font-semibold leading-normal">
                            ❌ Flagged Irregular or Repeated Photographic Perspectives: {selectedIncident.aiAnalysis.invalidAngles.join(', ')}
                          </p>
                        )}
                      </div>

                      {/* STABLE COMPREHENSIVE MULTI-IMAGE GENERATION MATRIX */}
                      {(() => {
                        const parsedImages = getIncidentImages(selectedIncident);
                        if (parsedImages.length === 0) {
                          return (
                            <div className="w-full h-24 bg-slate-100 flex flex-col items-center justify-center border border-dashed text-gray-400 font-bold rounded-lg text-[10px] uppercase tracking-widest">
                              <span>No Operational Photos Recorded</span>
                            </div>
                          );
                        }

                        return (
                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <strong className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-2">
                              📸 INCIDENT EVIDENCE ({parsedImages.length} ANGLES FOUND):
                            </strong>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {parsedImages.map((img, index) => (
                                <div key={index} className="relative border rounded-lg bg-black overflow-hidden group h-24 shadow-sm border-slate-300">
                                  <img
                                    src={ensureImageSrc(img.src)}
                                    alt={img.label}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-[9px] text-white font-black text-center uppercase py-0.5 tracking-wider truncate px-1">
                                    {img.label}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      <div>
                        <strong className="block text-xs uppercase text-slate-500 font-bold tracking-wider mb-1">Case Description:</strong>
                        <p className="text-xs text-gray-700 leading-relaxed bg-slate-50 p-3 rounded-lg border">{selectedIncident.description || 'No description provided.'}</p>
                      </div>

                      {/* UNIFIED CLOSURE EVIDENCE CENTRE */}
                      {(selectedIncident.status === 'SOLVED' || selectedIncident.status === 'CASE CLOSED' || selectedIncident.status === 'RESOLVED') && (
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-4 shadow-sm">
                          <h4 className="font-black text-emerald-800 border-b border-emerald-200 pb-2 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                            🛡️ Official Responder Closure Documentation
                          </h4>
                          
                          <div className="grid grid-cols-2 gap-4 text-[11px] text-gray-700">
                            <div>
                              <p className="my-1"><strong>Resolved By:</strong> {selectedIncident.resolvedBy || selectedIncident.resolvedByEmail || 'Official Dispatcher'}</p>
                              <p className="my-1"><strong>Closing Time:</strong> {formatDateTime(selectedIncident.resolvedAt || selectedIncident.updatedAt)}</p>
                            </div>
                            <div>
                              <p className="my-1"><strong>Responder Remarks:</strong></p>
                              <p className="bg-white p-2 border rounded italic text-gray-600 text-[10px] leading-relaxed">
                                {selectedIncident.closingNotes || selectedIncident.closingRemarks || 'No general comments recorded.'}
                              </p>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-emerald-200/60">
                            <strong className="block text-[10px] text-emerald-900 font-black uppercase tracking-wider mb-2">Logged Agency Closures & Evidence:</strong>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              
                              {/* Fire Dept logs */}
                              <div className="p-2.5 bg-red-50/50 border border-red-100 rounded-lg text-[10px] flex flex-col justify-between">
                                <div>
                                  <span className="font-extrabold text-red-700 uppercase tracking-wider flex items-center gap-0.5">🚒 Fire Dept</span>
                                  <p className="italic text-gray-600 mt-1 leading-normal">
                                    {selectedIncident.fireClosingNotes || (getDepartment(selectedIncident) === 'FIRE' ? selectedIncident.closingNotes : null) || "No logs recorded."}
                                  </p>
                                </div>
                                {(() => {
                                  const fireImg = selectedIncident.fireClosingImageBase64 || (getDepartment(selectedIncident) === 'FIRE' && selectedIncident.closingImageBase64);
                                  return fireImg ? (
                                    <img 
                                      src={ensureImageSrc(fireImg)} 
                                      className="h-16 w-full object-cover rounded-md mt-2 border border-red-200"
                                      alt="Fire Log"
                                    />
                                  ) : null;
                                })()}
                              </div>

                              {/* Police Dept logs */}
                              <div className="p-2.5 bg-blue-50/50 border border-blue-100 rounded-lg text-[10px] flex flex-col justify-between">
                                <div>
                                  <span className="font-extrabold text-blue-700 uppercase tracking-wider flex items-center gap-0.5">🚓 Police Dept</span>
                                  <p className="italic text-gray-600 mt-1 leading-normal">
                                    {selectedIncident.policeClosingNotes || (getDepartment(selectedIncident) === 'POLICE' ? selectedIncident.closingNotes : null) || "No logs recorded."}
                                  </p>
                                </div>
                                {(() => {
                                  const policeImg = selectedIncident.policeClosingImageBase64 || (getDepartment(selectedIncident) === 'POLICE' && selectedIncident.closingImageBase64);
                                  return policeImg ? (
                                    <img 
                                      src={ensureImageSrc(policeImg)} 
                                      className="h-16 w-full object-cover rounded-md mt-2 border border-blue-200"
                                      alt="Police Log"
                                    />
                                  ) : null;
                                })()}
                              </div>

                              {/* Medical logs */}
                              <div className="p-2.5 bg-green-50/50 border border-green-100 rounded-lg text-[10px] flex flex-col justify-between">
                                <div>
                                  <span className="font-extrabold text-green-700 uppercase tracking-wider flex items-center gap-0.5">🏥 Health/Medical</span>
                                  <p className="italic text-gray-600 mt-1 leading-normal">
                                    {selectedIncident.medicalClosingNotes || selectedIncident.healthClosingNotes || (getDepartment(selectedIncident) === 'HEALTH' ? selectedIncident.closingNotes : null) || "No logs recorded."}
                                  </p>
                                </div>
                                {(() => {
                                  const medicalImg = selectedIncident.medicalClosingImageBase64 || selectedIncident.healthClosingImageBase64 || (getDepartment(selectedIncident) === 'HEALTH' && selectedIncident.closingImageBase64);
                                  return medicalImg ? (
                                    <img 
                                      src={ensureImageSrc(medicalImg)} 
                                      className="h-16 w-full object-cover rounded-md mt-2 border border-green-200"
                                      alt="Medical Log"
                                    />
                                  ) : null;
                                })()}
                              </div>

                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400 h-96">
                      <span className="text-4xl">📄</span>
                      <p className="text-xs uppercase tracking-widest mt-2 font-bold text-gray-400">Select an incident to audit documentation.</p>
                    </div>
                  )}

                  <div className="mt-6 pt-4 border-t flex justify-end">
                    <button 
                      className="bg-slate-800 text-white hover:bg-slate-900 transition-colors px-6 py-2 rounded-lg font-black text-xs uppercase tracking-wider shadow"
                      onClick={() => setActivePage('dashboard')}
                    >
                      ◀ Back to Dashboard
                    </button>
                  </div>
                </div>

              </div>
            </section>
          )}

{/* ID VERIFICATION PAGE */}
{activePage === 'email' && (
  <section className="animate-fade-in space-y-6 w-full">
    <div>
      <h2 className="text-2xl font-black text-gray-900">Responder ID Verification Manager</h2>
      <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
        Enrollment vetting portal and SMTP mail center
      </p>
    </div>

    {/* Responsive 12-Column Grid Split */}
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
      
      {/* 👈 LEFT COLUMN (5/12): Responder Signups List */}
      <div 
        data-tour="id-vetting-panel" 
        className="lg:col-span-5 bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4"
      >
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="font-extrabold text-gray-700 text-sm uppercase tracking-wider">
            Responder Signups ({filteredUsers.length})
          </h3>
        </div>

        <input
          type="text"
          className="border border-gray-300 p-2.5 rounded-lg w-full text-xs font-medium focus:outline-none focus:border-slate-800"
          placeholder="Search candidate names or emails..."
          value={userSearchQuery}
          onChange={(e) => setUserSearchQuery(e.target.value)}
        />

        <div className="overflow-y-auto h-[480px] space-y-2 pr-1">
          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-dashed rounded-lg">
              <span className="text-3xl">👥</span>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">
                No responders found.
              </p>
            </div>
          ) : null}

          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className={`p-3 border rounded-xl flex items-center justify-between cursor-pointer transition-all hover:bg-slate-50 ${
                selectedID?.id === user.id ? 'bg-slate-50 border-slate-900 shadow-sm' : 'border-gray-200'
              }`}
              onClick={() => {
                setSelectedID(user);
                if (user.requestedRole) {
                  setApprovalRole(user.requestedRole);
                } else {
                  setApprovalRole('SELECT APPROVAL ROLE');
                }
              }}
            >
              <div className="space-y-1">
                <p className="text-xs font-black text-slate-800 leading-snug">
                  {user.fullName || user.email}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] uppercase font-extrabold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border">
                    {user.requestedRole || 'Unspecified Dept'}
                  </span>
                  <span
                    className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      user.idStatus === 'Pending Verification'
                        ? 'bg-amber-100 text-amber-800'
                        : user.idStatus === 'Approved'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {user.idStatus || 'Pending'}
                  </span>
                </div>
              </div>
              <span className="text-gray-400 font-bold text-sm">❯</span>
            </div>
          ))}
        </div>
      </div>

      {/* 👉 RIGHT COLUMN (7/12): Credentials Audit & Action Center */}
      <div className="lg:col-span-7 bg-white border border-gray-200 rounded-xl p-6 shadow-sm min-h-[550px] flex flex-col justify-between">
        <div>
          <h3 className="font-extrabold text-gray-700 text-sm uppercase tracking-wider border-b pb-3 mb-4">
            Credentials Audit & Action Center
          </h3>

          {selectedID ? (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col md:flex-row gap-6">
                
                {/* ID Image Display */}
                <div className="flex-1 bg-slate-50 p-4 text-center border border-dashed border-gray-300 rounded-xl flex flex-col justify-center">
                  <strong className="text-[10px] text-slate-500 uppercase tracking-widest block mb-2 font-black">
                    Official ID Card Picture
                  </strong>
                  {selectedID.idImageBase64 ? (
                    <img
                      src={ensureImageSrc(selectedID.idImageBase64)}
                      alt="ID Card"
                      className="w-full h-44 object-cover border rounded-lg shadow-sm hover:brightness-95 cursor-zoom-in"
                    />
                  ) : (
                    <div className="w-full h-44 bg-white border rounded-lg flex flex-col items-center justify-center text-slate-300">
                      <span className="text-3xl">🪪</span>
                      <span className="text-[9px] font-black uppercase tracking-widest mt-1">
                        No ID Image Submitted
                      </span>
                    </div>
                  )}
                </div>

                {/* Profile Details */}
                <div className="flex-1 space-y-3 text-xs text-slate-700">
                  <strong className="block border-b pb-1.5 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Profile Details
                  </strong>
                  <p><strong>Candidate:</strong> {selectedID.fullName}</p>
                  <p><strong>Email Address:</strong> {selectedID.email}</p>
                  <p>
                    <strong>Requested Department:</strong>{' '}
                    <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded uppercase text-[10px]">
                      {selectedID.requestedRole || 'Not Specified'}
                    </span>
                  </p>
                  <p><strong>System Role:</strong> <span className="uppercase">{selectedID.role || 'Citizen'}</span></p>
                  <p><strong>Enrollment Status:</strong> <span className="font-black">{selectedID.idStatus || 'Pending'}</span></p>
                </div>
              </div>

              {/* Actions Section */}
              {selectedID.idStatus === 'Pending Verification' ? (
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">
                      Approved Operational Role Assignment:
                    </label>
                    <select
                      className="w-full p-3 border border-gray-300 rounded-lg text-xs font-bold uppercase text-slate-700 bg-slate-50"
                      value={approvalRole}
                      onChange={(e) => setApprovalRole(e.target.value)}
                    >
                      <option>SELECT APPROVAL ROLE</option>
                      <option value="HEALTH RESPONDER">🏥 HEALTH RESPONDER</option>
                      <option value="POLICE RESPONDER">🚓 POLICE RESPONDER</option>
                      <option value="FIRE RESPONDER">🚒 FIRE RESPONDER</option>
                    </select>
                  </div>

                  <div className="flex gap-4">
                    <button
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-black text-xs uppercase tracking-widest transition-all shadow-md"
                      onClick={() => handleIDAction('Approved')}
                    >
                      Approve Responder
                    </button>
                    <button
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-black text-xs uppercase tracking-widest transition-all shadow-md"
                      onClick={() => handleIDAction('Rejected')}
                    >
                      Reject Vetting
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 p-4 bg-slate-50 border rounded-xl text-center">
                  <strong className="block text-slate-700 text-xs uppercase tracking-wider font-extrabold">
                    Audit Verification Complete
                  </strong>
                  <p className="text-[11px] text-gray-500 mt-1">
                    This responder profile has already been logged as{' '}
                    <span className="font-black text-slate-800 uppercase">{selectedID.idStatus}</span>.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-400 h-80">
              <span className="text-4xl">🪪</span>
              <p className="text-xs uppercase tracking-widest mt-2 font-bold text-gray-400">
                Select a responder to audit credentials.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t flex justify-end">
          <button
            className="bg-slate-800 text-white hover:bg-slate-900 transition-colors px-6 py-2 rounded-lg font-black text-xs uppercase tracking-wider shadow"
            onClick={() => setActivePage('dashboard')}
          >
            ◀ Back to Dashboard
          </button>
        </div>
      </div>

    </div>
  </section>
)}

{/* STATISTICS PAGE */}
{activePage === 'stats' && (
  <section className="animate-fade-in space-y-6 w-full">
    
    {/* Page Header Row */}
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 className="text-2xl font-black text-gray-900">
          Incident Analytics & Command Center Metrics
        </h2>
        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
          Real-time Operations KPI Summary & Printable Report Engine
        </p>
      </div>

      <button
        onClick={() => window.print()}
        className="bg-slate-800 text-white hover:bg-slate-900 font-black text-xs px-5 py-3 rounded-lg transition-all flex items-center justify-center gap-2 uppercase tracking-wider shadow-md hover:scale-[1.02] self-start md:self-auto"
      >
        🖨️ Print Analytics Report
      </button>
    </div>

    {/* Operational Period & Department Filter Control Bar */}
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
      
      {/* Time Period Filter */}
      <div className="flex flex-col gap-1.5 w-full md:w-auto">
        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
          Select Operational Period
        </span>
        <div className="flex bg-slate-100 rounded-lg p-1 border">
          {['WEEKLY', 'MONTHLY', 'YEARLY'].map((tab) => (
            <button
              key={tab}
              className={`px-4 py-2 text-xs font-black rounded-md uppercase tracking-wider transition-all ${
                statTab === tab
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-gray-400 hover:text-gray-800'
              }`}
              onClick={() => setStatTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Department Filter */}
      <div className="flex flex-col gap-1.5 w-full md:w-auto">
        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
          Filter by Specific Department
        </span>
        <div className="flex bg-slate-100 rounded-lg p-1 border">
          {['ALL', 'FIRE', 'HEALTH', 'POLICE'].map((dept) => (
            <button
              key={dept}
              className={`px-4 py-2 text-xs font-black rounded-md uppercase tracking-wider transition-all ${
                statsDept === dept
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-800'
              }`}
              onClick={() => setStatsDept(dept)}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

    </div>

    {/* Top Summary KPI Cards (3-Column Grid) */}
    <div data-tour="stats-kpi-panel" className="grid grid-cols-1 md:grid-cols-3 gap-6">
      
      {/* Total Incidents */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-1">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          Total Registered Incidents ({statTab.toLowerCase()})
        </span>
        <p className="text-4xl font-extrabold text-slate-800">{stats.total}</p>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Filter Dept: {statsDept}
        </p>
      </div>

      {/* Completion Rate */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-1">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          Resolved Cases Completion Rate
        </span>
        <p className="text-4xl font-extrabold text-emerald-600">{stats.resolvedPct}%</p>
        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
          {stats.resolved} of {stats.total} Closed
        </p>
      </div>

      {/* Active Units */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-1">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          Active Dispatch / Pending Units
        </span>
        <p className="text-4xl font-extrabold text-amber-500">{stats.active}</p>
        <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">
          {stats.activePct}% of Period Cases
        </p>
      </div>

    </div>

    {/* LGU Workload & Priority Breakdown Grid (2-Column Grid) */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      {/* Workload Progress Bars */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-5">
        <h3 className="font-extrabold text-gray-700 text-xs uppercase tracking-wider border-b pb-2">
          📋 LGU Workload Distribution
        </h3>
        <div className="space-y-4">
          
          <div>
            <div className="flex justify-between text-xs font-bold text-gray-600 mb-1">
              <span>🚒 FIRE DEPARTMENT</span>
              <span>{stats.fire} cases ({stats.firePct}%)</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3.5 border overflow-hidden">
              <div
                className="bg-red-500 h-full transition-all duration-500"
                style={{ width: `${stats.firePct}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold text-gray-600 mb-1">
              <span>🚓 POLICE FORCE</span>
              <span>{stats.police} cases ({stats.policePct}%)</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3.5 border overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-500"
                style={{ width: `${stats.policePct}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold text-gray-600 mb-1">
              <span>🏥 HEALTH & RESCUE</span>
              <span>{stats.health} cases ({stats.healthPct}%)</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3.5 border overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${stats.healthPct}%` }}
              ></div>
            </div>
          </div>

        </div>
      </div>

      {/* Priority Severity Breakdown */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-5">
        <h3 className="font-extrabold text-gray-700 text-xs uppercase tracking-wider border-b pb-2">
          🚨 Priority Breakdown ({statsDept})
        </h3>
        <div className="space-y-4">
          
          <div>
            <div className="flex justify-between text-xs font-bold text-gray-600 mb-1">
              <span>🔴 CRITICAL SEVERITY</span>
              <span>{stats.high} cases ({stats.highPct}%)</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3.5 border overflow-hidden">
              <div
                className="bg-rose-600 h-full transition-all duration-500"
                style={{ width: `${stats.highPct}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold text-gray-600 mb-1">
              <span>🟡 MEDIUM SEVERITY</span>
              <span>{stats.medium} cases ({stats.mediumPct}%)</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3.5 border overflow-hidden">
              <div
                className="bg-amber-400 h-full transition-all duration-500"
                style={{ width: `${stats.mediumPct}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold text-gray-600 mb-1">
              <span>🔵 MINOR SEVERITY</span>
              <span>{stats.low} cases ({stats.lowPct}%)</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3.5 border overflow-hidden">
              <div
                className="bg-sky-500 h-full transition-all duration-500"
                style={{ width: `${stats.lowPct}%` }}
              ></div>
            </div>
          </div>

        </div>
      </div>

    </div>

    {/* Historical Incidents Table */}
    <div className="bg-white border rounded-xl overflow-hidden shadow-sm border-gray-200">
      <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
        <h3 className="font-black text-xs text-slate-700 uppercase tracking-wider">
          Historical Incidents Ledger For Highlighted Criteria ({stats.reportList.length})
        </h3>
        <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-black uppercase">
          {statTab} - {statsDept}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-500 uppercase text-[9px] font-black border-b tracking-wider">
              <th className="p-3">Logged Date</th>
              <th className="p-3">Incident Description</th>
              <th className="p-3">Category</th>
              <th className="p-3">Priority Level</th>
              <th className="p-3">Status Label</th>
              <th className="p-3">Verified Dispatcher</th>
            </tr>
          </thead>
          <tbody className="divide-y text-slate-700 font-medium">
            {stats.reportList.length === 0 ? (
              <tr>
                <td
                  colSpan="6"
                  className="p-8 text-center text-gray-400 uppercase font-bold tracking-widest text-[10px]"
                >
                  No historical incident listings on specified period.
                </td>
              </tr>
            ) : (
              stats.reportList.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="p-3 whitespace-nowrap">{formatDateTime(r.createdAt)}</td>
                  <td className="p-3 font-bold uppercase">{r.incidentTitle || 'No Title'}</td>
                  <td className="p-3">
                    <span className="bg-slate-100 px-2 py-0.5 rounded font-extrabold text-[10px]">
                      {getDepartment(r)}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`font-black uppercase text-[9px] px-2 py-0.5 rounded ${
                        r.severity?.toUpperCase().includes('HIGH')
                          ? 'bg-red-100 text-red-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {r.severity || 'Medium'}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`font-extrabold uppercase text-[9px] px-2 py-0.5 rounded ${
                        r.status === 'SOLVED' ||
                        r.status === 'CASE CLOSED' ||
                        r.status === 'RESOLVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {r.status || 'Dispatched'}
                    </span>
                  </td>
                  <td className="p-3 text-slate-500 truncate max-w-[150px]">
                    {r.resolvedBy || r.resolvedByEmail || r.reporterName || 'N/A'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>

    {/* Footer Actions */}
    <div className="pt-4 flex justify-end">
      <button
        className="bg-slate-800 text-white hover:bg-slate-900 transition-colors px-6 py-2 rounded-lg font-black text-xs uppercase tracking-wider shadow"
        onClick={() => setActivePage('dashboard')}
      >
        ◀ Back to Dashboard
      </button>
    </div>

  </section>
)}

{/* COMMAND SETTINGS & RESPONDER MANAGEMENT MODULE */}
{activePage === 'settings' && (
  <section className="animate-fade-in space-y-4">
    
    {/* Page Header & Navigation Sub-Tabs */}
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
      <div>
        <h2 className="text-2xl font-black text-gray-900">
          Command Settings & Access Controls
        </h2>
        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
          Geospatial Map Operations & Personnel Management
        </p>
      </div>

      <div className="flex items-center gap-2">
        {/* Tab Navigation Switcher */}
        <div className="flex items-center gap-1 bg-slate-200 p-1 rounded-xl border border-slate-300">
          <button
            onClick={() => setSettingsTab('heatmap')}
            className={`px-3 py-1.5 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              settingsTab === 'heatmap'
                ? 'bg-slate-900 text-white shadow'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🗺️</span> Heatmap
          </button>

          <button
            onClick={() => setSettingsTab('responders')}
            className={`px-3 py-1.5 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              settingsTab === 'responders'
                ? 'bg-slate-900 text-white shadow'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>👥</span> Responders
          </button>
        </div>

        <button 
          className="bg-slate-800 text-white hover:bg-slate-900 transition-colors px-4 py-2 rounded-lg font-black text-xs uppercase tracking-wider shadow"
          onClick={() => setActivePage('dashboard')}
        >
          ◀ Dashboard
        </button>
      </div>
    </div>

    {/* Tab Content 1: Incident Spatial Heatmap */}
    {settingsTab === 'heatmap' && (
      <IncidentHeatmap 
        reports={reports} 
        getDepartment={getDepartment} 
        formatDateTime={formatDateTime} 
      />
    )}

    {/* Tab Content 2: Responder Account Management */}
    {settingsTab === 'responders' && (
      <ResponderManagement />
    )}

  </section>
)}

        </div>
      </div>


      {/* OFFICIAL MUNICIPAL PRINT ONLY REPORT DOCUMENT */}
      <div className="hidden print:block p-12 bg-white text-black font-serif w-full text-xs">
        
        <div className="text-center mb-6 border-b-4 border-double border-slate-800 pb-4">
          <h1 className="text-sm font-bold uppercase tracking-widest">Republic of the Philippines</h1>
          <h2 className="text-lg font-black uppercase mt-1 tracking-wide">Emergency Command Control Center</h2>
          <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Local Government Unit Incident Statistics Report</p>
        </div>

        <div className="grid grid-cols-2 gap-4 border-b pb-4 mb-4 text-[11px] leading-relaxed">
          <div>
            <p><strong>DOCUMENT TITLE:</strong> INCIDENT OPERATIONS SUMMATION LEDGER</p>
            <p><strong>REPORTING TIMESPAN:</strong> {statTab} ARCHIVE RANGE</p>
            <p><strong>TARGET AUDIT SCOPE:</strong> {statsDept} EMERGENCY RESPONSES</p>
          </div>
          <div className="text-right">
            <p><strong>GENERATED DATE:</strong> {new Date().toLocaleString()}</p>
            <p><strong>LEDGER CLASSIFICATION:</strong> OFFICIAL RECORD - UNRESTRICTED</p>
            <p><strong>STATUS:</strong> AUTHENTICATED COMMAND RECORD</p>
          </div>
        </div>

        <h3 className="font-extrabold text-sm uppercase tracking-wider mb-3 text-slate-800 border-b pb-1">I. Operational Quantitative Summary</h3>

        <table className="w-full text-left border-collapse border border-slate-300 text-[10px] mb-6">
          <thead>
            <tr className="bg-slate-100 font-bold uppercase border-b border-slate-300">
              <th className="p-2 border-r border-slate-300">Metric Identifier Description</th>
              <th className="p-2 text-center border-r border-slate-300">Absolute Count</th>
              <th className="p-2 text-center">Ratio Distribution (%)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            <tr>
              <td className="p-2 border-r border-slate-300">Total Operational Incidents Registered</td>
              <td className="p-2 text-center border-r border-slate-300 font-black">{stats.total}</td>
              <td className="p-2 text-center font-bold">100%</td>
            </tr>
            <tr>
              <td className="p-2 border-r border-slate-300">Verified Case Resolved / Solved Closures</td>
              <td className="p-2 text-center border-r border-slate-300 font-black text-green-700">{stats.resolved}</td>
              <td className="p-2 text-center font-bold">{stats.resolvedPct}%</td>
            </tr>
            <tr>
              <td className="p-2 border-r border-slate-300">Active / Dispatched Emergency Alerts</td>
              <td className="p-2 text-center border-r border-slate-300 font-black text-amber-600">{stats.active}</td>
              <td className="p-2 text-center font-bold">{stats.activePct}%</td>
            </tr>
            <tr>
              <td className="p-2 border-r border-slate-300">Critical Priority Alerts (High Severity)</td>
              <td className="p-2 text-center border-r border-slate-300 font-black text-red-700">{stats.high}</td>
              <td className="p-2 text-center font-bold">{stats.highPct}%</td>
            </tr>
          </tbody>
        </table>

        {statsDept === 'ALL' && (
          <div className="mb-6 avoid-break">
            <h3 className="font-extrabold text-sm uppercase tracking-wider mb-2 text-slate-800 border-b pb-1">II. Inter-Agency Workload Distribution</h3>
            <table className="w-full text-left border-collapse border border-slate-300 text-[10px]">
              <thead>
                <tr className="bg-slate-100 font-bold uppercase border-b border-slate-300">
                  <th className="p-2 border-r border-slate-300">Emergency Response Entity</th>
                  <th className="p-2 text-center border-r border-slate-300">Incidents Responded</th>
                  <th className="p-2 text-center">Operational Load Percentage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="p-2 border-r border-slate-300"><span>🚒</span> Fire Department Units</td>
                  <td className="p-2 text-center border-r border-slate-300">{stats.fire}</td>
                  <td className="p-2 text-center">{stats.firePct}%</td>
                </tr>
                <tr>
                  <td className="p-2 border-r border-slate-300"><span>🚓</span> Law Enforcement PNP Force</td>
                  <td className="p-2 text-center border-r border-slate-300">{stats.police}</td>
                  <td className="p-2 text-center">{stats.policePct}%</td>
                </tr>
                <tr>
                  <td className="p-2 border-r border-slate-300"><span>🏥</span> Emergency Medical Dispatch</td>
                  <td className="p-2 text-center border-r border-slate-300">{stats.health}</td>
                  <td className="p-2 text-center">{stats.healthPct}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="avoid-break mb-8">
          <h3 className="font-extrabold text-sm uppercase tracking-wider mb-2 text-slate-800 border-b pb-1">III. Chronological Summative Data Ledger</h3>
          <table className="w-full text-left border-collapse border border-slate-300 text-[9px]">
            <thead>
              <tr className="bg-slate-100 font-bold uppercase border-b border-slate-300">
                <th className="p-1.5 border-r border-slate-300">Date Logged</th>
                <th className="p-1.5 border-r border-slate-300">Operational Emergency Title</th>
                <th className="p-1.5 border-r border-slate-300">Department</th>
                <th className="p-1.5 border-r border-slate-300">Severity Priority</th>
                <th className="p-1.5 border-r border-slate-300">Verified Status</th>
                <th className="p-1.5">Authorized Dispatch Team</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {stats.reportList.map(r => (
                <tr key={r.id}>
                  <td className="p-1.5 border-r border-slate-300">{formatDateTime(r.createdAt)}</td>
                  <td className="p-1.5 border-r border-slate-300 uppercase font-black">{r.incidentTitle}</td>
                  <td className="p-1.5 border-r border-slate-300 font-bold">{getDepartment(r)}</td>
                  <td className="p-1.5 border-r border-slate-300 uppercase">{r.severity || 'Medium'}</td>
                  <td className="p-1.5 border-r border-slate-300 uppercase font-bold">{r.status || 'PENDING'}</td>
                  <td className="p-1.5 text-slate-500 truncate max-w-[120px]">{r.resolvedBy || r.resolvedByEmail || r.reporterName || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-12 pt-6 grid grid-cols-2 gap-12 avoid-break text-xs">
          <div>
            <div className="h-12 border-b border-gray-400 w-3/4 mb-1"></div>
            <p className="font-black text-gray-700 uppercase tracking-wider">Prepared By (Operations Recorder)</p>
            <p className="text-[10px] text-gray-400">Command Duty Operator, Emergency Response Hub</p>
          </div>
          <div className="text-right flex flex-col items-end">
            <div className="h-12 border-b border-gray-400 w-3/4 mb-1"></div>
            <p className="font-black text-gray-700 uppercase tracking-wider">Approved By (Command Chief Officer)</p>
            <p className="text-[10px] text-gray-400">Director, Municipal Disaster & Public Safety Office</p>
          </div>
        </div>

      </div>
{/* INSTRUCTIONS MANUAL MODAL */}
      <InstructionsManual 
        isOpen={isManualOpen} 
        onClose={() => setIsManualOpen(false)} 
      />

      {/* INTERACTIVE TUTORIAL OVERLAY */}
      <InteractiveTutorial
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        setActivePage={setActivePage}
        setHistoryFilter={setHistoryFilter}
        setSelectedIncident={setSelectedIncident}
        setSettingsTab={setSettingsTab}
        reports={reports}
      />

    </>
  );
}

export default App;