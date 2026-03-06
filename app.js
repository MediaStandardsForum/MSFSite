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
          <a href="downloads/${complaint.id}.zip" download class="pdf-download-btn"><svg class="download-icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M10 1a1 1 0 0 1 1 1v8.586l2.293-2.293a1 1 0 1 1 1.414 1.414l-4 4a1 1 0 0 1-1.414 0l-4-4a1 1 0 1 1 1.414-1.414L9 10.586V2a1 1 0 0 1 1-1zM3 14a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1z"/></svg> Download Complaint Files and Instructions</a>
          <button onclick="openEmailModal('${complaint.id}')" class="pdf-download-btn"><svg class="download-icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0 0 16 4H4a2 2 0 0 0-1.997 1.884zM18 8.118l-8 4-8-4V14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.118z"/></svg> Email Complaint Notice Template</button>
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
        <div class="welcome-section">
          <h3>When a media outlet repeatedly fails its own standards, the public deserves a way to respond</h3>
          <p>This site publishes detailed complaint analyses for articles that appear to breach the <a href="https://www.mediacouncil.org.nz/principles" target="_blank" rel="noopener">NZ Media Council Principles</a>. Each complaint is a ready-to-use template that anyone can file with the Media Council.</p>
        </div>

        <div class="welcome-section">
          <h3>How it works</h3>
          <div class="welcome-steps">
            <div class="welcome-step">
              <span class="welcome-step-number">1</span>
              <div>
                <strong>Choose an article</strong>
                <p>Select a complaint from the sidebar. Each one analyses a published article against the Media Council Principles.</p>
              </div>
            </div>
            <div class="welcome-step">
              <span class="welcome-step-number">2</span>
              <div>
                <strong>Download complaint files and instructions</strong>
                <p>Use the <em>Download Complaint Files and Instructions</em> button to get the formal Notice of Complaint, the full complaint document, and step-by-step filing instructions.</p>
              </div>
            </div>
            <div class="welcome-step">
              <span class="welcome-step-number">3</span>
              <div>
                <strong>Notify the publisher</strong>
                <p>Use the <em>Email Complaint Notice Template</em> button to get a pre-written email you can send to the publisher. The Media Council requires you to contact the publisher first and allow 10 working days for a response.</p>
              </div>
            </div>
            <div class="welcome-step">
              <span class="welcome-step-number">4</span>
              <div>
                <strong>File with the Media Council</strong>
                <p>Once the publisher has responded (or 10 working days have passed), follow the filing instructions to submit your complaint to the NZ Media Council.</p>
              </div>
            </div>
          </div>
        </div>

        <div class="welcome-section welcome-cta">
          <div class="welcome-step">
            <span class="welcome-step-number welcome-step-arrow">\u2B60</span>
            <div>
              <strong>Get started</strong>
                <p>Select a complaint from the sidebar.</p>
            </div>
          </div>
        </div>

        <hr class="welcome-divider">

        <div class="welcome-section welcome-focus">
          <h3>Why this site focuses on Crux News</h3>
          <p>Most media organisations receive occasional complaints. Findings against a single outlet are rare. Repeated findings \u2014 serious enough to prompt the Council itself to question whether a publication can maintain the standards of journalism \u2014 are exceptional.</p>
          <p>That is precisely what occurred with Crux News and its editor, Peter Newport.</p>
          <blockquote class="welcome-quote">
            <p>\u201cCrux has had a number of complaints upheld against it involving extreme statements of opinion about local politicians. Continued findings against Crux brings into question its ability to meet and maintain the required high standards.\u201d</p>
            <cite>NZ MEDIA COUNCIL \u2014 CASE 3834 (2026)</cite>
          </blockquote>
          <p>This is the language of the Council itself \u2014 the body Crux voluntarily joined and agreed to be bound by. It is not the opinion of this site. It is the formal, published conclusion of thirteen independent experts appointed to uphold New Zealand\u2019s journalism standards.</p>
          <p>A publication that continues to fall short of those standards, despite repeated rulings, warrants continued public scrutiny. That is why this site exists.</p>
        </div>

        <hr class="welcome-divider">

        <div class="welcome-section">
          <h3>NZ Media Council Rulings Against Crux News</h3>
          <p>The NZ Media Council has ruled on Crux News in ten separate cases since 2020.</p>
          <div class="rulings-grid">

            <a href="https://www.mediacouncil.org.nz/rulings/richard-thomas-against-crux-news/" target="_blank" rel="noopener" class="ruling-card">
              <div class="ruling-card-heading">Case 3834 \u2014 Richard Thomas against Crux News</div>
              <div class="ruling-card-meta">Upheld \u2014 Feb 2026 \u2014 Principles 1 &amp; 4</div>
              <div class="ruling-card-quotes">
                <p>\u201cContinued findings against Crux brings into question its ability to meet and maintain the required high standards.\u201d</p>
                <p>\u201cThe statements are conclusory and no evidence is supplied.\u201d</p>
              </div>
            </a>

            <a href="https://www.mediacouncil.org.nz/rulings/justin-wright-against-crux-news/" target="_blank" rel="noopener" class="ruling-card">
              <div class="ruling-card-heading">Case 3816 \u2014 Justin Wright against Crux News</div>
              <div class="ruling-card-meta">Upheld \u2014 Dec 2025 \u2014 Principle 4 (four articles), Principle 1</div>
              <div class="ruling-card-quotes">
                <p>\u201cLabelling something as \u2018analysis\u2019 suggests a piece will contain a careful consideration of all the pertinent sides.\u201d</p>
                <p>\u201cClearly unfair\u201d to publish an election candidate\u2019s unchecked article \u201cin the middle of an election campaign with no reply from other candidates.\u201d</p>
              </div>
            </a>

            <a href="https://www.mediacouncil.org.nz/rulings/barry-bruce-and-justin-wright-against-crux-news/" target="_blank" rel="noopener" class="ruling-card">
              <div class="ruling-card-heading">Case 3804 \u2014 Barry Bruce and Justin Wright against Crux News</div>
              <div class="ruling-card-meta">Upheld \u2014 Dec 2025 \u2014 Principle 4</div>
              <div class="ruling-card-quotes">
                <p>\u201cUsing a label such as \u2018analysis\u2019 does not give a licence to publish an article that says anything the writer likes.\u201d</p>
                <p>\u201cThis article has failed to clearly distinguish between fact and comment, and it has also fallen well short of meeting the \u2018highest professional standards\u2019 of journalism.\u201d</p>
              </div>
            </a>

            <a href="https://www.mediacouncil.org.nz/rulings/andrew-tipene-against-crux-publishing/" target="_blank" rel="noopener" class="ruling-card">
              <div class="ruling-card-heading">Case 3356 \u2014 Andrew Tipene against Crux Publishing</div>
              <div class="ruling-card-meta">Upheld \u2014 Dec 2022 \u2014 Principles 1 &amp; 6</div>
              <div class="ruling-card-quotes">
                <p>\u201cMr Tipene ought to have been given an opportunity to comment on this story before it was published.\u201d</p>
                <p>\u201cCrux must ensure that it meets journalistic standards.\u201d</p>
              </div>
            </a>

            <a href="https://www.mediacouncil.org.nz/rulings/queenstown-lakes-district-council-against-crux-publishing/" target="_blank" rel="noopener" class="ruling-card">
              <div class="ruling-card-heading">Case 3338 \u2014 QLDC against Crux Publishing</div>
              <div class="ruling-card-meta">Not Upheld \u2014 Oct 2022 \u2014 Principles 1, 4 &amp; 12</div>
              <div class="ruling-card-quotes">
                <p>\u201cA clear distinction should be drawn between factual information and comment or opinion.\u201d</p>
              </div>
            </a>

            <a href="https://www.mediacouncil.org.nz/rulings/jendi-paterson-against-crux/" target="_blank" rel="noopener" class="ruling-card">
              <div class="ruling-card-heading">Case 3012 \u2014 Jendi Paterson against Crux</div>
              <div class="ruling-card-meta">Not Upheld \u2014 Mar 2021 \u2014 Principle 1</div>
              <div class="ruling-card-quotes">
                <p>\u201cThe articles have been a consistent and vital journalistic attempt to understand the QLDC\u2019s use of consultants.\u201d</p>
              </div>
            </a>

            <a href="https://www.mediacouncil.org.nz/rulings/queenstown-airport-corporation-against-crux/" target="_blank" rel="noopener" class="ruling-card">
              <div class="ruling-card-heading">Case 2940 \u2014 Queenstown Airport Corporation against Crux</div>
              <div class="ruling-card-meta">Upheld \u2014 Sep 2020 \u2014 Principles 1, 4 &amp; 6</div>
              <div class="ruling-card-quotes">
                <p>\u201cBecause of its unsupported contentions\u2026 Crux is in breach of Media Council Principle 1.\u201d</p>
                <p>\u201cArticles that are essentially comment or opinion should be clearly presented as such.\u201d</p>
              </div>
            </a>

            <a href="https://www.mediacouncil.org.nz/rulings/queenstown-lakes-district-council-against-crux-2939/" target="_blank" rel="noopener" class="ruling-card">
              <div class="ruling-card-heading">Case 2939 \u2014 QLDC against Crux</div>
              <div class="ruling-card-meta">Partially Upheld \u2014 Sep 2020 \u2014 Principle 4</div>
              <div class="ruling-card-quotes">
                <p>\u201cAssertion is not fact and while any journalist can report assertions of a source, Newport in these news stories is the journalist, not the source.\u201d</p>
                <p>\u201cReportage into local government is a vital part of a functioning democracy\u201d yet the publication \u201cover-reached and failed to uphold standards.\u201d</p>
              </div>
            </a>

            <a href="https://www.mediacouncil.org.nz/rulings/jimmy-carling-against-crux/" target="_blank" rel="noopener" class="ruling-card">
              <div class="ruling-card-heading">Case 2895 \u2014 Jimmy Carling against Crux</div>
              <div class="ruling-card-meta">Cautioned \u2014 May 2020 \u2014 Fact and comment separation</div>
              <div class="ruling-card-quotes">
                <p>\u201cThe complaint is far from frivolous and should give Crux pause for thought in how it conducts itself online.\u201d</p>
                <p>\u201cIf Crux wants to keep writing stories like these\u2026 they would do better to clearly identify them.\u201d</p>
              </div>
            </a>

            <a href="https://www.mediacouncil.org.nz/rulings/queenstown-lakes-district-council-against-crux/" target="_blank" rel="noopener" class="ruling-card">
              <div class="ruling-card-heading">Case 2891 \u2014 QLDC against Crux</div>
              <div class="ruling-card-meta">Upheld \u2014 Mar 2020 \u2014 Principles 1 &amp; 4</div>
              <div class="ruling-card-quotes">
                <p>\u201cReaders will be perplexed as to whether this article is a work of fact or comment.\u201d</p>
                <p>\u201cIt certainly lacks balance.\u201d</p>
              </div>
            </a>

          </div>
        </div>
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

    // Home links (header title + logo)
    document.querySelectorAll('.site-home-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        history.pushState(null, '', window.location.pathname);
        showWelcome();
      });
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

</body>
</html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  const SITE_BASE = 'https://mediastandardsforum.github.io/MSFSite';

  function openEmailModal(id) {
    const complaint = complaints.find(c => c.id === id);
    if (!complaint) return;

    const pubDate = new Date(complaint.date).toLocaleDateString('en-NZ', {
      day: 'numeric', month: 'long', year: 'numeric'
    });

    const complaintUrl = `${SITE_BASE}/#${complaint.id}`;
    const noticeFilename = `Notice_${complaint.articleTitle.replace(/[\\/:*?"<>|\ufffd]/g, '').replace(/\s+/g, ' ').trim()}.pdf`;
    const noticeUrl = `${SITE_BASE}/downloads/${complaint.id}/${encodeURIComponent(noticeFilename)}`;

    const subject = `Notice of Complaint \u2014 ${complaint.articleTitle}`;

    const body = `Dear Editor,

I am writing to formally notify Crux News of a complaint concerning the following article:

"${complaint.articleTitle}"
Author: ${complaint.author}
Published: ${pubDate}
URL: ${complaint.articleUrl}

It is my intention to lodge this complaint with the NZ Media Council if it is not resolved at the publication level. In accordance with the Media Council\u2019s complaints procedure, I am first providing Crux News with an opportunity to respond.

The formal Notice of Complaint can be viewed at:
${noticeUrl}

The full complaint and principles alleged to be breached are detailed at:
${complaintUrl}

I request that Crux News acknowledge this complaint and provide a written response within 10 working days. If the concerns raised are accepted, I would ask that a correction or clarification be published.`;

    // Remove any existing modal
    const existing = document.querySelector('.email-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'email-modal-overlay';
    overlay.innerHTML = `
      <div class="email-modal">
        <button class="email-modal-close">&times;</button>
        <h2>Email Notice to Publisher</h2>
        <p class="email-modal-intro">Copy each field into a new email in your email client.</p>
        <div class="email-field">
          <label>To</label>
          <div class="email-field-row">
            <input type="text" readonly value="editor@crux.org.nz">
            <button class="email-copy-btn" data-field="to">Copy</button>
          </div>
        </div>
        <div class="email-field">
          <label>Subject</label>
          <div class="email-field-row">
            <input type="text" readonly value="${subject.replace(/"/g, '&quot;')}">
            <button class="email-copy-btn" data-field="subject">Copy</button>
          </div>
        </div>
        <div class="email-field">
          <label>Body</label>
          <div class="email-field-row email-field-row-body">
            <textarea readonly rows="12">${body.replace(/</g, '&lt;')}</textarea>
            <button class="email-copy-btn" data-field="body">Copy</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const copyValues = {
      to: 'editor@crux.org.nz',
      subject: subject,
      body: body,
    };

    overlay.querySelectorAll('.email-copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(copyValues[btn.dataset.field]).then(() => {
          btn.textContent = 'Copied!';
          btn.classList.add('copied');
          setTimeout(() => {
            btn.textContent = 'Copy';
            btn.classList.remove('copied');
          }, 1500);
        });
      });
    });

    const closeModal = () => overlay.remove();
    overlay.querySelector('.email-modal-close').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', function handler(e) {
      if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', handler); }
    });
  }

  window.openEmailModal = openEmailModal;
  window.printInstructions = printInstructions;
  window.publisherNotice = publisherNotice;

})();
