// Home Page - Landing Page Integration

// Check if user is logged in
const authToken = localStorage.getItem('authToken');
const currentUser = localStorage.getItem('currentUser');

if (!authToken || !currentUser) {
  // Redirect to login if not authenticated
  window.location.href = '/';
}

// Navigate to map dashboard
const mapBtn = document.getElementById('mapBtn');
mapBtn?.addEventListener('click', () => {
  window.location.href = '/dashboard.html';
});

// Learn more button (scroll to features)
const learnBtn = document.getElementById('learnBtn');
learnBtn?.addEventListener('click', () => {
  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
});

// Logout button
const logoutBtn = document.getElementById('logoutBtn');
logoutBtn?.addEventListener('click', () => {
  // Clear authentication
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
  // Redirect to login
  window.location.href = '/';
});
