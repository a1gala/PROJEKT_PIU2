import React from "react"
import { useNavigate } from "react-router-dom";
import myImage from './img/homechat.png';

import "./home.css";
import './css/fontello.css'

const Home = (props) => {
    const { loggedIn, email } = props
    const navigate = useNavigate();

    const onButtonClick = () => {
        if (loggedIn) {
            localStorage.removeItem("user")
            props.setLoggedIn(false)
        } else {
            navigate("/login")
        }
    }
    const storedData = localStorage.getItem("user");
    const userData = storedData ? JSON.parse(storedData) : null;
    const loggedInUserEmail = userData ? userData.email : null;

    const onButtonClickReg = () => {
        navigate("/register")
    }

    // Funkcja przenosząca do strony chat.js
    const onGoToChat = () => {
        if (loggedIn) {
            navigate(`/chat/${email}`); // Pass logged-in user's email to the chat route
        }
    }

    // Funkcja przenosząca do strony chat.js
    const onGoToPost = () => {
        navigate("/PostBoard");  // Zakładając, że masz trasę /chat w routerze
    }

    return (
        <div className="mainContainer" id="mainContainerHome">
            <div className={"mainBoxHome"}>
                <div className={"graphBox"}>
                    <img src={myImage} alt="" />
                </div>

                <div className={"side"}>

                    <div className={"titleContainer"} id="titleHome">
                        <div>Witamy!</div>
                    </div>

                    <div className={"buttonContainer"}>

                        {!loggedIn && (
                            <input
                                className={"inputButtonHome"}
                                type="button"
                                onClick={onButtonClickReg}
                                value={"Zarejestruj się"}
                            />
                        )}

                        {/* Przycisk przenoszący do czatu, jeśli użytkownik jest zalogowany */}
                        {loggedIn && (
                            <input
                                className={"inputButtonHome"}
                                type="button"
                                onClick={onGoToChat}
                                value={"Przejdź do czatu"}
                            />
                        )}
                        {/* Przycisk przenoszący do czatu, jeśli użytkownik jest zalogowany */}
                        {loggedIn && (
                            <input
                                className={"inputButtonHome"}
                                type="button"
                                onClick={onGoToPost}
                                value={"Przejdź do post"}
                            />
                        )}

                        <input
                            className={"inputButtonHome"}
                            type="button"
                            onClick={onButtonClick}
                            value={loggedIn ? "Wyloguj" : "Zaloguj"}/>

                        {loggedIn && (
                            <div>
                                <p>Jesteś zalogowany jako {email}!</p>
                            </div>
                        )}

                        <div className="icon-containerHome">
                            <i className="icon-facebook icon"></i>
                            <i className="icon-instagram icon"></i>
                            <i className="icon-twitter icon"></i>
                        </div>

                        <p className="black-text">obserwuj</p>


                    </div>
                </div>
            </div>
        </div>
    )
}

export default Home;
