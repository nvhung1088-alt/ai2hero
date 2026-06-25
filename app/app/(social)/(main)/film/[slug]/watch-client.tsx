'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { generateFilmUrl } from '@/lib/utils/film-url';
import { Heart, List, ArrowLeft, Volume2, VolumeX, Play, Loader2, Bookmark, Lock, Coins, AlertTriangle, MessageSquare, Send, X, ExternalLink, Maximize, Settings, Subtitles, Info, Eye, Trash2 } from 'lucide-react';
import { FilmSeries, FilmEpisode } from '@/lib/db/schema';
import { 
  toggleBookmarkAction, 
  rateFilmAction, 
  saveWatchHistoryAction, 
  unlockEpisodeAction,
  getUserBalanceAction,
  reportFilmErrorAction,
  toggleFilmLikeAction,
  deleteFilmSeriesAction
} from '@/lib/db/film-actions';
import { 
  getFeedCommentsAction, 
  addFeedCommentAction 
} from '@/lib/db/social-actions';
import { ShareFilmModal } from './share-film-modal';

interface WatchClientProps {
  series: any; // Coi như FilmSeries mở rộng có avgRating, ratingCount
  episodes: FilmEpisode[];
  initialEpisodeNumber: number;
  initialBookmarked: boolean;
  initialLiked: boolean;
  userId?: number;
  isAdmin?: boolean;
  isPopup?: boolean;
  onClosePopup?: () => void;
}

export default function HeroFilmWatchClient({
  series,
  episodes,
  initialEpisodeNumber,
  initialBookmarked,
  initialLiked,
  userId,
  isAdmin = false,
  isPopup = false,
  onClosePopup
}: WatchClientProps) {
  const router = useRouter();
  const [activeEpNumber, setActiveEpNumber] = useState(initialEpisodeNumber);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [subtitleLang, setSubtitleLang] = useState<'off' | 'vi' | 'en'>('vi');
  const [origin, setOrigin] = useState('');
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [userBalance, setUserBalance] = useState<number>(0);
  
  const [showUI, setShowUI] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [duration, setDuration] = useState<Record<number, number>>({});
  const [currentTime, setCurrentTime] = useState<Record<number, number>>({});
  // Likes state
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(series.likeCount || 0);

  // Error reports state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('broken_video');
  const [reportDescription, setReportDescription] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const [showCommentDrawer, setShowCommentDrawer] = useState(false);
  const [showInfoDrawer, setShowInfoDrawer] = useState(false);
  const [commentsList, setCommentsList] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Share state
  const [showShareModal, setShowShareModal] = useState(false);

  // Floating Hearts effect
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);

  const [showDrawer, setShowDrawer] = useState(false);
  const [localUnlockedIds, setLocalUnlockedIds] = useState<number[]>([]);
  const [unlockingId, setUnlockingId] = useState<number | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const playerWrapperRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const episodeRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});
  const iframeRefs = useRef<Record<number, HTMLIFrameElement | null>>({});
  const watchedTracks = useRef<Record<number, boolean>>({}); // Theo dõi xem tập nào đã ghi history để tránh duplicate call
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cache initial resume times so iframe URL does not change on re-renders
  const [initialResumeTimes] = useState<Record<number, number>>(() => {
    const times: Record<number, number> = {};
    if (typeof window !== 'undefined') {
      episodes.forEach(ep => {
        const saved = sessionStorage.getItem(`hero_resume_${ep.id}`);
        if (saved && Number(saved) > 5) {
          times[ep.id] = Math.floor(Number(saved));
        }
      });
    }
    return times;
  });

  // Init origin on client mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  // Listen for message events from YouTube postMessage
  useEffect(() => {
    const handleWindowMessage = (event: MessageEvent) => {
      if (typeof event.data === 'string') {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'infoDelivery' && data.info) {
            const info = data.info;
            if (info.currentTime !== undefined) {
              setCurrentTime(prev => ({ ...prev, [activeEpNumber]: info.currentTime }));
              if (info.currentTime > 5) {
                const currentEp = episodes.find(e => e.episodeNumber === activeEpNumber);
                if (currentEp) sessionStorage.setItem(`hero_resume_${currentEp.id}`, info.currentTime.toString());
              }
            }
            if (info.duration !== undefined) {
              setDuration(prev => ({ ...prev, [activeEpNumber]: info.duration }));
            }
          }
        } catch (e) {}
      }
    };
    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, [activeEpNumber]);

  // YouTube parser
  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  // Detect aspect ratio based on URL patterns or metadata
  const detectVideoAspect = (episode: FilmEpisode) => {
    if (episode.videoSource === 'youtube') {
      return episode.videoUrl.includes('/shorts/') ? 'portrait' : 'landscape';
    }
    if (episode.videoSource === 'facebook') {
      return (episode.videoUrl.includes('/reel/') || episode.videoUrl.includes('/reels/')) ? 'portrait' : 'landscape';
    }
    return 'portrait';
  };

  // Generic double-click fullscreen / single-click play-pause handler
  const handleVideoClick = () => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      toggleFullscreen();
    } else {
      clickTimeoutRef.current = setTimeout(() => {
        setIsPlaying(prev => !prev);
        clickTimeoutRef.current = null;
      }, 250);
    }
  };

  // Formats seconds into mm:ss
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Seeks to new time for active episode
  const handleSeek = (newTime: number) => {
    const episode = episodes.find(e => e.episodeNumber === activeEpNumber);
    if (!episode) return;

    if (episode.videoSource === 'youtube') {
      const iframe = iframeRefs.current[activeEpNumber];
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'seekTo', args: [newTime, true] }), 
          '*'
        );
        setCurrentTime(prev => ({ ...prev, [activeEpNumber]: newTime }));
      }
    } else if (episode.videoSource === 'direct') {
      const videoEl = videoRefs.current[activeEpNumber];
      if (videoEl) {
        videoEl.currentTime = newTime;
        setCurrentTime(prev => ({ ...prev, [activeEpNumber]: newTime }));
      }
    }
  };

  // Build embed URLs
  const getEmbedUrl = (episode: FilmEpisode) => {
    if (episode.videoSource === 'youtube') {
      const yId = getYouTubeId(episode.videoUrl);
      if (!yId) return '';
      const originParam = origin ? `&origin=${encodeURIComponent(origin)}` : '';
      const ccParam = subtitleLang !== 'off' ? `&cc_load_policy=1&hl=${subtitleLang}&cc_lang_pref=${subtitleLang}` : '';
      
      const startParam = initialResumeTimes[episode.id] ? `&start=${initialResumeTimes[episode.id]}` : '';

      return `https://www.youtube.com/embed/${yId}?autoplay=1&mute=0&loop=1&playlist=${yId}&controls=0&modestbranding=1&rel=0&enablejsapi=1&iv_load_policy=3&disablekb=1&playsinline=1${originParam}${ccParam}${startParam}`;
    } else if (episode.videoSource === 'facebook') {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(episode.videoUrl)}&show_text=false&autoplay=true&controls=1`;
    }
    return '';
  };

  // Scroll to initial episode on mount
  useEffect(() => {
    const targetRef = episodeRefs.current[initialEpisodeNumber];
    if (targetRef) {
      setTimeout(() => {
        targetRef.scrollIntoView({ behavior: 'auto' });
      }, 100);
    }
  }, [initialEpisodeNumber]);

  // Fetch balance on mount
  useEffect(() => {
    const fetchBalance = async () => {
      if (userId) {
        const res = await getUserBalanceAction();
        if (res.success) setUserBalance(res.balance || 0);
      }
    };
    fetchBalance();
  }, [userId]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      if (!isFull && typeof window !== 'undefined' && window.screen) {
        const orientation = (window.screen as any).orientation;
        if (orientation && orientation.unlock) {
          try {
            orientation.unlock();
          } catch (e) {}
        }
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Handle muting/unmuting and play/pause of iframe players via postMessage without reloading
  useEffect(() => {
    Object.keys(iframeRefs.current).forEach(key => {
      const epNum = parseInt(key, 10);
      const iframe = iframeRefs.current[epNum];
      if (iframe && iframe.contentWindow && iframe.src.includes('youtube.com')) {
        try {
          if (epNum === activeEpNumber) {
            // Kích hoạt API infoDelivery để nhận currentTime và duration liên tục cho progress bar
            iframe.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: epNum }), '*');
            
            const cmd = isMuted ? 'mute' : 'unMute';
            iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: cmd, args: [] }), '*');
            if (!isMuted) {
              iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [100] }), '*');
            }
            if (isPlaying) {
              iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
              
              // Handle resume for Youtube
              const currentEp = episodes.find(e => e.episodeNumber === epNum);
              if (currentEp) {
                const key = `hero_resumed_${currentEp.id}`;
                if (!(window as any)[key]) {
                  const saved = sessionStorage.getItem(`hero_resume_${currentEp.id}`);
                  if (saved && Number(saved) > 5) {
                    iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [Number(saved), true] }), '*');
                  }
                  (window as any)[key] = true;
                }
              }
            } else {
              iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
            }
          } else {
            // Mute and pause non-active videos
            iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'mute', args: [] }), '*');
            iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
          }
        } catch(e) {}
      }
    });
  }, [isMuted, activeEpNumber, isPlaying, origin]);

  const handleUserActivity = () => {
    setShowUI(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => setShowUI(false), 3000);
  };

  const toggleFullscreen = () => {
    const activeEpisode = episodes.find(e => e.episodeNumber === activeEpNumber);
    if (!activeEpisode) return;

    const aspect = detectVideoAspect(activeEpisode);
    const targetEl = playerWrapperRefs.current[activeEpNumber] || containerRef.current;
    
    if (!document.fullscreenElement) {
      targetEl?.requestFullscreen().then(() => {
        if (typeof window !== 'undefined' && window.screen) {
          const orientation = (window.screen as any).orientation;
          if (orientation && orientation.lock) {
            if (aspect === 'landscape') {
              orientation.lock('landscape').catch(() => {});
            } else {
              orientation.lock('portrait').catch(() => {});
            }
          }
        }
      }).catch(() => {});
    } else {
      document.exitFullscreen();
    }
  };

  // Load comments when drawer is opened
  useEffect(() => {
    if (showCommentDrawer && series.feedPostId) {
      const loadComments = async () => {
        setCommentsLoading(true);
        try {
          const res = await getFeedCommentsAction(series.feedPostId);
          if (res.success && res.comments) {
            setCommentsList(res.comments);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setCommentsLoading(false);
        }
      };
      loadComments();
    }
  }, [showCommentDrawer, series.feedPostId]);

  // Kiểm tra tập phim có được xem hay không (Free hoặc đã mở khóa)
  const isEpisodeUnlocked = (episode: FilmEpisode) => {
    return episode.isFree || [].includes(episode.id as never);
  };

  // Ghi nhận lịch sử xem phim
  const trackWatchHistory = async (episode: FilmEpisode) => {
    if (watchedTracks.current[episode.id]) return; // Đã track rồi
    
    watchedTracks.current[episode.id] = true;
    try {
      await saveWatchHistoryAction({
        seriesId: series.id,
        episodeId: episode.id,
        teamId: series.teamId,
        watchedSeconds: 5,
        isCompleted: true
      });
    } catch (e) {
      console.error('Error saving history:', e);
    }
  };

  // Set up IntersectionObserver to detect active episode when scrolling
  useEffect(() => {
    const observerOptions = {
      root: containerRef.current,
      rootMargin: '0px',
      threshold: 0.6 // Element is considered active when 60% visible
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const epNum = parseInt(entry.target.getAttribute('data-episode-number') || '1', 10);
          setActiveEpNumber(epNum);
          
          // Replace URL parameter without reloading
          const newUrl = generateFilmUrl(series.slug || series.id.toString(), epNum);
          window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);

          const activeEpisode = episodes.find(e => e.episodeNumber === epNum);
          if (activeEpisode && isEpisodeUnlocked(activeEpisode)) {
            // Tự động ghi nhận watch history sau 3.5 giây nếu đã mở khóa
            const timer = setTimeout(() => {
              trackWatchHistory(activeEpisode);
            }, 3500);

            // Control direct video playback by triggering state
            setIsPlaying(true);

            return () => clearTimeout(timer);
          } else {
            // Nếu bị khóa, dừng phát
            setIsPlaying(false);
          }
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    
    // Copy refs to local variable for cleanup closure
    const currentEpisodeRefs = { ...episodeRefs.current };

    Object.values(currentEpisodeRefs).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => {
      Object.values(currentEpisodeRefs).forEach((el) => {
        if (el) observer.unobserve(el);
      });
    };
  }, [episodes, series.id, localUnlockedIds]);

  // Handle direct video playback based on isPlaying state
  useEffect(() => {
    Object.keys(videoRefs.current).forEach((key) => {
      const num = parseInt(key, 10);
      const videoEl = videoRefs.current[num];
      if (videoEl) {
        if (num === activeEpNumber && isPlaying) {
          videoEl.play().catch(() => {});
        } else {
          videoEl.pause();
        }
      }
    });
  }, [isPlaying, activeEpNumber]);

  // Track watch history
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const currentEpisode = episodes.find(e => e.episodeNumber === activeEpNumber);
    
    if (isPlaying && currentEpisode) {
      // Đợi 3 giây rồi mới ghi nhận lượt xem
      timeoutId = setTimeout(() => {
        saveWatchHistoryAction({
          seriesId: series.id,
          episodeId: currentEpisode.id,
          teamId: series.teamId,
          watchedSeconds: 5,
          isCompleted: true // Set là true để count view cho episode & series
        }).catch(e => console.error("Error saving view count:", e));
      }, 3000);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [activeEpNumber, isPlaying, episodes, series.id, series.teamId]);

  // Handle manual navigation to an episode from the drawer
  const scrollToEpisode = (epNum: number) => {
    const targetRef = episodeRefs.current[epNum];
    if (targetRef) {
      targetRef.scrollIntoView({ behavior: 'smooth' });
      setActiveEpNumber(epNum);
      setShowDrawer(false);
    }
  };

  // Xử lý yêu thích phim đồng bộ server
  const handleLike = async () => {
    if (!userId) {
      router.push('/sign-in');
      return;
      alert("Vui lòng đăng nhập để thích phim");
      return;
    }
    const result = await toggleFilmLikeAction(series.id);
    if (result.success) {
      setIsLiked(result.liked || false);
      setLikeCount((prev: number) => result.liked ? prev + 1 : Math.max(0, prev - 1));
    }
  };

  const handleDeleteFilm = async () => {
    if (!isAdmin) return;
    if (confirm('⚠️ BẠN CÓ CHẮC CHẮN MUỐN XÓA PHIM NÀY KHÔNG?\nToàn bộ dữ liệu tập phim, báo cáo, bình luận sẽ bị xóa vĩnh viễn và không thể khôi phục!')) {
      try {
        const res = await deleteFilmSeriesAction(series.id);
        if (res.success) {
          alert('✅ Đã xóa phim thành công!');
          router.push('/film');
        }
        if (!res.success) {
          alert('❌ ' + ((res as any).error || 'Có lỗi xảy ra khi xóa'));
        }
      } catch (err) {
        alert('❌ Lỗi hệ thống khi xóa phim');
      }
    }
  };

  const currentEpisode = episodes.find(e => e.episodeNumber === activeEpNumber) || episodes[0];

  // Xử lý bookmark phim
  const handleToggleBookmark = async () => {
    if (!userId) {
      router.push('/sign-in');
      return;
    }
    try {
      const res = await toggleBookmarkAction(series.id);
      setIsBookmarked(res.bookmarked);
    } catch (e) {
      console.error(e);
    }
  };

  // Xử lý mở khóa tập phim
  const handleUnlockEpisode = async (episode: FilmEpisode) => {
    if (!userId) {
      router.push('/sign-in');
      return;
    }
    
    if (userBalance < episode.tokenPrice) {
      router.push('/wallet');
      return;
    }

    setUnlockingId(episode.id);
    try {
      const res = await unlockEpisodeAction(series.id, episode.id);
      if (res.success) {
        setLocalUnlockedIds(prev => [...prev, episode.id]);
        setUserBalance(prev => prev - episode.tokenPrice);
      }
      if (!res.success) {
        alert((res as any).error || 'Mở khóa thất bại');
        return;
      }
    } catch (e) {
      console.error(e);
      alert('Đã xảy ra lỗi hệ thống khi mở khóa');
    } finally {
      setUnlockingId(null);
    }
  };

  // Gửi báo cáo lỗi phim
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      router.push('/sign-in');
      return;
    }
    const activeEp = episodes.find(e => e.episodeNumber === activeEpNumber);
    if (!activeEp) return;

    setIsSubmittingReport(true);
    try {
      const res = await reportFilmErrorAction(
        series.id,
        activeEp.id,
        reportReason,
        reportDescription.trim()
      );
      if (res.success) {
        alert('Cảm ơn bạn đã phản hồi! Báo cáo lỗi đã được gửi đến ban quản trị.');
        setShowReportModal(false);
        setReportDescription('');
      }
      if (!res.success) {
        alert((res as any).error || 'Lỗi gửi báo cáo');
        return;
      }
    } catch (err) {
      console.error(err);
      alert('Không thể gửi báo cáo do lỗi hệ thống');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Gửi bình luận mới
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !series.feedPostId) return;
    if (!userId) {
      router.push('/sign-in');
      return;
    }

    setSubmittingComment(true);
    try {
      const res = await addFeedCommentAction({ postId: series.feedPostId, content: commentInput.trim() });
      if (res.success && res.comment) {
        setCommentsList(prev => [res.comment, ...prev]);
        setCommentInput('');
      }
      if (!res.success) {
        alert((res as any).error || 'Gửi bình luận thất bại');
        return;
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi hệ thống khi gửi bình luận');
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <div 
      className="h-[calc(100vh-3.5rem)] w-full bg-black relative flex overflow-hidden"
      onMouseMove={handleUserActivity}
      onTouchStart={handleUserActivity}
      onClick={handleUserActivity}
    >
      
      {/* Vertical Drama Snap-scroll view area */}
      <div
        ref={containerRef}
        className="flex-1 h-full overflow-y-auto snap-y snap-mandatory scroll-smooth relative"
      >
        {episodes.map((episode) => {
          const isActive = episode.episodeNumber === activeEpNumber;
          const unlocked = isEpisodeUnlocked(episode);
          const aspect = detectVideoAspect(episode);

          return (
            <div
              key={episode.id}
              ref={(el) => {
                episodeRefs.current[episode.episodeNumber] = el;
              }}
              data-episode-number={episode.episodeNumber}
              className="h-full w-full snap-start snap-always relative flex items-center justify-center bg-black overflow-hidden"
            >
              {/* Media Content Player container */}
              <div 
                ref={(el) => { playerWrapperRefs.current[episode.episodeNumber] = el; }}
                className={`w-full h-full relative bg-gray-950 flex items-center justify-center ${isFullscreen && document.fullscreenElement === playerWrapperRefs.current[episode.episodeNumber] ? 'max-w-none' : 'max-w-[480px] border-x border-white/5'}`}
              >
                
                {unlocked ? (
                  <>
                    {/* Top Overlay UI (Inside Player Wrapper to survive Fullscreen) */}
                    <div className={`absolute top-0 left-0 right-0 p-4 z-40 flex justify-between pointer-events-none transition-opacity duration-500 ${showUI ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          if (isPopup && onClosePopup) {
                            onClosePopup();
                          } else {
                            router.push('/film');
                          }
                        }}
                        className="flex items-center justify-center h-10 w-10 rounded-full bg-black/60 backdrop-blur border border-white/10 text-white hover:bg-black/80 transition active:scale-95 cursor-pointer pointer-events-auto"
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </button>
                      
                      <div className="flex items-center gap-2">
                        {episode.videoSource === 'youtube' && (
                          <button
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setSubtitleLang(p => p === 'vi' ? 'en' : p === 'en' ? 'off' : 'vi'); 
                            }}
                            title={`Phụ đề: ${subtitleLang === 'vi' ? 'Tiếng Việt' : subtitleLang === 'en' ? 'English' : 'Tắt'}`}
                            className={`flex items-center justify-center h-10 px-3 rounded-full bg-black/60 backdrop-blur border border-white/10 transition active:scale-95 cursor-pointer pointer-events-auto gap-2 text-[10px] font-bold ${subtitleLang !== 'off' ? 'text-indigo-400 border-indigo-500/30' : 'text-gray-400'}`}
                          >
                            <Subtitles className="h-4 w-4" />
                            {subtitleLang.toUpperCase()}
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                          className="flex items-center justify-center h-10 w-10 rounded-full bg-black/60 backdrop-blur border border-white/10 text-white hover:bg-black/80 transition active:scale-95 cursor-pointer pointer-events-auto"
                        >
                          {isMuted ? <VolumeX className="h-5 w-5 text-rose-500 animate-pulse" /> : <Volume2 className="h-5 w-5 text-green-400" />}
                        </button>
                      </div>
                    </div>

                    {/* 1. Youtube Player Embed */}
                    {episode.videoSource === 'youtube' && isActive && (
                      <div className="absolute inset-0 z-0 bg-black flex items-center justify-center">
                        <div className={`relative ${aspect === 'landscape' ? "w-full aspect-video max-h-full" : (isFullscreen ? "h-screen aspect-[9/16] mx-auto" : "w-full h-full max-w-[calc(100vh*9/16)] mx-auto")}`}>
                          <iframe
                            ref={(el) => { iframeRefs.current[episode.episodeNumber] = el as any; }}
                            src={getEmbedUrl(episode) || undefined}
                            className="w-full h-full border-none pointer-events-none"
                            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                            allowFullScreen
                            onLoad={(e) => {
                              const iframe = e.target as HTMLIFrameElement;
                              if (iframe.contentWindow) {
                                iframe.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: episode.episodeNumber }), '*');
                                iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'addEventListener', args: ['onStateChange'] }), '*');
                              }
                            }}
                          />
                          {/* Title Blocker Overlay (Che tiêu đề Youtube) */}
                          <div className={`absolute top-0 left-0 w-full z-10 pointer-events-none transition-opacity duration-300 ${(!isPlaying || showUI) ? 'opacity-100' : 'opacity-0'}`}>
                            <div className="w-full h-10 bg-[#000000]"></div>
                            <div className="w-full h-8 bg-gradient-to-b from-[#000000] to-transparent"></div>
                          </div>
                          {/* Glass Shield Overlay */}
                          <div 
                            className="absolute inset-0 z-20 cursor-pointer pointer-events-auto"
                            onClick={handleVideoClick}
                          />
                        </div>
                      </div>
                    )}

                    {/* 2. Facebook Player Embed */}
                    {episode.videoSource === 'facebook' && isActive && (
                      <div className="absolute inset-0 z-0 bg-black flex items-center justify-center">
                        <div className={`relative ${aspect === 'landscape' ? "w-full aspect-video max-h-full" : (isFullscreen ? "h-screen aspect-[9/16] mx-auto" : "w-full h-full max-w-[calc(100vh*9/16)] mx-auto")}`}>
                          <iframe
                            ref={(el) => { iframeRefs.current[episode.episodeNumber] = el as any; }}
                            src={getEmbedUrl(episode) || undefined}
                            className="w-full h-full border-none"
                            scrolling="no"
                            frameBorder="0"
                            allowFullScreen={true}
                            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; fullscreen"
                          />
                        </div>
                      </div>
                    )}

                    {/* 3. Direct Video Player (MP4) */}
                    {episode.videoSource === 'direct' && (
                      <>
                        <video
                          ref={(el) => {
                            videoRefs.current[episode.episodeNumber] = el;
                          }}
                          src={episode.videoUrl}
                          className={aspect === 'landscape' ? "w-full aspect-video max-h-full object-contain bg-black" : "w-full h-full object-contain"}
                          muted={isMuted}
                          playsInline
                          controlsList="nodownload noplaybackrate"
                          disablePictureInPicture
                          onContextMenu={(e) => e.preventDefault()}
                          onTimeUpdate={(e) => {
                            const videoEl = e.currentTarget;
                            setCurrentTime(prev => ({ ...prev, [episode.episodeNumber]: videoEl.currentTime }));
                            if (videoEl.currentTime > 5) {
                              sessionStorage.setItem(`hero_resume_${episode.id}`, videoEl.currentTime.toString());
                            }
                          }}
                          onDurationChange={(e) => {
                            const videoEl = e.currentTarget;
                            setDuration(prev => ({ ...prev, [episode.episodeNumber]: videoEl.duration }));
                          }}
                          onLoadedMetadata={(e) => {
                            const videoEl = e.currentTarget;
                            setDuration(prev => ({ ...prev, [episode.episodeNumber]: videoEl.duration }));
                            // Handle resume for MP4
                            const saved = sessionStorage.getItem(`hero_resume_${episode.id}`);
                            if (saved && Number(saved) > 5) {
                               videoEl.currentTime = Number(saved);
                            }
                          }}
                          onEnded={() => {
                            const nextEp = episodes.find(e => e.episodeNumber === episode.episodeNumber + 1);
                            if (nextEp) scrollToEpisode(nextEp.episodeNumber);
                          }}
                        />
                        <div 
                          className="absolute inset-0 z-10" 
                          onContextMenu={(e) => e.preventDefault()} 
                          onClick={handleVideoClick}
                        />
                      </>
                    )}

                    {/* Custom Progress Bar for YouTube and Direct */}
                    {(episode.videoSource === 'youtube' || episode.videoSource === 'direct') && isActive && unlocked && (
                      <div className={`absolute bottom-[130px] left-4 right-4 z-30 flex flex-col gap-1 pointer-events-auto transition-opacity duration-500 ${showUI ? 'opacity-100' : 'opacity-0'}`}>
                        {/* Time indicator */}
                        <div className="flex justify-between text-[10px] text-gray-300 font-bold px-1 select-none drop-shadow">
                          <span>{formatTime(currentTime[episode.episodeNumber] || 0)}</span>
                          <span>{formatTime(duration[episode.episodeNumber] || 0)}</span>
                        </div>
                        
                        {/* Track bar */}
                        <div 
                          className="h-1.5 w-full bg-white/20 hover:bg-white/30 rounded-full relative cursor-pointer group/progress overflow-visible transition-colors"
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const clickX = e.clientX - rect.left;
                            const percentage = Math.max(0, Math.min(1, clickX / rect.width));
                            const totalDur = duration[episode.episodeNumber] || 0;
                            if (totalDur > 0) {
                              const newTime = percentage * totalDur;
                              handleSeek(newTime);
                            }
                          }}
                        >
                          {/* Fill bar */}
                          <div 
                            className="h-full bg-rose-500 rounded-full absolute top-0 left-0 transition-all duration-100"
                            style={{ width: `${((currentTime[episode.episodeNumber] || 0) / (duration[episode.episodeNumber] || 1)) * 100}%` }}
                          />
                          {/* Thumb */}
                          <div 
                            className="absolute h-3.5 w-3.5 bg-white border-2 border-rose-500 rounded-full top-1/2 -translate-y-1/2 shadow-md -translate-x-1/2 opacity-0 group-hover/progress:opacity-100 transition-opacity duration-150"
                            style={{ left: `${((currentTime[episode.episodeNumber] || 0) / (duration[episode.episodeNumber] || 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Placeholder loader when loading iframes */}
                    {!isActive && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 text-gray-400 gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
                        <p className="text-xs font-bold">Đang tải tập {episode.episodeNumber}...</p>
                      </div>
                    )}
                  </>
                ) : (
                  /* Obsidian Glassmorphism Paywall Overlay */
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl p-8 text-center space-y-6 z-25 border border-white/5">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/20 text-black">
                      <Lock className="h-7 w-7 text-gray-950" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-extrabold text-lg text-white">Tập phim này đã bị khóa</h3>
                      <p className="text-xs text-gray-400 max-w-xs leading-relaxed font-medium">
                        Phim này có {series.totalFreeEpisodes} tập đầu miễn phí. Tập {episode.episodeNumber} có giá mở khóa là:
                      </p>
                    </div>

                    <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 rounded-2xl shadow-sm">
                      <Coins className="h-5 w-5 text-amber-400" />
                      <span className="font-extrabold text-xl text-amber-400">{episode.tokenPrice}</span>
                      <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Tokens</span>
                    </div>

                    <button
                      onClick={() => handleUnlockEpisode(episode)}
                      disabled={unlockingId === episode.id}
                      className="w-full max-w-[240px] inline-flex items-center justify-center gap-2 py-3 bg-gradient-to-tr from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 disabled:opacity-50 text-gray-950 font-extrabold rounded-2xl text-xs shadow-lg shadow-amber-500/10 transition duration-300 cursor-pointer active:scale-95 select-none mt-2"
                    >
                      {unlockingId === episode.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-gray-950" />
                          Đang xử lý...
                        </>
                      ) : userBalance < episode.tokenPrice ? (
                        'Nạp thêm Tokens'
                      ) : (
                        'Mở Khóa Tập Phim'
                      )}
                    </button>
                    
                    <div className="text-[10px] font-bold text-gray-400 mt-3 bg-black/40 px-3 py-1.5 rounded-full border border-white/5 shadow-inner">
                      Số dư hiện tại: <span className="text-amber-400">{userBalance}</span> Tokens
                    </div>
                  </div>
                )}

                {/* Floating Bottom Information overlay */}
                <div className={`absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/60 to-transparent z-15 pointer-events-none space-y-2 transition-opacity duration-500 ${showUI ? 'opacity-100' : 'opacity-0'}`}>
                  <div className="flex items-center gap-2 pointer-events-auto">
                    <span className="bg-rose-500 text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-full shadow-md">
                      Tập {episode.episodeNumber}
                    </span>
                    {!episode.isFree && (
                      <span className="bg-amber-500 text-gray-950 font-extrabold text-[9px] px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-md">
                        <Coins className="h-2.5 w-2.5" /> Premium
                      </span>
                    )}
                  </div>
                  <h3 className="font-extrabold text-base text-white drop-shadow pointer-events-auto">
                    {series.title} - {episode.title || `Tập ${episode.episodeNumber}`}
                  </h3>
                  <p className="text-xs text-gray-300 line-clamp-2 leading-relaxed drop-shadow font-medium pointer-events-auto">
                    {series.description}
                  </p>
                </div>

{/* Right Side Interaction column */}
                <div className={`absolute right-4 bottom-24 flex flex-col gap-4 z-20 items-center transition-opacity duration-500 ${showUI ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                  
                  {/* Settings Menu */}
                  {(episode.videoSource === 'direct' || episode.videoSource === 'youtube') && (
                    <div className="relative pointer-events-auto">

                      <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="flex flex-col items-center gap-1 cursor-pointer group active:scale-90 transition select-none"
                      >
                        <div className="h-10 w-10 rounded-full flex items-center justify-center bg-black/60 backdrop-blur border border-white/10 shadow-lg text-white hover:bg-black/80">
                          <Settings className="h-4.5 w-4.5 group-hover:text-amber-400 transition-colors" />
                        </div>
                      </button>
                      
                      {showSettings && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowSettings(false)} />
                          <div className="absolute right-12 bottom-0 bg-black/90 backdrop-blur-md border border-white/10 rounded-xl p-3 w-48 text-white shadow-2xl flex flex-col gap-3 z-50">
                          
                          {/* Extra Tools */}
                          <div className="flex flex-col gap-1">
                            <button 
                              onClick={() => { handleToggleBookmark(); setShowSettings(false); }} 
                              className={`text-xs text-left px-2 py-1.5 rounded-md transition hover:bg-white/10 text-gray-300 flex items-center gap-2 ${isBookmarked ? 'text-rose-400 font-bold' : ''}`}
                            >
                              <Bookmark className="w-3.5 h-3.5"/> {isBookmarked ? 'Đã lưu phim' : 'Lưu phim'}
                            </button>
                            <button 
                              onClick={() => { setShowReportModal(true); setShowSettings(false); }} 
                              className="text-xs text-left px-2 py-1.5 rounded-md transition hover:bg-white/10 text-gray-300 flex items-center gap-2"
                            >
                              <AlertTriangle className="w-3.5 h-3.5"/> Báo lỗi video
                            </button>
                          </div>

                          {/* Quality Selection - Hide for YouTube as API is deprecated */}
                          {episode.videoSource !== 'youtube' && (
                            <div>
                              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 border-b border-white/10 pb-1">Chất lượng</div>
                              <div className="grid grid-cols-2 gap-1">
                                {['Auto', '1080p', '720p', '480p'].map(quality => (
                                  <button
                                    key={quality}
                                    onClick={() => {
                                      setShowSettings(false);
                                    }}
                                    className={`text-xs text-center px-1 py-1 rounded-md transition ${quality === 'Auto' ? 'bg-rose-500 text-white font-bold' : 'hover:bg-white/10 text-gray-300'}`}
                                  >
                                    {quality}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Playback Rate */}
                          <div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 border-b border-white/10 pb-1">Tốc độ phát</div>
                            <div className="grid grid-cols-4 gap-1">
                              {[0.5, 1, 1.5, 2].map(rate => (
                                <button
                                  key={rate}
                                  onClick={() => {
                                    setPlaybackRate(rate);
                                    if (episode.videoSource === 'direct') {
                                      Object.values(videoRefs.current).forEach(v => {
                                        if (v) v.playbackRate = rate;
                                      });
                                    } else if (episode.videoSource === 'youtube') {
                                      const iframe = iframeRefs.current[episode.episodeNumber];
                                      if (iframe && iframe.contentWindow) {
                                        // Youtube API uses setPlaybackRate
                                        iframe.contentWindow.postMessage(
                                          JSON.stringify({ event: 'command', func: 'setPlaybackRate', args: [rate, true] }), 
                                          'https://www.youtube.com'
                                        );
                                      }
                                    }
                                    setShowSettings(false);
                                  }}
                                  className={`text-[10px] text-center py-1 rounded-md transition ${playbackRate === rate ? 'bg-rose-500 text-white font-bold' : 'hover:bg-white/10 text-gray-300'}`}
                                >
                                  {rate === 1 ? '1x' : `${rate}x`}
                                </button>
                              ))}
                            </div>
                          </div>

                        </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Like Button */}
                  <button
                    onClick={handleLike}
                    className="flex flex-col items-center gap-1 cursor-pointer group active:scale-90 transition select-none"
                  >
                    <div className={`h-11 w-11 rounded-full flex items-center justify-center backdrop-blur border border-white/10 shadow-lg ${
                      isLiked ? 'bg-rose-500 text-white border-rose-500' : 'bg-black/60 text-white hover:bg-black/80'
                    }`}>
                      <Heart className={`h-4.5 w-4.5 ${isLiked ? 'fill-white' : 'group-hover:text-rose-400 transition-colors'}`} />
                    </div>
                    <span className="text-[9px] font-extrabold text-gray-300 drop-shadow">
                      {likeCount.toLocaleString()}
                    </span>
                  </button>

                  {/* Comment Button */}
                  <button
                    onClick={() => {
                      if (!series.feedPostId) {
                        alert('Phim chưa được xuất bản để có phần bình luận.');
                      } else {
                        setShowCommentDrawer(true);
                      }
                    }}
                    className="flex flex-col items-center gap-1 cursor-pointer group active:scale-90 transition select-none"
                  >
                    <div className="h-11 w-11 rounded-full flex items-center justify-center bg-black/60 backdrop-blur border border-white/10 shadow-lg text-white hover:bg-black/80">
                      <MessageSquare className="h-4.5 w-4.5 group-hover:text-rose-400 transition-colors" />
                    </div>
                    <span className="text-[9px] font-extrabold text-gray-300 drop-shadow">Bình luận</span>
                  </button>

                  {/* Info Button */}
                  <button
                    onClick={() => setShowInfoDrawer(true)}
                    className="flex flex-col items-center gap-1 cursor-pointer group active:scale-90 transition select-none"
                  >
                    <div className="h-11 w-11 rounded-full flex items-center justify-center bg-black/60 backdrop-blur border border-white/10 shadow-lg text-white hover:bg-black/80">
                      <Info className="h-4.5 w-4.5 group-hover:text-rose-400 transition-colors" />
                    </div>
                    <span className="text-[9px] font-extrabold text-gray-300 drop-shadow">Chi tiết</span>
                  </button>

                  {/* Fullscreen Button */}
                  <button
                    onClick={toggleFullscreen}
                    className="flex flex-col items-center gap-1 cursor-pointer group active:scale-90 transition select-none"
                  >
                    <div className="h-10 w-10 rounded-full flex items-center justify-center bg-black/60 backdrop-blur border border-white/10 shadow-lg text-white hover:bg-black/80">
                      <Maximize className="h-4.5 w-4.5 group-hover:text-amber-400 transition-colors" />
                    </div>
                    <span className="text-[9px] font-extrabold text-gray-300 drop-shadow">Phóng to</span>
                  </button>

                  {/* Episode List Drawer Button */}
                  <button
                    onClick={() => setShowDrawer(true)}
                    className="flex flex-col items-center gap-1 cursor-pointer group active:scale-90 transition select-none"
                  >
                    <div className="h-11 w-11 rounded-full flex items-center justify-center bg-black/60 backdrop-blur border border-white/10 shadow-lg text-white hover:bg-black/80">
                      <List className="h-4.5 w-4.5 group-hover:text-rose-400 transition-colors" />
                    </div>
                    <span className="text-[9px] font-extrabold text-gray-300 drop-shadow">Danh sách</span>
                  </button>

                  {/* Delete Button (Admin Only) */}
                  {isAdmin && (
                    <button
                      onClick={handleDeleteFilm}
                      className="flex flex-col items-center gap-1 cursor-pointer group active:scale-90 transition select-none"
                    >
                      <div className="h-10 w-10 rounded-full flex items-center justify-center bg-black/60 backdrop-blur border border-red-500/30 shadow-lg text-white hover:bg-red-500 hover:border-red-500">
                        <Trash2 className="h-4.5 w-4.5 group-hover:text-white text-red-400 transition-colors" />
                      </div>
                      <span className="text-[9px] font-extrabold text-red-400 drop-shadow">Xóa phim</span>
                    </button>
                  )}
                </div>
                
              </div>

            </div>
          );
        })}
      </div>

      {/* Slide-out Overlay Episode list Drawer */}
      {showDrawer && (
        <div className="absolute inset-0 z-50 flex justify-end transition-all duration-300 pointer-events-none">
          <div className="flex-1 pointer-events-auto" onClick={() => setShowDrawer(false)} />
          
          <div className="w-[320px] h-full bg-black/80 backdrop-blur-2xl border-l border-white/10 flex flex-col p-6 shadow-2xl animate-in slide-in-from-right duration-200 pointer-events-auto">
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
              <div>
                <h4 className="font-extrabold text-sm text-white line-clamp-1">{series.title}</h4>
                <p className="text-[10px] text-gray-400 font-bold">Danh sách tập phim</p>
              </div>
              <button
                onClick={() => setShowDrawer(false)}
                className="text-gray-400 hover:text-white font-extrabold text-xs cursor-pointer select-none bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-lg active:scale-95"
              >
                Đóng
              </button>
            </div>

            {/* Episode Grid Selector */}
            <div className="flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-4 gap-2.5">
                {episodes.map((ep) => {
                  const isActive = ep.episodeNumber === activeEpNumber;
                  const unlocked = isEpisodeUnlocked(ep);
                  return (
                    <button
                      key={ep.id}
                      onClick={() => scrollToEpisode(ep.episodeNumber)}
                      className={`h-11 rounded-lg font-extrabold text-xs border flex items-center justify-center transition active:scale-90 cursor-pointer relative ${
                        isActive
                          ? 'bg-gradient-to-tr from-rose-500 to-red-500 border-rose-500 text-white shadow-md shadow-rose-500/20'
                          : 'bg-white/5 border-white/5 hover:border-white/15 text-gray-300 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {ep.episodeNumber}
                      {!unlocked && (
                        <div className="absolute -top-1 -right-1 bg-amber-500 text-gray-950 p-0.5 rounded-full scale-75 border border-gray-900 shadow">
                          <Lock className="h-2 w-2" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="border-t border-white/5 pt-4 text-[10px] text-gray-500 text-center font-bold">
              Tổng số {episodes.length} tập phim
            </div>
          </div>
        </div>
      )}

      {/* Obsidian Comment Drawer */}
      {showCommentDrawer && (
        <div className="absolute inset-0 z-50 flex justify-end transition-all duration-300 pointer-events-none">
          <div className="flex-1 pointer-events-auto" onClick={() => setShowCommentDrawer(false)} />
          
          <div className="w-[420px] h-full bg-black/80 backdrop-blur-2xl border-l border-white/10 flex flex-col shadow-2xl pointer-events-auto animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <div>
                <h4 className="font-extrabold text-sm text-white">Bình luận phim</h4>
                <p className="text-[10px] text-gray-400 font-bold">Nhận xét từ iSocial</p>
              </div>
              <button
                onClick={() => setShowCommentDrawer(false)}
                className="h-8 w-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* List area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {commentsLoading ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-500 gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-pink-500" />
                  <span className="text-xs">Đang tải bình luận...</span>
                </div>
              ) : commentsList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                  <MessageSquare className="h-8 w-8 text-gray-700 mb-2" />
                  <span className="text-xs">Chưa có bình luận nào. Hãy là người đầu tiên!</span>
                </div>
              ) : (
                commentsList.map((cmt) => (
                  <div key={cmt.id} className="flex gap-3 text-sm">
                    <img 
                      src={cmt.user?.avatarUrl || '/avatars/default.png'} 
                      alt={cmt.user?.name || 'Khách'} 
                      className="h-8 w-8 rounded-full border border-white/10 object-cover" 
                    />
                    <div className="flex-1 bg-white/[0.03] border border-white/5 p-3 rounded-2xl">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs">{cmt.user?.name || 'Khách'}</span>
                        <span className="text-[10px] text-gray-500">
                          {new Date(cmt.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                      <p className="text-gray-300 text-xs mt-1.5 leading-relaxed">{cmt.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Comment Form */}
            <form onSubmit={handleAddComment} className="p-4 border-t border-white/5 bg-gray-900/50 flex gap-2">
              <input 
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="Viết bình luận công khai..."
                className="flex-1 bg-white/5 border border-white/10 focus:border-pink-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 outline-none transition"
              />
              <button
                type="submit"
                disabled={submittingComment || !commentInput.trim()}
                className="h-10 w-10 rounded-xl bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white flex items-center justify-center shadow-lg shadow-pink-500/10 active:scale-95 transition"
              >
                {submittingComment ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Film Info Drawer (Netflix/Apple TV Style) */}
      {showInfoDrawer && (
        <div className="absolute inset-0 z-50 flex justify-end transition-all duration-300 pointer-events-none">
          <div className="flex-1 pointer-events-auto bg-black/40 backdrop-blur-sm" onClick={() => setShowInfoDrawer(false)} />
          
          <div className="w-full md:w-[480px] h-full bg-[#08080c] flex flex-col shadow-2xl pointer-events-auto animate-in slide-in-from-right duration-300 overflow-y-auto overflow-x-hidden">
            {/* Cover Banner */}
            <div className="relative w-full h-64 md:h-72 shrink-0">
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${series.bannerUrl || series.coverUrl})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#08080c] via-[#08080c]/60 to-transparent" />
              
              <button
                onClick={() => setShowInfoDrawer(false)}
                className="absolute top-4 right-4 h-8 w-8 rounded-full flex items-center justify-center bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 text-white transition active:scale-95 z-10"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="absolute bottom-0 left-0 p-6 w-full">
                <h2 className="text-2xl md:text-3xl font-extrabold text-white drop-shadow-xl leading-tight">
                  {series.title}
                </h2>
              </div>
            </div>

            {/* Content Details */}
            <div className="p-6 space-y-6 flex-1">
              {/* Stats Row */}
              <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs font-bold text-gray-300">
                <span className="text-emerald-400 border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 rounded-md">
                  {series.totalEpisodes} Tập
                </span>
                {series.totalFreeEpisodes > 0 && (
                  <span className="text-rose-400">
                    Free {series.totalFreeEpisodes} Tập
                  </span>
                )}
                <span className="flex items-center gap-1"><Eye className="h-3 w-3"/> {series.viewCount.toLocaleString()}</span>
                <span className="flex items-center gap-1"><Heart className="h-3 w-3"/> {likeCount.toLocaleString()}</span>
              </div>

              {/* Tags & Genres */}
              <div className="flex flex-wrap gap-2">
                <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider font-extrabold">
                  {series.genre || 'Phim'}
                </span>
                {Array.isArray(series.tags) && (series.tags as string[]).map((tag, i) => (
                  <span key={i} className="text-[10px] bg-white/5 border border-white/10 px-2.5 py-1 rounded-full text-gray-300">
                    {tag}
                  </span>
                ))}
              </div>

              {/* Cast & Crew Info */}
              <div className="space-y-1 text-sm border-y border-white/10 py-4">
                <div className="grid grid-cols-[100px_1fr] gap-2">
                  <span className="text-gray-500 font-bold">Đạo diễn:</span>
                  <span className="text-gray-200">{series.director || 'AI'}</span>
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-2">
                  <span className="text-gray-500 font-bold">Diễn viên:</span>
                  <span className="text-gray-200">{series.cast || 'AI'}</span>
                </div>
                {series.releaseYear && (
                  <div className="grid grid-cols-[100px_1fr] gap-2">
                    <span className="text-gray-500 font-bold">Năm KH:</span>
                    <span className="text-gray-200">{series.releaseYear}</span>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Tóm Tắt Nội Dung</h3>
                <p className="text-sm text-gray-300 leading-relaxed font-medium whitespace-pre-wrap">
                  {series.description || 'Chưa có thông tin mô tả chi tiết cho bộ phim này.'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-auto">
                <button
                  onClick={() => {
                    setShowInfoDrawer(false);
                    setShowReportModal(true);
                  }}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors border border-white/10 text-sm font-bold"
                >
                  <AlertTriangle className="h-4 w-4" /> Báo cáo sự cố / Lỗi phim
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Obsidian Error Report Modal */}
      {showReportModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-3xl p-6 shadow-2xl relative animate-scale-up">
            <button
              onClick={() => setShowReportModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white bg-white/5 border border-white/10 p-1.5 rounded-full hover:scale-105 active:scale-95 transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-4">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              <div>
                <h3 className="font-extrabold text-sm text-white">Báo cáo sự cố</h3>
                <p className="text-[10px] text-gray-400 font-bold">Phản hồi lỗi để chúng tôi khắc phục</p>
              </div>
            </div>

            <form onSubmit={handleReportSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">Lý do sự cố</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 focus:border-amber-500 rounded-xl px-3 py-2.5 text-xs text-white outline-none transition"
                >
                  <option value="broken_video" className="bg-gray-900 text-white">Video bị hỏng (Không load được/Màn đen)</option>
                  <option value="wrong_content" className="bg-gray-900 text-white">Nội dung không đúng (Lộn tập/Sai phim)</option>
                  <option value="copyright" className="bg-gray-900 text-white">Vấn đề bản quyền</option>
                  <option value="other" className="bg-gray-900 text-white">Lý do khác</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">Mô tả chi tiết</label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Mô tả cụ thể sự cố để chúng tôi dễ dàng khắc phục (Ví dụ: Tập 2 bị lag từ giây thứ 15...)"
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 focus:border-amber-500 rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-600 outline-none transition resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 text-xs font-bold bg-white/5 border border-white/10 text-gray-400 rounded-xl hover:text-white transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport}
                  className="px-5 py-2 text-xs font-extrabold bg-gradient-to-tr from-amber-500 to-yellow-500 text-gray-950 rounded-xl shadow-lg shadow-amber-500/10 active:scale-95 transition flex items-center gap-1.5"
                >
                  {isSubmittingReport ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Đang gửi...
                    </>
                  ) : (
                    'Gửi báo cáo'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Share Modal */}
      <ShareFilmModal 
        series={series}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />

      {/* CSS Animation for Floating Hearts */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes floatUpAndFade {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-100px) scale(1.5); opacity: 0; }
        }
      `}} />

      {/* Floating Hearts Container */}
      {hearts.map(heart => (
        <Heart
          key={heart.id}
          className="fixed z-[100] text-pink-500 fill-pink-500 pointer-events-none"
          style={{
            left: heart.x - 12,
            top: heart.y - 12,
            animation: 'floatUpAndFade 1s ease-out forwards'
          }}
        />
      ))}
    </div>
  );
}
