const API_ABSENT_USERS = `https://fayzullaev-ielts-school-backend.onrender.com/api/attendance`;
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
  return `${day}/${month}/${year}`;
}

function formatDateToYMD(date) {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d)) return "-";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

async function fetchAbsentUsers() {
  try {
    const res = await fetch(API_ABSENT_USERS);
    if (!res.ok) throw new Error("Failed to fetch absent users");
    const data = await res.json();

    const todayDateStr = getToday();
    users = data.filter(
      (u) => u.status === "absent" && formatDateToYMD(u.date) === todayDateStr
    );

    renderTable();
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:red;">${err.message}</td></tr>`;
  }
}

function renderTable() {
  tableBody.innerHTML = "";

  if (!users.length) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No absent users</td></tr>`;
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
      <td>${formatDateToYMD(u.date)}</td>
      <td style="text-transform: capitalize;">${u.admin || "-"}</td>
    `;
    tableBody.appendChild(tr);
  });
}

fetchAbsentUsers();