import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import './activate.css'; // Załaduj plik CSS
import myImage from './img/homechat.png';

const Activate = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [activationStatus, setActivationStatus] = useState(null); // Przechowuje status aktywacji
    const [message, setMessage] = useState(''); // Przechowuje wiadomość z odpowiedzi
    const [loading, setLoading] = useState(true); // Dodano stan ładowania

useEffect(() => {
    const status = searchParams.get('status');
    const imie = searchParams.get('imie');
    const nazwisko = searchParams.get('nazwisko');

    if (!status || !imie || !nazwisko) {
        setMessage('Brak wymaganych parametrów aktywacyjnych w URL.');
        setActivationStatus('error');
        setLoading(false);
        return;
    }

    if (status === 'success') {
        setActivationStatus('success');
        setMessage(`Konto ${imie} ${nazwisko} zostało aktywowane pomyślnie! Możesz teraz zalogować się.`);
    } else {
        setActivationStatus('error');
        setMessage('Wystąpił problem z aktywacją konta. Spróbuj ponownie.');
    }

    setLoading(false);
}, [searchParams]);


    return (
        <div className="activation-container">
            <div className="activation-content">
                <img src={myImage} alt="" className="activation-image" />
                <div className="activation-info">
                    {loading && <p className="loading-text">Aktywacja konta w toku...</p>}
                    {activationStatus === 'success' && (
                        <>
                            <h1 className="success-message">{message}</h1>
                            <p className="login-prompt">Konto zostało aktywowane. Kliknij poniżej, aby przejść do logowania.</p>
                            <button
                                className="login-button"
                                onClick={() => navigate('/login')}
                            >
                                Przejdź do logowania
                            </button>
                        </>
                    )}
                    {activationStatus === 'error' && (
                        <>
                            <h1 className="error-message">{message}</h1>
                            <p className="error-details">Proszę sprawdzić link aktywacyjny lub skontaktować się z obsługą.</p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Activate;
