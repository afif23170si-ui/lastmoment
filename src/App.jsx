import React, { useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  deleteDoc
} from 'firebase/firestore';
import { 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  Users, 
  Calendar, 
  CheckCircle2, 
  Circle, 
  History, 
  Settings,
  AlertCircle,
  QrCode,
  TrendingUp,
  Clock,
  Heart,
  MapPin,
  Coins,
  Info,
  Lock,
  X,
  ChevronRight,
  Sparkles,
  Map,
  Eye,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Import dari config dan data
import { db, auth, appId, isDemoMode } from './config/firebase';
import { MEMBERS, TARGET_SALDO, IURAN_PER_BULAN, TANGGAL_LULUS } from './data/members';

// Import components
import UploadModal from './components/UploadModal';
import AdminPanel from './components/AdminPanel';

// Import assets
import albumImage from './assets/album-1.jpg';

export default function App() {
  const [user, setUser] = useState(isDemoMode ? { uid: 'demo-user' } : null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(!isDemoMode);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  
  // V2: Upload & Pending States
  const [pendingPayments, setPendingPayments] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('all'); // 'all' or month name

  // Admin PIN from environment variable
  const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || '2027';

  // 1. Inisialisasi Autentikasi (skip if demo mode)
  useEffect(() => {
    if (isDemoMode) {
      console.log('🎮 Running in Demo Mode - Firebase not configured');
      return;
    }

    let isMounted = true;
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        if (isMounted) console.error("Auth Error:", err);
      }
    };

    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (isMounted) {
        setUser(u);
        if (!u) setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // 2. Fetch Data Firestore (skip if demo mode)
  useEffect(() => {
    if (isDemoMode || !user) return;

    setLoading(true);
    const paymentsRef = collection(db, 'artifacts', appId, 'public', 'data', 'payments');
    
    const unsubscribe = onSnapshot(paymentsRef, 
      (snapshot) => {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setPayments(data);
        setLoading(false);
      }, 
      (error) => {
        console.error("Firestore Error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // 3. Fetch Pending Payments (V2)
  useEffect(() => {
    if (isDemoMode || !user) return;

    const pendingRef = collection(db, 'artifacts', appId, 'public', 'data', 'pending_payments');
    
    const unsubscribe = onSnapshot(pendingRef, 
      (snapshot) => {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setPendingPayments(data.filter(p => p.status === 'pending'));
      }, 
      (error) => {
        console.error("Pending Payments Error:", error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // --- Logika Perhitungan ---
  const totalTerkumpul = payments.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const persentaseProgres = Math.min((totalTerkumpul / TARGET_SALDO) * 100, 100);
  const bulanSekarang = new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' });
  const listSudahBayarBulanIni = payments
    .filter(p => p.month === bulanSekarang)
    .map(p => p.name);

  const hitungCountdown = () => {
    const selisih = TANGGAL_LULUS - new Date();
    const hari = Math.floor(selisih / (1000 * 60 * 60 * 24));
    const bulan = Math.floor(hari / 30);
    return { hari: hari > 0 ? hari : 0, bulan: bulan > 0 ? bulan : 0 };
  };

  // --- Admin Handlers (Demo Mode: local state only) ---
  const toggleStatusBayar = async (nama) => {
    if (!isAdmin || !user) return;
    
    if (isDemoMode) {
      // Demo mode: toggle locally
      const idDokumen = `${nama}-${bulanSekarang}`.replace(/\s+/g, '-').toLowerCase();
      const existing = payments.find(p => p.id === idDokumen);
      
      if (existing) {
        setPayments(prev => prev.filter(p => p.id !== idDokumen));
      } else {
        setPayments(prev => [...prev, {
          id: idDokumen,
          name: nama,
          amount: IURAN_PER_BULAN,
          month: bulanSekarang,
          date: new Date().toISOString(),
          timestamp: Date.now(),
          adminId: user.uid
        }]);
      }
      return;
    }

    const idDokumen = `${nama}-${bulanSekarang}`.replace(/\s+/g, '-').toLowerCase();
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'payments', idDokumen);

    try {
      if (listSudahBayarBulanIni.includes(nama)) {
        await deleteDoc(docRef);
      } else {
        await setDoc(docRef, {
          name: nama,
          amount: IURAN_PER_BULAN,
          month: bulanSekarang,
          date: new Date().toISOString(),
          timestamp: Date.now(),
          adminId: user.uid
        });
      }
    } catch (err) {
      console.error("Gagal update data:", err);
    }
  };

  // --- PIN Handlers ---
  const handleAdminToggle = () => {
    if (isAdmin) {
      // Logout admin
      setIsAdmin(false);
    } else {
      // Show PIN modal
      setShowPinModal(true);
      setPinInput('');
      setPinError(false);
    }
  };

  const handlePinSubmit = () => {
    if (pinInput === ADMIN_PIN) {
      setIsAdmin(true);
      setShowPinModal(false);
      setPinInput('');
      setPinError(false);
    } else {
      setPinError(true);
      setPinInput('');
    }
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500 font-medium">Menghubungkan ke sistem...</p>
        </div>
      </div>
    );
  }

  // --- Animation Variants ---
  const fadeIn = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: { duration: 0.2 }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen text-slate-900 pb-28 overflow-x-hidden font-sans selection:bg-indigo-200">
      {/* Demo Mode Banner */}
      {isDemoMode && (
        <div className="bg-amber-500 text-white text-center py-2 px-4 text-xs font-bold shadow-lg relative z-50">
          🎮 DEMO MODE — Data Local
        </div>
      )}

      {/* Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 py-6 pointer-events-none">
        <div className="max-w-md mx-auto flex justify-between items-center pointer-events-auto">
          {/* Logo / Brand */}
          <div onClick={() => setActiveTab('dashboard')} className="cursor-pointer bg-white px-5 py-2 rounded-full shadow-sm flex items-center gap-2.5 transition-transform active:scale-95">
            <Heart size={18} className="fill-blue-600 text-blue-600" /> 
            <span className="font-bold text-sm text-slate-800 tracking-tight">Last Moment.</span>
          </div>

          {/* Admin Toggle with Pending Badge */}
          <div className="flex items-center gap-2">
            {/* Review Button - Show when admin */}
            {isAdmin && (
              <button
                onClick={() => setShowAdminPanel(true)}
                className="flex items-center gap-1.5 bg-blue-500 text-white px-3 py-2 rounded-full text-xs font-bold shadow-sm"
              >
                <Eye size={14} />
                Review
              </button>
            )}
            
            <button 
              onClick={handleAdminToggle}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm relative ${
                isAdmin 
                  ? 'bg-rose-500 text-white shadow-rose-200' 
                  : 'bg-white text-slate-400 hover:text-blue-600'
              }`}
            >
              <Lock size={16} />
              {/* Badge for non-admin showing pending count */}
              {!isAdmin && pendingPayments.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {pendingPayments.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-md mx-auto p-4 space-y-6 pt-24">
        <AnimatePresence mode="wait">
          
          {/* VIEW: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial="initial" animate="animate" exit="exit" variants={fadeIn}
              className="space-y-6"
            >
              {/* Hero Card: Minimalist V2 (Swiss Style) - Compact */}
              <motion.section 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="rounded-2xl bg-blue-600 p-5 text-white relative overflow-hidden shadow-2xl shadow-blue-500/30 group"
              >
                {/* Abstract Background */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/30 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/50 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col gap-3">
                  
                  {/* Top Row */}
                  <div className="flex justify-between items-start">
                    <div className="w-full">
                       <p className="text-blue-100/70 text-xs font-medium tracking-wide mb-0.5">Total Tabungan</p>
                       <h2 className="text-3xl font-light tracking-tight mb-3">
                         Rp {totalTerkumpul.toLocaleString('id-ID')}
                       </h2>
                       
                       {/* Progress Bar */}
                       <div className="w-full pr-14 relative">
                          <div className="w-full bg-black/10 h-1 rounded-full overflow-hidden backdrop-blur-sm">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${persentaseProgres}%` }}
                              transition={{ duration: 1.5, ease: "easeOut" }}
                              className="h-full bg-white/90 rounded-full"
                            />
                          </div>
                       </div>
                    </div>
                    
                    {/* Progress Badge */}
                    <div className="absolute right-0 top-0 bg-white/20 backdrop-blur-md rounded-full px-2.5 py-1 flex items-center gap-1.5 border border-white/10">
                       <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                       <span className="text-[10px] font-bold">{persentaseProgres.toFixed(0)}%</span>
                    </div>
                  </div>

                  {/* Bottom Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-3 mt-1">
                     {/* 1. Target */}
                     <div className="flex flex-col">
                        <span className="text-[9px] text-blue-200 uppercase tracking-wider">Target</span>
                        <span className="text-xs font-bold truncate">2 Juta</span>
                     </div>
                     
                     {/* 2. Iuran */}
                     <div className="flex flex-col border-l border-white/10 pl-3">
                        <span className="text-[9px] text-blue-200 uppercase tracking-wider">Iuran</span>
                        <span className="text-xs font-bold">12k/bln</span>
                     </div>

                     {/* 3. Sisa */}
                     <div className="flex flex-col border-l border-white/10 pl-3">
                        <span className="text-[9px] text-blue-200 uppercase tracking-wider">Sisa Waktu</span>
                        <span className="text-xs font-bold">{hitungCountdown().hari} Hari</span>
                     </div>
                  </div>

                </div>
              </motion.section>

              {/* NEW: Album Card */}
              <motion.section 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="rounded-2xl overflow-hidden h-48 relative shadow-lg group cursor-pointer"
              >
                 <img 
                   src={albumImage} 
                   alt="Our Moments" 
                   className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                 />
                 <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-6">
                    <h3 className="text-white font-bold text-lg">Our Journey</h3>
                    <p className="text-white/70 text-xs">Kumpulan momen bareng sahabat yang bikin kangen.</p>
                 </div>
              </motion.section>

              {/* CTA Upload Card */}
              <motion.section
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 rounded-2xl p-5 shadow-lg shadow-purple-200 relative overflow-hidden"
              >
                {/* Background decoration */}
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                <div className="absolute -left-4 -bottom-4 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">💸</span>
                    <h3 className="text-white font-bold text-lg">Sudah Transfer?</h3>
                  </div>
                  <p className="text-white/80 text-sm mb-4">
                    Upload bukti bayarmu sekarang dan langsung tercatat!
                  </p>
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="w-full bg-white text-purple-600 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-purple-50 transition-colors shadow-lg"
                  >
                    <Upload size={18} />
                    Upload Bukti Bayar
                  </button>
                </div>
              </motion.section>

              {/* Members List (Redesign) */}
              <section className="bg-slate-50/50 backdrop-blur-sm border border-white/60 p-6 rounded-2xl">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-slate-800 text-lg">Monthly Updates</h3>
                      <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        {listSudahBayarBulanIni.length}/{MEMBERS.length}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-medium">Periode {bulanSekarang}</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('history')}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 mt-1"
                  >
                    Lihat Semua <ChevronRight size={14} />
                  </button>
                </div>

                {/* Grouped Member Cards */}
                {(() => {
                  // Prepare member data with status
                  const membersWithStatus = MEMBERS.map((member) => {
                    const nama = member.name;
                    const sudahBayar = listSudahBayarBulanIni.includes(nama);
                    const pendingData = pendingPayments.find(p => p.name === nama && p.month === bulanSekarang);
                    const isPending = !!pendingData;
                    const paymentData = payments.find(p => p.name === nama && p.month === bulanSekarang);
                    const status = sudahBayar ? 'paid' : isPending ? 'pending' : 'unpaid';
                    
                    const getDateInfo = () => {
                      if (status === 'paid' && paymentData?.date) {
                        const d = new Date(paymentData.date);
                        return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                      }
                      if (status === 'pending' && pendingData?.uploadedAt) {
                        const d = pendingData.uploadedAt.toDate ? pendingData.uploadedAt.toDate() : new Date(pendingData.uploadedAt);
                        return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                      }
                      return member.role || 'Member';
                    };
                    
                    return { ...member, nama, status, getDateInfo };
                  });

                  const paidMembers = membersWithStatus.filter(m => m.status === 'paid');
                  const pendingMembers = membersWithStatus.filter(m => m.status === 'pending');
                  const unpaidMembers = membersWithStatus.filter(m => m.status === 'unpaid');

                  const renderMemberCard = (m, index) => (
                    <motion.div 
                      key={m.nama}
                      variants={item}
                      onClick={() => isAdmin && toggleStatusBayar(m.nama)}
                      className={`group relative overflow-hidden p-3 rounded-xl transition-all duration-300 ${
                        m.status === 'paid'
                        ? 'bg-white shadow-sm border border-emerald-100' 
                        : m.status === 'pending'
                        ? 'bg-amber-50/50 border border-amber-100'
                        : 'bg-slate-50 border border-slate-200'
                      } ${isAdmin ? 'cursor-pointer active:scale-[0.99]' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                            m.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-600' 
                              : m.status === 'pending'
                              ? 'bg-amber-100 text-amber-600'
                              : 'bg-slate-200 text-slate-400'
                          }`}>
                            {m.nama.charAt(0)}
                          </div>
                          <div>
                            <p className={`text-sm font-bold ${m.status === 'paid' ? 'text-slate-800' : m.status === 'pending' ? 'text-amber-800' : 'text-slate-500'}`}>{m.nama}</p>
                            <p className="text-[10px] font-medium text-slate-400">{m.getDateInfo()}</p>
                          </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          m.status === 'paid'
                            ? 'bg-emerald-500 text-white' 
                            : m.status === 'pending'
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-200 text-slate-400'
                        }`}>
                          {m.status === 'paid' ? <CheckCircle2 size={12} /> : m.status === 'pending' ? <Clock size={12} /> : <Circle size={10} />}
                        </div>
                      </div>
                    </motion.div>
                  );

                  return (
                    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
                      {/* Sudah Bayar Section */}
                      {paidMembers.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Sudah Bayar</span>
                            <span className="text-[10px] text-slate-400">({paidMembers.length})</span>
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                            {paidMembers.map(renderMemberCard)}
                          </div>
                        </div>
                      )}

                      {/* Menunggu Verifikasi Section */}
                      {pendingMembers.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Menunggu Verifikasi</span>
                            <span className="text-[10px] text-slate-400">({pendingMembers.length})</span>
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                            {pendingMembers.map(renderMemberCard)}
                          </div>
                        </div>
                      )}

                      {/* Belum Bayar Section */}
                      {unpaidMembers.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Belum Bayar</span>
                            <span className="text-[10px] text-slate-400">({unpaidMembers.length})</span>
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                            {unpaidMembers.map(renderMemberCard)}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })()}
              </section>
            </motion.div>
          )}

          {/* VIEW: TRIP */}
          {activeTab === 'trip' && (
            <motion.div 
              key="trip"
              initial="initial" animate="animate" exit="exit" variants={fadeIn}
              className="space-y-6"
            >
              {/* Destination Header */}
              <section className="glass rounded-2xl p-8 relative overflow-hidden text-center">
                 <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-white/20 z-0"></div>
                 <div className="relative z-10 flex flex-col items-center">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-blue-500 shadow-xl shadow-blue-100 mb-6 relative">
                       <div className="absolute inset-0 bg-blue-50 rounded-full animate-ping opacity-20"></div>
                       <Map size={28} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-2">Trip Destination</h2>
                    <p className="text-slate-400 text-sm font-medium">Mau kemana kita?</p>
                 </div>
              </section>

              {/* Voting / Status Card */}
              <section className="glass rounded-2xl p-6 border-l-4 border-l-amber-400">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-amber-50 rounded-xl">
                    <AlertCircle size={20} className="text-amber-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 mb-1">Status: Planning</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Lokasi dan itinerary sedang digodok oleh <strong className="text-slate-700">Fakhrul</strong>. 
                      Stay tuned untuk voting destinasi!
                    </p>
                  </div>
                </div>
              </section>

              {/* Wishlist Placeholder */}
              <section className="glass rounded-2xl p-6 opacity-70 grayscale hover:grayscale-0 transition-all cursor-not-allowed">
                  <div className="flex justify-between items-center mb-4">
                     <h3 className="font-bold text-slate-400 flex items-center gap-2">
                        <Heart size={16} /> Wishlist
                     </h3>
                     <span className="text-[10px] font-bold bg-slate-100 px-2 py-1 rounded text-slate-400">LOCKED</span>
                  </div>
                  <div className="h-20 bg-slate-50 rounded-2xl flex items-center justify-center border border-dashed border-slate-200 text-xs text-slate-400">
                      Akan dibuka setelah dana terkumpul 50%
                  </div>
              </section>
            </motion.div>
          )}

          {/* VIEW: INFO PROYEK */}
          {activeTab === 'info' && (
            <motion.div 
              key="info"
              initial="initial" animate="animate" exit="exit" variants={fadeIn}
              className="space-y-6"
            >
              <section className="glass rounded-2xl p-8 relative overflow-hidden">
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center text-white mb-6 shadow-lg shadow-blue-200">
                    <Heart size={28} fill="currentColor" />
                  </div>
                  <h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tight leading-tight">
                    Project<br /><span className="text-blue-500">Last Moment.</span>
                  </h2>
                  <div className="space-y-5 text-slate-600 text-sm leading-relaxed">
                    <p>
                      Membangun kenangan sebelum jalan kita berbeda. Tabungan ini adalah janji dari 
                      <strong className="text-blue-500"> 8 sahabat</strong> untuk satu perjalanan terakhir yang tak terlupakan.
                    </p>
                    <div className="bg-blue-50/50 backdrop-blur-sm border-l-4 border-blue-400 p-5 rounded-r-xl italic text-blue-900 font-medium">
                      "One last trip, for a lifetime of stories. Before we chase our own dreams."
                    </div>
                  </div>
                </div>
                {/* Decoration */}
                <div className="absolute top-0 right-0 p-8 opacity-5">
                   <Users size={120} />
                </div>
              </section>

               <section className="glass rounded-2xl p-6">
                <h3 className="font-bold text-slate-400 uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
                  <Users size={14} /> The Squad
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  {MEMBERS.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-4 group">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400 text-xs group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
                        {idx+1}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">{m.name}</p>
                        <p className="text-[10px] font-black text-blue-400 uppercase">{m.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </motion.div>
          )}

          {/* VIEW: HISTORY */}
           {activeTab === 'history' && (
            <motion.div 
               key="history"
               initial="initial" animate="animate" exit="exit" variants={fadeIn}
               className="h-[80vh]" // Container height
            >
               <div className="glass h-full rounded-2xl flex flex-col overflow-hidden">
                  <div className="p-6 border-b border-blue-50 bg-white/50 backdrop-blur-xl z-10">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-black text-slate-800">Riwayat Setoran</h3>
                        <p className="text-xs text-slate-400 mt-1">Semua transaksi tercatat rapi.</p>
                      </div>
                      {/* Month Filter Dropdown */}
                      <select
                        value={historyFilter}
                        onChange={(e) => setHistoryFilter(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">Semua Bulan</option>
                        <option value="Januari 2026">Januari 2026</option>
                        <option value="Februari 2026">Februari 2026</option>
                        <option value="Maret 2026">Maret 2026</option>
                        <option value="April 2026">April 2026</option>
                        <option value="Mei 2026">Mei 2026</option>
                        <option value="Juni 2026">Juni 2026</option>
                        <option value="Juli 2026">Juli 2026</option>
                        <option value="Agustus 2026">Agustus 2026</option>
                        <option value="September 2026">September 2026</option>
                        <option value="Oktober 2026">Oktober 2026</option>
                        <option value="November 2026">November 2026</option>
                        <option value="Desember 2026">Desember 2026</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {(() => {
                      const filteredPayments = historyFilter === 'all' 
                        ? payments 
                        : payments.filter(p => p.month === historyFilter);
                      
                      if (filteredPayments.length === 0) {
                        return (
                          <div className="flex flex-col items-center justify-center h-64 text-center">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-4">
                               <History size={32} />
                            </div>
                            <p className="text-slate-400 font-medium text-sm">
                              {historyFilter === 'all' ? 'Belum ada data.' : `Tidak ada data untuk ${historyFilter}`}
                            </p>
                          </div>
                        );
                      }
                      
                      return filteredPayments
                        .sort((a, b) => b.timestamp - a.timestamp)
                        .map((p, i) => (
                          <motion.div 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            key={p.id} 
                            className="flex justify-between items-center p-4 bg-white/60 hover:bg-white rounded-xl border border-slate-100 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shadow-sm">
                                  <Coins size={18} className="text-blue-500" />
                               </div>
                               <div>
                                  <p className="text-sm font-bold text-slate-700">{p.name}</p>
                                  <p className="text-[10px] text-slate-400 font-medium">
                                    {new Date(p.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} • {new Date(p.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                               </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-black text-emerald-600">+12k</p>
                              <span className="text-[9px] font-bold bg-slate-100 px-2 py-0.5 rounded-full text-slate-400 uppercase inline-block mt-1">
                                {p.month.split(' ')[0]}
                              </span>
                            </div>
                          </motion.div>
                        ));
                    })()}
                  </div>
               </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* --- MODALS --- */}
      
      {/* Payment Modal */}
      <AnimatePresence>
        {activeTab === 'payment' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveTab('dashboard')}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-end justify-center sm:items-center sm:p-4"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/90 backdrop-blur-xl w-full max-w-md sm:rounded-2xl rounded-t-3xl p-8 shadow-2xl border border-white/20"
            >
              <div className="w-12 h-1.5 bg-slate-300/50 rounded-full mx-auto mb-8 sm:hidden"></div>
              
              <div className="text-center mb-8">
                <h3 className="text-2xl font-black text-slate-800">Scan QRIS</h3>
                <p className="text-slate-400 text-sm mt-1">Transfer gampang, hidup tenang.</p>
              </div>

              {/* QR Code Frame */}
              <div className="bg-white p-3 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.08)] border border-slate-100 mx-auto w-fit mb-8 transform hover:scale-[1.02] transition-transform duration-300">
                <div className="relative overflow-hidden rounded-xl">
                   {/* Shine Effect */}
                   <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/40 to-white/0 z-20 pointer-events-none w-full h-full -skew-x-12 translate-x-[-200%] animate-[shine_3s_infinite]"></div>
                   <img 
                      src="/qris-gopay.png" 
                      alt="QRIS GoPay" 
                      className="w-full max-w-[280px] h-auto object-contain mix-blend-multiply" 
                   />
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    setActiveTab('dashboard');
                    setShowUploadModal(true);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-full font-bold text-sm shadow-lg shadow-blue-200 hover:shadow-blue-300 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2"
                >
                  📤 Upload Bukti Transfer
                </button>
                <button 
                  onClick={() => setActiveTab('dashboard')}
                  className="w-full py-3 text-slate-400 font-medium hover:text-slate-600 transition-colors text-xs"
                >
                  Kembali
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PIN Modal */}
      <AnimatePresence>
        {showPinModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-xs rounded-3xl p-8 relative shadow-2xl"
            >
              <button 
                onClick={() => setShowPinModal(false)}
                className="absolute top-5 right-5 p-2 text-slate-300 hover:text-slate-500 rounded-full hover:bg-slate-50 transition-colors"
              >
                <X size={24} />
              </button>
              
              <div className="text-center mb-8 mt-2">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl flex items-center justify-center text-blue-500 mx-auto mb-4 shadow-inner">
                  <Lock size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-800">Security Check</h3>
              </div>
              
              <div className="space-y-4">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value.replace(/\D/g, ''));
                    setPinError(false);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
                  placeholder="••••"
                  className={`w-full text-center text-3xl font-black tracking-[0.5em] py-5 border-2 rounded-xl outline-none transition-all placeholder:tracking-widest ${
                    pinError 
                      ? 'border-rose-300 bg-rose-50 text-rose-500 animate-shake' 
                      : 'border-slate-100 bg-slate-50 focus:border-blue-500 focus:bg-white focus:shadow-lg'
                  }`}
                  autoFocus
                />
                
                <button 
                  onClick={handlePinSubmit}
                  disabled={pinInput.length < 4}
                  className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 group"
                >
                  Unlock Access <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Floating Navigation */}
      <div className="fixed bottom-8 left-0 right-0 z-40 pointer-events-none px-4">
        <nav className="w-full max-w-md mx-auto bg-white p-2 rounded-[2.5rem] shadow-[0_20px_50px_rgba(8,112,184,0.15)] ring-1 ring-slate-100 border border-white/50 flex justify-between items-center pointer-events-auto relative">
          
          {/* Active Background Pill (Absolute Positioned) */}
          {/* Note: In a real advanced setup we'd calculate x/width, but for simple grid we'll use individual button backgrounds or simple color transitions. 
              Let's use a cleaner approach: Icons only, active state has a glowing dot and color change. */}

          {/* 1. Dashboard */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-12 h-12 rounded-full flex flex-col items-center justify-center transition-all duration-300 ${
              activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-300 hover:text-slate-400'
            }`}
          >
            <TrendingUp size={24} strokeWidth={activeTab === 'dashboard' ? 2.5 : 2} />
            {activeTab === 'dashboard' && (
              <motion.div layoutId="nav-dot" className="w-1 h-1 bg-blue-600 rounded-full mt-1" />
            )}
          </button>

          {/* 2. Trip */}
          <button
            onClick={() => setActiveTab('trip')}
            className={`w-12 h-12 rounded-full flex flex-col items-center justify-center transition-all duration-300 ${
              activeTab === 'trip' ? 'text-blue-600' : 'text-slate-300 hover:text-slate-400'
            }`}
          >
            <Map size={24} strokeWidth={activeTab === 'trip' ? 2.5 : 2} />
            {activeTab === 'trip' && (
              <motion.div layoutId="nav-dot" className="w-1 h-1 bg-blue-600 rounded-full mt-1" />
            )}
          </button>

          {/* 3. QR Payment (Floating Center) */}
          <div className="relative -mt-8">
            <motion.button 
              whileHover={{ scale: 1.05, rotate: 90 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab('payment')}
              className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-blue-500 rounded-full shadow-lg shadow-blue-500/40 flex items-center justify-center text-white border-4 border-[#f8fafc] z-20"
            >
              <QrCode size={26} />
            </motion.button>
          </div>

          {/* 4. History */}
          <button
            onClick={() => setActiveTab('history')}
            className={`w-12 h-12 rounded-full flex flex-col items-center justify-center transition-all duration-300 ${
              activeTab === 'history' ? 'text-blue-600' : 'text-slate-300 hover:text-slate-400'
            }`}
          >
            <History size={24} strokeWidth={activeTab === 'history' ? 2.5 : 2} />
            {activeTab === 'history' && (
              <motion.div layoutId="nav-dot" className="w-1 h-1 bg-blue-600 rounded-full mt-1" />
            )}
          </button>

          {/* 5. Info */}
          <button
            onClick={() => setActiveTab('info')}
            className={`w-12 h-12 rounded-full flex flex-col items-center justify-center transition-all duration-300 ${
              activeTab === 'info' ? 'text-blue-600' : 'text-slate-300 hover:text-slate-400'
            }`}
          >
            <Info size={24} strokeWidth={activeTab === 'info' ? 2.5 : 2} />
            {activeTab === 'info' && (
              <motion.div layoutId="nav-dot" className="w-1 h-1 bg-blue-600 rounded-full mt-1" />
            )}
          </button>

        </nav>
      </div>

      {/* V2: Upload Modal */}
      <UploadModal 
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        currentMonth={bulanSekarang}
      />

      {/* V2: Admin Panel for reviewing/rejecting payments */}
      <AdminPanel 
        isOpen={showAdminPanel}
        onClose={() => setShowAdminPanel(false)}
        payments={payments}
        onReject={(payment) => {
          // Payment will be removed from payments via Firebase real-time listener
        }}
      />

    </div>
  );
}
