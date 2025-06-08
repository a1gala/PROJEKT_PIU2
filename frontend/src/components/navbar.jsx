import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './navbar.css';
import Invitations from "./Invitations.jsx"

const Navbar = ({ setLoggedIn, setEmail }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [time, setTime] = useState(new Date().toLocaleTimeString());
    const [user, setUser] = useState(null); // Informacje o zalogowanym użytkowniku
    const navigate = useNavigate();

    const toggleDropdown = () => {
        setIsDropdownOpen(!isDropdownOpen);
    };

    const logOut = async () => {
        try {
            // Wywołanie endpointa logout
            const response = await fetch('http://localhost:3080/logout', {
                method: 'POST',
                credentials: 'include', // Zapewnia, że ciasteczka są przesyłane
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                // Sukces - usunięcie lokalnych danych
                localStorage.removeItem("user");
                setLoggedIn(false);
                setEmail("");
                navigate('/login'); // Przekierowanie po wylogowaniu
            } else {
                console.error('Błąd podczas wylogowywania:', response.statusText);
            }
        } catch (error) {
            console.error('Błąd połączenia z serwerem:', error);
        }
    };

    useEffect(() => {
        const interval = setInterval(() => {
            setTime(new Date().toLocaleTimeString());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // Pobieranie danych użytkownika z localStorage
        const storedUser = JSON.parse(localStorage.getItem("user"));

        if (storedUser && storedUser.userId) {
            setUser(storedUser); // Ustaw dane z localStorage, jeśli istnieje userId
        }
    }, []);

    return (
        <nav className="navbar">
            <div className="logo">
                <Link to="/" className="logolink">
                    <span className="line">Strona</span>
                    <span className="line">Główna</span>
                </Link>
            </div>

            <div className="clock">{time}</div>
            {<Invitations/>}
            <ul className="nav-links">
                <li className="dropdown" onMouseEnter={toggleDropdown} onMouseLeave={toggleDropdown}>
                    <p>MENU</p>
                    {isDropdownOpen && (
                        <ul className="dropdown-menu">
                            {user?.userId ? (
                                <li>
                                    <Link to={`/profile/${user.userId}`} className="dropdown-item">
                                        Mój Profil
                                    </Link>
                                </li>
                            ) : (
                                <li>
                                    <Link to="/login" className="dropdown-item">
                                        Zaloguj się
                                    </Link>
                                </li>
                            )}
                            <li>

                            </li>
                            <li>
                                <Link
                                    to="/login"
                                    className="logout-link"
                                    onClick={logOut}
                                >
                                    Wyloguj
                                </Link>
                            </li>
                        </ul>
                    )}
                </li>
            </ul>
        </nav>
    );
};

export default Navbar;


