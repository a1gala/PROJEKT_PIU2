import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import "./Register.css";
import './css/fontello.css'

const Register = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [imie, setImie] = useState("");
    const [nazwisko, setNazwisko] = useState("");
    const [emailError, setEmailError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [successMessage, setSuccessMessageRegister] = useState("");
    const [errorMessage, setErrorMessageRegister] = useState("");

    const navigate = useNavigate();

    const onButtonClick = () => {
        setEmailError("");
        setPasswordError("");
        setSuccessMessageRegister("");
        setErrorMessageRegister("");

        if (!imie.trim()) {
            setErrorMessageRegister("Proszę wprowadzić swoje imię");
            return;
        }

        if (!nazwisko.trim()) {
            setErrorMessageRegister("Proszę wprowadzić swoje nazwisko");
            return;
        }

        if ("" === email) {
            setEmailError("Proszę wprowadzić swój email");
            return;
        }

        if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
            setEmailError("Proszę wprowadzić prawidłowy email");
            return;
        }

        if ("" === password) {
            setPasswordError("Proszę wprowadzić hasło");
            return;
        }

        if (password.length < 8) {
            setPasswordError("Hasło musi mieć co najmniej 8 znaków");
            return;
        }

        fetch("http://localhost:3080/register", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password, imie, nazwisko })
        })
        .then(response => response.json())
        .then(data => {
            if (data.message === "success") {
                setSuccessMessageRegister("Email aktywacyjny wysłany na maila...");
                setTimeout(() => {
                    navigate("/login");
                }, 15000);
            } else {
                setErrorMessageRegister("Wystąpił błąd: " + data.message);
            }
        })
        .catch(error => {
            setErrorMessageRegister("Wystąpił błąd podczas rejestracji: " + error.message);
        });
    };

    const handleKeyDown = (event) => {
        if (event.key === "Enter") {
            onButtonClick();
        }
    };

    return (
        <div
            className="mainContainerRegister"
            tabIndex={0}
            onKeyDown={handleKeyDown}
        >
            <div className={"OptionContainerRegister"}>
                <div className="titleContainerRegister">
                    <div>Rejestracja</div>
                </div>
                <div className={"welcomeContainerRegister"}>
                    <div>Cześć, <br />Witamy po raz pierwszy!</div>
                </div>
                <br />
                <div className="inputContainerRegister">
                    <input
                        value={imie}
                        placeholder="Wprowadź swoje imię"
                        onChange={ev => setImie(ev.target.value)}
                        className="inputBoxRegister"
                    />
                </div>
                <br />
                <div className="inputContainerRegister">
                    <input
                        value={nazwisko}
                        placeholder="Wprowadź swoje nazwisko"
                        onChange={ev => setNazwisko(ev.target.value)}
                        className="inputBoxRegister"
                    />
                </div>
                <br />
                <div className="inputContainerRegister">
                    <input
                        value={email}
                        placeholder="Wprowadź swój email"
                        onChange={ev => setEmail(ev.target.value)}
                        className="inputBoxRegister"
                    />
                    <label className="errorLabelRejestracja">{emailError}</label>
                </div>
                <br />
                <div className="inputContainerRegister">
                    <input
                        type="password"
                        value={password}
                        placeholder="Wprowadź swoje hasło"
                        onChange={ev => setPassword(ev.target.value)}
                        className="inputBoxRegister"
                    />
                    <label className="errorLabelRejestracja">{passwordError}</label>
                </div>
                <br />
                <div className="inputContainerRegister">
                    <input
                        className="inputButtonRegister"
                        type="button"
                        onClick={onButtonClick}
                        value="Zarejestruj się"
                    />
                </div>
                {successMessage && (
                    <div className="successMessageRegister">
                        {successMessage}
                        <div>
                            <Link to="/login">Przejdź do logowania</Link>
                        </div>
                    </div>
                )}
                {errorMessage && (
                    <div className="errorMessageRegister">
                        {errorMessage}
                    </div>
                )}
                <div className={"inputContainerRegister"}>
                    <p>
                        Posiadasz już konto? <Link to="/login">Zaloguj się!</Link>
                    </p>
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

export default Register;
