/**
 * Dual-Axis Solar Tracker Interactive Simulation
 * Developed for Abu Bakar Siddique's STEM Innovation Showcase
 */

(function () {
  const canvas = document.getElementById('solarCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const sunSlider = document.getElementById('sunSlider');
  const simAutoBtn = document.getElementById('simAutoBtn');
  const simManualBtn = document.getElementById('simManualBtn');
  
  const hudAzimuth = document.getElementById('hudAzimuth');
  const hudElevation = document.getElementById('hudElevation');
  const hudLux = document.getElementById('hudLux');
  const hudState = document.getElementById('hudState');

  let width = canvas.width;
  let height = canvas.height;

  let isAutoOrbit = true;
  let isDraggingSun = false;
  let orbitTime = 0;

  // Base positions
  const groundY = height - 60;
  const baseCenterX = width / 2;
  const baseCenterY = groundY - 30;

  // Sun initial position & angle
  let sunAngleDeg = 90; // 0 (horizon left/East) -> 90 (Zenith) -> 180 (horizon right/West)
  let sunX = width / 2;
  let sunY = 70;
  const orbitRadius = 150;

  // Panel current angle for smooth tracking
  let panelAngle = 0; // -60 to +60 deg

  function updateSunFromAngle(angleDeg) {
    sunAngleDeg = angleDeg;
    // Map 0 -> 180 to radian arc
    const rad = (angleDeg * Math.PI) / 180;
    sunX = baseCenterX - Math.cos(rad) * orbitRadius;
    sunY = groundY - Math.sin(rad) * (orbitRadius * 0.95);
    
    if (sunSlider && !isDraggingSun) {
      sunSlider.value = angleDeg;
    }
  }

  function getAngleFromSun(x, y) {
    const dx = baseCenterX - x;
    const dy = groundY - y;
    let rad = Math.atan2(dy, dx);
    if (rad < 0) rad += Math.PI * 2;
    let deg = (rad * 180) / Math.PI;
    deg = Math.max(10, Math.min(170, deg));
    return deg;
  }

  // Auto / Manual buttons
  if (simAutoBtn && simManualBtn) {
    simAutoBtn.addEventListener('click', () => {
      isAutoOrbit = true;
      simAutoBtn.classList.add('active');
      simManualBtn.classList.remove('active');
    });

    simManualBtn.addEventListener('click', () => {
      isAutoOrbit = false;
      simManualBtn.classList.add('active');
      simAutoBtn.classList.remove('active');
    });
  }

  // Slider change
  if (sunSlider) {
    sunSlider.addEventListener('input', (e) => {
      isAutoOrbit = false;
      if (simAutoBtn && simManualBtn) {
        simManualBtn.classList.add('active');
        simAutoBtn.classList.remove('active');
      }
      updateSunFromAngle(parseFloat(e.target.value));
    });
  }

  // Canvas Mouse / Touch events to drag sun
  function handlePointerDown(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const mx = (clientX - rect.left) * scaleX;
    const my = (clientY - rect.top) * scaleY;

    // Check if clicked close to sun
    const dist = Math.hypot(mx - sunX, my - sunY);
    if (dist < 35) {
      isDraggingSun = true;
      isAutoOrbit = false;
      if (simAutoBtn && simManualBtn) {
        simManualBtn.classList.add('active');
        simAutoBtn.classList.remove('active');
      }
    }
  }

  function handlePointerMove(e) {
    if (!isDraggingSun) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const mx = (clientX - rect.left) * scaleX;
    const my = (clientY - rect.top) * scaleY;

    const angle = getAngleFromSun(mx, my);
    updateSunFromAngle(angle);
  }

  function handlePointerUp() {
    isDraggingSun = false;
  }

  canvas.addEventListener('mousedown', handlePointerDown);
  window.addEventListener('mousemove', handlePointerMove);
  window.addEventListener('mouseup', handlePointerUp);

  canvas.addEventListener('touchstart', handlePointerDown, { passive: true });
  window.addEventListener('touchmove', handlePointerMove, { passive: true });
  window.addEventListener('touchend', handlePointerUp);

  // Animation Loop
  function draw() {
    // Clear background
    ctx.fillStyle = '#070b16';
    ctx.fillRect(0, 0, width, height);

    // Draw Sky Stars / Grid subtle
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, groundY);
      ctx.stroke();
    }

    // Auto orbit update
    if (isAutoOrbit) {
      orbitTime += 0.012;
      const angle = 90 + Math.sin(orbitTime) * 75; // oscillating 15 deg to 165 deg
      updateSunFromAngle(angle);
    }

    // Sun trajectory arc
    ctx.beginPath();
    ctx.arc(baseCenterX, groundY, orbitRadius, Math.PI, 0, false);
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)';
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Ground
    ctx.fillStyle = '#0e1526';
    ctx.fillRect(0, groundY, width, height - groundY);
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(width, groundY);
    ctx.stroke();

    // Target angle for tracker: angle between vertical & sun
    const targetAngle = (sunAngleDeg - 90) * (Math.PI / 180);
    // Smooth servo interpolation (damping factor)
    panelAngle += (targetAngle - panelAngle) * 0.08;

    // Draw Light Beam Rays from Sun to Panel
    const beamGradient = ctx.createLinearGradient(sunX, sunY, baseCenterX, baseCenterY);
    beamGradient.addColorStop(0, 'rgba(251, 191, 36, 0.35)');
    beamGradient.addColorStop(1, 'rgba(6, 182, 212, 0.05)');

    ctx.beginPath();
    ctx.moveTo(sunX - 15, sunY);
    ctx.lineTo(baseCenterX - 45, baseCenterY);
    ctx.lineTo(baseCenterX + 45, baseCenterY);
    ctx.lineTo(sunX + 15, sunY);
    ctx.closePath();
    ctx.fillStyle = beamGradient;
    ctx.fill();

    // Draw Central Light Line
    ctx.beginPath();
    ctx.moveTo(sunX, sunY);
    ctx.lineTo(baseCenterX, baseCenterY);
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw Sun
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 5, sunX, sunY, 35);
    sunGlow.addColorStop(0, '#fff');
    sunGlow.addColorStop(0.3, '#f59e0b');
    sunGlow.addColorStop(0.7, 'rgba(245, 158, 11, 0.3)');
    sunGlow.addColorStop(1, 'transparent');

    ctx.beginPath();
    ctx.arc(sunX, sunY, 35, 0, Math.PI * 2);
    ctx.fillStyle = sunGlow;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(sunX, sunY, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#fbbf24';
    ctx.fill();

    // Draw Tracker Base & Pedestal
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(baseCenterX - 18, groundY - 25, 36, 25);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(baseCenterX - 18, groundY - 25, 36, 25);

    // Servo Pivot Hub
    ctx.beginPath();
    ctx.arc(baseCenterX, baseCenterY, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#06b6d4';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.stroke();

    // Save context for rotated Solar Panel
    ctx.save();
    ctx.translate(baseCenterX, baseCenterY);
    ctx.rotate(panelAngle);

    // Panel Mounting Bracket
    ctx.fillStyle = '#334155';
    ctx.fillRect(-6, -10, 12, 10);

    // Solar Panel Main Frame
    const panelWidth = 96;
    const panelHeight = 12;
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(-panelWidth / 2, -18, panelWidth, panelHeight);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-panelWidth / 2, -18, panelWidth, panelHeight);

    // Solar Cells Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    for (let c = -panelWidth / 2 + 12; c < panelWidth / 2; c += 12) {
      ctx.beginPath();
      ctx.moveTo(c, -18);
      ctx.lineTo(c, -6);
      ctx.stroke();
    }

    // Left & Right LDR Light Sensors
    // Left LDR
    ctx.beginPath();
    ctx.arc(-panelWidth / 2 + 4, -22, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#10b981';
    ctx.fill();
    ctx.stroke();

    // Right LDR
    ctx.beginPath();
    ctx.arc(panelWidth / 2 - 4, -22, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#10b981';
    ctx.fill();
    ctx.stroke();

    // Normal Incidence Vector (Perpendicular 90deg beam from panel)
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(0, -45);
    ctx.strokeStyle = '#10b981';
    ctx.setLineDash([2, 2]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();

    // Update HUD Stats
    const azimuthDeg = Math.round(sunAngleDeg);
    const tiltDeg = Math.round(panelAngle * (180 / Math.PI));
    const angleDelta = Math.abs(targetAngle - panelAngle);
    const efficiencyPercent = Math.max(70, Math.round(98 - angleDelta * 30));

    if (hudAzimuth) hudAzimuth.textContent = `${azimuthDeg}°`;
    if (hudElevation) hudElevation.textContent = `${tiltDeg > 0 ? '+' : ''}${tiltDeg}°`;
    if (hudLux) hudLux.textContent = `${efficiencyPercent}%`;
    if (hudState) {
      if (angleDelta < 0.05) {
        hudState.textContent = 'OPTIMAL 90° LOCK';
        hudState.className = 'hud-val text-emerald';
      } else {
        hudState.textContent = 'SERVO TRACKING...';
        hudState.className = 'hud-val text-gold';
      }
    }

    requestAnimationFrame(draw);
  }

  // Initialize
  updateSunFromAngle(90);
  draw();
})();
