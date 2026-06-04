/**
 * SpacePoint Gamification Drawer & Congrats Pop-Up System
 * Dynamically injected on student pages to display Leaderboard & Badges/Stamps.
 */

(function() {
  const API_BASE = window.location.origin + '/api';
  const userToken = localStorage.getItem('sp_token');
  const currentMissionId = localStorage.getItem('sp_mission_id');

  // Specs for all 8 satellite-engineering badges
  const BADGE_DETAILS = {
    mission: { name: 'Mission Setup', icon: '🎯', desc: 'Define satellite orbit and goals' },
    components: { name: 'Components Selection', icon: '🔧', desc: 'Add payload to your satellite' },
    conops: { name: 'CONOPS Schedule', icon: '🕒', desc: 'Distribute operational phases' },
    data_budget: { name: 'Data Budget', icon: '📡', desc: 'Configure telemetry generation' },
    power_budget: { name: 'Power Budget', icon: '⚡', desc: 'Establish solar power margins' },
    link_budget: { name: 'Link Budget', icon: '📶', desc: 'Validate ground communications' },
    mass_budget: { name: 'Mass Budget', icon: '⚖️', desc: 'Check satellite mass & volume' },
    cost_budget: { name: 'Cost Budget', icon: '💰', desc: 'Ensure financial viability' }
  };

  // Inject Styles dynamically
  const styleEl = document.createElement('style');
  styleEl.innerHTML = `
    /* Floating Toggle Button */
    .gamification-drawer-btn {
      position: fixed;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      z-index: 999;
      background: linear-gradient(135deg, #653f84, #241134);
      border: 1.5px solid rgba(215, 210, 203, 0.2);
      border-left: none;
      border-radius: 0 1.25rem 1.25rem 0;
      color: #fff;
      padding: 1.25rem 0.5rem;
      cursor: pointer;
      box-shadow: 5px 0 25px rgba(0,0,0,0.6);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.6rem;
      writing-mode: vertical-rl;
      text-orientation: mixed;
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .gamification-drawer-btn:hover {
      padding-left: 0.8rem;
      background: linear-gradient(135deg, #7c4f9f, #241134);
      border-color: rgba(215, 210, 203, 0.4);
    }
    .gamification-drawer-btn span {
      font-size: 1.1rem;
      writing-mode: horizontal-tb;
      margin-bottom: 0.2rem;
    }

    /* Drawer Container */
    .gamification-drawer {
      position: fixed;
      left: 0;
      top: 0;
      height: 100%;
      width: 380px;
      max-width: 85vw;
      background: rgba(26, 12, 39, 0.98);
      border-right: 1.5px solid rgba(215, 210, 203, 0.08);
      box-shadow: 15px 0 50px rgba(0,0,0,0.8);
      z-index: 1010;
      transform: translateX(-100%);
      transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      backdrop-filter: blur(20px);
      font-family: 'Inter', sans-serif;
      text-align: left;
    }
    .gamification-drawer.open {
      transform: translateX(0);
    }

    /* Overlay */
    .gamification-overlay {
      position: fixed;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
      z-index: 1005;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.4s ease;
    }
    .gamification-overlay.active {
      opacity: 1;
      pointer-events: auto;
    }

    /* Compact Card styling inside drawer */
    .drawer-card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(215,210,203,0.06);
      border-radius: 0.75rem;
    }

    /* Congrats Modal */
    .gamification-congrats-modal {
      position: fixed;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(10, 4, 18, 0.88);
      backdrop-filter: blur(15px);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.5s ease;
      font-family: 'Inter', sans-serif;
    }
    .gamification-congrats-modal.active {
      opacity: 1;
      pointer-events: auto;
    }
    .gamification-congrats-content {
      background: linear-gradient(135deg, #241134, #13071c);
      border: 2px solid rgba(163, 112, 218, 0.35);
      box-shadow: 0 0 60px rgba(101, 63, 132, 0.5);
      border-radius: 1.5rem;
      max-width: 480px;
      width: 90%;
      padding: 2.5rem 2rem;
      text-align: center;
      transform: scale(0.8);
      transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .gamification-congrats-modal.active .gamification-congrats-content {
      transform: scale(1);
    }

    .badge-stamp-drawer {
      transition: transform 0.2s;
    }
    .badge-stamp-drawer:hover {
      transform: scale(1.05);
    }
  `;
  document.head.appendChild(styleEl);

  // Define layout structures in memory
  let drawerEl = null;
  let overlayEl = null;
  let congratsModalEl = null;

  // Initialize drawer HTML if logged in and not on authentication/admin/dashboard pages
  const path = window.location.pathname;
  const isExcludedPage = path === '/' || path === '/auth' || path === '/admin' || path === '/dashboard' || !userToken || !currentMissionId;

  if (!isExcludedPage) {
    // 1. Create floating toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'gamification-drawer-btn';
    toggleBtn.innerHTML = '<span>🏆</span>Standings';
    toggleBtn.onclick = toggleDrawer;
    document.body.appendChild(toggleBtn);

    // 2. Create overlay
    overlayEl = document.createElement('div');
    overlayEl.className = 'gamification-overlay';
    overlayEl.onclick = toggleDrawer;
    document.body.appendChild(overlayEl);

    // 3. Create drawer container
    drawerEl = document.createElement('div');
    drawerEl.className = 'gamification-drawer';
    drawerEl.innerHTML = `
      <!-- Header -->
      <div class="p-4 border-b flex items-center justify-between shrink-0" style="border-color:rgba(215,210,203,0.08); background: rgba(36,17,52,0.4);">
        <div class="flex items-center gap-2">
          <span class="text-xl">🏆</span>
          <div>
            <h2 class="text-sm font-bold text-white leading-none">Class Standing</h2>
            <span class="text-[9px] text-zinc-400 mt-1 block" id="drawer-batch-text">Loading batch...</span>
          </div>
        </div>
        <button class="text-zinc-400 hover:text-white text-xl leading-none px-2" onclick="window.toggleGamificationDrawer()">&times;</button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-4 space-y-6">
        <!-- XP Points indicator -->
        <div class="drawer-card p-3.5 flex items-center justify-between bg-white/[0.01]">
          <span class="text-xs text-zinc-400 font-medium">Your Current Score</span>
          <span class="text-xs font-bold uppercase tracking-wider text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1 rounded-xl">
            ⭐ <span id="drawer-total-xp">0</span> XP
          </span>
        </div>

        <!-- Stamps Badge Grid -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-[10px] font-bold uppercase tracking-widest text-[#c4a0e8]">🏅 Satellite Stamps</h3>
            <span class="text-[9px] text-zinc-500" id="drawer-stamps-count">0/8 completed</span>
          </div>
          <div class="grid grid-cols-4 gap-2" id="drawer-badges-grid">
             <!-- Dynamically populated stamps -->
          </div>
        </div>

        <!-- Leaderboard list -->
        <div>
          <h3 class="text-[10px] font-bold uppercase tracking-widest text-[#c4a0e8] mb-3">🏁 Class Leaderboard</h3>
          <div class="space-y-2" id="drawer-leaderboard-list">
             <!-- Dynamically populated rankings -->
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(drawerEl);
    
    // Bind to window for global click handlers
    window.toggleGamificationDrawer = toggleDrawer;
  }

  // Congrats Modal setup (Always needed so pages can trigger congrats popup)
  congratsModalEl = document.createElement('div');
  congratsModalEl.className = 'gamification-congrats-modal';
  congratsModalEl.id = 'gamification-congrats-modal';
  congratsModalEl.innerHTML = `
    <div class="gamification-congrats-content">
      <div class="text-5xl mb-4 animate-bounce" id="congrats-badge-icon">🎯</div>
      <h2 class="text-xl font-extrabold text-white mb-1">Badge Unlocked!</h2>
      <p class="text-xs text-[#c4a0e8] uppercase font-bold tracking-widest mb-3" id="congrats-badge-name">Mission Setup</p>
      
      <p class="text-sm text-zinc-300 leading-relaxed max-w-sm mx-auto mb-6">
        Congratulations! You have completed this design phase and earned a new satellite stamp.
      </p>

      <!-- Earned XP breakdown card -->
      <div class="drawer-card p-4 mb-6 max-w-xs mx-auto bg-[#c4a0e808] border-[#c4a0e822]">
        <p class="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">XP Reward</p>
        <p class="text-2xl font-black text-yellow-400 mt-1" id="congrats-xp-val">+100 XP</p>
        <p class="text-[9px] text-zinc-500 mt-1" id="congrats-bonus-note"></p>
      </div>

      <button id="congrats-continue-btn" class="w-full py-3 rounded-xl text-white font-semibold text-sm cursor-pointer transition-transform duration-200 hover:scale-[1.02]" style="background:linear-gradient(135deg,#653f84,#241134); border:1px solid rgba(215,210,203,0.15);">
        Continue to Next Phase →
      </button>
    </div>
  `;
  document.body.appendChild(congratsModalEl);

  // Expose global function to trigger popup
  window.showBadgePopup = async function(badgeKey, nextUrl) {
    if (!userToken || !currentMissionId) {
      window.location.href = nextUrl;
      return;
    }

    const modal = document.getElementById('gamification-congrats-modal');
    const badgeIcon = document.getElementById('congrats-badge-icon');
    const badgeName = document.getElementById('congrats-badge-name');
    const xpVal = document.getElementById('congrats-xp-val');
    const bonusNote = document.getElementById('congrats-bonus-note');
    const continueBtn = document.getElementById('congrats-continue-btn');

    const spec = BADGE_DETAILS[badgeKey] || { name: 'Phase Finished', icon: '🚀' };
    badgeIcon.textContent = spec.icon;
    badgeName.textContent = spec.name;

    // Load API data to find the exact XP awarded
    let earnedXP = 100;
    let speedBonus = 0;
    try {
      const res = await fetch(`${API_BASE}/missions/${currentMissionId}/leaderboard`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        earnedXP = data.section_xp[badgeKey] || 100;
        speedBonus = earnedXP - 100;
      }
    } catch(e) {
      console.warn("Failed to retrieve congrats XP details:", e);
    }

    xpVal.textContent = `+${earnedXP} XP`;
    if (speedBonus > 0) {
      bonusNote.innerHTML = `Includes <strong class="text-green-400">+${speedBonus} XP</strong> Speed Release Bonus!`;
    } else {
      bonusNote.textContent = "Base Phase Completion reward.";
    }

    continueBtn.onclick = function() {
      modal.classList.remove('active');
      setTimeout(() => {
        window.location.href = nextUrl;
      }, 300);
    };

    // Show modal
    modal.classList.add('active');
  };

  // Helper: Toggle Drawer visibility & fetch data on open
  function toggleDrawer() {
    if (!drawerEl || !overlayEl) return;
    const isOpen = drawerEl.classList.contains('open');
    if (isOpen) {
      drawerEl.classList.remove('open');
      overlayEl.classList.remove('active');
    } else {
      drawerEl.classList.add('open');
      overlayEl.classList.add('active');
      loadDrawerData();
    }
  }

  // Helper: Fetch leaderboard and badges for the drawer
  async function loadDrawerData() {
    try {
      const res = await fetch(`${API_BASE}/missions/${currentMissionId}/leaderboard`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      if (!res.ok) throw new Error("Leaderboard load failed");
      const data = await res.json();

      // Render Batch label
      const batchText = document.getElementById('drawer-batch-text');
      if (batchText) {
        batchText.innerHTML = data.invitation_code 
          ? `Batch: <strong class="text-[#c4a0e8]">${data.invitation_code}</strong>` 
          : `Individual Standing`;
      }

      // Render score
      const totalXp = document.getElementById('drawer-total-xp');
      if (totalXp) totalXp.textContent = data.points;

      // Render stamps
      const badgesGrid = document.getElementById('drawer-badges-grid');
      if (badgesGrid) {
        let completedCount = 0;
        const keys = Object.keys(BADGE_DETAILS);
        
        badgesGrid.innerHTML = keys.map(key => {
          const spec = BADGE_DETAILS[key];
          const earned = data.stamps[key];
          if (earned) completedCount++;

          const opacity = earned ? 'opacity-100 border-green-500/20 bg-green-500/5' : 'opacity-30 border-white/5 bg-white/[0.01]';
          return `
            <div class="rounded-xl p-2 border flex flex-col items-center text-center badge-stamp-drawer transition ${opacity}" title="${spec.name}: ${earned ? 'Completed' : 'Incomplete'}">
              <span class="text-xl mb-1">${spec.icon}</span>
              <span class="text-[8px] font-bold text-white truncate w-full">${spec.name.split(' ')[0]}</span>
            </div>
          `;
        }).join('');

        const stampCountEl = document.getElementById('drawer-stamps-count');
        if (stampCountEl) stampCountEl.textContent = `${completedCount}/8 completed`;
      }

      // Render leaderboard rankings
      const leaderboardList = document.getElementById('drawer-leaderboard-list');
      if (leaderboardList) {
        if (!data.leaderboard || data.leaderboard.length === 0) {
          leaderboardList.innerHTML = '<p class="text-zinc-500 text-xs text-center py-4">No classmates found.</p>';
          return;
        }

        leaderboardList.innerHTML = data.leaderboard.map((item, idx) => {
          const rank = idx + 1;
          let medal = `<span class="text-xs font-bold text-zinc-500 w-5 text-center">#${rank}</span>`;
          if (rank === 1) medal = '<span class="text-sm w-5 text-center">🥇</span>';
          if (rank === 2) medal = '<span class="text-sm w-5 text-center">🥈</span>';
          if (rank === 3) medal = '<span class="text-sm w-5 text-center">🥉</span>';

          const isCurrent = item.is_current;
          const bg = isCurrent 
            ? 'background: rgba(101,63,132,0.2); border-color: rgba(101,63,132,0.4);' 
            : 'background: rgba(255,255,255,0.01); border-color: rgba(215,210,203,0.04);';
          
          return `
            <div class="rounded-xl p-2 border flex items-center justify-between gap-2" style="${bg}">
              <div class="flex items-center gap-2 min-w-0">
                ${medal}
                <div class="min-w-0">
                  <p class="text-xs truncate font-bold text-white ${isCurrent ? 'text-secondary' : 'text-zinc-300'}">
                    ${item.student_name} ${isCurrent ? '<span class="text-[8px] text-[#c4a0e8] bg-[#653f84]/30 px-1 py-0.2 rounded font-normal ml-0.5">You</span>' : ''}
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                <span class="text-[9px] text-zinc-400 bg-white/5 border border-white/5 px-1.5 py-0.2 rounded">
                  🧩 ${item.completed_sections}/8
                </span>
                <span class="text-xs font-bold text-yellow-400 font-mono">
                  ${item.points} XP
                </span>
              </div>
            </div>
          `;
        }).join('');
      }

    } catch (e) {
      console.warn("Leaderboard drawer load failed:", e);
    }
  }

})();
