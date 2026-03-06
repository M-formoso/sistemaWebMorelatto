import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface FavoriteItem {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  slug?: string;
}

interface FavoritesStore {
  items: FavoriteItem[];

  // Actions
  addFavorite: (item: FavoriteItem) => void;
  removeFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (item: FavoriteItem) => void;
  clearFavorites: () => void;
}

export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      items: [],

      addFavorite: (item) => {
        const items = get().items;
        if (!items.find((i) => i.id === item.id)) {
          set({ items: [...items, item] });
        }
      },

      removeFavorite: (id) => {
        set({ items: get().items.filter((item) => item.id !== id) });
      },

      isFavorite: (id) => {
        return get().items.some((item) => item.id === id);
      },

      toggleFavorite: (item) => {
        const isFav = get().isFavorite(item.id);
        if (isFav) {
          get().removeFavorite(item.id);
        } else {
          get().addFavorite(item);
        }
      },

      clearFavorites: () => set({ items: [] }),
    }),
    {
      name: "morelatto-favorites",
    }
  )
);
