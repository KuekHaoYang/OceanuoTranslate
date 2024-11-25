export interface TranslationHistoryItem {
  id: string;
  fromLanguage: string;
  toLanguage: string;
  originalText: string;
  translatedText: string;
  timestamp: string;
  isFavorite: boolean;
}

export interface TranslationHistoryState {
  items: TranslationHistoryItem[];
  searchQuery: string;
  showFavoritesOnly: boolean;
}
