import React from 'react';
import { X, Share2, PlusSquare, Download, CheckCircle2, Sparkles, Smartphone } from 'lucide-react';

interface InstallAppModalProps {
  onClose: () => void;
  deferredPrompt: any;
  onInstalled?: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  onClose,
  deferredPrompt,
  onInstalled
}) => {
  const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());

  const handleNativePrompt = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      if (onInstalled) onInstalled();
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(3, 7, 18, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'linear-gradient(180deg, rgba(17, 24, 39, 0.98), rgba(6, 19, 26, 0.98))',
          border: '1px solid var(--border-gold)',
          borderRadius: 24,
          padding: 24,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75), 0 0 40px rgba(212, 175, 55, 0.15)',
          color: 'var(--text-primary)',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 32,
            height: 32,
            borderRadius: 999,
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Icon & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <img
            src="/icons/icon-180.png"
            alt="Halal Scroll App Icon"
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              border: '1px solid var(--border-gold)',
              boxShadow: '0 4px 14px rgba(212, 175, 55, 0.25)'
            }}
          />
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-gold-bright)', display: 'flex', alignItems: 'center', gap: 6 }}>
              Install Halal Scroll
              <Sparkles size={16} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              Fast, offline-ready &amp; zero browser clutter
            </div>
          </div>
        </div>

        {/* iOS Specific Instructions */}
        {isIOS ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, margin: '18px 0' }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 2 }}>
              Follow 3 quick steps in <strong>Safari</strong> on your iPhone:
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: '10px 12px',
              borderRadius: 14,
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: 'rgba(212, 175, 55, 0.2)',
                color: 'var(--accent-gold-bright)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontWeight: 700,
                fontSize: 13
              }}>
                1
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.4 }}>
                Tap the <strong>Share</strong> button <Share2 size={13} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 2px' }} /> in the bottom bar of Safari.
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: '10px 12px',
              borderRadius: 14,
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: 'rgba(212, 175, 55, 0.2)',
                color: 'var(--accent-gold-bright)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontWeight: 700,
                fontSize: 13
              }}>
                2
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.4 }}>
                Scroll down the sheet and select <strong>"Add to Home Screen"</strong> <PlusSquare size={13} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 2px' }} />.
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: '10px 12px',
              borderRadius: 14,
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: 'rgba(16, 185, 129, 0.2)',
                color: 'var(--accent-emerald)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontWeight: 700,
                fontSize: 13
              }}>
                3
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.4 }}>
                Tap <strong>"Add"</strong> in the top-right corner. Halal Scroll will appear as a native app on your home screen!
              </div>
            </div>
          </div>
        ) : (
          /* Android / Desktop Instructions */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, margin: '18px 0' }}>
            {deferredPrompt ? (
              <button
                onClick={handleNativePrompt}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, var(--accent-gold), #d97706)',
                  border: 'none',
                  color: '#090A0F',
                  fontWeight: 700,
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(212, 175, 55, 0.35)'
                }}
              >
                <Download size={18} />
                Install App Now
              </button>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Tap the browser menu (<strong>⋮</strong> in Chrome) and select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
              </div>
            )}
          </div>
        )}

        {/* Benefits list */}
        <div style={{
          padding: '10px 14px',
          borderRadius: 12,
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          fontSize: 11.5,
          color: 'var(--text-secondary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-emerald)', fontWeight: 600 }}>
            <CheckCircle2 size={13} />
            Why install as an App?
          </div>
          <div>• Fullscreen immersion — no browser bars or distractions</div>
          <div>• Instant opening from your home screen / app library</div>
          <div>• High fidelity reciter audio &amp; offline reading cache</div>
        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          style={{
            marginTop: 18,
            width: '100%',
            padding: '10px 14px',
            borderRadius: 12,
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: 'var(--text-primary)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          {isIOS ? 'Got It' : 'Close'}
        </button>
      </div>
    </div>
  );
};
