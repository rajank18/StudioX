import React, { useMemo, useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import {
  FileText,
  Loader,
  Copy,
  Download,
  CheckCircle,
  AlertCircle,
  Link as LinkIcon,
  Upload,
  Clock3,
  Tv,
  Sparkles,
  Zap,
  Layers,
  CheckCircle2,
  Navigation,
  Brain,
  Music,
  Cpu,
  ShieldAlert,
  MessageSquare,
  Users,
  Target,
  TrendingUp,
  Bookmark,
  Check,
} from 'lucide-react';
import ToolInfoFaqSection from '../../components/web/ToolInfoFaqSection';
import { useCredits } from '../../context/CreditContext';
import CreditStatusCard from '../../components/web/CreditStatusCard';
import { getAiServiceCreditLabel } from '../../config/creditCosts';
import { API_BASE_URL } from '../../config/api';

const AiVideoSummary = () => {
  const { getToken } = useAuth();
  const { user } = useUser();
  const { credits, isLoadingCredits, refreshCredits } = useCredits();

  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [uploadedVideoFile, setUploadedVideoFile] = useState(null);
  const [isFetchingInfo, setIsFetchingInfo] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [videoInfo, setVideoInfo] = useState(null);
  const [summaryData, setSummaryData] = useState(null);

  const isBusy = isFetchingInfo || isGenerating;

  const validateYouTubeUrl = (url) => {
    const patterns = [
      /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/,
      /^https?:\/\/(www\.)?youtube\.com\/embed\//,
      /^https?:\/\/(www\.)?youtube\.com\/shorts\//,
    ];

    return patterns.some((pattern) => pattern.test(url));
  };

  const authHeaders = async () => {
    const token = await getToken();
    const userId = user?.id || '';
    const userEmail = user?.emailAddresses?.[0]?.emailAddress || '';

    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'X-User-Id': userId,
      'X-User-Email': userEmail,
    };
  };

  const handleFetchVideoInfo = async () => {
    const trimmedUrl = youtubeUrl.trim();
    const isFileMode = Boolean(uploadedVideoFile);

    if (!isFileMode && !trimmedUrl) {
      setError('Please enter a YouTube URL or choose a video file');
      return;
    }

    if (!isFileMode && !validateYouTubeUrl(trimmedUrl)) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    setError('');
    setSummaryData(null);
    setVideoInfo(null);
    setIsFetchingInfo(true);

    try {
      let response;

      if (isFileMode) {
        const formData = new FormData();
        formData.append('video', uploadedVideoFile);

        const token = await getToken();
        const userId = user?.id || '';
        const userEmail = user?.emailAddresses?.[0]?.emailAddress || '';

        response = await fetch(`${API_BASE_URL}/api/ai-video-summary/upload/info`, {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'X-User-Id': userId,
            'X-User-Email': userEmail,
          },
          body: formData,
        });
      } else {
        response = await fetch(`${API_BASE_URL}/api/ai-video-summary/youtube/info`, {
          method: 'POST',
          headers: await authHeaders(),
          body: JSON.stringify({ url: trimmedUrl }),
        });
      }

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized. Please sign in again and retry.');
        }
        throw new Error(result.error || 'Failed to fetch video info');
      }

      setVideoInfo(result.data);
    } catch (err) {
      setError(err.message || 'Unable to fetch video info right now');
    } finally {
      setIsFetchingInfo(false);
    }
  };

  const handleGenerateSummary = async () => {
    const trimmedUrl = youtubeUrl.trim();
    const isFileMode = Boolean(uploadedVideoFile);

    if (!videoInfo) {
      setError('Please fetch video info first');
      return;
    }

    setError('');
    setSummaryData(null);
    setIsGenerating(true);

    try {
      let response;

      if (isFileMode) {
        const formData = new FormData();
        formData.append('video', uploadedVideoFile);

        const token = await getToken();
        const userId = user?.id || '';
        const userEmail = user?.emailAddresses?.[0]?.emailAddress || '';

        response = await fetch(`${API_BASE_URL}/api/ai-video-summary/upload`, {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'X-User-Id': userId,
            'X-User-Email': userEmail,
          },
          body: formData,
        });
      } else {
        response = await fetch(`${API_BASE_URL}/api/ai-video-summary/youtube`, {
          method: 'POST',
          headers: await authHeaders(),
          body: JSON.stringify({ url: trimmedUrl }),
        });
      }

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized. Please sign in again and retry.');
        }
        throw new Error(result.error || 'Failed to generate summary');
      }

      setSummaryData(result.data);
      await refreshCredits();
    } catch (err) {
      setError(err.message || 'Unable to generate summary right now');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCancel = () => {
    setYoutubeUrl('');
    setUploadedVideoFile(null);
    setVideoInfo(null);
    setSummaryData(null);
    setError('');
  };

  const cleanedSummary = useMemo(() => {
    if (!summaryData?.summary) return '';

    return summaryData.summary
      .replace(/\*\*/g, '')
      .replace(/^#{1,6}\s*/gm, '')
      .replace(/^\s*TL\s*;?\s*DR\s*:?\s*$/gim, 'One-line Summary')
      .replace(/^[-]{3,}\s*$/gm, '')
      .replace(/^\s*[-*]\s+/gm, '• ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }, [summaryData]);

  const formattedLines = useMemo(() => {
    if (!cleanedSummary) return [];

    return cleanedSummary.split('\n').map((line) => line.trim()).filter(Boolean);
  }, [cleanedSummary]);

  const handleCopy = async () => {
    if (!cleanedSummary) return;

    await navigator.clipboard.writeText(cleanedSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownloadTxt = () => {
    if (!cleanedSummary) return;

    const fileContent = [
      'AI Video Summary',
      '================',
      `Title: ${summaryData?.video?.title || 'N/A'}`,
      `Duration: ${summaryData?.video?.duration || 'N/A'}`,
      `Channel: ${summaryData?.video?.channel || 'N/A'}`,
      '',
      cleanedSummary,
    ].join('\n');

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `video-summary-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const isHeading = (line) => /^(summary|one-line summary|tldr|tl;dr|key points|actionable takeaways)\s*:?$/i.test(line);

  const parsedSummary = useMemo(() => {
    if (!cleanedSummary) return null;

    const lines = cleanedSummary.split('\n').map((l) => l.trim());
    let currentSection = 'summary';

    const sections = {
      summary: [],
      oneLine: [],
      keyPoints: [],
      takeaways: [],
    };

    const isSummaryHeading = (l) => /^(summary|executive summary)\s*:?$/i.test(l);
    const isOneLineHeading = (l) => /^(one-line summary|one line summary|tldr|tl;dr|quick summary)\s*:?$/i.test(l);
    const isKeyPointsHeading = (l) => /^(key points|key takeaways|key highlights|highlights|core points)\s*:?$/i.test(l);
    const isTakeawaysHeading = (l) => /^(actionable takeaways|action items|next steps|actions|takeaways)\s*:?$/i.test(l);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      if (isSummaryHeading(line)) {
        currentSection = 'summary';
        continue;
      }
      if (isOneLineHeading(line)) {
        currentSection = 'oneLine';
        continue;
      }
      if (isKeyPointsHeading(line)) {
        currentSection = 'keyPoints';
        continue;
      }
      if (isTakeawaysHeading(line)) {
        currentSection = 'takeaways';
        continue;
      }

      if (currentSection === 'summary') {
        sections.summary.push(line);
      } else if (currentSection === 'oneLine') {
        sections.oneLine.push(line);
      } else if (currentSection === 'keyPoints') {
        const clean = line.replace(/^[•\-\*\d\.\)\s]+/, '').trim();
        if (clean) sections.keyPoints.push(clean);
      } else if (currentSection === 'takeaways') {
        const clean = line.replace(/^[•\-\*\d\.\)\s]+/, '').trim();
        if (clean) sections.takeaways.push(clean);
      }
    }

    const executiveSummary = sections.summary.join('\n\n').trim();
    const oneLineSummary = sections.oneLine.join(' ').replace(/^["'“”]|["'“”]$/g, '').trim();

    return {
      executiveSummary,
      oneLineSummary,
      keyPoints: sections.keyPoints,
      actionableTakeaways: sections.takeaways,
      hasStructuredSections: Boolean(
        executiveSummary || oneLineSummary || sections.keyPoints.length || sections.takeaways.length
      ),
    };
  }, [cleanedSummary]);

  const parseItemTitleAndBody = (item) => {
    if (!item) return { title: '', body: '' };

    const separatorMatch = item.match(/^([^:\-–—]{3,35})[:\-–—]\s*(.+)$/);
    if (separatorMatch) {
      return {
        title: separatorMatch[1].trim(),
        body: separatorMatch[2].trim(),
      };
    }

    if (item.length <= 35) {
      return { title: item, body: item };
    }

    const words = item.split(/\s+/);
    const titleWords = [];
    let charLen = 0;
    for (const w of words) {
      if (charLen + w.length > 26 && titleWords.length >= 2) break;
      titleWords.push(w);
      charLen += w.length + 1;
      if (titleWords.length >= 4) break;
    }

    const title = titleWords.join(' ').replace(/[,;:.!?]$/, '');
    return { title, body: item };
  };

  const getContextualIcon = (text) => {
    const t = String(text || '').toLowerCase();
    if (/drive|car|travel|road|journey|trip|flight|route/.test(t)) return Navigation;
    if (/thought|mind|feel|memory|think|idea|creative/.test(t)) return Brain;
    if (/music|song|audio|sound|listen|track|playlist/.test(t)) return Music;
    if (/science|dna|tech|bio|code|system|data|device|research/.test(t)) return Cpu;
    if (/threat|danger|risk|safe|guard|alert|attack|warn/.test(t)) return ShieldAlert;
    if (/talk|discuss|chat|speech|interview|dialogue|message/.test(t)) return MessageSquare;
    if (/friend|people|neighbor|team|user|partner|crowd/.test(t)) return Users;
    if (/time|day|future|history|moment|schedule|deadline/.test(t)) return Clock;
    if (/goal|plan|target|strategy|focus|execute/.test(t)) return Target;
    if (/growth|increase|lead|scale|improve|success/.test(t)) return TrendingUp;
    return Bookmark;
  };

  const wordCount = useMemo(() => {
    if (!cleanedSummary) return 0;
    return cleanedSummary.split(/\s+/).filter(Boolean).length;
  }, [cleanedSummary]);

  const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="text-center md:text-left space-y-2 flex-1">
          <div className="flex justify-center md:justify-start mb-4">
            <div className="p-3 bg-orange-50 rounded-full">
              <FileText className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">AI Video Summary</h1>
          <p className="text-gray-600">Paste YouTube link → Fetch Video Info → Generate Summary</p>
          <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
            {getAiServiceCreditLabel('ai-video-summary')}
          </span>
        </div>
        <CreditStatusCard credits={credits} isLoading={isLoadingCredits} className="self-center md:self-start min-w-[170px]" />
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 space-y-6">
        <div className="space-y-2">
          <label htmlFor="local-video" className="block text-sm font-medium text-gray-700">Select Video File</label>

          <label
            htmlFor="local-video"
            className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary hover:bg-gray-100 transition-colors"
          >
            <input
              id="local-video"
              type="file"
              accept="video/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setUploadedVideoFile(file);
                if (file) {
                  setYoutubeUrl('');
                  setError('');
                }
              }}
              className="hidden"
              disabled={isBusy}
            />
            <div className="text-center">
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">
                {uploadedVideoFile ? uploadedVideoFile.name : 'Click to upload a video file'}
              </p>
              <p className="text-xs text-gray-500">MP4, WebM, MOV supported • Max 500MB</p>
            </div>
          </label>
        </div>

        <div className="mt-3">
          <label htmlFor="youtube-link" className="block text-sm font-medium text-gray-700">
            Or paste a YouTube link
          </label>
          <div className="mt-2">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <LinkIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="youtube-link"
                type="url"
                value={youtubeUrl}
                onChange={(e) => {
                  setYoutubeUrl(e.target.value);
                  if (e.target.value.trim()) setUploadedVideoFile(null);
                }}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full pl-10 pr-4 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors text-gray-900 placeholder:text-gray-400"
                disabled={isBusy}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={handleFetchVideoInfo}
            disabled={isBusy || (!youtubeUrl.trim() && !uploadedVideoFile)}
            className="flex-1 btn-primary px-4 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            type="button"
          >
            {isFetchingInfo ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>Fetching Video Info...</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span>Upload</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isBusy}
            className="btn-outline-primary px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </div>

      {videoInfo && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 overflow-hidden">
          <div className="flex flex-col md:flex-row gap-4 items-start">
            {videoInfo.thumbnail && (
              <img
                src={videoInfo.thumbnail}
                alt={videoInfo.title || 'Video thumbnail'}
                className="w-full md:w-64 max-h-56 object-contain md:object-cover rounded-lg border border-gray-200 shrink-0 bg-black/40"
              />
            )}
            <div className="space-y-2 flex-1 min-w-0 w-full">
              <h2 className="text-lg font-semibold text-gray-900 break-words [overflow-wrap:anywhere] leading-snug">
                {videoInfo.title || 'Untitled video'}
              </h2>
              <div className="text-sm text-gray-600 space-y-1">
                <div className="flex items-center gap-2">
                  <Clock3 className="w-4 h-4 text-gray-500 shrink-0" />
                  <span>Duration: {videoInfo.duration || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Tv className="w-4 h-4 text-gray-500 shrink-0" />
                  <span className="break-words [overflow-wrap:anywhere]">Channel: {videoInfo.channel || 'N/A'}</span>
                </div>
              </div>
              <button
                onClick={handleGenerateSummary}
                disabled={isBusy}
                className="mt-3 btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                type="button"
              >
                {isGenerating ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Generating Summary...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    <span>Generate Summary</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {cleanedSummary && (
        <div className="bg-[linear-gradient(160deg,#18202d_0%,#111622_100%)] border border-[#2b3548] rounded-2xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)] space-y-7">
          {/* 1. RESULT HEADER */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#252f42]">
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/25">
                  <Sparkles className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                  AI Video Summary
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Analysis complete
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
                {summaryData?.video?.title || uploadedVideoFile?.name || 'Summary Result'}
              </h2>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={handleCopy}
                className="px-4 py-2.5 rounded-xl border border-[#2b3548] bg-[#161d2a] hover:bg-[#1f2838] hover:border-orange-500/40 text-gray-200 transition-all flex items-center gap-2 text-sm font-medium shadow-sm hover:shadow-md cursor-pointer"
                type="button"
                title="Copy full summary"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-orange-400" />}
                <span className={copied ? 'text-emerald-400 font-semibold' : ''}>{copied ? 'Copied!' : 'Copy Summary'}</span>
              </button>
              <button
                onClick={handleDownloadTxt}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white transition-all flex items-center gap-2 text-sm font-semibold shadow-md hover:shadow-orange-500/25 cursor-pointer"
                type="button"
                title="Download text file"
              >
                <Download className="w-4 h-4" />
                <span>Download .txt</span>
              </button>
            </div>
          </div>

          {/* Structured or Fallback Rendering */}
          {parsedSummary?.hasStructuredSections ? (
            <div className="space-y-6">
              {/* 2. EXECUTIVE SUMMARY — HERO CARD */}
              {parsedSummary.executiveSummary && (
                <div className="bg-[linear-gradient(155deg,#1b2332_0%,#131924_100%)] border border-[#2e3a50] hover:border-orange-500/40 rounded-2xl p-6 sm:p-7 shadow-[0_12px_30px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06)] relative overflow-hidden transition-all duration-300 group">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-amber-400 to-transparent" />
                  
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold tracking-wide uppercase text-white/95">
                      Executive Summary
                    </h3>
                  </div>

                  <p className="text-[15px] sm:text-base leading-relaxed sm:leading-7 text-gray-200/90 whitespace-pre-line font-normal">
                    {parsedSummary.executiveSummary}
                  </p>

                  <div className="mt-5 pt-4 border-t border-[#232c3d] flex flex-wrap items-center gap-3 text-xs text-gray-400">
                    {summaryData?.video?.duration && (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#161d2a] border border-[#263143]">
                        <Clock3 className="w-3.5 h-3.5 text-orange-400" />
                        Duration: {summaryData.video.duration}
                      </span>
                    )}
                    {summaryData?.video?.channel && (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#161d2a] border border-[#263143]">
                        <Tv className="w-3.5 h-3.5 text-orange-400" />
                        {summaryData.video.channel}
                      </span>
                    )}
                    <span className="px-2.5 py-1 rounded-md bg-[#161d2a] border border-[#263143]">
                      {wordCount} words • ~{readTimeMinutes} min read
                    </span>
                  </div>
                </div>
              )}

              {/* 3. ONE-LINE SUMMARY — QUOTE CARD */}
              {parsedSummary.oneLineSummary && (
                <div className="bg-[linear-gradient(145deg,rgba(255,145,76,0.06)_0%,rgba(19,25,36,0.95)_100%)] border border-orange-500/30 rounded-2xl p-6 relative overflow-hidden transition-all duration-200">
                  <div className="flex items-center gap-2 mb-3 text-amber-400">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span className="text-xs uppercase tracking-wider font-bold">One-line Summary</span>
                  </div>
                  <blockquote className="text-lg sm:text-xl font-medium text-white/95 italic leading-relaxed sm:leading-8 pl-1">
                    “{parsedSummary.oneLineSummary}”
                  </blockquote>
                </div>
              )}

              {/* 4. KEY POINTS — RESPONSIVE MINI-CARDS */}
              {parsedSummary.keyPoints.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                        <Layers className="w-4 h-4" />
                      </div>
                      <h3 className="text-base sm:text-lg font-semibold text-white tracking-wide uppercase">
                        Key Points
                      </h3>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                      {parsedSummary.keyPoints.length} Points
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {parsedSummary.keyPoints.map((point, idx) => {
                      const { title, body } = parseItemTitleAndBody(point);
                      const IconComponent = getContextualIcon(point);
                      return (
                        <div
                          key={`kp-${idx}`}
                          className="bg-[#151c28]/90 border border-[#273244] hover:border-orange-500/50 hover:-translate-y-0.5 rounded-xl p-5 transition-all duration-200 shadow-sm hover:shadow-[0_8px_20px_rgba(0,0,0,0.35)] flex flex-col justify-between group"
                        >
                          <div>
                            <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 group-hover:bg-orange-500/20 transition-colors mb-3">
                              <IconComponent className="w-4 h-4" />
                            </div>
                            <h4 className="text-sm sm:text-base font-semibold text-white/95 mb-1.5 group-hover:text-orange-300 transition-colors line-clamp-2">
                              {title}
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-300/80 leading-relaxed">
                              {body}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 5. ACTIONABLE TAKEAWAYS — NUMBERED TIMELINE / CHECKLIST */}
              {parsedSummary.actionableTakeaways.length > 0 && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <h3 className="text-base sm:text-lg font-semibold text-white tracking-wide uppercase">
                        Actionable Takeaways
                      </h3>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {parsedSummary.actionableTakeaways.length} Actions
                    </span>
                  </div>

                  <div className="space-y-3">
                    {parsedSummary.actionableTakeaways.map((takeaway, idx) => {
                      const { title, body } = parseItemTitleAndBody(takeaway);
                      const stepNum = String(idx + 1).padStart(2, '0');
                      return (
                        <div
                          key={`at-${idx}`}
                          className="bg-[#151c28]/90 border border-[#273244] hover:border-emerald-500/40 rounded-xl p-4 sm:p-5 transition-all duration-200 flex items-start gap-4 group"
                        >
                          <div className="text-sm sm:text-base font-mono font-bold text-orange-400/90 bg-orange-500/10 border border-orange-500/20 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                            {stepNum}
                          </div>
                          <div className="space-y-1 flex-1 min-w-0">
                            <h4 className="text-sm sm:text-base font-semibold text-white/95 group-hover:text-emerald-300 transition-colors">
                              {title}
                            </h4>
                            {body && body !== title && (
                              <p className="text-xs sm:text-sm text-gray-300/80 leading-relaxed">
                                {body}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Fallback for unstructured text */
            <div className="rounded-xl border border-[#273244] bg-[#151c28]/90 p-6 space-y-3">
              {formattedLines.map((line, idx) => (
                <p
                  key={`${line}-${idx}`}
                  className={isHeading(line) ? 'text-base font-semibold text-orange-400 mt-4 first:mt-0 uppercase tracking-wide' : 'text-[15px] leading-relaxed text-gray-200'}
                >
                  {line}
                </p>
              ))}
            </div>
          )}

          {/* 6. AI INSIGHTS / METADATA FOOTER */}
          {(summaryData?.model || summaryData?.transcriptSource || summaryData?.video?.duration) && (
            <div className="pt-5 border-t border-[#232c3d] flex flex-wrap items-center justify-between gap-3 text-xs text-gray-400">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>AI Model: <strong className="text-gray-300 font-semibold">{summaryData.model ? 'Nemotron 120B' : 'Advanced LLM'}</strong></span>
                {summaryData?.transcriptSource && (
                  <span className="ml-2 pl-2 border-l border-gray-700">
                    Audio Engine: <strong className="text-gray-300 font-semibold">{summaryData.transcriptSource === 'assemblyai' ? 'AssemblyAI Universal' : summaryData.transcriptSource}</strong>
                  </span>
                )}
              </div>
              <div className="text-gray-500 text-xs">
                StudioX AI Video Intelligence
              </div>
            </div>
          )}
        </div>
      )}

      <ToolInfoFaqSection toolKey="ai-video-summary" />
    </div>
  );
};

export default AiVideoSummary;
