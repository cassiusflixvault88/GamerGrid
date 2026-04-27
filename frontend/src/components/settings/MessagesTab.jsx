import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Inbox, AlertCircle, MessageCircle, Bookmark } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const MessagesTab = () => {
  const { toast } = useToast();
  const [inboxMessages, setInboxMessages] = useState([]);
  const [savedTrailerCount, setSavedTrailerCount] = useState(0);
  const [replyingToId, setReplyingToId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const loadInbox = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const r = await axios.get(`${API}/messages/inbox`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInboxMessages(r.data.messages || []);
    } catch { /* silent */ }
  }, []);

  const loadSavedTrailerCount = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const r = await axios.get(`${API}/saved-trailers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSavedTrailerCount((r.data.trailers || []).length);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    loadInbox();
    loadSavedTrailerCount();
  }, [loadInbox, loadSavedTrailerCount]);

  const markMessageRead = async (messageId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/messages/${messageId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInboxMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, read: true } : m)));
    } catch { /* silent */ }
  };

  const sendReply = async (messageId) => {
    if (!replyText.trim()) return;
    setSendingReply(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/messages/${messageId}/reply`, { text: replyText.trim() }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast({ title: 'Reply sent ✅', description: 'The admin will see it in their inbox.' });
      setReplyingToId(null);
      setReplyText('');
    } catch (e) {
      toast({
        title: 'Reply failed',
        description: e.response?.data?.detail || 'Try again',
        variant: 'destructive',
      });
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <>
      {/* Inbox / Admin Messages */}
      <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 mb-6 border border-white/10" data-testid="inbox-section">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Inbox className="w-5 h-5 text-blue-400" />
          Inbox
          {inboxMessages.some((m) => !m.read) && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
              {inboxMessages.filter((m) => !m.read).length}
            </span>
          )}
        </h2>
        {inboxMessages.length === 0 ? (
          <p className="text-white/40 text-sm">No messages yet.</p>
        ) : (
          <div className="space-y-3">
            {inboxMessages.map((m) => {
              const sevColor =
                m.severity === 'violation' ? 'border-red-500/50 bg-red-500/5'
                : m.severity === 'warning' ? 'border-yellow-500/50 bg-yellow-500/5'
                : 'border-blue-500/50 bg-blue-500/5';
              const sevIcon =
                m.severity === 'violation' ? <AlertCircle className="w-4 h-4 text-red-400" />
                : m.severity === 'warning' ? <AlertCircle className="w-4 h-4 text-yellow-400" />
                : <Inbox className="w-4 h-4 text-blue-400" />;
              const replying = replyingToId === m.id;
              return (
                <div
                  key={m.id}
                  className={`p-4 rounded-lg border ${sevColor} ${!m.read ? 'ring-1 ring-white/20' : 'opacity-90'} cursor-pointer transition-all hover:bg-white/5`}
                  onClick={() => !m.read && markMessageRead(m.id)}
                  data-testid={`inbox-message-${m.id}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {sevIcon}
                    <span className="text-white font-semibold text-sm">{m.subject}</span>
                    {!m.read && <span className="ml-auto text-xs px-2 py-0.5 bg-red-500 text-white rounded">NEW</span>}
                  </div>
                  <p className="text-white/80 text-sm whitespace-pre-wrap">{m.body}</p>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-white/40 text-xs">
                      From {m.from_admin_username} · {new Date(m.sent_at).toLocaleString()}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setReplyingToId(replying ? null : m.id);
                        setReplyText('');
                      }}
                      className="text-blue-400 hover:text-blue-300 text-xs font-semibold flex items-center gap-1"
                      data-testid={`reply-msg-${m.id}`}
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      {replying ? 'Cancel' : 'Reply'}
                    </button>
                  </div>
                  {replying && (
                    <div className="mt-3 pt-3 border-t border-white/10" onClick={(e) => e.stopPropagation()}>
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write your reply…"
                        rows={3}
                        className="w-full bg-black/40 border border-white/20 rounded-lg p-2 text-white text-sm resize-none focus:outline-none focus:border-blue-500"
                        data-testid={`reply-text-${m.id}`}
                        maxLength={2000}
                        autoFocus
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          onClick={() => { setReplyingToId(null); setReplyText(''); }}
                          className="px-3 py-1.5 text-white/60 hover:text-white text-sm"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => sendReply(m.id)}
                          disabled={!replyText.trim() || sendingReply}
                          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded"
                          data-testid={`reply-send-${m.id}`}
                        >
                          {sendingReply ? 'Sending…' : 'Send Reply'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Saved Trailers — link out to My Library */}
      <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 mb-6 border border-white/10" data-testid="saved-trailers-link">
        <h2 className="text-xl font-semibold text-white mb-1 flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-purple-400" />
          Saved Trailers
          <span className="text-white/50 text-sm font-normal ml-2">{savedTrailerCount}</span>
        </h2>
        <p className="text-white/60 text-sm mb-4">
          Saved trailers now live in your <span className="text-purple-400 font-semibold">My Library</span> alongside your saved games.
        </p>
        <a
          href="/watchlist"
          className="inline-block px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all"
          data-testid="go-to-library-from-settings"
        >
          🎬 Open My Library →
        </a>
      </div>
    </>
  );
};

export default MessagesTab;
