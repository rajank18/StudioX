const fs = require('fs');
const path = require('path');
const { applyNoiseReduction, applyPreset, probeMetadata } = require('../services/noiseReductionService');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Process video with custom noise reduction settings
 */
const processCustom = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Video file is required (field name: video)' });
  }

  const inputPath = req.file.path;
  
  try {
    // Verify video has audio
    const metadata = await probeMetadata(inputPath);
    const hasAudio = metadata.streams.some(s => s.codec_type === 'audio');
    
    if (!hasAudio) {
      try { fs.unlinkSync(inputPath); } catch (e) {}
      return res.status(400).json({ error: 'No audio track found in video' });
    }

    // Parse custom settings
    let noiseReduction = 70;
    let voiceEnhancement = 70;

    try {
      if (req.body.noiseReduction !== undefined) {
        noiseReduction = parseFloat(req.body.noiseReduction);
        if (isNaN(noiseReduction)) noiseReduction = 70;
        noiseReduction = Math.max(0, Math.min(100, noiseReduction));
      }
      if (req.body.voiceEnhancement !== undefined) {
        voiceEnhancement = parseFloat(req.body.voiceEnhancement);
        if (isNaN(voiceEnhancement)) voiceEnhancement = 70;
        voiceEnhancement = Math.max(0, Math.min(100, voiceEnhancement));
      }
    } catch (e) {
      console.warn('[noiseReduction] Error parsing settings:', e);
    }

    console.log(`[noiseReduction] Processing with NR=${noiseReduction}, VE=${voiceEnhancement}`);

    // Process video
    const { publicUrl, filename } = await applyNoiseReduction(inputPath, noiseReduction, voiceEnhancement);

    // Remove input video after successful processing
    try { fs.unlinkSync(inputPath); } catch (e) {}

    return res.status(200).json({ 
      url: publicUrl, 
      filename,
      settings: {
        noiseReduction,
        voiceEnhancement
      }
    });
  } catch (err) {
    // Cleanup input on error
    try { fs.unlinkSync(inputPath); } catch (e) {}
    console.error('[noiseReduction] Processing error:', err);
    return res.status(500).json({ 
      error: 'Noise reduction failed', 
      details: String(err.message || err) 
    });
  }
});

/**
 * Process video with preset configuration
 */
const processPreset = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Video file is required (field name: video)' });
  }

  const inputPath = req.file.path;
  
  try {
    // Verify video has audio
    const metadata = await probeMetadata(inputPath);
    const hasAudio = metadata.streams.some(s => s.codec_type === 'audio');
    
    if (!hasAudio) {
      try { fs.unlinkSync(inputPath); } catch (e) {}
      return res.status(400).json({ error: 'No audio track found in video' });
    }

    // Get preset from request
    const preset = req.body.preset || 'balanced';
    const validPresets = ['light', 'balanced', 'aggressive', 'speech', 'podcast'];
    
    if (!validPresets.includes(preset)) {
      try { fs.unlinkSync(inputPath); } catch (e) {}
      return res.status(400).json({ 
        error: 'Invalid preset', 
        validPresets 
      });
    }

    console.log(`[noiseReduction] Processing with preset: ${preset}`);

    // Process video with preset
    const { publicUrl, filename } = await applyPreset(inputPath, preset);

    // Remove input video after successful processing
    try { fs.unlinkSync(inputPath); } catch (e) {}

    return res.status(200).json({ 
      url: publicUrl, 
      filename,
      preset
    });
  } catch (err) {
    // Cleanup input on error
    try { fs.unlinkSync(inputPath); } catch (e) {}
    console.error('[noiseReduction] Processing error:', err);
    return res.status(500).json({ 
      error: 'Noise reduction failed', 
      details: String(err.message || err) 
    });
  }
});

/**
 * Get available presets and their descriptions
 */
const getPresets = asyncHandler(async (req, res) => {
  const presets = {
    light: {
      name: 'Light',
      description: 'Subtle noise reduction for clean environments',
      noiseReduction: 40,
      voiceEnhancement: 40,
      useCases: ['Studio recordings', 'Quiet indoor spaces']
    },
    balanced: {
      name: 'Balanced',
      description: 'Moderate noise reduction for typical scenarios',
      noiseReduction: 70,
      voiceEnhancement: 70,
      useCases: ['General vlogs', 'Office recordings', 'Indoor events']
    },
    aggressive: {
      name: 'Aggressive',
      description: 'Maximum noise reduction for very noisy environments',
      noiseReduction: 90,
      voiceEnhancement: 90,
      useCases: ['Busy streets', 'Crowded places', 'Construction sites']
    },
    speech: {
      name: 'Speech Focus',
      description: 'Optimized for clear speech in moderate noise',
      noiseReduction: 75,
      voiceEnhancement: 85,
      useCases: ['Interviews', 'Presentations', 'Lectures']
    },
    podcast: {
      name: 'Podcast',
      description: 'Professional podcast audio quality',
      noiseReduction: 80,
      voiceEnhancement: 80,
      useCases: ['Podcast recordings', 'Voice-overs', 'Narration']
    }
  };

  return res.status(200).json({ presets });
});

module.exports = { 
  processCustom, 
  processPreset,
  getPresets 
};
