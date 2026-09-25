/**
 * Main Application Logic - Abu Bakar Siddique Executive Presentation Deck
 * Dynamic Data Hydration, Offline Standalone Fallback & Aspect Ratio Engine
 */

// Embedded Fallback Data (Guarantees 100% instant loading on static GitHub Pages, Vercel, or direct file:/// double-click)
const EMBEDDED_PORTFOLIO_DATA = {
  personal: {
    name: "Abu Bakar Siddique",
    title: "Student President • Certified Scout • Young Innovator • Author",
    age: 16,
    grade: "Class 10th",
    school: "Government High School Mazhar Ul Aloom Fort Abbas",
    profileImage: "https://i.pinimg.com/736x/0b/c8/ee/0bc8ee81c3d7c7ac7214db26cbb908a0.jpg",
    email: "abbasifta0x@gmail.com",
    location: {
      town: "Fort Abbas",
      district: "Bahawalnagar",
      division: "Bahawalpur",
      province: "Punjab",
      country: "Pakistan"
    },
    heroBio: "16-year-old 10th-grade student at Government High School Mazhar Ul Aloom, Fort Abbas. Serving with dedication as School President, heading the Character Building Society, holding recognized Scout Certification, authoring the philosophical novel \"Safar-e-Zayan\", and engineering an intelligent Dual-Axis Solar Tracker."
  },
  solarProject: {
    title: "Smart Dual-Axis Solar Tracker",
    subtitle: "Automated Sun-Tracking Photovoltaic System",
    description: "Fixed solar panels lose 35%+ solar energy. I was chosen by our teachers at GHS Mazhar Ul Aloom Fort Abbas to engineer an automated dual-axis tracker with quad light-dependent sensors and micro-servos for continuous maximum power output.",
    techStack: ["Arduino", "LDR Sensors", "Micro Servos", "C++ Firmware", "Solar PV"],
    images: [
      {
        url: "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=900&auto=format&fit=crop&q=80",
        caption: "Photovoltaic Solar Panel Array Concept",
        ratio: "16:9",
        fit: "cover"
      },
      {
        url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=900&auto=format&fit=crop&q=80",
        caption: "Embedded Microcontroller & Circuit Hardware",
        ratio: "16:9",
        fit: "cover"
      }
    ]
  },
  leadership: [
    {
      id: "president",
      badge: "Student Council Head",
      title: "President of the School",
      org: "GHS Mazhar Ul Aloom Fort Abbas",
      description: "Presiding over school assemblies, maintaining campus discipline, organizing academic events, and representing the student body."
    },
    {
      id: "cbs",
      badge: "Integrity & Values Wing",
      title: "Head of Character Building Society",
      org: "Character Building Society (CBS)",
      description: "Spearheading campaigns for honesty in exams, anti-corruption awareness, moral integrity, and social etiquette among high school youth."
    },
    {
      id: "volunteer",
      badge: "Community Service",
      title: "Youth Volunteering Group Leader",
      org: "Student Social Welfare Group",
      description: "Co-founded with close friends to provide peer tutoring, organize tree plantation drives, and support underprivileged students with books."
    }
  ],
  scouting: {
    badgeTitle: "Certified Scout",
    association: "Pakistan Boy Scouts Association",
    description: "Trained in essential scouting tenets including wilderness navigation, rope knots, lashings, timber hitches, first aid drills, and civic emergency assistance.",
    campDetail: "Participated with school teachers and fellow students at the Ghora Gali Scout Camp (Murree) in August 2026 for high-altitude training drills.",
    scoutLaw: "A scout is trustworthy, loyal, helpful, friendly, courteous, kind, obedient, cheerful, thrifty, brave, clean, and reverent."
  },
  novel: {
    titleUrdu: "سفرِ زیاں",
    titleEn: "Safar-e-Zayan",
    status: "In Active Development",
    synopsis: "\"سفرِ زیاں\" (The Journey of Loss and Redemption) is an introspective novel exploring existential challenges, personal loss, resilience against societal pressures, and the spiritual quest for truth. It narrates the moral voyage of a resilient soul through unpredictable tribulations.",
    authorNote: "خسارہ سفر کا اختتام نہیں، بلکہ خود شناسی کی ابتدا ہے۔"
  },
  contact: {
    email: "abbasifta0x@gmail.com",
    location: "Fort Abbas, Bahawalnagar, Bahawalpur, Punjab, Pakistan",
    school: "Government High School Mazhar Ul Aloom"
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  let siteData = EMBEDDED_PORTFOLIO_DATA;

  // 1. Fetch Dynamic Data from API (with fallback to local data.json or embedded data)
  try {
    const res = await fetch('/api/data');
    if (res.ok) {
      siteData = await res.json();
    } else {
      const staticRes = await fetch('./data.json');
      if (staticRes.ok) {
        siteData = await staticRes.json();
      }
    }
  } catch (err) {
    try {
      const staticRes = await fetch('./data.json');
      if (staticRes.ok) {
        siteData = await staticRes.json();
      }
    } catch (e) {
      // Fallback to embedded data
      siteData = EMBEDDED_PORTFOLIO_DATA;
    }
  }

  // 2. Hydrate Page
  hydratePage(siteData);

  function hydratePage(data) {
    if (!data) return;

    // Personal & Bio
    if (data.personal) {
      const p = data.personal;
      setText('dynHeroLastName', (p.name || '').split(' ').slice(1).join(' ') || p.name);
      setText('dynHeroBio', p.heroBio);
      setText('dynStatAge', p.age);
      
      if (p.location) {
        setText('dynTopLocation', `${p.location.town}, ${p.location.province}, ${p.location.country}`);
      }

      if (p.profileImage) {
        const pImg = document.getElementById('dynProfileImg');
        if (pImg) pImg.src = p.profileImage;
        document.querySelectorAll('.sidebar-img').forEach(img => {
          img.src = p.profileImage;
        });
      }
    }

    // Solar Tracker & Project Photos
    if (data.solarProject) {
      const s = data.solarProject;
      setText('dynSolarSubTitle', s.subtitle || s.title);
      setText('dynSolarDesc', s.description);
      
      // Tech Stack
      if (s.techStack && s.techStack.length > 0) {
        const tsWrap = document.getElementById('dynSolarTechStack');
        if (tsWrap) {
          tsWrap.innerHTML = s.techStack.map(t => `<span>${t}</span>`).join('');
        }
      }

      // Project Photos with Aspect Ratio Support
      renderProjectPhotosGallery(s.images || []);
    }

    // Leadership Roles
    if (data.leadership && data.leadership.length > 0) {
      const leadWrap = document.getElementById('dynLeadershipGrid');
      if (leadWrap) {
        leadWrap.innerHTML = data.leadership.map((r, idx) => {
          const numStr = (idx + 1).toString().padStart(2, '0');
          const iconClass = idx === 0 ? 'fa-crown' : idx === 1 ? 'fa-shield-halved' : 'fa-handshake-angle';
          return `
            <div class="deck-num-card">
              <div class="num-watermark">${numStr}</div>
              <div class="num-card-head">
                <div class="num-icon-box bg-yellow"><i class="fa-solid ${iconClass}"></i></div>
                <div>
                  <span class="num-sub">${r.badge || 'Leadership Role'}</span>
                  <h3 class="num-title">${r.title || ''}</h3>
                  <span class="num-org">${r.org || ''}</span>
                </div>
              </div>
              <p class="num-desc">${r.description || ''}</p>
            </div>
          `;
        }).join('');
      }
    }

    // Scouting
    if (data.scouting) {
      const sc = data.scouting;
      setText('dynScoutTitle', sc.badgeTitle);
      setText('dynScoutAssoc', sc.association);
      setText('dynScoutDesc', sc.description);
      setText('dynScoutCamp', sc.campDetail);
      setText('dynScoutLaw', `"${sc.scoutLaw}"`);
    }

    // Novel
    if (data.novel) {
      const n = data.novel;
      setText('dynNovelTitleUrdu', n.titleUrdu);
      setText('dynNovelTitleEn', n.titleEn);
      setText('dynNovelStatus', n.status);
      setText('dynNovelSynopsis', n.synopsis);
      if (n.authorNote) setText('dynNovelAuthorNote', `"${n.authorNote}"`);
    }

    // Contact
    if (data.contact) {
      const c = data.contact;
      setText('dynTopEmail', c.email);
      setText('dynContactEmail', c.email);
      const emailLink = document.getElementById('dynContactEmail');
      if (emailLink) emailLink.href = `mailto:${c.email}`;
    }
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el && val) el.innerHTML = val;
  }

  // 3. Render Project Photos Gallery with Exact Aspect Ratio
  function renderProjectPhotosGallery(images) {
    const galleryWrap = document.getElementById('dynProjectPhotosGrid');
    const gallerySection = document.getElementById('projectGalleryWrap');
    if (!galleryWrap || !gallerySection) return;

    if (!images || images.length === 0) {
      gallerySection.style.display = 'none';
      return;
    }

    gallerySection.style.display = 'block';
    galleryWrap.innerHTML = images.map(img => {
      const ratioCss = getAspectRatioCss(img.ratio);
      const fitMode = img.fit || 'cover';
      return `
        <div class="photo-card-item">
          <div class="photo-img-box" style="aspect-ratio: ${ratioCss};">
            <img src="${img.url}" alt="${img.caption || 'Project asset'}" style="object-fit: ${fitMode};" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800'" />
          </div>
          ${img.caption ? `
            <div class="photo-caption-box">
              <h5 class="p-cap-title">${img.caption}</h5>
              <span class="p-cap-sub">${img.ratio || '16:9'} Format</span>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  function getAspectRatioCss(ratio) {
    if (ratio === '16:9') return '16 / 9';
    if (ratio === '4:3') return '4 / 3';
    if (ratio === '1:1') return '1 / 1';
    if (ratio === '21:9') return '21 / 9';
    if (ratio === '3:2') return '3 / 2';
    return '16 / 9';
  }

  // 4. Dark / Light Mode Switcher
  const themeToggle = document.getElementById('themeToggle');
  const currentTheme = localStorage.getItem('abs_theme') || 'light';

  if (currentTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    if (themeToggle) themeToggle.innerHTML = '<i class="fa-solid fa-sun text-amber"></i>';
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('abs_theme', 'light');
        themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('abs_theme', 'dark');
        themeToggle.innerHTML = '<i class="fa-solid fa-sun text-amber"></i>';
      }
    });
  }

  // 5. ScrollSpy & Sidebar Active Sync
  const slides = document.querySelectorAll('.deck-slide');
  const sidebarLinks = document.querySelectorAll('.s-nav-item');

  window.addEventListener('scroll', () => {
    let currentId = '';
    const scrollPos = window.scrollY + 250;

    slides.forEach(slide => {
      const top = slide.offsetTop;
      const height = slide.offsetHeight;
      if (scrollPos >= top && scrollPos < top + height) {
        currentId = slide.getAttribute('id');
      }
    });

    if (currentId) {
      sidebarLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${currentId}`) {
          link.classList.add('active');
        }
      });
    }
  });

  // 6. Resume Modal Handling
  const viewResumeBtn = document.getElementById('viewResumeBtn');
  const resumeModal = document.getElementById('resumeModal');
  const closeResumeModal = document.getElementById('closeResumeModal');
  const printNowBtn = document.getElementById('printNowBtn');

  if (viewResumeBtn && resumeModal) {
    viewResumeBtn.addEventListener('click', () => {
      resumeModal.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  }

  if (closeResumeModal && resumeModal) {
    closeResumeModal.addEventListener('click', () => {
      resumeModal.classList.remove('open');
      document.body.style.overflow = 'auto';
    });
  }

  if (printNowBtn) {
    printNowBtn.addEventListener('click', () => {
      window.print();
    });
  }

  if (resumeModal) {
    resumeModal.addEventListener('click', (e) => {
      if (e.target === resumeModal) {
        resumeModal.classList.remove('open');
        document.body.style.overflow = 'auto';
      }
    });
  }

  // 7. Contact Form AJAX Submission
  const contactForm = document.getElementById('contactForm');
  const contactFeedback = document.getElementById('contactFeedback');

  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('cName').value;
      const email = document.getElementById('cEmail').value;
      const message = document.getElementById('cMessage').value;

      if (contactFeedback) {
        contactFeedback.style.display = 'block';
        contactFeedback.className = 'form-feedback';
        contactFeedback.textContent = 'Sending message...';
      }

      try {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, message, subject: 'Portfolio Direct Inquiry' })
        });

        const resData = await response.json();
        if (response.ok && resData.success) {
          contactFeedback.className = 'form-feedback success';
          contactFeedback.textContent = resData.message || 'Thank you! Your message has been received.';
          contactForm.reset();
        } else {
          contactFeedback.className = 'form-feedback error';
          contactFeedback.textContent = resData.message || 'Failed to send message. Please try emailing directly.';
        }
      } catch (err) {
        contactFeedback.className = 'form-feedback success';
        contactFeedback.textContent = 'Message noted! You can also email directly to abbasifta0x@gmail.com.';
      }
    });
  }
});
