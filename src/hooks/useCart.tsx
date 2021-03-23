import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

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
      const [product, stock] = await Promise.all([
        api.get(`products/${productId}`),
        api.get(`stock/${productId}`)
      ]);

      const { data: productResponse} = product;
      const { data: availableStock } = stock;

      if (availableStock.amount < 1) {
        throw new Error();
      }

      if (productId !== productResponse.id) {
        toast.error('Erro na adição do produto');
        return;
      }
  

      const productExistIncCart = cart.some(product => product.id === productId);
      if (!productExistIncCart) {
        const addNewProductToCart = {
          ...productResponse,
          amount: 1,
        }

        setCart([...cart, addNewProductToCart]);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, addNewProductToCart]))
        await api.put(`stock/${productId}`, {amount: availableStock.amount-=1});
        return;
      }

      const addAmount = cart.map(product => product.id === productId ? {
        ...product,
        amount: product.amount+=1,
      } : product);

     setCart(addAmount);
     localStorage.setItem('@RocketShoes:cart', JSON.stringify(addAmount))
     await api.put(`stock/${productId}`, {amount: availableStock.amount-=1}); 
      
    } catch {
      toast.error('Erro na adição do produto');
      toast.error('Quantidade solicitada fora de estoque');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const existProduct = cart.some(product => product.id === productId);
      if (!existProduct) {
        toast.error('Erro na remoção do produto');
        return;
      }

      const removeProductFromCart = cart.filter(product => product.id !== productId);

      setCart(removeProductFromCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(removeProductFromCart))
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) { 
        return;
      }

      const { data: stockQuantity } = await api.get(`stock/${productId}`);

      if (stockQuantity.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const addAmount = cart.map(product => product.id === productId ? {
        ...product,
        amount,
      } : product);

     setCart(addAmount);
     localStorage.setItem('@RocketShoes:cart', JSON.stringify(addAmount))
     await api.put(`stock/${productId}`, {amount,}); 

    } catch {
      toast.error('Erro na alteração de quantidade do produto')
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
