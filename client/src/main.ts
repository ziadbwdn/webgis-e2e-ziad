// Main entry point for the application

// Import types
interface User {
  id: number;
  email: string;
  full_name: string;
}

interface Layer {
  id: number;
  name: string;
  description: string;
  type: string;
  is_default: boolean;
}

// State management
let currentUser: User | null = null;
let authToken: string | null = null;
let layers: Layer[] = [];

// DOM elements
const authContainer = document.getElementById('auth-container')!;
const dashboardContainer = document.getElementById('dashboard-container')!;
const authForm = document.getElementById('auth-form')!;
const authTitle = document.getElementById('auth-title')!;
const toggleAuthLink = document.getElementById('toggle-auth')!;
const toggleText = document.getElementById('toggle-text')!;
const nameGroup = document.getElementById('name-group')!;
const logoutBtn = document.getElementById('logout-btn')!;
const uploadBtn = document.getElementById('upload-btn')!;
const fileInput = document.getElementById('file-input')! as HTMLInputElement;
const userNameDisplay = document.getElementById('user-name')!;
const layersList = document.getElementById('layers-list')!;

// State tracking
let isLoginMode = true;

// API base URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Utility functions
function showError(message: string, elementId: string) {
  const errorElement = document.getElementById(elementId);
  if (errorElement) {
    errorElement.textContent = message;
  }
  console.error(message);
}

function clearErrors() {
  const errorElements = document.querySelectorAll('.error');
  errorElements.forEach(el => {
    el.textContent = '';
  });
}

async function apiRequest(endpoint: string, method = 'GET', body?: any) {
  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (authToken) {
      options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${authToken}`
      };
    }

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_URL}${endpoint}`, options);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }

    return await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(message);
  }
}

function saveAuthState(token: string, user: User) {
  authToken = token;
  currentUser = user;
  localStorage.setItem('authToken', token);
  localStorage.setItem('currentUser', JSON.stringify(user));
}

function loadAuthState() {
  const savedToken = localStorage.getItem('authToken');
  const savedUser = localStorage.getItem('currentUser');

  if (savedToken && savedUser) {
    authToken = savedToken;
    currentUser = JSON.parse(savedUser);
    return true;
  }
  return false;
}

function clearAuthState() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
}

function showAuthPage() {
  authContainer.classList.remove('hidden');
  dashboardContainer.classList.add('hidden');
}

function showDashboard() {
  authContainer.classList.add('hidden');
  dashboardContainer.classList.remove('hidden');

  if (currentUser) {
    userNameDisplay.textContent = `Welcome, ${currentUser.full_name}`;
  }
}

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

  clearErrors();
  const newToggleLink = document.getElementById('toggle-auth')!;
  newToggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    toggleAuthMode();
  });
}

async function handleAuth(e: Event) {
  e.preventDefault();
  clearErrors();

  const email = (document.getElementById('email') as HTMLInputElement).value;
  const password = (document.getElementById('password') as HTMLInputElement).value;
  const name = (document.getElementById('name') as HTMLInputElement).value;

  if (!email || !password) {
    showError('Email and password are required', 'form-error');
    return;
  }

  try {
    let response;

    if (isLoginMode) {
      response = await apiRequest('/auth/login', 'POST', { email, password });
    } else {
      if (!name) {
        showError('Full name is required', 'form-error');
        return;
      }
      response = await apiRequest('/auth/register', 'POST', { email, password, full_name: name });

      // After registration, switch to login
      toggleAuthMode();
      authForm.reset();
      return;
    }

    if (response.token && response.user) {
      saveAuthState(response.token, response.user);
      loadDefaultLayers();
      showDashboard();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication failed';
    showError(message, 'form-error');
  }
}

async function handleLogout() {
  clearAuthState();
  authForm.reset();
  clearErrors();
  isLoginMode = true;
  authTitle.textContent = 'Login';
  nameGroup.classList.add('hidden');
  toggleText.innerHTML = "Don't have an account? <a id=\"toggle-auth\">Sign up</a>";
  showAuthPage();
}

async function loadDefaultLayers() {
  try {
    const response = await apiRequest('/layers/default');
    layers = response.layers || [];
    displayLayers();
  } catch (error) {
    console.error('Failed to load layers:', error);
  }
}

function displayLayers() {
  layersList.innerHTML = '';

  layers.forEach((layer) => {
    const layerItem = document.createElement('div');
    layerItem.className = 'layer-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `layer-${layer.id}`;
    checkbox.checked = layer.is_default;

    const label = document.createElement('label');
    label.htmlFor = `layer-${layer.id}`;
    label.textContent = layer.name;

    layerItem.appendChild(checkbox);
    layerItem.appendChild(label);
    layersList.appendChild(layerItem);
  });
}

function handleUploadClick() {
  fileInput.click();
}

async function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) return;

  try {
    const text = await file.text();
    const geojson = JSON.parse(text);

    // Validate GeoJSON
    if (!geojson.type || !geojson.features) {
      showError('Invalid GeoJSON file', 'form-error');
      return;
    }

    const layerName = prompt('Enter layer name:', file.name.replace('.geojson', ''));
    if (!layerName) return;

    const layerDescription = prompt('Enter layer description (optional):', '');

    // Upload to API
    const response = await apiRequest('/layers/upload', 'POST', {
      name: layerName,
      description: layerDescription || '',
      geojson: geojson
    });

    if (response.id) {
      const newLayer: Layer = {
        id: response.id,
        name: layerName,
        description: layerDescription || '',
        type: 'custom',
        is_default: false
      };
      layers.push(newLayer);
      displayLayers();

      // Show success message
      const successMsg = document.createElement('div');
      successMsg.className = 'success';
      successMsg.textContent = 'Layer uploaded successfully!';
      layersList.appendChild(successMsg);
      setTimeout(() => successMsg.remove(), 3000);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to upload layer';
    showError(message, 'form-error');
  }

  // Reset file input
  input.value = '';
}

// Event listeners
authForm.addEventListener('submit', handleAuth);
toggleAuthLink?.addEventListener('click', (e) => {
  e.preventDefault();
  toggleAuthMode();
});
logoutBtn.addEventListener('click', handleLogout);
uploadBtn.addEventListener('click', handleUploadClick);
fileInput.addEventListener('change', handleFileSelect);

// Initialize application
function initApp() {
  if (loadAuthState()) {
    showDashboard();
    loadDefaultLayers();
  } else {
    showAuthPage();
  }
}

initApp();
