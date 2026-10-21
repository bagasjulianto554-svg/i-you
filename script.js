
const SUPABASE_URL = "ISI_URL_PROJECT_SUPABASE_DI_SINI";
const SUPABASE_ANON_KEY = "ISI_ANON_PUBLIC_KEY_DI_SINI";

const configured =
  SUPABASE_URL.startsWith("https://") &&
  SUPABASE_ANON_KEY !== "ISI_ANON_PUBLIC_KEY_DI_SINI";

const db = configured
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const $ = (id) => document.getElementById(id);

let profile = null;
let currentLetter = null;
let letters = [];

function message(id, text) {
  $(id).textContent = text;
}

function getLocalLetters() {
  try {
    return JSON.parse(localStorage.getItem("iy_letters") || "[]");
  } catch {
    return [];
  }
}

function saveLocalLetters(data) {
  localStorage.setItem("iy_letters", JSON.stringify(data));
}

function showApp() {
  $("setup").hidden = true;
  $("app").hidden = false;
  $("welcomeName").textContent = profile.name;
  loadLetters();
}

$("setupForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = $("username").value.trim();
  const code = $("pairCode").value.trim();

  if (!name || code.length < 8) {
    message("setupMessage", "Isi nama dan kode minimal 8 karakter.");
    return;
  }

  profile = { name, code };
  localStorage.setItem("iy_profile", JSON.stringify(profile));
  showApp();
});

$("changeProfile").addEventListener("click", () => {
  $("app").hidden = true;
  $("setup").hidden = false;
  $("username").value = profile?.name || "";
  $("pairCode").value = profile?.code || "";
});

document.querySelectorAll("[data-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    const tab = button.dataset.tab;
    $("inbox").hidden = tab !== "inbox";
    $("write").hidden = tab !== "write";
  });
});

async function loadLetters() {
  message("inboxMessage", "Memuat surat...");

  try {
    if (db) {
      const { data, error } = await db.rpc("get_letters", {
        p_pair_code: profile.code
      });

      if (error) throw error;
      letters = data || [];
    } else {
      letters = getLocalLetters().filter(
        (letter) => letter.code === profile.code
      );
    }

    renderLetters();
    message(
      "inboxMessage",
      db
        ? letters.length ? "" : "Belum ada surat. Kamu bisa memulai ♡"
        : "Mode percobaan: surat hanya tersimpan di HP ini."
    );
  } catch (error) {
    message("inboxMessage", "Gagal memuat surat: " + error.message);
  }
}

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
    button.addEventListener("click", () => openLetter(letter));
    list.appendChild(button);
  });
}

function openLetter(letter) {
  currentLetter = letter;
  $("dialogSender").textContent = "DARI " + letter.sender;
  $("dialogTitle").textContent = letter.title;
  $("dialogDate").textContent = letter.created_at
    ? new Date(letter.created_at).toLocaleString("id-ID")
    : "";
  $("dialogBody").textContent = letter.body;
  renderReplies(letter.replies || []);
  $("replyMessage").textContent = "";
  $("letterDialog").showModal();
}

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

$("closeDialog").addEventListener("click", () => {
  $("letterDialog").close();
});

$("refreshButton").addEventListener("click", loadLetters);

$("letterForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const title = $("letterTitle").value.trim();
  const body = $("letterBody").value.trim();

  if (!title || !body) return;

  message("writeMessage", "Mengirim surat...");

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
    message("writeMessage", "Surat berhasil disimpan ♡");
    await loadLetters();
  } catch (error) {
    message("writeMessage", "Gagal mengirim: " + error.message);
  }
});

$("replyForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentLetter) return;

  const body = $("replyBody").value.trim();
  if (!body) return;

  message("replyMessage", "Mengirim balasan...");

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
          item.id === currentLetter.id &&
          item.code === profile.code
      );

      if (!letter) throw new Error("Surat tidak ditemukan.");

      letter.replies = letter.replies || [];
      letter.replies.push({
        sender: profile.name,
        body,
        created_at: new Date().toISOString()
      });

      saveLocalLetters(data);
    }

    $("replyForm").reset();
    message("replyMessage", "Balasan berhasil disimpan ♡");
    await loadLetters();

    const updated = letters.find(
      (letter) => String(letter.id) === String(currentLetter.id)
    );

    if (updated) openLetter(updated);
  } catch (error) {
    message("replyMessage", "Gagal membalas: " + error.message);
  }
});

try {
  const saved = JSON.parse(localStorage.getItem("iy_profile") || "null");

  if (saved?.name && saved?.code) {
    profile = saved;
    showApp();
  }
} catch {
  // Abaikan profil tersimpan yang tidak terbaca.
}
