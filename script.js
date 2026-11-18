// Guestbook — Firebase Realtime Database
// Leave a note, reply to other people's notes, and blur a note if it's private.
// Your name + color are remembered for as long as this browser tab stays open.

// ---------- Firebase setup ----------
const firebaseConfig = {
  apiKey: "AIzaSyB9teh5KztT8JH1EmaDELTViKaypjBFTTc",
  authDomain: "guest-book-3ae5e.firebaseapp.com",
  projectId: "guest-book-3ae5e",
  storageBucket: "guest-book-3ae5e.firebasestorage.app",
  messagingSenderId: "214285155560",
  appId: "1:214285155560:web:6b91fc159a4eefc68a5d5d",
  databaseURL: "https://guest-book-3ae5e-default-rtdb.firebaseio.com",
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const messagesRef = database.ref("messages"); // every note AND every reply lives here

// ---------- who am I? ----------
// sessionStorage belongs to this one tab: a new tab starts fresh,
// but reloading or replying in the same tab keeps your name.
let me = loadMe();

function loadMe() {
  let saved = null;
  try {
    saved = JSON.parse(sessionStorage.getItem("guestbook-me"));
  } catch (e) {}
  if (!saved) saved = { name: "", color: "#ff2fa0" };
  // a random id for this tab, so you can see your own private notes unblurred
  if (!saved.id) saved.id = Math.random().toString(36).slice(2, 12);
  return saved;
}

function saveMe() {
  try {
    sessionStorage.setItem("guestbook-me", JSON.stringify(me));
  } catch (e) {}
}

// ---------- page elements ----------
const nameInput = document.getElementById("nameInput");
const identityForm = document.getElementById("identityForm");
const identityChip = document.getElementById("identityChip");
const chipName = document.getElementById("chipName");
const colorPicker = document.getElementById("colorPicker");
const noteInput = document.getElementById("noteInput");
const privateCheck = document.getElementById("privateCheck");
const threadsEl = document.getElementById("threads");
const statusEl = document.getElementById("status");

// =====================================================
// Name + color picker
// =====================================================
function setupIdentity() {
  colorPicker.addEventListener("input", () => pickColor(colorPicker.value));

  nameInput.value = me.name;
  nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (lockName()) noteInput.focus();
    }
  });

  document.getElementById("changeName").addEventListener("click", () => {
    identityChip.hidden = true;
    identityForm.hidden = false;
    nameInput.focus();
  });

  pickColor(me.color);
  if (me.name) showChip();
}

function pickColor(c) {
  me.color = c;
  nameInput.style.color = c;
  noteInput.style.color = c;
  chipName.style.color = c;
  colorPicker.value = c;
  saveMe();
}

// Take whatever is in the name box and remember it. Returns false if it's empty.
function lockName() {
  let name = nameInput.value.trim();
  if (!name) {
    nameInput.focus();
    return false;
  }
  me.name = name;
  saveMe();
  showChip();
  return true;
}

function showChip() {
  chipName.textContent = me.name;
  chipName.style.color = me.color;
  identityForm.hidden = true;
  identityChip.hidden = false;
}

function hasName() {
  // if the name box is open, use what's typed there
  if (!identityForm.hidden) return lockName();
  return !!me.name;
}

// =====================================================
// Sending notes and replies
// =====================================================
// drawing is an image (as a data URL) or null
function sendMessage(text, isPrivate, parentId, drawing) {
  text = text.trim();
  if (!text && !drawing) return false;
  if (!hasName()) return false;
  if (document.getElementById("website").value) return false; // a bot filled the trap

  messagesRef
    .push({
      name: me.name,
      color: me.color,
      text: text,
      drawing: drawing || null, // null fields are simply not saved
      private: isPrivate,
      parentId: parentId || null, // null = a new note, otherwise the note it replies to
      authorId: me.id,
      time: firebase.database.ServerValue.TIMESTAMP,
    })
    .catch(showError);
  return true;
}

document.getElementById("composer").addEventListener("submit", (e) => {
  e.preventDefault();
  let drawing = hasDrawing ? drawCanvas.toDataURL("image/png") : null;
  if (sendMessage(noteInput.value, privateCheck.checked, null, drawing)) {
    noteInput.value = "";
    privateCheck.checked = false;
    closeDrawing();
  }
});

// =====================================================
// Little drawing canvas
// =====================================================
const drawPanel = document.getElementById("drawPanel");
const drawCanvas = document.getElementById("drawCanvas");
const ctx = drawCanvas.getContext("2d");
const penSize = document.getElementById("penSize");
const addDrawingButton = document.getElementById("addDrawing");
let hasDrawing = false; // did they actually draw anything?
let lastPoint = null;

addDrawingButton.addEventListener("click", () => {
  drawPanel.hidden = false;
  addDrawingButton.hidden = true;
});
document.getElementById("clearDrawing").addEventListener("click", clearDrawing);
document.getElementById("removeDrawing").addEventListener("click", closeDrawing);

function clearDrawing() {
  ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  hasDrawing = false;
}

function closeDrawing() {
  clearDrawing();
  drawPanel.hidden = true;
  addDrawingButton.hidden = false;
}

// The canvas is shown smaller/bigger than its real size, so convert
// the mouse position into canvas pixels.
function canvasPoint(e) {
  let r = drawCanvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) * drawCanvas.width) / r.width,
    y: ((e.clientY - r.top) * drawCanvas.height) / r.height,
  };
}

// pointer events work for mouse, pen and touch
drawCanvas.addEventListener("pointerdown", (e) => {
  drawCanvas.setPointerCapture(e.pointerId);
  lastPoint = canvasPoint(e);
  drawLine(lastPoint, lastPoint); // a dot for a single click
});

drawCanvas.addEventListener("pointermove", (e) => {
  if (!lastPoint) return;
  let p = canvasPoint(e);
  drawLine(lastPoint, p);
  lastPoint = p;
});

drawCanvas.addEventListener("pointerup", () => (lastPoint = null));
drawCanvas.addEventListener("pointercancel", () => (lastPoint = null));

function drawLine(a, b) {
  ctx.strokeStyle = me.color;
  ctx.lineWidth = penSize.value;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  hasDrawing = true;
}

// Cmd/Ctrl + Enter sends too
noteInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
    document.getElementById("composer").requestSubmit();
  }
});

// =====================================================
// Receiving notes from Firebase
// =====================================================
const threadEls = {}; // note id -> its .thread element

function listen() {
  // child_added fires once for every saved message (oldest first, so a note
  // always arrives before its replies), then again whenever anyone posts.
  messagesRef.orderByChild("time").on(
    "child_added",
    (snapshot) => {
      addMessage(snapshot.key, snapshot.val());
      updateEmpty();
    },
    showError
  );
  messagesRef.once("value", () => {
    statusEl.textContent = ""; // connected: show nothing (errors still show here)
    updateEmpty();
  }, showError);
}

function updateEmpty() {
  document.getElementById("empty").hidden = threadsEl.children.length > 0;
}

function addMessage(id, m) {
  if (!m.parentId) {
    // a new note: newest notes go on top
    let thread = makeThread(id, m);
    threadsEl.prepend(thread);
  } else {
    // a reply: add it under its note (oldest reply first)
    let thread = threadEls[m.parentId];
    if (!thread) return; // the note it replied to is gone
    thread.querySelector(".replies").appendChild(makeLine(m));
  }
}

function makeThread(id, m) {
  let thread = document.createElement("div");
  thread.className = "thread";
  threadEls[id] = thread;

  thread.appendChild(makeLine(m));

  let replies = document.createElement("div");
  replies.className = "replies";
  thread.appendChild(replies);

  let toggle = document.createElement("button");
  toggle.className = "link replyToggle";
  toggle.textContent = "reply";
  toggle.addEventListener("click", () => openReplyForm(thread, id, toggle));
  thread.appendChild(toggle);

  return thread;
}

// One line of chat: time, then "name: message"
function makeLine(m) {
  let line = document.createElement("div");
  line.className = "msg";
  if (m.private) line.classList.add("private");
  if (m.authorId === me.id) line.classList.add("mine");

  let meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = formatTime(m.time);
  if (m.private) {
    let lock = document.createElement("span");
    lock.className = "lock";
    lock.textContent = m.authorId === me.id ? "private · only you see this" : "private";
    meta.appendChild(lock);
  }

  let name = document.createElement("span");
  name.className = "name";
  name.style.color = m.color;
  name.textContent = m.name + ": ";

  let body = document.createElement("span");
  body.className = "body";
  body.style.color = m.color;
  body.textContent = m.text || ""; // textContent (not innerHTML) so nobody can inject HTML

  line.append(meta, name, body);

  // only accept real image data, not links to other sites
  if (typeof m.drawing === "string" && m.drawing.startsWith("data:image/")) {
    let img = document.createElement("img");
    img.className = "drawing body";
    img.src = m.drawing;
    img.alt = "drawing by " + m.name;
    line.appendChild(img);
  }
  return line;
}

function openReplyForm(thread, parentId, toggle) {
  if (!me.name && !nameInput.value.trim()) {
    // no name yet: send them up to the name box first
    showHint(thread, "pick a name at the top first ↑");
    nameInput.focus();
    nameInput.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  toggle.hidden = true;
  let form = document.createElement("form");
  form.className = "replyForm";
  form.autocomplete = "off";
  form.innerHTML = `
    <input type="text" maxlength="1000" placeholder="reply…" />
    <div class="row">
      <label class="check"><input type="checkbox" /> private</label>
      <span>
        <button type="button" class="link">cancel</button>
        <button type="submit">send</button>
      </span>
    </div>`;
  thread.appendChild(form);

  let input = form.querySelector('input[type="text"]');
  let check = form.querySelector('input[type="checkbox"]');
  input.style.color = me.color;
  input.focus();

  let close = () => {
    form.remove();
    toggle.hidden = false;
  };
  form.querySelector(".link").addEventListener("click", close);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (sendMessage(input.value, check.checked, parentId)) close();
  });
}

function showHint(thread, text) {
  let old = thread.querySelector(".hint");
  if (old) old.remove();
  let p = document.createElement("p");
  p.className = "hint";
  p.textContent = text;
  thread.appendChild(p);
  setTimeout(() => p.remove(), 3000);
}

// 2026.11.16 09:04:06
function formatTime(ts) {
  if (!ts) return "";
  let d = new Date(ts);
  let pad = (n) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

function showError(err) {
  console.error(err);
  statusEl.textContent = "error: " + err.message;
}

// ---------- start ----------
setupIdentity();
listen();
