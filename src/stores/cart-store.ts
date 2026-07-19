import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface SelectedAddon {
  groupId: string
  groupName: string
  optionId: string
  optionName: string
  additionalPrice: number
}

export interface CartItem {
  cartItemId: string       // unique per cart entry
  productId: string
  productName: string
  productPrice: number
  imageUrl: string | null
  quantity: number
  selectedAddons: SelectedAddon[]
  notes: string
  unitPrice: number        // base price + addons per unit
  subtotal: number         // unitPrice * quantity
}

interface CartStore {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'cartItemId'>) => void
  updateQuantity: (cartItemId: string, quantity: number) => void
  removeItem: (cartItemId: string) => void
  clearCart: () => void
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],

      addItem: (item) =>
        set((state) => ({
          items: [
            ...state.items,
            {
              ...item,
              cartItemId: `${item.productId}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            },
          ],
        })),

      updateQuantity: (cartItemId, quantity) =>
        set((state) => ({
          items: state.items
            .map((item) =>
              item.cartItemId === cartItemId
                ? { ...item, quantity, subtotal: item.unitPrice * quantity }
                : item
            )
            .filter((item) => item.quantity > 0),
        })),

      removeItem: (cartItemId) =>
        set((state) => ({
          items: state.items.filter((item) => item.cartItemId !== cartItemId),
        })),

      clearCart: () => set({ items: [] }),
    }),
    { name: 'ordertee-cart' }
  )
)

// Selectors
export const selectCartTotal = (state: CartStore) =>
  state.items.reduce((sum, item) => sum + item.subtotal, 0)

export const selectCartItemCount = (state: CartStore) =>
  state.items.reduce((sum, item) => sum + item.quantity, 0)
