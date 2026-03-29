import {
  Download,
  Image as ImageIcon,
  Volume2,
  VolumeX,
  Layout,
  Crop,
  FileText,
  Type,
  Sparkles,
} from 'lucide-react';

export const TOOL_ITEMS = [
  {
    key: 'ai-subtitle-generator',
    title: 'AI Subtitle Generator',
    description: 'Generate captions instantly',
    path: '/tools/ai-subtitle-generator',
    category: 'ai',
    icon: Type,
  },
  {
    key: 'ai-video-summary',
    title: 'AI Video Summary',
    description: 'Quick content summaries',
    path: '/tools/ai-video-summary',
    category: 'ai',
    icon: FileText,
  },
  {
    key: 'video-enhancer',
    title: 'Video Enhancer',
    description: 'Denoise, upscale, and polish video',
    path: '/tools/video-enhancer',
    category: 'ai',
    icon: Sparkles,
  },
  {
    key: 'youtube',
    title: 'YouTube Downloader',
    description: 'Save videos for editing',
    path: '/tools/yt-downloader',
    category: 'basic',
    icon: Download,
  },
  {
    key: 'video-to-gif',
    title: 'Video to GIF',
    description: 'Create GIFs instantly',
    path: '/tools/video-to-gif',
    category: 'basic',
    icon: ImageIcon,
  },
  {
    key: 'noise-reduction',
    title: 'Noise Reduction',
    description: 'Crystal clear audio',
    path: '/tools/noise-reduction',
    category: 'basic',
    icon: Volume2,
  },
  {
    key: 'silence-remover',
    title: 'Remove Silence',
    description: 'Remove awkward pauses',
    path: '/tools/remove-silence',
    category: 'basic',
    icon: VolumeX,
  },
  {
    key: 'thumbnail-generator',
    title: 'Thumbnail Generator',
    description: 'Create thumbnails',
    path: '/tools/thumbnail-generator',
    category: 'basic',
    icon: Layout,
  },
  {
    key: 'crop-resize',
    title: 'Crop & Resize',
    description: 'Optimize for platforms',
    path: '/tools/crop-resize',
    category: 'basic',
    icon: Crop,
  },
];

export const DEFAULT_NEW_USER_FEATURE_KEYS = [
  'ai-subtitle-generator',
  'ai-video-summary',
  'youtube',
  'video-to-gif',
];

export const TOOL_BY_KEY = TOOL_ITEMS.reduce((accumulator, tool) => {
  accumulator[tool.key] = tool;
  return accumulator;
}, {});
