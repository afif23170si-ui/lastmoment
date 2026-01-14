import React, { useState } from 'react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db, appId, isDemoMode } from '../config/firebase';
import { 
  X, 
  CheckCircle, 
  XCircle, 
  Image, 
  Eye,
  ChevronRight,
  Loader2,
  Trash2
} from 'lucide-react';

export default function AdminPanel({ 
  isOpen, 
  onClose, 
  payments, // Now receives all payments with proofUrl 
  onReject 
}) {
  const [selectedProof, setSelectedProof] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  if (!isOpen) return null;

  // Filter payments that have proof (uploaded via the upload feature)
  const paymentsWithProof = payments.filter(p => p.proofUrl);

  const handleReject = async (payment) => {
    setProcessing(payment.id);
    
    try {
      if (isDemoMode) {
        await new Promise(resolve => setTimeout(resolve, 500));
        onReject(payment);
        setProcessing(null);
        setConfirmDelete(null);
        return;
      }

      // Delete from payments collection
      const paymentRef = doc(db, 'artifacts', appId, 'public', 'data', 'payments', payment.id);
      await deleteDoc(paymentRef);

      onReject(payment);
    } catch (err) {
      console.error('Reject error:', err);
    }
    
    setProcessing(null);
    setConfirmDelete(null);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-end justify-center p-0">
      <div className="bg-white w-full max-w-md rounded-t-[3rem] p-8 slide-in-from-bottom max-h-[90vh] overflow-y-auto">
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
        
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-black flex items-center gap-2">
              <Eye className="text-blue-500" size={24} />
              Review Pembayaran
            </h3>
            <p className="text-sm text-slate-500">{paymentsWithProof.length} pembayaran dengan bukti</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
          <p className="text-xs text-blue-600">
            <strong>Auto-Approve aktif!</strong> Pembayaran langsung lunas saat upload. 
            Kamu bisa <span className="text-rose-500 font-bold">reject</span> di sini kalau ada yang aneh.
          </p>
        </div>

        {/* Payments List */}
        {paymentsWithProof.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-slate-300" />
            </div>
            <p className="text-slate-400 font-medium">Belum ada upload</p>
            <p className="text-xs text-slate-300 mt-1">Pembayaran dengan bukti akan muncul di sini</p>
          </div>
        ) : (
          <div className="space-y-3">
            {paymentsWithProof.map((payment) => (
              <div 
                key={payment.id}
                className="bg-slate-50 border border-slate-100 rounded-2xl p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-bold text-slate-700">{payment.name}</p>
                    <p className="text-xs text-slate-500">
                      {payment.month} • {new Date(payment.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-1 rounded-full uppercase">
                    Lunas
                  </span>
                </div>

                {/* Proof Preview Button */}
                <button
                  onClick={() => setSelectedProof(payment.proofUrl)}
                  className="w-full flex items-center justify-between bg-white p-3 rounded-xl border border-slate-100 mb-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Image size={18} className="text-blue-500" />
                    <span className="font-medium">Lihat Bukti Transfer</span>
                  </div>
                  <ChevronRight size={18} className="text-slate-400" />
                </button>

                {/* Reject Button */}
                {confirmDelete === payment.id ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="py-3 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm"
                    >
                      Batal
                    </button>
                    <button
                      onClick={() => handleReject(payment)}
                      disabled={processing === payment.id}
                      className="flex items-center justify-center gap-1 py-3 rounded-xl bg-rose-500 text-white font-bold text-sm disabled:opacity-50"
                    >
                      {processing === payment.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <>
                          <Trash2 size={14} />
                          Ya, Hapus
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(payment.id)}
                    className="w-full flex items-center justify-center gap-1 py-2.5 rounded-xl border border-rose-200 text-rose-500 font-medium text-sm hover:bg-rose-50 transition-colors"
                  >
                    <XCircle size={14} />
                    Reject Pembayaran
                  </button>
                )}
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
