// 🔹 API ENDPOINTS
const BASE_URL = "https://successful-grace-production-5eea.up.railway.app/api";

const API_USERS = `${BASE_URL}/users`;
const API_GROUPS = `${BASE_URL}/groups`;
const API_ATTENDANCE = `${BASE_URL}/attendance`;

let users = [];
let selectedUsers = new Set();
let groups = [];
let currentGroupId = null;
let ADMIN_ROLE = null;

const tableBody = document.getElementById("tableBody");
const groupList = document.getElementById("groupList");

// -------------------- GROUPS --------------------
async function loadGroups() {
  const loader = document.getElementById("groupLoader");
  loader.style.display = "block";
  groupList.innerHTML = "";

  try {
    const res = await fetch(API_GROUPS);
    if (!res.ok) throw new Error("Failed to load groups");
    const data = await res.json();

    // Firestore uchun: doc.id dan foydalanish
    groups = data.map((g) => ({ ...g, id: g.id || g._id }));

    // Agar guruhlar bo'sh bo'lsa
    if (groups.length === 0) {
      groupList.innerHTML = `<div style="text-align:center;color:gray;">No groups</div>`;
      document.getElementById("groupTitle").textContent = "No groups";
      currentGroupId = null;
      tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No users to show</td></tr>`;
      return;
    }

    renderGroups();
  } catch (err) {
    console.error(err);
    alert("Failed to load groups");
  } finally {
    loader.style.display = "none";
  }
}

function renderGroups() {
  groupList.innerHTML = "";

  groups.forEach((g) => {
    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.justifyContent = "space-between";
    div.style.marginBottom = "10px";

    const nameBtn = document.createElement("button");
    nameBtn.textContent = g.name;
    nameBtn.style.flexGrow = "1";
    nameBtn.style.padding = "8px";
    nameBtn.style.border = "1px solid #007bff";
    nameBtn.style.borderRadius = "4px";
    nameBtn.style.background = "#007bff";
    nameBtn.style.color = "white";
    nameBtn.style.cursor = "pointer";

    nameBtn.onclick = async () => {
      currentGroupId = g.id;
      document.getElementById("groupTitle").textContent =
        "Group name: " + g.name;
      await loadUsers();
    };

    div.appendChild(nameBtn);

    if (ADMIN_ROLE === "superadmin") {
      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.style.background = "#ffc107";
      editBtn.style.padding = "10px 20px";
      editBtn.style.marginLeft = "5px";
      editBtn.onclick = () => editGroupPrompt(g.id);

      const delBtn = document.createElement("button");
      delBtn.textContent = "Delete";
      delBtn.style.background = "#dc3545";
      delBtn.style.padding = "10px 20px";
      delBtn.style.marginLeft = "5px";
      delBtn.onclick = () => deleteGroup(g.id);

      div.appendChild(editBtn);
      div.appendChild(delBtn);
    }

    groupList.appendChild(div);
  });
}

// -------------------- USERS --------------------
async function loadUsers() {
  if (!currentGroupId) return;

  tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;font-size:20px;">Loading...</td></tr>`;

  try {
    // 1️⃣ Users
    const resUsers = await fetch(API_USERS);
    if (!resUsers.ok) throw new Error("Failed to load users");
    const usersData = await resUsers.json();

    // 2️⃣ Payments
    const resPayments = await fetch(`${BASE_URL}/payments`);
    if (!resPayments.ok) throw new Error("Failed to load payments");
    const paymentsData = await resPayments.json();

    // 🔹 Paymentsdagi timestamp-larni JS Date ga aylantirish
    for (const key in paymentsData) {
      if (paymentsData[key].startDate) paymentsData[key].startDate = new Date(paymentsData[key].startDate);
      if (paymentsData[key].endDate) paymentsData[key].endDate = new Date(paymentsData[key].endDate);
    }

    // 3️⃣ Map users
    users = usersData
      .map(u => {
        const payment = paymentsData[u.id] || {};
        return {
          ...u,
          id: u.id || u._id,
          isPaid: payment.status === "paid",
          startDate: payment.startDate || null,
          endDate: payment.endDate || null
        };
      })
      .filter(u => u.groupId && u.groupId === currentGroupId);

    // 4️⃣ Oxirida to‘laganlarni oxiriga chiqarish
    users.sort((a, b) => (a.isPaid === b.isPaid ? 0 : a.isPaid ? 1 : -1));

    renderTable();
  } catch (err) {
    console.error(err);
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:red">Failed to load users</td></tr>`;
  }
}

function renderTable() {
  tableBody.innerHTML = "";
  if (!users.length) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center">No users in this group</td></tr>`;
    return;
  }

  users.forEach((u, index) => {
    const isChecked = selectedUsers.has(u.id);
    const tr = document.createElement("tr");

    if (isChecked) tr.classList.add("selected");

    const phone = u.phone
      ? u.phone.startsWith("+998")
        ? u.phone
        : "+998" + u.phone
      : "N/A";

    // Payment status matni
    let paymentStatus = "To‘lanmagan";
    if (u.isPaid) {
      paymentStatus = `${u.startDate?.toLocaleDateString() || "-"} - ${u.endDate?.toLocaleDateString() || "-"}`;
      tr.style.background = "#d4edda"; // yashil
    } else {
      tr.style.background = "#f8d7da"; // qizil
    }

    tr.innerHTML = `
      <td><input type="checkbox" ${isChecked ? "checked" : ""} onchange="toggleSelect('${u.id}', this)"></td>
      <td>${index + 1}</td>
      <td>${u.name || "-"}</td>
      <td>${u.surname || "-"}</td>
      <td><a href="tel:${phone}">${phone}</a></td>
      <td>
        <button class="att-btn present-btn" style="background:#28a745;" onclick="setPaid('${u.id}')">Paid</button>
        <button class="att-btn absent-btn" style="background:#dc3545;" onclick="setUnpaid('${u.id}')">Unpaid</button>
        <button class="delete-btn" style="background:#ffc107;" onclick="deletePayment('${u.id}')">Delete Payment</button>
      </td>
      <td>${paymentStatus}</td>
    `;

    tableBody.appendChild(tr);
  });
}

// -------------------- BUTTON FUNCTIONS --------------------
async function setPaid(userId) {
  const user = users.find(u => u.id === userId);
  if (!user) return;

  const res = await fetch(`${BASE_URL}/payments/paid`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, name: user.name, surname: user.surname })
  });

  const data = await res.json();

  // Backenddan startDate va endDate olindi
  user.isPaid = true;
  user.startDate = new Date(data.startDate);
  user.endDate = new Date(data.endDate);

  renderTable();
}

async function setUnpaid(userId) {
  const user = users.find(u => u.id === userId);
  if (!user) return;

  await fetch(`${BASE_URL}/payments/unpaid`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, name: user.name, surname: user.surname })
  });

  user.isPaid = false;
  user.startDate = null;
  user.endDate = null;

  renderTable();
}

async function deletePayment(userId) {
  if (!confirm("Are you sure to delete payment?")) return;

  try {
    // 🔹 1️⃣ Backendga so‘rov yuborish
    const res = await fetch(`${BASE_URL}/payments/${userId}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete payment");

    // 🔹 2️⃣ Frontendda userni default holatga qaytarish
    users = users.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          isPaid: false,
          startDate: null,
          endDate: null
        };
      }
      return u;
    });

    renderTable();

    // 🔹 3️⃣ Payment status haqida xabar berish
    alert("Payment deleted. User status reset to unpaid.");

  } catch (err) {
    console.error(err);
    alert(err.message || "Failed to delete payment");
  }
}

// -------------------- MESSAGE --------------------
async function sendMessage() {
  const text = document.getElementById("messageText").value.trim();
  if (!text) return alert("Message empty");
  if (!selectedUsers.size) return alert("Select users");

  const usersToSend = users.filter((u) => selectedUsers.has(u.id));
  try {
    for (const u of usersToSend) {
      await fetch(API_ATTENDANCE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: u.id,
          message: `Salom, hurmatli ${u.name || ""} ${
            u.surname || ""
          }!\n\n${text}`,
        }),
      });
    }
    alert("Message sent ✅");
    document.getElementById("messageText").value = "";
    selectedUsers.clear();
    renderTable();
  } catch (err) {
    console.error(err);
    alert("Server error");
  }
}

async function sendToAll() {
  const text = document.getElementById("messageText").value.trim();
  if (!text) return alert("Message empty");
  if (!users.length) return alert("No users to send message");

  try {
    for (const u of users) {
      await fetch(API_ATTENDANCE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: u.id,
          message: `Salom, hurmatli ${u.name || ""} ${
            u.surname || ""
          }!\n\n${text}`,
        }),
      });
    }
    alert("Message sent to all ✅");
    document.getElementById("messageText").value = "";
    selectedUsers.clear();
    renderTable();
  } catch (err) {
    console.error(err);
    alert("Server error");
  }
}

// -------------------- GROUP ACTIONS --------------------
async function deleteGroup(groupId) {
  if (!confirm("Delete this group?")) return;
  try {
    const res = await fetch(`${API_GROUPS}/${groupId}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete group");

    if (currentGroupId === groupId) {
      currentGroupId = null;
      document.getElementById("groupTitle").textContent = "Select a group";
      tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center">Select a group to load users</td></tr>`;
    }

    groups = groups.filter((g) => g.id !== groupId);
    renderGroups();
  } catch (err) {
    console.error(err);
    alert("Error deleting group");
  }
}

async function editGroupPrompt(groupId) {
  const group = groups.find((g) => g.id === groupId);
  if (!group) return;

  const newName = prompt("Enter new group name", group.name);
  if (!newName) return;

  try {
    const res = await fetch(`${API_GROUPS}/${groupId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    if (!res.ok) throw new Error("Failed to edit group");

    await loadGroups();
    if (currentGroupId === groupId) {
      document.getElementById("groupTitle").textContent = newName;
    }
  } catch (err) {
    console.error(err);
    alert("Failed to edit group");
  }
}

// -------------------- SELECT --------------------
function toggleSelect(id, checkbox) {
  if (checkbox.checked) selectedUsers.add(id);
  else selectedUsers.delete(id);
  renderTable();
}

function toggleSelectAll(checkbox) {
  if (checkbox.checked) users.forEach((u) => selectedUsers.add(u.id));
  else selectedUsers.clear();
  renderTable();
}

window.onload = () => {
  loadGroups(); // grouplarni yuklash
};