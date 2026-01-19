// ================= API =================
const BASE_URL = "https://successful-grace-production-5eea.up.railway.app/api";

const API_PENDING_USERS = `${BASE_URL}/users/pending`;
const API_APPROVE = `${BASE_URL}/admin/approve-user`;
const API_REJECT = `${BASE_URL}/admin/reject-user`;

// ================= STATE =================
let users = [];
let selectedUsers = new Set();
let ADMIN_ROLE = null;

const tableBody = document.getElementById("tableBody");

// ================= DOM READY =================
document.addEventListener("DOMContentLoaded", async () => {
  ADMIN_ROLE = localStorage.getItem("ADMIN_ROLE");

  // Moderator/Admin payment ko‘rmasin
  if (ADMIN_ROLE === "moderator" || ADMIN_ROLE === "admin") {
    const paymentSection = document.getElementById("paymentSection");
    if (paymentSection) paymentSection.style.display = "none";
  }

  await loadPendingUsers();
});

// ================= LOAD PENDING USERS =================
async function loadPendingUsers() {
  tableBody.innerHTML = `
    <tr>
      <td colspan="6" style="text-align:center;font-size:18px;">Loading...</td>
    </tr>
  `;

  try {
    const res = await fetch(API_PENDING_USERS);
    if (!res.ok) throw new Error("Failed to load pending users");

    const data = await res.json();

    users = data.map((u) => ({
      id: u.telegramId,
      telegramId: u.telegramId,
      firstName: u.firstName || "-",
      lastName: u.lastName || "-",
      phone: u.phone ? (u.phone.startsWith("+998") ? u.phone : "+998" + u.phone) : "N/A",
      groupName: u.groupName || "—",
    }));

    renderTable();
  } catch (err) {
    console.error(err);
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;color:red;">
          Failed to load users
        </td>
      </tr>
    `;
  }
}

// ================= RENDER TABLE =================
function renderTable() {
  tableBody.innerHTML = "";

  if (!users.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;">No pending users</td>
      </tr>
    `;
    return;
  }

  users.forEach((u, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${u.lastName}</td>
      <td>${u.firstName}</td>
      <td><a href="tel:${u.phone}">${u.phone}</a></td>
      <td>${u.groupName}</td>
      <td>
        <button
           class="att-btn present-btn" style="background:#28a745;" 
          onclick="approveUser('${u.id}')">
          Allow
        </button>
        <button
           class="att-btn absent-btn" style="background:#dc3545;" 
          onclick="rejectUser('${u.id}')">
          Not Allow
        </button>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

// ================= ACTIONS =================
async function approveUser(telegramId) {
  if (!confirm("Approve this user?")) return;

  try {
    const res = await fetch(`${API_APPROVE}/${telegramId}`, { method: "POST" });
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const data = await res.json();

    // 🔹 Alertdan keyin table yangilash
    alert(`User approved successfully! Group: ${data.groupName}`);

    // ✅ Table dan o'sha userni o'chirish
    users = users.filter((u) => u.id !== telegramId);
    selectedUsers.delete(telegramId);
    renderTable();
  } catch (err) {
    console.error(err);
    alert("Failed to approve user: " + err.message);
  }
}

async function rejectUser(telegramId) {
  if (!confirm("Reject this user?")) return;

  try {
    const res = await fetch(`${API_REJECT}/${telegramId}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to reject user");

    // 🔹 Alertdan keyin table yangilash
    alert("User rejected successfully");

    // ✅ Table dan o'sha userni o'chirish
    users = users.filter((u) => u.id !== telegramId);
    selectedUsers.delete(telegramId);
    renderTable();
  } catch (err) {
    console.error(err);
    alert("Failed to reject user: " + err.message);
  }
}