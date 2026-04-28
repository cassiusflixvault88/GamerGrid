import React, { useState } from 'react';
import axios from 'axios';
import { Send, Loader2, X, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * "Message CEO" modal — anyone (signed-in or guest) can drop Cassius a private note.
 */
const MessageCEOModal = ({ open, onClose, founderName = 'the Creator' }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (message.trim().length < 2) {
      toast({ title: 'Message too short', description: 'Add a bit more so I know how to help.', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const headers = {};
      if (user) {
        headers.Authorization = `Bearer ${localStorage.getItem('token')}`;
      }
      await axios.post(`${API}/ceo/messages`, {
        message: message.trim(),
        sender_name: name.trim() || undefined,
        sender_email: email.trim() || undefined,
      }, { headers });
      setSent(true);
      setMessage('');
      setName('');
      setEmail('');
    } catch (err) {
      toast({
        title: 'Could not send',
        description: err.response?.data?.detail || 'Try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      data-testid="message-ceo-modal"
    >
      <div
        className="bg-gradient-to-br from-gray-900 to-black border border-purple-500/30 rounded-2xl shadow-2xl max-w-lg w-full p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-white/50 hover:text-white"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Message {founderName}</h2>
            <p className="text-white/50 text-xs">Direct line — not contact support</p>
          </div>
        </div>

        {sent ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-3">✅</div>
            <p className="text-white font-bold text-lg mb-2">Message sent!</p>
            <p className="text-white/60 text-sm mb-5">{founderName} will read it personally.</p>
            <button
              onClick={() => { setSent(false); }}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-md text-sm"
              data-testid="message-ceo-send-another"
            >
              Send another
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            {!user && (
              <>
                <input
                  type="text"
                  placeholder="Your name (optional)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-md text-white placeholder-white/40 focus:outline-none focus:border-purple-500"
                  data-testid="message-ceo-name"
                />
                <input
                  type="email"
                  placeholder="Email (so they can reply)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-md text-white placeholder-white/40 focus:outline-none focus:border-purple-500"
                  data-testid="message-ceo-email"
                />
              </>
            )}
            <textarea
              placeholder="Type your message…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-md text-white placeholder-white/40 focus:outline-none focus:border-purple-500 resize-none"
              data-testid="message-ceo-textarea"
              autoFocus
              maxLength={2000}
              required
            />
            <div className="flex items-center justify-between text-xs">
              <p className="text-white/40">{message.length} / 2000</p>
              <button
                type="submit"
                disabled={busy}
                data-testid="message-ceo-submit"
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-white font-semibold rounded-md text-sm transition-all"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {busy ? 'Sending…' : 'Send'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default MessageCEOModal;
