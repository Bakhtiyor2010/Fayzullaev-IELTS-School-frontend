const BASE_URL = "http://localhost:5000/api";

const API_USERS = `${BASE_URL}/users`;
const API_GROUPS = `${BASE_URL}/groups`;
const API_ATTENDANCE = `${BASE_URL}/attendance`;

let users = [];
let selectedUsers = new Set();
let groups = [];
let paymentsByUserMonth = {};
let currentGroupId = null;
let ADMIN_ROLE = null;

const tableBody = document.getElementById("tableBody");
const groupList = document.getElementById("groupList");
const hamburger = document.getElementById("hamburger");
const navLinks = document.getElementById("navLinks");

hamburger.addEventListener("click", () => {
  navLinks.classList.toggle("show");
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
      tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;">No users to show</td></tr>`;
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
    groupList.appendChild(div);
  });
}

async function loadUsers() {
  if (!currentGroupId) return;

  tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;font-size:20px;">Loading...</td></tr>`;

  let paymentsData = {}; // <- default empty in case payments fail

  try {
    // 1️⃣ Load users
    const resUsers = await fetch(API_USERS);
    if (!resUsers.ok) throw new Error("Failed to load users");
    const usersData = await resUsers.json();

    // 2️⃣ Load payments (optional)
    try {
      const resPayments = await fetch(`${BASE_URL}/payments`);
      if (!resPayments.ok) throw new Error("Failed to load payments");
      paymentsData = await resPayments.json();

      // Convert paidAt to Date objects safely
      for (const key in paymentsData) {
        if (!paymentsData[key] || !paymentsData[key].history) continue;
        paymentsData[key].history.forEach(h => {
          if (h.date instanceof Object && h.date !== null) h.date = new Date(h.date);
        });
      }
    } catch (err) {
      console.warn("Payments not loaded:", err.message);
    }

    // 3️⃣ Merge users with payments
users = usersData
  .map(u => {
    const payment = paymentsData[u.id] || {};
    const lastPaid =
      payment.history && payment.history.length
        ? payment.history
            .filter(h => h.status === "paid" && h.date)
            .map(h => ({ ...h, date: new Date(h.date) })) // convert to Date
            .sort((a, b) => b.date.getTime() - a.date.getTime())[0]
        : null;

    return {
      ...u,
      id: u.id || u._id,
      isPaid: !!lastPaid,
      paidAt: lastPaid ? lastPaid.date : null,
    };
  })
  .filter(u => u.groupId && u.groupId === currentGroupId);

    // 4️⃣ Sort: unpaid first
    users.sort((a, b) => (a.isPaid === b.isPaid ? 0 : a.isPaid ? 1 : -1));

    renderTable();
  } catch (err) {
    console.error(err);
    tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:red">Failed to load users</td></tr>`;
  }
}

// =====================================================
const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function generateMonthSelect(select) {
  select.innerHTML = ""; // clear previous

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Select month";
  defaultOption.selected = true;
  defaultOption.disabled = true;
  select.appendChild(defaultOption);

  monthNames.forEach((m) => {
    const option = document.createElement("option");
    option.value = m;
    option.textContent = m;
    select.appendChild(option);
  });
}

function generateYearSelect(select) {
  select.innerHTML = ""; // clear previous

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Select year";
  defaultOption.selected = true;
  defaultOption.disabled = true;
  select.appendChild(defaultOption);

  const now = new Date();
  const currentYear = now.getFullYear();
  for (let y = currentYear - 3; y <= currentYear + 2; y++) {
    const option = document.createElement("option");
    option.value = y;
    option.textContent = y;
    select.appendChild(option);
  }
}
// =====================================================

function renderTable() {
  tableBody.innerHTML = "";
  if (!users.length) {
    tableBody.innerHTML = `<tr><td colspan="10" style="text-align:center">No users in this group</td></tr>`;
    return;
  }

  users.forEach((u, index) => {
    const tr = document.createElement("tr");

    const phone = u.phone
      ? u.phone.startsWith("+998") ? u.phone : "+998" + u.phone
      : "N/A";

    tr.innerHTML = `
      <td><input type="checkbox" onchange="toggleSelect('${u.id}', this)"></td>
      <td>${index + 1}</td>
      <td>${u.surname || "-"}</td>
      <td>${u.name || "-"}</td>
      <td><a href="tel:${phone}">${phone}</a></td>
      <td><select class="rowMonth"></select></td>
      <td><select class="rowYear"></select></td>
      <td>
        <button class="paid-btn" style="background:#28a745;" data-id="${u.id}">
          <i class="fa-solid fa-circle-check"></i>
        </button>
        <button class="unpaid-btn" style="background:#dc3545;" data-id="${u.id}">
          <i class="fa-solid fa-circle-xmark"></i>
        </button>
        <button style="background:#ffc107;" onclick="viewPaymentHistory('${u.id}')">
          <i class="fa-solid fa-clock-rotate-left"></i>
        </button>
      </td>
      <td class="status-cell">—</td>
    `;

    tableBody.appendChild(tr);

    const monthSelect = tr.querySelector(".rowMonth");
    const yearSelect = tr.querySelector(".rowYear");

    generateMonthSelect(monthSelect);
    generateYearSelect(yearSelect);

    const statusCell = tr.querySelector(".status-cell");

    // ================================
    // Find latest payment for this user
    let latestPaidMonthKey = null;
    let latestPaidDate = null;

    if (paymentsByUserMonth[u.id]) {
      for (const key in paymentsByUserMonth[u.id]) {
        if (!key.endsWith("_date") && paymentsByUserMonth[u.id][key] === "paid") {
          const date = paymentsByUserMonth[u.id][key + "_date"];
          if (!latestPaidDate || new Date(date) > new Date(latestPaidDate)) {
            latestPaidMonthKey = key;
            latestPaidDate = date;
          }
        }
      }
    }

    // ================================
    // Set background and status based on latest payment
    if (latestPaidMonthKey) {
      tr.style.background = "#d4edda"; // green
      statusCell.textContent = latestPaidDate ? formatDate(latestPaidDate) : "Paid";

      // Pre-select month/year in dropdowns
      const [month, year] = latestPaidMonthKey.split("-");
      monthSelect.value = month;
      yearSelect.value = year;
    } else {
      tr.style.background = "#f8d7da"; // red
      statusCell.textContent = "Unpaid";
    }

    // ================================
    // Update row when admin changes month/year manually
    function updateStatus() {
      const month = monthSelect.value;
      const year = yearSelect.value;
      if (!month || !year) {
        tr.style.background = "#fff";
        statusCell.textContent = "—";
        return;
      }
      const monthKey = `${month}-${year}`;
      const st = paymentsByUserMonth[u.id]?.[monthKey];
      if (st === "paid") {
        tr.style.background = "#d4edda";
        const paidDate = paymentsByUserMonth[u.id][monthKey + "_date"];
        statusCell.textContent = paidDate ? formatDate(paidDate) : "Paid";
      } else {
        tr.style.background = "#f8d7da";
        statusCell.textContent = "Unpaid";
      }
    }

    monthSelect.addEventListener("change", updateStatus);
    yearSelect.addEventListener("change", updateStatus);
  });
}


tableBody.addEventListener("click", (e) => {
  const paidBtn = e.target.closest(".paid-btn");
  const unpaidBtn = e.target.closest(".unpaid-btn");
  if (!paidBtn && !unpaidBtn) return;

  const row = e.target.closest("tr");
  const monthSelect = row.querySelector(".rowMonth");
  const yearSelect = row.querySelector(".rowYear");
  const userId = (paidBtn || unpaidBtn).dataset.id;
  const user = users.find(u => u.id === userId);
  if (!user) return;

  const month = monthSelect.value;
  const year = yearSelect.value;

  if (!month || !year) {
    return alert("Please select both month and year before marking Paid/Unpaid");
  }

  if (paidBtn) setPaid(user.id, user.name, user.surname, month, year);
  if (unpaidBtn) setUnpaid(user.id, month, year);
});

async function setPaid(userId, name, surname, month, year) {
  try {
    const monthKey = `${month}-${year}`;
    const res = await fetch(`${BASE_URL}/payments/paid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, name, surname, month, year }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    if (!paymentsByUserMonth[userId]) paymentsByUserMonth[userId] = {};
    paymentsByUserMonth[userId][monthKey] = "paid";
    paymentsByUserMonth[userId][monthKey + "_date"] = new Date(); // store paid date

    renderTable();
  } catch (err) {
    alert(err.message);
  }
}

async function setUnpaid(userId, month, year) {
  try {
    const user = users.find(u => u.id === userId);
    const monthKey = `${month}-${year}`;

    const res = await fetch(`${BASE_URL}/payments/unpaid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        name: user.name,
        surname: user.surname,
        month,
        year
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    if (!paymentsByUserMonth[userId]) paymentsByUserMonth[userId] = {};
    paymentsByUserMonth[userId][monthKey] = "unpaid";
    paymentsByUserMonth[userId][monthKey + "_date"] = null;

    renderTable();
  } catch (err) {
    alert(err.message);
  }
}

function closeHistoryModal() {
  document.getElementById("historyModal").style.display = "none";
}

async function viewPaymentHistory(userId) {
  try {
    const res = await fetch(`${BASE_URL}/payments`);
    const paymentsData = await res.json();
    const history = paymentsData[userId]?.history || [];

    const tbody = document.querySelector("#historyTable tbody");
    tbody.innerHTML = "";

    history.sort((a, b) => new Date(a.date) - new Date(b.date));

    history.forEach(item => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${item.surname}</td>
        <td>${item.name}</td>
        <td>${item.monthKey || "No month"}</td>
        <td>${formatDate(item.date)}</td>
      `;
      tbody.prepend(tr);
    });

    document.getElementById("historyModal").style.display = "flex";
  } catch {
    alert("Failed to load payment history");
  }
}

function formatDate(date) {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d)) return "-";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
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
  loadGroups();
};