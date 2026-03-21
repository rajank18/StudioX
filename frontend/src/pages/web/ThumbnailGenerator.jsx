import React, { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { Upload, Image, Type, Download, Loader, AlertCircle, Check } from 'lucide-react';
import FeatureGuide from '../../components/web/FeatureGuide';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const ThumbnailGenerator = () => {
  const { getToken } = useAuth();

  // State
  const [videoFile, setVideoFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [frames, setFrames] = useState([]);
  const [selectedFrame, setSelectedFrame] = useState(null);
  const [text, setText] = useState('');
  const [textOptions, setTextOptions] = useState({
    fontSize: 48,
    fontColor: 'white',
    position: 'bottom',
    fontFamily: 'Arial',
    showBackground: true,
    backgroundColor: 'black',
    backgroundOpacity: 0.7,
    customPosition: false,
    xPosition: 50, // percentage
    yPosition: 80, // percentage
  });
  const [generatedThumbnail, setGeneratedThumbnail] = useState(null);
  const [processing, setProcessing] = useState(false);

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideoFile(file);
      setError('');
      setFrames([]);
      setSessionId(null);
      setSelectedFrame(null);
      setGeneratedThumbnail(null);
    }
  };

  // Extract frames from video
  const handleExtractFrames = async () => {
    if (!videoFile) {
      setError('Please select a video file first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('frameCount', '10');

      const response = await fetch(`${API_BASE_URL}/api/thumbnail/extract`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract frames');
      }

      setSessionId(data.sessionId);
      setFrames(data.frames);
    } catch (err) {
      console.error('Extract frames error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Add text to selected frame
  const handleGenerateThumbnail = async () => {
    if (!selectedFrame) {
      setError('Please select a frame first');
      return;
    }

    if (!text.trim()) {
      setError('Please enter some text for the thumbnail');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const token = await getToken();
      
      // Calculate actual pixel positions if using custom position
      let xPos = null;
      let yPos = null;
      
      if (textOptions.customPosition && selectedFrame) {
        // Assuming frame dimensions (you can get these from frame metadata)
        const frameWidth = 1280; // Default, should be from frame metadata
        const frameHeight = 720;
        xPos = Math.round((textOptions.xPosition / 100) * frameWidth);
        yPos = Math.round((textOptions.yPosition / 100) * frameHeight);
      }
      
      const response = await fetch(`${API_BASE_URL}/api/thumbnail/add-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId,
          frameName: selectedFrame.name,
          text,
          fontSize: textOptions.fontSize,
          fontColor: textOptions.fontColor,
          position: textOptions.customPosition ? 'custom' : textOptions.position,
          fontFamily: textOptions.fontFamily,
          showBackground: textOptions.showBackground,
          backgroundColor: textOptions.backgroundColor,
          backgroundOpacity: textOptions.backgroundOpacity,
          xPosition: xPos,
          yPosition: yPos,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add text');
      }

      setGeneratedThumbnail(data.thumbnail);
    } catch (err) {
      console.error('Add text error:', err);
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  // Download thumbnail
  const handleDownload = () => {
    if (!generatedThumbnail) return;
    
    const link = document.createElement('a');
    link.href = `${API_BASE_URL}${generatedThumbnail.url}`;
    link.download = generatedThumbnail.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-orange-50 rounded-full">
            <Image className="w-8 h-8 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Thumbnail Generator</h1>
        <p className="text-gray-600">
          Extract frames from your video and create custom thumbnails with text overlays
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span className="text-red-700">{error}</span>
        </motion.div>
      )}

      {/* Upload Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-lg border border-gray-200 p-8"
      >
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-gray-900">
          <Upload className="w-6 h-6 text-primary" />
          Step 1: Upload Video
        </h2>

        <div className="space-y-4">
          <label className="block">
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-primary transition-colors">
              <input
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="hidden"
              />
              {videoFile ? (
                <div>
                  <Check className="w-10 h-10 text-green-500 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-900">{videoFile.name}</p>
                  <p className="text-xs text-gray-500 mt-1">Click to change video</p>
                </div>
              ) : (
                <div>
                  <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-900">Click to select a video file</p>
                  <p className="text-xs text-gray-500 mt-1">Supports MP4, MOV, AVI, WEBM</p>
                </div>
              )}
            </div>
          </label>

          <button
            onClick={handleExtractFrames}
            disabled={!videoFile || loading}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>Extracting Frames...</span>
              </>
            ) : (
              <>
                <Image className="w-5 h-5" />
                <span>Extract Frames</span>
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* Frame Selection Section */}
      {frames.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg border border-gray-200 p-8"
        >
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-gray-900">
            <Image className="w-6 h-6 text-primary" />
            Step 2: Select Frame
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {frames.map((frame, index) => (
              <motion.div
                key={frame.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedFrame(frame)}
                className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                  selectedFrame?.name === frame.name
                    ? 'border-primary ring-2 ring-primary/30'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <img
                  src={`${API_BASE_URL}${frame.url}`}
                  alt={`Frame ${index + 1}`}
                  className="w-full h-auto"
                />
                <div className="p-2 bg-gray-50 text-xs text-center font-medium text-gray-700">
                  Frame {index + 1}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Text Overlay Section */}
      {selectedFrame && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg border border-gray-200 p-8"
        >
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-gray-900">
            <Type className="w-6 h-6 text-primary" />
            Step 3: Customize Text
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Text Customization Controls */}
            <div className="space-y-5">
              {/* Text Input */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-900">Text Content</label>
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Enter your thumbnail text..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-gray-900"
                />
              </div>

              {/* Font Family */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-900">Font Family</label>
                <select
                  value={textOptions.fontFamily}
                  onChange={(e) => setTextOptions({ ...textOptions, fontFamily: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-gray-900 bg-white"
                >
                  <option value="Arial">Arial</option>
                  <option value="Helvetica">Helvetica</option>
                  <option value="Impact">Impact</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Courier New">Courier New</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Verdana">Verdana</option>
                  <option value="Comic Sans MS">Comic Sans MS</option>
                </select>
              </div>

              {/* Font Size with Live Preview */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-900">Font Size: {textOptions.fontSize}px</label>
                <input
                  type="range"
                  min="20"
                  max="120"
                  value={textOptions.fontSize}
                  onChange={(e) => setTextOptions({ ...textOptions, fontSize: parseInt(e.target.value) })}
                  className="w-full accent-primary"
                />
                
                {/* Live Font Size Preview */}
                <div className="mt-3 p-4 bg-gray-100 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-600 mb-2">Preview:</p>
                  <div 
                    style={{ 
                      fontSize: `${textOptions.fontSize * 0.3}px`, 
                      fontFamily: textOptions.fontFamily,
                      color: 'black',
                      padding: textOptions.showBackground ? '8px 12px' : '0',
                      backgroundColor: textOptions.showBackground ? `${textOptions.backgroundColor}${Math.round(textOptions.backgroundOpacity * 255).toString(16).padStart(2, '0')}` : 'transparent',
                      display: 'inline-block',
                      borderRadius: '4px'
                    }}
                    className="font-bold text-black"
                  >
                    {text || 'Sample Text'}
                  </div>
                </div>
              </div>

              {/* Text Color */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-900">Text Color</label>
                <div className="flex gap-2">
                  <select
                    value={textOptions.fontColor}
                    onChange={(e) => setTextOptions({ ...textOptions, fontColor: e.target.value })}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-gray-900 bg-white"
                  >
                    <option value="white">White</option>
                    <option value="black">Black</option>
                    <option value="red">Red</option>
                    <option value="yellow">Yellow</option>
                    <option value="orange">Orange</option>
                    <option value="green">Green</option>
                    <option value="blue">Blue</option>
                    <option value="purple">Purple</option>
                  </select>
                  <div 
                    className="w-12 h-12 rounded-lg border-2 border-gray-300"
                    style={{ backgroundColor: textOptions.fontColor }}
                  ></div>
                </div>
              </div>

              {/* Background Toggle */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={textOptions.showBackground}
                    onChange={(e) => setTextOptions({ ...textOptions, showBackground: e.target.checked })}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-sm font-medium text-gray-900">Show Background Box</span>
                </label>
              </div>

              {/* Background Options (shown when background is enabled) */}
              {textOptions.showBackground && (
                <div className="space-y-4 pl-6 border-l-2 border-primary/30">
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-900">Background Color</label>
                    <select
                      value={textOptions.backgroundColor}
                      onChange={(e) => setTextOptions({ ...textOptions, backgroundColor: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-gray-900 bg-white"
                    >
                      <option value="black">Black</option>
                      <option value="white">White</option>
                      <option value="red">Red</option>
                      <option value="blue">Blue</option>
                      <option value="green">Green</option>
                      <option value="gray">Gray</option>
                    </select>
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-900">
                      Background Opacity: {Math.round(textOptions.backgroundOpacity * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={textOptions.backgroundOpacity}
                      onChange={(e) => setTextOptions({ ...textOptions, backgroundOpacity: parseFloat(e.target.value) })}
                      className="w-full accent-primary"
                    />
                  </div>
                </div>
              )}

              {/* Position Controls */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-900">Text Position</label>
                
                {/* Position Presets */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {['top', 'center', 'bottom'].map((pos) => (
                    <button
                      key={pos}
                      onClick={() => setTextOptions({ ...textOptions, position: pos, customPosition: false })}
                      className={`py-2 px-3 rounded-lg border-2 text-sm font-medium transition-colors capitalize ${
                        !textOptions.customPosition && textOptions.position === pos
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>

                {/* Custom Position Toggle */}
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={textOptions.customPosition}
                    onChange={(e) => setTextOptions({ ...textOptions, customPosition: e.target.checked })}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-sm font-medium text-gray-900">Use Custom Position</span>
                </label>

                {/* Custom Position Controls */}
                {textOptions.customPosition && (
                  <div className="space-y-3 pl-6 border-l-2 border-primary/30">
                    <div>
                      <label className="block mb-1 text-xs font-medium text-gray-700">
                        Horizontal Position: {textOptions.xPosition}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={textOptions.xPosition}
                        onChange={(e) => setTextOptions({ ...textOptions, xPosition: parseInt(e.target.value) })}
                        className="w-full accent-primary"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 text-xs font-medium text-gray-700">
                        Vertical Position: {textOptions.yPosition}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={textOptions.yPosition}
                        onChange={(e) => setTextOptions({ ...textOptions, yPosition: parseInt(e.target.value) })}
                        className="w-full accent-primary"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerateThumbnail}
                disabled={!text.trim() || processing}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
              >
                {processing ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Image className="w-5 h-5" />
                    <span>Generate Thumbnail</span>
                  </>
                )}
              </button>
            </div>

            {/* Preview Panel */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-900">Preview</label>
              <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50 sticky top-6">
                {generatedThumbnail ? (
                  <div className="space-y-4 p-4">
                    <img
                      src={`${API_BASE_URL}${generatedThumbnail.url}`}
                      alt="Generated Thumbnail"
                      className="w-full h-auto rounded-lg"
                    />
                    <button
                      onClick={handleDownload}
                      className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                      <Download className="w-5 h-5" />
                      <span>Download Thumbnail</span>
                    </button>
                  </div>
                ) : (
                  <div className="aspect-video bg-gray-100 flex items-center justify-center p-4">
                    <img
                      src={`${API_BASE_URL}${selectedFrame.url}`}
                      alt="Selected Frame"
                      className="w-full h-auto rounded-lg"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <FeatureGuide
        description="Generate a thumbnail image from your video frames and add title/caption text in a few clicks."
        steps={[
          'Upload a video (up to 500MB).',
          'Extract frames and pick your favorite shot.',
          'Enter headline text and style settings.',
          'Generate the final thumbnail and download it.'
        ]}
        tips={[
          'Choose high-contrast text color for legibility.',
          'Keep the message short for better click-through rates.',
          'Use the default 1280x720 frame for social sharing compatibility.'
        ]}
      />
    </div>
  );
};

export default ThumbnailGenerator;
