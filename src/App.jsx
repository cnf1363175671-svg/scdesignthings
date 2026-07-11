import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useMotionValueEvent, useSpring } from "motion/react";
import { Globe } from "lucide-react";

const demandData = {
  conversion: {
    title: "稳定并提高老产品转化",
    copy:
      "老产品不是简单地继续做图，而是需要持续优化卖点表达、主图结构、视频节奏、场景内容和消费者理解成本。设计要从“做完素材”升级为“持续优化转化”。",
    signals: ["卖点表达", "主图结构", "视频节奏", "转化复盘"],
  },
  collab: {
    title: "平面与视频更顺畅的协同",
    copy:
      "平面、视频、主图和品宣之间需要同一个目标、同一套素材标准和同一条交付节奏。协同顺了，重复沟通会减少，视觉表达会更统一，团队的产能也会更稳定。",
    signals: ["统一 brief", "拍摄脚本", "主图卖点", "品宣延展"],
  },
};

const capabilities = {
  graphic: {
    code: "MAIN IMAGE",
    title: "看懂主图结构",
    copy: "把产品卖点、用户第一眼理解成本和平台展示规则放在同一个画面里判断。",
  },
  video: {
    code: "SHOOTING",
    title: "看懂拍摄与视频节奏",
    copy: "从脚本、镜头、场景到剪辑节奏判断一条视频如何服务产品理解和转化。",
  },
  threeD: {
    code: "3D ASSET",
    title: "看懂资产怎么被复用",
    copy: "把建模、材质、灯光和场景拆成可复用模块，为新品类提前储备视觉资产。",
  },
  aigc: {
    code: "AIGC FLOW",
    title: "看懂探索效率怎么提高",
    copy: "用 AIGC 快速完成前期方向探索、场景草图、视觉情绪和内容变体，减少从零试错。",
  },
  ops: {
    code: "CROSS TEAM",
    title: "看懂信息在哪里会断",
    copy: "采购、运营、产品信息、物流单证、上架节奏和销售反馈都可能影响设计判断，需要有人把信息流接起来。",
  },
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const smoothStep = (edge0, edge1, value) => {
  const progress = clamp((value - edge0) / Math.max(edge1 - edge0, 0.0001), 0, 1);
  return progress * progress * (3 - 2 * progress);
};

const canSeekVideo = (video) =>
  Boolean(
    video &&
      Number.isFinite(video.duration) &&
      video.duration > 0 &&
      video.readyState >= 2 &&
      !video.seeking
  );

const safeSeekVideo = (video, nextTime, { minDelta = 0.018 } = {}) => {
  if (!canSeekVideo(video)) return false;

  const maxTime = Math.max(0, video.duration - 0.001);
  const clampedTime = clamp(nextTime, 0, maxTime);

  if (Math.abs(video.currentTime - clampedTime) < minDelta) return false;

  try {
    video.currentTime = clampedTime;
    return true;
  } catch (error) {
    console.error("[video seek error]", video.src, error, video.networkState, video.readyState);
    return false;
  }
};

const logVideoEvent = (eventName, video) => {
  if (!video) return;

  if (eventName === "loadedmetadata") {
    console.log("[video loadedmetadata]", video.src, video.duration, video.readyState, video.networkState);
    return;
  }

  if (eventName === "loadeddata") {
    console.log("[video loadeddata]", video.src, video.readyState, video.networkState);
    return;
  }

  if (eventName === "canplay") {
    console.log("[video canplay]", video.src);
    return;
  }

  if (eventName === "error") {
    console.error("[video error]", video.src, video.error, video.networkState, video.readyState);
    return;
  }

  console.warn(`[video ${eventName}]`, video.src, video.readyState, video.networkState);
};

const ResilientVideo = React.forwardRef(function ResilientVideo(
  {
    src,
    fallback,
    onLoadedMetadata,
    onLoadedData,
    onCanPlay,
    onError,
    onStalled,
    onWaiting,
    onSuspend,
    ...props
  },
  forwardedRef
) {
  const localRef = useRef(null);
  const fallbackTriedRef = useRef(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  useEffect(() => {
    fallbackTriedRef.current = false;
    setCurrentSrc(src);
  }, [src]);

  const setVideoRef = (node) => {
    localRef.current = node;

    if (typeof forwardedRef === "function") {
      forwardedRef(node);
      return;
    }

    if (forwardedRef) forwardedRef.current = node;
  };

  const switchToFallback = (reason) => {
    if (!fallback || fallbackTriedRef.current || currentSrc === fallback) {
      if (!fallback) console.error("[video fallback missing]", currentSrc, reason);
      return;
    }

    fallbackTriedRef.current = true;
    console.warn("[video fallback]", currentSrc, "->", fallback, reason);
    setCurrentSrc(fallback);
  };

  useEffect(() => {
    const video = localRef.current;
    if (!video) return undefined;

    const metadataTimer = window.setTimeout(() => {
      if (video.readyState < 1) switchToFallback("loadedmetadata timeout");
    }, 7000);

    const readyTimer = window.setTimeout(() => {
      if (video.readyState < 2) switchToFallback("readyState < 2 timeout");
    }, 11000);

    return () => {
      window.clearTimeout(metadataTimer);
      window.clearTimeout(readyTimer);
    };
  }, [currentSrc, fallback]);

  const handleLoadedMetadata = (event) => {
    logVideoEvent("loadedmetadata", event.currentTarget);
    onLoadedMetadata?.(event);
  };

  const handleLoadedData = (event) => {
    logVideoEvent("loadeddata", event.currentTarget);
    onLoadedData?.(event);
  };

  const handleCanPlay = (event) => {
    logVideoEvent("canplay", event.currentTarget);
    onCanPlay?.(event);
  };

  const handleError = (event) => {
    logVideoEvent("error", event.currentTarget);
    switchToFallback("error");
    onError?.(event);
  };

  const handleStalled = (event) => {
    logVideoEvent("stalled", event.currentTarget);
    onStalled?.(event);
  };

  const handleWaiting = (event) => {
    logVideoEvent("waiting", event.currentTarget);
    onWaiting?.(event);
  };

  const handleSuspend = (event) => {
    logVideoEvent("suspend", event.currentTarget);
    onSuspend?.(event);
  };

  return (
    <video
      {...props}
      ref={setVideoRef}
      src={currentSrc}
      onLoadedMetadata={handleLoadedMetadata}
      onLoadedData={handleLoadedData}
      onCanPlay={handleCanPlay}
      onError={handleError}
      onStalled={handleStalled}
      onWaiting={handleWaiting}
      onSuspend={handleSuspend}
    />
  );
});

function SplitText({ text, as: Tag = "span", className = "", delay = 34, ...props }) {
  const chars = useMemo(() => Array.from(text), [text]);

  return (
    <Tag className={`split-text ${className}`} style={{ "--split-delay": `${delay}ms` }} {...props}>
      {chars.map((char, index) => {
        if (char === "\n") return <br key={`${char}-${index}`} />;
        if (char === " ") return <span key={`${char}-${index}`} className="split-space"> </span>;

        return (
          <span className="split-char" style={{ "--split-index": index }} key={`${char}-${index}`}>
            {char}
          </span>
        );
      })}
    </Tag>
  );
}

function CinematicHeroVideo() {
  const videoRef = useRef(null);
  const fadeFrameRef = useRef(null);
  const restartTimerRef = useRef(null);
  const fadingOutRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    let mounted = true;

    const cancelFade = () => {
      if (fadeFrameRef.current) {
        window.cancelAnimationFrame(fadeFrameRef.current);
        fadeFrameRef.current = null;
      }
    };

    const setVideoOpacity = (value) => {
      video.style.opacity = `${clamp(value, 0, 1)}`;
    };

    const fadeTo = (targetOpacity, duration = 500, onComplete) => {
      cancelFade();

      const startOpacity = Number.parseFloat(video.style.opacity || "0") || 0;
      const startedAt = window.performance.now();

      const tick = (now) => {
        if (!mounted) return;

        const progress = clamp((now - startedAt) / duration, 0, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const nextOpacity = startOpacity + (targetOpacity - startOpacity) * eased;

        setVideoOpacity(nextOpacity);

        if (progress < 1) {
          fadeFrameRef.current = window.requestAnimationFrame(tick);
          return;
        }

        fadeFrameRef.current = null;
        setVideoOpacity(targetOpacity);
        onComplete?.();
      };

      fadeFrameRef.current = window.requestAnimationFrame(tick);
    };

    const fadeIn = () => {
      fadingOutRef.current = false;
      fadeTo(1, 500);
    };

    const fadeOut = () => {
      if (fadingOutRef.current) return;
      fadingOutRef.current = true;
      fadeTo(0, 500);
    };

    const playVideo = () => {
      const playPromise = video.play();
      if (playPromise?.catch) {
        playPromise.catch(() => {});
      }
    };

    const handleLoadStart = () => {
      setVideoOpacity(0);
    };

    const handleLoadedData = () => {
      playVideo();
      fadeIn();
    };

    const handleTimeUpdate = () => {
      if (!video.duration || fadingOutRef.current) return;

      if (video.duration - video.currentTime <= 0.55) {
        fadeOut();
      }
    };

    const handleEnded = () => {
      cancelFade();
      setVideoOpacity(0);

      if (restartTimerRef.current) {
        window.clearTimeout(restartTimerRef.current);
      }

      restartTimerRef.current = window.setTimeout(() => {
        if (!mounted) return;
        safeSeekVideo(video, 0, { minDelta: 0 });
        playVideo();
        fadeIn();
      }, 100);
    };

    video.addEventListener("loadstart", handleLoadStart);
    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("ended", handleEnded);

    setVideoOpacity(0);
    if (video.readyState >= 2) {
      handleLoadedData();
    }

    return () => {
      mounted = false;
      cancelFade();
      if (restartTimerRef.current) {
        window.clearTimeout(restartTimerRef.current);
      }
      video.removeEventListener("loadstart", handleLoadStart);
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("ended", handleEnded);
    };
  }, []);

  return (
    <div className="hero-video-wrap" aria-hidden="true">
      <ResilientVideo
        ref={videoRef}
        className="hero-video"
        src="/assets/hero-cinematic-bg.mp4"
        muted
        autoPlay
        playsInline
        preload="auto"
      />
    </div>
  );
}

const demandArchiveHeroVideos = {
  left: {
    id: "demand-hero-left",
    src: "https://1832952182.cdn.123clouddisk.com/1832952182/40956971",
    fallback: "/assets/demand-hero-left.mp4",
  },
  right: {
    id: "demand-hero-right",
    src: "https://1832952182.cdn.123clouddisk.com/1832952182/41204255",
    fallback: "/assets/demand-hero-right.mp4",
  },
};

const demandArchiveGalleryVideos = [
  {
    id: "demand-gallery-1",
    src: "https://1832952182.cdn.123clouddisk.com/1832952182/41095776",
    fallback: "/assets/demand-gallery-1.mp4",
  },
  {
    id: "demand-gallery-2",
    src: "https://1832952182.cdn.123clouddisk.com/1832952182/41204867",
    fallback: "/assets/demand-gallery-2.mp4",
  },
  {
    id: "demand-gallery-3",
    src: "https://1832952182.cdn.123clouddisk.com/1832952182/41147163",
    fallback: "/assets/demand-gallery-3.mp4",
  },
  {
    id: "demand-gallery-4",
    src: "https://1832952182.cdn.123clouddisk.com/1832952182/41204869",
    fallback: "/assets/demand-gallery-4.mp4",
  },
  {
    id: "demand-gallery-5",
    src: "https://1832952182.cdn.123clouddisk.com/1832952182/41122213",
    fallback: "/assets/demand-gallery-5.mp4",
  },
  {
    id: "demand-gallery-1-repeat",
    src: "https://1832952182.cdn.123clouddisk.com/1832952182/41095776",
    fallback: "/assets/demand-gallery-1.mp4",
  },
  {
    id: "demand-gallery-2-repeat",
    src: "https://1832952182.cdn.123clouddisk.com/1832952182/41204867",
    fallback: "/assets/demand-gallery-2.mp4",
  },
  {
    id: "demand-gallery-3-repeat",
    src: "https://1832952182.cdn.123clouddisk.com/1832952182/41147163",
    fallback: "/assets/demand-gallery-3.mp4",
  },
  {
    id: "demand-gallery-4-repeat",
    src: "https://1832952182.cdn.123clouddisk.com/1832952182/41204869",
    fallback: "/assets/demand-gallery-4.mp4",
  },
  {
    id: "demand-gallery-5-repeat",
    src: "https://1832952182.cdn.123clouddisk.com/1832952182/41122213",
    fallback: "/assets/demand-gallery-5.mp4",
  },
];

const demandArchiveSymbols = ["8", "$", "^^", "%", "/"];

function getDemandArchiveColumns() {
  if (typeof window === "undefined") return 4;
  if (window.innerWidth < 640) return 2;
  if (window.innerWidth < 1024) return 3;
  return 4;
}

function buildDemandArchiveLayout(count, cols) {
  const rows = [];
  let index = 0;
  let row = 0;

  while (index < count) {
    const cells = Array(cols).fill(-1);
    const primary = (row * 2 + (row % 2)) % cols;
    cells[primary] = index;
    index += 1;

    if (row % 3 === 0 && index < count) {
      let secondary = (primary + 2) % cols;
      if (secondary === primary) secondary = (primary + 1) % cols;
      cells[secondary] = index;
      index += 1;
    }

    rows.push(cells);
    row += 1;
  }

  return rows;
}

function CatDemandSection() {
  const sectionRef = useRef(null);
  const cursorRef = useRef(null);
  const leftVideoRef = useRef(null);
  const rightVideoRef = useRef(null);
  const videoStageRef = useRef(null);
  const panelRef = useRef(null);
  const panelInnerRef = useRef(null);
  const overlayRef = useRef(null);
  const outroInfoRef = useRef(null);
  const viewButtonRef = useRef(null);
  const footerRef = useRef(null);
  const symbolRef = useRef(null);
  const cardRefs = useRef([]);
  const activeSideRef = useRef("right");
  const scrubFrameRef = useRef(null);
  const lastHeroSeekRef = useRef({ left: 0, right: 0 });
  const lastSymbolSwapRef = useRef(0);
  const [archiveColumns, setArchiveColumns] = useState(getDemandArchiveColumns);
  const archiveLayout = useMemo(
    () => buildDemandArchiveLayout(demandArchiveGalleryVideos.length, archiveColumns),
    [archiveColumns]
  );

  useEffect(() => {
    const section = sectionRef.current;
    const leftVideo = leftVideoRef.current;
    const rightVideo = rightVideoRef.current;
    const cursor = cursorRef.current;
    if (!section || !leftVideo || !rightVideo) return undefined;

    const isTouchLike = () =>
      window.innerWidth < 1024 || window.matchMedia("(hover: none), (pointer: coarse)").matches;

    const showVideoSide = (side) => {
      activeSideRef.current = side;
      const activeVideo = side === "left" ? leftVideo : rightVideo;
      const inactiveVideo = side === "left" ? rightVideo : leftVideo;
      activeVideo.style.display = "block";
      inactiveVideo.style.display = "none";
    };

    const scrubVideo = (side, progress) => {
      const video = side === "left" ? leftVideo : rightVideo;
      showVideoSide(side);
      const now = window.performance.now();
      if (now - lastHeroSeekRef.current[side] < 1000 / 30) return;
      video.pause();
      if (safeSeekVideo(video, clamp(progress, 0, 1) * video.duration)) {
        lastHeroSeekRef.current[side] = now;
      }
    };

    const handlePointerMove = (event) => {
      const rect = section.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top >= window.innerHeight) return;

      if (cursor) {
        cursor.style.left = `${event.clientX}px`;
        cursor.style.top = `${event.clientY}px`;
      }

      if (isTouchLike()) return;

      const width = window.innerWidth;
      const center = width / 2;
      const deadZone = Math.max(30, width * 0.05);

      if (scrubFrameRef.current) {
        window.cancelAnimationFrame(scrubFrameRef.current);
      }

      scrubFrameRef.current = window.requestAnimationFrame(() => {
        scrubFrameRef.current = null;

        if (event.clientX < center - deadZone) {
          const range = center - deadZone;
          const progress = 1 - clamp(event.clientX / range, 0, 1);
          scrubVideo("right", progress);
          return;
        }

        if (event.clientX > center + deadZone) {
          const range = width - center - deadZone;
          const progress = clamp((event.clientX - center - deadZone) / range, 0, 1);
          scrubVideo("left", progress);
          return;
        }

        const currentVideo = activeSideRef.current === "left" ? leftVideo : rightVideo;
        safeSeekVideo(currentVideo, 0, { minDelta: 0.04 });
      });
    };

    const startTouchPlayback = () => {
      if (!isTouchLike()) return;
      showVideoSide("left");
      leftVideo.loop = false;
      rightVideo.loop = false;
      leftVideo.play().catch(() => {});
    };

    const switchToRight = () => {
      if (!isTouchLike()) return;
      showVideoSide("right");
      safeSeekVideo(rightVideo, 0, { minDelta: 0 });
      rightVideo.play().catch(() => {});
    };

    const switchToLeft = () => {
      if (!isTouchLike()) return;
      showVideoSide("left");
      safeSeekVideo(leftVideo, 0, { minDelta: 0 });
      leftVideo.play().catch(() => {});
    };

    const handleResize = () => {
      setArchiveColumns(getDemandArchiveColumns());
      if (isTouchLike()) {
        startTouchPlayback();
      } else {
        leftVideo.pause();
        rightVideo.pause();
        showVideoSide("right");
      }
    };

    leftVideo.addEventListener("ended", switchToRight);
    rightVideo.addEventListener("ended", switchToLeft);
    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      leftVideo.removeEventListener("ended", switchToRight);
      rightVideo.removeEventListener("ended", switchToLeft);
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("resize", handleResize);
      if (scrubFrameRef.current) window.cancelAnimationFrame(scrubFrameRef.current);
    };
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const cursor = cursorRef.current;
    const videoStage = videoStageRef.current;
    const panel = panelRef.current;
    const panelInner = panelInnerRef.current;
    const overlay = overlayRef.current;
    const outroInfo = outroInfoRef.current;
    const viewButton = viewButtonRef.current;
    const footer = footerRef.current;

    if (!section || !videoStage || !panel || !panelInner || !overlay || !outroInfo || !viewButton || !footer) {
      return undefined;
    }

    let animationFrame = null;
    let viewportHeight = window.innerHeight;
    let maxScroll = 0;
    let sectionScrollHeight = viewportHeight * 5;

    const measure = () => {
      viewportHeight = window.innerHeight;
      maxScroll = Math.max(panelInner.scrollHeight - viewportHeight, viewportHeight * 0.8);
      sectionScrollHeight = viewportHeight + maxScroll + viewportHeight * 2;
      section.style.height = `${sectionScrollHeight}px`;
    };

    const updateCards = () => {
      cardRefs.current.forEach((card) => {
        if (!card) return;
        const rect = card.getBoundingClientRect();
        let scale = 0;

        if (rect.bottom > 0 && rect.top < viewportHeight) {
          const enter = Math.min(1, (viewportHeight - rect.top) / (viewportHeight * 0.6));
          const exit = Math.min(1, rect.bottom / (viewportHeight * 0.4));
          scale = Math.max(0, Math.min(enter, exit));
        }

        card.style.transform = `scale(${scale.toFixed(3)})`;
      });
    };

    const update = () => {
      const rect = section.getBoundingClientRect();
      const localScroll = clamp(-rect.top, 0, Math.max(sectionScrollHeight - viewportHeight, 0));
      const panelProgress = clamp(localScroll / viewportHeight, 0, 1);
      const panelOffset = (1 - panelProgress) * viewportHeight;
      const contentScroll = Math.max(0, localScroll - viewportHeight);
      const outroProgress = clamp((localScroll - viewportHeight - maxScroll) / Math.max(viewportHeight - 100, 1), 0, 1);

      panel.style.transform = `translateY(${panelOffset}px)`;
      panelInner.style.transform = `translateY(${-Math.min(contentScroll, maxScroll)}px)`;

      const videoVisible = localScroll < viewportHeight * 1.02;
      videoStage.style.opacity = `${1 - panelProgress * 0.88}`;
      videoStage.style.visibility = videoVisible ? "visible" : "hidden";

      overlay.style.opacity = `${outroProgress}`;
      if (cursor) cursor.style.opacity = `${1 - outroProgress}`;
      outroInfo.style.transform = `translateY(${-166 * outroProgress}px)`;
      viewButton.style.transform = `translate(-50%, -50%) scale(${outroProgress.toFixed(3)})`;
      footer.style.opacity = `${outroProgress}`;

      if (symbolRef.current && localScroll > 0 && performance.now() - lastSymbolSwapRef.current > 80) {
        const symbol = demandArchiveSymbols[Math.floor(Math.random() * demandArchiveSymbols.length)];
        symbolRef.current.textContent = symbol;
        lastSymbolSwapRef.current = performance.now();
      }

      updateCards();
      animationFrame = window.requestAnimationFrame(update);
    };

    measure();
    window.setTimeout(measure, 250);
    animationFrame = window.requestAnimationFrame(update);
    window.addEventListener("resize", measure);

    return () => {
      window.removeEventListener("resize", measure);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, [archiveLayout]);

  return (
    <section
      ref={sectionRef}
      className="demand-archive"
      id="current"
      aria-labelledby="current-title"
      style={{ "--archive-columns": archiveColumns }}
    >
      <div className="demand-archive__stage">
        <div ref={cursorRef} className="demand-archive__cursor" aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 48 48" focusable="false">
            <circle cx="24" cy="24" r="22.75" fill="none" stroke="white" strokeWidth="2.5" />
            <path d="M17 17.8h14l-7 12.4-7-12.4Zm6.9 5.4 2.9-5.2h-5.8l2.9 5.2Z" fill="white" />
          </svg>
        </div>

        <motion.div
          className="demand-archive__logo"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <span>current</span>
          <strong>demand</strong>
        </motion.div>

        <motion.p
          className="demand-archive__caption"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay: 0.3 }}
        >
          稳定并优化老品转化，让平面、视频、主图与品宣不再各自为战，而是围绕同一个目标、同一套素材标准和同一条交付节奏推进。
        </motion.p>

        <motion.div
          ref={outroInfoRef}
          className="demand-archive__outro-info"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, delay: 0.45 }}
        >
          <div className="demand-archive__outro-top">
            <div className="demand-archive__symbol-ring">
              <svg viewBox="0 0 40 40" aria-hidden="true">
                <circle cx="20" cy="20" r="18.75" fill="none" stroke="white" strokeWidth="2.5" />
              </svg>
              <span ref={symbolRef}>8</span>
            </div>
            <p>
              下滑
              <br />
              <span className="demand-archive__touch-hint">或者用鼠标摸一下奶糖</span>
            </p>
          </div>
          <strong>02</strong>
        </motion.div>

        <div ref={videoStageRef} className="demand-archive__video-stage" aria-hidden="true">
          <ResilientVideo
            ref={leftVideoRef}
            className="demand-archive__video demand-archive__video--left"
            data-video-id={demandArchiveHeroVideos.left.id}
            src={demandArchiveHeroVideos.left.src}
            fallback={demandArchiveHeroVideos.left.fallback}
            muted
            playsInline
            preload="auto"
          />
          <ResilientVideo
            ref={rightVideoRef}
            className="demand-archive__video demand-archive__video--right"
            data-video-id={demandArchiveHeroVideos.right.id}
            src={demandArchiveHeroVideos.right.src}
            fallback={demandArchiveHeroVideos.right.fallback}
            muted
            playsInline
            preload="auto"
          />
        </div>

        <div ref={overlayRef} className="demand-archive__white-overlay" aria-hidden="true" />
        <a ref={viewButtonRef} className="demand-archive__view" href="#future" aria-label="进入未来产品挑战">
          view
        </a>

        <footer ref={footerRef} className="demand-archive__footer">
          <span>HEMO 三宠2026</span>
          <span>SECTION 02</span>
        </footer>

        <div ref={panelRef} className="demand-archive__panel">
          <div ref={panelInnerRef} className="demand-archive__panel-inner">
            <div className="demand-archive__panel-heading">
              <span>02 / CURRENT NEEDS</span>
              <h2 id="current-title">部门目前需求</h2>
              <p>稳定并优化老品的转化，同时让平面与视频更顺畅地协同。</p>
            </div>

            <div className="demand-archive__grid" aria-label="当前需求影像档案">
              {archiveLayout.map((row, rowIndex) =>
                row.map((videoIndex, columnIndex) => {
                  if (videoIndex === -1) {
                    return (
                      <div
                        className="demand-archive__grid-spacer"
                        key={`empty-${rowIndex}-${columnIndex}`}
                        aria-hidden="true"
                      />
                    );
                  }

                  const isLeftHalf = columnIndex < archiveColumns / 2;
                  const videoSource = demandArchiveGalleryVideos[videoIndex];

                  return (
                    <article
                      className="demand-archive__card"
                      style={{ transformOrigin: isLeftHalf ? "right bottom" : "left bottom" }}
                      key={`${videoIndex}-${rowIndex}-${columnIndex}`}
                      ref={(node) => {
                        cardRefs.current[videoIndex] = node;
                      }}
                    >
                      <ResilientVideo
                        src={videoSource.src}
                        fallback={videoSource.fallback}
                        data-video-id={videoSource.id}
                        muted
                        playsInline
                        loop
                        autoPlay
                        preload="metadata"
                      />
                      <div className="demand-archive__card-label">
                        <span>{String(videoIndex + 1).padStart(2, "0")}</span>
                        <strong>{videoIndex % 2 === 0 ? "conversion" : "collaboration"}</strong>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const challengeTexts = [
  {
    text: "01.无限拼接猫砂盆需要产品系统感和模块化视觉语言。",
    side: "left",
    range: [0.08, 0.17, 0.26, 0.36],
    speed: 128,
  },
  {
    text: "02.不锈钢与木质产品结合的家具线，需要更强的材质表达、空间场景和品牌统一性。",
    side: "right",
    range: [0.27, 0.38, 0.5, 0.62],
    speed: 152,
  },
  {
    text: "03.新品类会要求更多 3D / AIGC 资产库，用来快速生成场景、视频、主图和品宣内容。",
    side: "left",
    range: [0.5, 0.6, 0.69, 0.81],
    speed: 168,
  },
  {
    text: "04.产品越复杂，设计越不能只靠临时发挥，而要靠统一的视觉规则、资产沉淀和跨部门沟通效率。",
    side: "right",
    range: [0.69, 0.8, 0.92, 1],
    speed: 142,
  },
];

const capabilityProofs = [
  {
    id: "top-left",
    number: "01",
    label:
      "01:我懂平面、拍摄、3D 和 AIGC，所以我不是只站在某一个岗位看问题。我能理解一张主图为什么要这样构图，也能理解视频为什么要这样拍、3D 资产为什么要这样建、AIGC 为什么能提高前期探索和后期产出效率。",
  },
  {
    id: "top-right",
    number: "02",
    label:
      "02.新产品出现后，设计需求不会只来自设计内部，还会涉及采购、运营、产品信息、物流单证、上架节奏和销售反馈。我跑过这些流程，所以我知道信息在哪里容易断，沟通在哪里容易慢。\n这也是我适合管理岗的原因之一：我不只是执行者，也可以成为目标拆解者、资源协调者和结果负责人。这让我可以在平面、视频、主图、品宣之间建立更合理的节奏和标准，而不是让每个人只在自己的环节里独立完成任务",
  },
  {
    id: "bottom-left",
    number: "03",
    label:
      "03.我能把单点执行沉淀成流程和标准：让平面、视频、主图、品宣在同一节奏里推进，减少重复沟通和临时返工。",
  },
  {
    id: "bottom-right",
    number: "04",
    label:
      "04：这个网页本身也是一次小型证明：在有限时间、真实压力和明确目标下，我能完成从策略、视觉、文案到落地的完整闭环",
  },
];

const capabilityVideos = [
  { id: "top-left", src: "/assets/capability-top-left.mp4" },
  { id: "top-right", src: "/assets/capability-top-right.mp4" },
  { id: "bottom-left", src: "/assets/capability-bottom-left.mp4" },
  { id: "bottom-right", src: "/assets/capability-bottom-right.mp4" },
];

function ScrollVideoChallengeSection() {
  const sectionRef = useRef(null);
  const videoRef = useRef(null);
  const textRefs = useRef([]);
  const targetProgressRef = useRef(0);
  const visualProgressRef = useRef(0);
  const videoProgressRef = useRef(0);
  const lastFrameTimeRef = useRef(0);
  const lastVideoSeekRef = useRef(0);
  const videoReadyRef = useRef(false);
  const rafRef = useRef(null);
  const scrollProgressMotion = useMotionValue(0);
  const springVideoProgress = useSpring(scrollProgressMotion, {
    stiffness: 180,
    damping: 38,
    mass: 0.18,
    restDelta: 0.0001,
  });

  useMotionValueEvent(springVideoProgress, "change", (latest) => {
    videoProgressRef.current = clamp(latest, 0, 1);
  });

  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section || !video) return undefined;

    const updateTarget = () => {
      const scrollable = Math.max(1, section.offsetHeight - window.innerHeight);
      const rect = section.getBoundingClientRect();
      const nextProgress = clamp(-rect.top / scrollable, 0, 1);
      targetProgressRef.current = nextProgress;
      scrollProgressMotion.set(nextProgress);
    };

    const applyProgress = () => {
      const now = window.performance.now();
      const elapsed = lastFrameTimeRef.current ? Math.min(now - lastFrameTimeRef.current, 64) : 16.7;
      lastFrameTimeRef.current = now;

      updateTarget();

      const target = targetProgressRef.current;
      const smoothing = 1 - Math.exp(-elapsed / 130);
      visualProgressRef.current += (target - visualProgressRef.current) * smoothing;
      const progress = target <= 0.001 || target >= 0.999 ? target : visualProgressRef.current;
      const scrollProgress = target;
      const titleTravel = scrollProgress * Math.max(0, section.offsetHeight - window.innerHeight);

      section.style.setProperty("--scroll-progress", scrollProgress.toFixed(4));
      section.style.setProperty("--title-y", `${titleTravel}px`);
      section.style.setProperty("--video-y", `${(progress - 0.5) * -34}px`);

      textRefs.current.forEach((element, index) => {
        if (!element) return;
        const item = challengeTexts[index];
        const [inStart, inEnd, outStart, outEnd] = item.range;
        const fadeIn = smoothStep(inStart, inEnd, progress);
        const fadeOut = 1 - smoothStep(outStart, outEnd, progress);
        const opacity = clamp(Math.min(fadeIn, fadeOut), 0, 1);
        const sideDirection = item.side === "left" ? -1 : 1;
        const drift = (1 - opacity) * 34 * sideDirection;
        const parallax = (progress - 0.5) * item.speed;

        element.style.opacity = opacity.toFixed(3);
        element.style.transform = `translate3d(${drift}px, ${parallax}px, 0)`;
        element.style.filter = `blur(${((1 - opacity) * 8).toFixed(2)}px)`;
      });

      if (videoReadyRef.current && Number.isFinite(video.duration) && video.duration > 0) {
        const videoProgress =
          scrollProgress <= 0.001 || scrollProgress >= 0.999
            ? scrollProgress
            : clamp(videoProgressRef.current || progress, 0, 1);
        const maxTime = Math.max(0, video.duration - 0.001);
        const nextTime = scrollProgress >= 0.999 ? video.duration : clamp(videoProgress * video.duration, 0, maxTime);
        const isEdge = scrollProgress <= 0.001 || scrollProgress >= 0.999;
        const seekInterval = isEdge ? 0 : 1000 / 30;
        const hasEnoughTime = now - lastVideoSeekRef.current >= seekInterval;
        const hasEnoughDelta = Math.abs(video.currentTime - nextTime) > (isEdge ? 0.001 : 0.018);

        if ((isEdge || (hasEnoughTime && hasEnoughDelta)) && safeSeekVideo(video, nextTime, { minDelta: isEdge ? 0.001 : 0.018 })) {
          lastVideoSeekRef.current = now;
        }
      }

      rafRef.current = window.requestAnimationFrame(applyProgress);
    };

    const handleLoaded = () => {
      videoReadyRef.current = true;
      video.pause();
      safeSeekVideo(video, 0, { minDelta: 0 });
      updateTarget();
    };

    const handleScroll = () => updateTarget();
    const handleResize = () => {
      lastFrameTimeRef.current = 0;
      updateTarget();
    };

    video.addEventListener("loadedmetadata", handleLoaded);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);

    updateTarget();
    rafRef.current = window.requestAnimationFrame(applyProgress);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoaded);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, [scrollProgressMotion]);

  return (
    <section className="scroll-challenge" id="future" ref={sectionRef} aria-labelledby="future-title">
      <div className="scroll-challenge__sticky" aria-hidden="true">
        <ResilientVideo
          ref={videoRef}
          className="scroll-challenge__video"
          src="/assets/future-product-scroll-bg.mp4"
          muted
          playsInline
          preload="auto"
        />
        <div className="scroll-challenge__video-shade" />
      </div>

      <div className="scroll-challenge__foreground">
        <h2 id="future-title" className="scroll-challenge__title">
          未来产品带来的新挑战
        </h2>

        {challengeTexts.map((item, index) => (
          <p
            className={`scroll-challenge__text scroll-challenge__text--${item.side}`}
            ref={(node) => {
              textRefs.current[index] = node;
            }}
            key={item.text}
          >
            {item.text}
          </p>
        ))}
      </div>
    </section>
  );
}

function CapabilityMatchSection() {
  const sectionRef = useRef(null);
  const cursorRef = useRef(null);
  const videoRefs = useRef({});
  const activeZoneRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0, hasPointer: false });
  const rafRef = useRef(null);
  const lastCapabilitySeekRef = useRef({});
  const [activeZone, setActiveZone] = useState(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        document.body.classList.toggle("is-capability-active", entry.isIntersecting);
      },
      { threshold: 0.01, rootMargin: "-8% 0px -8% 0px" }
    );

    observer.observe(section);

    return () => {
      observer.disconnect();
      document.body.classList.remove("is-capability-active");
    };
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const cursor = cursorRef.current;
    if (!section || !cursor) return undefined;

    const isTouchMode = () =>
      window.innerWidth < 1024 || window.matchMedia("(hover: none), (pointer: coarse)").matches;

    const setZone = (zone) => {
      if (activeZoneRef.current === zone) return;
      activeZoneRef.current = zone;
      setActiveZone(zone);
    };

    const getZoneFromPointer = (x, y) => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const centerX = width / 2;
      const centerY = height / 2;
      const deadX = Math.max(30, width * 0.05);
      const deadY = Math.max(30, height * 0.05);

      if (Math.abs(x - centerX) <= deadX || Math.abs(y - centerY) <= deadY) return null;
      if (x < centerX && y < centerY) return "top-left";
      if (x > centerX && y < centerY) return "top-right";
      if (x < centerX && y > centerY) return "bottom-left";
      return "bottom-right";
    };

    const getScrubProgress = (zone, x) => {
      const width = window.innerWidth;
      const centerX = width / 2;
      const deadX = Math.max(30, width * 0.05);

      if (zone?.includes("left")) {
        return clamp((centerX - deadX - x) / Math.max(centerX - deadX, 1), 0, 1);
      }

      return clamp((x - centerX - deadX) / Math.max(width - centerX - deadX, 1), 0, 1);
    };

    const resetInactiveVideos = (visibleZone) => {
      Object.entries(videoRefs.current).forEach(([id, video]) => {
        if (!video || id === visibleZone) return;
        video.pause();
        safeSeekVideo(video, 0, { minDelta: 0.04 });
      });
    };

    const updateVideo = () => {
      const isTouch = isTouchMode();
      const zone = isTouch ? "bottom-left" : activeZoneRef.current || "bottom-left";
      const video = videoRefs.current[zone];

      if (video) {
        if (isTouch) {
          video.loop = true;
          video.play().catch(() => {});
        } else {
          video.pause();
          if (canSeekVideo(video)) {
            const now = window.performance.now();
            const lastSeek = lastCapabilitySeekRef.current[zone] || 0;
            const progress = activeZoneRef.current ? getScrubProgress(activeZoneRef.current, mouseRef.current.x) : 0;
            const nextTime = clamp(progress * video.duration, 0, Math.max(0, video.duration - 0.001));
            if (now - lastSeek >= 1000 / 30 && safeSeekVideo(video, nextTime)) {
              lastCapabilitySeekRef.current[zone] = now;
            }
          }
        }
      }

      resetInactiveVideos(zone);
      rafRef.current = window.requestAnimationFrame(updateVideo);
    };

    const handleMouseMove = (event) => {
      if (isTouchMode()) return;
      mouseRef.current = { x: event.clientX, y: event.clientY, hasPointer: true };
      cursor.style.opacity = "1";
      cursor.style.left = `${event.clientX}px`;
      cursor.style.top = `${event.clientY}px`;
      setZone(getZoneFromPointer(event.clientX, event.clientY));
    };

    const handleMouseLeave = () => {
      mouseRef.current.hasPointer = false;
      cursor.style.opacity = "0";
      setZone(null);
    };

    const handleResize = () => {
      if (isTouchMode()) setZone(null);
    };

    Object.values(videoRefs.current).forEach((video) => {
      video.preload = "auto";
      video.load();
    });

    if (isTouchMode()) {
      const fallback = videoRefs.current["bottom-left"];
      if (fallback) {
        fallback.loop = true;
        fallback.play().catch(() => {});
      }
    }

    section.addEventListener("mousemove", handleMouseMove);
    section.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("resize", handleResize);
    rafRef.current = window.requestAnimationFrame(updateVideo);

    return () => {
      section.removeEventListener("mousemove", handleMouseMove);
      section.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("resize", handleResize);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const activeVideo = activeZone || "bottom-left";

  return (
    <section className="capability-match" id="match" ref={sectionRef} aria-labelledby="match-title">
      <div className="capability-sticky">
        <div className="capability-cursor" ref={cursorRef} aria-hidden="true">
          PTLOM
        </div>

        <div className="capability-canvas" aria-hidden="true">
          {capabilityVideos.map((video) => (
            <ResilientVideo
              className={`capability-bg-video ${activeVideo === video.id ? "is-active" : ""}`}
              data-zone={video.id}
              key={video.id}
              muted
              playsInline
              preload="auto"
              ref={(node) => {
                if (node) videoRefs.current[video.id] = node;
              }}
              src={video.src}
            />
          ))}
        </div>

        <div className="capability-veil" aria-hidden="true" />
        <div className="capability-dead-zone" aria-hidden="true" />

        <p className="capability-caption">我凭什么可以满足公司的需求</p>

        <div className="capability-proof-map" aria-live="polite">
          {capabilityProofs.map((proof) => (
            <article
              className={`capability-hotspot capability-hotspot--${proof.id} ${
                activeZone === proof.id ? "is-active" : ""
              }`}
              key={proof.id}
            >
              <strong aria-hidden="true">{proof.number}</strong>
              <p>{proof.label}</p>
            </article>
          ))}
        </div>

        <h2 id="match-title" className="capability-title">
          我懂业务；我善执行；我担责任
        </h2>
      </div>
    </section>
  );
}

function App() {
  const heroRef = useRef(null);
  const transitionLockRef = useRef(false);
  const [transitioning, setTransitioning] = useState(false);
  const [heroGateOpen, setHeroGateOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return Boolean(window.location.hash);
  });

  useEffect(() => {
    if (!window.location.hash) return undefined;
    setHeroGateOpen(true);
    const timer = window.setTimeout(() => {
      document.querySelector(window.location.hash)?.scrollIntoView({ behavior: "auto", block: "start" });
    }, 120);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const locked = !heroGateOpen;
    document.documentElement.classList.toggle("is-hero-gated", locked);
    document.body.classList.toggle("is-hero-gated", locked);
    if (locked) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }

    const stopScroll = (event) => {
      if (!locked) return;
      event.preventDefault();
    };

    const stopKeys = (event) => {
      if (!locked) return;
      const lockedKeys = ["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "];
      if (lockedKeys.includes(event.key)) {
        event.preventDefault();
      }
    };

    window.addEventListener("wheel", stopScroll, { passive: false });
    window.addEventListener("touchmove", stopScroll, { passive: false });
    window.addEventListener("keydown", stopKeys);

    return () => {
      document.documentElement.classList.remove("is-hero-gated");
      document.body.classList.remove("is-hero-gated");
      window.removeEventListener("wheel", stopScroll);
      window.removeEventListener("touchmove", stopScroll);
      window.removeEventListener("keydown", stopKeys);
    };
  }, [heroGateOpen]);

  const enterNextScreen = () => {
    if (transitionLockRef.current) return;
    transitionLockRef.current = true;
    setHeroGateOpen(true);
    setTransitioning(true);

    window.setTimeout(() => {
      document.getElementById("current")?.scrollIntoView({ behavior: "auto", block: "start" });
    }, 430);

    window.setTimeout(() => {
      setTransitioning(false);
      transitionLockRef.current = false;
    }, 1100);
  };

  const updateHeroPointer = (event) => {
    const rect = heroRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    heroRef.current.style.setProperty("--hero-x", x.toFixed(3));
    heroRef.current.style.setProperty("--hero-y", y.toFixed(3));
  };

  const resetHeroPointer = () => {
    heroRef.current?.style.setProperty("--hero-x", "0");
    heroRef.current?.style.setProperty("--hero-y", "0");
  };

  return (
    <>
      <div className={`white-transition ${transitioning ? "is-active" : ""}`} aria-hidden="true" />

      <header className="site-header">
        <a className="brand-mark" href="#top" aria-label="回到顶部">
          <span className="brand-mark__dot" />
          <span>Creative System</span>
        </a>
        <nav className="site-nav" aria-label="页面导航">
          <a href="#current">现在需求</a>
          <a href="#future">未来挑战</a>
          <a href="#match">能力匹配</a>
          <a href="#plan">未来规划</a>
        </nav>
        <a className="nav-cta" href="#match">查看证明</a>
      </header>

      <main id="top">
        <section
          ref={heroRef}
          className="hero"
          aria-labelledby="hero-title"
          onClick={enterNextScreen}
          onPointerMove={updateHeroPointer}
          onPointerLeave={resetHeroPointer}
        >
          <CinematicHeroVideo />
          <div className="hero-cinema-vignette" aria-hidden="true" />

          <div className="cinematic-hero__shell">
            <nav className="cinematic-hero__nav" aria-label="开屏导航">
              <div className="cinematic-hero__nav-inner liquid-glass">
                <a
                  className="cinematic-hero__brand"
                  href="#top"
                  aria-label="HEMO"
                  onClick={(event) => event.stopPropagation()}
                >
                  <Globe size={24} strokeWidth={1.8} />
                  <span>HEMO</span>
                </a>
                <div className="cinematic-hero__nav-actions">
                  <button
                    className="cinematic-hero__plain-button"
                    type="button"
                    onClick={(event) => event.stopPropagation()}
                  >
                    三宠
                  </button>
                  <button
                    className="cinematic-hero__glass-button liquid-glass"
                    type="button"
                    onClick={(event) => event.stopPropagation()}
                  >
                    品宣部
                  </button>
                </div>
              </div>
            </nav>

            <div className="cinematic-hero__content">
              <h1
                id="hero-title"
                className="cinematic-hero__heading"
              >
                Creative System for Results
              </h1>
              <div className="cinematic-hero__side-copy cinematic-hero__side-copy--left">
                <span>01 / System</span>
                <p>当公司进入新品类、新产品和新内容节奏，设计部门需要的不只是更强的单点执行，而是一套能把创意、速度和业务理解转化为结果的生产系统。</p>
              </div>
              <div className="cinematic-hero__side-copy cinematic-hero__side-copy--right">
                <span>02 / Responsibility</span>
                <p>我想证明的，是我可以从完成任务的人，升级为拆解目标、协调资源，并对结果负责的人。</p>
              </div>
            </div>
          </div>

          <div className="hero-inner">
            <div className="hero-copy">
              <p className="kicker">CREATIVE SYSTEM // RESULTS PROOF</p>
              <SplitText
                as="h1"
                text={"Creative\nSystem for\nResults"}
                className="hero-title hero-title--english"
                delay={46}
              />
            </div>

            <div className="hero-side">
              <SplitText
                as="p"
                text="当公司进入新品类、新产品和新内容节奏，设计部门需要的不只是更强的单点执行，而是一套能把创意、速度和业务理解转化为结果的生产系统。"
                className="hero-subtitle"
                delay={10}
              />
              <SplitText
                as="p"
                text="我想证明的，是我可以从完成任务的人，升级为拆解目标、协调资源，并对结果负责的人。"
                className="hero-subtitle hero-subtitle--second"
                delay={14}
              />
              <button
                className="button button--primary"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  enterNextScreen();
                }}
              >
                进入证明
                <span aria-hidden="true">→</span>
              </button>
            </div>

            <div className="hero-console" aria-label="核心策略摘要">
              <div className="console-head">
                <span>SYS 01</span>
                <span>LIVE PROOF</span>
              </div>
              <div className="console-title">
                <span>Design production system</span>
                <strong>协同 / 转化 / 资产 / 标准</strong>
              </div>
              <div className="console-bars" aria-hidden="true">
                <span style={{ "--level": "74%" }} />
                <span style={{ "--level": "88%" }} />
                <span style={{ "--level": "63%" }} />
                <span style={{ "--level": "94%" }} />
              </div>
            </div>

            <button
              className="hero-click-hint"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                enterNextScreen();
              }}
            >
              <span>Click anywhere</span>
              <strong>点击屏幕进入下一画面</strong>
            </button>
          </div>
        </section>

        <CatDemandSection />

        <ScrollVideoChallengeSection />

        <CapabilityMatchSection />

        <section className="section finale" id="plan" aria-labelledby="plan-title">
          <div className="section-inner">
            <div className="section-heading section-heading--wide">
              <p className="kicker">05 // PLAN AND PERSONAL DIRECTION</p>
              <SplitText as="h2" id="plan-title" text="未来安排与个人规划" delay={18} />
              <p>最后回到开场的命题：公司接下来需要一套更系统的设计生产力，而我的能力组合和经历，正好可以承担这个组织和推进的角色。</p>
            </div>

            <div className="plan-grid">
              <article className="plan-card">
                <span className="plan-step">0-30 天</span>
                <h3>让需求入口变清楚</h3>
                <p>建立固定需求 brief，明确目标、卖点、素材、交付格式和负责人，让新同事进入团队后先看到规则，而不是先面对混乱。</p>
              </article>
              <article className="plan-card">
                <span className="plan-step">31-60 天</span>
                <h3>让素材与标准可复用</h3>
                <p>推动素材库、视觉标准和 3D / AIGC 资产沉淀。老产品持续看转化，新产品提前做视觉系统，避免每次上新都从零开始。</p>
              </article>
              <article className="plan-card">
                <span className="plan-step">61-90 天</span>
                <h3>让团队形成节奏</h3>
                <p>周期性的复盘，将平面，视频，品宣组织到一张工作网上</p>
              </article>
            </div>

            <div className="future-layout">
              <article className="future-card future-card--strong">
                <h3>短期安排</h3>
                <p>短期内，为了方便新同事的加入，我正在推动建立固定的需求 brief、素材库、视觉标准、周节奏复盘和重点产品优化机制。老产品持续看转化，新产品提前做视觉系统，避免每次上新都从零开始。</p>
              </article>
              <article className="future-card">
                <h3>长期规划</h3>
                <p>长期来看，我希望设计部门不只是一个接需求、出素材的执行部门，而是能够参与产品表达、品牌建设和内容增长的核心团队。</p>
                <p>我也希望自己的职业发展，不只是成为一个更强的设计执行者，而是成为一个能理解业务、组织团队、建立流程，并持续创造结果的设计管理者。我对这个岗位的热情，来自于我真的愿意把复杂的事情理顺，把分散的人和能力组织起来，让设计产生更稳定、更长远的价值。</p>
              </article>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

export default App;
