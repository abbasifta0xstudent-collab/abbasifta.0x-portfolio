/**
 * Admin Control Center - Abu Bakar Siddique Portfolio
 * Master Password: !#@AaA1954@AaA1089@#!
 */

const MASTER_PASS = "!#@AaA1954@AaA1089@#!";
let siteData = null;

document.addEventListener('DOMContentLoaded', () => {
  // 1. Auth Check
  const sessionAuth = sessionStorage.getItem('abs_admin_auth');
  const loginBackdrop = document.getElementById('loginBackdrop');
  const adminDashboard = document.getElementById('adminDashboard');
  const loginForm = document.getElementById('loginForm');
  const adminPassword = document.getElementById('adminPassword');
  const loginError = document.getElementById('loginError');
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');

  if (sessionAuth === 'true') {
    unlockDashboard();
  }

  // Toggle Password Visibility
  if (togglePasswordBtn && adminPassword) {
    togglePasswordBtn.addEventListener('click', () => {
      const type = adminPassword.getAttribute('type') === 'password' ? 'text' : 'password';
      adminPassword.setAttribute('type', type);
      togglePasswordBtn.innerHTML = type === 'password' 
        ? '<i class="fa-regular fa-eye"></i>' 
        : '<i class="fa-regular fa-eye-slash"></i>';
    });
  }

  // Handle Login Submission
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const entered = adminPassword.value.trim();
      const pin2fa = document.getElementById('admin2faPin') ? document.getElementById('admin2faPin').value.trim() : '';

      try {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: entered, pin2fa: pin2fa || undefined })
        });
        const json = await res.json();

        if (res.ok && json.success) {
          sessionStorage.setItem('abs_admin_auth', 'true');
          unlockDashboard();
          return;
        } else {
          loginError.textContent = json.message || 'Authentication failed. Please verify credentials.';
          loginError.classList.remove('hidden');
          return;
        }
      } catch (err) {
        // Local offline check if running without server
        if (entered === MASTER_PASS) {
          sessionStorage.setItem('abs_admin_auth', 'true');
          unlockDashboard();
          return;
        }
      }

      loginError.textContent = 'Invalid Master Password or 2FA PIN. Please try again.';
      loginError.classList.remove('hidden');
    });
  }

  // Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('abs_admin_auth');
      window.location.reload();
    });
  }

  function unlockDashboard() {
    if (loginBackdrop) loginBackdrop.classList.add('hidden');
    if (adminDashboard) adminDashboard.classList.remove('hidden');
    loadSiteData();
  }

  // 2. Tab Navigation
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const pane = document.getElementById(targetTab);
      if (pane) pane.classList.add('active');
    });
  });

  // 3. Load Site Data
  async function loadSiteData() {
    try {
      const res = await fetch('/api/data');
      siteData = await res.json();
      populateForm(siteData);
    } catch (err) {
      console.error('Error fetching site data:', err);
      showToast('Error loading current data.', 'error');
    }
  }

  // Populate Form Fields
  function populateForm(data) {
    if (!data) return;

    // Personal
    setVal('p_name', data.personal?.name);
    setVal('p_title', data.personal?.title);
    setVal('p_age', data.personal?.age);
    setVal('p_grade', data.personal?.grade);
    setVal('p_school', data.personal?.school);
    setVal('p_profileImage', data.personal?.profileImage);
    setVal('p_town', data.personal?.location?.town);
    setVal('p_district', data.personal?.location?.district);
    setVal('p_division', data.personal?.location?.division);
    setVal('p_heroBio', data.personal?.heroBio);
    setVal('p_typewriterRoles', (data.personal?.typewriterRoles || []).join('\n'));

    // Image preview
    const profileImg = document.getElementById('profileImgPreview');
    if (profileImg && data.personal?.profileImage) {
      profileImg.src = data.personal.profileImage;
    }
    const profileInput = document.getElementById('p_profileImage');
    if (profileInput && profileImg) {
      profileInput.addEventListener('input', () => {
        profileImg.src = profileInput.value;
      });
    }

    // Solar Project
    setVal('s_title', data.solarProject?.title);
    setVal('s_subtitle', data.solarProject?.subtitle);
    setVal('s_selectedBy', data.solarProject?.selectedBy);
    setVal('s_efficiency', data.solarProject?.efficiencyBoost);
    setVal('s_desc', data.solarProject?.description);
    setVal('s_highlights', (data.solarProject?.highlights || []).join('\n'));
    setVal('s_techStack', (data.solarProject?.techStack || []).join(', '));

    renderProjectPhotos(data.solarProject?.images || []);

    // Leadership
    renderLeadershipRoles(data.leadership || []);

    // Scouting
    setVal('sc_badgeTitle', data.scouting?.badgeTitle);
    setVal('sc_association', data.scouting?.association);
    setVal('sc_desc', data.scouting?.description);
    setVal('sc_camp', data.scouting?.campDetail);
    setVal('sc_law', data.scouting?.scoutLaw);

    // Novel
    setVal('n_urdu', data.novel?.titleUrdu);
    setVal('n_en', data.novel?.titleEn);
    setVal('n_genre', data.novel?.genre);
    setVal('n_status', data.novel?.status);
    setVal('n_synopsis', data.novel?.synopsis);
    setVal('n_note', data.novel?.authorNote);

    // Activities
    renderActivities(data.activities || []);

    // Contact
    setVal('c_email', data.contact?.email);
    setVal('c_location', data.contact?.location);
    setVal('c_school', data.contact?.school);
    setVal('c_office', data.contact?.office);
  }

  function setVal(id, val) {
    const el = document.getElementById(id);
    if (el && val !== undefined) el.value = val;
  }

  // 4. Render Project Photos with Live Aspect Ratio
  const projectPhotosList = document.getElementById('projectPhotosList');
  const addProjectPhotoBtn = document.getElementById('addProjectPhotoBtn');

  function renderProjectPhotos(images) {
    if (!projectPhotosList) return;
    projectPhotosList.innerHTML = '';

    images.forEach((img, idx) => {
      const card = document.createElement('div');
      card.className = 'photo-item-card';
      card.innerHTML = `
        <div class="photo-ratio-preview-box" style="aspect-ratio: ${getAspectRatioCss(img.ratio)}">
          <img src="${img.url || ''}" alt="Preview" style="object-fit: ${img.fit || 'cover'};" onerror="this.src='https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600'" />
        </div>
        <div class="photo-fields-col">
          <input type="url" class="photo-url-input" value="${img.url || ''}" placeholder="Image URL..." required />
          <input type="text" class="photo-caption-input" value="${img.caption || ''}" placeholder="Photo Caption..." />
          <div class="photo-ratio-select-row">
            <div>
              <label style="font-size:0.75rem; color:var(--admin-text-muted);">Aspect Ratio</label>
              <select class="photo-ratio-select">
                <option value="16:9" ${img.ratio === '16:9' ? 'selected' : ''}>16:9 (Widescreen)</option>
                <option value="4:3" ${img.ratio === '4:3' ? 'selected' : ''}>4:3 (Standard)</option>
                <option value="1:1" ${img.ratio === '1:1' ? 'selected' : ''}>1:1 (Square)</option>
                <option value="21:9" ${img.ratio === '21:9' ? 'selected' : ''}>21:9 (Cinematic)</option>
                <option value="3:2" ${img.ratio === '3:2' ? 'selected' : ''}>3:2 (Classic)</option>
              </select>
            </div>
            <div>
              <label style="font-size:0.75rem; color:var(--admin-text-muted);">Fitting Mode</label>
              <select class="photo-fit-select">
                <option value="cover" ${img.fit === 'cover' ? 'selected' : ''}>Cover (Full Fill)</option>
                <option value="contain" ${img.fit === 'contain' ? 'selected' : ''}>Contain (No Crop)</option>
              </select>
            </div>
          </div>
        </div>
        <button type="button" class="btn-delete-photo" title="Remove Photo">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      `;

      // Event listeners for live preview
      const urlInput = card.querySelector('.photo-url-input');
      const ratioSelect = card.querySelector('.photo-ratio-select');
      const fitSelect = card.querySelector('.photo-fit-select');
      const previewImg = card.querySelector('img');
      const previewBox = card.querySelector('.photo-ratio-preview-box');
      const deleteBtn = card.querySelector('.btn-delete-photo');

      urlInput.addEventListener('input', () => { previewImg.src = urlInput.value; });
      ratioSelect.addEventListener('change', () => {
        previewBox.style.aspectRatio = getAspectRatioCss(ratioSelect.value);
      });
      fitSelect.addEventListener('change', () => {
        previewImg.style.objectFit = fitSelect.value;
      });
      deleteBtn.addEventListener('click', () => {
        card.remove();
      });

      projectPhotosList.appendChild(card);
    });
  }

  function getAspectRatioCss(ratio) {
    if (ratio === '16:9') return '16 / 9';
    if (ratio === '4:3') return '4 / 3';
    if (ratio === '1:1') return '1 / 1';
    if (ratio === '21:9') return '21 / 9';
    if (ratio === '3:2') return '3 / 2';
    return '16 / 9';
  }

  if (addProjectPhotoBtn) {
    addProjectPhotoBtn.addEventListener('click', () => {
      const current = gatherProjectPhotos();
      current.push({
        url: '',
        caption: 'New Solar Project Photo',
        ratio: '16:9',
        fit: 'cover'
      });
      renderProjectPhotos(current);
    });
  }

  function gatherProjectPhotos() {
    const photos = [];
    document.querySelectorAll('.photo-item-card').forEach(card => {
      const url = card.querySelector('.photo-url-input')?.value.trim();
      const caption = card.querySelector('.photo-caption-input')?.value.trim();
      const ratio = card.querySelector('.photo-ratio-select')?.value;
      const fit = card.querySelector('.photo-fit-select')?.value;
      if (url) {
        photos.push({ url, caption, ratio, fit });
      }
    });
    return photos;
  }

  // 5. Render Leadership Roles
  const leadershipList = document.getElementById('leadershipList');
  function renderLeadershipRoles(roles) {
    if (!leadershipList) return;
    leadershipList.innerHTML = '';

    roles.forEach((role, idx) => {
      const div = document.createElement('div');
      div.className = 'role-edit-card';
      div.innerHTML = `
        <h3 class="sub-heading mb-3"><i class="fa-solid fa-crown text-gold"></i> Role #${idx + 1}: ${role.title || ''}</h3>
        <div class="form-grid-2">
          <div class="form-field">
            <label>Title</label>
            <input type="text" class="lead-title" value="${role.title || ''}" />
          </div>
          <div class="form-field">
            <label>Badge Label</label>
            <input type="text" class="lead-badge" value="${role.badge || ''}" />
          </div>
        </div>
        <div class="form-field">
          <label>Organization / Wing</label>
          <input type="text" class="lead-org" value="${role.org || ''}" />
        </div>
        <div class="form-field">
          <label>Description</label>
          <textarea class="lead-desc" rows="3">${role.description || ''}</textarea>
        </div>
        <div class="form-field">
          <label>Bullet Points (One per line)</label>
          <textarea class="lead-points" rows="3">${(role.points || []).join('\n')}</textarea>
        </div>
      `;
      leadershipList.appendChild(div);
    });
  }

  function gatherLeadershipRoles() {
    const roles = [];
    document.querySelectorAll('.role-edit-card').forEach((card, idx) => {
      roles.push({
        id: siteData?.leadership[idx]?.id || `role-${idx}`,
        badge: card.querySelector('.lead-badge')?.value.trim(),
        title: card.querySelector('.lead-title')?.value.trim(),
        org: card.querySelector('.lead-org')?.value.trim(),
        description: card.querySelector('.lead-desc')?.value.trim(),
        points: (card.querySelector('.lead-points')?.value || '').split('\n').map(s => s.trim()).filter(Boolean),
        themeColor: siteData?.leadership[idx]?.themeColor || 'gold'
      });
    });
    return roles;
  }

  // 6. Render Activities
  const activitiesList = document.getElementById('activitiesList');
  function renderActivities(acts) {
    if (!activitiesList) return;
    activitiesList.innerHTML = '';

    acts.forEach((act, idx) => {
      const div = document.createElement('div');
      div.className = 'role-edit-card';
      div.innerHTML = `
        <h4 class="sub-heading mb-3"><i class="${act.icon || 'fa-solid fa-star'} text-gold"></i> Activity #${idx + 1}</h4>
        <div class="form-grid-2">
          <div class="form-field">
            <label>Title</label>
            <input type="text" class="act-title" value="${act.title || ''}" />
          </div>
          <div class="form-field">
            <label>FontAwesome Icon Class</label>
            <input type="text" class="act-icon" value="${act.icon || ''}" />
          </div>
        </div>
        <div class="form-field">
          <label>Description</label>
          <textarea class="act-desc" rows="2">${act.desc || ''}</textarea>
        </div>
      `;
      activitiesList.appendChild(div);
    });
  }

  function gatherActivities() {
    const acts = [];
    document.querySelectorAll('.activities-editor-list .role-edit-card').forEach((card, idx) => {
      acts.push({
        icon: card.querySelector('.act-icon')?.value.trim(),
        title: card.querySelector('.act-title')?.value.trim(),
        desc: card.querySelector('.act-desc')?.value.trim(),
        themeColor: siteData?.activities[idx]?.themeColor || 'gold'
      });
    });
    return acts;
  }

  // 7. Save & Publish Changes
  const adminContentForm = document.getElementById('adminContentForm');
  const saveTopBtn = document.getElementById('saveTopBtn');
  const saveBottomBtn = document.getElementById('saveBottomBtn');
  const resetBtn = document.getElementById('resetBtn');

  if (saveTopBtn) saveTopBtn.addEventListener('click', () => saveAllChanges());
  if (adminContentForm) adminContentForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveAllChanges();
  });

  if (resetBtn) resetBtn.addEventListener('click', () => {
    if (confirm('Discard any unsaved changes and reload current values?')) {
      loadSiteData();
    }
  });

  async function saveAllChanges() {
    const updated = {
      personal: {
        name: document.getElementById('p_name')?.value.trim(),
        title: document.getElementById('p_title')?.value.trim(),
        age: parseInt(document.getElementById('p_age')?.value) || 16,
        grade: document.getElementById('p_grade')?.value.trim(),
        school: document.getElementById('p_school')?.value.trim(),
        profileImage: document.getElementById('p_profileImage')?.value.trim(),
        email: document.getElementById('c_email')?.value.trim() || 'abbasifta0x@gmail.com',
        location: {
          town: document.getElementById('p_town')?.value.trim(),
          district: document.getElementById('p_district')?.value.trim(),
          division: document.getElementById('p_division')?.value.trim(),
          province: 'Punjab',
          country: 'Pakistan'
        },
        heroBio: document.getElementById('p_heroBio')?.value.trim(),
        typewriterRoles: (document.getElementById('p_typewriterRoles')?.value || '').split('\n').map(s => s.trim()).filter(Boolean),
        stats: siteData?.personal?.stats || { age: 16, portfolios: '6+', scoutingIntegrity: '100%', solarEfficiency: '35%+' }
      },
      solarProject: {
        title: document.getElementById('s_title')?.value.trim(),
        subtitle: document.getElementById('s_subtitle')?.value.trim(),
        selectedBy: document.getElementById('s_selectedBy')?.value.trim(),
        status: siteData?.solarProject?.status || 'In Active Prototyping & Calibration',
        efficiencyBoost: document.getElementById('s_efficiency')?.value.trim(),
        description: document.getElementById('s_desc')?.value.trim(),
        highlights: (document.getElementById('s_highlights')?.value || '').split('\n').map(s => s.trim()).filter(Boolean),
        techStack: (document.getElementById('s_techStack')?.value || '').split(',').map(s => s.trim()).filter(Boolean),
        images: gatherProjectPhotos()
      },
      leadership: gatherLeadershipRoles(),
      scouting: {
        badgeTitle: document.getElementById('sc_badgeTitle')?.value.trim(),
        association: document.getElementById('sc_association')?.value.trim(),
        description: document.getElementById('sc_desc')?.value.trim(),
        campDetail: document.getElementById('sc_camp')?.value.trim(),
        scoutLaw: document.getElementById('sc_law')?.value.trim(),
        skills: siteData?.scouting?.skills || []
      },
      novel: {
        titleUrdu: document.getElementById('n_urdu')?.value.trim(),
        titleEn: document.getElementById('n_en')?.value.trim(),
        genre: document.getElementById('n_genre')?.value.trim(),
        status: document.getElementById('n_status')?.value.trim(),
        synopsis: document.getElementById('n_synopsis')?.value.trim(),
        authorNote: document.getElementById('n_note')?.value.trim()
      },
      activities: gatherActivities(),
      contact: {
        email: document.getElementById('c_email')?.value.trim(),
        location: document.getElementById('c_location')?.value.trim(),
        school: document.getElementById('c_school')?.value.trim(),
        office: document.getElementById('c_office')?.value.trim()
      }
    };

    try {
      const res = await fetch('/api/admin/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': MASTER_PASS
        },
        body: JSON.stringify(updated)
      });

      const json = await res.json();
      if (json.success) {
        siteData = updated;
        showToast('✨ All changes published successfully to live website!', 'success');
      } else {
        showToast(json.message || 'Failed to publish changes.', 'error');
      }
    } catch (err) {
      console.error('Error saving data:', err);
      showToast('Server error while saving.', 'error');
    }
  }

  function showToast(msg, type = 'success') {
    const toast = document.getElementById('saveToast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className = `admin-toast ${type === 'error' ? 'error-alert' : ''}`;
    toast.classList.remove('hidden');

    setTimeout(() => {
      toast.classList.add('hidden');
    }, 4000);
  }
});
