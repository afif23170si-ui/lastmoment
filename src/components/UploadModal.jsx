import React, { useState, useRef, useMemo } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, appId, isDemoMode } from '../config/firebase';
import { MEMBERS, IURAN_PER_BULAN } from '../data/members';
import imageCompression from 'browser-image-compression';
import { X, Upload, Image, CheckCircle, Loader2, AlertCircle, ChevronDown, Calendar } from 'lucide-react';

// Cloudinary Configuration
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

export default function UploadModal({ isOpen, onClose, currentMonth }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [selectedName, setSelectedName] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState(currentMonth);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  // Generate all period options from Jan 2026 to Dec 2027
  const periodOptions = useMemo(() => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const options = [];
    for (let year = 2026; year <= 2027; year++) {
      for (let monthIdx = 0; monthIdx < 12; monthIdx++) {
        options.push(`${months[monthIdx]} ${year}`);
      }
    }
    return options;
  }, []);

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

    // Check if Cloudinary is configured
    if ((!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) && !isDemoMode) {
      setError('Cloudinary belum dikonfigurasi. Hubungi admin.');
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

      setUploadProgress(30);

      // Upload to Cloudinary
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', 'lastmoment');

      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
      
      const response = await fetch(cloudinaryUrl, {
        method: 'POST',
        body: formData
      });

      setUploadProgress(60);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Upload failed');
      }

      const result = await response.json();
      const imageUrl = result.secure_url;
      
      setUploadProgress(80);

      // Auto-approve: Save directly to payments collection
      const paymentsRef = collection(db, 'artifacts', appId, 'public', 'data', 'payments');
      await addDoc(paymentsRef, {
        name: selectedName,
        month: selectedPeriod,
        amount: IURAN_PER_BULAN,
        date: new Date().toISOString(),
        proofUrl: imageUrl, // Keep proof URL so admin can review/reject if needed
        status: 'paid'
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
    setSelectedPeriod(currentMonth);
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
            <p className="text-sm text-slate-500">Periode: <span className="font-bold text-slate-700">{selectedPeriod}</span></p>
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

            {/* Name & Period - Compact Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Name Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Nama</label>
                <div className="relative">
                  <select
                    value={selectedName}
                    onChange={(e) => setSelectedName(e.target.value)}
                    disabled={uploading}
                    className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-medium focus:border-blue-500 outline-none disabled:opacity-50 appearance-none"
                  >
                    <option value="">Pilih...</option>
                    {MEMBERS.map((m) => (
                      <option key={m.name} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Period Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Periode</label>
                <div className="relative">
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    disabled={uploading}
                    className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-medium focus:border-blue-500 outline-none disabled:opacity-50 appearance-none"
                  >
                    {periodOptions.map((period) => (
                      <option key={period} value={period}>{period}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
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
              className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-full font-bold text-sm shadow-lg shadow-slate-200 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
