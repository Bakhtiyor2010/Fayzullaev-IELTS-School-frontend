// 🔹 API ENDPOINTS
const BASE_URL = "https://successful-grace-production-5eea.up.railway.app/api";

const API_USERS = `${BASE_URL}/users`;
const API_GROUPS = `${BASE_URL}/groups`;
const API_ATTENDANCE = `${BASE_URL}/attendance`;

let users = [];
let attendance = {};
let selectedUsers = new Set();
let groups = [];
let currentGroupId = null;
let ADMIN_ROLE = null;

const tableBody = document.getElementById("tableBody");
const groupList = document.getElementById("groupList");

// DOM ready
document.addEventListener("DOMContentLoaded", async () => {
  ADMIN_ROLE = localStorage.getItem("ADMIN_ROLE");

  // Moderator/Admin uchun Payment va Create Group yashirish
  if (ADMIN_ROLE === "moderator" || ADMIN_ROLE === "admin") {
    const paymentSection = document.getElementById("paymentSection");
    if (paymentSection) paymentSection.style.display = "none";

    const groupInput = document.getElementById("groupInput");
    const createBtn = document.querySelector('button[onclick="createGroup()"]');
    if (groupInput) groupInput.style.display = "none";
    if (createBtn) createBtn.style.display = "none";
  }

  await loadGroups();
});

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
    const res = await fetch(API_USERS);
    if (!res.ok) throw new Error("Failed to load users");
    const data = await res.json();

    // Firestore: doc.id dan foydalanish, groupId bilan filter
    users = data
      .map((u) => ({ ...u, id: u.id || u._id }))
      .filter((u) => u.groupId && u.groupId === currentGroupId);

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
    const status = attendance[u.id];
    const isChecked = selectedUsers.has(u.id);
    const tr = document.createElement("tr");

    if (status === "present") tr.classList.add("present");
    if (status === "absent") tr.classList.add("absent");
    if (isChecked) tr.classList.add("selected");

    const phone = u.phone
      ? u.phone.startsWith("+998")
        ? u.phone
        : "+998" + u.phone
      : "N/A";

    tr.innerHTML = `
      <td><input type="checkbox" ${
        isChecked ? "checked" : ""
      } onchange="toggleSelect('${u.id}', this)"></td>
      <td>${index + 1}</td>
      <td>${u.name || "-"}</td>
      <td>${u.surname || "-"}</td>
      <td><a href="tel:${phone}">${phone}</a></td>
      <td>
        <button class="att-btn present-btn" onclick="markAttendance('${
          u.id
        }','present')">Present</button>
        <button class="att-btn absent-btn" onclick="markAttendance('${
          u.id
        }','absent')">Absent</button>
      </td>
      <td>
        <button class="delete-btn" onclick="deleteUser('${
          u.id
        }')">Delete</button>
        <button class="att-btn" style="background:#17a2b8;" onclick="changeUserGroup('${
          u.id
        }')">Change Group</button>
      </td>
    `;

    tableBody.appendChild(tr);
  });
}

// -------------------- ATTENDANCE --------------------
async function markAttendance(userId, status) {
  if (!currentGroupId) return alert("Select a group first");
  attendance[userId] = status;
  renderTable();

  try {
    const res = await fetch(API_ATTENDANCE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, groupId: currentGroupId, status }),
    });
    const data = await res.json();
    if (!res.ok) alert(data.error || "Failed to save attendance");
  } catch (err) {
    console.error(err);
    alert("Server error");
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

// -------------------- USER ACTIONS --------------------
// deleteUser funksiyasi
async function deleteUser(userId) {
  if (!confirm("Delete this user?")) return;

  const user = users.find((u) => u.id === userId);
  if (!user) return alert("User not found");

  try {
    // 🔹 1️⃣ DELETE user
    const res = await fetch(`${API_USERS}/${userId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to delete user");
    }

    // 🔹 2️⃣ Frontend array update va table render
    users = users.filter((u) => u.id !== userId);
    selectedUsers.delete(userId);
    renderTable();

    alert("User deleted ✅");

    // 🔹 3️⃣ Xabar yuborish Telegramga (xato alert bermaydi)
    try {
      await fetch(API_ATTENDANCE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          message: `Hurmatli ${user.name}, siz tizimdan o'chirildingiz.`,
        }),
      });
    } catch (err) {
      console.error("Notification failed:", err);
    }
  } catch (err) {
    console.error(err);
    alert(err.message);
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

async function changeUserGroup(userId) {
  if (!currentGroupId) return alert("Select a group first");

  const newGroupName = prompt("Enter the new group name");
  if (!newGroupName) return;

  const newGroup = groups.find((g) => g.name === newGroupName.trim());
  if (!newGroup) return alert("Group does not exist");

  try {
    await fetch(`${API_USERS}/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId: newGroup.id }),
    });

    await fetch(API_ATTENDANCE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        message: `Sizning guruhingiz ${newGroup.name} ga o'zgartirildi.`,
      }),
    });

    alert("User group updated successfully!");
    await loadUsers();
  } catch (err) {
    console.error(err);
    alert("Failed to change user group");
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

// -------------------- CREATE GROUP --------------------
function createGroup() {
  const input = document.getElementById("groupInput");
  const name = input.value.trim();
  if (!name) return alert("Enter group name");

  fetch(API_GROUPS, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  })
    .then(() => loadGroups())
    .catch(() => alert("Failed to create group"));

  input.value = "";
}