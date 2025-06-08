import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";

import "./Login.css";
import './css/fontello.css';

const Login = (props) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [emailError, setEmailError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [verificationCode, setVerificationCode] = useState("");
    const [verificationCodeError, setVerificationCodeError] = useState("");
    const [isTwoFactorRequired, setIsTwoFactorRequired] = useState(false);
    const [globalError, setGlobalError] = useState("");
    const [rememberMe, setRememberMe] = useState(false);

    const navigate = useNavigate();

    const onButtonClick = () => {
        setEmailError("");
        setPasswordError("");
        setVerificationCodeError("");
        setGlobalError("");

        if (email === "") {
            setEmailError("Proszę wprowadź email");
            return;
        }

        if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
            setEmailError("Podaj poprawny email");
            return;
        }

        if (password === "") {
            setPasswordError("Wprowadź hasło");
            return;
        }

        if (password.length < 8) {
            setPasswordError("Hasło musi mieć 8 znaków lub więcej");
            return;
        }

        checkAccountExists(accountExists => {
            if (accountExists) {
                logIn();
            } else {
                if (window.confirm("Konto z podanym adresem email nie istnieje. Chcesz założyć nowe konto?")) {
                    navigate("/register");
                }
            }
        });
    };

    const checkAccountExists = (callback) => {
        fetch("http://localhost:3080/check-account", {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        })
        .then(response => response.json())
        .then(data => callback(data?.userExists))
        .catch(error => {
            console.error('Error checking account existence:', error);
            callback(false);
        });
    };

    const logIn = () => {
        fetch("http://localhost:3080/auth", {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.message === 'success') {
                const userData = { email, userId: data.userId };
                localStorage.setItem("user", JSON.stringify(userData));
                setIsTwoFactorRequired(true);
                setGlobalError("Kod 2FA został wysłany na Twój email.");
            } else {
                setGlobalError(data.message);
            }
        })
        .catch(error => {
            console.error('Błąd logowania:', error);
            setGlobalError("Wystąpił błąd podczas logowania. Spróbuj ponownie.");
        });
    };

    const verifyTwoFactorCode = () => {
        setVerificationCodeError("");
        setGlobalError("");

        if (verificationCode === "") {
            setVerificationCodeError("Proszę wprowadź kod weryfikacyjny");
            return;
        }

        fetch("http://localhost:3080/verify-2fa", {
            method: "POST",
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: JSON.parse(localStorage.getItem("user")).userId,
                twoFactorCode: verificationCode,
                rememberMe: rememberMe,
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.message === 'Weryfikacja pomyślna') {
                const existingUser = JSON.parse(localStorage.getItem("user")) || {};
                const updatedUser = { ...existingUser, token: data.token };
                localStorage.setItem("user", JSON.stringify(updatedUser));
                props.setLoggedIn(true);
                navigate("/PostBoard");
            } else {
                setVerificationCodeError("Nieprawidłowy kod weryfikacyjny.");
            }
        })
        .catch(error => {
            console.error('Błąd weryfikacji 2FA:', error);
            setGlobalError("Wystąpił błąd podczas weryfikacji kodu 2FA.");
        });
    };

    const handleKeyDown = (event) => {
        if (event.key === "Enter") {
            if (isTwoFactorRequired) {
                verifyTwoFactorCode();
            } else {
                onButtonClick();
            }
        }
    };

    return (
        <div className="mainContainerLogin" onKeyDown={handleKeyDown} tabIndex={0}>
            <div className="OptionContainerLogin">
                <div className="titleContainerLogin">Logowanie</div>
                <div className="welcomeContainerLogin">Cześć, <br />Witamy!</div>
                <br />
                <div className="inputContainerLogin">
                    <input
                        value={email}
                        placeholder="Wprowadź swój E-mail."
                        onChange={ev => setEmail(ev.target.value)}
                        className="inputBoxLogin"
                    />
                    <label className="errorLabelLogin">{emailError}</label>
                </div>
                <br />
                <div className="inputContainerLogin">
                    <input
                        type="password"
                        value={password}
                        placeholder="Wprowadź swoje hasło."
                        onChange={ev => setPassword(ev.target.value)}
                        className="inputBoxLogin"
                    />
                    <label className="errorLabelLogin">{passwordError}</label>
                </div>
                <div className="inputContainerLogin">
                    <label>
                        <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={() => setRememberMe(!rememberMe)}
                        />
                        Zapamiętaj mnie
                    </label>
                </div>
                <br />
                <div className="inputContainerLogin">
                    <input
                        className="inputButtonLogin1"
                        type="button"
                        onClick={onButtonClick}
                        value="Zaloguj"
                    />
                </div>
                {globalError && <div className="globalError">{globalError}</div>}
                {isTwoFactorRequired && (
                    <div>
                        <div className="inputContainerLogin">
                            <input
                                value={verificationCode}
                                placeholder="Wprowadź kod weryfikacyjny"
                                onChange={ev => setVerificationCode(ev.target.value)}
                                className="inputBoxLogin"
                            />
                            <label className="errorLabelLogin">{verificationCodeError}</label>
                        </div>
                        <div className="inputContainerLogin">
                            <input
                                className="inputButtonLogin1"
                                type="button"
                                onClick={verifyTwoFactorCode}
                                value="Zweryfikuj kod"
                            />
                        </div>
                    </div>
                )}
                <br />
                <div className="inputContainerLogin">
                    <p>Nie posiadasz jeszcze konta? <Link to="/register">Zarejestruj się!</Link></p>
                </div>
                <div className="inputContainerLogin">
                    <div className="forgotPasswordContainer">
                        <p className="forgotPasswordLink">
                            <Link to="/zapomnialesHasla">Zapomniałeś hasła?</Link>
                        </p>
                    </div>
                </div>
                <div className="icon-container">
                    <i className="icon-facebook icon"></i>
                    <i className="icon-instagram icon"></i>
                    <i className="icon-twitter icon"></i>
                </div>
                <footer><p>obserwuj</p></footer>
            </div>
        </div>
    );
};

export default Login;
