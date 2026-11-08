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
        background: 'rgba(2, 6, 23, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
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
          background: 'linear-gradient(180deg, #0F172A 0%, #020617 100%)',
          border: '1.5px solid rgba(212, 175, 55, 0.4)',
          borderRadius: 24,
          padding: 24,
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 35px rgba(212, 175, 55, 0.2)',
          color: '#F8FAFC',
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
            background: 'rgba(255, 255, 255, 0.12)',
            border: 'none',
            color: '#E2E8F0',
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
              width: 54,
              height: 54,
              borderRadius: 14,
              border: '1px solid rgba(212, 175, 55, 0.6)',
              boxShadow: '0 4px 16px rgba(212, 175, 55, 0.3)'
            }}
          />
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#FCD34D', display: 'flex', alignItems: 'center', gap: 6 }}>
              Install Halal Scroll
              <Sparkles size={16} />
            </div>
            <div style={{ fontSize: 12.5, color: '#94A3B8', marginTop: 2 }}>
              Fast, full-screen &amp; zero browser clutter
            </div>
          </div>
        </div>

        {/* iOS Specific Instructions */}
        {isIOS ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, margin: '18px 0' }}>
            <div style={{ fontSize: 13, color: '#CBD5E1', marginBottom: 2 }}>
              Follow 3 quick steps in <strong style={{ color: '#FFFFFF' }}>Safari</strong> on your iPhone:
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: '12px 14px',
              borderRadius: 14,
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: 'rgba(212, 175, 55, 0.25)',
                color: '#FCD34D',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontWeight: 700,
                fontSize: 13
              }}>
                1
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.5, color: '#F8FAFC' }}>
                Tap the <strong style={{ color: '#FCD34D' }}>Share</strong> button <Share2 size={13} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 2px', color: '#FCD34D' }} /> in the bottom toolbar of Safari.
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: '12px 14px',
              borderRadius: 14,
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: 'rgba(212, 175, 55, 0.25)',
                color: '#FCD34D',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontWeight: 700,
                fontSize: 13
              }}>
                2
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.5, color: '#F8FAFC' }}>
                Scroll down the menu and select <strong style={{ color: '#FCD34D' }}>"Add to Home Screen"</strong> <PlusSquare size={13} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 2px', color: '#FCD34D' }} />.
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: '12px 14px',
              borderRadius: 14,
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: 'rgba(16, 185, 129, 0.25)',
                color: '#34D399',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontWeight: 700,
                fontSize: 13
              }}>
                3
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.5, color: '#F8FAFC' }}>
                Tap <strong style={{ color: '#34D399' }}>"Add"</strong> in the top-right corner. Halal Scroll will appear as a native app on your home screen!
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
                  background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                  border: 'none',
                  color: '#090A0F',
                  fontWeight: 700,
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(245, 158, 11, 0.4)'
                }}
              >
                <Download size={18} />
                Install App Now
              </button>
            ) : (
              <div style={{ fontSize: 13, color: '#E2E8F0', lineHeight: 1.5 }}>
                Tap the browser menu (<strong style={{ color: '#FCD34D' }}>⋮</strong> in Chrome) and select <strong style={{ color: '#FCD34D' }}>"Install app"</strong> or <strong style={{ color: '#FCD34D' }}>"Add to Home screen"</strong>.
              </div>
            )}
          </div>
        )}

        {/* Benefits list */}
        <div style={{
          padding: '12px 14px',
          borderRadius: 14,
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          fontSize: 12,
          color: '#CBD5E1'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#34D399', fontWeight: 600 }}>
            <CheckCircle2 size={14} />
            Why install as an App?
          </div>
          <div>• Fullscreen immersion — no browser address bars</div>
          <div>• Instant opening from your home screen / app library</div>
          <div>• High-fidelity recitation audio &amp; offline reading cache</div>
        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          style={{
            marginTop: 18,
            width: '100%',
            padding: '11px 16px',
            borderRadius: 14,
            background: 'rgba(255, 255, 255, 0.12)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            color: '#FFFFFF',
            fontSize: 13.5,
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
