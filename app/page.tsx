'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Upload, Download, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import Papa from 'papaparse';

interface CatalogRow {
  [key: string]: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Home() {
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [catalogData, setCatalogData] = useState<CatalogRow[]>([]);
  const [rawData, setRawData] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('');
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          handleVoiceCommand(transcript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  }, []);

  const speak = (text: string) => {
    if (synthRef.current) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      synthRef.current.speak(utterance);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
      setStatus('Listening...');
    }
  };

  const handleVoiceCommand = async (command: string) => {
    setMessages(prev => [...prev, { role: 'user', content: command }]);
    setStatus('Processing...');

    const response = await processCommand(command);
    setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    speak(response);
    setStatus('');
  };

  const processCommand = async (command: string): Promise<string> => {
    const lowerCommand = command.toLowerCase();

    if (lowerCommand.includes('hello') || lowerCommand.includes('hi')) {
      return "Hello! I'm JARVIS, your personal AI agent. I can help you manage your e-commerce catalogs for Amazon, Flipkart, Meesho, and Myntra. Upload your catalog sheet and raw data, and I'll enrich it for you.";
    }

    if (lowerCommand.includes('catalog') || lowerCommand.includes('sheet')) {
      if (catalogData.length === 0) {
        return "Please upload your catalog sheet first using the upload button.";
      }
      return `I have loaded ${catalogData.length} items in your catalog. You can now provide raw data for me to fill in the details.`;
    }

    if (lowerCommand.includes('status')) {
      return `Catalog has ${catalogData.length} rows. Raw data is ${rawData ? 'provided' : 'not provided'}. Ready to process when you give the command.`;
    }

    if (lowerCommand.includes('process') || lowerCommand.includes('fill') || lowerCommand.includes('enrich')) {
      if (catalogData.length === 0) {
        return "Please upload your catalog sheet first.";
      }
      if (!rawData) {
        return "Please provide raw data for me to work with.";
      }
      return "Processing your catalog with the provided data. This will enrich your product listings for all platforms.";
    }

    if (lowerCommand.includes('help')) {
      return "I can help you with catalog management for Amazon, Flipkart, Meesho, and Myntra. Upload your catalog sheet, provide raw product data, and I'll enrich it with proper titles, descriptions, prices, and attributes suitable for each platform.";
    }

    return "I'm here to help with your e-commerce catalog management. Try saying 'help' to learn what I can do.";
  };

  const handleCatalogUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          setCatalogData(results.data as CatalogRow[]);
          setStatus(`Loaded ${results.data.length} catalog items`);
          const msg = `Catalog uploaded successfully with ${results.data.length} items.`;
          setMessages(prev => [...prev, { role: 'assistant', content: msg }]);
          speak(msg);
        },
        error: (error) => {
          setStatus(`Error: ${error.message}`);
        }
      });
    }
  };

  const enrichCatalog = async () => {
    if (catalogData.length === 0) {
      setStatus('Please upload catalog first');
      return;
    }
    if (!rawData) {
      setStatus('Please provide raw data');
      return;
    }

    setIsProcessing(true);
    setStatus('Enriching catalog...');

    try {
      const response = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ catalog: catalogData, rawData })
      });

      const result = await response.json();

      if (result.enrichedCatalog) {
        setCatalogData(result.enrichedCatalog);
        const msg = 'Catalog enriched successfully! Ready to download.';
        setStatus(msg);
        setMessages(prev => [...prev, { role: 'assistant', content: msg }]);
        speak(msg);
      }
    } catch (error) {
      setStatus('Error enriching catalog');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadCatalog = () => {
    if (catalogData.length === 0) {
      setStatus('No catalog data to download');
      return;
    }

    const csv = Papa.unparse(catalogData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `enriched-catalog-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    const msg = 'Catalog downloaded successfully!';
    setStatus(msg);
    speak(msg);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center py-8">
          <h1 className="text-6xl font-bold text-blue-400 mb-2">JARVIS</h1>
          <p className="text-xl text-gray-300">Your Personal AI E-Commerce Agent</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Voice Interface */}
          <div className="bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-2xl p-6 border border-blue-500">
            <h2 className="text-2xl font-semibold mb-4 text-blue-300">Voice Assistant</h2>

            <div className="flex justify-center mb-6">
              <button
                onClick={toggleListening}
                className={`w-32 h-32 rounded-full flex items-center justify-center transition-all ${
                  isListening
                    ? 'bg-red-500 glow voice-wave'
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {isListening ? (
                  <MicOff className="w-16 h-16" />
                ) : (
                  <Mic className="w-16 h-16" />
                )}
              </button>
            </div>

            <div className="text-center mb-4">
              <p className="text-sm text-gray-400">
                {isListening ? 'Listening... Speak now' : 'Click to start voice command'}
              </p>
              {status && (
                <p className="text-sm text-blue-300 mt-2">{status}</p>
              )}
            </div>

            {/* Chat History */}
            <div className="bg-gray-900 rounded-lg p-4 h-64 overflow-y-auto">
              {messages.length === 0 ? (
                <p className="text-gray-500 text-center">Start a conversation...</p>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`mb-3 p-3 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-blue-900 ml-8'
                        : 'bg-gray-700 mr-8'
                    }`}
                  >
                    <p className="text-sm font-semibold mb-1">
                      {msg.role === 'user' ? 'You' : 'JARVIS'}
                    </p>
                    <p className="text-sm">{msg.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Catalog Management */}
          <div className="bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-2xl p-6 border border-blue-500">
            <h2 className="text-2xl font-semibold mb-4 text-blue-300">Catalog Manager</h2>

            {/* Platform Badges */}
            <div className="flex flex-wrap gap-2 mb-6">
              {['Amazon', 'Flipkart', 'Meesho', 'Myntra'].map((platform) => (
                <span
                  key={platform}
                  className="px-3 py-1 bg-blue-600 rounded-full text-sm"
                >
                  {platform}
                </span>
              ))}
            </div>

            {/* Upload Section */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Upload Catalog Sheet (CSV)
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCatalogUpload}
                  className="w-full p-2 bg-gray-700 rounded-lg border border-gray-600 text-sm"
                />
                {catalogData.length > 0 && (
                  <p className="text-sm text-green-400 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    {catalogData.length} rows loaded
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Raw Product Data
                </label>
                <textarea
                  value={rawData}
                  onChange={(e) => setRawData(e.target.value)}
                  placeholder="Paste your raw product data here..."
                  className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600 h-32 text-sm"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={enrichCatalog}
                disabled={isProcessing || catalogData.length === 0 || !rawData}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Enrich Catalog
                  </>
                )}
              </button>

              <button
                onClick={downloadCatalog}
                disabled={catalogData.length === 0}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <Download className="w-5 h-5" />
                Download CSV
              </button>
            </div>

            {/* Stats */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="bg-gray-900 rounded-lg p-4">
                <p className="text-sm text-gray-400">Catalog Rows</p>
                <p className="text-2xl font-bold text-blue-400">{catalogData.length}</p>
              </div>
              <div className="bg-gray-900 rounded-lg p-4">
                <p className="text-sm text-gray-400">Data Status</p>
                <p className="text-2xl font-bold text-blue-400">
                  {rawData ? '✓ Ready' : '✗ Pending'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-2xl p-6 border border-blue-500">
          <h3 className="text-xl font-semibold mb-4 text-blue-300">Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { title: 'Voice Commands', desc: 'Control everything with your voice' },
              { title: 'Auto-Enrichment', desc: 'AI fills catalog data intelligently' },
              { title: 'Multi-Platform', desc: 'Optimized for all major marketplaces' },
              { title: 'CSV Export', desc: 'Download enriched catalogs instantly' }
            ].map((feature, idx) => (
              <div key={idx} className="bg-gray-900 rounded-lg p-4">
                <h4 className="font-semibold mb-2">{feature.title}</h4>
                <p className="text-sm text-gray-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
