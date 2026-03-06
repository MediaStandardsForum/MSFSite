(function() {
  'use strict';

  // State
  let complaints = [];
  let currentComplaintId = null;

  // DOM Elements
  const searchInput = document.getElementById('search-input');
  const complaintList = document.getElementById('complaint-list');
  const contentArea = document.getElementById('content-area');
  const menuToggle = document.querySelector('.menu-toggle');
  const sidebar = document.querySelector('.sidebar');

  // Initialize
  async function init() {
    await loadComplaints();
    setupEventListeners();
    handleInitialRoute();
  }

  // Load complaints from JSON
  async function loadComplaints() {
    try {
      const response = await fetch('complaints.json');
      if (!response.ok) {
        throw new Error('Failed to load complaints');
      }
      complaints = await response.json();
      renderComplaintList(complaints);
    } catch (error) {
      console.error('Error loading complaints:', error);
      complaints = [];
      renderComplaintList([]);
    }
  }

  // Render the complaint list in the sidebar
  function renderComplaintList(items) {
    if (items.length === 0) {
      complaintList.innerHTML = '<li class="no-results">No complaints found</li>';
      return;
    }

    complaintList.innerHTML = items.map(complaint => `
      <li>
        <a href="#${complaint.id}"
           data-id="${complaint.id}"
           class="${complaint.id === currentComplaintId ? 'active' : ''}">
          ${complaint.thumbnail ? `
          <div class="complaint-card">
            <div class="complaint-card-headline">${escapeHtml(complaint.articleTitle || complaint.title)}</div>
            <span class="complaint-card-meta">by ${escapeHtml(complaint.author || '')} — ${formatDate(complaint.date)}</span>
            <img src="${escapeHtml(complaint.thumbnail)}" alt="" class="complaint-thumbnail">
          </div>
          ` : `
          <span class="complaint-date">${formatDate(complaint.date)}</span>
          <span class="complaint-title">${escapeHtml(complaint.title)}</span>
          `}
        </a>
      </li>
    `).join('');
  }

  // Format date for display
  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-NZ', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Load a complaint into the content area
  async function loadComplaint(id) {
    const complaint = complaints.find(c => c.id === id);
    if (!complaint) {
      showError('Complaint not found');
      return;
    }

    currentComplaintId = id;
    updateActiveState();

    // Show loading state
    contentArea.innerHTML = '<div class="loading">Loading...</div>';

    try {
      const response = await fetch(complaint.file);
      if (!response.ok) {
        throw new Error('Failed to load complaint');
      }
      const html = await response.text();
      contentArea.innerHTML = html;

      // Update page title
      document.title = `${complaint.title} | Media Standards Forum`;

      // Close mobile menu after navigation
      closeMobileMenu();

      // Scroll to top of content
      window.scrollTo(0, 0);
    } catch (error) {
      console.error('Error loading complaint:', error);
      showError('Failed to load complaint');
    }
  }

  // Show error message
  function showError(message) {
    contentArea.innerHTML = `
      <div class="error">
        <h2>Error</h2>
        <p>${escapeHtml(message)}</p>
      </div>
    `;
  }

  // Show welcome message
  function showWelcome() {
    currentComplaintId = null;
    updateActiveState();
    document.title = 'Media Standards Forum';
    contentArea.innerHTML = `
      <div class="welcome">
        <h2>Welcome to Media Standards Forum</h2>
        <p>This site publishes analyses and rulings related to NZ Media Council cases.</p>
        <p>Select a complaint from the sidebar to view its details, or use the search box to find specific cases.</p>
      </div>
    `;
  }

  // Update active state in the list
  function updateActiveState() {
    const links = complaintList.querySelectorAll('a');
    links.forEach(link => {
      link.classList.toggle('active', link.dataset.id === currentComplaintId);
    });
  }

  // Filter complaints based on search query
  function filterComplaints(query) {
    if (!query.trim()) {
      renderComplaintList(complaints);
      return;
    }

    const searchTerms = query.toLowerCase().trim().split(/\s+/);

    const filtered = complaints.filter(complaint => {
      const searchableText = [
        complaint.title,
        complaint.summary,
        ...(complaint.tags || [])
      ].join(' ').toLowerCase();

      return searchTerms.every(term => searchableText.includes(term));
    });

    renderComplaintList(filtered);
  }

  // Handle initial route based on URL hash
  function handleInitialRoute() {
    const hash = window.location.hash.slice(1);
    if (hash && complaints.some(c => c.id === hash)) {
      loadComplaint(hash);
    } else if (complaints.length > 0) {
      // Load most recent complaint by default
      loadComplaint(complaints[0].id);
      window.location.hash = complaints[0].id;
    } else {
      showWelcome();
    }
  }

  // Mobile menu functions
  function toggleMobileMenu() {
    const isOpen = sidebar.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', isOpen);

    // Handle overlay
    let overlay = document.querySelector('.sidebar-overlay');
    if (isOpen) {
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.addEventListener('click', closeMobileMenu);
        document.body.appendChild(overlay);
      }
      overlay.classList.add('active');
    } else if (overlay) {
      overlay.classList.remove('active');
    }
  }

  function closeMobileMenu() {
    sidebar.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
    const overlay = document.querySelector('.sidebar-overlay');
    if (overlay) {
      overlay.classList.remove('active');
    }
  }

  // Set up event listeners
  function setupEventListeners() {
    // Search input
    searchInput.addEventListener('input', (e) => {
      filterComplaints(e.target.value);
    });

    // Complaint list clicks (event delegation)
    complaintList.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (link) {
        e.preventDefault();
        const id = link.dataset.id;
        window.location.hash = id;
        loadComplaint(id);
      }
    });

    // Hash change (browser back/forward)
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.slice(1);
      if (hash && hash !== currentComplaintId) {
        loadComplaint(hash);
      }
    });

    // Mobile menu toggle
    menuToggle.addEventListener('click', toggleMobileMenu);

    // Close mobile menu on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sidebar.classList.contains('open')) {
        closeMobileMenu();
      }
    });
  }

  // Start the app when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
