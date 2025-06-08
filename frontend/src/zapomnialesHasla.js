import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./zapomnialesHasla.css";

const ForgotPassword = () => {
    const [email, setEmail] = useState(""); // Stan dla emaila
    const [code, setCode] = useState(""); // Stan dla kodu resetu
    const [newPassword, setNewPassword] = useState(""); // Stan dla nowego hasła
    const [message, setMessage] = useState(""); // Wiadomość do użytkownika
    const [step, setStep] = useState(1); // Krok formularza (1 - wprowadzenie emaila, 2 - wprowadzenie kodu i hasła)
    const [emailError, setEmailError] = useState(""); // Błąd emaila
    const navigate = useNavigate(); // Funkcja nawigacyjna

// Funkcja do wysyłania kodu resetu
const sendResetEmail = () => {
    // Resetujemy wiadomości
    setEmailError("");
    setMessage("");

    // Walidacja e-maila
    if (email === "") {
        setEmailError("Proszę wprowadzić adres e-mail.");
        return;
    }
    if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
        setEmailError("Proszę wprowadzić poprawny adres e-mail.");
        return;
    }

    // Wysyłamy żądanie POST na endpoint /forgot-password
    fetch("http://localhost:3080/forgot-password", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })  // Przekazujemy email jako JSON w ciele zapytania
    })
    .then(response => response.json())
    .then(data => {
        if (data.message === 'Kod resetu został wysłany na Twój e-mail.') {
            setMessage("Kod resetu został wysłany.");
            setStep(2); // Przechodzimy do kolejnego kroku formularza
        } else {
            setMessage(data.message || "Błąd wysyłania kodu resetu.");
        }
    })
    .catch(() => setMessage("Wewnętrzny błąd serwera.")); // Obsługa błędu
};


    // Funkcja do resetowania hasła
    const resetPassword = () => {
        fetch("http://localhost:3080/reset-password", {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, resetCode: code, newPassword })
        })
        .then(response => response.json())
        .then(data => {
            if (data.message === 'Hasło zostało zmienione pomyślnie.') {
                setMessage("Hasło zostało zmienione.");
            } else {
                setMessage("Błąd: nieprawidłowy kod lub hasło.");
            }
        })
        .catch(() => setMessage("Wewnętrzny błąd serwera.")); // Obsługa błędu
    };

    return (
        <div className="forgotPasswordSite">
            <div className="forgotPasswordForm">
                <h2>Zapomniałeś hasła</h2>
                {step === 1 && (
                    <>
                        <p>Wprowadź swój adres e-mail, aby zresetować hasło.</p>
                        <input
                            type="email"
                            placeholder="Wprowadź swój e-mail"
                            value={email} // Powiązanie wartości z stanem email
                            onChange={(e) => setEmail(e.target.value)} // Obsługuje zmiany w polu email
                            className="emailInput"
                        />
                        <div className="errorMessage">{emailError}</div>
                        <button onClick={sendResetEmail} className="submitButton">
                            Wyślij kod resetu
                        </button>
                    </>
                )}
                {step === 2 && (
                    <>
                        <input
                            type="text"
                            placeholder="Kod resetu"
                            value={code} // Powiązanie wartości z stanem kodu
                            onChange={(e) => setCode(e.target.value)} // Obsługuje zmiany w polu kodu
                            className="emailInput"
                        />
                        <input
                            type="password"
                            placeholder="Nowe hasło"
                            value={newPassword} // Powiązanie wartości z stanem nowego hasła
                            onChange={(e) => setNewPassword(e.target.value)} // Obsługuje zmiany w polu hasła
                            className="emailInput"
                        />
                        <button onClick={resetPassword} className="submitButton">
                            Zresetuj hasło
                        </button>
                    </>
                )}
                {message && <p className="message">{message}</p>}
                <div className="backToLogin">
                    <p onClick={() => navigate("/login")} className="backLink">
                        Wróć do logowania
                    </p>
                </div>
            </div>
        </div>
    );
};


export default ForgotPassword;