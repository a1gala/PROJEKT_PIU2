import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./userPanel.css";

const UserPanel = () => {
  const [users, setUsers] = useState([]); // All users
  const [friends, setFriends] = useState([]); // Friends list
  const [filteredUsers, setFilteredUsers] = useState([]); // Filtered users to display
  const [selectedTab, setSelectedTab] = useState("allUsers"); // Track the selected tab
  const [searchQuery, setSearchQuery] = useState(""); // Search query state
  const [dropdownUserId, setDropdownUserId] = useState(null); // Track which user has the dropdown open
  const [userOnlineStatus, setUserOnlineStatus] = useState({}); // Online status for users
  const [sendInvitationStatus, setSendInvitationStatus] = useState(""); // Status for sending invitations
  const [errorMessage, setErrorMessage] = useState(""); // Error message for failed invitation
  const [loading, setLoading] = useState(false); // Loading state for invitation sending
  const navigate = useNavigate();

  const storedData = localStorage.getItem("user");
  const userData = storedData ? JSON.parse(storedData) : null;
  const loggedInUserEmail = userData ? userData.email : null;

  // Fetch online status for all users as soon as component mounts
  useEffect(() => {
    const fetchOnlineStatus = async () => {
      const status = {};
      try {
        // Pobierz listę użytkowników
        const response = await fetch("http://localhost:3080/api/users",{
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          // Pobierz status online dla każdego użytkownika
          await Promise.all(data.map(async (user) => {
            try {
              const statusResponse = await fetch(`http://localhost:3080/api/isonline/${user.id}`);
              if (statusResponse.ok) {
                const onlineData = await statusResponse.json();
                status[user.id] = onlineData.isOnline;
              } else {
                status[user.id] = false;
              }
            } catch {
              status[user.id] = false;
            }
          }));
          setUserOnlineStatus(status);
        } else {
          console.error("Failed to fetch users:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching users or status:", error);
      }
    };
    fetchOnlineStatus();
    // Odświeżaj status co 10 sekund
    const interval = setInterval(fetchOnlineStatus, 10000);
    return () => clearInterval(interval);
  }, [loggedInUserEmail]);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await fetch("http://localhost:3080/api/users",{
                    credentials: 'include',
                });
                if (response.ok) {
                    const data = await response.json();
                    const filteredUsers = data.filter(
                        (user) => user.email !== loggedInUserEmail
                    );
                    setUsers(filteredUsers);
                    setFilteredUsers(filteredUsers); // Initially set all users
                } else {
                    console.error("Failed to fetch users:", response.statusText);
                }
            } catch (error) {
                console.error("Error fetching users:", error);
            }
        };

    const fetchFriends = async () => {
        try {
          // Fetch the friends list of the logged-in user
          const response = await fetch(`http://localhost:3080/api/friends?user_id=${userData.userId}`,{
                credentials: 'include',
          });
          if (response.ok) {
            const data = await response.json();
            setFriends(data); // Populate the friends list
          } else {
            console.error("Failed to fetch friends:", response.statusText);
          }
        } catch (error) {
          console.error("Error fetching friends:", error);
        }
      };

    fetchUsers();
    fetchFriends();
  }, [loggedInUserEmail, userData.userId]); // Make sure userData.userId is available

  // Function to send invitation
  const sendInvitation = async (senderId,receiverId) => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3080/api/invitations/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ receiver_id: receiverId, sender_id: senderId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send invitation");
      }

      setSendInvitationStatus("Invitation sent successfully.");
      setErrorMessage(""); // Clear any previous error message
    } catch (error) {
      console.error('Error sending invitation:', error);
      setSendInvitationStatus(""); // Clear any previous success message
      setErrorMessage(error.message || "Something went wrong.");
    } finally {
      setLoading(false); // Reset loading state
    }
  };

  // Function to unfriend a user
  const unfriendUser = async (userId, senderId) => {
    setLoading(true);
    try {
      // Use proper template literals for URL
      const response = await fetch(`http://localhost:3080/api/friends/del/${userId}/${senderId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to unfriend");
      }

      // Update friends list after successful unfriend
      setFriends((prevFriends) => prevFriends.filter((friend) => friend.id !== userId));
      setErrorMessage(""); // Clear any previous error message
    } catch (error) {
      console.error('Error unfriending user:', error);
      setErrorMessage(error.message || "Something went wrong.");
    } finally {
      setLoading(false); // Reset loading state
    }
  };



  // Helper function to check if user is a friend
  const isFriend = (userId) => {
    return friends.some((friend) => friend.id === userId);
  };

  // Update filtered users based on tab selection
  useEffect(() => {
    if (selectedTab === "allUsers") {
      setFilteredUsers(users);
    } else {
      setFilteredUsers(friends);
    }
  }, [selectedTab, users, friends]);

  // Function to handle search query changes
  const handleSearchChange = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);

    // Filter based on the selected tab and search query
    const filterUsers = (usersList) => {
      return usersList.filter((user) => {
        const fullName = `${user.imie} ${user.nazwisko}`.toLowerCase(); // Combine first and last name
        const email = user.email.toLowerCase(); // User email
        // Check if the search query is present in full name or email
        return fullName.includes(query) || email.includes(query);
      });
    };

    if (selectedTab === "allUsers") {
      const filtered = filterUsers(users);
      setFilteredUsers(filtered);
    } else {
      const filtered = filterUsers(friends);
      setFilteredUsers(filtered);
    }
  };

  // Function to handle send invitation button click
  const handleSend = async (senderId, receiverId, e) => {
    if (!senderId || !receiverId) {
      return;
    }
    await sendInvitation(senderId, receiverId);
  };

  // Function to handle unfriend button click
  const handleUnfriend = async (senderId, receiverId, e) => {
    if (!senderId || !receiverId) {
      return;
    }
    await unfriendUser(senderId, receiverId);
  };

  // Navigate to chat with the selected user
  const handleChatClick = (userId, e) => {
    e.stopPropagation(); // Prevent dropdown from closing immediately
    navigate(`/chat/${userId}`);
  };

  // Navigate to the selected user's profile
  const handleProfileClick = (userId, e) => {
    e.stopPropagation(); // Prevent dropdown from closing immediately
    navigate(`/profile/${userId}`);
  };

  const toggleDropdown = (userId) => {
    const userElement = document.getElementById(`user-${userId}`);
    const rect = userElement.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom; // Space below the element
    const nearBottom = spaceBelow < 100; // Threshold for enough space, adjust as needed

    // Toggle the dropdown visibility
    setDropdownUserId(dropdownUserId === userId ? null : userId);

    // Apply a class to adjust the dropdown's position
    if (nearBottom) {
      userElement.classList.add("dropdown-up"); // Position above if near bottom
    } else {
      userElement.classList.remove("dropdown-up"); // Default position below
    }
  };

  // Function to get user name or email
  const getUserName = (user) => {
    return user.imie && user.nazwisko
      ? `${user.imie} ${user.nazwisko}`
      : user.email;
  };

  return (
    <div className="user-panel-block">
      <h2 className="user-panel-title">Użytkownicy</h2>
      <input
        type="text"
        className="user-panel-search-box"
        placeholder="Szukaj użytkowników..."
        value={searchQuery}
        onChange={handleSearchChange}
      />
      <div className="tabs">
        <button
          onClick={() => setSelectedTab("allUsers")}
          className={selectedTab === "allUsers" ? "selected" : ""}
        >
          Wszyscy użytkownicy
        </button>
        <button
          onClick={() => setSelectedTab("friends")}
          className={selectedTab === "friends" ? "selected" : ""}
        >
          Znajomi
        </button>
      </div>

      <ul className="user-panel-list">
        {filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <li
              key={user.id}
              id={`user-${user.id}`}
              className={`user-panel-item ${userOnlineStatus[user.id] ? 'online' : 'offline'}`} // Dynamic class based on online status
              onClick={() => toggleDropdown(user.id)} // Toggle dropdown on user click
            >
              <span className={`user-panel-status ${userOnlineStatus[user.id] ? 'online' : 'offline'}`} />
              <img
                className="user-panel-avatar"
                src={user.image}
                alt={getUserName(user)}
              />
              <span className="user-panel-name" title={getUserName(user)}>
                {getUserName(user)}
              </span>
              {dropdownUserId === user.id && (
                <div className="user-options-dropdown">
                  <button onClick={(e) => handleProfileClick(user.id, e)} className="user-options-button">Profil</button>
                  <button onClick={(e) => handleChatClick(user.id, e)} className="user-options-button">Chat</button>
                  {isFriend(user.id) ? (
                    <button onClick={(e) => handleUnfriend(userData.userId, user.id, e)}
                        className="user-options-button">
                      Usuń ze znajomych
                    </button>
                  ) : (
                    <button onClick={(e) => handleSend(userData.userId, user.id, e)}
                        className="user-options-button">
                      Wyślij Zaproszenie
                    </button>
                  )}
                </div>
              )}
            </li>
          ))
        ) : (
          <p>No users found.</p>
        )}
      </ul>
    </div>
  );
};

export default UserPanel;
