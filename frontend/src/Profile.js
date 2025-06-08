import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import './profile.css';
import { useNavigate } from "react-router-dom";

function Profile() {
    const { userId } = useParams();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editedOpis, setEditedOpis] = useState('');
    const [isOwnProfile, setIsOwnProfile] = useState(false);
    const [posts, setPosts] = useState([]);
    const [activeTab, setActiveTab] = useState('opis');
    const navigate = useNavigate();
    const [userOnlineStatus, setUserOnlineStatus] = useState({});

    const loggedInUser = JSON.parse(localStorage.getItem('user'));
    const loggedInUserId = loggedInUser ? loggedInUser.userId : null;

    const handleChatClick = (userId, e) => {
        e.stopPropagation();
        navigate(`/chat/${userId}`);
    };

    const formatContent = (text) => {
        const linkifiedText = text.replace(/(https?:\/\/\S+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
        return linkifiedText.replace(/\n/g, '<br />');
    };


    useEffect(() => {
        let intervalId;
        const fetchUserOnlineStatus = async () => {
            try {
                const response = await fetch(`http://localhost:3080/api/isonline/${userId}`, {
                    credentials: 'include',
                });
                if (response.ok) {
                    const data = await response.json();
                    setUserOnlineStatus({ [userId]: data.isOnline });
                }
            } catch (error) {
                console.error('Błąd podczas pobierania statusu online:', error);
            }
        };
        fetchUserOnlineStatus();
        intervalId = setInterval(fetchUserOnlineStatus, 5000);
        return () => clearInterval(intervalId);
    }, [userId]);

    useEffect(() => {
        const fetchUserPosts = async () => {
            try {
                const response = await fetch(`http://localhost:3080/api/posts/${userId}`,{
                    credentials: 'include',
                });
                if (response.ok) {
                    const postsData = await response.json();
                    setPosts(postsData);
                } else {
                    console.error('Błąd podczas pobierania postów.');
                }
            } catch (error) {
                console.error('Błąd podczas pobierania postów użytkownika:', error);
            }
        };

        fetchUserPosts();
    }, [userId]);

    useEffect(() => {
        const parsedLoggedInUserId = Number(loggedInUserId);
        const parsedUserId = Number(userId);

        if (parsedLoggedInUserId === parsedUserId) {
            setIsOwnProfile(true);
        } else {
            setIsOwnProfile(false);
        }

        fetch(`http://localhost:3080/user/${userId}`,{
            credentials: 'include',
        })
            .then((res) => res.json())
            .then((data) => {
                setUser(data);
                setEditedOpis(data.opis || '');
                setLoading(false);
            })
            .catch((err) => {
                console.error('Błąd pobierania danych użytkownika:', err);
                setLoading(false);
            });
    }, [userId, loggedInUserId]);

    const toggleEditMode = () => {
        setIsEditing(!isEditing);
        if (!isEditing) {
            setEditedOpis(user.opis || '');
        }
    };

    const handleOpisChange = (e) => {
        setEditedOpis(e.target.value);
    };

    const saveOpis = () => {
        fetch(`http://localhost:3080/user/${userId}`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ opis: editedOpis }),

        })
            .then((res) => {
                if (res.ok) {
                    setUser((prev) => ({ ...prev, opis: editedOpis }));
                    setIsEditing(false);
                } else {
                    console.error('Błąd podczas zapisywania opisu.');
                }
            })
            .catch((err) => {
                console.error('Błąd:', err);
            });
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await fetch(`http://localhost:3080/upload-profile-image/${userId}`, {
                method: 'POST',
                body: formData,
                credentials: 'include',
            });

            if (response.ok) {
                const { imageUrl } = await response.json();
                setUser((prev) => ({ ...prev, image: imageUrl }));
            } else {
                console.error('Błąd przesyłania zdjęcia profilowego.');
            }
        } catch (err) {
            console.error('Błąd:', err);
        }
    };

    const triggerFileInput = () => {
        document.getElementById('file-upload').click();
    };

    if (loading) return <p>Ładowanie...</p>;
    if (!user) return <p>Nie znaleziono użytkownika.</p>;

    return (
        <div className="mainprofile">
            <div className="profile-header">
                <img
                    src={user.image || '/default-profile.png'}
                    alt="Zdjęcie profilowe"
                    className="profile-image"
                />
                <div className="profile-actions">
                    <span className={`status ${userOnlineStatus[user.id] ? 'online' : 'offline'}`}>
                        {userOnlineStatus[user.id] ? 'Dostępny' : 'Niedostępny'}
                    </span>
                    <button className="inputButtonProfile" onClick={(e) => handleChatClick(user.id, e)}>Wyślij wiadomość</button>
                </div>
            </div>

            <div className="profile-info">
                <p className="email">{user.imie + " " + user.nazwisko}</p>
                <div className="email-line"></div>
            </div>

            <div className="tab-buttons">
                <button
                    className={activeTab === 'opis' ? 'active-tab' : ''}
                    onClick={() => setActiveTab('opis')}
                >
                    O mnie
                </button>
                <button
                    className={activeTab === 'posts' ? 'active-tab' : ''}
                    onClick={() => setActiveTab('posts')}
                >
                    Moje posty
                </button>
            </div>

            <div className="profile-content">
                {activeTab === 'opis' && (
                    <>
                        <p className="title">O mnie:</p>
                        {isEditing ? (
                            <textarea
                                value={editedOpis}
                                onChange={handleOpisChange}
                                className="edit-textarea"
                            />
                        ) : (
                            <p dangerouslySetInnerHTML={{ __html: formatContent(user.opis || 'Brak opisu.') }}></p>
                        )}
                        <div className="edit-actions">
                            {isOwnProfile ? (
                                <>
                                    {isEditing ? (
                                        <>
                                            <button onClick={saveOpis} className="save-button">
                                                Zapisz
                                            </button>
                                            <button onClick={toggleEditMode} className="cancel-button">
                                                Anuluj
                                            </button>
                                        </>
                                    ) : (
                                        <button onClick={toggleEditMode} className="edit-button">
                                            Edytuj opis
                                        </button>
                                    )}
                                </>
                            ) : null}
                            {isOwnProfile && (
                                <>
                                    <button onClick={triggerFileInput} className="edit-button">
                                        Zmień zdjęcie
                                    </button>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        id="file-upload"
                                        style={{ display: 'none' }}
                                        onChange={handleImageUpload}
                                    />
                                </>
                            )}
                        </div>
                    </>
                )}

                {activeTab === 'posts' && (
                    <div className="postywprofilu">
                        <div className="user-posts">
                            <p className="title">Posty użytkownika {user.imie}</p>
                            {posts.length > 0 ? (
                                posts.map((post) => (
                                    <div className="post-headerr" key={post.id}>
                                        <div className="user-info">
                                            <div className="profil-posty-zdj">
                                                <img
                                                    src={post.user?.image || 'default-avatar.jpg'}
                                                    alt="Ikona użytkownika"
                                                    className="user-icon"
                                                />
                                            </div>
                                            <div className="profil-posty-dane">
                                                <span className="post-user-name">
                                                    {post.user?.imie || 'Nieznane imię'} {post.user?.nazwisko || 'Nieznane nazwisko'}
                                                </span>
                                                <span className="post-user-email">
                                                    {post.user?.email || 'Nieznany email'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="post-content">
                                            <p
                                                className="black-text2"
                                                dangerouslySetInnerHTML={{__html: formatContent(post.content)}}
                                            ></p>
                                        </div>
                                        <div className="post-date">
                                            <small className="postboard-post-date">
                                                {new Date(post.created_at).toLocaleString()}
                                            </small>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p>Brak postów do wyświetlenia.</p>
                            )}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}

export default Profile;


