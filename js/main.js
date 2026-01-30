const BASE_URL = "https://fayzullaev-ielts-school-backend.onrender.com/api";

const API_USERS = `${BASE_URL}/users`;
const API_GROUPS = `${BASE_URL}/groups`;
const API_ATTENDANCE = `${BASE_URL}/attendance`;

let users = [];
let attendance = {};
let selectedUsers = new Set();
let groups = [];
let currentGroupId = null;
let ADMIN_ROLE = null;
let currentAdminUsername = localStorage.getItem("ADMIN_USERNAME") || "";

const tableBody = document.getElementById("tableBody");
const groupList = document.getElementById("groupList");
const hamburger = document.getElementById("hamburger");
const navLinks = document.getElementById("navLinks");

hamburger.addEventListener("click", () => {
  navLinks.classList.toggle("show");
});

document.addEventListener("DOMContentLoaded", async () => {
  ADMIN_ROLE = localStorage.getItem("ADMIN_ROLE");

  if (ADMIN_ROLE === "moderator" || ADMIN_ROLE === "admin") {
    const paymentSection = document.getElementById("paymentSection");
    const absentStudents = document.getElementById("absentStudents");
    const userAuthentication = document.getElementById("userAuthentication");

    if (paymentSection) paymentSection.style.display = "none";
    if (absentStudents) absentStudents.style.display = "none";
    if (userAuthentication) userAuthentication.style.display = "none";

    const groupInput = document.getElementById("groupInput");
    const createBtn = document.querySelector('button[onclick="createGroup()"]');
    const userAuthorization = document.getElementById("userAuthorization");

    if (groupInput) groupInput.style.display = "none";
    if (createBtn) createBtn.style.display = "none";
    if (userAuthorization) userAuthorization.style.display = "none";
  }

  await loadGroups();
});

async function loadGroups() {
  const loader = document.getElementById("groupLoader");
  loader.style.display = "block";
  groupList.innerHTML = "";

  try {
    const res = await fetch(API_GROUPS);
    if (!res.ok) throw new Error("Failed to load groups");
    const data = await res.json();

    groups = data.map((g) => ({ ...g, id: g.id || g._id }));

    groups.sort((a, b) => {
      if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
      if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
      return 0;
    });

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
      editBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';
      editBtn.style.background = "#ffc107";
      editBtn.style.padding = "10px 20px";
      editBtn.style.marginLeft = "5px";
      editBtn.style.width = "fit-content";
      editBtn.onclick = () => editGroupPrompt(g.id);

      const delBtn = document.createElement("button");
      delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
      delBtn.style.background = "#dc3545";
      delBtn.style.padding = "10px 20px";
      delBtn.style.marginLeft = "5px";
      delBtn.style.width = "fit-content";
      delBtn.onclick = () => deleteGroup(g.id);

      div.appendChild(editBtn);
      div.appendChild(delBtn);
    }

    groupList.appendChild(div);
  });
}

async function loadUsers() {
  if (!currentGroupId) return;

  tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;font-size:20px;">Loading...</td></tr>`;

  try {
    const res = await fetch(API_USERS);
    if (!res.ok) throw new Error("Failed to load users");
    const data = await res.json();

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
      <td>${u.surname || "-"}</td>
      <td>${u.name || "-"}</td>
      <td><a href="tel:${phone}">${phone}</a></td>
      <td>
        <button class="success-btn" onclick="markAttendance('${
          u.id
        }','present')"><i class="fa-solid fa-circle-check"></i></button>
        <button class="danger-btn" onclick="markAttendance('${
          u.id
        }','absent')"><i class="fa-solid fa-circle-xmark"></i></button>
      </td>
      <td>
        ${
          ADMIN_ROLE === "superadmin"
            ? ` <button style="background: #28a745;" onclick="editUser('${u.id}')">
                  <i class="fa-solid fa-pen"></i>
                </button>

                <button style="background: #ffc107;" onclick="viewAttendanceHistory('${u.id}')">
                  <i class="fa-solid fa-clock-rotate-left"></i>
                </button>

                <button style="background: #17a2b8;" onclick="changeUserGroup('${u.id}')">
                  <i class="fa-solid fa-users-gear"></i>
                </button>

                <button style="background: var(--danger);" onclick="deleteUser('${u.id}')">
                  <i class="fa-solid fa-trash"></i>
                </button>`
              : 
              ` <button style="background: #ffc107;" onclick="viewAttendanceHistory('${u.id}')">
                  <i class="fa-solid fa-clock-rotate-left"></i>
                </button>`
        }
      </td>
    `;

    tableBody.appendChild(tr);
  });
}

function editUser(id) {
  const row = [...document.querySelectorAll("tr")]
    .find(tr => tr.querySelector(`button[onclick="editUser('${id}')"]`));

  if (!row) return;

  const user = users.find(u => u.id === id);

  const surname = user.surname || "";
  const name = user.name || "";
  const phone = user.phone || "";

  row.children[2].innerHTML = `<input type="text" id="edit-surname-${id}" value="${surname}">`;
  row.children[3].innerHTML = `<input type="text" id="edit-name-${id}" value="${name}">`;
  row.children[4].innerHTML = `<input type="text" id="edit-phone-${id}" value="${phone}">`;

  row.children[6].innerHTML = `
    <button class="att-btn" style="background:#007bff" onclick="saveUser('${id}')">Save</button>
  `;
}

async function saveUser(id) {
  const surname = document.getElementById(`edit-surname-${id}`).value.trim();
  const name = document.getElementById(`edit-name-${id}`).value.trim();
  const phone = document.getElementById(`edit-phone-${id}`).value.trim();

  try {
    const res = await fetch(`${API_USERS}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ surname, name, phone })
    });

    const data = await res.json();

    if (res.ok) {
      alert("Yangilandi");

      const index = users.findIndex(u => u.id === id);
      if (index !== -1) {
        users[index] = { ...users[index], ...data };
      }

      renderTable();

    } else {
      alert(data.error || "Xatolik");
    }

  } catch (err) {
    console.error(err);
    alert("Server xatosi");
  }
}

async function markAttendance(userId, status) {
  if (!currentGroupId) return alert("Select a group first");

  attendance[userId] = status;
  renderTable();

  try {
    const res = await fetch(API_ATTENDANCE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        status,
        adminUsername: currentAdminUsername,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to save attendance");

    alert(
      `Attendance for ${users.find((u) => u.id === userId)?.name || "user"} saved as "${status.toUpperCase()}" ✅`,
    );
  } catch (err) {
    console.error(err);
    alert("Server error. Check backend logs!");
  }
}

async function viewAttendanceHistory(userId) {
  try {
    const res = await fetch(API_ATTENDANCE);
    if (!res.ok) throw new Error("Failed to load attendance history");

    const attendanceData = await res.json();

    const user = users.find((u) => u.id === userId);
    if (!user || !user.telegramId) {
      alert("Telegram ID not found");
      return;
    }

    const userHistory = attendanceData
      .filter((a) => String(a.telegramId) === String(user.telegramId))
      .filter((p) => p.status != "paid" && p.status != "unpaid")
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const tbody = document.querySelector("#historyTable tbody");
    tbody.innerHTML = "";

    if (!userHistory.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align:center;">No attendance history</td>
        </tr>`;
    } else {
      userHistory.forEach((h) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${h.name || "-"}</td>
          <td>${h.surname || "-"}</td>
          <td>${h.status}</td>
          <td>${new Date(h.date).toLocaleDateString("en-GB")}</td>
        `;
        tbody.appendChild(tr);
      });
    }

    document.getElementById("historyModal").style.display = "flex";
  } catch (err) {
    console.error(err);
    alert("Failed to load attendance history");
  }
}

function closeHistoryModal() {
  document.getElementById("historyModal").style.display = "none";
}

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
          message: `Assalomu alaykum, hurmatli ${u.name || ""} ${
            u.surname || ""
          }!
          
Здравствуйте, уважаемый(ая) ${u.name || ""} ${u.surname || ""}!\n\n${text}`,
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
          message: `Assalomu alaykum, hurmatli ${u.name || ""} ${
            u.surname || ""
          }!
          
Здравствуйте, уважаемый(ая) ${u.name || ""} ${u.surname || ""}!\n\n${text}`,
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

async function deleteUser(userId) {
  if (!confirm("Delete this user?")) return;

  const user = users.find((u) => u.id === userId);
  if (!user) return alert("User not found");

  try {
    const res = await fetch(`${API_USERS}/${userId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to delete user");
    }

    users = users.filter((u) => u.id !== userId);
    selectedUsers.delete(userId);
    renderTable();

    alert("User deleted ✅");

    try {
      await fetch(API_ATTENDANCE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          message: `Hurmatli ${user.name}, siz tizimdan o'chirildingiz.
          
Уважаемый(ая) ${user.name}, вы были удалены из системы.`,
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

  const oldName = group.name;
  group.name = newName;
  renderGroups();
  if (currentGroupId === groupId) {
    document.getElementById("groupTitle").textContent = newName;
  }

  try {
    const res = await fetch(`${API_GROUPS}/${groupId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to edit group on server");
    }

    await loadGroups();
  } catch (err) {
    console.error("Edit group error:", err);

    if (err.message !== "Failed to fetch") {
      alert("Failed to edit group: " + err.message);
    }
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
        message: `Sizning guruhingiz ${newGroup.name} ga o'zgartirildi.
        
Ваша группа была изменена на ${newGroup.name}.`,
      }),
    });

    alert("User group updated successfully!");
    await loadUsers();
  } catch (err) {
    console.error(err);
    alert("Failed to change user group");
  }
}

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
