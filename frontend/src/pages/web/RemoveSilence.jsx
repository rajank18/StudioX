import React, { useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { Upload, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import ToolInfoFaqSection from '../../components/web/ToolInfoFaqSection';

const RemoveSilence = () => {
    const { getToken } = useAuth();
    const { user } = useUser();
    const [audioFile, setAudioFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setAudioFile(file);
            setError('');
            setSuccess(false);
        }
    };

    const handleRemoveSilence = async () => {
        if (!audioFile) {
            setError('Please select an audio file');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess(false);

        const formData = new FormData();
        formData.append('audio', audioFile);

        try {
            const token = await getToken();
            const response = await fetch('http://localhost:3000/api/remove-silence', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-User-ID': user?.id,
                    'X-User-Email': user?.emailAddresses?.[0]?.emailAddress,
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error processing audio');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `silence_removed_${Date.now()}.mp3`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            setSuccess(true);
            setAudioFile(null);
        } catch (err) {
            setError(err.message || 'Error removing silence');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
                <div className="flex justify-center mb-4">
                    <div className="p-3 bg-primary-50 rounded-full">
                        <Upload className="w-8 h-8 text-primary" />
                    </div>
                </div>
                <h1 className="text-3xl font-bold text-gray-900">Remove Silence</h1>
            </div>

            {/* Main Card */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
                <div className="space-y-6">
                    {/* File Upload Area */}
                    <div className="space-y-2">
                        <label htmlFor="audio-file" className="block text-sm font-medium text-gray-700">
                            Select Audio File
                        </label>
                        <div className="relative">
                            <input
                                id="audio-file"
                                type="file"
                                accept="audio/*"
                                onChange={handleFileChange}
                                disabled={loading}
                                className="hidden"
                            />
                            <label
                                htmlFor="audio-file"
                                className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary hover:bg-gray-100 transition-colors"
                            >
                                <div className="text-center">
                                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                    <p className="text-sm font-medium text-gray-700">
                                        {audioFile ? audioFile.name : 'Click to upload audio file'}
                                    </p>
                                    <p className="text-xs text-gray-500">MP3, WAV, M4A supported</p>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Process Button */}
                    <button
                        onClick={handleRemoveSilence}
                        disabled={loading || !audioFile}
                        className="w-full btn-primary flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <Loader className="w-5 h-5 animate-spin" />
                        ) : (
                            <Upload className="w-5 h-5" />
                        )}
                        <span>{loading ? 'Processing audio...' : 'Remove Silence & Download'}</span>
                    </button>

                    {/* Error Message */}
                    {error && (
                        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <h3 className="font-medium text-red-900">Error</h3>
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Success Message */}
                    {success && (
                        <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <h3 className="font-medium text-green-900">Success!</h3>
                                <p className="text-sm text-green-700">Your audio file has been processed and downloaded</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <ToolInfoFaqSection toolKey="remove-silence" />
        </div>
    );
};

export default RemoveSilence;