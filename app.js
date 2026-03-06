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
      const response = await fetch('complaints.json?' + Date.now());
      if (!response.ok) {
        throw new Error('Failed to load complaints');
      }
      complaints = await response.json();
      complaints.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
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
          <div class="complaint-card">
            ${complaint.thumbnail ? `<img src="${complaint.thumbnail}" alt="" class="complaint-thumbnail" onerror="this.style.display='none'">` : ''}
            <div class="complaint-card-headline">${escapeHtml(complaint.articleTitle || complaint.title)}</div>
            <span class="complaint-card-meta">${formatDate(complaint.date)} &mdash; ${deadlineLabel(complaint.date)}</span>
          </div>
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

  // Calculate days remaining to notify publisher (1 calendar month from publication)
  function daysToNotify(dateString) {
    const pubDate = new Date(dateString);
    const deadline = new Date(pubDate.getFullYear(), pubDate.getMonth() + 1, pubDate.getDate());
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
    return diff;
  }

  function deadlineLabel(dateString) {
    const days = daysToNotify(dateString);
    if (days < 0) return '<span style="color:#dc2626">Deadline passed</span>';
    if (days === 0) return '<span style="color:#dc2626">Last day to notify</span>';
    if (days <= 7) return `<span style="color:#dc2626">${days} day${days === 1 ? '' : 's'} left</span>`;
    return `<span style="color:#16a34a">${days} days left</span>`;
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
      contentArea.innerHTML = `
        <div class="pdf-download-bar">
          <a href="downloads/${complaint.id}.zip" download class="pdf-download-btn">&#x2913; Download All Documents</a>
        </div>
        ${html}
      `;

      // Update page title
      document.title = `Media Standards Forum | ${complaint.articleTitle || complaint.title}`;

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
  // Principles map
  const PRINCIPLES = {
    'Principle 1':  'Principle 1 — Accuracy, Fairness and Balance',
    'Principle 2':  'Principle 2 — Privacy',
    'Principle 3':  'Principle 3 — Children and Young People',
    'Principle 4':  'Principle 4 — Comment and Fact',
    'Principle 5':  'Principle 5 — Columns, Blogs, Opinion and Letters',
    'Principle 6':  'Principle 6 — Headlines and Captions',
    'Principle 7':  'Principle 7 — Discrimination and Diversity',
    'Principle 8':  'Principle 8 — Confidentiality',
    'Principle 9':  'Principle 9 — Subterfuge',
    'Principle 10': 'Principle 10 — Conflicts of Interest',
    'Principle 11': 'Principle 11 — Photographs and Graphics',
    'Principle 12': 'Principle 12 — Corrections',
  };

  function printInstructions(id) {
    const complaint = complaints.find(c => c.id === id);
    if (!complaint) return;

    const principlesList = (complaint.tags || [])
      .filter(t => PRINCIPLES[t])
      .map(t => `<li>${PRINCIPLES[t]}</li>`)
      .join('');

    const pubDate = new Date(complaint.date).toLocaleDateString('en-NZ', {
      day: 'numeric', month: 'long', year: 'numeric'
    });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Complaint Filing Instructions — ${complaint.articleTitle}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 11pt; color: #111; line-height: 1.6; max-width: 680px; margin: 2rem auto; padding: 0 1.5rem; }
    h1 { font-size: 16pt; margin-bottom: 0.25rem; }
    .subtitle { color: #555; font-size: 10pt; margin-bottom: 2rem; }
    .warning { background: #fff7ed; border: 1px solid #f97316; border-radius: 4px; padding: 0.75rem 1rem; margin-bottom: 1.5rem; font-size: 10pt; color: #7c2d12; }
    .checklist { background: #f5f5f5; border-left: 4px solid #2563eb; padding: 0.75rem 1rem; margin-bottom: 2rem; }
    .checklist h2 { font-size: 11pt; margin: 0 0 0.5rem; }
    .checklist ol { margin: 0; padding-left: 1.25rem; }
    .checklist li { margin-bottom: 0.25rem; }
    h2 { font-size: 12pt; border-bottom: 1px solid #ddd; padding-bottom: 0.25rem; margin-top: 1.75rem; margin-bottom: 0.75rem; }
    .field-block { margin-bottom: 1rem; }
    .field-label { font-weight: 700; font-size: 10pt; text-transform: uppercase; letter-spacing: 0.03em; color: #333; }
    .field-value { border: 1px solid #ccc; border-radius: 3px; padding: 0.4rem 0.6rem; margin-top: 0.2rem; background: #fafafa; font-size: 10pt; word-break: break-all; }
    .field-value.multiline { min-height: 4rem; }
    .note { font-size: 9pt; color: #666; font-style: italic; margin-top: 0.25rem; }
    ul.principles { padding-left: 1.25rem; margin: 0; }
    ul.principles li { margin-bottom: 0.2rem; }
    @page { margin: 20mm; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>Complaint Filing Instructions</h1>
  <p class="subtitle">${complaint.articleTitle} — ${complaint.publisher}</p>

  <div class="warning">
    <strong>Before you begin:</strong> You must have already sent your complaint to ${complaint.publisher} and received their response. The Media Council will not accept your complaint without this.
  </div>

  <div class="checklist">
    <h2>Have these ready:</h2>
    <ol>
      <li>A link or copy of the article (provided below)</li>
      <li>Your dated complaint sent to ${complaint.publisher}</li>
      <li>The dated response from ${complaint.publisher}</li>
      <li>Your outline of the complaint (provided below)</li>
    </ol>
  </div>

  <h2>Part 1 — Complaints Procedure</h2>
  <p>Read the procedure in full and tick both declarations, then click <strong>Register Your Details</strong>.</p>

  <h2>Part 2 — Personal Details</h2>
  <p>Enter your name, email address, and phone number (required). Address fields are optional. Click <strong>Lodge Complaint</strong>.</p>

  <h2>Step 1 — Publication Details</h2>
  <div class="field-block">
    <div class="field-label">The Publisher</div>
    <div class="field-value">${complaint.publisher}</div>
  </div>
  <div class="field-block">
    <div class="field-label">Link to the Article</div>
    <div class="field-value">${complaint.articleUrl || ''}</div>
  </div>
  <div class="field-block">
    <div class="field-label">Publication Date</div>
    <div class="field-value">${pubDate}</div>
  </div>

  <h2>Step 2 — Your Complaint to the Publisher</h2>
  <p>Upload your dated complaint email to ${complaint.publisher}, or paste the text below. <strong>It must be dated.</strong></p>
  <div class="field-block">
    <div class="field-value multiline"></div>
    <p class="note">Paste or upload your complaint to the publisher here.</p>
  </div>

  <h2>Step 3 — The Publisher's Response</h2>
  <p>Upload or paste ${complaint.publisher}'s dated response to your complaint.</p>
  <div class="field-block">
    <div class="field-value multiline"></div>
    <p class="note">Paste or upload the publisher's response here.</p>
  </div>

  <h2>Step 4 — Reason for Your Complaint</h2>
  <p>Copy and paste the complaint text from the Media Standards Forum article into this field, or upload the PDF.</p>
  <div class="field-block">
    <div class="field-value multiline"></div>
    <p class="note">Use the "Download PDF" button on the complaint page to get a copy of the full complaint text.</p>
  </div>

  <h2>Step 5 — Principles Breached</h2>
  <p>Tick the following principles on the form:</p>
  <ul class="principles">${principlesList}</ul>

  <p style="margin-top:2rem; font-size:9pt; color:#666;">Click <strong>Submit</strong> on the Media Council form. If uploading files, allow several minutes for the form to submit.</p>
</body>
</html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }


  function publisherNotice(id) {
    const complaint = complaints.find(c => c.id === id);
    if (!complaint) return;

    const pubDate = new Date(complaint.date).toLocaleDateString('en-NZ', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
    const today = new Date().toLocaleDateString('en-NZ', {
      day: 'numeric', month: 'long', year: 'numeric'
    });

    const principlesHtml = (complaint.noticePrinciples || []).map((p, i) => `
      <div class="principle-block">
        <div class="principle-ref">${i + 1}. ${p.ref}</div>
        <p>${p.summary}</p>
      </div>
    `).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Notice of Complaint to Publisher</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 11pt; color: #111; line-height: 1.7; max-width: 640px; margin: 2rem auto; padding: 0 1.5rem; }
    .letterhead { border-bottom: 2px solid #111; padding-bottom: 1rem; margin-bottom: 2rem; }
    .letterhead h1 { font-size: 13pt; margin: 0 0 0.1rem; }
    .letterhead p { margin: 0; font-size: 10pt; color: #444; }
    .meta { margin-bottom: 2rem; }
    .meta p { margin: 0.2rem 0; font-size: 10.5pt; }
    .meta .label { font-weight: 700; display: inline-block; width: 4rem; }
    h2 { font-size: 11.5pt; font-weight: 700; margin: 1.5rem 0 0.5rem; }
    .principle-block { margin-bottom: 1.25rem; }
    .principle-ref { font-weight: 700; margin-bottom: 0.25rem; }
    p { margin: 0.5rem 0; }
    .article-ref { background: #f5f5f5; border-left: 3px solid #333; padding: 0.5rem 0.75rem; margin: 1rem 0; font-size: 10pt; }
    .signature { margin-top: 3rem; }
    .signature p { margin: 0.15rem 0; }
    @page { margin: 20mm; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <div class="letterhead">
    <h1>Notice of Complaint</h1>
    <p>Submitted under the NZ Media Council Complaints Procedure</p>
  </div>

  <div class="meta">
    <p><span class="label">Date:</span> ${today}</p>
    <p><span class="label">To:</span> ${complaint.publisher}${complaint.publisherEmail ? ' &lt;' + complaint.publisherEmail + '&gt;' : ''}</p>
    <p><span class="label">Re:</span> &ldquo;${complaint.articleTitle}&rdquo;</p>
  </div>

  <p>I am writing to notify ${complaint.publisher} of a formal complaint concerning the following article:</p>

  <div class="article-ref">
    <strong>${complaint.articleTitle}</strong><br>
    Author: ${complaint.author}<br>
    Published: ${pubDate}<br>
    URL: ${complaint.articleUrl || 'See attached'}
  </div>

  <p>It is my intention to lodge this complaint with the NZ Media Council if it is not resolved at the publication level. In accordance with the Media Council's complaints procedure, I am first providing ${complaint.publisher} with an opportunity to respond.</p>

  <h2>Principles Alleged to be Breached</h2>
  ${principlesHtml}

  <h2>Remedy Sought</h2>
  <p>I request that ${complaint.publisher} acknowledge this complaint and provide a written response within 10 working days. If the concerns raised are accepted, I would ask that a correction or clarification be published.</p>

  <div class="signature">
    <p>Yours sincerely,</p>
    <br>
    <p>____________________________</p>
    <p>[Your name]</p>
    <p>[Your contact details]</p>
    <p>${today}</p>
  </div>
</body>
</html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  window.printInstructions = printInstructions;
  window.publisherNotice = publisherNotice;

})();
