import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertTriangle, 
  Trash2, 
  RefreshCw, 
  ShieldAlert, 
  UserMinus, 
  X, 
  Check,
  Info
} from 'lucide-react';

export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: React.ReactNode;
  subNote?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  intent?: 'danger' | 'warning' | 'info';
  icon?: 'trash' | 'alert' | 'refresh' | 'shield' | 'user-minus' | 'info';
  itemName?: string;
  itemCode?: string;
  itemBadge?: string;
  itemDetails?: { label: string; value: string }[];
  requireTypingVerification?: string;
  isLoading?: boolean;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  subNote,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant,
  intent = 'danger',
  icon,
  itemName,
  itemCode,
  itemBadge,
  itemDetails,
  requireTypingVerification,
  isLoading = false
}) => {
  const activeVariant = variant || intent;
  const badgeCode = itemBadge || itemCode;

  const [typedVerification, setTypedVerification] = useState('');
  const [internalLoading, setInternalLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTypedVerification('');
      setInternalLoading(false);
    }
  }, [isOpen]);

  const isConfirmedDisabled = 
    (Boolean(requireTypingVerification) && typedVerification.trim() !== requireTypingVerification?.trim()) ||
    isLoading ||
    internalLoading;

  const handleConfirm = async () => {
    if (isConfirmedDisabled) return;
    try {
      setInternalLoading(true);
      await onConfirm();
    } finally {
      setInternalLoading(false);
      onClose();
    }
  };

  const getIcon = () => {
    if (icon === 'trash') return <Trash2 className="w-5 h-5 text-red-500" />;
    if (icon === 'refresh') return <RefreshCw className="w-5 h-5 text-amber-500" />;
    if (icon === 'shield') return <ShieldAlert className="w-5 h-5 text-red-500" />;
    if (icon === 'user-minus') return <UserMinus className="w-5 h-5 text-orange-500" />;
    if (icon === 'info') return <Info className="w-5 h-5 text-blue-500" />;

    if (activeVariant === 'danger') return <Trash2 className="w-5 h-5 text-red-500" />;
    if (activeVariant === 'warning') return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    return <Info className="w-5 h-5 text-emerald-500" />;
  };

  const getBadgeStyle = () => {
    switch (activeVariant) {
      case 'danger':
        return 'bg-red-500/10 text-red-500 border border-red-500/20';
      case 'warning':
        return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
      case 'info':
      default:
        return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
    }
  };

  const getConfirmBtnStyle = () => {
    if (isConfirmedDisabled) {
      return 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed';
    }
    switch (activeVariant) {
      case 'danger':
        return 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 cursor-pointer active:scale-98';
      case 'warning':
        return 'bg-amber-500 hover:bg-amber-600 text-black shadow-lg shadow-amber-500/20 cursor-pointer active:scale-98';
      case 'info':
      default:
        return 'bg-emerald-500 hover:bg-emerald-600 text-black shadow-lg shadow-emerald-500/20 cursor-pointer active:scale-98';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirmation-dialog-title"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl overflow-hidden z-10 text-left space-y-5"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              type="button"
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header Icon + Title */}
            <div className="flex items-start gap-3.5 pr-8">
              <div className={`p-2.5 rounded-2xl shrink-0 ${getBadgeStyle()}`}>
                {getIcon()}
              </div>
              <div className="min-w-0">
                <h3 
                  id="confirmation-dialog-title" 
                  className="font-black text-base text-zinc-900 dark:text-zinc-100 tracking-tight"
                >
                  {title}
                </h3>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  {description}
                </div>
              </div>
            </div>

            {/* Item Target Highlight Card (if specified) */}
            {(itemName || badgeCode || (itemDetails && itemDetails.length > 0)) && (
              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 space-y-2">
                {(itemName || badgeCode) && (
                  <div className="flex items-center gap-2">
                    {badgeCode && (
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 shrink-0">
                        {badgeCode}
                      </span>
                    )}
                    {itemName && (
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                        {itemName}
                      </span>
                    )}
                  </div>
                )}

                {itemDetails && itemDetails.length > 0 && (
                  <div className="space-y-1.5 pt-1 text-[11px]">
                    {itemDetails.map((detail, idx) => (
                      <div key={idx} className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                        <span>{detail.label}</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">{detail.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {subNote && (
              <p className="text-[11px] text-zinc-400 italic bg-zinc-50 dark:bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-900">
                {subNote}
              </p>
            )}

            {/* Verification input if required (e.g. for System Reset) */}
            {requireTypingVerification && (
              <div className="space-y-1.5 pt-1">
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                  Type <span className="font-mono font-black text-red-500">{requireTypingVerification}</span> to confirm:
                </label>
                <input
                  type="text"
                  value={typedVerification}
                  onChange={(e) => setTypedVerification(e.target.value)}
                  placeholder={`Type "${requireTypingVerification}"`}
                  className="w-full px-3 py-2 text-xs font-mono font-bold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-red-500 dark:focus:border-red-500 text-zinc-900 dark:text-zinc-100"
                />
              </div>
            )}

            {/* Actions Footer */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-900">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading || internalLoading}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer disabled:opacity-50"
              >
                {cancelText}
              </button>
              
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isConfirmedDisabled}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${getConfirmBtnStyle()}`}
              >
                {(isLoading || internalLoading) ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    {activeVariant === 'danger' ? <Trash2 className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                    <span>{confirmText}</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmationDialog;
