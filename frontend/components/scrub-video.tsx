"use client";
/**
 * Court-scrub backdrop — full-screen video, mouse-scrub controlled,
 * never autoplays.
 *
 * Horizontal mouse movement scrubs the timeline:
 *   offset = (delta / innerWidth) * SENSITIVITY * video.duration
 * `targetTime` accumulates clamped offsets; seeks are serialized through the
 * `seeked` event so rapid movement queues instead of flooding the decoder.
 * Touch drags map the same way.
 */
import { useEffect, useRef } from "react";

const SENSITIVITY = 0.8;

export function ScrubVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const prevX = useRef(0);
  const targetTime = useRef(0);
  const seeking = useRef(false);
  const hasPrev = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;

    const seekToTarget = () => {
      if (!video.duration || Number.isNaN(video.duration)) return;
      if (Math.abs(targetTime.current - video.currentTime) < 0.01) {
        seeking.current = false;
        return;
      }
      seeking.current = true;
      video.currentTime = targetTime.current;
    };

    const onX = (x: number) => {
      if (!hasPrev.current) {
        prevX.current = x;
        hasPrev.current = true;
        return;
      }
      const delta = x - prevX.current;
      prevX.current = x;
      if (!video.duration || Number.isNaN(video.duration)) return;
      const offset = (delta / window.innerWidth) * SENSITIVITY * video.duration;
      targetTime.current = Math.min(
        Math.max(targetTime.current + offset, 0),
        video.duration
      );
      if (!seeking.current) seekToTarget();
    };

    const handleMouseMove = (e: MouseEvent) => onX(e.clientX);
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) onX(e.touches[0].clientX);
    };
    const handleSeeked = () => {
      seeking.current = false;
      seekToTarget();
    };
    const handleLoadedMetadata = () => {
      targetTime.current = video.currentTime;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    video.addEventListener("seeked", handleSeeked);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, []);

  return (
    <video
      ref={videoRef}
      className="fixed inset-0 z-0 h-full w-full object-cover"
      style={{ objectPosition: "85% center" }}
      src="/court-pastel.mp4"
      poster="/court-pastel-poster.jpg"
      muted
      playsInline
      preload="auto"
      aria-hidden
      tabIndex={-1}
    />
  );
}
