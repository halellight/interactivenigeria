'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Lenis from 'lenis';
import { DATA } from './data';

const SPACING = 320;
const SIDE_PAD = 260;

// Curated priority order for popular historical items in search
const POPULAR_TITLES_ORDER = [
  'Independence Day',
  'The Benin Empire',
  'Nok Terracottas',
  'Aba Women’s War',
  "Aba Women's War",
  'The Sack of Benin',
  'Igbo-Ukwu Bronzes',
  'The Amalgamation',
  'FESTAC ’77',
  "FESTAC '77",
  'The Nigerian Civil War',
  'Ife Bronzes',
  'Kanem-Borno Empire',
  'Sokoto Caliphate',
  'Annexation of Lagos',
  'Berlin Conference',
  'Oil Boom Era',
  'Nollywood Emerges',
  'Lekki Free Zone & Port',
  'Fourth Republic Begins'
];

function smoothstep(min, max, value) {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}

export default function HomePage() {
  const [activeModalIndex, setActiveModalIndex] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSearchIdx, setSelectedSearchIdx] = useState(0);
  const [isGrabbing, setIsGrabbing] = useState(false);

  const lenisRef = useRef(null);
  const collectionTrackRef = useRef(null);
  const timelineStickyRef = useRef(null);
  const timelineInnerRef = useRef(null);
  const timelineProgressRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchResultsListRef = useRef(null);
  const cardElementsRef = useRef([]);

  const totalWidth = useMemo(() => DATA.length * SPACING + SIDE_PAD * 2, []);

  // Search indexing & layout coordinate prep
  const indexedData = useMemo(() => {
    return DATA.map((item, index) => {
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

      // Flexible matching for popular rank
      const normalizedTitle = item.title.toLowerCase().replace(/['’]/g, "'");
      let popularRank = POPULAR_TITLES_ORDER.findIndex(
        (p) => p.toLowerCase().replace(/['’]/g, "'") === normalizedTitle
      );
      if (popularRank === -1) popularRank = 100 + index;

      return {
        ...item,
        index,
        left: SIDE_PAD + index * SPACING,
        above: index % 2 === 0,
        stemLen: 58 + (index % 2) * 16,
        searchCorpus,
        popularRank
      };
    });
  }, []);

  // Filtered & ranked search items
  const filteredSearchItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return [...indexedData].sort((a, b) => a.popularRank - b.popularRank);
    }
    return indexedData
      .filter((item) => item.searchCorpus.includes(q))
      .sort((a, b) => {
        const aTitle = a.title.toLowerCase();
        const bTitle = b.title.toLowerCase();
        if (aTitle.includes(q) && !bTitle.includes(q)) return -1;
        if (!aTitle.includes(q) && bTitle.includes(q)) return 1;
        return a.popularRank - b.popularRank;
      });
  }, [indexedData, searchQuery]);

  // Reset search selection index when query changes
  useEffect(() => {
    setSelectedSearchIdx(0);
  }, [searchQuery]);

  // Scroll active item into view inside search list
  useEffect(() => {
    if (searchResultsListRef.current && searchOpen) {
      const activeEl = searchResultsListRef.current.children[selectedSearchIdx];
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedSearchIdx, searchOpen]);

  const activeItem = activeModalIndex !== null ? DATA[activeModalIndex] : null;

  // Initialize Lenis Smooth Scroll Engine
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.2
    });
    lenisRef.current = lenis;

    let animId;
    function raf(time) {
      lenis.raf(time);
      animId = requestAnimationFrame(raf);
    }
    animId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(animId);
      lenis.destroy();
    };
  }, []);

  // Device Orientation Gyroscope tracking for mobile 3D tilt
  const orientationRef = useRef({ beta: 0, gamma: 0, active: false });
  const tiltAnimRef = useRef({ rotX: 0, rotY: 0 });

  useEffect(() => {
    const handleOrientation = (e) => {
      if (e.beta === null || e.gamma === null) return;
      // gamma is left-to-right tilt [-90, 90]
      // beta is front-to-back tilt [-180, 180], baseline holding angle ~45deg
      const gamma = Math.max(-20, Math.min(20, e.gamma));
      const beta = Math.max(-20, Math.min(20, e.beta - 45));
      orientationRef.current = { beta, gamma, active: true };
    };

    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      window.addEventListener('deviceorientation', handleOrientation, { passive: true });
    }

    return () => {
      if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
        window.removeEventListener('deviceorientation', handleOrientation);
      }
    };
  }, []);

  // Animation & Scroll Loop
  useEffect(() => {
    let currentX = 0;
    let targetX = 0;
    let maxScrollX = Math.max(0, totalWidth - window.innerWidth);
    let rafId;

    const handleResize = () => {
      maxScrollX = Math.max(0, totalWidth - window.innerWidth);
    };
    window.addEventListener('resize', handleResize);

    const updateLoop = () => {
      if (collectionTrackRef.current && timelineProgressRef.current && timelineInnerRef.current) {
        const rect = collectionTrackRef.current.getBoundingClientRect();
        const trackHeight = collectionTrackRef.current.offsetHeight - window.innerHeight;

        if (trackHeight > 0) {
          const scrollProgress = Math.min(1, Math.max(0, -rect.top / trackHeight));
          targetX = scrollProgress * maxScrollX;

          const progressPercent = scrollProgress * 100;
          timelineProgressRef.current.style.width = `${progressPercent}%`;

          const currentTimelinePos = targetX + (window.innerWidth * 0.45);
          cardElementsRef.current.forEach((el, idx) => {
            if (el && el.tick) {
              const left = indexedData[idx].left;
              el.tick.classList.toggle('active-passed', left <= currentTimelinePos);
            }
          });
        }

        currentX += (targetX - currentX) * 0.12;
        timelineInnerRef.current.style.transform = `translate3d(${-currentX}px, -50%, 0)`;

        const winW = window.innerWidth;
        const isMobile = winW <= 820 || (typeof window !== 'undefined' && ('ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0)));

        let closestIdx = -1;
        let minDistance = Infinity;

        // Smooth mobile tilt interpolation
        if (orientationRef.current.active) {
          const targetRotX = orientationRef.current.beta * 0.35;
          const targetRotY = orientationRef.current.gamma * 0.45;
          tiltAnimRef.current.rotX += (targetRotX - tiltAnimRef.current.rotX) * 0.08;
          tiltAnimRef.current.rotY += (targetRotY - tiltAnimRef.current.rotY) * 0.08;
        }

        cardElementsRef.current.forEach((el, idx) => {
          if (!el || !el.card || !el.stem || !el.yeartag) return;
          const { left, above } = indexedData[idx];
          const screenX = left - currentX;

          const distFromCenter = Math.abs(screenX - (winW / 2));
          if (distFromCenter < minDistance) {
            minDistance = distFromCenter;
            closestIdx = idx;
          }

          const entryProgress = Math.max(0, Math.min(1, (winW + 120 - screenX) / 360));
          const exitProgress = Math.max(0, Math.min(1, (screenX + 260) / 360));
          const visibility = smoothstep(0, 1, Math.min(entryProgress, exitProgress));

          if (visibility > 0.01) {
            const transY = above ? (1 - visibility) * 48 : (1 - visibility) * -48;
            const scale = 0.76 + (visibility * 0.24);
            const rot = above ? (-3 + visibility * 2) : (3 - visibility * 2);

            el.card.style.opacity = visibility.toFixed(3);

            if (!el.card.matches(':hover')) {
              if (isMobile && idx === closestIdx && orientationRef.current.active) {
                const mobRotX = tiltAnimRef.current.rotX;
                const mobRotY = tiltAnimRef.current.rotY;
                el.card.style.transform = `translateX(-50%) translateY(${transY.toFixed(1)}px) perspective(600px) rotateX(${mobRotX.toFixed(2)}deg) rotateY(${mobRotY.toFixed(2)}deg) scale(${scale.toFixed(3)}) rotate(${rot.toFixed(1)}deg)`;
              } else {
                el.card.style.transform = `translateX(-50%) translateY(${transY.toFixed(1)}px) scale(${scale.toFixed(3)}) rotate(${rot.toFixed(1)}deg)`;
              }
            }

            el.stem.style.transform = `scaleY(${visibility.toFixed(3)})`;
            el.yeartag.style.opacity = (visibility * 0.95).toFixed(3);
            el.yeartag.style.transform = `translateX(-50%) translateY(${((1 - visibility) * (above ? 16 : -16)).toFixed(1)}px)`;
          } else {
            el.card.style.opacity = '0';
            el.stem.style.transform = 'scaleY(0)';
            el.yeartag.style.opacity = '0';
          }
        });

        cardElementsRef.current.forEach((el, idx) => {
          if (el && el.tick) {
            const isActive = isMobile && idx === closestIdx && minDistance < Math.min(260, winW * 0.55);
            el.tick.classList.toggle('is-active', isActive);
          }
        });
      }

      rafId = requestAnimationFrame(updateLoop);
    };

    rafId = requestAnimationFrame(updateLoop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, [totalWidth, indexedData]);

  // Trackpad Horizontal Swipe Navigation
  useEffect(() => {
    const handleWheel = (e) => {
      if (activeModalIndex !== null || searchOpen) return;
      if (!collectionTrackRef.current) return;

      const rect = collectionTrackRef.current.getBoundingClientRect();
      const trackHeight = collectionTrackRef.current.offsetHeight - window.innerHeight;
      const maxScrollX = Math.max(0, totalWidth - window.innerWidth);
      if (trackHeight <= 0 || maxScrollX <= 0) return;

      const absDeltaX = Math.abs(e.deltaX);
      const absDeltaY = Math.abs(e.deltaY);

      if (absDeltaX > 1) {
        const isTimelineVisible = (rect.top <= window.innerHeight && rect.bottom >= 0);
        const isHorizontalDominant = (absDeltaX > absDeltaY * 0.7);

        if (isTimelineVisible && isHorizontalDominant) {
          e.preventDefault();
          const scrollFactor = trackHeight / maxScrollX;
          const scrollDelta = e.deltaX * scrollFactor * 0.45;

          const currentScroll = lenisRef.current ? lenisRef.current.scroll : window.scrollY;
          const targetScroll = Math.max(
            collectionTrackRef.current.offsetTop,
            Math.min(collectionTrackRef.current.offsetTop + trackHeight, currentScroll + scrollDelta)
          );

          if (lenisRef.current) {
            lenisRef.current.scrollTo(targetScroll, { immediate: true });
          } else {
            window.scrollTo({ top: targetScroll, behavior: 'auto' });
          }
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [activeModalIndex, searchOpen, totalWidth]);

  // Drag Interaction
  const dragRef = useRef({ isDragging: false, startX: 0, initialTargetX: 0 });

  const handlePointerDown = (e) => {
    if (e.target.closest('.card') || e.target.closest('.search-pill') || e.target.closest('.spotlight-overlay')) return;
    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      initialTargetX: 0
    };
    setIsGrabbing(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}
  };

  const handlePointerMove = (e) => {
    if (!dragRef.current.isDragging || !collectionTrackRef.current) return;
    const deltaX = e.clientX - dragRef.current.startX;

    const trackTop = collectionTrackRef.current.offsetTop;
    const trackHeight = collectionTrackRef.current.offsetHeight - window.innerHeight;
    const maxScrollX = Math.max(0, totalWidth - window.innerWidth);
    if (maxScrollX <= 0) return;

    const scrollDelta = (-deltaX * 1.5 / maxScrollX) * trackHeight;
    const currentScroll = lenisRef.current ? lenisRef.current.scroll : window.scrollY;
    const targetScroll = Math.max(trackTop, Math.min(trackTop + trackHeight, currentScroll + scrollDelta));

    if (lenisRef.current) {
      lenisRef.current.scrollTo(targetScroll, { immediate: true });
    } else {
      window.scrollTo({ top: targetScroll, behavior: 'auto' });
    }
  };

  const handlePointerUp = (e) => {
    if (dragRef.current.isDragging) {
      dragRef.current.isDragging = false;
      setIsGrabbing(false);
      try {
        if (e.pointerId) e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  // Scroll timeline to an item's position
  const scrollToItem = (index) => {
    const item = indexedData[index];
    if (item && collectionTrackRef.current) {
      const maxScrollX = Math.max(0, totalWidth - window.innerWidth);
      const targetLeft = item.left - (window.innerWidth / 2) + 145;
      const boundedLeft = Math.max(0, Math.min(maxScrollX, targetLeft));
      const trackTop = collectionTrackRef.current.offsetTop;
      const trackHeight = collectionTrackRef.current.offsetHeight - window.innerHeight;
      const progress = boundedLeft / maxScrollX;
      const targetScrollY = trackTop + (progress * trackHeight);

      if (lenisRef.current) {
        lenisRef.current.scrollTo(targetScrollY);
      } else {
        window.scrollTo({ top: targetScrollY, behavior: 'smooth' });
      }
    }
  };

  // Modal open/close actions
  const openModal = (index) => {
    setActiveModalIndex(index);
    lenisRef.current?.stop();
  };

  const closeModal = () => {
    setActiveModalIndex(null);
    lenisRef.current?.start();
  };

  // Open & Close search modal
  const openSearch = () => {
    setSearchOpen(true);
    setSelectedSearchIdx(0);
    lenisRef.current?.stop();
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 60);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
    if (activeModalIndex === null) {
      lenisRef.current?.start();
    }
  };

  const handleSelectSearchResult = (item) => {
    closeSearch();
    scrollToItem(item.index);
    openModal(item.index);
  };

  // Keyboard Navigation & Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (searchOpen) {
          closeSearch();
        } else if (activeModalIndex !== null) {
          closeModal();
        }
      }

      // Cmd+K or Ctrl+K or '/' to trigger search modal
      if (
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') ||
        (e.key === '/' && activeModalIndex === null && !searchOpen && document.activeElement?.tagName !== 'INPUT')
      ) {
        e.preventDefault();
        if (searchOpen) {
          closeSearch();
        } else {
          openSearch();
        }
      }

      // Spotlight search arrow navigation & enter
      if (searchOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedSearchIdx((prev) => (prev + 1 < filteredSearchItems.length ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedSearchIdx((prev) => (prev - 1 >= 0 ? prev - 1 : 0));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (filteredSearchItems.length > 0 && selectedSearchIdx < filteredSearchItems.length) {
            handleSelectSearchResult(filteredSearchItems[selectedSearchIdx]);
          }
        }
        return;
      }

      // Timeline arrow keys
      if (e.key === 'ArrowRight' && activeModalIndex === null && !searchOpen && collectionTrackRef.current) {
        e.preventDefault();
        const trackTop = collectionTrackRef.current.offsetTop;
        const trackHeight = collectionTrackRef.current.offsetHeight - window.innerHeight;
        const maxScrollX = Math.max(0, totalWidth - window.innerWidth);
        const step = (SPACING / maxScrollX) * trackHeight;
        const currentScroll = lenisRef.current ? lenisRef.current.scroll : window.scrollY;
        const targetScroll = Math.min(trackTop + trackHeight, currentScroll + step);
        lenisRef.current ? lenisRef.current.scrollTo(targetScroll) : window.scrollTo({ top: targetScroll, behavior: 'smooth' });
      }
      if (e.key === 'ArrowLeft' && activeModalIndex === null && !searchOpen && collectionTrackRef.current) {
        e.preventDefault();
        const trackTop = collectionTrackRef.current.offsetTop;
        const trackHeight = collectionTrackRef.current.offsetHeight - window.innerHeight;
        const maxScrollX = Math.max(0, totalWidth - window.innerWidth);
        const step = (SPACING / maxScrollX) * trackHeight;
        const currentScroll = lenisRef.current ? lenisRef.current.scroll : window.scrollY;
        const targetScroll = Math.max(trackTop, currentScroll - step);
        lenisRef.current ? lenisRef.current.scrollTo(targetScroll) : window.scrollTo({ top: targetScroll, behavior: 'smooth' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModalIndex, searchOpen, filteredSearchItems, selectedSearchIdx, totalWidth]);

  const handleExploreClick = (e) => {
    e.preventDefault();
    if (collectionTrackRef.current) {
      const trackTop = collectionTrackRef.current.offsetTop;
      lenisRef.current ? lenisRef.current.scrollTo(trackTop) : window.scrollTo({ top: trackTop, behavior: 'smooth' });
    }
  };

  return (
    <>
      {/* 100vh Hero Wrapper */}
      <div className="hero-wrapper" id="top">
        <header className="topbar">
          <div className="eyebrow">A living collection of Nigerian history</div>
          <div>
            <div 
              className="search-pill" 
              id="searchPill" 
              onClick={openSearch}
              role="button"
              tabIndex={0}
              aria-label="Open search dialog"
            >
              <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <span>Search history</span>
              <kbd>⌘K</kbd>
            </div>
          </div>
        </header>

        <section className="hero">
          <h1>
            <span className="line1">The Nigeria</span>
            <span className="line2">History Museum</span>
          </h1>
          <div className="hero-foot">
            <p>A visual history of the kingdoms, uprisings, and inventions that made a nation — from the terracotta sculptors of Nok to the tech innovators of Yaba.</p>
            <a className="explore" href="#collection" onClick={handleExploreClick}>
              Explore the collection <span>↓</span>
            </a>
          </div>
        </section>
      </div>

      {/* Sticky 100vh Horizontal Timeline Section */}
      <div className="collection-track" id="collection" ref={collectionTrackRef}>
        <div 
          className={`timeline-sticky ${isGrabbing ? 'grabbing' : ''}`}
          id="timelineSticky"
          ref={timelineStickyRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div className="timeline-viewport">
            <div 
              className="timeline-inner" 
              id="timelineInner" 
              ref={timelineInnerRef}
              style={{ width: `${totalWidth}px` }}
            >
              <div className="timeline-line">
                <div className="timeline-line-progress" id="timelineProgress" ref={timelineProgressRef}>
                  <div className="timeline-pulse-head" />
                </div>
                <div className="timeline-laser-streak" />
              </div>

              {indexedData.map((item, i) => {
                return (
                  <div 
                    key={item.title + item.year}
                    className={`tick ${item.above ? 'tick-above' : 'tick-below'}`}
                    style={{ left: `${item.left}px` }}
                    ref={(el) => {
                      if (!cardElementsRef.current[i]) cardElementsRef.current[i] = {};
                      cardElementsRef.current[i].tick = el;
                    }}
                  >
                    <div 
                      className={`yeartag ${item.above ? 'yeartag-bottom' : 'yeartag-top'}`}
                      style={{ top: item.above ? '64px' : '-142px' }}
                      ref={(el) => {
                        if (!cardElementsRef.current[i]) cardElementsRef.current[i] = {};
                        cardElementsRef.current[i].yeartag = el;
                      }}
                    >
                      <span className="year-num">{item.year}</span>
                      <span className="period-sub">{item.period || item.epoch || 'Historical Era'}</span>
                    </div>

                    <div 
                      className={`stem ${item.above ? 'stem-above' : 'stem-below'}`}
                      style={{ height: `${item.stemLen}px`, top: item.above ? `${-item.stemLen}px` : '0px' }}
                      ref={(el) => {
                        if (!cardElementsRef.current[i]) cardElementsRef.current[i] = {};
                        cardElementsRef.current[i].stem = el;
                      }}
                    />

                    <div className="dot" />

                    <div 
                      className={`card ${item.above ? 'above' : 'below'}`}
                      style={{ top: item.above ? `${-(item.stemLen + 246)}px` : `${item.stemLen}px` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        openModal(i);
                      }}
                      onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left - rect.width / 2;
                        const y = e.clientY - rect.top - rect.height / 2;
                        const rotX = -(y / (rect.height / 2)) * 7;
                        const rotY = (x / (rect.width / 2)) * 7;
                        e.currentTarget.style.transform = `translateX(-50%) translateY(-6px) perspective(600px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) scale(1.03)`;
                      }}
                      onMouseDown={(e) => {
                        e.currentTarget.style.transform = `translateX(-50%) translateY(-2px) scale(0.97)`;
                      }}
                      onMouseUp={(e) => {
                        e.currentTarget.style.transform = '';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = '';
                      }}
                      ref={(el) => {
                        if (!cardElementsRef.current[i]) cardElementsRef.current[i] = {};
                        cardElementsRef.current[i].card = el;
                      }}
                    >
                      <div className="card-header">
                        <div className="card-title-group">
                          <div className="card-top-row">
                            <span className="catalog-num mono">№ {String(i + 1).padStart(2, '0')}</span>
                            <div className="datechip mono">{item.year}</div>
                          </div>
                          <strong>{item.title}</strong>
                          <small>{item.tag}</small>
                        </div>
                      </div>
                      <div className="visual">
                        <img 
                          src={item.image} 
                          alt={item.title} 
                          loading="lazy" 
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = item.fallback || '/og-image.jpg';
                          }} 
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Black Footer */}
      <footer>
        <div className="disclaimer">
          An independent visual archive. Not affiliated with the Federal Government of Nigeria.
        </div>
        <div className="attribution">
          Curated & Built by <a href="https://x.com/_Halel" target="_blank" rel="noopener noreferrer" className="author-link"><strong>Praise Ibe</strong></a><br />
          © 2026
        </div>
      </footer>

      {/* Spotlight Command-Palette Search Modal */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div 
            className="spotlight-overlay" 
            id="spotlightOverlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={(e) => {
              if (e.target.id === 'spotlightOverlay') closeSearch();
            }}
            onWheel={(e) => {
              e.stopPropagation();
            }}
          >
            <motion.div 
              className="spotlight-modal"
              data-lenis-prevent
              initial={{ opacity: 0, scale: 0.94, y: -16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              onClick={(e) => e.stopPropagation()}
              onWheel={(e) => {
                e.stopPropagation();
              }}
            >
              {/* Search Top Input */}
              <div className="spotlight-header">
                <div className="spotlight-input-wrap">
                  <svg className="spotlight-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <input 
                    ref={searchInputRef}
                    type="text" 
                    className="spotlight-input"
                    placeholder="Search interfaces, eras, stories, or artifacts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoComplete="off"
                    spellCheck="false"
                  />
                </div>
                <button 
                  type="button" 
                  className="spotlight-esc-btn" 
                  onClick={closeSearch}
                  aria-label="Close search"
                >
                  Esc
                </button>
              </div>

              {/* Subheader bar */}
              <div className="spotlight-subhead">
                <span className="subhead-title">
                  {searchQuery ? `Search results for "${searchQuery}"` : 'Popular artifacts & stories'}
                </span>
                <span className="subhead-count mono">
                  {filteredSearchItems.length} {filteredSearchItems.length === 1 ? 'artifact' : 'artifacts'}
                </span>
              </div>

              {/* Scrollable Results List */}
              <div 
                className="spotlight-list" 
                ref={searchResultsListRef}
                data-lenis-prevent
                onWheel={(e) => {
                  e.stopPropagation();
                }}
              >
                {filteredSearchItems.length > 0 ? (
                  filteredSearchItems.map((item, idx) => {
                    const isSelected = idx === selectedSearchIdx;
                    return (
                      <div 
                        key={item.title + item.year}
                        className={`spotlight-item ${isSelected ? 'is-active' : ''}`}
                        onMouseEnter={() => setSelectedSearchIdx(idx)}
                        onClick={() => handleSelectSearchResult(item)}
                      >
                        <div className="spotlight-date mono">
                          {item.year}
                        </div>

                        <div className="spotlight-main">
                          <strong className="spotlight-title">{item.title}</strong>
                          <span className="spotlight-subtitle">{item.tag || item.headline}</span>
                        </div>

                        <div className="spotlight-meta">
                          <span className="spotlight-category">
                            {item.period || item.epoch || 'History'} · {item.location?.split(',')[0]?.split('&')[0]?.trim() || 'Nigeria'}
                          </span>
                          <span className="spotlight-arrow">↗</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="spotlight-empty">
                    <p>No historical artifacts found for &ldquo;{searchQuery}&rdquo;</p>
                    <small>Try searching for &ldquo;1960&rdquo;, &ldquo;Benin&rdquo;, &ldquo;Nok&rdquo;, &ldquo;Aba&rdquo;, or &ldquo;Lagos&rdquo;</small>
                  </div>
                )}
              </div>

              {/* Bottom Keyboard Navigation Bar */}
              <div className="spotlight-footer">
                <div className="spotlight-shortcuts">
                  <div className="shortcut-item">
                    <span className="kbd-icon">↑</span>
                    <span className="kbd-icon">↓</span>
                    <span>Navigate</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="kbd-icon">↵</span>
                    <span>Open</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="kbd-icon">Esc</span>
                    <span>Close</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rich Context Modal Dialog with Expanding Card Grow Effect */}
      <AnimatePresence>
        {activeItem && (
          <motion.div 
            className="overlay active" 
            id="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            onClick={(e) => {
              if (e.target.id === 'overlay') closeModal();
            }}
            onTouchMove={(e) => {
              if (e.target.id === 'overlay') e.preventDefault();
            }}
            onWheel={(e) => {
              if (e.target.id === 'overlay') {
                e.preventDefault();
                const container = document.getElementById('modalContainer');
                if (container) container.scrollTop += e.deltaY;
              }
            }}
          >
            <motion.div 
              className="modal" 
              id="modalContainer" 
              data-lenis-prevent
              initial={{ opacity: 0, scale: 0.72, y: 40 }}
              animate={{ 
                opacity: 1, 
                scale: 1, 
                y: 0,
                transition: {
                  type: 'spring',
                  damping: 26,
                  stiffness: 280,
                  mass: 0.9
                }
              }}
              exit={{ 
                opacity: 0, 
                scale: 0.82, 
                y: 24,
                transition: { duration: 0.18, ease: 'easeIn' }
              }}
            >
              <div className="modal-top">
                <div className="crumb">{`${activeItem.year} / ${activeItem.title}`}</div>
                <div className="modal-close" onClick={closeModal}>Close ✕</div>
              </div>

              <motion.div 
                className="modal-visual"
                initial={{ scale: 1.08, opacity: 0.8 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              >
                <img 
                  src={activeItem.image} 
                  alt={activeItem.title}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = activeItem.fallback || '/og-image.jpg';
                  }}
                />
              </motion.div>

              <div className="modal-body">
                <div className="modal-hero-split">
                  <div className="modal-hero-left">
                    <p className="source">{activeItem.source}</p>
                    <h2>{activeItem.title}</h2>
                    <p className="tagline">{activeItem.tag}</p>
                  </div>
                  <div className="modal-hero-right">
                    <p className="headline-text">{activeItem.headline || activeItem.blurb}</p>
                  </div>
                </div>

                <div className="modal-context-rows">
                  <div className="modal-context-row">
                    <div className="label">What happened</div>
                    <div className="value">{activeItem.whatHappened || activeItem.blurb}</div>
                  </div>
                  <div className="modal-context-row">
                    <div className="label">Why it mattered</div>
                    <div className="value">{activeItem.whyItMattered || "A transformative milestone that permanently altered the trajectory of the nation."}</div>
                  </div>
                  <div className="modal-context-row">
                    <div className="label">Historical lineage</div>
                    <div className="value">{activeItem.lineage || `${activeItem.title} → Modern Republic`}</div>
                  </div>
                </div>

                <div className="modal-meta-grid">
                  <div className="meta-col-left">
                    <div className="meta-field">
                      <span className="meta-label">Period</span>
                      <span className="meta-val">{activeItem.period || activeItem.epoch || "Historical Era"}</span>
                    </div>
                    <div className="meta-field">
                      <span className="meta-label">Geography</span>
                      <span className="meta-val">{activeItem.location || "Nigeria"}</span>
                    </div>
                  </div>

                  <div className="meta-col-right">
                    <div className="sources-heading">Original material / Sources</div>
                    <div>
                      {(activeItem.sources || [
                        { label: "Historical Records & Archives", link: "#" },
                        { label: "National Museum Collection", link: "#" }
                      ]).map((src, sIdx) => {
                        const hasValidLink = src.link && src.link !== '#' && src.link.startsWith('http');
                        return (
                          <a 
                            key={src.label + sIdx}
                            className="source-item-row"
                            href={hasValidLink ? src.link : '#'}
                            target={hasValidLink ? '_blank' : undefined}
                            rel={hasValidLink ? 'noopener noreferrer' : undefined}
                            onClick={!hasValidLink ? (e) => e.preventDefault() : undefined}
                            style={!hasValidLink ? { cursor: 'default' } : {}}
                          >
                            <span className="source-tag">Source</span>
                            <span className="source-title">{src.label}</span>
                            <span className="source-arrow">{hasValidLink ? '↗' : '•'}</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
