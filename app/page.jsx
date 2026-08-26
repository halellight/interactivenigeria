'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import Lenis from 'lenis';
import { DATA } from './data';

const SPACING = 320;
const SIDE_PAD = 260;

function smoothstep(min, max, value) {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}

export default function HomePage() {
  const [activeModalIndex, setActiveModalIndex] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGrabbing, setIsGrabbing] = useState(false);

  const lenisRef = useRef(null);
  const collectionTrackRef = useRef(null);
  const timelineStickyRef = useRef(null);
  const timelineInnerRef = useRef(null);
  const timelineProgressRef = useRef(null);
  const searchInputRef = useRef(null);
  const cardElementsRef = useRef([]);

  const totalWidth = useMemo(() => DATA.length * SPACING + SIDE_PAD * 2, []);

  // Search indexing
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

      return {
        ...item,
        index,
        left: SIDE_PAD + index * SPACING,
        above: index % 2 === 0,
        stemLen: 58 + (index % 2) * 16,
        searchCorpus
      };
    });
  }, []);

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
        cardElementsRef.current.forEach((el, idx) => {
          if (!el || !el.card || !el.stem || !el.yeartag) return;
          const { left, above } = indexedData[idx];
          const screenX = left - currentX;
          const entryProgress = Math.max(0, Math.min(1, (winW + 120 - screenX) / 360));
          const exitProgress = Math.max(0, Math.min(1, (screenX + 260) / 360));
          const visibility = smoothstep(0, 1, Math.min(entryProgress, exitProgress));

          if (visibility > 0.01) {
            const transY = above ? (1 - visibility) * 48 : (1 - visibility) * -48;
            const scale = 0.76 + (visibility * 0.24);
            const rot = above ? (-3 + visibility * 2) : (3 - visibility * 2);

            el.card.style.opacity = visibility.toFixed(3);
            if (!el.card.matches(':hover')) {
              el.card.style.transform = `translateX(-50%) translateY(${transY.toFixed(1)}px) scale(${scale.toFixed(3)}) rotate(${rot.toFixed(1)}deg)`;
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
      if (activeModalIndex !== null) return;
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
  }, [activeModalIndex, totalWidth]);

  // Drag Interaction
  const dragRef = useRef({ isDragging: false, startX: 0, initialTargetX: 0 });

  const handlePointerDown = (e) => {
    if (e.target.closest('.card') || e.target.closest('.search-box') || e.target.closest('.search-pill')) return;
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

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActiveModalIndex(null);
        setSearchOpen(false);
        setSearchQuery('');
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
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
  }, [activeModalIndex, searchOpen, totalWidth]);

  // Modal open/close body locks (retaining stable sticky position on mobile)
  const openModal = (index) => {
    setActiveModalIndex(index);
    lenisRef.current?.stop();
  };

  const closeModal = () => {
    setActiveModalIndex(null);
    lenisRef.current?.start();
  };

  // Search Filter Handler
  const handleSearchChange = (val) => {
    setSearchQuery(val);
    const q = val.trim().toLowerCase();
    if (!q) return;

    const firstMatch = indexedData.find(item => item.searchCorpus.includes(q));
    if (firstMatch && collectionTrackRef.current) {
      const maxScrollX = Math.max(0, totalWidth - window.innerWidth);
      const targetLeft = firstMatch.left - (window.innerWidth / 2) + 145;
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

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const q = searchQuery.trim().toLowerCase();
      const firstMatch = indexedData.find(item => !q || item.searchCorpus.includes(q));
      if (firstMatch) {
        openModal(firstMatch.index);
      }
    }
  };

  const handleExploreClick = (e) => {
    e.preventDefault();
    if (collectionTrackRef.current) {
      const trackTop = collectionTrackRef.current.offsetTop;
      lenisRef.current ? lenisRef.current.scrollTo(trackTop) : window.scrollTo({ top: trackTop, behavior: 'smooth' });
    }
  };

  const q = searchQuery.trim().toLowerCase();

  return (
    <>
      {/* 100vh Hero Wrapper */}
      <div className="hero-wrapper" id="top">
        <header className="topbar">
          <div className="eyebrow">A living collection of Nigerian history</div>
          <div>
            {!searchOpen ? (
              <div 
                className="search-pill" 
                id="searchPill" 
                onClick={() => {
                  setSearchOpen(true);
                  setTimeout(() => searchInputRef.current?.focus(), 50);
                }}
              >
                <span>Search history</span>
                <kbd>⌘K</kbd>
              </div>
            ) : (
              <div className="search-box active" id="searchBox">
                <input 
                  ref={searchInputRef}
                  id="searchInput" 
                  type="text" 
                  placeholder="Search history..." 
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  autoComplete="off" 
                />
                <span 
                  className="close-search" 
                  id="closeSearch"
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchQuery('');
                  }}
                >
                  esc
                </span>
              </div>
            )}
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
                const isDimmed = q && !item.searchCorpus.includes(q);
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
                      className={`card ${item.above ? 'above' : 'below'} ${isDimmed ? 'dim' : ''}`}
                      style={{ top: item.above ? `${-(item.stemLen + 246)}px` : `${item.stemLen}px` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        openModal(i);
                      }}
                      onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left - rect.width / 2;
                        const y = e.clientY - rect.top - rect.height / 2;
                        const rotX = -(y / (rect.height / 2)) * 6;
                        const rotY = (x / (rect.width / 2)) * 6;
                        e.currentTarget.style.transform = `translateX(-50%) translateY(-6px) perspective(600px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) scale(1.03)`;
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
                          <strong>{item.title}</strong>
                          <small>{item.tag}</small>
                        </div>
                        <div className="datechip mono">{item.year}</div>
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
          Built by <a href="https://x.com/__Halel" target="_blank" rel="noopener noreferrer" className="author-link"><strong>Praise Ibe</strong></a><br />
          © 2026
        </div>
      </footer>

      {/* Rich Context Modal Dialog */}
      {activeItem && (
        <div 
          className="overlay active" 
          id="overlay"
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
          <div className="modal" id="modalContainer" data-lenis-prevent>
            <div className="modal-top">
              <div className="crumb">{`${activeItem.year} / ${activeItem.title}`}</div>
              <div className="modal-close" onClick={closeModal}>Close ✕</div>
            </div>

            <div className="modal-visual">
              <img 
                src={activeItem.image} 
                alt={activeItem.title}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = activeItem.fallback || '/og-image.jpg';
                }}
              />
            </div>

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
          </div>
        </div>
      )}
    </>
  );
}
