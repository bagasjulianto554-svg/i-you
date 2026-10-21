i & you — KOTAK SURAT DIGITAL UNTUK PASANGAN

File:
- index.html: struktur halaman
- style.css: desain dan animasi
- script.js: login, kotak surat bersama, kirim surat, balasan online

PENTING
GitHub Pages hanya menayangkan halaman statis. Supaya surat tersimpan online dan terlihat di dua HP, website ini memakai Firebase. Kamu harus membuat project Firebase dan memasukkan konfigurasi sendiri.

A. SIAPKAN FIREBASE
1. Buka https://console.firebase.google.com/ dan buat project.
2. Di halaman project, klik ikon Web (</>) untuk mendaftarkan aplikasi web.
3. Salin konfigurasi yang diberikan. Buka script.js dan ganti nilai PASTE_... dalam firebaseConfig dengan nilai milik project kamu.
4. Firebase Console → Authentication → Get started → Sign-in method → aktifkan Email/Password.
5. Firebase Console → Firestore Database → Create database.
6. Tab Rules, ganti aturan dengan kode berikut lalu Publish.

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() { return request.auth != null; }
    function member(roomId) {
      return signedIn() &&
        request.auth.uid in get(/databases/$(database)/documents/couples/$(roomId)).data.members;
    }
    match /users/{uid} {
      allow read, write: if signedIn() && request.auth.uid == uid;
    }
    match /couples/{roomId} {
      allow create: if signedIn() &&
        request.resource.data.members.size() == 1 &&
        request.auth.uid in request.resource.data.members;
      allow read: if signedIn() && request.auth.uid in resource.data.members;
      allow update: if signedIn() &&
        request.resource.data.members.size() <= 2 &&
        request.auth.uid in request.resource.data.members &&
        resource.data.members.size() < 2 &&
        request.resource.data.members.hasAll(resource.data.members);
      allow delete: if false;
      match /letters/{letterId} {
        allow read: if member(roomId);
        allow create: if member(roomId) &&
          request.resource.data.senderUid == request.auth.uid &&
          request.resource.data.title is string &&
          request.resource.data.body is string;
        allow update: if member(roomId) &&
          request.resource.data.senderUid == resource.data.senderUid &&
          request.resource.data.title == resource.data.title &&
          request.resource.data.body == resource.data.body &&
          request.resource.data.replies.size() <= resource.data.replies.size() + 1;
        allow delete: if false;
      }
    }
  }
}

Catatan keamanan: aturan ini adalah contoh awal untuk kotak surat pribadi, bukan audit keamanan profesional. Kode kotak surat berfungsi sebagai kode undangan—bagikan hanya kepada pasangan. Untuk layanan lebih luas, buat proses undangan backend yang lebih kuat. Jangan pernah memasukkan private key/service-account key ke file website.

B. UPLOAD KE GITHUB PAGES DARI HP
1. Buka repositori GitHub.
2. Upload index.html, style.css, script.js ke folder utama/root repositori (bukan ke folder lain).
3. Commit changes.
4. Buka Settings → Pages.
5. Pada Build and deployment, pilih Deploy from a branch.
6. Pilih branch main dan folder /(root), lalu Save.
7. Tunggu sampai GitHub Pages menampilkan URL website.

C. CARA PAKAI BERDUA
1. Masing-masing buat akun dengan email sendiri. Jangan berbagi kata sandi.
2. Orang pertama masuk, tekan Buat kotak surat baru, lalu salin kode 10 karakter.
3. Kirim kode tersebut ke pasangan melalui chat pribadi.
4. Pasangan masuk menggunakan akun sendiri, lalu masukkan kode pada Gabung dengan kode.
5. Kalian sekarang dapat mengirim surat, membaca surat masuk, dan membalasnya. Surat tersimpan di Firestore dan muncul di kedua perangkat.

Jika tampil pesan "Lengkapi konfigurasi Firebase", konfigurasi di script.js belum diisi. Jika permission-denied, periksa Firestore Rules. Periksa juga kuota dan pengaturan billing Firebase karena batas layanan dapat berubah.
