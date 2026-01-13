import React, { useState, useRef } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db, appId, isDemoMode } from '../config/firebase';
import { MEMBERS, IURAN_PER_BULAN } from '../data/members';
import imageCompression from 'browser-image-compression';
import { X, Upload, Image, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

export default function UploadModal({ isOpen, onClose, currentMonth }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [selectedName, setSelectedName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('File harus berupa gambar (JPG, PNG)');
      return;
    }

    setError('');
    
    // Compress image before preview
    try {
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1024,
        useWebWorker: true
      };
      const compressedFile = await imageCompression(file, options);
      setSelectedFile(compressedFile);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(compressedFile);
    } catch (err) {
      console.error('Compression error:', err);
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedName) {
      setError('Pilih gambar dan nama terlebih dahulu');
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      if (isDemoMode) {
        // Demo mode: simulate upload
        await new Promise(resolve => setTimeout(resolve, 1500));
        setUploadProgress(100);
        setSuccess(true);
        setTimeout(() => {
          onClose();
          resetForm();
        }, 1500);
        return;
      }

      // Create unique filename
      const timestamp = Date.now();
      const fileName = `proof_${selectedName.replace(/\s+/g, '_')}_${currentMonth.replace(/\s+/g, '_')}_${timestamp}.jpg`;
      
      setUploadProgress(30);

      // Upload to Firebase Storage
      const storageRef = ref(storage, `proofs/${fileName}`);
      await uploadBytes(storageRef, selectedFile);
      
      setUploadProgress(60);

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      setUploadProgress(80);

      // Save to Firestore pending_payments collection
      const pendingRef = collection(db, 'artifacts', appId, 'public', 'data', 'pending_payments');
      await addDoc(pendingRef, {
        name: selectedName,
        month: currentMonth,
        amount: IURAN_PER_BULAN,
        proofUrl: downloadURL,
        uploadedAt: serverTimestamp(),
        status: 'pending'
      });

      setUploadProgress(100);
      setSuccess(true);
      
      setTimeout(() => {
        onClose();
        resetForm();
      }, 1500);

    } catch (err) {
      console.error('Upload error:', err);
      setError('Gagal upload. Coba lagi.');
      setUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPreview(null);
    setSelectedName('');
    setUploading(false);
    setUploadProgress(0);
    setSuccess(false);
    setError('');
  };

  const handleClose = () => {
    if (!uploading) {
      onClose();
      resetForm();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-end justify-center p-0">
      <div className="bg-white w-full max-w-md rounded-t-[3rem] p-8 slide-in-from-bottom max-h-[90vh] overflow-y-auto">
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
        
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-black">Upload Bukti Transfer</h3>
            <p className="text-sm text-slate-500">Periode: {currentMonth}</p>
          </div>
          <button 
            onClick={handleClose}
            disabled={uploading}
            className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {success ? (
          // Success State
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <CheckCircle size={40} className="text-green-500" />
            </div>
            <h4 className="text-lg font-black text-green-600 mb-2">Bukti Terkirim!</h4>
            <p className="text-sm text-slate-500">Menunggu verifikasi admin</p>
          </div>
        ) : (
          // Upload Form
          <div className="space-y-6">
            {/* Image Upload Area */}
            <div 
              onClick={() => !uploading && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                preview 
                  ? 'border-indigo-300 bg-indigo-50' 
                  : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50'
              } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
              />
              
              {preview ? (
                <div className="space-y-3">
                  <img 
                    src={preview} 
                    alt="Preview" 
                    className="w-full max-h-48 object-contain rounded-xl"
                  />
                  <p className="text-xs text-indigo-600 font-bold">Tap untuk ganti gambar</p>
                </div>
              ) : (
                <div className="py-8">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Image size={32} className="text-slate-400" />
                  </div>
                  <p className="text-sm font-bold text-slate-600 mb-1">Pilih Bukti Transfer</p>
                  <p className="text-xs text-slate-400">JPG, PNG (max 5MB)</p>
                </div>
              )}
            </div>

            {/* Name Dropdown */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Nama Kamu
              </label>
              <select
                value={selectedName}
                onChange={(e) => setSelectedName(e.target.value)}
                disabled={uploading}
                className="w-full p-4 border-2 border-slate-200 rounded-2xl text-sm font-medium focus:border-indigo-500 outline-none disabled:opacity-50"
              >
                <option value="">-- Pilih Nama --</option>
                {MEMBERS.map((m) => (
                  <option key={m.name} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 text-rose-500 text-sm bg-rose-50 p-3 rounded-xl">
                <AlertCircle size={16} />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Upload Progress */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>Mengupload...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleUpload}
              disabled={uploading || !selectedFile || !selectedName}
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Mengupload...
                </>
              ) : (
                <>
                  <Upload size={20} />
                  Kirim Bukti Bayar
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
