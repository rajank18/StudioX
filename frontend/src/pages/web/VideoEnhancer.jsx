import React, { useEffect, useMemo, useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { Upload, Sparkles, CheckCircle2, Loader2, WandSparkles, SlidersHorizontal, Film, AlertCircle, Download } from 'lucide-react';
import ToolInfoFaqSection from '../../components/web/ToolInfoFaqSection';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const FLOW_STEPS = [
	'Input Video',
	'Denoise',
	'Upscale (Lanczos)',
	'Sharpen',
	'Color Boost',
	'FPS Smooth (optional)',
	'High-quality encoding',
	'Output',
];

const MODE_OPTIONS = [
	{
		key: 'light',
		label: 'Light',
		description: 'Scale + color only (fastest)',
	},
	{
		key: 'medium',
		label: 'Medium',
		description: 'Bicubic upscale + light sharpen + color',
	},
	{
		key: 'heavy',
		label: 'Heavy',
		description: 'Denoise + Lanczos + sharpen + color ',
	},
];

const VideoEnhancer = () => {
	const { getToken } = useAuth();
	const { user } = useUser();
	const [videoFile, setVideoFile] = useState(null);
	const [videoPreviewUrl, setVideoPreviewUrl] = useState('');
	const [mode, setMode] = useState('light');
	const [enableFpsSmooth, setEnableFpsSmooth] = useState(false);
	const [isPreparing, setIsPreparing] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState(false);
	const [result, setResult] = useState(null);

	useEffect(() => {
		return () => {
			if (videoPreviewUrl && videoPreviewUrl.startsWith('blob:')) {
				URL.revokeObjectURL(videoPreviewUrl);
			}
		};
	}, [videoPreviewUrl]);

	const fileDetails = useMemo(() => {
		if (!videoFile) return null;

		const mb = (videoFile.size / (1024 * 1024)).toFixed(2);
		return {
			name: videoFile.name,
			size: `${mb} MB`,
			type: videoFile.type || 'video/*',
		};
	}, [videoFile]);

	const handleVideoInput = (event) => {
		const file = event.target.files?.[0];
		if (!file) return;

		if (!file.type.startsWith('video/')) {
			setError('Please select a valid video file.');
			return;
		}

		setError('');
		setSuccess(false);
		setResult(null);
		if (videoPreviewUrl && videoPreviewUrl.startsWith('blob:')) {
			URL.revokeObjectURL(videoPreviewUrl);
		}
		setVideoFile(file);
		setVideoPreviewUrl(URL.createObjectURL(file));
	};

	const handlePrepare = async () => {
		if (!videoFile) return;
		setError('');
		setSuccess(false);
		setResult(null);
		setIsPreparing(true);

		try {
			const token = await getToken();
			const formData = new FormData();
			formData.append('video', videoFile);
			formData.append('mode', mode);
			formData.append('enableFpsSmooth', String(enableFpsSmooth));

			const response = await fetch(`${API_BASE_URL}/api/video-enhancement/process`, {
				method: 'POST',
				headers: {
					...(token ? { Authorization: `Bearer ${token}` } : {}),
					'X-User-Id': user?.id || '',
					'X-User-Email': user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || '',
				},
				body: formData,
			});

			const data = await response.json();
			if (!response.ok) {
				throw new Error(data.error || data.details || 'Video enhancement failed');
			}

			const publicUrl = `${API_BASE_URL}${data.url}`;
			setResult({
				url: publicUrl,
				filename: data.filename,
				pipeline: data.pipeline,
			});
			setSuccess(true);
		} catch (err) {
			setError(err.message || 'Could not process video enhancement');
		} finally {
			setIsPreparing(false);
		}
	};

	const handleDownload = async () => {
		if (!result?.url) return;
		try {
			const response = await fetch(result.url);
			if (!response.ok) throw new Error('Failed to download enhanced video');
			const blob = await response.blob();
			const objectUrl = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = objectUrl;
			link.download = result.filename || `enhanced_${Date.now()}.mp4`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(objectUrl);
		} catch (err) {
			setError(err.message || 'Could not download enhanced video');
		}
	};

	return (
		<div className="max-w-4xl mx-auto p-6 space-y-6">
			<div className="text-center space-y-2">
				<div className="flex justify-center mb-4">
					<div className="p-3 bg-primary-50 rounded-full">
						<Sparkles className="w-8 h-8 text-primary" />
					</div>
				</div>
				<h1 className="text-3xl font-bold text-gray-900">Video Enhancer</h1>
				<p className="text-gray-600">Upload your video and prepare it through a multi-stage enhancement pipeline.</p>
			</div>

			<div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 space-y-6">
				<div className="space-y-2">
					<label htmlFor="enhance-video" className="block text-sm font-medium text-gray-700">Input Video</label>
					<label
						htmlFor="enhance-video"
						className="flex items-center justify-center w-full px-4 py-10 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary hover:bg-gray-100 transition-colors"
					>
						<input
							id="enhance-video"
							type="file"
							accept="video/*"
							className="hidden"
							onChange={handleVideoInput}
						/>
						<div className="text-center">
							<Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
							<p className="text-sm font-medium text-gray-700">{videoFile ? videoFile.name : 'Click to upload a video file'}</p>
							<p className="text-xs text-gray-500">MP4, WebM, MOV supported</p>
						</div>
					</label>
				</div>

				{fileDetails && (
					<div className="rounded-lg border border-gray-200 bg-gray-50 p-4 grid md:grid-cols-3 gap-3 text-sm">
						<p className="text-gray-700"><span className="font-semibold">Name:</span> {fileDetails.name}</p>
						<p className="text-gray-700"><span className="font-semibold">Size:</span> {fileDetails.size}</p>
						<p className="text-gray-700"><span className="font-semibold">Type:</span> {fileDetails.type}</p>
					</div>
				)}

				{videoPreviewUrl && (
					<div className="rounded-lg overflow-hidden border border-gray-200 bg-black">
						<video src={videoPreviewUrl} controls className="w-full h-auto max-h-[360px]" />
					</div>
				)}

				

				<div className="rounded-xl border border-gray-200 p-5 space-y-4">
					<div className="flex items-center gap-2">
						<SlidersHorizontal className="w-5 h-5 text-primary" />
						<h2 className="text-lg font-semibold text-gray-900">Options</h2>
					</div>
					<div className="grid md:grid-cols-3 gap-3">
						{MODE_OPTIONS.map((option) => (
							<button
								key={option.key}
								type="button"
								onClick={() => setMode(option.key)}
								className={`p-3 rounded-lg border-2 text-left transition-colors ${
									mode === option.key
										? 'border-primary bg-primary-50'
										: 'border-gray-200 hover:border-gray-300 bg-white'
								}`}
							>
								<p className="font-semibold text-gray-900">{option.label}</p>
								<p className="text-sm text-gray-600 mt-1">{option.description}</p>
							</button>
						))}
					</div>
					
					<label className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50 cursor-pointer">
						<div>
							<p className="font-medium text-gray-900">Enable FPS Smooth</p>
							<p className="text-sm text-gray-600">Optional frame interpolation for smoother motion.</p>
						</div>
						<input
							type="checkbox"
							checked={enableFpsSmooth}
							onChange={(e) => setEnableFpsSmooth(e.target.checked)}
							className="w-5 h-5 accent-primary"
						/>
					</label>
				</div>

				<button
					type="button"
					disabled={!videoFile || isPreparing}
					onClick={handlePrepare}
					className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{isPreparing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Film className="w-5 h-5" />}
					<span>{isPreparing ? 'Enhancing video...' : 'Start Enhancement'}</span>
				</button>

				{error && (
					<div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
						<AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
						<div>
							<h3 className="font-medium text-red-900">Enhancement failed</h3>
							<p className="text-sm text-red-700">{error}</p>
						</div>
					</div>
				)}

				{success && result && (
					<div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-3">
						<div className="flex items-start gap-3">
							<CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
							<div>
								<h3 className="font-medium text-green-900">Enhancement complete</h3>
								<p className="text-sm text-green-700">Your enhanced video is ready with the selected pipeline settings.</p>
								{result.pipeline && (
									<p className="text-xs text-green-800 mt-1">
										Mode: {String(result.pipeline.mode || mode).toUpperCase()} | Upscale limit: {result.pipeline.upscaleMaxWidth || 2048}px
									</p>
								)}
							</div>
						</div>
						<div className="rounded-lg overflow-hidden border border-gray-200 bg-black">
							<video src={result.url} controls className="w-full h-auto max-h-[360px]" />
						</div>
						<div className="flex justify-end">
							<button
								type="button"
								onClick={handleDownload}
								className="btn-primary inline-flex items-center gap-2"
							>
								<Download className="w-4 h-4" />
								<span>Download Enhanced Video</span>
							</button>
						</div>
					</div>
				)}
			</div>

			<ToolInfoFaqSection toolKey="video-enhancer" />
		</div>
	);
};

export default VideoEnhancer;
