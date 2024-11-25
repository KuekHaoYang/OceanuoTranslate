'use client'

import { Input, Button, Card, Checkbox } from "@nextui-org/react";
import { Search, Star, Trash2, StarOff } from 'lucide-react';
import { TranslationHistoryItem, TranslationHistoryState } from "../types/history";
import { formatDistanceToNow } from 'date-fns';
import { motion } from "framer-motion";
import { useState, useEffect } from 'react';

interface HistoryPanelProps {
  history: TranslationHistoryState;
  onSearchChange: (query: string) => void;
  onToggleFavorite: (id: string) => void;
  onClearHistory: () => void;
  onToggleFavoritesOnly: () => void;
  onSelectHistoryItem: (item: TranslationHistoryItem) => void;
  onDeleteItem: (id: string) => void;
}

export function HistoryPanel({
  history,
  onSearchChange,
  onToggleFavorite,
  onClearHistory,
  onToggleFavoritesOnly,
  onSelectHistoryItem,
  onDeleteItem
}: HistoryPanelProps) {
  const filteredItems = (history?.items || [])
    .filter(item => {
      const matchesSearch = history?.searchQuery
        ? item.originalText.toLowerCase().includes(history.searchQuery.toLowerCase()) ||
          item.translatedText.toLowerCase().includes(history.searchQuery.toLowerCase())
        : true;
      
      return matchesSearch && (!history?.showFavoritesOnly || item.isFavorite);
    });

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <motion.div 
      initial={{ width: 0 }}
      animate={{ width: isMobile ? "100%" : "24rem" }}
      exit={{ width: 0 }}
      transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
      className="h-full flex flex-col gap-4 p-4 overflow-hidden border-l border-default-200 will-change-width"
    >
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search history..."
          value={history?.searchQuery || ''}
          onChange={(e) => onSearchChange(e.target.value)}
          startContent={<Search className="w-4 h-4 text-default-400" />}
          size="sm"
        />
        <Button
          color="danger"
          variant="flat"
          size="sm"
          onClick={onClearHistory}
          startContent={<Trash2 className="w-4 h-4" />}
        >
          Clear
        </Button>
      </div>

      <div className="flex items-center">
        <Checkbox
          isSelected={history?.showFavoritesOnly || false}
          onValueChange={onToggleFavoritesOnly}
        >
          Show favorites only
        </Checkbox>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        {filteredItems.length === 0 ? (
          <div className="text-center text-default-500 py-8">
            No history items found
          </div>
        ) : (
          filteredItems.map((item) => (
            <Card
              key={item.id}
              className="p-4"
            >
              <div 
                className="flex flex-col cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => onSelectHistoryItem(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onSelectHistoryItem(item);
                  }
                }}
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="text-sm text-default-500">
                      {item.fromLanguage} → {item.toLanguage}
                    </div>
                    <div className="text-xs text-default-400">
                      {formatDistanceToNow(new Date(item.timestamp))} ago
                    </div>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      isIconOnly
                      variant="light"
                      size="sm"
                      onClick={() => onToggleFavorite(item.id)}
                    >
                      {item.isFavorite ? (
                        <Star className="w-4 h-4 text-warning" fill="currentColor" />
                      ) : (
                        <StarOff className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      isIconOnly
                      variant="light"
                      size="sm"
                      className="text-danger"
                      onClick={() => onDeleteItem(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 space-y-2">
                  <div className="text-sm line-clamp-2 hover:line-clamp-none">
                    <span className="font-medium">Source:</span> {item.originalText}
                  </div>
                  <div className="text-sm text-default-500 line-clamp-2 hover:line-clamp-none">
                    <span className="font-medium">Translation:</span> {item.translatedText}
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </motion.div>
  );
}
