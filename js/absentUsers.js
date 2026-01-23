const API_ABSENT_USERS = `https://second-telegram-bot-backend.onrender.com/api/attendance`;
const tableBody = document.getElementById("tableBody");
const hamburger = document.getElementById("hamburger");
const navLinks = document.getElementById("navLinks");

let users = [];

hamburger.addEventListener("click", () => {
  navLinks.classList.toggle("show");
});

function getToday() {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
}

async function fetchAbsentUsers() {
  try {
    const res = await fetch(API_ABSENT_USERS);
    if (!res.ok) throw new Error("Failed to fetch absent users");
    const data = await res.json();

    const today = getToday();
    users = data.filter(
      (u) => u.status === "absent" && u.date?.startsWith(today),
    );

    renderTable();
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:red;">${err.message}</td></tr>`;
  }
}

function renderTable() {
  tableBody.innerHTML = "";

  if (!users.length) {
    tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;">No absent users</td></tr>`;
    return;
  }

  users.forEach((u, index) => {
    const phone = u.phone
      ? u.phone.startsWith("+998")
        ? u.phone
        : "+998" + u.phone
      : "N/A";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${u.surname || "-"}</td>
      <td>${u.name || "-"}</td>
      <td><a href="tel:${phone}">${phone}</a></td>
      <td>${u.groupName || "-"}</td>
      <td>${formatDate(u.date)}</td>
      <td style="text-transform: capitalize;">${u.admin || "-"}</td>
    `;
    tableBody.appendChild(tr);
  });
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

fetchAbsentUsers();