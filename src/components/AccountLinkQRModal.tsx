import React from 'react';
import { QrCode, Smartphone, CheckCircle2, Copy, RefreshCw, X, ShieldCheck, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createSessionLinkInFirestore, listenToSessionLink, claimSessionLinkFromFirestore } from '../lib/firestoreSync';
import { parseSessionToken } from '../lib/authUtils';

interface AccountLinkQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: any;
  isOffline: boolean;
  onSessionClaimed?: (claimedProfile: any) => void;
}

export default function AccountLinkQRModal({
  isOpen,
  onClose,
  userProfile,
  isOffline,
  onSessionClaimed
}: AccountLinkQRModalProps) {
  const [activeTab, setActiveTab] = React.useState<'generate' | 'scan'>('generate');
  const [tokenData, setTokenData] = React.useState<{ tokenId: string; payload: any; encodedPayload: string } | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isClaimed, setIsClaimed] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  // Scan state
  const [scanCodeInput, setScanCodeInput] = React.useState('');
  const [isScanning, setIsScanning] = React.useState(false);
  const [scanError, setScanError] = React.useState<string | null>(null);
  const [claimedUser, setClaimedUser] = React.useState<any | null>(null);

  // Generate QR code on open
  React.useEffect(() => {
    if (isOpen && !isOffline && activeTab === 'generate') {
      handleGenerate();
    }
  }, [isOpen, isOffline, activeTab]);

  // Listen to claims on desktop
  React.useEffect(() => {
    if (!tokenData?.tokenId || isOffline) return;

    const unsubscribe = listenToSessionLink(isOffline, tokenData.tokenId, (claimedData) => {
      setIsClaimed(true);
      if (onSessionClaimed && claimedData.claimedByDevice) {
        onSessionClaimed(claimedData.userProfile);
      }
    });

    return () => unsubscribe();
  }, [tokenData?.tokenId, isOffline]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setIsClaimed(false);
    const data = await createSessionLinkInFirestore(isOffline, userProfile);
    setTokenData(data);
    setIsGenerating(false);
  };

  const handleManualClaim = async () => {
    if (!scanCodeInput.trim()) return;
    setIsScanning(true);
    setScanError(null);

    let tokenIdToClaim = scanCodeInput.trim();
    // Check if user pasted full URL or encoded token
    if (tokenIdToClaim.includes('session_token=')) {
      const match = tokenIdToClaim.match(/session_token=([^&]+)/);
      if (match) tokenIdToClaim = match[1];
    } else if (tokenIdToClaim.startsWith('lnk_')) {
      // standard token ID
    } else {
      // Try decoding base64 payload
      const decoded = parseSessionToken(tokenIdToClaim);
      if (decoded?.tokenId) {
        tokenIdToClaim = decoded.tokenId;
      }
    }

    const claimed = await claimSessionLinkFromFirestore(isOffline, tokenIdToClaim);
    setIsScanning(false);

    if (claimed) {
      setClaimedUser(claimed);
      if (onSessionClaimed) {
        onSessionClaimed(claimed);
      }
    } else {
      setScanError("Invalid or expired session QR code. Please generate a new QR code on desktop.");
    }
  };

  if (!isOpen) return null;

  const appUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
  const qrUrl = tokenData ? `${appUrl}?session_token=${tokenData.tokenId}` : '';
  const qrImageSrc = qrUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrUrl)}&color=059669` : '';

  const handleCopyLink = () => {
    if (!qrUrl) return;
    navigator.clipboard.writeText(qrUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden text-left"
        >
          {/* Modal Header */}
          <div className="p-5 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">Account Link QR</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Bridge session across Desktop & Mobile</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Tabs */}
          <div className="p-2 bg-zinc-100/70 dark:bg-zinc-800/50 flex gap-1 mx-5 mt-4 rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50">
            <button
              onClick={() => setActiveTab('generate')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'generate'
                  ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              Display QR (Desktop)
            </button>
            <button
              onClick={() => setActiveTab('scan')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'scan'
                  ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Scan QR (Mobile)
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            {isOffline ? (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-300 text-xs font-medium text-center">
                ⚠️ Account Link QR requires an active cloud connection to bridge session tokens across devices.
              </div>
            ) : activeTab === 'generate' ? (
              <div className="text-center space-y-4">
                {isClaimed ? (
                  <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-center space-y-2 animate-scale-in">
                    <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500" />
                    <h4 className="text-sm font-black">Mobile Device Linked!</h4>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300">
                      Session successfully transferred to your mobile device. You are now logged in as <strong>{userProfile?.name}</strong>.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="relative inline-block p-4 bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-md">
                      {isGenerating ? (
                        <div className="w-48 h-48 flex items-center justify-center text-zinc-400">
                          <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
                        </div>
                      ) : qrImageSrc ? (
                        <img
                          src={qrImageSrc}
                          alt="Account Link QR"
                          className="w-48 h-48 rounded-xl object-contain mx-auto"
                        />
                      ) : null}
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        Scan with Mobile Camera or App
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
                        Open ClassPulse on your smartphone and scan this code to instant-sync your session without entering credentials.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="text"
                        readOnly
                        value={qrUrl}
                        className="flex-1 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-[11px] font-mono text-zinc-600 dark:text-zinc-400 outline-none"
                      />
                      <button
                        onClick={handleCopyLink}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500 text-black text-xs font-bold hover:bg-emerald-400 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* Scan / Claim Tab */
              <div className="space-y-4">
                {claimedUser ? (
                  <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-3">
                    <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto" />
                    <div>
                      <h4 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">Session Claimed Successfully!</h4>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                        Logged in as <strong>{claimedUser.name}</strong> ({claimedUser.role})
                      </p>
                    </div>
                    <button
                      onClick={onClose}
                      className="w-full py-2 bg-emerald-500 text-black font-extrabold rounded-xl text-xs hover:bg-emerald-400 transition-colors cursor-pointer"
                    >
                      Continue to Portal
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        <Camera className="w-4 h-4 text-emerald-500" />
                        Pasted Token or QR Code
                      </div>
                      <input
                        type="text"
                        placeholder="Paste session token or URL here..."
                        value={scanCodeInput}
                        onChange={(e) => setScanCodeInput(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                      />
                      {scanError && (
                        <p className="text-[11px] font-medium text-red-500">{scanError}</p>
                      )}
                      <button
                        onClick={handleManualClaim}
                        disabled={isScanning || !scanCodeInput.trim()}
                        className="w-full py-2.5 rounded-xl bg-emerald-500 text-black font-extrabold text-xs hover:bg-emerald-400 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isScanning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Smartphone className="w-3.5 h-3.5" />}
                        Sync Session to Mobile
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
