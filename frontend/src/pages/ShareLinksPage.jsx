import React, { useMemo, useState } from 'react';
import {
  Facebook, Twitter, Send, MessageCircle, Mail, Linkedin,
  Link as LinkIcon, Check, Share2, QrCode,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import BackNavigation from '../components/BackNavigation';
import Footer from '../components/Footer';
import { useToast } from '../hooks/use-toast';

/**
 * One-click share hub. Every button opens the platform's native share dialog
 * with GamerGrid's URL + message pre-filled — no manual copy/paste needed.
 */
const ShareLinksPage = () => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const shareUrl = useMemo(
    () => {
      const PUBLIC_DOMAIN = 'https://gamer-grid.com';
      const detected = typeof window !== 'undefined' ? window.location.origin : '';
      return (
        process.env.REACT_APP_PUBLIC_URL ||
        (detected && !/(preview|emergent\.host|emergentagent\.com)/i.test(detected) ? detected : '') ||
        PUBLIC_DOMAIN
      );
    },
    []
  );
  const shareTitle = 'GamerGrid — Ultimate Gaming Discovery Hub';
  const shareText = `🎮 Check out GamerGrid! Discover, watch trailers AND buy games (PS Store, Xbox, Steam, GameStop, Amazon) — PS5, Xbox, PC & Switch. ${shareUrl}`;

  const u = encodeURIComponent(shareUrl);
  const t = encodeURIComponent(shareText);
  const tt = encodeURIComponent(shareTitle);

  const platforms = [
    {
      key: 'facebook',
      name: 'Facebook',
      Icon: Facebook,
      bg: 'bg-[#1877F2] hover:bg-[#0e63d6]',
      url: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    },
    {
      key: 'messenger',
      name: 'Messenger',
      Icon: MessageCircle,
      bg: 'bg-[#0084FF] hover:bg-[#0069cc]',
      url: `https://www.facebook.com/dialog/send?app_id=140586622674265&link=${u}&redirect_uri=${u}`,
    },
    {
      key: 'twitter',
      name: 'X (Twitter)',
      Icon: Twitter,
      bg: 'bg-black hover:bg-gray-900',
      url: `https://twitter.com/intent/tweet?text=${t}`,
    },
    {
      key: 'reddit',
      name: 'Reddit',
      Icon: Share2,
      bg: 'bg-[#FF4500] hover:bg-[#cc3700]',
      url: `https://www.reddit.com/submit?url=${u}&title=${tt}`,
    },
    {
      key: 'whatsapp',
      name: 'WhatsApp',
      Icon: MessageCircle,
      bg: 'bg-[#25D366] hover:bg-[#1da851]',
      url: `https://wa.me/?text=${t}`,
    },
    {
      key: 'telegram',
      name: 'Telegram',
      Icon: Send,
      bg: 'bg-[#229ED9] hover:bg-[#1a7eb0]',
      url: `https://t.me/share/url?url=${u}&text=${tt}`,
    },
    {
      key: 'discord',
      name: 'Discord',
      // Discord has no direct web share intent — copies a chat-ready message
      Icon: MessageCircle,
      bg: 'bg-[#5865F2] hover:bg-[#4752c4]',
      url: 'copy',
      copyText: shareText,
      copyHint: 'Discord-ready message copied — paste it in any channel or DM.',
    },
    {
      key: 'linkedin',
      name: 'LinkedIn',
      Icon: Linkedin,
      bg: 'bg-[#0A66C2] hover:bg-[#084b91]',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    },
    {
      key: 'pinterest',
      name: 'Pinterest',
      Icon: Share2,
      bg: 'bg-[#E60023] hover:bg-[#bf001d]',
      url: `https://pinterest.com/pin/create/button/?url=${u}&description=${t}`,
    },
    {
      key: 'tumblr',
      name: 'Tumblr',
      Icon: Share2,
      bg: 'bg-[#36465D] hover:bg-[#283447]',
      url: `https://www.tumblr.com/widgets/share/tool?canonicalUrl=${u}&title=${tt}&caption=${t}`,
    },
    {
      key: 'email',
      name: 'Email',
      Icon: Mail,
      bg: 'bg-gray-700 hover:bg-gray-600',
      url: `mailto:?subject=${tt}&body=${t}`,
    },
    {
      key: 'sms',
      name: 'SMS / Text',
      Icon: MessageCircle,
      bg: 'bg-green-700 hover:bg-green-800',
      url: `sms:?&body=${t}`,
    },
  ];

  const handleClick = async (p) => {
    if (p.url === 'copy') {
      try {
        await navigator.clipboard.writeText(p.copyText);
        toast({ title: `${p.name} message copied!`, description: p.copyHint });
      } catch {
        toast({ title: 'Copy failed', variant: 'destructive' });
      }
      return;
    }
    window.open(p.url, '_blank', 'noopener,noreferrer,width=720,height=640');
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({ title: 'Link copied!', description: shareUrl });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
      } catch { /* cancelled */ }
    } else {
      toast({ title: 'Native share not supported on this device' });
    }
  };

  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${u}&bgcolor=0f172a&color=ffffff&qzone=2`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 text-white" data-testid="share-links-page">
      <Navbar />
      <BackNavigation />

      <div className="max-w-5xl mx-auto px-4 md:px-8 pt-24 pb-20">
        <div className="text-center mb-10">
          <p className="text-purple-300 text-xs font-bold tracking-widest uppercase">Help GamerGrid grow 🚀</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mt-2 bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
            Share GamerGrid
          </h1>
          <p className="text-white/70 mt-3 max-w-2xl mx-auto">
            One click, one share. Pick your platform and we'll open the share dialog with the message pre-filled — no copy/paste needed.
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          <button
            onClick={copyLink}
            data-testid="share-copy-link"
            className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl font-semibold transition-all"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <LinkIcon className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
          <button
            onClick={nativeShare}
            data-testid="share-native"
            className="flex items-center gap-2 px-5 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-semibold transition-all"
          >
            <Share2 className="w-4 h-4" />
            Open Native Share
          </button>
          <button
            onClick={() => setShowQR((v) => !v)}
            data-testid="share-toggle-qr"
            className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl font-semibold transition-all"
          >
            <QrCode className="w-4 h-4" />
            {showQR ? 'Hide QR Code' : 'Show QR Code'}
          </button>
        </div>

        {showQR && (
          <div className="flex flex-col items-center mb-10 p-6 bg-white/5 border border-white/10 rounded-2xl" data-testid="share-qr-block">
            <img src={qrSrc} alt="GamerGrid QR code" className="w-64 h-64 rounded-xl bg-white p-2" />
            <p className="text-white/60 text-sm mt-3">Scan to open GamerGrid on any phone.</p>
          </div>
        )}

        {/* Platform grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {platforms.map((p) => (
            <button
              key={p.key}
              onClick={() => handleClick(p)}
              data-testid={`share-${p.key}`}
              className={`group flex flex-col items-center justify-center gap-2 px-4 py-6 ${p.bg} text-white font-bold rounded-2xl shadow-lg transition-all hover:scale-105`}
            >
              <p.Icon className="w-7 h-7 group-hover:scale-110 transition-transform" />
              <span className="text-sm">{p.name}</span>
            </button>
          ))}
        </div>

        {/* Suggested message */}
        <div className="mt-10 p-6 bg-white/5 border border-white/10 rounded-2xl">
          <h3 className="text-lg font-bold text-white mb-2">📝 Suggested Message</h3>
          <p className="text-white/70 text-sm whitespace-pre-line">{shareText}</p>
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(shareText);
              toast({ title: 'Message copied!' });
            }}
            data-testid="share-copy-message"
            className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-semibold transition-all"
          >
            Copy Message
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ShareLinksPage;
