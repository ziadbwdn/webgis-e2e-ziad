(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) {
    return;
  }
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link);
  }
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload")
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials")
      fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep)
      return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
const API_URL = "http://localhost:3000/api";
const authForm = document.getElementById("auth-form");
const authTitle = document.getElementById("auth-title");
const toggleAuthLink = document.getElementById("toggle-auth");
const nameGroup = document.getElementById("name-group");
const toggleText = document.getElementById("toggle-text");
let isLoginMode = true;
function toggleAuthMode() {
  isLoginMode = !isLoginMode;
  if (isLoginMode) {
    authTitle.textContent = "Login";
    nameGroup.classList.add("hidden");
    toggleText.innerHTML = `Don't have an account? <a id="toggle-auth">Sign up</a>`;
  } else {
    authTitle.textContent = "Sign Up";
    nameGroup.classList.remove("hidden");
    toggleText.innerHTML = 'Already have an account? <a id="toggle-auth">Login</a>';
  }
  document.getElementById("toggle-auth").addEventListener("click", (e) => {
    e.preventDefault();
    toggleAuthMode();
  });
}
async function handleAuth(e) {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const name = document.getElementById("name").value;
  const errorEl = document.getElementById("form-error");
  errorEl.textContent = "";
  try {
    let response;
    if (isLoginMode) {
      response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
    } else {
      if (!name) {
        errorEl.textContent = "Full name is required";
        return;
      }
      response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, full_name: name })
      });
    }
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Authentication failed");
    }
    if (isLoginMode) {
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("currentUser", JSON.stringify(data.user));
      window.location.href = "/home.html";
    } else {
      alert("Registration successful! Please login.");
      toggleAuthMode();
      authForm.reset();
    }
  } catch (error) {
    errorEl.textContent = error instanceof Error ? error.message : "Authentication failed";
  }
}
authForm.addEventListener("submit", handleAuth);
toggleAuthLink.addEventListener("click", (e) => {
  e.preventDefault();
  toggleAuthMode();
});
if (localStorage.getItem("authToken")) {
  window.location.href = "/home.html";
}
//# sourceMappingURL=index-DQlCiwBF.js.map
