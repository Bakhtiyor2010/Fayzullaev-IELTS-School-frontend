const API_USERS =
  "https://successful-grace-production-5eea.up.railway.app/api/users";
const API_GROUPS =
  "https://successful-grace-production-5eea.up.railway.app/api/groups";
const API_ATTENDANCE =
  "https://successful-grace-production-5eea.up.railway.app/api/attendance";
const API_SEND_MESSAGE =
  "https://successful-grace-production-5eea.up.railway.app/api/send-message";

let users = [];
let attendance = {};
let selectedUsers = new Set();
let groups = [];
let currentGroupId = null;

const tableBody = document.getElementById("tableBody");
const groupList = document.getElementById("groupList");

document.addEventListener("DOMContentLoaded", async () => {
  await loadGroups();
});

async function loadGroups() {
  try {
    const res = await fetch(API_GROUPS);
    groups = await res.json();
    renderGroups();
  } catch (err) {
    console.error(err);
    alert("Failed to load groups");
  }
}

async function loadUsers() {
  if (!currentGroupId) return;
  tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; font-size:20px;">Loading...</td></tr>`;
  try {
    const res = await fetch(`${API_USERS}?groupId=${currentGroupId}`);
    const data = await res.json();
    users = data.filter((u) => u.groupId === currentGroupId);

    renderTable();
  } catch (err) {
    console.error(err);
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:red">Failed to load users</td></tr>`;
  }
}

function renderTable() {
  tableBody.innerHTML = "";
  if (!users || users.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center">No users in this group</td></tr>`;
    return;
  }
  users.forEach((u, index) => {
    const status = attendance[u._id];
    const isChecked = selectedUsers.has(u._id);
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
      <td data-label="Select"><input type="checkbox" ${
        isChecked ? "checked" : ""
      } onchange="toggleSelect('${u._id}', this)"></td>
      <td data-label="#">${index + 1}</td>
      <td data-label="Name">${u.name || "-"}</td>
      <td data-label="Surname">${u.surname || "-"}</td>
      <td data-label="Phone"><a href="tel:${phone}">${phone}</a></td>
      <td data-label="Attendance">
        <button class="att-btn present-btn" onclick="markAttendance('${
          u._id
        }','present')">Present</button>
        <button class="att-btn absent-btn" onclick="markAttendance('${
          u._id
        }','absent')">Absent</button>
      </td>
      <td data-label="Actions">
        <button class="delete-btn" onclick="deleteUser('${
          u._id
        }')">Delete</button>
        <button class="att-btn" style="background:#17a2b8;" onclick="changeUserGroup('${
          u._id
        }')">Change Group</button>
      </td>
    `;
    tableBody.appendChild(tr);
  });
  const allCheckboxes = Array.from(
    document.querySelectorAll('tbody input[type="checkbox"]')
  );
  const checkedCount = allCheckboxes.filter((cb) => cb.checked).length;
  const selectAll = document.getElementById("selectAll");
  selectAll.checked = checkedCount === users.length && users.length > 0;
  selectAll.indeterminate = checkedCount > 0 && checkedCount < users.length;
}

/* Attendance save */
async function markAttendance(userId, status) {
  if (!currentGroupId) return alert("Select a group first");
  try {
    await fetch(API_ATTENDANCE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, groupId: currentGroupId, status }),
    });
    attendance[userId] = status;
    renderTable();

    // Telegram bot message
    await fetch(API_SEND_MESSAGE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userIds: [userId],
        message: `Sizning bugungi davomatingiz: ${
          status === "present" ? "kelgan" : "kelmagan"
        }`,
      }),
    });
  } catch (err) {
    console.error(err);
    alert("Failed to save attendance or send message");
  }
}

/* SELECT */
function toggleSelect(id, checkbox) {
  if (checkbox.checked) selectedUsers.add(id);
  else selectedUsers.delete(id);
  renderTable();
}
function toggleSelectAll(checkbox) {
  if (checkbox.checked) users.forEach((u) => selectedUsers.add(u._id));
  else selectedUsers.clear();
  renderTable();
}

/* CREATE / RENDER GROUP */
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

function renderGroups() {
  groupList.innerHTML = "";
  groups.forEach((g) => {
    const div = document.createElement("div");
    div.style.display = "flex"; // yonma-yon
    div.style.alignItems = "center"; // vertikal markazlash
    div.style.justifyContent = "space-between"; // tugmalar orasida bo'sh joy
    div.style.marginBottom = "10px"; // pastga bo'sh joy

    const nameBtn = document.createElement("button");
    nameBtn.textContent = g.name;
    nameBtn.style.flexGrow = "1"; // qolgan joyni egallaydi
    nameBtn.style.textAlign = "center";
    nameBtn.style.padding = "8px";
    nameBtn.style.border = "1px solid #007bff";
    nameBtn.style.borderRadius = "4px";
    nameBtn.style.background = "#007bff";
    nameBtn.style.color = "white";
    nameBtn.style.cursor = "pointer";
    nameBtn.onclick = async () => {
      currentGroupId = g._id;
      document.getElementById("groupTitle").textContent = g.name;
      await loadUsers();
      await loadAttendance(g._id);
    };

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.className = "edit-btn";
    editBtn.style.background = "#ffc107";
    editBtn.style.padding = "10px 20px";
    editBtn.style.marginLeft = "5px";
    editBtn.style.width = "fit-content";
    editBtn.onclick = () => editGroupPrompt(g._id);

    const delBtn = document.createElement("button");
    delBtn.textContent = "Delete";
    delBtn.className = "delete-btn";
    delBtn.style.background = "#dc3545";
    delBtn.style.padding = "10px 20px";
    delBtn.style.width = "fit-content";
    delBtn.style.marginLeft = "5px";
    delBtn.onclick = () => deleteGroup(g._id);

    div.appendChild(nameBtn);
    div.appendChild(editBtn);
    div.appendChild(delBtn);
    groupList.appendChild(div);
  });
}

async function loadAttendance(groupId) {
  const table = document.getElementById("attendanceTable");
  table.innerHTML = `<tr><th>#</th><th>Name</th><th>Surname</th><th>Status</th><th>Date</th></tr>`;
  if (!groupId) return;

  try {
    const res = await fetch(`${API_ATTENDANCE}/history/${groupId}`);
    if (!res.ok) throw new Error("Server error");
    const data = await res.json();

    if (!data || data.length === 0) {
      table.innerHTML += `<tr><td colspan="5" style="text-align:center">No attendance records for this group</td></tr>`;
      return;
    }

    data.forEach((rec, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${i + 1}</td><td>${rec.userId.name}</td><td>${
        rec.userId.surname
      }</td><td>${rec.status}</td><td>${new Date(
        rec.date
      ).toLocaleDateString()}</td>`;
      table.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    table.innerHTML += `<tr><td colspan="5" style="text-align:center;color:red">Failed to load attendance history</td></tr>`;
  }
}

/* MODAL */
function openModal() {
  document.getElementById("attendanceModal").style.display = "block";
}
function closeModal() {
  document.getElementById("attendanceModal").style.display = "none";
}

/* SEND MESSAGE */
async function sendMessage() {
  const text = document.getElementById("messageText").value.trim();
  if (!text) return alert("Message empty");
  if (selectedUsers.size === 0) return alert("Select users");
  try {
    await fetch(API_SEND_MESSAGE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userIds: Array.from(selectedUsers),
        message: text,
      }),
    });
    alert("Message sent");
    document.getElementById("messageText").value = "";
    selectedUsers.clear();
    renderTable();
  } catch {
    alert("Error sending message");
  }
}

/* SEND TO ALL */
async function sendToAll() {
  const text = document.getElementById("messageText").value.trim();
  if (!text) return alert("Message empty");
  try {
    await fetch(API_SEND_MESSAGE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds: users.map((u) => u._id), message: text }),
    });
    alert("Message sent to all users!");
    document.getElementById("messageText").value = "";
    selectedUsers.clear();
    renderTable();
  } catch {
    alert("Error sending message to all users");
  }
}

/* DELETE USER */
async function deleteUser(id) {
  if (!confirm("Delete this user?")) return;
  try {
    await fetch(`${API_USERS}/${id}`, { method: "DELETE" });
    users = users.filter((u) => u._id !== id);
    selectedUsers.delete(id);
    renderTable();
  } catch {
    alert("Error deleting user");
  }
}

/* DELETE GROUP */
async function deleteGroup(id) {
  if (!confirm("Delete this group?")) return;
  try {
    await fetch(`${API_GROUPS}/${id}`, { method: "DELETE" });
    if (currentGroupId === id) {
      currentGroupId = null;
      document.getElementById("groupTitle").textContent = "Select a group";
      tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center">Select a group to load users</td></tr>`;
    }
    groups = groups.filter((g) => g._id !== id);
    renderGroups();
  } catch {
    alert("Error deleting group");
  }
}

/* EDIT GROUP */
function editGroupPrompt(id) {
  const group = groups.find((g) => g._id === id);
  if (!group) return;
  const newName = prompt("Enter new group name", group.name);
  if (!newName) return;
  fetch(`${API_GROUPS}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: newName }),
  })
    .then(() => loadGroups())
    .catch(() => alert("Failed to edit group"));
}