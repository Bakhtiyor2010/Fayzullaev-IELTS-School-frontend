const form = document.getElementById("loginForm");
const button = document.getElementById("loginBtn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!username || !password) {
    alert("Username va password kiriting");
    return;
  }

  button.textContent = "Loading...";
  button.disabled = true;

  try {
    const res = await fetch(
      "https://successful-grace-production-5eea.up.railway.app/api/admin/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      }
    );

    const data = await res.json();

    if (res.ok) {
      localStorage.setItem("adminToken", data.token);
      window.location.href = "admin.html";
    } else {
      alert(data.error || "Login failed");
    }
  } catch (err) {
    alert("Server bilan ulanishda xatolik");
    console.error(err);
  } finally {
    button.textContent = "Login";
    button.disabled = false;
  }
});