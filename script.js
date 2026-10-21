
/* =====================================
   I & YOU — KOTAK SURAT KITA
   ===================================== */

/*
  Untuk sinkronisasi online, isi URL project
  dan anon/publishable key dari Supabase.
  Jangan pernah masukkan service_role key di sini.
*/

const SUPABASE_URL = "ISI_URL_PROJECT_SUPABASE_DI_SINI";
const SUPABASE_ANON_KEY = "ISI_ANON_PUBLIC_KEY_DI_SINI";

const supabaseReady =
  SUPABASE_URL.startsWith("https://") &&
  SUPABASE_ANON_KEY !== "ISI_ANON_PUBLIC_KEY_DI_SINI" &&
  typeof window.supabase !== "undefined";

const db = supabaseReady
  ? window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY
    )
  : null;

/* Elemen halaman */

const $ = (id) => document.getElementById(id);

let profile = null;
let currentLetter = null;
let letters = [];

/* Pesan informasi */

function showMessage(id, text) {
  const element = $(id);
  if (element) element.textContent = text;
}

/* Penyimpanan lokal untuk mode percobaan */

function getLocalLetters() {
  try {
    return JSON.parse(
      localStorage.getItem("iy_letters") || "[]"
    );
  } catch {
    return [];
  }
}

function saveLocalLetters(data) {
  localStorage.setItem("iy_letters", JSON.stringify(data));
}

/* Profil pengguna */

function saveProfile(name, code) {
  profile = {
    name: name.trim(),
    code: code.trim()
  };

  localStorage.setItem(
    "iy_profile",
    JSON.stringify(profile)
  );
}

function showApp() {
  $("setup").hidden = true;
  $("app").hidden = false;

  $("welcomeName").textContent = profile.name;

  loadLetters();
}

/* Form awal */

$("setupForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const name = $("username").value.trim();
  const code = $("pairCode").value.trim();

  if (!name) {
    showMessage("setupMessage", "Masukkan nama panggilanmu.");
    return;
  }

  if (code.length < 8) {
    showMessage(
      "setupMessage",
      "Kode pasangan harus minimal 8 karakter."
    );
    return;
  }

  saveProfile(name, code);
  showApp();
});

/* Ganti nama atau kode pasangan */

$("changeProfile").addEventListener("click", () => {
  $("app").hidden = true;
  $("setup").hidden = false;

  $("username").value = profile?.name || "";
  $("pairCode").value = profile?.code || "";
});

/* Navigasi tab */

document.querySelectorAll("[data-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    const tab = button.dataset.tab;

    $("inbox").hidden = tab !== "inbox";
    $("write").hidden = tab !== "write";
  });
});

/* Memuat surat */

async function loadLetters() {
  showMessage("inboxMessage", "Memuat surat...");

  try {
    if (db) {
      const { data, error } = await db.rpc("get_letters", {
        p_pair_code: profile.code
      });

      if (error) throw error;

      letters = Array.isArray(data) ? data : [];
    } else {
      letters = getLocalLetters().filter(
        (letter) => letter.code === profile.code
      );
    }

    renderLetters();

    if (db) {
      showMessage(
        "inboxMessage",
        letters.length
          ? ""
          : "Belum ada surat. Kamu bisa memulai ♡"
      );
    } else {
      showMessage(
        "inboxMessage",
        "Mode percobaan: surat tersimpan di browser ini saja."
      );
    }
  } catch (error) {
    console.error(error);

    showMessage(
      "inboxMessage",
      "Gagal memuat surat. Periksa koneksi dan pengaturan Supabase."
    );
  }
}

/* Menampilkan daftar surat */

function renderLetters() {
  const list = $("lettersList");
  list.replaceChildren();

  if (!letters.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "Belum ada surat di sini ♡";
    list.appendChild(empty);
    return;
  }

  [...letters].reverse().forEach((letter) => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "letter-card";

    const title = document.createElement("strong");
    title.textContent = letter.title || "Surat tanpa judul";

    const sender = document.createElement("span");
    sender.textContent = "Dari " + (letter.sender || "Anonim");

    const date = document.createElement("small");
    date.textContent = letter.created_at
      ? new Date(letter.created_at).toLocaleString("id-ID")
      : "";

    button.append(title, sender, date);

    button.addEventListener("click", () => {
      openLetter(letter);
    });

    list.appendChild(button);
  });
}

/* Membuka surat dan balasannya */

function openLetter(letter) {
  currentLetter = letter;

  $("dialogSender").textContent =
    "DARI " + (letter.sender || "Anonim");

  $("dialogTitle").textContent =
    letter.title || "Surat tanpa judul";

  $("dialogDate").textContent = letter.created_at
    ? new Date(letter.created_at).toLocaleString("id-ID")
    : "";

  $("dialogBody").textContent = letter.body || "";

  renderReplies(letter.replies || []);

  showMessage("replyMessage", "");

  $("letterDialog").showModal();
}

/* Menampilkan balasan */

function renderReplies(replies) {
  const list = $("repliesList");
  list.replaceChildren();

  if (!replies.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "Belum ada balasan.";
    list.appendChild(empty);
    return;
  }

  replies.forEach((reply) => {
    const card = document.createElement("div");
    card.className = "reply-card";

    const sender = document.createElement("strong");
    sender.textContent = reply.sender || "Anonim";

    const body = document.createElement("p");
    body.textContent = reply.body || "";

    card.append(sender, body);
    list.appendChild(card);
  });
}

/* Menutup surat */

$("closeDialog").addEventListener("click", () => {
  $("letterDialog").close();
});

/* Muat ulang kotak masuk */

$("refreshButton").addEventListener("click", () => {
  loadLetters();
});

/* Mengirim surat baru */

$("letterForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!profile) return;

  const title = $("letterTitle").value.trim();
  const body = $("letterBody").value.trim();

  if (!title || !body) {
    showMessage(
      "writeMessage",
      "Judul dan isi surat tidak boleh kosong."
    );
    return;
  }

  showMessage("writeMessage", "Mengirim surat...");

  try {
    if (db) {
      const { error } = await db.rpc("create_letter", {
        p_pair_code: profile.code,
        p_sender: profile.name,
        p_title: title,
        p_body: body
      });

      if (error) throw error;
    } else {
      const data = getLocalLetters();

      data.push({
        id: Date.now().toString(),
        code: profile.code,
        sender: profile.name,
        title,
        body,
        created_at: new Date().toISOString(),
        replies: []
      });

      saveLocalLetters(data);
    }

    $("letterForm").reset();

    showMessage(
      "writeMessage",
      "Surat berhasil disimpan ♡"
    );

    await loadLetters();
  } catch (error) {
    console.error(error);

    showMessage(
      "writeMessage",
      "Surat gagal dikirim. Periksa pengaturan Supabase."
    );
  }
});

/* Mengirim balasan */

$("replyForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!profile || !currentLetter) return;

  const body = $("replyBody").value.trim();

  if (!body) {
    showMessage("replyMessage", "Tulis balasan terlebih dahulu.");
    return;
  }

  showMessage("replyMessage", "Mengirim balasan...");

  try {
    if (db) {
      const { error } = await db.rpc("reply_to_letter", {
        p_pair_code: profile.code,
        p_letter_id: currentLetter.id,
        p_sender: profile.name,
        p_body: body
      });

      if (error) throw error;
    } else {
      const data = getLocalLetters();

      const letter = data.find(
        (item) =>
          String(item.id) === String(currentLetter.id) &&
          item.code === profile.code
      );

      if (!letter) {
        throw new Error("Surat tidak ditemukan.");
      }

      letter.replies = letter.replies || [];

      letter.replies.push({
        sender: profile.name,
        body,
        created_at: new Date().toISOString()
      });

      saveLocalLetters(data);
    }

    $("replyForm").reset();

    await loadLetters();

    const updatedLetter = letters.find(
      (letter) =>
        String(letter.id) === String(currentLetter.id)
    );

    if (updatedLetter) {
      openLetter(updatedLetter);
      showMessage("replyMessage", "Balasan berhasil disimpan ♡");
    } else {
      showMessage(
        "replyMessage",
        "Balasan tersimpan, tetapi surat perlu dimuat ulang."
      );
    }
  } catch (error) {
    console.error(error);

    showMessage(
      "replyMessage",
      "Balasan gagal dikirim. Periksa pengaturan Supabase."
    );
  }
});

/* Memulihkan profil saat halaman dibuka kembali */

try {
  const savedProfile = JSON.parse(
    localStorage.getItem("iy_profile") || "null"
  );

  if (savedProfile?.name && savedProfile?.code) {
    profile = savedProfile;
    showApp();
  }
} catch (error) {
  console.error("Profil tersimpan tidak dapat dibaca.", error);
  }
