import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productAlreadyOnCart = cart.find(product => product.id === productId);
      const stockResponse = await api.get(`/stock/${productId}`);
      const stock = stockResponse.data;

      let updatedCart;

      if (productAlreadyOnCart) {
        if (stock.amount < productAlreadyOnCart.amount + 1) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        updatedCart = cart.map(product => product.id === productId
          ? ({ ...product, amount: product.amount + 1 })
          : product
        )
      } else {
        if (stock.amount < 1) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        const productsResponse = await api.get(`/products/${productId}`);
        const product = productsResponse.data;

        updatedCart = [...cart, { ...product, amount: 1 }]
      }

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      setCart(updatedCart)
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if (!cart.find(product => product.id === productId)) {
        toast.error('Erro na remoção do produto');
        return;
      }

      const updatedCart = cart.filter(product => product.id !== productId);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      setCart(updatedCart)
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const stockResponse = await api.get(`/stock/${productId}`);
      const stock = stockResponse.data;

      if (stock.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = cart.map(product => product.id === productId
        ? ({ ...product, amount })
        : product
      )


      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      setCart(updatedCart)
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
