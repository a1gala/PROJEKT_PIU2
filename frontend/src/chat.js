import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './chat.css';

// Reaction types
const REACTIONS = [
    { type: 'like', emoji: '👍' },
    { type: 'love', emoji: '❤️' },
    { type: 'laugh', emoji: '😂' }
];

function Chat() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [activeUser, setActiveUser] = useState(null);
    const [userOnlineStatus, setUserOnlineStatus] = useState({});
    const [messageReactions, setMessageReactions] = useState({}); // { messageId: [ {user_id, reaction, ...}, ... ] }
    const currentUser = JSON.parse(localStorage.getItem('user'));
    const ws = useRef(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        const fetchUsersAndStatus = async () => {
            try {
                const response = await fetch("http://localhost:3080/api/users",{
                    credentials: 'include',
                });
                if (response.ok) {
                    const data = await response.json();
                    const filteredData = data.filter(user => user.id !== currentUser.userId);
                    setUsers(filteredData);
                    setFilteredUsers(filteredData);

                    const status = {};
                    for (let user of filteredData) {
                        const statusResponse = await fetch(`http://localhost:3080/api/isonline/${user.id}`);
                        if (statusResponse.ok) {
                            const onlineData = await statusResponse.json();
                            status[user.id] = onlineData.isOnline;
                        }
                    }
                    setUserOnlineStatus(status);
                }
            } catch (error) {
                console.error("Error fetching users or status:", error);
            }
        };

        fetchUsersAndStatus();
        const interval = setInterval(fetchUsersAndStatus, 10000);
        return () => clearInterval(interval);
    }, [currentUser.userId]);

    useEffect(() => {
        if (activeUser) {
            const fetchMessages = async () => {
                try {
                    const response = await fetch(`http://localhost:3080/messages/${currentUser.userId}/${activeUser.id}`, {
                        credentials: 'include',
                    });
                    const data = await response.json();
                    if (data && Array.isArray(data.messages)) {
                        const transformedMessages = data.messages.map(msg => ({
                            ...msg,
                            senderId: msg.sender_id,
                            receiverId: msg.receiver_id,
                            timestamp: msg.timestamp,
                        }));
                        setMessages(transformedMessages);
                    } else {
                        setMessages([]);
                    }
                } catch (error) {
                    console.error('Error fetching messages:', error);
                }
            };
            fetchMessages();
        }
    }, [activeUser, currentUser.userId]);

    useEffect(() => {
        ws.current = new WebSocket('ws://localhost:3080');

        ws.current.onopen = () => {
            console.log('WebSocket connected');
            // Zarejestruj użytkownika w WebSocket
            ws.current.send(JSON.stringify({
                type: 'register',
                userId: currentUser.userId
            }));
        };

        ws.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            if (data.type === 'reaction_update') {
                // Aktualizuj reakcje dla konkretnej wiadomości
                setMessageReactions(prev => ({
                    ...prev,
                    [data.message_id]: data.reactions
                }));
            } else {
                // To jest nowa wiadomość
                setMessages((prevMessages) => {
                    // Dodaj tylko jeśli nie istnieje już wiadomość o tym samym id
                    if (data.id && prevMessages.some(msg => msg.id === data.id)) {
                        return prevMessages;
                    }
                    return [...prevMessages, data];
                });
            }
        };

        ws.current.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, [currentUser.userId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Fetch reactions for all messages when messages change
    useEffect(() => {
        const fetchReactions = async () => {
            if (!activeUser || messages.length === 0) return;
            
            const reactionsObj = {};
            for (const msg of messages) {
                try {
                    const res = await fetch(`http://localhost:3080/api/message-reactions/${msg.id}`, {
                        credentials: 'include',
                    });
                    if (res.ok) {
                        const data = await res.json();
                        reactionsObj[msg.id] = data || [];
                    }
                } catch (e) {
                    console.error('Error fetching reactions for message', msg.id, e);
                }
            }
            setMessageReactions(reactionsObj);
        };
        
        fetchReactions();
    }, [messages, activeUser]);

    // Add or remove reaction
    const handleReaction = async (messageId, reactionType) => {
        const userId = currentUser.userId;
        const reactions = messageReactions[messageId] || [];
        const myReaction = reactions.find(r => r.user_id === userId);
        
        try {
            if (myReaction && myReaction.reaction === reactionType) {
                // Remove reaction if clicking the same one
                await fetch('http://localhost:3080/api/message-reactions', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message_id: messageId, user_id: userId, reaction: reactionType }),
                    credentials: 'include',
                });
            } else {
                // Add new reaction (backend automatically removes old ones)
                await fetch('http://localhost:3080/api/message-reactions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message_id: messageId, user_id: userId, reaction: reactionType }),
                    credentials: 'include',
                });
            }
            
            // Reakcje zostaną zaktualizowane automatycznie przez WebSocket
        } catch (err) {
            console.error('Error handling reaction:', err);
            // W przypadku błędu, odśwież reakcje ręcznie
            try {
                const res = await fetch(`http://localhost:3080/api/message-reactions/${messageId}`, {
                    credentials: 'include',
                });
                if (res.ok) {
                    const data = await res.json();
                    setMessageReactions(prev => ({ ...prev, [messageId]: data || [] }));
                }
            } catch (e) {
                console.error('Error fetching reactions:', e);
            }
        }
    };

    const handleSendMessage = async () => {
        if (message && activeUser) {
            const timestamp = new Date().toISOString();

            const newMessage = {
                senderId: currentUser.userId,
                receiverId: activeUser.id,
                content: message,
                timestamp,
            };

            try {
                const response = await fetch('http://localhost:3080/messages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newMessage),
                    credentials: 'include',
                });

                if (response.ok) {
                    // ws.current.send(JSON.stringify(newMessage)); // USUNIĘTE! Backend sam rozsyła wiadomość przez WebSocket
                    setMessage('');
                    scrollToBottom();
                } else {
                    console.error('Failed to send message:', response.statusText);
                }
            } catch (error) {
                console.error('Error sending message:', error);
            }
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    };

    const handleSearch = (e) => {
        const query = e.target.value.toLowerCase();
        setFilteredUsers(users.filter(user => user.email.toLowerCase().includes(query)));
    };

    const isUsersLoaded = users.length > 0;

    // Funkcja do grupowania reakcji według typu
    const groupReactionsByType = (reactions) => {
        const grouped = {};
        reactions.forEach(reaction => {
            if (!grouped[reaction.reaction]) {
                grouped[reaction.reaction] = [];
            }
            grouped[reaction.reaction].push(reaction);
        });
        return grouped;
    };

    return (
        <div className="chat-container">
            <div className="user-list">
                <div className="search">
                    <input
                        type="text"
                        placeholder="Wyszukaj użytkowników"
                        onChange={handleSearch}
                    />
                </div>
                <div className="users">
                    {filteredUsers.map(user => (
                        <div
                            key={user.id}
                            className="user"
                            onClick={() => setActiveUser(user)}
                        >
                            <div className="status-dot">
                                <span className={`dot ${userOnlineStatus[user.id] ? 'online-dot' : 'offline-dot'}`}></span>
                            </div>
                            <img src={user.image} alt={user.email} className="user-image" />
                            <div className="user-info">
                                <span>{user.imie + ' ' + user.nazwisko}</span>
                                <span className={`status ${userOnlineStatus[user.id] ? 'online' : 'offline'}`}>
                                    {userOnlineStatus[user.id] ? 'Dostępny' : 'Niedostępny'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="chat-box">
                {activeUser ? (
                    <>
                        <div className="chat-header">
                            <img src={activeUser.image} alt={activeUser.email} className="user-image-onscreen" />
                            <h2>
                                Czatujesz z {activeUser.imie + ' ' + activeUser.nazwisko} ({activeUser.email})
                            </h2>
                            <span className="status">{userOnlineStatus[activeUser.id] ? 'Dostępny' : 'Niedostępny'}</span>
                        </div>

                        <div className="messages">
                            {isUsersLoaded ? (
                                messages.map((msg, index) => {
                                    const sender = users.find(user => user.id === msg.senderId);
                                    const isSentByCurrentUser = msg.senderId === currentUser.userId;
                                    const reactions = messageReactions[msg.id] || [];
                                    const myReaction = reactions.find(rx => rx.user_id === currentUser.userId);
                                    const groupedReactions = groupReactionsByType(reactions);
                                    
                                    return (
                                        <div key={index} className={`message ${isSentByCurrentUser ? 'sent' : 'received'}`}
                                            style={{ position: 'relative' }}>
                                            {isSentByCurrentUser || sender ? (
                                                <div className="message-sender">
                                                    <span className="sender-name">
                                                        {isSentByCurrentUser
                                                            ? 'Ty'
                                                            : sender?.imie + ' ' + sender?.nazwisko || 'Unknown sender'}
                                                    </span>
                                                </div>
                                            ) : null}
                                            <div className="message-text">{msg.content}</div>
                                            <div className="message-time">{new Date(msg.timestamp).toLocaleTimeString()}</div>
                                            
                                            {/* Reactions UI */}
                                            <div className="message-reactions">
                                                {/* Pokaż istniejące reakcje z licznikami */}
                                                {Object.entries(groupedReactions).map(([reactionType, reactionList]) => {
                                                    const reactionEmoji = REACTIONS.find(r => r.type === reactionType)?.emoji || reactionType;
                                                    const hasMyReaction = reactionList.some(r => r.user_id === currentUser.userId);
                                                    const count = reactionList.length;
                                                    
                                                    // Określ, czy to reakcja zostawiona tylko przez mnie, tylko przez innych, czy przez obie strony
                                                    const myReactions = reactionList.filter(r => r.user_id === currentUser.userId);
                                                    const otherReactions = reactionList.filter(r => r.user_id !== currentUser.userId);
                                                    
                                                    let reactionClass = 'reaction-btn';
                                                    if (hasMyReaction) {
                                                        reactionClass += ' reacted';
                                                        // Jeśli tylko ja mam tę reakcję lub jeśli jest to moja dominująca reakcja
                                                        if (myReactions.length > 0 && otherReactions.length === 0) {
                                                            reactionClass += ' my-reaction';
                                                        } else if (myReactions.length > 0 && otherReactions.length > 0) {
                                                            // Jeśli oboje mamy tę reakcję, pokaż jako moją (bo ja też ją mam)
                                                            reactionClass += ' my-reaction';
                                                        }
                                                    } else {
                                                        // Jeśli nie mam tej reakcji, ale inni tak
                                                        if (otherReactions.length > 0) {
                                                            reactionClass += ' reacted other-reaction';
                                                        }
                                                    }
                                                    
                                                    return (
                                                        <button
                                                            key={reactionType}
                                                            className={reactionClass}
                                                            onClick={() => handleReaction(msg.id, reactionType)}
                                                            title={hasMyReaction ? 'Kliknij aby usunąć reakcję' : 'Kliknij aby dodać reakcję'}
                                                        >
                                                            {reactionEmoji}
                                                            {count > 1 && <span className="reaction-count">{count}</span>}
                                                        </button>
                                                    );
                                                })}
                                                
                                                {/* Pokaż dostępne reakcje do dodania (tylko te, których użytkownik jeszcze nie użył) */}
                                                {REACTIONS.filter(r => !groupedReactions[r.type] || !groupedReactions[r.type].some(rx => rx.user_id === currentUser.userId)).map(r => (
                                                    <button
                                                        key={r.type}
                                                        className="reaction-btn add-reaction"
                                                        onClick={() => handleReaction(msg.id, r.type)}
                                                        title={`Dodaj reakcję ${r.emoji}`}
                                                    >
                                                        {r.emoji}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <p>Loading users...</p>
                            )}
                            <div ref={messagesEndRef}></div>
                        </div>

                        <div className="input-area">
                            <input
                                type="text"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Wpisz swoją wiadomość"
                            />
                            <button onClick={handleSendMessage}>Wyślij</button>
                        </div>
                    </>
                ) : (
                    <div className="no-active-user">
                        <p>Wybierz użytkownika, aby rozpocząć czat.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Chat;