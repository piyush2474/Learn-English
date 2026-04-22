import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowUp, Plus, LayoutGrid, Menu } from 'lucide-react';
import { socket } from '../socket/socket';
import Sidebar from '../components/Sidebar';
import ChatBox from '../components/ChatBox';

const Home = () => {
  const [status, setStatus] = useState('Disconnected');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [roomId, setRoomId] = useState(null);
  const [userCount, setUserCount] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  // Persistent User ID
  const userId = useRef(localStorage.getItem('chat_user_id') || `user_${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    localStorage.setItem('chat_user_id', userId.current);

    if (!socket.connected) {
      socket.connect();
    }

    socket.on('connect', () => {
      const savedRoomId = sessionStorage.getItem('current_room_id');
      if (savedRoomId) {
        socket.emit('rejoin_chat', { userId: userId.current, roomId: savedRoomId });
      } else {
        setStatus('Connected');
        findNewPartner();
      }
    });

    socket.on('rejoined', (data) => {
      setStatus('Matched');
      setRoomId(data.roomId);
    });

    socket.on('partner_rejoined', () => {
      setMessages((prev) => [
        ...prev,
        { message: 'Partner is back!', senderId: 'system', timestamp: new Date().toISOString() }
      ]);
    });

    socket.on('rejoin_failed', () => {
      sessionStorage.removeItem('current_room_id');
      setStatus('Connected');
      findNewPartner();
    });

    socket.on('user_count', (count) => {
      setUserCount(count);
    });

    socket.on('waiting', () => {
      setStatus('Waiting');
      setMessages([]);
      setRoomId(null);
      sessionStorage.removeItem('current_room_id');
    });

    socket.on('matched', (data) => {
      setStatus('Matched');
      setRoomId(data.roomId);
      setMessages([]);
      sessionStorage.setItem('current_room_id', data.roomId);
    });

    socket.on('receive_message', (data) => {
      setMessages((prev) => [...prev, data]);
      setIsPartnerTyping(false);
    });

    socket.on('typing', (data) => {
      setIsPartnerTyping(data.isTyping);
    });

    socket.on('partner_disconnected', () => {
      setStatus('Disconnected');
      setMessages((prev) => [
        ...prev,
        { message: 'Stranger has disconnected.', senderId: 'system', timestamp: new Date().toISOString() }
      ]);
      setRoomId(null);
      sessionStorage.removeItem('current_room_id');
    });

    return () => {
      socket.off('connect');
      socket.off('waiting');
      socket.off('matched');
      socket.off('user_count');
      socket.off('receive_message');
      socket.off('typing');
      socket.off('partner_disconnected');
      socket.off('rejoined');
      socket.off('partner_rejoined');
      socket.off('rejoin_failed');
      socket.disconnect();
    };
  }, []);

  const findNewPartner = () => {
    socket.emit('leave_chat');
    socket.emit('find_partner', { userId: userId.current });
    setMessages([]);
    setRoomId(null);
    sessionStorage.removeItem('current_room_id');
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !roomId) return;

    const messageData = {
      message: inputText,
      roomId,
      senderId: socket.id,
      timestamp: new Date().toISOString()
    };

    socket.emit('send_message', messageData);
    setMessages((prev) => [...prev, messageData]);
    setInputText('');
    socket.emit('typing', { roomId, isTyping: false });
  };

  const handleTyping = (e) => {
    setInputText(e.target.value);
    if (!roomId) return;

    socket.emit('typing', { roomId, isTyping: true });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', { roomId, isTyping: false });
    }, 2000);
  };

  return (
    <div className="h-screen bg-[#212121] flex overflow-hidden font-sans">
      {/* ChatGPT Sidebar */}
      <Sidebar 
        status={status} 
        onNewChat={findNewPartner} 
        userCount={userCount} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-[#2f2f2f] bg-[#212121]">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-1 hover:bg-white/5 rounded-lg"
            >
              <Menu className="w-6 h-6 text-gray-400" />
            </button>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">Learn English</span>
            </div>
          </div>
          <button onClick={findNewPartner} className="p-2 hover:bg-white/5 rounded-lg">
            <Plus className="w-5 h-5 text-gray-400" />
          </button>
        </header>

        {/* Chat Interface */}
        <main className="flex-1 flex flex-col min-h-0 bg-[#212121]">
          <ChatBox 
            messages={messages} 
            isPartnerTyping={isPartnerTyping} 
            socketId={socket.id} 
            status={status}
          />
        </main>

        {/* ChatGPT Style Input Area */}
        <footer className="w-full max-w-3xl mx-auto px-4 pb-6 pt-2">
          <form 
            onSubmit={handleSendMessage}
            className="relative flex items-center bg-[#2f2f2f] rounded-[26px] border border-[#3d3d3d] focus-within:border-gray-500 transition-colors shadow-2xl"
          >
            <textarea
              rows="1"
              value={inputText}
              onChange={handleTyping}
              disabled={status !== 'Matched'}
              placeholder="Message Learn English..."
              className="w-full bg-transparent text-white px-5 py-4 pr-12 resize-none focus:outline-none min-h-[52px] max-h-48 scrollbar-hide text-[15px]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />
            <button
              type="submit"
              disabled={status !== 'Matched' || !inputText.trim()}
              className={`absolute right-2 p-1.5 rounded-xl transition-all ${
                inputText.trim() && status === 'Matched' 
                  ? 'bg-white text-black' 
                  : 'bg-[#404040] text-[#171717]'
              }`}
            >
              <ArrowUp className="w-5 h-5 stroke-[2.5]" />
            </button>
          </form>
          <p className="text-[11px] text-center text-gray-500 mt-3 font-medium">
            Learn English can help you practice conversations in real-time.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Home;
