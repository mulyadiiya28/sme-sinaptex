# Specification: Splash Screen & Activation System

**Status:** ⏭️ Development Phase  
**Fitur:** P2 - Branding & Licensing  
**Estimasi:** 2-3 minggu

---

## 📋 Overview

### Masalah
- Aplikasi tidak punya splash screen saat startup
- Tidak ada copyright/license notice
- Tidak ada activation key system (bisa dipakai sembarangan)
- Tidak ada proteksi "tidak bisa digunakan sekali"

### Solusi
1. **Splash Screen** — Tampil saat aplikasi load (logo toko + loading)
2. **Copyright & Legal** — Halaman syarat & ketentuan di pertama kali buka
3. **Activation Key** — Kunci aktivasi satu kali pakai
4. **License Validation** — Validasi key + expiration date

---

## 🎯 Requirements

### User Stories

1. **AS A** pemilik toko  
   **I WANT TO** melihat splash screen saat buka aplikasi  
   **SO THAT** ada branding & feedback saat loading

2. **AS A** pemilik toko  
   **I WANT TO** melihat copyright & syarat & ketentuan  
   **SO THAT** tahu hak & kewajiban pakai aplikasi

3. **AS A** pemilik toko  
   **I WANT TO** aktivasi aplikasi dengan key  
   **SO THAT** aplikasi sah & berfungsi penuh

4. **AS A** IT admin  
   **I WANT TO** key tidak bisa dipakai lagi setelah aktivasi  
   **SO THAT** tidak bisa dipakai di komputer lain

---

## 🏗️ Architecture

### Database Schema (New)

```typescript
// Table: activations
{
  id: string;           // UUID
  key: string;          // Activation key (hashed)
  hashedKey: string;    // SHA-256 hash
  createdAt: string;    // Timestamp
  usedAt: string|null;  // Timestamp (null = belum dipakai)
  usedBy: string|null;  // Machine ID / Device fingerprint
  machineId: string|null;  // Hardware hash
  deviceName: string|null; // Name of device
  expiresAt: string|null;  // Optional expiration
  isActive: boolean;      // Status
}

// Table: licenses
{
  id: string;
  activationId: string;
  licenseType: 'starter' | 'professional' | 'enterprise';
  maxUsers: number;
  maxBranches: number;
  features: string[];  // Array of feature flags
  createdAt: string;
  expiresAt: string;
  isActive: boolean;
}

// Table: system_settings (new fields)
{
  id: string;
  key: string;
  value: string;
  type: 'string' | 'boolean' | 'number';
  // Existing: logo, storeName, storeAddress, dll
  // New:
  'activationKey'?: string;
  'isActivated'?: 'true' | 'false';
  'activatedAt'?: string;
  'machineId'?: string;
  'deviceName'?: string;
}
```

---

## 🔧 Implementation Plan

### Phase 1: Splash Screen (3-5 hari)

#### 1.1 Loading State
```typescript
// hooks/useAppLoading.ts
export function useAppLoading() {
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Simulate loading sequence
    const loadSequence = async () => {
      await new Promise(r => setTimeout(r, 500)); // Initialize
      await new Promise(r => setTimeout(r, 500)); // Load config
      await new Promise(r => setTimeout(r, 500)); // Check activation
      setIsLoading(false);
    };
    loadSequence();
  }, []);
  
  return isLoading;
}
```

#### 1.2 Splash Component
```typescript
// components/splash-screen.tsx
export function SplashScreen() {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    // Animate progress
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + Math.floor(Math.random() * 15);
      });
    }, 200);
    
    return () => clearInterval(timer);
  }, []);
  
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-600 to-blue-800 flex flex-col items-center justify-center z-50">
      {/* Logo */}
      <div className="mb-8">
        <img src="/logo-large.png" alt="POS-Sinaptex" className="w-32 h-32 object-contain" />
      </div>
      
      {/* App Name */}
      <h1 className="text-4xl font-bold text-white mb-2">POS-Sinaptex</h1>
      <p className="text-blue-200">Smart Retail Operations & Accounting</p>
      
      {/* Loading Bar */}
      <div className="w-64 mt-8">
        <div className="flex justify-between text-sm text-blue-200 mb-2">
          <span>Memuat...</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 bg-blue-400 rounded-full overflow-hidden">
          <div 
            className="h-full bg-orange-400 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      
      {/* Status Text */}
      <div className="mt-4 text-blue-200 text-sm animate-pulse">
        {progress < 30 && "Memuat konfigurasi..."}
        {progress >= 30 && progress < 60 && "Mengecek lisensi..."}
        {progress >= 60 && progress < 90 && "Menghubung ke server..."}
        {progress >= 90 && "Siap digunakan..."}
      </div>
    </div>
  );
}
```

#### 1.3 Root Layout
```typescript
// app/layout.tsx
import { SplashScreen } from '@/components/splash-screen';
import { useAppLoading } from '@/hooks/useAppLoading';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isLoading = useAppLoading();
  
  return (
    <html lang="id">
      <head>
        <title>POS-Sinaptex</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        {isLoading && <SplashScreen />}
        {!isLoading && children}
      </body>
    </html>
  );
}
```

---

### Phase 2: Terms & Conditions (2-3 hari)

#### 2.1 Terms Component
```typescript
// components/legal/terms-dialog.tsx
'use client';

import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';

export function TermsDialog({ 
  isOpen, 
  onAccept 
}: { 
  isOpen: boolean; 
  onAccept: () => void; 
}) {
  const [accepted, setAccepted] = useState(false);
  
  const handleAccept = () => {
    if (accepted) {
      onAccept();
    }
  };
  
  return (
    <Dialog isOpen={isOpen} onClose={() => {}}>
      <div className="max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Syarat & Ketentuan
          </h2>
          <button 
            onClick={handleAccept}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Saya Setuju
          </button>
        </div>
        
        {/* Terms Content */}
        <div className="space-y-6 text-gray-700">
          <section>
            <h3 className="font-bold text-lg mb-2">1. Pendahuluan</h3>
            <p>
              Dengan menggunakan aplikasi POS-Sinaptex ("Aplikasi"), Anda 
              (Pengguna) menyetujui seluruh ketentuan yang tercantum dalam 
              dokumen ini.
            </p>
          </section>
          
          <section>
            <h3 className="font-bold text-lg mb-2">2. Hak Kepemilikan Intelektual</h3>
            <p>
              Seluruh hak cipta, paten, merek dagang, dan hak kekayaan 
              intelektual lainnya atas Aplikasi adalah milik PT Sinaptex Teknologi.
            </p>
            <div className="mt-4 p-4 bg-gray-100 rounded-lg">
              <p className="font-semibold">
                © 2026 PT Sinaptex Teknologi. All rights reserved.
              </p>
              <p className="text-sm text-gray-600 mt-1">
                POS-Sinaptex is a registered trademark of PT Sinaptex Teknologi.
              </p>
            </div>
          </section>
          
          <section>
            <h3 className="font-bold text-lg mb-2">3. Lisensi Penggunaan</h3>
            <p>
              Aplikasi ini dilisensikan berdasarkan jenis lisensi yang Anda 
              pilih saat aktivasi:
            </p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li><strong>Starter:</strong> 1 workstation, 1 user</li>
              <li><strong>Professional:</strong> 5 workstation, 5 user</li>
              <li><strong>Enterprise:</strong> Unlimited workstation & user</li>
            </ul>
          </section>
          
          <section>
            <h3 className="font-bold text-lg mb-2">4. Kewajiban Pengguna</h3>
            <ul className="list-disc ml-6 space-y-1">
              <li>Tidak mengubah, membalikkan kode aplikasi</li>
              <li>Tidak mendistribusikan ulang aplikasi</li>
              <li>Tidak menggunakan untuk kegiatan ilegal</li>
              <li>Melindungi kredensial akses</li>
            </ul>
          </section>
          
          <section>
            <h3 className="font-bold text-lg mb-2">5. Batasan Tanggung Jawab</h3>
            <p>
              PT Sinaptex Teknologi tidak bertanggung jawab atas:
            </p>
            <ul className="list-disc ml-6 space-y-1">
              <li>Kerugian akibat停机/bug aplikasi</li>
              <li>Kehilangan data akibat kesalahan pengguna</li>
              <li>Konsekuensi pelanggaran lisensi</li>
            </ul>
          </section>
          
          <section>
            <h3 className="font-bold text-lg mb-2">6. Pemberhentian Lisensi</h3>
            <p>
              Lisensi dapat dihentikan jika:
            </p>
            <ul className="list-disc ml-6 space-y-1">
              <li>Pelanggaran ketentuan lisensi</li>
              <li>Pembayaran tidak diterima</li>
              <li>Aktivasi ilegal terdeteksi</li>
            </ul>
          </section>
          
          <section>
            <h3 className="font-bold text-lg mb-2">7. Kontak</h3>
            <p>
              Untuk pertanyaan lisensi, hubungi:
            </p>
            <div className="mt-4 p-4 bg-gray-100 rounded-lg">
              <p><strong>PT Sinaptex Teknologi</strong></p>
              <p>Jl. Merdeka No. 10, Jakarta Selatan</p>
              <p>Email: license@sinaptex.id</p>
              <p>Phone: +62 21 1234 5678</p>
            </div>
          </section>
        </div>
        
        {/* Checkbox & Button */}
        <div className="mt-6">
          <label className="flex items-center space-x-2">
            <input 
              type="checkbox" 
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-700">
              Saya telah membaca, memahami, dan menyetujui seluruh 
              syarat & ketentuan di atas
            </span>
          </label>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button 
            onClick={handleAccept}
            disabled={!accepted}
            className={`
              px-6 py-2 rounded-lg font-semibold
              ${accepted 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'}
            `}
          >
            Saya Setuju
          </button>
        </div>
      </div>
    </Dialog>
  );
}
```

---

### Phase 3: Activation Key System (4-5 hari)

#### 3.1 Activation Component
```typescript
// components/activation/activation-dialog.tsx
'use client';

import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { toast } from 'react-hot-toast';

export function ActivationDialog({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
}) {
  const [key, setKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'input' | 'verifying' | 'success'>('input');
  
  const handleActivate = async () => {
    if (!key.trim()) {
      toast.error('Key aktivasi tidak boleh kosong');
      return;
    }
    
    setIsLoading(true);
    setStep('verifying');
    
    try {
      const response = await fetch('/api/activation/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, machineId: getMachineId() })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setStep('success');
        toast.success('Aplikasi berhasil diaktifkan!');
        localStorage.setItem('isActivated', 'true');
        localStorage.setItem('licenseType', data.licenseType);
        
        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 2000);
      } else {
        toast.error(data.error || 'Key aktivasi tidak valid');
        setStep('input');
        setKey('');
      }
    } catch (error) {
      toast.error('Gagal menghubung ke server');
      setStep('input');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <div className="max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Aktivasi Aplikasi</h2>
          <p className="text-gray-600 mt-2">Masukkan key aktivasi yang diterima dari PT Sinaptex Teknologi</p>
        </div>
        
        <div className="space-y-4">
          {step === 'input' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Key Aktivasi
              </label>
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value.toUpperCase())}
                placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-center text-lg tracking-widest"
                maxLength={23}
              />
              <p className="text-xs text-gray-500 mt-2 text-center">
                Format: 5 grup 5 huruf/angka (contoh: ABCDE-FGHIJ-KLMNO-PQRST-UVWXY)
              </p>
            </div>
          )}
          
          {step === 'verifying' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Memverifikasi key...</p>
            </div>
          )}
          
          {step === 'success' && (
            <div className="text-center py-8 bg-green-50 rounded-lg">
              <svg className="w-16 h-16 text-green-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-green-700 font-semibold">Aplikasi berhasil diaktifkan!</p>
              <p className="text-sm text-green-600 mt-2">Menghubung ke server...</p>
            </div>
          )}
        </div>
        
        <div className="mt-6">
          <button
            onClick={handleActivate}
            disabled={isLoading || !key}
            className={`
              w-full py-3 px-4 rounded-lg font-semibold transition-colors
              ${isLoading || !key 
                ? 'bg-gray-300 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700'}
            `}
          >
            {isLoading ? 'Mengaktifkan...' : 'Aktifkan'}
          </button>
        </div>
        
        <div className="mt-4 text-center">
          <button 
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Belum punya key? Hubungi PT Sinaptex Teknologi
          </button>
        </div>
      </div>
    </Dialog>
  );
}
```

---

### Phase 4: License Validation (2-3 hari)

#### 4.1 License Service
```typescript
// services/license-service.ts
const LICENSE_KEY_PREFIX = 'POS-SINAPTEX-';

export class LicenseService {
  private static STORAGE_KEY = 'pos-sinaptex-license';
  
  public async validate(): Promise<{
    isValid: boolean;
    licenseType?: string;
    expiresAt?: string;
    error?: string;
  }> {
    // Check local storage
    const cached = localStorage.getItem(LICENSE_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      if (this.isStillValid(data)) {
        return { 
          isValid: true, 
          licenseType: data.licenseType,
          expiresAt: data.expiresAt 
        };
      }
    }
    
    // Fetch from server
    try {
      const response = await fetch('/api/license/validate', {
        headers: {
          'X-Machine-Id': this.getMachineId()
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Cache result
        localStorage.setItem(LICENSE_KEY, JSON.stringify(data));
        return { 
          isValid: true, 
          licenseType: data.licenseType,
          expiresAt: data.expiresAt
        };
      }
      
      return { 
        isValid: false, 
        error: data.error || 'License tidak valid' 
      };
    } catch (error) {
      return { 
        isValid: false, 
        error: 'Gagal menghubung ke server' 
      };
    }
  }
  
  public async activate(key: string): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      const response = await fetch('/api/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          machineId: this.getMachineId()
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem(LICENSE_KEY, JSON.stringify(data));
        return { success: true, message: data.message };
      }
      
      return { 
        success: false, 
        message: data.error || 'Aktivasi gagal' 
      };
    } catch (error) {
      return { 
        success: false, 
        message: 'Gagal menghubung ke server' 
      };
    }
  }
  
  private getMachineId(): string {
    // Generate machine ID from hardware info
    // In production, use hardware fingerprinting
    const machineId = localStorage.getItem('machineId');
    if (machineId) return machineId;
    
    const newId = crypto.randomUUID();
    localStorage.setItem('machineId', newId);
    return newId;
  }
  
  private isStillValid(data: any): boolean {
    if (!data.expiresAt) return true; // No expiry
    
    const expiry = new Date(data.expiresAt);
    return expiry > new Date();
  }
}

export const licenseService = new LicenseService();
```

#### 4.2 Activation Guard
```typescript
// components/activation-guard.tsx
'use client';

import { useEffect, useState } from 'react';
import { ActivationDialog } from './activation/activation-dialog';
import { TermsDialog } from './legal/terms-dialog';
import { useAppLoading } from '@/hooks/useAppLoading';

export function ActivationGuard({ children }: { children: React.ReactNode }) {
  const isLoading = useAppLoading();
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isActivationOpen, setIsActivationOpen] = useState(false);
  const [isActivated, setIsActivated] = useState(false);
  const [hasAgreedTerms, setHasAgreedTerms] = useState(false);
  
  useEffect(() => {
    // Check activation status
    const checkStatus = async () => {
      const terms = localStorage.getItem('termsAgreed');
      const activated = localStorage.getItem('isActivated');
      
      setHasAgreedTerms(terms === 'true');
      setIsActivated(activated === 'true');
      
      // Show dialogs if needed
      if (terms !== 'true') {
        setIsTermsOpen(true);
      } else if (activated !== 'true') {
        setIsActivationOpen(true);
      }
    };
    
    checkStatus();
  }, []);
  
  const handleTermsAccept = () => {
    localStorage.setItem('termsAgreed', 'true');
    setHasAgreedTerms(true);
    setIsTermsOpen(false);
    
    // Check if needs activation
    const activated = localStorage.getItem('isActivated');
    if (activated !== 'true') {
      setIsActivationOpen(true);
    }
  };
  
  const handleActivationSuccess = () => {
    localStorage.setItem('isActivated', 'true');
    setIsActivated(true);
    setIsActivationOpen(false);
  };
  
  // Don't show dialogs while app is loading
  if (isLoading) return null;
  
  return (
    <>
      <TermsDialog 
        isOpen={isTermsOpen} 
        onAccept={handleTermsAccept} 
      />
      
      <ActivationDialog 
        isOpen={isActivationOpen} 
        onClose={() => setIsActivationOpen(false)} 
      />
      
      {children}
    </>
  );
}
```

#### 4.3 Root Wrapper
```typescript
// app/layout.tsx
import { ActivationGuard } from '@/components/activation-guard';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        <ActivationGuard>
          {children}
        </ActivationGuard>
      </body>
    </html>
  );
}
```

---

## 🧪 Testing

### Test Cases

#### TC-1: Splash Screen
1. Launch aplikasi
2. **Expected:** Splash screen muncul dengan logo
3. Progress bar bergerak
4. Setelah load → masuk login screen

#### TC-2: Terms & Conditions
1. Buka aplikasi (pertama kali)
2. **Expected:** Dialog syarat & ketentuan muncul
3. Scroll through terms
4. Centang checkbox "Saya Setuju"
5. Klik "Saya Setuju"
6. **Expected:** Dialog hilang, lanjut ke activator

#### TC-3: Activation Key
1. Masukkan key valid: `ABCDEF-GHIJK-LMNOP-QRSTU-VWXYZ`
2. Klik "Aktifkan"
3. **Expected:** Validasi sukses, aplikasi aktif
4. Reboot aplikasi
5. **Expected:** Langsung masuk login (tidak perlu aktivasi lagi)

#### TC-4: One-Time Use
1. Aktivasi di PC A dengan key X
2. Coba aktivasi di PC B dengan key X yang sama
3. **Expected:** Server reject (key sudah dipakai)
4. Error: "Key sudah pernah digunakan di perangkat lain"

#### TC-5: License Expiry
1. Key dengan masa berlaku (misal: 1 tahun)
2. Setelah expired
3. **Expected:** Aplikasi block atau warning
4. User diminta renew license

---

## 📦 Dependencies

### Frontend
```json
{
  "dependencies": {
    "react-hot-toast": "^2.4.1"
  }
}
```

### Backend (New Endpoints)
```
GET  /api/license/validate
POST /api/license/activate
GET  /api/license/status
```

---

## 🚦 Priority: ⭐⭐⭐⭐ HIGH

**Alasan:**
1. Professional branding (splash screen)
2. Legal protection (copyright, terms)
3. License enforcement (activation key)
4. One-time use (anti-piracy)
5. Client expectation (normal untuk software commercial)

---

**Status:** Ready for development 🚀
