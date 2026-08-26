import { DATA } from './data.js';

// DOM Elements
const collectionTrack = document.getElementById('collection');
const timelineSticky = document.getElementById('timelineSticky');
const timelineInner = document.getElementById('timelineInner');
const timelineProgress = document.getElementById('timelineProgress');
const searchPill = document.getElementById('searchPill');
const searchBox = document.getElementById('searchBox');
const searchInput = document.getElementById('searchInput');
const closeSearch = document.getElementById('closeSearch');

// Modal Elements
const overlay = document.getElementById('overlay');
const modalContainer = document.getElementById('modalContainer');
const modalClose = document.getElementById('modalClose');
const modalCrumb = document.getElementById('modalCrumb');
const modalImg = document.getElementById('modalImg');
const modalSource = document.getElementById('modalSource');
const modalTitle = document.getElementById('modalTitle');
const modalTag = document.getElementById('modalTag');
const modalHeadline = document.getElementById('modalHeadline');
const modalWhatHappened = document.getElementById('modalWhatHappened');
const modalWhyItMattered = document.getElementById('modalWhyItMattered');
const modalLineage = document.getElementById('modalLineage');
const modalPeriod = document.getElementById('modalPeriod');
const modalLocation = document.getElementById('modalLocation');
const modalSourcesList = document.getElementById('modalSourcesList');

// Initialize Lenis Smooth Scroll Engine
let lenis = null;
if (typeof window.Lenis !== 'undefined') {
  lenis = new window.Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.2
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
}

// Timeline layout measurements
const SPACING = 320;
const SIDE_PAD = 260;
const totalWidth = DATA.length * SPACING + SIDE_PAD * 2;
timelineInner.style.width = `${totalWidth}px`;

const ticksList = [];

// Helper smoothstep function for organic spring easing
function smoothstep(min, max, value) {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}

// Track drag distance to differentiate between dragging/swiping and clicking
let dragMoved = 0;

// Build Timeline Ticks & Cards
DATA.forEach((item, i) => {
  const left = SIDE_PAD + i * SPACING;
  const above = i % 2 === 0;
  const stemLen = 58 + (i % 2) * 16;
  const cardH = 246;

  const tick = document.createElement('div');
  tick.className = `tick ${above ? 'tick-above' : 'tick-below'}`;
  tick.style.left = `${left}px`;
  tick.dataset.left = left;

  // Outline Year & Period Watermark
  const yeartag = document.createElement('div');
  yeartag.className = `yeartag ${above ? 'yeartag-bottom' : 'yeartag-top'}`;
  yeartag.style.top = above ? '64px' : '-142px';
  yeartag.innerHTML = `
    <span class="year-num">${item.year}</span>
    <span class="period-sub">${item.period || item.epoch || 'Historical Era'}</span>
  `;
  tick.appendChild(yeartag);

  // Stem line
  const stem = document.createElement('div');
  stem.className = `stem ${above ? 'stem-above' : 'stem-below'}`;
  stem.style.height = `${stemLen}px`;
  stem.style.top = above ? `${-stemLen}px` : '0px';
  tick.appendChild(stem);

  // Dot
  const dot = document.createElement('div');
  dot.className = 'dot';
  tick.appendChild(dot);

  // Card matching museum aesthetic
  const card = document.createElement('div');
  card.className = `card ${above ? 'above' : 'below'}`;
  card.style.top = above ? `${-(stemLen + cardH)}px` : `${stemLen}px`;
  
  // Comprehensive searchable index for full-text instant search
  const searchCorpus = [
    item.title,
    item.tag,
    item.year,
    item.period,
    item.epoch,
    item.location,
    item.source,
    item.headline,
    item.whatHappened,
    item.whyItMattered
  ].filter(Boolean).join(' ').toLowerCase();

  card.dataset.search = searchCorpus;
  card.dataset.index = i;

  const fallbackImg = item.fallback || 'og-image.jpg';
  card.innerHTML = `
    <div class="card-header">
      <div class="card-title-group">
        <strong>${item.title}</strong>
        <small>${item.tag}</small>
      </div>
      <div class="datechip mono">${item.year}</div>
    </div>
    <div class="visual">
      <img src="${item.image}" alt="${item.title}" loading="lazy" onerror="this.onerror=null; this.src='${fallbackImg}';">
    </div>
  `;

  // 3D Magnetic Parallax Hover Interaction
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const rotX = -(y / (rect.height / 2)) * 6;
    const rotY = (x / (rect.width / 2)) * 6;
    card.style.transform = `translateX(-50%) translateY(-6px) perspective(600px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) scale(1.03)`;
  });

  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
  });

  card.addEventListener('click', (e) => {
    e.stopPropagation();
    // Ignore click if the user was performing a drag gesture
    if (dragMoved > 8) return;
    openModal(i);
  });

  tick.appendChild(card);
  timelineInner.appendChild(tick);

  ticksList.push({
    tick,
    card,
    stem,
    dot,
    yeartag,
    left,
    above
  });
});

// Pinned Horizontal Timeline Scroll on Vertical Page Scroll
let currentX = 0;
let targetX = 0;
let maxScrollX = totalWidth - window.innerWidth;

function calculateMaxScroll() {
  maxScrollX = Math.max(0, totalWidth - window.innerWidth);
}
window.addEventListener('resize', calculateMaxScroll);
calculateMaxScroll();

function updateTimelinePosition() {
  const rect = collectionTrack.getBoundingClientRect();
  const trackHeight = collectionTrack.offsetHeight - window.innerHeight;

  if (trackHeight > 0) {
    const scrollProgress = Math.min(1, Math.max(0, -rect.top / trackHeight));
    targetX = scrollProgress * maxScrollX;

    // Red Progress Bar Filling
    const progressPercent = scrollProgress * 100;
    timelineProgress.style.width = `${progressPercent}%`;

    // Highlight passed dots
    const currentTimelinePos = targetX + (window.innerWidth * 0.45);
    ticksList.forEach(({ tick, left }) => {
      tick.classList.toggle('active-passed', left <= currentTimelinePos);
    });
  }

  // Smooth spring physics interpolation
  currentX += (targetX - currentX) * 0.12;
  timelineInner.style.transform = `translate3d(${-currentX}px, -50%, 0)`;

  // Scroll-to-Appear Calculation per Card
  const winW = window.innerWidth;
  ticksList.forEach(({ card, stem, yeartag, left, above }) => {
    const screenX = left - currentX;
    const entryProgress = Math.max(0, Math.min(1, (winW + 120 - screenX) / 360));
    const exitProgress = Math.max(0, Math.min(1, (screenX + 260) / 360));
    const visibility = smoothstep(0, 1, Math.min(entryProgress, exitProgress));

    if (visibility > 0.01) {
      const transY = above 
        ? (1 - visibility) * 48 
        : (1 - visibility) * -48;
      const scale = 0.76 + (visibility * 0.24);
      const rot = above 
        ? (-3 + visibility * 2) 
        : (3 - visibility * 2);

      card.style.opacity = visibility.toFixed(3);
      if (!card.matches(':hover')) {
        card.style.transform = `translateX(-50%) translateY(${transY.toFixed(1)}px) scale(${scale.toFixed(3)}) rotate(${rot.toFixed(1)}deg)`;
      }

      stem.style.transform = `scaleY(${visibility.toFixed(3)})`;
      yeartag.style.opacity = (visibility * 0.95).toFixed(3);
      yeartag.style.transform = `translateX(-50%) translateY(${((1 - visibility) * (above ? 16 : -16)).toFixed(1)}px)`;
    } else {
      card.style.opacity = '0';
      stem.style.transform = 'scaleY(0)';
      yeartag.style.opacity = '0';
    }
  });

  requestAnimationFrame(updateTimelinePosition);
}

requestAnimationFrame(updateTimelinePosition);

// =========================================================================
// Trackpad Horizontal Swipe Navigation (Mac / Windows 2-finger swipe & Shift+Wheel)
// =========================================================================
window.addEventListener('wheel', (e) => {
  if (overlay.classList.contains('active')) return;

  const rect = collectionTrack.getBoundingClientRect();
  const trackHeight = collectionTrack.offsetHeight - window.innerHeight;
  if (trackHeight <= 0 || maxScrollX <= 0) return;

  const absDeltaX = Math.abs(e.deltaX);
  const absDeltaY = Math.abs(e.deltaY);

  // Check if the user is swiping horizontally with trackpad or Shift+Wheel
  if (absDeltaX > 1) {
    const isTimelineVisible = (rect.top <= window.innerHeight && rect.bottom >= 0);
    const isHorizontalDominant = (absDeltaX > absDeltaY * 0.7);

    if (isTimelineVisible && isHorizontalDominant) {
      // Prevent browser default back/forward history navigation
      e.preventDefault();

      const scrollFactor = trackHeight / maxScrollX;
      const scrollDelta = e.deltaX * scrollFactor * 0.9;

      const currentScroll = lenis ? lenis.scroll : window.scrollY;
      const targetScroll = Math.max(
        collectionTrack.offsetTop,
        Math.min(collectionTrack.offsetTop + trackHeight, currentScroll + scrollDelta)
      );

      if (lenis) {
        lenis.scrollTo(targetScroll, { immediate: true });
      } else {
        window.scrollTo({ top: targetScroll, behavior: 'auto' });
      }
    }
  }
}, { passive: false });

// =========================================================================
// Unified Pointer & Touch Drag Navigation
// =========================================================================
let isDragging = false;
let startDragX = 0;
let initialTargetX = 0;

timelineSticky.addEventListener('pointerdown', (e) => {
  if (e.target.closest('.search-box') || e.target.closest('.search-pill')) return;
  isDragging = true;
  dragMoved = 0;
  startDragX = e.clientX;
  initialTargetX = targetX;
  timelineSticky.classList.add('grabbing');
  try {
    timelineSticky.setPointerCapture(e.pointerId);
  } catch (err) {}
});

timelineSticky.addEventListener('pointermove', (e) => {
  if (!isDragging) return;
  const deltaX = e.clientX - startDragX;
  dragMoved += Math.abs(deltaX);
  
  const newTargetX = Math.max(0, Math.min(maxScrollX, initialTargetX - deltaX * 1.5));
  const trackTop = collectionTrack.offsetTop;
  const trackHeight = collectionTrack.offsetHeight - window.innerHeight;
  const progress = newTargetX / maxScrollX;
  const targetScrollY = trackTop + (progress * trackHeight);

  if (lenis) {
    lenis.scrollTo(targetScrollY, { immediate: true });
  } else {
    window.scrollTo({ top: targetScrollY, behavior: 'auto' });
  }
});

const endDrag = (e) => {
  if (isDragging) {
    isDragging = false;
    timelineSticky.classList.remove('grabbing');
    try {
      if (e && e.pointerId) timelineSticky.releasePointerCapture(e.pointerId);
    } catch (err) {}
    // Reset dragMoved on next tick
    setTimeout(() => { dragMoved = 0; }, 50);
  }
};

timelineSticky.addEventListener('pointerup', endDrag);
timelineSticky.addEventListener('pointercancel', endDrag);

// =========================================================================
// Modal Dialog Logic (Rich Editorial Context)
// =========================================================================

// Handle wheel scrolling on backdrop smoothly without interfering with modal text
overlay.addEventListener('wheel', (e) => {
  if (overlay.classList.contains('active') && e.target === overlay) {
    e.preventDefault();
    modalContainer.scrollTop += e.deltaY;
  }
}, { passive: false });

function openModal(index) {
  const item = DATA[index];
  modalCrumb.textContent = `${item.year} / ${item.title}`;
  
  const fallbackImg = item.fallback || 'og-image.jpg';
  modalImg.src = item.image;
  modalImg.onerror = () => { 
    modalImg.onerror = null; 
    modalImg.src = fallbackImg; 
  };
  modalImg.alt = item.title;

  modalSource.textContent = item.source;
  modalTitle.textContent = item.title;
  modalTag.textContent = item.tag;
  modalHeadline.textContent = item.headline || item.blurb;
  modalWhatHappened.textContent = item.whatHappened || item.blurb;
  modalWhyItMattered.textContent = item.whyItMattered || "A transformative milestone that permanently altered the trajectory of the nation.";
  modalLineage.textContent = item.lineage || `${item.title} → Modern Republic`;
  modalPeriod.textContent = item.period || item.epoch || "Historical Era";
  modalLocation.textContent = item.location || "Nigeria";

  // Sources List
  modalSourcesList.innerHTML = '';
  const sources = item.sources || [
    { label: "Historical Records & Archives", link: "#" },
    { label: "National Museum Collection", link: "#" }
  ];

  sources.forEach(src => {
    const row = document.createElement('a');
    row.className = 'source-item-row';
    const hasValidLink = src.link && src.link !== '#' && src.link.startsWith('http');
    if (hasValidLink) {
      row.href = src.link;
      row.target = '_blank';
      row.rel = 'noopener noreferrer';
    } else {
      row.href = 'javascript:void(0)';
      row.style.cursor = 'default';
    }
    row.innerHTML = `
      <span class="source-tag">Source</span>
      <span class="source-title">${src.label}</span>
      <span class="source-arrow">${hasValidLink ? '↗' : '•'}</span>
    `;
    modalSourcesList.appendChild(row);
  });

  // Reset scroll to top of modal
  modalContainer.scrollTop = 0;

  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
  if (lenis) lenis.stop();
}

function closeModal() {
  overlay.classList.remove('active');
  document.body.style.overflow = '';
  if (lenis) lenis.start();
}

modalClose.addEventListener('click', closeModal);
overlay.addEventListener('click', (e) => {
  if (e.target === overlay) closeModal();
});

// =========================================================================
// Search Logic
// =========================================================================
function openSearch() {
  searchBox.classList.add('active');
  searchPill.style.display = 'none';
  searchInput.focus();
}

function closeSearchBox() {
  searchBox.classList.remove('active');
  searchPill.style.display = 'flex';
  searchInput.value = '';
  filterCards('');
}

searchPill.addEventListener('click', openSearch);
closeSearch.addEventListener('click', closeSearchBox);

function filterCards(query) {
  const q = query.trim().toLowerCase();
  let firstMatchIndex = -1;

  ticksList.forEach(({ card }, idx) => {
    const match = !q || card.dataset.search.includes(q);
    card.classList.toggle('dim', !match);
    if (match && firstMatchIndex === -1 && q) {
      firstMatchIndex = idx;
    }
  });

  if (firstMatchIndex !== -1) {
    const targetLeft = SIDE_PAD + firstMatchIndex * SPACING - (window.innerWidth / 2) + 145;
    const boundedLeft = Math.max(0, Math.min(maxScrollX, targetLeft));
    const trackTop = collectionTrack.offsetTop;
    const trackHeight = collectionTrack.offsetHeight - window.innerHeight;
    const progress = boundedLeft / maxScrollX;
    const targetScrollY = trackTop + (progress * trackHeight);

    if (lenis) {
      lenis.scrollTo(targetScrollY);
    } else {
      window.scrollTo({ top: targetScrollY, behavior: 'smooth' });
    }
  }
}

searchInput.addEventListener('input', (e) => filterCards(e.target.value));

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const visibleCard = ticksList.find(({ card }) => !card.classList.contains('dim'));
    if (visibleCard) {
      const idx = parseInt(visibleCard.card.dataset.index, 10);
      openModal(idx);
    }
  }
});

// Explore button smooth scroll
document.querySelector('.explore')?.addEventListener('click', (e) => {
  e.preventDefault();
  const trackTop = collectionTrack.offsetTop;
  if (lenis) {
    lenis.scrollTo(trackTop);
  } else {
    window.scrollTo({ top: trackTop, behavior: 'smooth' });
  }
});

// Keyboard Shortcuts (Arrows, Cmd/Ctrl+K, Esc)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
    closeSearchBox();
  }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    openSearch();
  }
  if (e.key === 'ArrowRight' && !overlay.classList.contains('active') && !searchBox.classList.contains('active')) {
    e.preventDefault();
    const trackTop = collectionTrack.offsetTop;
    const trackHeight = collectionTrack.offsetHeight - window.innerHeight;
    const currentScroll = lenis ? lenis.scroll : window.scrollY;
    const step = (SPACING / maxScrollX) * trackHeight;
    const targetScroll = Math.min(trackTop + trackHeight, Math.max(trackTop, currentScroll + step));
    if (lenis) lenis.scrollTo(targetScroll);
    else window.scrollTo({ top: targetScroll, behavior: 'smooth' });
  }
  if (e.key === 'ArrowLeft' && !overlay.classList.contains('active') && !searchBox.classList.contains('active')) {
    e.preventDefault();
    const trackTop = collectionTrack.offsetTop;
    const trackHeight = collectionTrack.offsetHeight - window.innerHeight;
    const currentScroll = lenis ? lenis.scroll : window.scrollY;
    const step = (SPACING / maxScrollX) * trackHeight;
    const targetScroll = Math.max(trackTop, currentScroll - step);
    if (lenis) lenis.scrollTo(targetScroll);
    else window.scrollTo({ top: targetScroll, behavior: 'smooth' });
  }
});
