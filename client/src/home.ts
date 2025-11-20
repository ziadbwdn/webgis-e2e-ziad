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

// Book Demo Modal
const demoBtn = document.getElementById('demoBtn');
const demoModal = document.getElementById('demoModal');
const modalClose = document.getElementById('modalClose');
const demoForm = document.getElementById('demoForm') as HTMLFormElement;

demoBtn?.addEventListener('click', () => {
  demoModal?.classList.add('active');
});

modalClose?.addEventListener('click', () => {
  demoModal?.classList.remove('active');
});

demoModal?.addEventListener('click', (e) => {
  if (e.target === demoModal) {
    demoModal.classList.remove('active');
  }
});

demoForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const emailInput = document.getElementById('demoEmail') as HTMLInputElement;
  const email = emailInput?.value;

  alert(`Thank you! We'll contact you at ${email} to schedule your demo.`);
  demoModal?.classList.remove('active');
  demoForm.reset();
});
