import React, { useState, useEffect, useRef } from 'react';

const API_BASE = 'http://localhost:5000/api';

export default function Inbox({ currentUserId, currentUserRole, preselectedPartner }) {
  const [partners, setPartners] = useState([]);
  const [activePartner, setActivePartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  
  const messagesEndRef = useRef(null);

  // Load chat partners
  const fetchPartners = async () => {
    try {
      const res = await fetch(`${API_BASE}/messages/partners?id=${currentUserId}&role=${currentUserRole}`);
      const data = await res.json();
      setPartners(data);

      if (preselectedPartner) {
        const alreadyInList = data.find(p => p.id === preselectedPartner.id);
        if (alreadyInList) {
          setActivePartner(alreadyInList);
        } else {
          const detailsUrl = preselectedPartner.role === 'freelancer' 
            ? `${API_BASE}/freelancers/${preselectedPartner.id}`
            : `${API_BASE}/recruiters`;

          const detailsRes = await fetch(detailsUrl);
          const detailsData = await detailsRes.json();
          
          let partnerItem = {};
          if (preselectedPartner.role === 'freelancer') {
            partnerItem = {
              id: detailsData.id,
              name: detailsData.name,
              title: detailsData.title,
              last_message: 'Start a new conversation...',
              last_timestamp: new Date().toISOString()
            };
          } else {
            const recruiter = Array.isArray(detailsData) 
              ? detailsData.find(r => r.id === preselectedPartner.id) 
              : detailsData;
              
            partnerItem = {
              id: recruiter.id,
              name: recruiter.name,
              company: recruiter.company,
              last_message: 'Start a new conversation...',
              last_timestamp: new Date().toISOString()
            };
          }
          
          setPartners(prev => [partnerItem, ...prev]);
          setActivePartner(partnerItem);
        }
      } else if (!activePartner && data.length > 0) {
        setActivePartner(data[0]);
      }
    } catch (e) {
      console.error('Error fetching chat partners:', e);
    }
  };

  const fetchMessages = async () => {
    if (!activePartner) return;
    try {
      const freelancerId = currentUserRole === 'freelancer' ? currentUserId : activePartner.id;
      const recruiterId = currentUserRole === 'recruiter' ? currentUserId : activePartner.id;

      const res = await fetch(`${API_BASE}/messages?freelancer_id=${freelancerId}&recruiter_id=${recruiterId}`);
      const data = await res.json();
      setMessages(data);
    } catch (e) {
      console.error('Error fetching messages:', e);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, [currentUserId, currentUserRole, preselectedPartner]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 2000);
    return () => clearInterval(interval);
  }, [activePartner]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activePartner) return;

    try {
      const freelancerId = currentUserRole === 'freelancer' ? currentUserId : activePartner.id;
      const recruiterId = currentUserRole === 'recruiter' ? currentUserId : activePartner.id;
      
      const payload = {
        sender_id: currentUserId,
        sender_role: currentUserRole,
        receiver_id: activePartner.id,
        receiver_role: currentUserRole === 'freelancer' ? 'recruiter' : 'freelancer',
        content: newMessage
      };

      const res = await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const result = await res.json();
        setMessages(prev => [...prev, {
          id: result.id,
          sender_id: currentUserId,
          sender_role: currentUserRole,
          receiver_id: activePartner.id,
          receiver_role: currentUserRole === 'freelancer' ? 'recruiter' : 'freelancer',
          content: newMessage,
          timestamp: result.timestamp
        }]);
        setNewMessage('');
        setPartners(prev => prev.map(p => {
          if (p.id === activePartner.id) {
            return {
              ...p,
              last_message: newMessage,
              last_timestamp: result.timestamp
            };
          }
          return p;
        }));
      }
    } catch (e) {
      console.error('Error sending message:', e);
    }
  };

  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="glass-panel chat-container">
      {/* Sidebar - Contacts */}
      <div className="chat-sidebar">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)' }}>
          <h3>Conversations</h3>
        </div>
        {partners.length === 0 ? (
          <div className="empty-state" style={{ fontSize: '0.85rem' }}>
            No messages yet. Match with profiles to start chatting!
          </div>
        ) : (
          partners.map(p => {
            const pRole = p.role || (currentUserRole === 'freelancer' ? 'recruiter' : 'freelancer');
            const activeRole = activePartner && (activePartner.role || (currentUserRole === 'freelancer' ? 'recruiter' : 'freelancer'));
            const isActive = activePartner && activePartner.id === p.id && activeRole === pRole;
            return (
              <div 
                key={`${p.id}-${pRole}`} 
                className={`chat-partner-item ${isActive ? 'active' : ''}`}
                onClick={() => setActivePartner(p)}
              >
                <div className="partner-header">
                  <span>{p.name}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                    {formatTime(p.timestamp || p.last_timestamp)}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--secondary)' }}>
                  {p.company ? p.company : p.title}
                </div>
                <div className="partner-preview">
                  {p.lastMessage || p.last_message}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Chat Area */}
      <div className="chat-main">
        {activePartner ? (
          <>
            <div className="chat-header">
              <div>
                <h3>{activePartner.name}</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {activePartner.company ? `Recruiter at ${activePartner.company}` : activePartner.title}
                </span>
              </div>
              <span className="badge badge-match">
                Online
              </span>
            </div>

            <div className="chat-messages">
              {messages.length === 0 ? (
                <div className="empty-state">
                  <p>Send a message to introduce yourself and establish connection parameters.</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isSentByMe = msg.sender_role === currentUserRole && msg.sender_id === currentUserId;
                  return (
                    <div 
                      key={msg.id} 
                      className={`msg-bubble ${isSentByMe ? 'sent' : 'received'}`}
                    >
                      <div>{msg.content}</div>
                      <div className="msg-time">{formatTime(msg.timestamp)}</div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="chat-input-area">
              <input 
                type="text" 
                className="form-control" 
                placeholder="Type your message here..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <button type="submit" className="btn btn-primary">
                Send
              </button>
            </form>
          </>
        ) : (
          <div className="empty-state" style={{ margin: 'auto' }}>
            <h3>No conversation selected</h3>
            <p>Choose a thread from the sidebar or apply to projects to initiate contact.</p>
          </div>
        )}
      </div>
    </div>
  );
}
