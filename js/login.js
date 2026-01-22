const form = document.getElementById("loginForm");
const button = document.getElementById("loginBtn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  if (!username || !password) {
    return alert("Username va password kiriting");
  }

  button.textContent = "Loading...";
  button.disabled = true;

  try {
    const res = await fetch(
  "https://second-telegram-bot-backend.onrender.com/api/admin/login",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  }
);

const data = await res.json();
console.log("Login response:", data);

if (res.ok) {
  // backenddan kelgan role-ni saqlaymiz
  localStorage.setItem("ADMIN_ROLE", data.role); // masalan: "superadmin", "admin", "moderator"
  
  // keyin admin sahifaga o‘tish
  window.location.href = "admin.html";
} else {
  alert(data.error || "Login failed");
}


  } catch (err) {
    console.error(err);
    alert("Server bilan ulanishda xatolik");
  } finally {
    button.textContent = "Login";
    button.disabled = false;
  }
});