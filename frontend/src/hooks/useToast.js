import { useAppContext } from '../context/AppContext';

export function useToast() {
  const { addToast } = useAppContext();
  return { addToast };
}
