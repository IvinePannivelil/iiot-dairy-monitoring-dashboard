import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!e.altKey) return;

      switch (e.key) {
        case '1':
          e.preventDefault();
          navigate('/');
          break;
        case '2':
          e.preventDefault();
          navigate('/reception');
          break;
        case '3':
          e.preventDefault();
          navigate('/pasteurizer');
          break;
        case '4':
          e.preventDefault();
          navigate('/cip');
          break;
        case '5':
          e.preventDefault();
          navigate('/analytics');
          break;
        case '6':
          e.preventDefault();
          navigate('/reports');
          break;
        case '7':
          e.preventDefault();
          navigate('/manual');
          break;
        case '8':
          e.preventDefault();
          navigate('/alarms');
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate]);
}
