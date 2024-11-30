'use client'

import { Button, Card, Select, SelectItem, Textarea } from "@nextui-org/react";
import { AnimatePresence } from "framer-motion";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { SettingsButton } from "./components/settings-button";
import { StatusDisplay } from "./components/status-display";
import { languages } from "./constants/languages";
import { deeplLanguages } from "./constants/deepl-languages";
import { Clipboard, Copy, Trash2, ArrowLeftRight, History, SplitSquareHorizontal, Check, X } from 'lucide-react';
import { TranslationHistoryItem, TranslationHistoryState } from "./types/history";
import { v4 as uuidv4 } from 'uuid';
import { HistoryPanel } from "./components/history-panel";
import axios from 'axios';
import { getLocalStorage, setLocalStorage } from './utils/localStorage';

interface TranslationState {
  status: 'idle' | 'loading' | 'streaming' | 'error'
  text: string
  error?: string
}

export default function Home() {
  const [sourceText, setSourceText] = useState("");
  const [translation, setTranslation] = useState<TranslationState>({
    status: 'idle',
    text: ""
  });
  const [sourceLang, setSourceLang] = useState("auto-detect");
  const [targetLang, setTargetLang] = useState("English");
  const [showHistory, setShowHistory] = useState(false);
  const [oneByOne, setOneByOne] = useState(false);
  const [copySourceStatus, setCopySourceStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [copyTranslationStatus, setCopyTranslationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [clearSourceStatus, setClearSourceStatus] = useState<'idle' | 'success'>('idle');
  const [clearTranslationStatus, setClearTranslationStatus] = useState<'idle' | 'success'>('idle');
  const [pasteStatus, setPasteStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [history, setHistory] = useState<TranslationHistoryState>({
    items: [],
    searchQuery: '',
    showFavoritesOnly: false
  });
  const [translationService, setTranslationService] = useState('openai');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load initial state from localStorage on client side
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    setSourceLang(getLocalStorage('sourceLang', "auto-detect"));
    setTargetLang(getLocalStorage('targetLang', "English"));
    setOneByOne(getLocalStorage('oneByOne') === 'true');
    setTranslationService(getLocalStorage('translationService', 'openai'));
    
    try {
      const savedHistory = getLocalStorage('translationHistory');
      const parsedHistory = savedHistory ? JSON.parse(savedHistory) : null;
      if (parsedHistory) {
        setHistory({
          items: Array.isArray(parsedHistory.items) ? parsedHistory.items : [],
          searchQuery: parsedHistory.searchQuery || '',
          showFavoritesOnly: parsedHistory.showFavoritesOnly || false
        });
      }
    } catch (error) {
      console.error('Error parsing history from localStorage:', error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setLocalStorage('translationHistory', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    const handleStorageChange = () => {
      if (typeof window === 'undefined') return;
      const newService = getLocalStorage('translationService', 'openai');
      setTranslationService(newService);
      if (newService === 'deepl') {
        setSourceLang('auto-detect');
        setTargetLang('EN');
        setOneByOne(false); // Disable 1-by-1 mode when switching to DeepL
      } else {
        setSourceLang('auto-detect');
        setTargetLang('English');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    if (translationService === 'deepl') {
      setOneByOne(false);
    }
  }, [translationService]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setLocalStorage('sourceLang', sourceLang);
    setLocalStorage('targetLang', targetLang);
    setLocalStorage('oneByOne', oneByOne.toString());
  }, [sourceLang, targetLang, oneByOne]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setSourceText(text);
      setPasteStatus('success');
      setTimeout(() => setPasteStatus('idle'), 2000);
    } catch (err) {
      setPasteStatus('error');
      setTimeout(() => setPasteStatus('idle'), 2000);
      console.error('Failed to paste:', err);
    }
  };

  const handleCopySource = async () => {
    try {
      await navigator.clipboard.writeText(sourceText);
      setCopySourceStatus('success');
      setTimeout(() => setCopySourceStatus('idle'), 2000);
    } catch (err) {
      setCopySourceStatus('error');
      setTimeout(() => setCopySourceStatus('idle'), 2000);
      console.error('Failed to copy:', err);
    }
  };

  const handleCopyTranslation = async () => {
    try {
      await navigator.clipboard.writeText(translation.text);
      setCopyTranslationStatus('success');
      setTimeout(() => setCopyTranslationStatus('idle'), 2000);
    } catch (err) {
      setCopyTranslationStatus('error');
      setTimeout(() => setCopyTranslationStatus('idle'), 2000);
      console.error('Failed to copy:', err);
    }
  };

  const handleClearSource = () => {
    setSourceText('');
    setClearSourceStatus('success');
    setTimeout(() => setClearSourceStatus('idle'), 2000);
  };

  const handleClearTranslation = () => {
    setTranslation({ status: 'idle', text: '' });
    setClearTranslationStatus('success');
    setTimeout(() => setClearTranslationStatus('idle'), 2000);
  };

  const handleSwapLanguages = () => {
    if (sourceLang === "auto-detect") return;
    const tempLang = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(tempLang);
    
    // Swap the text content as well
    setSourceText(translation.text);
    setTranslation(prev => ({
      ...prev,
      text: sourceText
    }));
  };

  const handleTranslate = async () => {
    // If there's an ongoing translation, cancel it
    if (translation.status === 'loading' || translation.status === 'streaming') {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
        setTranslation(prev => ({ ...prev, status: 'idle' }));
      }
      return;
    }

    const apiHost = getLocalStorage('apiHost');
    const apiKey = getLocalStorage('apiKey');
    const selectedModel = getLocalStorage('selectedModel');
    const deeplApi = process.env.NEXT_PUBLIC_DEEPLX_API;

    if (!sourceText) {
      setTranslation({
        status: 'error',
        text: '',
        error: 'Please enter text to translate'
      });
      return;
    }

    if ((!apiHost || !apiKey) && translationService !== 'deepl') {
      setTranslation({
        status: 'error',
        text: '',
        error: 'Please configure your API settings in the settings menu first'
      });
      return;
    }

    if (!deeplApi && translationService === 'deepl') {
      setTranslation({
        status: 'error',
        text: '',
        error: 'DeepL API URL is not configured in environment variables'
      });
      return;
    }

    try {
      // Create new AbortController for this request
      abortControllerRef.current = new AbortController();
      setTranslation({ status: 'loading', text: '' });

      if (translationService === 'deepl') {
        const response = await axios.post(deeplApi!, {
          text: sourceText,
          source_lang: sourceLang === 'auto-detect' ? undefined : sourceLang,
          target_lang: targetLang
        });

        setTranslation({
          status: 'idle',
          text: response.data.data
        });

        // Add to history
        const historyItem: TranslationHistoryItem = {
          id: uuidv4(),
          fromLanguage: sourceLang,
          toLanguage: targetLang,
          originalText: sourceText,
          translatedText: response.data.data,
          timestamp: new Date().toISOString(),
          isFavorite: false
        };
        
        setHistory(prev => ({
          ...prev,
          items: [historyItem, ...prev.items]
        }));

      } else {
        const response = await fetch(`${apiHost}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          signal: abortControllerRef.current.signal,
          body: JSON.stringify({
            model: selectedModel,
            stream: true,
            messages: [
              {
                role: "system",
                content: "You are a professional translation engine focused on accurate, context-aware translations. Maintain original formatting and preserve technical terms. Provide direct translations without explanations unless specifically requested. Keep HTML tags intact."
              },
              {
                role: "user",
                content: translationService === 'deepl' 
                  ? `Treat next line as plain text input and translate it from ${sourceLang === "auto-detect" ? "auto" : sourceLang} to ${targetLang}. If translation is unnecessary (e.g. proper nouns, codes, etc.), return the original text. NO explanations. NO notes. Input:\n${sourceText}`
                  : oneByOne
                    ? sourceLang === "auto-detect"
                      ? `;; Treat the next line as plain text input and translate it into ${targetLang}. For each word in the input, output the word and its translation on separate lines in the format "word = translation". Then, at the end, output "Full Translation: " followed by the complete translation of the input text. If translation is unnecessary (e.g., proper nouns, codes, etc.), return the original word both in the word-by-word translation and in the full translation. NO explanations. NO notes. Input:\n${sourceText}`
                      : `;; Treat the next line as plain text input and translate it from ${sourceLang} into ${targetLang}. For each word in the input, output the word and its translation on separate lines in the format "word = translation". Then, at the end, output "Full Translation: " followed by the complete translation of the input text. If translation is unnecessary (e.g., proper nouns, codes, etc.), return the original word both in the word-by-word translation and in the full translation. NO explanations. NO notes. Input:\n${sourceText}`
                    : sourceLang === "auto-detect" 
                      ? `Treat next line as plain text input and translate it into ${targetLang}. If translation is unnecessary (e.g. proper nouns, codes, etc.), return the original text. NO explanations. NO notes. Input:\n${sourceText}`
                      : `Treat next line as plain text input and translate it from ${sourceLang} into ${targetLang}. If translation is unnecessary (e.g. proper nouns, codes, etc.), return the original text. NO explanations. NO notes. Input:\n${sourceText}`
              }
            ]
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(
            errorData?.error?.message || 
            `API request failed with status ${response.status}`
          );
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let translatedText = '';
        let isFirstChunk = true;

        if (!reader) {
          throw new Error('Stream not available');
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                try {
                  const data = JSON.parse(line.slice(6));
                  const content = data.choices[0]?.delta?.content || '';
                  if (content) {
                    if (isFirstChunk) {
                      setTranslation(prev => ({ ...prev, status: 'streaming' }));
                      isFirstChunk = false;
                    }
                    translatedText += content;
                    setTranslation(prev => ({ ...prev, text: translatedText }));
                  }
                } catch (e) {
                  console.error('Error parsing chunk:', e);
                }
              }
            }
          }

          // Add to history only if translation completed successfully
          const historyItem: TranslationHistoryItem = {
            id: uuidv4(),
            fromLanguage: sourceLang,
            toLanguage: targetLang,
            originalText: sourceText,
            translatedText,
            timestamp: new Date().toISOString(),
            isFavorite: false
          };
          
          setHistory(prev => ({
            ...prev,
            items: [historyItem, ...prev.items]
          }));

        } catch (error: unknown) {
          let errorMessage = 'An unexpected error occurred';
          
          if (error instanceof Error) {
            if (error.message.includes('Failed to fetch')) {
              errorMessage = 'Failed to connect to the API. Please check your API host settings.';
            } else if (error.name !== 'AbortError') {
              errorMessage = error.message;
            }
          } else {
            // Handle cases where error is not an Error instance
            errorMessage = String(error);
          }

          if (error instanceof Error && error.name !== 'AbortError') {
            setTranslation({
              status: 'error',
              text: '',
              error: errorMessage
            });
          }
          throw error;
        } finally {
          reader.releaseLock();
        }

        setTranslation(prev => ({ ...prev, status: 'idle' }));
        abortControllerRef.current = null;

      }
    } catch (error: unknown) {
      let errorMessage = 'An unexpected error occurred';
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Failed to connect to the API. Please check your API host settings.';
        } else if (error.name !== 'AbortError') {
          errorMessage = error.message;
        }
      } else {
        // Handle cases where error is not an Error instance
        errorMessage = String(error);
      }

      if (error instanceof Error && error.name !== 'AbortError') {
        setTranslation({
          status: 'error',
          text: '',
          error: errorMessage
        });
      }
    }
  };

  const handleSearchHistory = (query: string) => {
    setHistory(prev => ({
      ...prev,
      searchQuery: query
    }));
  };

  const handleToggleFavorite = (id: string) => {
    setHistory(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
      )
    }));
  };

  const handleClearHistory = () => {
    setHistory(prev => ({
      ...prev,
      items: []
    }));
  };

  const handleToggleFavoritesOnly = () => {
    setHistory(prev => ({
      ...prev,
      showFavoritesOnly: !prev.showFavoritesOnly
    }));
  };

  const handleSelectHistoryItem = (item: TranslationHistoryItem) => {
    setSourceText(item.originalText);
    setSourceLang(item.fromLanguage);
    setTargetLang(item.toLanguage);
    setTranslation({
      status: 'idle',
      text: item.translatedText
    });
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistory(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const renderTranslationArea = () => {
    if (translation.status === 'loading') {
      return <StatusDisplay type="loading" message="Preparing translation..." />;
    }
    
    if (translation.status === 'error') {
      return <StatusDisplay type="error" message={translation.error || 'An error occurred'} />;
    }

    return (
      <Textarea
        className="full-height-textarea"
        placeholder="Translation will appear here"
        value={translation.text}
        readOnly
        classNames={{
          base: "h-full",
          input: "h-full resize-none",
          inputWrapper: "h-full data-[hover=true]:bg-default-100"
        }}
        variant="faded"
        size="lg"
      />
    );
  };

  const handleSourceLangChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSourceLang(e.target.value);
  };

  const handleTargetLangChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTargetLang(e.target.value);
  };

  const availableSourceLanguages = useMemo(() => {
    return translationService === 'deepl' ? deeplLanguages : ["auto-detect", ...languages];
  }, [translationService]);

  const availableTargetLanguages = useMemo(() => {
    if (translationService === 'deepl') {
      return deeplLanguages.filter(lang => lang.code !== 'auto-detect');
    }
    return languages;
  }, [translationService]);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-background to-default-50">
      <header className="w-full px-6 py-4 border-b border-default-200 bg-background/80 backdrop-blur-sm supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 shrink-0">
        <div className="max-w-[2000px] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">
              OceanuoTranslate
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              isIconOnly
              variant="light"
              onPress={() => setShowHistory(!showHistory)}
            >
              <History className="w-5 h-5" />
            </Button>
            <SettingsButton />
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col p-6 overflow-hidden">
        <div className="max-w-[2000px] mx-auto w-full h-full flex gap-6">
          <div className="flex-1 flex flex-col gap-6">
            <div className="grid md:grid-cols-2 gap-6 w-full shrink-0 relative">
              <div className="flex items-center">
                <Select
                  label="From"
                  selectedKeys={sourceLang ? [sourceLang] : ["auto-detect"]}
                  onChange={handleSourceLangChange}
                  className="max-w-full"
                  size="lg"
                  variant="bordered"
                  classNames={{
                    trigger: "h-12",
                    value: "text-base",
                    label: "text-default-500",
                    base: "max-w-full"
                  }}
                >
                  {availableSourceLanguages.map((lang) => (
                    <SelectItem 
                      key={typeof lang === 'string' ? lang : lang.code} 
                      value={typeof lang === 'string' ? lang : lang.code}
                    >
                      {typeof lang === 'string' ? lang : lang.name}
                    </SelectItem>
                  ))}
                </Select>
              </div>

              <Button
                isIconOnly
                className="absolute left-1/2 -translate-x-1/2 top-[1rem] z-10 hidden md:flex w-8 h-8 min-w-0"
                variant="light"
                onPress={handleSwapLanguages}
                isDisabled={sourceLang === "auto-detect"}
                radius="full"
              >
                <ArrowLeftRight className="w-4 h-4 text-default-600" />
              </Button>

              <div className="flex items-center">
                <Select
                  label="To"
                  selectedKeys={targetLang ? [targetLang] : ["English"]}
                  onChange={handleTargetLangChange}
                  className="max-w-full"
                  size="lg"
                  variant="bordered"
                  classNames={{
                    trigger: "h-12",
                    value: "text-base",
                    label: "text-default-500",
                    base: "max-w-full"
                  }}
                >
                  {availableTargetLanguages.map((lang) => (
                    <SelectItem 
                      key={typeof lang === 'string' ? lang : lang.code} 
                      value={typeof lang === 'string' ? lang : lang.code}
                    >
                      {typeof lang === 'string' ? lang : lang.name}
                    </SelectItem>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 flex-1 min-h-0">
              <Card className="p-0 h-full bg-content1/50 backdrop-blur-sm overflow-hidden">
                <div className="flex flex-col h-full w-full">
                  <div className="modern-toolbar px-3 py-1.5 flex items-center justify-between">
                    <span className="text-sm text-default-500">Source Text</span>
                    <div className="flex items-center gap-0.5">
                      <Button 
                        isIconOnly
                        size="sm"
                        variant="light"
                        onClick={handlePaste}
                        className="toolbar-button"
                        aria-label="Paste"
                      >
                        {pasteStatus === 'success' ? (
                          <Check className="w-4 h-4 text-success" />
                        ) : pasteStatus === 'error' ? (
                          <X className="w-4 h-4 text-danger" />
                        ) : (
                          <Clipboard className="w-4 h-4" />
                        )}
                      </Button>
                      <Button 
                        isIconOnly
                        size="sm"
                        variant="light"
                        onClick={handleCopySource}
                        className="toolbar-button"
                        aria-label="Copy"
                      >
                        {copySourceStatus === 'success' ? (
                          <Check className="w-4 h-4 text-success" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                      <Button 
                        isIconOnly
                        size="sm"
                        variant="light"
                        onClick={handleClearSource}
                        className="toolbar-button text-danger"
                        aria-label="Clear"
                      >
                        {clearSourceStatus === 'success' ? (
                          <Check className="w-4 h-4 text-success" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        onClick={() => setOneByOne(!oneByOne)}
                        className={`toolbar-button ${oneByOne ? "text-primary" : ""}`}
                        aria-label="Toggle word-by-word translation"
                        isDisabled={translationService === 'deepl'}
                      >
                        <SplitSquareHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden p-4">
                    <Textarea
                      className="full-height-textarea"
                      placeholder="Enter text to translate..."
                      value={sourceText}
                      onChange={(e) => setSourceText(e.target.value)}
                      classNames={{
                        base: "h-full",
                        input: "h-full resize-none",
                        inputWrapper: "h-full bg-transparent hover:bg-default-100/50"
                      }}
                      variant="bordered"
                      size="lg"
                      minRows={30}
                    />
                  </div>
                </div>
              </Card>

              <Card className="p-0 h-full bg-content1/50 backdrop-blur-sm overflow-hidden">
                <div className="flex flex-col h-full w-full">
                  <div className="modern-toolbar px-3 py-1.5 flex items-center justify-between">
                    <span className="text-sm text-default-500">Translation</span>
                    <div className="flex items-center gap-0.5">
                      <Button 
                        isIconOnly
                        size="sm"
                        variant="light"
                        onClick={handleCopyTranslation}
                        className="toolbar-button"
                        aria-label="Copy"
                      >
                        {copyTranslationStatus === 'success' ? (
                          <Check className="w-4 h-4 text-success" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                      <Button 
                        isIconOnly
                        size="sm"
                        variant="light"
                        onClick={handleClearTranslation}
                        className="toolbar-button text-danger"
                        aria-label="Clear"
                      >
                        {clearTranslationStatus === 'success' ? (
                          <Check className="w-4 h-4 text-success" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden p-4">
                    {renderTranslationArea()}
                  </div>
                </div>
              </Card>
            </div>

            <Button 
              color={translation.status === 'loading' || translation.status === 'streaming' ? "danger" : "primary"}
              size="lg"
              onClick={handleTranslate}
              className="w-full max-w-md mx-auto h-14 text-lg font-medium shrink-0 shadow-lg"
              spinnerPlacement="start"
              spinner={
                (translation.status === 'loading' || translation.status === 'streaming') && (
                  <div className="animate-spin">
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  </div>
                )
              }
              startContent={(translation.status === 'idle' || translation.status === 'error') && (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5 8 6 6"/>
                  <path d="m4 14 6-6 2-3"/>
                  <path d="M2 5h12"/>
                  <path d="M7 2h1"/>
                  <path d="m22 22-5-10-5 10"/>
                  <path d="M14 18h6"/>
                </svg>
              )}
            >
              {translation.status === 'loading' ? 'Stop (Preparing...)' : translation.status === 'streaming' ? 'Stop (Translating...)' : 'Translate'}
            </Button>
          </div>
          
          <AnimatePresence>
            {showHistory && (
              <div className="history-panel-open md:relative md:block">
                <HistoryPanel
                  history={history}
                  onSearchChange={handleSearchHistory}
                  onToggleFavorite={handleToggleFavorite}
                  onClearHistory={handleClearHistory}
                  onToggleFavoritesOnly={handleToggleFavoritesOnly}
                  onSelectHistoryItem={handleSelectHistoryItem}
                  onDeleteItem={handleDeleteHistoryItem}
                  setShowHistory={setShowHistory}
                />
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
