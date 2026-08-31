import React, { useEffect, useState, useRef } from 'react';
import { apiClient } from '../../../lib/api/client';
import { connectSocket, getSocket } from '../../../lib/socket/socket';
import { useAuthStore } from '../../../lib/auth/auth-store';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import {
  MessageSquare,
  Send,
  Users,
  Paperclip,
  Smile,
  CheckCheck,
  Circle,
  Hash,
  User,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  sender?: { firstName: string; lastName: string };
  createdAt: string;
  channelId?: string;
  classroomId?: string;
}

interface ChatChannel {
  id: string;
  name: string;
  type: 'CLASS' | 'GENERAL' | 'DIRECT';
  unreadCount?: number;
  lastMessage?: string;
}

export const LiveChatPage: React.FC = () => {
  const currentUser = useAuthStore((s) => s.user);
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [activeChannel, setActiveChannel] = useState<ChatChannel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Channels and Socket
  useEffect(() => {
    const initChat = async () => {
      try {
        const [channelsRes, classroomsRes] = await Promise.all([
          apiClient.get('/chat/channels').catch(() => ({ data: [] })),
          apiClient.get('/classes/classrooms').catch(() => ({ data: [] })),
        ]);

        const classChannels: ChatChannel[] = (classroomsRes.data || []).map((c: any) => ({
          id: c.id,
          name: `کلاس ${c.name} (${c.code})`,
          type: 'CLASS',
          lastMessage: 'گفتگوی کلاسی آغاز شده است',
        }));

        const generalChannels: ChatChannel[] = (channelsRes.data || []).map((ch: any) => ({
          id: ch.id,
          name: ch.name,
          type: ch.type || 'GENERAL',
          lastMessage: ch.description,
        }));

        const allChannels = [...classChannels, ...generalChannels];
        if (allChannels.length === 0) {
          allChannels.push({
            id: 'general-school',
            name: 'کانال عمومی مدرسه رُکاد',
            type: 'GENERAL',
            lastMessage: 'به پیام‌رسان مدرسه خوش آمدید',
          });
        }

        setChannels(allChannels);
        setActiveChannel(allChannels[0]);
      } catch (err) {
        console.error('Failed to init channels', err);
      }
    };

    initChat();

    const socket = connectSocket();

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('new_message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('new_message');
    };
  }, []);

  // Fetch messages and join room when activeChannel changes
  useEffect(() => {
    if (!activeChannel) return;

    const socket = getSocket();
    if (activeChannel.type === 'CLASS') {
      socket.emit('join_classroom', { classroomId: activeChannel.id });
    } else {
      socket.emit('join_channel', { channelId: activeChannel.id });
    }

    // Load message history from REST API
    const loadHistory = async () => {
      try {
        const url =
          activeChannel.type === 'CLASS'
            ? `/chat/classroom/${activeChannel.id}/messages`
            : `/chat/channels/${activeChannel.id}/messages`;

        const res = await apiClient.get(url).catch(() => ({ data: [] }));
        if (res.data?.length > 0) {
          setMessages(res.data);
        } else {
          // Mock initial welcome messages
          setMessages([
            {
              id: 'msg-1',
              content: `به اتاق گفتگوی ${activeChannel.name} خوش آمدید!`,
              senderId: 'system',
              sender: { firstName: 'سامانه', lastName: 'رُکاد' },
              createdAt: new Date().toISOString(),
            },
          ]);
        }
      } catch (err) {
        console.error('Failed to load message history', err);
      }
    };

    loadHistory();
  }, [activeChannel]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChannel) return;

    const socket = getSocket();
    const payload = {
      content: inputText,
      channelId: activeChannel.type !== 'CLASS' ? activeChannel.id : undefined,
      classroomId: activeChannel.type === 'CLASS' ? activeChannel.id : undefined,
    };

    socket.emit('send_message', payload);

    // Optimistic UI push
    const optimisticMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      content: inputText,
      senderId: currentUser?.id || 'me',
      sender: {
        firstName: currentUser?.firstName || 'من',
        lastName: currentUser?.lastName || '',
      },
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText('');
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col md:flex-row rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      {/* Channels Sidebar */}
      <div className="w-full md:w-80 border-b md:border-b-0 md:border-l border-gray-200 flex flex-col bg-gray-50/70">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2 space-x-reverse">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-sm text-ink-darker">کانال‌ها و گروه‌ها</h3>
          </div>
          <div className="flex items-center space-x-1.5 space-x-reverse text-[11px]">
            <Circle
              className={`h-2.5 w-2.5 fill-current ${
                isConnected ? 'text-emerald-500' : 'text-rose-500'
              }`}
            />
            <span className="text-gray-500">{isConnected ? 'برخط' : 'آفلاین'}</span>
          </div>
        </div>

        {/* Channel list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {channels.map((ch) => {
            const isActive = activeChannel?.id === ch.id;

            return (
              <div
                key={ch.id}
                onClick={() => setActiveChannel(ch)}
                className={`p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between text-xs ${
                  isActive
                    ? 'bg-primary text-white font-bold shadow-sm'
                    : 'hover:bg-gray-200/60 text-ink-normal'
                }`}
              >
                <div className="flex items-center space-x-2.5 space-x-reverse overflow-hidden">
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {ch.type === 'CLASS' ? <Users className="h-4 w-4" /> : <Hash className="h-4 w-4" />}
                  </div>
                  <div className="truncate text-right">
                    <div className="truncate">{ch.name}</div>
                    <div
                      className={`text-[10px] truncate mt-0.5 ${
                        isActive ? 'text-white/80' : 'text-gray-400'
                      }`}
                    >
                      {ch.lastMessage}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Chat Box */}
      <div className="flex-1 flex flex-col justify-between bg-white">
        {/* Chat Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="h-9 w-9 rounded-xl bg-primary-light text-primary flex items-center justify-center font-bold">
              {activeChannel?.type === 'CLASS' ? <Users className="h-5 w-5" /> : <Hash className="h-5 w-5" />}
            </div>
            <div>
              <h4 className="font-bold text-sm text-ink-darker">{activeChannel?.name}</h4>
              <span className="text-[11px] text-gray-500">گفتگوی گروهی زنده با همگام‌سازی ردیس</span>
            </div>
          </div>
          <Badge variant="default">رمزنگاری‌شده</Badge>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAF8F5]/40">
          {messages.map((msg) => {
            const isMe = msg.senderId === currentUser?.id || msg.senderId === 'me';
            const isSystem = msg.senderId === 'system';

            if (isSystem) {
              return (
                <div key={msg.id} className="text-center my-4">
                  <span className="text-[11px] bg-gray-200/80 text-gray-600 px-3 py-1 rounded-full">
                    {msg.content}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center space-x-1.5 space-x-reverse text-[10px] text-gray-400 mb-1 px-1">
                  <span>{msg.sender ? `${msg.sender.firstName} ${msg.sender.lastName}` : 'کاربر'}</span>
                  <span>•</span>
                  <span>{new Date(msg.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <div
                  className={`max-w-[75%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                    isMe
                      ? 'bg-primary text-white rounded-bl-none shadow-sm'
                      : 'bg-white border border-gray-200 text-ink-darker rounded-br-none shadow-xs'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-200 bg-white flex items-center gap-2">
          <input
            type="text"
            placeholder="پیام خود را تایپ کنید..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 h-11 px-4 text-xs rounded-xl border border-gray-300 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary"
          />

          <Button type="submit" variant="primary" className="h-11 px-4">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};
