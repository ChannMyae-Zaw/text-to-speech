"use client";
import React, { useState, useRef } from 'react';
import JSZip from 'jszip'
export default function TangerineTTS() {
  // --- STATE: This holds all "tuning" data ---
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [genTime, setGenTime] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioList, setAudioList] = useState<{url: string, blob: Blob, text: string}[]>([]);

  const [formData, setFormData] = useState({
    voice: 'sage',
    instructions: 'Soft, rhythmic, and professional.',
    speed: '1.0',
    format: 'mp3',
    input: 'Hello! This is my tangerine tuning tool.'
  });

  // --- LOGIC: The function that talks to "Brain" (API) ---
  const handleGenerate = async () => {
    setLoading(true);
    setAudioUrl(null); // Clear old audio
    setAudioList([]);
    // 2. Split input by newline and remove empty lines
    const lines = formData.input.split('\n').filter(line => line.trim() !== "");
    const newAudioList = [];

    try {
      for (const [index, line] of lines.entries()) {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...formData, input: line }), // Send one line at a time
        });

        if (!response.ok) throw new Error(`Failed on line ${index + 1}`);

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        newAudioList.push({ url, blob, text: line });
      }
      setAudioList(newAudioList);
    } catch (err) {
      alert("Error during batch generation. Check console.");
    } finally {
      setLoading(false);
    }
  };

  const playAll = async () => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create a master chain
    const compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-24, audioCtx.currentTime);
    compressor.ratio.setValueAtTime(12, audioCtx.currentTime);
    compressor.connect(audioCtx.destination);

    for (let i = 0; i < audioList.length; i++) {
      const response = await fetch(audioList[i].url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      // --- NEW: LOUDNESS BALANCING ---
      const channelData = audioBuffer.getChannelData(0);
      let sumSquares = 0;
      for (let j = 0; j < channelData.length; j++) {
        sumSquares += channelData[j] * channelData[j];
      }
      const rms = Math.sqrt(sumSquares / channelData.length);
      const targetRms = 0.15; // The "Golden" average loudness
      const normalizationGain = targetRms / (rms + 0.00001); // Prevent divide by zero

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;

      // Individual gain node for THIS specific clip
      const individualGain = audioCtx.createGain();
      individualGain.gain.setValueAtTime(normalizationGain, audioCtx.currentTime);

      // Source -> Individual Gain (Normalizer) -> Master Compressor -> Speakers
      source.connect(individualGain);
      individualGain.connect(compressor);

      await new Promise((resolve) => {
        source.onended = resolve;
        source.start(0);
      });
    }
  };

  const downloadZip = async () => {
    const zip = new JSZip();
    audioList.forEach((item, index) => {
      // Files named: 01_text_snippet.mp3
      const fileName = `${String(index + 1).padStart(2, '0')}_audio.${formData.format}`;
      zip.file(fileName, item.blob);
    });

    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(content);
    link.download = "tangerine_batch_audio.zip";
    link.click();
  };

  return (
    <div className="min-h-screen bg-orange-50 p-4 md:p-10 text-slate-900 font-sans">
      <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-orange-200">
        
        {/* 1. LOGO SECTION */}
        <header className="bg-orange-500 p-4 px-6 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-4">
            
            {/* White Logo Container - Makes orange logos stand out */}
            {/*<div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center p-2 shadow-inner border border-orange-400/20">
              <img 
                src="tangerine-logo.png" 
                alt="Tangerine Logo"
                className="object-contain w-full h-full"
                onError={(e) => {
                  // This creates a placeholder orange icon if logo.png isn't found
                  e.currentTarget.src = "https://api.dicebear.com/7.x/icons/svg?seed=orange&color=f97316";
                }}
              />
            </div>
            */}
            {/* Title Section */}
            <div className="flex flex-col">
              <h1 className="text-white text-2xl font-black italic tracking-tighter leading-none">
                TANGERINE<span className="text-orange-200">LAB</span>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="h-1 w-4 bg-orange-300"></span>
                <p className="text-orange-100 text-[9px] font-bold uppercase tracking-[0.2em]">
                  GPT-4o Audio Tuning
                </p>
              </div>
            </div>
          </div>

          {/* Performance Badge */}
          <div className="hidden sm:block">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-1 text-right">
              <p className="text-[10px] text-orange-100 uppercase font-bold">Model Status</p>
              <p className="text-white text-xs font-mono">gpt-4o-mini-tts</p>
            </div>
          </div>
        </header>

        <div className="p-8 space-y-6">
          {/* 2. VOICE & SPEED ROW */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-orange-600 mb-1">Voice</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 outline-orange-400"
                value={formData.voice}
                onChange={(e) => setFormData({...formData, voice: e.target.value})}
              >
                <option value="sage">Sage (Female)</option>
                <option value="shimmer">Shimmer (Female)</option>
                <option value="ash">Ash</option>
                <option value="ballad">Ballad</option>
                <option value="coral">Coral</option>
                <option value="echo">Echo</option>
                <option value="fable">Fable</option>
                <option value="onyx">Onyx</option>
                <option value="nova">Nova</option>
                <option value="verse">Verse</option>
                <option value="marin">Marin</option>
                <option value="cedar">Cedar</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-orange-600 mb-1">Speed (Number)</label>
              <input 
                type="number" step="0.1" min="0.25" max="4.0"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 outline-orange-400"
                value={formData.speed}
                onChange={(e) => setFormData({...formData, speed: e.target.value})}
              />
            </div>
          </div>

          {/* 3. INSTRUCTION TEXTAREA */}
          <div>
            <label className="block text-xs font-bold text-orange-600 mb-1">Instruction (Tuning)</label>
            <textarea 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 h-20 text-sm outline-orange-400"
              placeholder="e.g. Speak like a soft whisper..."
              value={formData.instructions}
              onChange={(e) => setFormData({...formData, instructions: e.target.value})}
            />
          </div>

          {/* 4. RESPONSE FORMAT DROPDOWN */}
          <div>
            <label className="block text-xs font-bold text-orange-600 mb-1">Response Format</label>
            <select 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 outline-orange-400"
              value={formData.format}
              onChange={(e) => setFormData({...formData, format: e.target.value})}
            >
              <option value="mp3">MP3</option>
              <option value="wav">WAV</option>
              <option value="aac">AAC</option>
            </select>
          </div>

          {/* 5. INPUT TEXT */}
          <div>
            <label className="block text-xs font-bold text-orange-600 mb-1">Input Message</label>
            <textarea 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 h-32 outline-orange-400"
              placeholder="Type your autobiography test here..."
              value={formData.input}
              onChange={(e) => setFormData({...formData, input: e.target.value})}
            />
          </div>

          {/* 6. GENERATE BUTTON & INFO */}
          <div className="pt-4 flex flex-col items-center gap-3">
            <button 
              onClick={handleGenerate}
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95"
            >
              {loading ? "Processing..." : "Generate TTS"}
            </button>
            
            {/* Display Speed Info */}
            {genTime && (
              <p className="text-[10px] font-mono text-orange-400">
                TTS Generate Info: {genTime}ms
              </p>
            )}
          </div>

          {/* 7. PLAY & DOWNLOAD BUTTONS */}
          {audioList.length > 0 && (
            <div className="mt-8 space-y-4">
              <div className="flex gap-2">
                <button onClick={playAll} className="flex-1 bg-green-500 text-white font-bold py-3 rounded-xl hover:bg-green-600">
                  ▶ Play All (Continuous)
                </button>
                <button onClick={downloadZip} className="flex-1 bg-blue-500 text-white font-bold py-3 rounded-xl hover:bg-blue-600">
                  Download ZIP
                </button>
              </div>

              {/* Display each generated line */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {audioList.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                    <span className="text-xs text-slate-500 truncate max-w-200">{item.text}</span>
                    <audio src={item.url} controls className="h-8 w-40" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}