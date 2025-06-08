import React, { useState, useEffect } from 'react';
import './PostBoard.css';
import UserPanel from "./components/UserPanel.jsx";

const PostBoard = () => {
    const [posts, setPosts] = useState([]);
    const [content, setContent] = useState('');
    const [commentContents, setCommentContents] = useState({});
    const [userEmail, setUserEmail] = useState('');
    const [userIcon, setUserIcon] = useState('default-avatar.jpg');
    const [userId, setUserId] = useState(null);
    const [showComments, setShowComments] = useState({});

    const API_URL = 'http://localhost:3080/api/posts';
    const COMMENTS_API_URL = 'http://localhost:3080/api/comments';

    const fetchUserData = () => {
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                const parsedUserData = JSON.parse(userData);
                setUserEmail(parsedUserData.email || 'default@example.com');
                setUserId(parsedUserData.userId || 1);
                setUserIcon(parsedUserData.userIcon || 'default-avatar.jpg');
            } catch (error) {
                console.error('Błąd parsowania danych użytkownika z localStorage:', error);
            }
        }
    };

    const handlePostSubmit = async (event) => {
        event.preventDefault();
        if (!content) {
            alert('Musisz wpisać treść posta!');
            return;
        }

        const newPost = { users_id: userId, content };
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPost),
                credentials: "include",

            });

            if (!response.ok) {
                const errorData = await response.json();
                alert(`Błąd zapisu: ${errorData.error}`);
                return;
            }

            await fetchPosts();
            setContent('');
        } catch (error) {
            console.error('Błąd wysyłania żądania:', error);
            alert('Nie udało się zapisać posta.');
        }
    };

    const fetchPosts = async () => {
        try {
            const response = await fetch(API_URL,{
                credentials: 'include',
            });;
            if (response.ok) {
                const data = await response.json();
                setPosts(data);
            } else {
                console.error('Błąd pobierania postów:', response.statusText);
            }
        } catch (error) {
            console.error('Błąd podczas pobierania postów:', error);
        }
    };

    const handleCommentChange = (event, postId) => {
        const { value } = event.target;
        setCommentContents((prev) => ({
            ...prev,
            [postId]: value,
        }));
    };

    const handleCommentSubmit = async (event, postId) => {
        event.preventDefault();
        const commentContent = commentContents[postId];

        if (!commentContent) {
            alert('Treść komentarza nie może być pusta!');
            return;
        }

        const newComment = { post_id: postId, user_id: userId, content: commentContent };

        try {
            const response = await fetch(COMMENTS_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newComment),
                credentials: "include",
            });

            if (!response.ok) {
                const errorData = await response.json();
                alert(`Błąd: ${errorData.error || 'Nie udało się dodać komentarza.'}`);
                return;
            }

            setCommentContents((prev) => ({ ...prev, [postId]: '' }));
            await fetchPosts();
        } catch (error) {
            console.error('Błąd wysyłania żądania komentarza:', error);
            alert('Nie udało się dodać komentarza.');
        }
    };

    const handleToggleComments = (postId) => {
        setShowComments((prev) => ({
            ...prev,
            [postId]: !prev[postId],
        }));
    };

    // Funkcja do zamiany tekstu na HTML z klikalnymi linkami i nowymi liniami
    const formatContent = (text) => {
        const linkifiedText = text.replace(/(https?:\/\/\S+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
        return linkifiedText.replace(/\n/g, '<br />');
    };

    useEffect(() => {
        fetchUserData();
        fetchPosts();
    }, []);

    return (
        <div className="main-container">
            <div className="userpanel-container"><UserPanel /></div>
            <div className="postboard-container-unique">
                <h1>Tablica Postów</h1>
                <form className="postboard-form" onSubmit={handlePostSubmit}>
                    <textarea
                        className="postboard-textarea"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Co słychać?"
                    ></textarea>
                    <button className="postboard-button" type="submit">Dodaj post</button>
                </form>
                <div>
                    <h2>Wszystkie posty:</h2>
                    {posts.length === 0 ? (
                        <p className="black-text3">Brak postów na tablicy!</p>
                    ) : (
                        <ul className="postboard-posts-list">
                            {posts.map((post) => (
                                <li key={post.id} className="postboard-post-item">
                                    <div className="post-header">
                                        <img
                                            src={post.user?.image || 'default-avatar.jpg'}
                                            alt="Ikona użytkownika"
                                            className="user-icon"
                                        />
                                        <div className="user-info">
                                            <span className="post-user-name">
                                                {post.user?.imie || 'Nieznane imię'} {post.user?.nazwisko || 'Nieznane nazwisko'}
                                            </span>
                                            <span
                                                className="post-user-email">({post.user?.email || 'Nieznany email'})</span>
                                        </div>
                                    </div>
                                    <p
                                        className="black-text2"
                                        dangerouslySetInnerHTML={{ __html: formatContent(post.content) }}
                                    ></p>
                                    <small className="postboard-post-date">
                                        {new Date(post.created_at).toLocaleString()}
                                    </small>
                                    <div className="comments-section">
                                        <h3>Komentarze:</h3>
                                        <button
                                            className="toggle-comments-button"
                                            onClick={() => handleToggleComments(post.id)}
                                        >
                                            {showComments[post.id] ? 'Ukryj komentarze' : 'Pokaż komentarze'}
                                        </button>
                                        {showComments[post.id] && (
                                            <>
                                                {post.comments?.length > 0 ? (
                                                    <ul className="comments-list">
                                                        {post.comments
                                                            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                                                            .map((comment) => (
                                                                <li key={comment.id} className="comment-item">
                                                                    <p dangerouslySetInnerHTML={{ __html: formatContent(comment.content) }}></p>
                                                                    <small>
                                                                        {comment.user?.imie || 'Anonim'} - {new Date(comment.created_at).toLocaleString()}
                                                                    </small>
                                                                </li>
                                                            ))}
                                                    </ul>
                                                ) : (
                                                    <p className="no-comments-text">Brak komentarzy.</p>
                                                )}
                                            </>
                                        )}
                                        {!showComments[post.id] && post.comments?.length === 0 && (
                                            <p className="comments-count">0 komentarzy</p>
                                        )}
                                        {post.comments?.length > 0 && !showComments[post.id] && (
                                            <p className="comments-count">{post.comments.length} komentarzy</p>
                                        )}
                                        <form
                                            className="comment-form"
                                            onSubmit={(e) => handleCommentSubmit(e, post.id)}
                                        >
                                            <textarea
                                                className="comment-textarea"
                                                value={commentContents[post.id] || ''}
                                                onChange={(e) => handleCommentChange(e, post.id)}
                                                placeholder="Dodaj komentarz..."
                                            ></textarea>
                                            <button className="comment-button" type="submit">Dodaj komentarz</button>
                                        </form>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PostBoard;
