import React, { useState } from 'react';
import { doc, updateDoc, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, appId, isDemoMode } from '../config/firebase';
import { IURAN_PER_BULAN } from '../data/members';
import { 
  X, 
  CheckCircle, 
  XCircle, 
  Image, 
  Clock, 
  ChevronRight,
  Loader2,
  AlertTriangle
} from 'lucide-react';

export default function AdminPanel({ 
  isOpen, 
  onClose, 
  pendingPayments, 
  onApprove,
  onReject 
}) {
  const [selectedProof, setSelectedProof] = useState(null);
  const [processing, setProcessing] = useState(null);

  if (!isOpen) return null;

  const handleApprove = async (payment) => {
    setProcessing(payment.id);
    
    try {
      if (isDemoMode) {
        await new Promise(resolve => setTimeout(resolve, 500));
        onApprove(payment);
        setProcessing(null);
        return;
      }

      // Create payment record in payments collection
      const paymentId = `${payment.name}-${payment.month}`.replace(/\s+/g, '-').toLowerCase();
      const paymentRef = doc(db, 'artifacts', appId, 'public', 'data', 'payments', paymentId);
      
      await setDoc(paymentRef, {
        name: payment.name,
        amount: IURAN_PER_BULAN,
        month: payment.month,
        date: new Date().toISOString(),
        timestamp: Date.now(),
        proofUrl: payment.proofUrl,
        verifiedAt: serverTimestamp()
      });

      // Delete from pending_payments
      const pendingRef = doc(db, 'artifacts', appId, 'public', 'data', 'pending_payments', payment.id);
      await deleteDoc(pendingRef);

      onApprove(payment);
    } catch (err) {
      console.error('Approve error:', err);
    }
    
    setProcessing(null);
  };

  const handleReject = async (payment) => {
    setProcessing(payment.id);
    
    try {
      if (isDemoMode) {
        await new Promise(resolve => setTimeout(resolve, 500));
        onReject(payment);
        setProcessing(null);
        return;
      }

      // Delete from pending_payments
      const pendingRef = doc(db, 'artifacts', appId, 'public', 'data', 'pending_payments', payment.id);
      await deleteDoc(pendingRef);

      onReject(payment);
    } catch (err) {
      console.error('Reject error:', err);
    }
    
    setProcessing(null);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-end justify-center p-0">
      <div className="bg-white w-full max-w-md rounded-t-[3rem] p-8 slide-in-from-bottom max-h-[90vh] overflow-y-auto">
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
        
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-black flex items-center gap-2">
              <Clock className="text-amber-500" size={24} />
              Verifikasi Pending
            </h3>
            <p className="text-sm text-slate-500">{pendingPayments.length} menunggu verifikasi</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Pending List */}
        {pendingPayments.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-slate-300" />
            </div>
            <p className="text-slate-400 font-medium">Tidak ada pending</p>
            <p className="text-xs text-slate-300 mt-1">Semua bukti sudah diverifikasi</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingPayments.map((payment) => (
              <div 
                key={payment.id}
                className="bg-amber-50 border border-amber-100 rounded-2xl p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-bold text-slate-700">{payment.name}</p>
                    <p className="text-xs text-slate-500">{payment.month}</p>
                  </div>
                  <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-1 rounded-full uppercase">
                    Pending
                  </span>
                </div>

                {/* Proof Preview Button */}
                <button
                  onClick={() => setSelectedProof(payment.proofUrl)}
                  className="w-full flex items-center justify-between bg-white p-3 rounded-xl border border-amber-100 mb-3 hover:bg-amber-50 transition-colors"
                >
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Image size={18} className="text-amber-500" />
                    <span className="font-medium">Lihat Bukti Transfer</span>
                  </div>
                  <ChevronRight size={18} className="text-slate-400" />
                </button>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleReject(payment)}
                    disabled={processing === payment.id}
                    className="flex items-center justify-center gap-1 py-3 rounded-xl border-2 border-rose-200 text-rose-500 font-bold text-sm hover:bg-rose-50 disabled:opacity-50 transition-colors"
                  >
                    {processing === payment.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <XCircle size={16} />
                        Tolak
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleApprove(payment)}
                    disabled={processing === payment.id}
                    className="flex items-center justify-center gap-1 py-3 rounded-xl bg-green-500 text-white font-bold text-sm hover:bg-green-600 disabled:opacity-50 transition-colors"
                  >
                    {processing === payment.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <CheckCircle size={16} />
                        Approve
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="w-full bg-slate-100 py-4 rounded-2xl font-bold text-slate-600 mt-6 shadow-sm"
        >
          Tutup
        </button>
      </div>

      {/* Proof Image Modal */}
      {selectedProof && (
        <div 
          className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4"
          onClick={() => setSelectedProof(null)}
        >
          <button 
            onClick={() => setSelectedProof(null)}
            className="absolute top-4 right-4 p-3 bg-white/10 rounded-full text-white hover:bg-white/20"
          >
            <X size={24} />
          </button>
          <img 
            src={selectedProof} 
            alt="Bukti Transfer" 
            className="max-w-full max-h-[85vh] object-contain rounded-2xl"
          />
        </div>
      )}
    </div>
  );
}
