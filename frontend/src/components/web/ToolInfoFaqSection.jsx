import React from 'react';

const CONTENT_BY_TOOL = {
  'video-to-gif': {
    infoTitle: 'How it works',
    infoPoints: [
      'Upload a video file (MP4, WebM, MOV) or use a YouTube link.',
      'Choose the exact segment by dragging and resizing the timeline selection.',
      'Set GIF width to balance quality and file size.',
      'The server converts your selected segment using FFmpeg at optimized FPS.',
      'Preview the output GIF instantly before downloading.',
      'Generate another segment from the same video without re-uploading.'
    ],
    faq: [
      { q: 'What video formats are supported?', a: 'MP4, WebM, and MOV are supported for upload.' },
      { q: 'Why does conversion take time?', a: 'Longer clips and larger widths require more processing time on the server.' },
      { q: 'Can I make smaller GIF files?', a: 'Yes. Reduce duration and GIF width to significantly reduce file size.' },
      { q: 'Why is quality lower than video?', a: 'GIF format has limited colors and compression constraints compared to video.' },
      { q: 'Can I convert multiple segments?', a: 'Yes. Use Convert Another Segment after the first conversion completes.' }
    ]
  },
  'youtube-downloader': {
    infoTitle: 'How it works',
    infoPoints: [
      'Paste a valid YouTube URL and fetch available stream formats.',
      'Choose the quality option that matches your target output.',
      'The video is downloaded on the server and attached to your account activity.',
      'Use the download action to save the processed file locally.',
      'Higher quality videos may take longer depending on source size.',
      'You can reset and start another download anytime.'
    ],
    faq: [
      { q: 'Why are some qualities missing?', a: 'Available qualities depend on what the source video provides.' },
      { q: 'Does this require credits?', a: 'YouTube download is typically free in this app flow unless plan rules change.' },
      { q: 'Why did my download fail?', a: 'This can happen due to invalid links, source restrictions, or temporary rate limits.' },
      { q: 'Can I download very long videos?', a: 'Yes, but large files may take more time and storage.' },
      { q: 'Where can I find downloaded items later?', a: 'All processed outputs are listed in the Projects page.' }
    ]
  },
  'noise-reduction': {
    infoTitle: 'How it works',
    infoPoints: [
      'Upload a video and choose Preset mode for quick improvements.',
      'Use Custom mode to fine-tune noise reduction and voice enhancement.',
      'The model suppresses background sounds while preserving speech.',
      'A cleaned video is generated server-side for download and playback.',
      'Use Process Again to compare different settings quickly.',
      'Best results come from clear source audio and moderate settings.'
    ],
    faq: [
      { q: 'Which preset should I start with?', a: 'Balanced is best for most videos. Use Aggressive for very noisy scenes.' },
      { q: 'Can this remove all background noise?', a: 'It reduces most common noise but may not remove every artifact perfectly.' },
      { q: 'Will voices sound robotic?', a: 'Extreme settings can affect natural tone, so tune values carefully.' },
      { q: 'Can I process music-heavy videos?', a: 'Yes, but speech-focused settings may alter background music texture.' },
      { q: 'How can I compare versions?', a: 'Use the original vs processed preview panels before downloading.' }
    ]
  },
  'remove-silence': {
    infoTitle: 'How it works',
    infoPoints: [
      'Upload an audio file such as MP3, WAV, or M4A.',
      'Silence regions are detected based on configurable thresholds.',
      'Speech and non-silent parts are preserved in sequence.',
      'The processed output is exported and downloaded automatically.',
      'Great for podcasts, lectures, and narration cleanup.',
      'You can run again with a different file at any time.'
    ],
    faq: [
      { q: 'Will it cut words accidentally?', a: 'It is designed to preserve speech, but very low volume speech may be trimmed.' },
      { q: 'Can I use large audio files?', a: 'Yes, within backend upload size limits and available processing resources.' },
      { q: 'Is output always MP3?', a: 'Current flow typically returns MP3 for broad compatibility.' },
      { q: 'Can I control silence sensitivity?', a: 'Not in this page yet, but threshold controls can be added later.' },
      { q: 'Does it work for music tracks?', a: 'It is tuned for spoken content and may not be ideal for continuous music.' }
    ]
  },
  'thumbnail-generator': {
    infoTitle: 'How it works',
    infoPoints: [
      'Upload a video and extract key frames automatically.',
      'Select a frame that best represents your content.',
      'Add custom text, fonts, size, colors, and background styles.',
      'Fine-tune text placement with presets or custom coordinates.',
      'Preview changes before generating the final thumbnail.',
      'Download your final image for use on social or video platforms.'
    ],
    faq: [
      { q: 'How many frames are extracted?', a: 'The current flow extracts 10 candidate frames for selection.' },
      { q: 'Can I use custom fonts?', a: 'Built-in fonts are supported; custom font upload is not enabled yet.' },
      { q: 'What image format is generated?', a: 'Generated thumbnails are returned in a web-friendly image format.' },
      { q: 'Can I regenerate with new text only?', a: 'Yes, keep the selected frame and tweak text settings as needed.' },
      { q: 'Why does text look different from preview?', a: 'Rendering differences can occur between browser preview and server image engine.' }
    ]
  },
  'crop-resize': {
    infoTitle: 'How it works',
    infoPoints: [
      'Upload a video and load metadata for timeline controls.',
      'Trim the start and end range from the interactive timeline.',
      'Drag and resize the crop box directly on top of the video.',
      'Reset crop instantly if you want full-frame export again.',
      'Process the video to apply trim and crop in one run.',
      'Preview and download the final output from the result section.'
    ],
    faq: [
      { q: 'Does this keep aspect ratio?', a: 'Crop area is manual, so output ratio depends on your selected frame box.' },
      { q: 'Can I only trim without cropping?', a: 'Yes. Keep crop at full frame and only adjust timeline start/end.' },
      { q: 'Can I only crop without trimming?', a: 'Yes. Keep full timeline and modify crop box only.' },
      { q: 'Will quality drop after processing?', a: 'Minor quality changes can happen due to re-encoding.' },
      { q: 'Why is processing slow for long videos?', a: 'Long duration and high resolution increase FFmpeg processing time.' }
    ]
  },
  'ai-video-summary': {
    infoTitle: 'How it works',
    infoPoints: [
      'Upload a video file or paste a YouTube link.',
      'Fetch metadata first to verify title, duration, and source.',
      'Transcript is generated from captions or audio transcription fallback.',
      'The AI model produces a structured summary with key sections.',
      'Copy summary text or export it as a .txt file.',
      'Generated output appears in your Projects activity history.'
    ],
    faq: [
      { q: 'Why can summary fail for some videos?', a: 'Restricted videos, missing captions, or rate limits can block transcript retrieval.' },
      { q: 'Is transcript always accurate?', a: 'Accuracy depends on source audio quality and language clarity.' },
      { q: 'Can I summarize uploaded files too?', a: 'Yes, upload mode supports local video summary generation.' },
      { q: 'Can I edit the final summary?', a: 'You can copy the output and refine it manually.' },
      { q: 'Where do I find generated summaries later?', a: 'Check your Projects page for saved summary outputs.' }
    ]
  },
  'ai-subtitle-generator': {
    infoTitle: 'How it works',
    infoPoints: [
      'Upload a local video or provide a YouTube link.',
      'Fetch video info to confirm source details before processing.',
      'The system transcribes speech and generates subtitle timing.',
      'Subtitles are burned into the video and exported with .srt file.',
      'Preview the subtitled video directly in the page.',
      'Download both video and subtitle file for reuse.'
    ],
    faq: [
      { q: 'Which subtitle format is available?', a: 'The flow provides downloadable .srt alongside the subtitled video.' },
      { q: 'Can I edit subtitle text?', a: 'In-page editing is not yet available; edit the downloaded .srt file externally.' },
      { q: 'Does it support multiple languages?', a: 'Language support depends on transcription model capabilities and source content.' },
      { q: 'Why are some lines slightly delayed?', a: 'Auto timing may vary based on speech pace and audio complexity.' },
      { q: 'Can I regenerate subtitles for the same video?', a: 'Yes, rerun generation any time with the same source.' }
    ]
  },
  'video-enhancer': {
    infoTitle: 'How it works',
    infoPoints: [
      'Upload a source video from your device.',
      'The pipeline denoises visual noise and compression artifacts.',
      'Upscaling uses Lanczos resampling for sharper detail preservation.',
      'Sharpen and color boost stages improve texture and perceived clarity.',
      'Optional FPS smoothing can improve motion continuity.',
      'Final output is encoded with high-quality settings for delivery.'
    ],
    faq: [
      { q: 'Is FPS smoothing required?', a: 'No. It is optional and useful mainly for low-FPS or jittery sources.' },
      { q: 'Will enhancement increase file size?', a: 'Often yes, especially with upscale and high-quality encoding.' },
      { q: 'Can this fix very blurry footage?', a: 'It improves many cases, but heavily damaged input has limits.' },
      { q: 'Why does high-quality encoding take longer?', a: 'More compute is needed for denoise, upscale, and quality-preserving encode steps.' },
      { q: 'Can I process 4K input?', a: 'Support depends on backend limits and available server resources.' }
    ]
  },
  'ai-reel-cutter': {
    infoTitle: 'How it works',
    infoPoints: [
      'Choose exactly one source: YouTube URL or uploaded video file.',
      'Configure reel count, duration range, resolution, and caption settings.',
      'The backend generates a job id and validates upstream service health.',
      'Progress events are streamed in real-time with stage labels.',
      'When complete, all generated reels are packaged as a ZIP.',
      'Download the ZIP directly from the result panel or access it later from Projects.'
    ],
    faq: [
      { q: 'Can I provide both YouTube URL and file?', a: 'No. Exactly one input source is required for each job.' },
      { q: 'What happens if progress streaming disconnects?', a: 'The app automatically reconnects and falls back to status polling if needed.' },
      { q: 'How many reels can I generate in one run?', a: 'You can set reel count in advanced options; default is 5.' },
      { q: 'Why did I get a validation error?', a: 'Common causes are invalid input combinations or min_duration greater than max_duration.' },
      { q: 'What format do I download?', a: 'Outputs are bundled into a ZIP file for convenient download.' }
    ]
  },
  'video-compressor': {
    infoTitle: 'How it works',
    infoPoints: [
      'Upload a video and run pre-analysis to detect resolution, bitrate, and duration.',
      'Choose your target compression percentage based on the size reduction you need.',
      'A quality-first strategy is selected automatically from your target reduction.',
      'FFmpeg encodes with tuned bitrate, CRF, and profile settings for visual quality retention.',
      'Live progress updates show each compression job until output is ready.',
      'Preview the optimized output and download it with saved size percentage details.'
    ],
    faq: [
      { q: 'Will quality always stay exactly the same?', a: 'Compression is visually optimized to preserve quality, but tiny differences can still occur depending on source content.' },
      { q: 'What compression range can I use?', a: 'The slider supports 30% to 90% reduction targets, with 70% as the default.' },
      { q: 'Why does saved size differ from target percent?', a: 'Actual output depends on motion complexity, original codec efficiency, and audio/video bitrate balance.' },
      { q: 'Can I compress very large videos?', a: 'Yes, within upload limits and available server processing resources.' },
      { q: 'Where can I find compressed videos later?', a: 'Compressed outputs are saved to your Projects page for preview and download.' }
    ]
  }
};

const FALLBACK_CONTENT = {
  infoTitle: 'How it works',
  infoPoints: [
    'Upload your source media.',
    'Configure the available processing options.',
    'Run processing on the server.',
    'Preview and download the result.'
  ],
  faq: [
    { q: 'What formats are supported?', a: 'Supported formats depend on the specific tool and backend capabilities.' },
    { q: 'Where are outputs saved?', a: 'Processed outputs are attached to your account and visible in Projects.' }
  ]
};

const ToolInfoFaqSection = ({ toolKey }) => {
  const content = CONTENT_BY_TOOL[toolKey] || FALLBACK_CONTENT;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-3">{content.infoTitle}</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          {content.infoPoints.map((point, index) => (
            <li key={`${toolKey}-info-${index}`}>• {point}</li>
          ))}
        </ul>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-3">FAQ</h3>
        <div className="space-y-3">
          {content.faq.map((item, index) => (
            <div key={`${toolKey}-faq-${index}`} className="rounded-lg border border-gray-200 p-3">
              <p className="text-sm font-semibold text-gray-900">{item.q}</p>
              <p className="text-sm text-gray-600 mt-1">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ToolInfoFaqSection;