import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import '../toastAnimations.css';

const ICON_MAP = {
  success: <CheckCircle2 size={20} />,
  error: <XCircle size={20} />,
  warning: <AlertTriangle size={20} />,
  info: <Info size={20} />,
};

export default function ToastContainer() {
  const { toastQueue, removeToast } = useAppContext();

  return (
    <div className="toast-container">
      {toastQueue.map((toast) => (
        <div 
          key={toast.id} 
          className={`toast glass-panel toast-${toast.type || 'info'}`}
        >
          <div className="toast-icon">
            {ICON_MAP[toast.type] || <Info size={20} />}
          </div>
          <div className="toast-content">
            <p className="toast-message">{toast.message}</p>
          </div>
          <button 
            className="toast-close" 
            onClick={() => removeToast(toast.id)}
            aria-label="Close toast"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
