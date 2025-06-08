import React, { useState, useEffect } from 'react';
import './Invitations.css';
import icon from './../img/invite.png';

const Invitations = ({ userId }) => {
  const [tab, setTab] = useState('sent');
  const [sentInvitations, setSentInvitations] = useState([]);
  const [receivedInvitations, setReceivedInvitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); // Dropdown toggle state

  const storedData = localStorage.getItem('user');
  const userData = storedData ? JSON.parse(storedData) : null;

  const fetchSentInvitations = async (senderId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:3080/api/invitations/sent/${senderId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userData?.token}`,
        },
        credentials: 'include',
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch sent invitations');

      setSentInvitations(data);
    } catch (error) {
      setError(error.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const fetchReceivedInvitations = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `http://localhost:3080/api/invitations/received?receiver_id=${userData?.userId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userData?.token}`,
          },
          credentials: 'include',
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch received invitations');

      setReceivedInvitations(data);
    } catch (error) {
      setError(error.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'sent' && userData?.userId) {
      fetchSentInvitations(userData.userId);
    } else if (tab === 'received' && userData?.userId) {
      fetchReceivedInvitations();
    }
  }, [tab, userData?.userId]);

  const handleAccept = async (senderId) => {
    try {
      const response = await fetch('http://localhost:3080/api/friends/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userData?.token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ sender_id: senderId, receiver_id: userData.userId }),
      });

      if (!response.ok) throw new Error('Failed to accept invitation');
      fetchReceivedInvitations();
    } catch (error) {
      console.error('Error accepting invitation:', error);
    }
  };

  const handleDelete = async (senderId, receiverId) => {
    try {
      const response = await fetch(
        `http://localhost:3080/api/invitations/del/${senderId}/${receiverId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${userData?.token}`,
          },
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const errorMessage = await response.json();
        throw new Error(errorMessage.message || 'Failed to delete invitation');
      }

      tab === 'received' ? fetchReceivedInvitations() : fetchSentInvitations(userData.userId);
    } catch (error) {
      console.error('Error deleting invitation:', error);
    }
  };

  return (
    <div className="invitations-container">
      <div className="invitations-dropdown">
        {/* Dropdown Toggle Button */}
        <button
          className="invitations-dropdown-toggle"
          onClick={() => setIsDropdownOpen((prev) => !prev)}
        >
          <img
            src={icon}
            alt="Toggle Invitations"
            className="invitations-avatar-main"
          />
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="invitations-dropdown-menu">
            <h1 className="invitations-title">Zaproszenia</h1>

            {/* Tabs */}
            <div className="invitations-tabs">
              <button
                className={`invitations-tabs-button ${tab === 'sent' ? 'selected' : ''}`}
                onClick={() => setTab('sent')}
              >
                Wysłane
              </button>
              <button
                className={`invitations-tabs-button ${tab === 'received' ? 'selected' : ''}`}
                onClick={() => setTab('received')}
              >
                Otrzymane
              </button>
            </div>

            {/* Loading, Error, and Invitations */}
            {loading && <p className="invitations-loading">Ładuje...</p>}
            {error && <p className="invitations-error-message">{error}</p>}
            {!loading && !error && (
              <ul className="invitations-list">
                {(tab === 'received' ? receivedInvitations : sentInvitations).map((invitation) => (
                  <li key={invitation.users.id} className="invitations-item">
                    {/* User Name */}
                    <span className="invitations-name">
                      {invitation.users.imie} {invitation.users.nazwisko}
                    </span>

                    {/* Profile Image and Action Buttons */}
                    <div className="invitations-item-details">
                      <img
                        src={invitation.users.image}
                        alt={`${invitation.users.imie} ${invitation.users.nazwisko}`}
                        className="invitations-avatar"
                      />

                      {/* Action Buttons */}
                      <div className="invitations-buttons">
                        {tab === 'received' ? (
                          <>
                            <button
                              className="invitations-button"
                              onClick={() => handleAccept(invitation.users.id)}
                            >
                              Przyjmij
                            </button>
                            <button
                              className="invitations-button"
                              onClick={() => handleDelete(invitation.users.id, userData.userId)}
                            >
                              Odrzuć
                            </button>
                          </>
                        ) : (
                          <button
                            className="invitations-button"
                            onClick={() => handleDelete(userData.userId, invitation.users.id)}
                          >
                            Anuluj
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );



};

export default Invitations;
