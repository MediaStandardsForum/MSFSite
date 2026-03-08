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
  const sidebarCta = document.getElementById('sidebar-cta');
  const searchContainer = document.getElementById('search-container');

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
      complaints.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
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

    // Show faded "Select" step, hide CTA
    sidebarCta.innerHTML = `<div class="sidebar-cta-btn faded"><span class="btn-step-number">1</span> Select article below</div>`;
    sidebarCta.classList.remove('search-hidden');
    searchContainer.classList.add('search-hidden');

    // Show loading state
    contentArea.innerHTML = '<div class="loading">Loading...</div>';

    try {
      const response = await fetch(complaint.file);
      if (!response.ok) {
        throw new Error('Failed to load complaint');
      }
      const html = await response.text();
      const safeTitle = complaint.articleTitle.replace(/[\u2018\u2019\u201C\u201D]/g, "'").replace(/[\\/:*?"<>|\ufffd]/g, '').replace(/\s+/g, ' ').trim();
      const complaintPdf = `downloads/${complaint.id}/Complaint_${safeTitle}.pdf`;
      contentArea.innerHTML = `
        <div class="pdf-download-bar">
          <button onclick="openEmailModal('${complaint.id}')" class="pdf-download-btn"><span class="btn-step-number pulse-step">2</span><svg class="download-icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0 0 16 4H4a2 2 0 0 0-1.997 1.884zM18 8.118l-8 4-8-4V14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.118z"/></svg> Email Notice to Publisher</button>
          <a href="${encodeURI(complaintPdf)}" download class="pdf-download-btn"><span class="btn-step-number">3</span><svg class="download-icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M10 1a1 1 0 0 1 1 1v8.586l2.293-2.293a1 1 0 1 1 1.414 1.414l-4 4a1 1 0 0 1-1.414 0l-4-4a1 1 0 1 1 1.414-1.414L9 10.586V2a1 1 0 0 1 1-1zM3 14a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1z"/></svg> Download Complaint</a>
          <button onclick="printInstructions('${complaint.id}')" class="pdf-download-btn"><span class="btn-step-number">4</span><svg class="download-icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M9 2a1 1 0 0 0 0 2h2a1 1 0 1 0 0-2H9zM4 5a2 2 0 0 1 2-2 3 3 0 0 0 3 3h2a3 3 0 0 0 3-3 2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5zm5.707 4.293a1 1 0 0 0-1.414 1.414L9.586 12l-1.293 1.293a1 1 0 1 0 1.414 1.414L11 13.414l1.293 1.293a1 1 0 0 0 1.414-1.414L12.414 12l1.293-1.293a1 1 0 0 0-1.414-1.414L11 10.586l-1.293-1.293z"/></svg> Filing Instructions</button>
        </div>
        <h1 class="complaint-page-title">New Zealand Media Council Complaint</h1>
        ${html}
      `;

      // Track download click — fade step 3, animate step 4
      const downloadBtn = contentArea.querySelector('a.pdf-download-btn');
      if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
          if (window.umami) umami.track('download-complaint', { complaint: complaint.id });
          downloadBtn.classList.add('btn-used');
          document.querySelectorAll('.btn-step-number.pulse-step').forEach(el => el.classList.remove('pulse-step'));
          const barSteps = contentArea.querySelectorAll('.pdf-download-bar .btn-step-number');
          if (barSteps[2]) barSteps[2].classList.add('pulse-step');
        });
      }

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

    // Show CTA, hide search
    sidebarCta.classList.remove('search-hidden');
    searchContainer.classList.add('search-hidden');
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
                <strong>Email the publisher</strong>
                <p>Use the <em>Email Complaint Notice Template</em> button to get a ready-made email you can copy and paste to notify the publisher. The Media Council requires you to contact the publisher first and allow 10 working days for a response.</p>
              </div>
            </div>
            <div class="welcome-step">
              <span class="welcome-step-number">3</span>
              <div>
                <strong>Download the complaint</strong>
                <p>Use the <em>Download Complaint</em> button to get the formal complaint document to attach when filing with the Media Council.</p>
              </div>
            </div>
            <div class="welcome-step">
              <span class="welcome-step-number">4</span>
              <div>
                <strong>File with the Media Council</strong>
                <p>Once the publisher has responded (or 10 working days have passed), use the <em>Filing Instructions</em> button for step-by-step guidance on submitting your complaint to the <a href="https://www.mediacouncil.org.nz/complaints" target="_blank" rel="noopener">NZ Media Council</a>.</p>
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
                <p>\u201cThere is no actual analysis of facts or principles. The statements are conclusory and no evidence is supplied.\u201d</p>
                <p>\u201cEven if this is treated as an Opinion column, that label is not a licence to make accusations without some established facts.\u201d</p>
                <p>\u201cCrux has had a number of complaints upheld against it involving extreme statements of opinion about local politicians. Continued findings against Crux brings into question its ability to meet and maintain the required high standards.\u201d</p>
              </div>
            </a>

            <a href="https://www.mediacouncil.org.nz/rulings/justin-wright-against-crux-news/" target="_blank" rel="noopener" class="ruling-card">
              <div class="ruling-card-heading">Case 3816 \u2014 Justin Wright against Crux News</div>
              <div class="ruling-card-meta">Upheld \u2014 Dec 2025 \u2014 Principle 4 (four articles), Principle 1</div>
              <div class="ruling-card-quotes">
                <p>\u201cReaders would be very uncertain as to whether what they were reading was a factual news story, or a piece of commentary drawn from the author\u2019s subjective analysis of a set of data.\u201d</p>
                <p>\u201cLabelling something as \u2018analysis\u2019 suggests a piece will contain a careful consideration of all the pertinent sides of a discussion or event. At the very least it should contain an honest comment based on factual background.\u201d</p>
                <p>\u201cGiving an election candidate an unchecked \u2018article\u2019 in the middle of an election campaign with no reply from other candidates is clearly unfair.\u201d</p>
                <p>\u201cThe statement \u2026 inappropriately blurs the distinction between fact and comment. This appears to be an entirely speculative view.\u201d</p>
                <p>\u201cThe article makes a number of claims about named individuals, and we consider it was unfair and unbalanced not to give them an opportunity to comment on the analysis of the data provided.\u201d</p>
                <p>\u201cIt was unfair for Crux News to publish them without giving those criticised an opportunity to comment.\u201d</p>
              </div>
            </a>

            <a href="https://www.mediacouncil.org.nz/rulings/barry-bruce-and-justin-wright-against-crux-news/" target="_blank" rel="noopener" class="ruling-card">
              <div class="ruling-card-heading">Case 3804 \u2014 Barry Bruce and Justin Wright against Crux News</div>
              <div class="ruling-card-meta">Upheld \u2014 Dec 2025 \u2014 Principle 4</div>
              <div class="ruling-card-quotes">
                <p>\u201cUsing a label such as \u2018analysis\u2019 does not give a licence to publish an article that says anything the writer likes. An analysis or opinion tag signals perspective, not a free pass. These pieces must still be built on solid facts and presented in a responsible way. The label cannot be used to excuse unsupported claims or personal assertions that cannot be substantiated in the article and should not be used as a get-out-of-jail-free card to allow anything to be said without check.\u201d</p>
                <p>\u201cThis article has failed to clearly distinguish between fact and comment, and it has also fallen well short of meeting the \u2018highest professional standards\u2019 of journalism.\u201d</p>
                <p>\u201cThis article was confusing in that it blurred the lines between claimed fact and comment and could not be described as rigorous analysis.\u201d</p>
              </div>
            </a>

            <a href="https://www.mediacouncil.org.nz/rulings/andrew-tipene-against-crux-publishing/" target="_blank" rel="noopener" class="ruling-card">
              <div class="ruling-card-heading">Case 3356 \u2014 Andrew Tipene against Crux Publishing</div>
              <div class="ruling-card-meta">Upheld \u2014 Dec 2022 \u2014 Principles 1 &amp; 6</div>
              <div class="ruling-card-quotes">
                <p>\u201cAs we have previously noted in doing so Crux must ensure that it meets journalistic standards. The Council notes that it has previously been critical of Crux\u2019s conduct \u2026 We were therefore disappointed by Crux\u2019s conduct in relation to this complaint.\u201d</p>
                <p>\u201cPublications should be bound at all times by accuracy, fairness and balance, and should not deliberately mislead or misinform readers by commission or omission.\u201d</p>
                <p>\u201cThe Media Council has little difficulty in upholding the majority of this complaint.\u201d</p>
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
                <p>\u201cCrux\u2019s reporting has repeatedly crossed the line, especially in its failure to separate fact and comment.\u201d</p>
                <p>\u201cMost concerning is Crux\u2019s inaccurate reporting \u2026 It seems Crux made assumptions, which is another example of the sometimes sloppy reporting by Crux in this matter.\u201d</p>
                <p>\u201cAs we have said in some of those past rulings, a close look at these complaints has not reflected well on either side \u2026 Crux\u2019s reporting has repeatedly crossed the line, especially in its failure to separate fact and comment.\u201d</p>
              </div>
            </a>

            <a href="https://www.mediacouncil.org.nz/rulings/queenstown-airport-corporation-against-crux/" target="_blank" rel="noopener" class="ruling-card">
              <div class="ruling-card-heading">Case 2940 \u2014 Queenstown Airport Corporation against Crux</div>
              <div class="ruling-card-meta">Upheld \u2014 Sep 2020 \u2014 Principles 1, 4 &amp; 6</div>
              <div class="ruling-card-quotes">
                <p>\u201cCrux has misrepresented opinion as material facts and has reported without accuracy, fairness and balance.\u201d</p>
                <p>\u201cThis was a breach of Principle 4 (Comment and Fact) which states a clear distinction should be drawn between factual information and comment or opinion.\u201d</p>
              </div>
            </a>

            <a href="https://www.mediacouncil.org.nz/rulings/queenstown-lakes-district-council-against-crux-2939/" target="_blank" rel="noopener" class="ruling-card">
              <div class="ruling-card-heading">Case 2939 \u2014 QLDC against Crux</div>
              <div class="ruling-card-meta">Partially Upheld \u2014 Sep 2020 \u2014 Principle 4</div>
              <div class="ruling-card-quotes">
                <p>\u201cNewport employs an unusual style of reportage \u2026 a type of advocacy journalism, but he needs to be careful in his blurring of the lines between fact and opinion.\u201d</p>
                <p>\u201cAssertion is not fact and while any journalist can report assertions of a source, Newport in these news stories is the journalist, not the source.\u201d</p>
                <p>\u201cThe Council would repeat the advice that it is problematic for any reportage to be littered with wording such as \u2018appears\u2019, \u2018might\u2019, and \u2018seems\u2019. Assertion is not evidence.\u201d</p>
              </div>
            </a>

            <a href="https://www.mediacouncil.org.nz/rulings/jimmy-carling-against-crux/" target="_blank" rel="noopener" class="ruling-card">
              <div class="ruling-card-heading">Case 2895 \u2014 Jimmy Carling against Crux</div>
              <div class="ruling-card-meta">Not Upheld, Cautioned \u2014 May 2020 \u2014 Fact and comment separation</div>
              <div class="ruling-card-quotes">
                <p>\u201cThe article overall is a mix of comment and fact that blurs the line between the two.\u201d</p>
                <p>\u201cThe complaint is far from frivolous and should give Crux pause for thought in how it conducts itself online and distinguishes between fact and comment. The Council considered upholding the complaint due to the amount of opinion liberally sprinkled through a story that was presented as news.\u201d</p>
                <p>\u201cIf Crux wants to keep writing stories like these using first person narrative and the writer\u2019s opinions, they would do better to clearly identify them to readers as opinion, as per Principle 4. We strongly suggest Crux take greater care in the future.\u201d</p>
              </div>
            </a>

            <a href="https://www.mediacouncil.org.nz/rulings/queenstown-lakes-district-council-against-crux/" target="_blank" rel="noopener" class="ruling-card">
              <div class="ruling-card-heading">Case 2891 \u2014 QLDC against Crux</div>
              <div class="ruling-card-meta">Upheld \u2014 Mar 2020 \u2014 Principles 1 &amp; 4</div>
              <div class="ruling-card-quotes">
                <p>\u201cReaders will be perplexed as to whether this article is a work of fact or comment; it reads as a collision of both without clear labelling.\u201d</p>
                <p>\u201cIt is impossible to tell if the story is accurate or not \u2013 something that might have given Crux pause before publishing \u2013 but it certainly lacks balance.\u201d</p>
                <p>\u201cNewport himself says Crux is \u2018consistently opinionated\u2019.\u201d</p>
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
    const id = hash.split('?')[0];
    const openFiling = hash.includes('filing=true');
    if (id && complaints.some(c => c.id === id)) {
      loadComplaint(id).then(() => {
        if (openFiling) printInstructions(id);
      });
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
        if (window.umami) umami.track('select-complaint', { complaint: id });
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
    if (window.umami) umami.track('filing-instructions', { complaint: id });

    const activePrinciples = (complaint.tags || []).filter(t => PRINCIPLES[t]);
    const principlesChecklist = activePrinciples.map(key => {
      return `<label class="principle-checkbox"><input type="checkbox" checked disabled> ${PRINCIPLES[key]}</label>`;
    }).join('');

    const pubDate = new Date(complaint.date).toLocaleDateString('en-NZ', {
      day: 'numeric', month: 'long', year: 'numeric'
    });

    const safeTitle = complaint.articleTitle.replace(/[\u2018\u2019\u201C\u201D]/g, "'").replace(/[\\/:*?"<>|\ufffd]/g, '').replace(/\s+/g, ' ').trim();
    const complaintUrl = `${SITE_BASE}/#${complaint.id}`;

    // Remove any existing modal
    const existing = document.querySelector('.email-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'email-modal-overlay';
    overlay.innerHTML = `
      <div class="email-modal filing-modal">
        <button class="email-modal-close">&times;</button>
        <div class="filing-modal-header">
          <h2>NZ Media Council Complaint Form Instructions</h2>
          <a href="downloads/${complaint.id}/Instructions_${safeTitle}.pdf" download class="email-copy-btn filing-download-btn"><svg class="download-icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M10 1a1 1 0 0 1 1 1v8.586l2.293-2.293a1 1 0 1 1 1.414 1.414l-4 4a1 1 0 0 1-1.414 0l-4-4a1 1 0 1 1 1.414-1.414L9 10.586V2a1 1 0 0 1 1-1zM3 14a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1z"/></svg> PDF</a>
        </div>
        <p class="email-modal-intro">Follow these steps on the <a href="https://www.mediacouncil.org.nz/complaints" target="_blank" rel="noopener">NZ Media Council complaint form</a>. Copy each field as needed.</p>

        <div class="filing-section">
          <h3>Before you begin</h3>
          <p class="filing-note">You must have already emailed your complaint to ${complaint.publisher} and allowed 10 working days for a response.</p>
          <p class="filing-note"><strong>Have your email client open with the notice you sent and the response from ${complaint.publisher} ready to copy or upload.</strong></p>
        </div>

        <div class="filing-section">
          <h3>Part 1 — Complaints Procedure</h3>
          <p class="filing-note">Read the procedure, tick both declarations, then click <strong>Register Your Details</strong>.</p>
        </div>

        <div class="filing-section">
          <h3>Part 2 — Personal Details</h3>
          <p class="filing-note">Enter your name, email, and phone number. Click <strong>Lodge Complaint</strong>.</p>
        </div>

        <div class="filing-section">
          <h3>Step 1 — Publication Details</h3>
          <div class="email-field">
            <label>The Publisher</label>
            <div class="email-field-row">
              <input type="text" readonly value="${complaint.publisher}">
              <button class="email-copy-btn" data-field="publisher">Copy</button>
            </div>
          </div>
          <div class="email-field">
            <label>Link to the Article</label>
            <div class="email-field-row">
              <input type="text" readonly value="${complaint.articleUrl || ''}">
              <button class="email-copy-btn" data-field="articleUrl">Copy</button>
            </div>
          </div>
          <div class="email-field">
            <label>Publication Date</label>
            <div class="email-field-row">
              <input type="text" readonly value="${pubDate}">
              <button class="email-copy-btn" data-field="pubDate">Copy</button>
            </div>
          </div>
        </div>

        <div class="filing-section">
          <h3>Step 2 — Your Complaint to the Publisher</h3>
          <p class="filing-note">Upload or paste your dated complaint email to ${complaint.publisher}.</p>
        </div>

        <div class="filing-section">
          <h3>Step 3 — The Publisher's Response</h3>
          <p class="filing-note">Upload or paste ${complaint.publisher}'s response. If no response was received, state that 10 working days have passed.</p>
        </div>

        <div class="filing-section">
          <h3>Step 4 — Reason for Your Complaint</h3>
          <p class="filing-note">Upload the complaint PDF you downloaded in step 3, or paste the complaint URL below.</p>
          <div class="email-field">
            <label>Complaint URL</label>
            <div class="email-field-row">
              <input type="text" readonly value="${complaintUrl}">
              <button class="email-copy-btn" data-field="complaintUrl">Copy</button>
            </div>
          </div>
        </div>

        <div class="filing-section">
          <h3>Step 5 — Principles Breached</h3>
          <p class="filing-note">Tick the following principles on the Media Council form:</p>
          <div class="principles-checklist">
            ${principlesChecklist}
          </div>
        </div>

        <p class="filing-note" style="margin-top:1rem;">Click <strong>Submit</strong> on the Media Council form.</p>
      </div>
    `;

    document.body.appendChild(overlay);

    const copyValues = {
      publisher: complaint.publisher,
      articleUrl: complaint.articleUrl || '',
      pubDate: pubDate,
      complaintUrl: complaintUrl,
    };

    overlay.querySelectorAll('.email-copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(copyValues[btn.dataset.field]).then(() => {
          btn.textContent = 'Copied!';
          btn.classList.add('copied');
          if (window.umami) umami.track('filing-copy-' + btn.dataset.field, { field: btn.dataset.field, complaint: complaint.id });
          setTimeout(() => {
            btn.textContent = 'Copy';
            btn.classList.remove('copied');
          }, 1500);
        });
      });
    });

    const pdfBtn = overlay.querySelector('.filing-download-btn');
    if (pdfBtn) {
      pdfBtn.addEventListener('click', () => {
        if (window.umami) umami.track('filing-download-pdf', { complaint: id });
      });
    }

    const closeModal = () => overlay.remove();
    overlay.querySelector('.email-modal-close').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', function handler(e) {
      if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', handler); }
    });
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
    if (window.umami) umami.track('email-notice', { complaint: id });

    const pubDate = new Date(complaint.date).toLocaleDateString('en-NZ', {
      day: 'numeric', month: 'long', year: 'numeric'
    });

    const complaintUrl = `${SITE_BASE}/#${complaint.id}`;
    const noticeFilename = `Notice_${complaint.articleTitle.replace(/[\u2018\u2019\u201C\u201D]/g, "'").replace(/[\\/:*?"<>|\ufffd]/g, '').replace(/\s+/g, ' ').trim()}.pdf`;
    const noticeUrl = `${SITE_BASE}/downloads/${complaint.id}/${encodeURIComponent(noticeFilename)}`;

    const toEmail = complaint.publisherEmail || 'editor@crux.org.nz';
    const subject = `Notice of Complaint \u2014 ${complaint.articleTitle}`;

    const body = `Dear Editor,

I am writing to formally notify ${complaint.publisher} of a complaint concerning the following article:

"${complaint.articleTitle}"
Author: ${complaint.author}
Published: ${pubDate}
URL: ${complaint.articleUrl}

It is my intention to lodge this complaint with the NZ Media Council if it is not resolved at the publication level. In accordance with the Media Council\u2019s complaints procedure, I am first providing ${complaint.publisher} with an opportunity to respond.

The formal Notice of Complaint can be viewed at:
${noticeUrl}

The full complaint and principles alleged to be breached are detailed at:
${complaintUrl}

I request that ${complaint.publisher} acknowledge this complaint and provide a written response within 10 working days. If the concerns raised are accepted, I would ask that a correction or clarification be published.`;

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
            <input type="text" readonly value="${toEmail}">
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
        <hr class="notify-divider">
        <div class="notify-section">
          <p class="notify-intro">Optional: Let Media Standards Forum know you've sent this complaint.</p>
          <div class="email-field">
            <label>Your name</label>
            <div class="email-field-row">
              <input type="text" class="notify-name-input" placeholder="Enter your name">
              <button class="notify-btn" disabled>Notify MSF</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const copyValues = {
      to: toEmail,
      subject: subject,
      body: body,
    };

    overlay.querySelectorAll('.email-copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(copyValues[btn.dataset.field]).then(() => {
          btn.textContent = 'Copied!';
          btn.classList.add('copied');
          if (window.umami) umami.track('email-copy-' + btn.dataset.field, { field: btn.dataset.field, complaint: complaint.id });
          setTimeout(() => {
            btn.textContent = 'Copy';
            btn.classList.remove('copied');
          }, 1500);
        });
      });
    });

    const nameInput = overlay.querySelector('.notify-name-input');
    const notifyBtn = overlay.querySelector('.notify-btn');
    nameInput.addEventListener('input', () => {
      notifyBtn.disabled = !nameInput.value.trim();
    });
    notifyBtn.addEventListener('click', () => {
      const name = nameInput.value.trim();
      if (!name) return;
      notifyBtn.textContent = 'Sending...';
      notifyBtn.disabled = true;
      fetch('https://app.formbricks.com/api/v1/client/cmmgsrc554dcqru01gaovf6uw/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surveyId: 'cmmgtfeaj3vhfry01rkm1haw3',
          finished: true,
          data: {
            x9lslo742a8cqhsi9ym6b9iv: name,
            ih7g7bo20s8eisbfqv4libnf: complaint.articleTitle + ' (' + complaint.id + ')'
          }
        })
      }).then(r => r.json()).then(res => {
        if (res.data && res.data.id) {
          notifyBtn.textContent = 'Sent!';
          notifyBtn.classList.add('copied');
          nameInput.disabled = true;
        } else {
          notifyBtn.textContent = 'Failed';
          notifyBtn.disabled = false;
        }
      }).catch(() => {
        notifyBtn.textContent = 'Failed';
        notifyBtn.disabled = false;
      });
      if (window.umami) umami.track('notify-msf', { complaint: complaint.id });
    });

    const closeModal = () => {
      overlay.remove();
      // Fade the email button and move animation to step 3
      const buttons = document.querySelectorAll('.pdf-download-bar .pdf-download-btn');
      if (buttons[0]) buttons[0].classList.add('btn-used');
      document.querySelectorAll('.btn-step-number.pulse-step').forEach(el => el.classList.remove('pulse-step'));
      const barSteps = document.querySelectorAll('.pdf-download-bar .btn-step-number');
      if (barSteps[1]) barSteps[1].classList.add('pulse-step');
    };
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
