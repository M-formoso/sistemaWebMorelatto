import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  id: string;
  product_id: string;
  variant_id?: string;
  name: string;
  variant_name?: string;
  price: number;
  quantity: number;
  image_url?: string;
  weight?: number;
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;

  // Actions
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  setIsOpen: (isOpen: boolean) => void;

  // Computed
  totalItems: () => number;
  totalPrice: () => number;
  totalWeight: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (item) => {
        const items = get().items;
        const existingItem = items.find(
          (i) =>
            i.product_id === item.product_id &&
            i.variant_id === item.variant_id
        );

        if (existingItem) {
          set({
            items: items.map((i) =>
              i.id === existingItem.id
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            ),
          });
        } else {
          const id = `${item.product_id}-${item.variant_id || "default"}-${Date.now()}`;
          set({ items: [...items, { ...item, id }] });
        }
      },

      removeItem: (id) => {
        set({ items: get().items.filter((item) => item.id !== id) });
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }
        set({
          items: get().items.map((item) =>
            item.id === id ? { ...item, quantity } : item
          ),
        });
      },

      clearCart: () => set({ items: [] }),

      setIsOpen: (isOpen) => set({ isOpen }),

      totalItems: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      totalPrice: () => {
        return get().items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );
      },

      totalWeight: () => {
        return get().items.reduce(
          (sum, item) => sum + (item.weight || 0) * item.quantity,
          0
        );
      },
    }),
    {
      name: "morelatto-cart",
    }
  )
);
