// Main entry point - Authentication only

interface User {
  id: number;
  email: string;
  full_name: string;
}

const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000/api';

// DOM elements
const authForm = document.getElementById('auth-form')!;
const authTitle = document.getElementById('auth-title')!;
const toggleAuthLink = document.getElementById('toggle-auth')!;
const nameGroup = document.getElementById('name-group')!;
const toggleText = document.getElementById('toggle-text')!;

let isLoginMode = true;

function toggleAuthMode() {
  isLoginMode = !isLoginMode;

  if (isLoginMode) {
    authTitle.textContent = 'Login';
    nameGroup.classList.add('hidden');
    toggleText.innerHTML = "Don't have an account? <a id=\"toggle-auth\">Sign up</a>";
  } else {
    authTitle.textContent = 'Sign Up';
    nameGroup.classList.remove('hidden');
    toggleText.innerHTML = 'Already have an account? <a id="toggle-auth">Login</a>';
  }

  // Re-attach event listener
  document.getElementById('toggle-auth')!.addEventListener('click', (e) => {
    e.preventDefault();
    toggleAuthMode();
  });
}

async function handleAuth(e: Event) {
  e.preventDefault();

  const email = (document.getElementById('email') as HTMLInputElement).value;
  const password = (document.getElementById('password') as HTMLInputElement).value;
  const name = (document.getElementById('name') as HTMLInputElement).value;
  const errorEl = document.getElementById('form-error')!;

  errorEl.textContent = '';

  try {
    let response;

    if (isLoginMode) {
      response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
    } else {
      if (!name) {
        errorEl.textContent = 'Full name is required';
        return;
      }
      response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: name })
      });
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Authentication failed');
    }

    if (isLoginMode) {
      // Save auth state
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('currentUser', JSON.stringify(data.user));

      // Redirect to home (landing page)
      window.location.href = '/home.html';
    } else {
      // After registration, switch to login
      alert('Registration successful! Please login.');
      toggleAuthMode();
      (authForm as HTMLFormElement).reset();
    }

  } catch (error) {
    errorEl.textContent = error instanceof Error ? error.message : 'Authentication failed';
  }
}

// Event listeners
authForm.addEventListener('submit', handleAuth);
toggleAuthLink.addEventListener('click', (e) => {
  e.preventDefault();
  toggleAuthMode();
});

// Check if already logged in
if (localStorage.getItem('authToken')) {
  window.location.href = '/home.html';
}