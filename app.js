import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import sharp from 'sharp';
import cookieParser from 'cookie-parser';

const upload = multer({ storage: multer.memoryStorage() });

const supabaseUrl = 'https://qgjrvrjgmewqffywfxhh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnanJ2cmpnbWV3cWZmeXdmeGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA4MTExMDMsImV4cCI6MjA0NjM4NzEwM30.hrnOev0tRUM9cUNugQu5BARLBrm3VbQS1VsCy4ZkMzM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const jwtSecretKey = 'dsfdsfsdfdsvcsvdfgefg'; // JWT secret key
const refreshTokenSecretKey = 'sdnfdsnafjndjklehewhfjk';

// Middleware
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(cookieParser());


const verifyAccessToken = (req, res, next) => {


    const token = req.cookies['accessToken'];
    const refreshToken = req.cookies['refreshToken'];





    jwt.verify(token, jwtSecretKey, (err, decoded) => {
        if (err) {

            console.log('AccessToken jest nieprawidłowy lub wygasły');


            if (refreshToken) {
                console.log('Próba odświeżenia tokena...');


                jwt.verify(refreshToken, refreshTokenSecretKey, (refreshErr, refreshDecoded) => {
                    if (refreshErr) {

                        return res.status(401).json({ message: "Nieprawidłowy lub wygasły refresh token" });
                    }


                    const newAccessToken = jwt.sign(
                        { userId: refreshDecoded.userId },
                        jwtSecretKey,
                        { expiresIn: '20m' }
                    );


                    res.cookie('accessToken', newAccessToken, {
                        httpOnly: true,
                        secure: true,
                        sameSite: 'None',
                        maxAge: 20 * 60 * 1000,
                    });


                    req.user = refreshDecoded;
                    return next();
                });
            } else {
                return res.status(401).json({ message: "Brak refresh tokena, brak dostępu" });
            }
        } else {

            req.user = decoded;
            return next();
        }
    });
};


// WebSocket connection handler
wss.on('connection', (ws) => {
    console.log('Client connected');
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            // Jeśli to rejestracja użytkownika w WebSocket
            if (data.type === 'register') {
                ws.userId = data.userId;
                console.log(`User ${data.userId} registered for WebSocket`);
                return;
            }
            
            // Jeśli to zwykła wiadomość czatu
            if (data.senderId && data.receiverId && data.content) {
                const { senderId, receiverId, content } = data;
                console.log('Received message:', message);
                
                // Wyślij wiadomość do odbiorcy
                wss.clients.forEach(client => {
                    if (client.readyState === client.OPEN && client.userId === receiverId) {
                        client.send(JSON.stringify({ 
                            senderId, 
                            receiverId, 
                            content, 
                            timestamp: new Date().toISOString() 
                        }));
                    }
                });
            }
        } catch (err) {
            console.error('Error parsing WebSocket message:', err);
        }
    });
    
    ws.on('close', () => {
        console.log('Client disconnected');
    });
});
// Main API route
app.get('/', (_req, res) => {
    res.send('Auth API.\nPlease use POST /auth & POST /register for authentication');
});



//Tokeny
const createAccessToken = (userId, email) => {
    const payload = { userId, email };
    console.log('tworzenie accestokena')
    return jwt.sign(payload, jwtSecretKey, { expiresIn: '20m' }); // Ważność: 20 minut
};

const createRefreshTokenLong = (userId, email) => {
    const payload = { userId, email };
    console.log('tworzenie refreshtokena długiego')
    return jwt.sign(payload, refreshTokenSecretKey, { expiresIn: '7d' }); // Ważność: 7 dni
};
const createRefreshToken = (userId, email) => {
    const payload = { userId, email };
    console.log('tworzenie refreshtokena')
    return jwt.sign(payload, refreshTokenSecretKey, { expiresIn: '1h' }); // Ważność: 1 godzina
};

app.post('/verify', (req, res) => {
    console.log('sprawdzanie access tokena')
    const token = req.cookies['accessToken'];
    if (!token) {
        return res.status(401).json({ message: 'Brak access tokena' });
    }

    jwt.verify(token, jwtSecretKey, (err, decoded) => {
        if (err) {
            console.log('access token wygasł')
            return res.status(401).json({ message: 'Nieprawidłowy lub wygasły token' });
        }
        res.status(200).json({ message: 'success', userId: decoded.userId });
    });
});

app.post('/refresh', (req, res) => {
    console.log('sprawcanie refresh tokena')
    const refreshToken = req.cookies['refreshToken'];
    if (!refreshToken) {
        return res.status(401).json({ message: 'Brak refresh tokena' });
    }

    jwt.verify(refreshToken, refreshTokenSecretKey, (refreshErr, refreshDecoded) => {
        if (refreshErr) {
            console.log('refresh token wygasł')
            return res.status(403).json({ message: 'Refresh token jest nieprawidłowy lub wygasł' });
        }

        const newAccessToken = createAccessToken(refreshDecoded.userId, refreshDecoded.email);
        res.cookie('accessToken', newAccessToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'None',
            maxAge: 20 * 60 * 1000,
        });

        res.status(200).json({ message: 'Token odświeżony' });
    });
});


app.post('/logout', (req, res) => {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.status(200).json({ message: 'Wylogowano' });
});

// Rejestracja (nie wymaga autoryzacji)
app.post('/register', async (req, res) => {
    const { email, password, imie, nazwisko } = req.body;

    try {
        const { data: existingUser, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email);

        if (existingUser && existingUser.length > 0) {
            return res.status(400).json({ message: 'Użytkownik już istnieje' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Generowanie unikalnego kodu aktywacyjnego
        const activationCode = crypto.randomBytes(16).toString('hex');
        const activationExpires = new Date();
        activationExpires.setDate(activationExpires.getDate() + 7);

        const { data, error } = await supabase
            .from('users')
            .insert([{ imie, nazwisko, email, password: hashedPassword, isActive: false, activationCode, activationExpires }]);

        if (error) {
            console.error('Error inserting user:', error);
            return res.status(500).json({ message: 'Błąd rejestracji' });
        }


        const activationLink = `http://localhost:3080/activate?code=${activationCode}&email=${email}&imie=${imie}&nazwisko=${nazwisko}`;



const mailOptions = {
    from: '"ProjektPIU2" <projekt.piu2@gmail.com>', // Nadawca
    to: email, // Odbiorca
    subject: 'Link weryfikacyjny',
    html: `
        <div style="width: 100%; background-color: rgba(21, 72, 75, 1); padding: 20px; font-family: 'Langar', sans-serif; box-sizing: border-box;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2); text-align: center;">
                <h1 style="font-size: 24px; color: rgba(21, 72, 75, 1); margin-bottom: 20px;">Kod weryfikacyjny</h1>
                <p style="font-size: 16px; color: black; margin-bottom: 30px;">Twój kod weryfikacyjny:</p>
                <a href="${activationLink}" style="font-size: 20px; font-weight: bold; background-color: rgba(21, 72, 75, 1); color: white; padding: 10px 20px; border-radius: 25px; text-decoration: none; display: inline-block; margin-bottom: 30px;">
                 Kliknij tutaj, aby aktywować
            </a>
        </div>
    `
};


        transporter.sendMail(mailOptions, (err) => {
            if (err) {
                console.error("Error sending email:", err);
                return res.status(500).json({ message: 'Błąd wysyłania e-maila.' });
            }
            res.status(200).json({ message: "success" });
        });
    } catch (err) {
        console.error('Unhandled error:', err);
        res.status(500).json({ message: 'Wewnętrzny błąd serwera' });
    }
});


const generateTwoFactorCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// Logowanie (nie wymaga autoryzacji)
app.post('/auth', async (req, res) => {
    const { email, password } = req.body;

    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

    if (error || !user) {
        console.log('Błąd podczas pobierania użytkownika lub użytkownik nie istnieje');
        return res.status(400).json({ message: 'Użytkownik nie istnieje.' });
    }

    if (!user.isActive) {
        console.log('Konto nie zostało aktywowane');
        return res.status(403).json({ message: 'Konto nie zostało aktywowane. Sprawdź swój e-mail, aby je aktywować.' });
    }

    const result = await bcrypt.compare(password, user.password);
    if (!result) {
        console.log('Nieprawidłowe hasło');
        return res.status(401).json({ message: 'Nieprawidłowe hasło.' });
    }
    // Sprawdzenie czasu ostatniej wysyłki kodu
    const currentTime = new Date();
    const lastSent = user.lastTwoFactorSent ? new Date(user.lastTwoFactorSent) : null;

    const currentTimeInSeconds = Math.floor(currentTime.getTime() / 1000);
    const lastSentInSeconds = lastSent ? Math.floor(lastSent.getTime() / 1000) : null;
    const cooldownPeriod = 15 * 1000; // 15 sekund w milisekundach
    const timeDifference = lastSentInSeconds ? currentTimeInSeconds - lastSentInSeconds : null;
    console.log('Różnica w czasie w sekundach:', timeDifference);
    if (lastSentInSeconds && timeDifference < cooldownPeriod / 1000) {  // Sprawdzamy w sekundach
        const timeRemaining = Math.ceil((cooldownPeriod / 1000) - timeDifference);
        console.log(`Cooldown aktywny, pozostało ${timeRemaining} sekund`);
        return res.status(429).json({ message: `Proszę poczekać ${timeRemaining} sekund przed wysłaniem nowego kodu.` });
    }
    // Generowanie kodu 2FA
    const twoFactorCode = generateTwoFactorCode();
    console.log('Generowanie nowego kodu 2FA:', twoFactorCode);
    // Zaktualizowanie pola `lastTwoFactorSent` i zapisanie nowego kodu
    const { error: updateError } = await supabase
        .from('users')
        .update({
            twoFactorCode,
            lastTwoFactorSent: currentTime.toISOString() // Zaktualizowanie czasu wysyłki w formacie ISO (UTC)
        })
        .eq('id', user.id);
    if (updateError) {
        console.error('Błąd aktualizacji kodu 2FA:', updateError);
        return res.status(500).json({ message: 'Błąd serwera podczas generowania kodu 2FA' });
    }
    // Wysyłanie kodu 2FA e-mailem (jedno wywołanie)
    const mailOptions = {
        from: '"ProjektPIU2" <projekt.piu2@gmail.com>', // Nadawca
        to: email, // Odbiorca
        subject: 'Kod weryfikacyjny',
        html: `
            <div style="width: 100%; background-color: rgba(21, 72, 75, 1); padding: 20px; font-family: 'Langar', sans-serif; box-sizing: border-box;">
                <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2); text-align: center;">
                    <h1 style="font-size: 24px; color: rgba(21, 72, 75, 1); margin-bottom: 20px;">Kod weryfikacyjny</h1>
                    <p style="font-size: 16px; color: black; margin-bottom: 30px;">Twój kod weryfikacyjny:</p>
                    <div style="font-size: 30px; font-weight: bold; background-color: rgba(21, 72, 75, 1); color: white; padding: 10px 20px; border-radius: 25px; display: inline-block; margin-bottom: 30px;">
                        ${twoFactorCode}
                    </div>
                </div>
            </div>
        `
    };

    transporter.sendMail(mailOptions, (err) => {
        if (err) {
            console.error('Błąd wysyłania kodu 2FA:', err);
            return res.status(500).json({ message: 'Błąd wysyłania kodu 2FA' });
        }

        console.log('Kod 2FA został wysłany');
        res.status(200).json({ message: 'success', userId: user.id });
    });
});


// Endpoint do weryfikacji kodu 2FA (nie wymaga weryfikacji)
app.post('/verify-2fa', async (req, res) => {
    const { userId, twoFactorCode, rememberMe } = req.body;

    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('twoFactorCode, email')
            .eq('id', userId)
            .single();

        if (error || !user) {
            return res.status(400).json({ message: 'Nieprawidłowy użytkownik.' });
        }

        if (user.twoFactorCode !== twoFactorCode) {
            return res.status(401).json({ message: 'Nieprawidłowy kod weryfikacyjny.' });
        }

        // Usunięcie kodu 2FA po pomyślnej weryfikacji
        const { error: updateError } = await supabase
            .from('users')
            .update({ twoFactorCode: null })
            .eq('id', userId);

        if (updateError) {
            console.error('Błąd usuwania kodu 2FA:', updateError);
            return res.status(500).json({ message: 'Błąd serwera' });
        }

        const accessToken = createAccessToken(userId, user.email);

        let refreshToken;
        if (rememberMe) {
            refreshToken = createRefreshTokenLong(userId, user.email);
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'None',
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });
        } else {
            refreshToken = createRefreshToken(userId, user.email);
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'None',
                maxAge: 60 * 60 * 1000,
            });
        }

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'None',
            maxAge: 20 * 60 * 1000,
        });

        console.log("log przed wysłaniem odpowiedzi z verify-f2a")
        res.status(200).json({ message: 'Weryfikacja pomyślna' });
        console.log("log po wysłaniem odpowiedzi z verify-f2a")
    } catch (err) {
        console.error('Błąd weryfikacji 2FA:', err);
        res.status(500).json({ message: 'Błąd serwera' });
    }
});



// Logowanie, sprawdzenie użytkownika (nie wymaga weryfikacji)
app.post('/check-account', async (req, res) => {
    const { email } = req.body;

    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error && error.details === 'The result contains 0 rows') {
            return res.status(200).json({ userExists: false });
        } else if (error) {
            console.error('Error finding user:', error);
            return res.status(500).json({ message: 'Błąd weryfikacji użytkownika' });
        }

        res.status(200).json({ userExists: !!user });
    } catch (err) {
        console.error('Unhandled error:', err);
        res.status(500).json({ message: 'Wewnętrzny błąd serwera' });
    }
});

// Userpanel na chacie (wymaga weryfikacji)
app.get('/api/users', verifyAccessToken, async (_req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, imie, nazwisko, image, email'); // Dodano image i email do selekcji

        if (error) {
            console.error('Error fetching users:', error);
            return res.status(500).json({ message: 'Błąd pobierania użytkowników' });
        }

        res.status(200).json(data);
    } catch (err) {
        console.error('Unexpected error:', err);
        res.status(500).json({ message: 'Wewnętrzny błąd serwera' });
    }
});

const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: 'projekt.piu2@gmail.com',
        pass: 'hsaf vjmp fpsk brps'
    }
});

// Endpoint wysyłający link resetujący hasło (nie wymaga weryfikacji)
app.post('/forgot-password', async (req, res) => {
    const { email } = req.body;  // Pobieramy e-mail użytkownika z zapytania

    // Generowanie 6-cyfrowego kodu resetu
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Szukamy użytkownika w bazie danych
    const { data, error } = await supabase
        .from('users')
        .select('email, resetCode')
        .eq('email', email)
        .single();

    if (error || !data) {
        return res.status(400).json({ message: 'Użytkownik nie istnieje.' });
    }

    // Aktualizowanie resetCode w bazie danych dla tego użytkownika
    const { error: updateError } = await supabase
        .from('users')
        .update({ resetCode })
        .eq('email', email);

    if (updateError) {
        return res.status(500).json({ message: 'Błąd podczas aktualizacji kodu resetu.' });
    }

    // Wysyłanie kodu resetu na e-mail użytkownika
const mailOptions = {
    from: '"ProjektPIU2" <projekt.piu2@g`m`ail.com>', // Nadawca
    to: email, // Odbiorca
    subject: 'Kod resetu hasła',
    html: `
        <div style="width: 100%; background-color: rgba(21, 72, 75, 1); padding: 20px; font-family: 'Langar', sans-serif; box-sizing: border-box;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2); text-align: center;">
                <h1 style="font-size: 24px; color: rgba(21, 72, 75, 1); margin-bottom: 20px;">Kod resetu hasła</h1>
                <p style="font-size: 16px; color: black; margin-bottom: 30px;">Twój kod resetu hasła to:</p>
                <div style="font-size: 30px; font-weight: bold; background-color: rgba(21, 72, 75, 1); color: white; padding: 10px 20px; border-radius: 25px; display: inline-block; margin-bottom: 30px;">
                    ${resetCode}
        </div>
    `
};


    transporter.sendMail(mailOptions, (err) => {
        if (err) {
            console.error("Error sending email:", err);  // Logowanie błędu w konsoli
            return res.status(500).json({ message: 'Błąd wysyłania e-maila.' });
        }
        res.status(200).json({ message: 'Kod resetu został wysłany na Twój e-mail.' });
    });
});

// Endpoint resetowania hasła (nie wymaga weryfikacji)

app.post('/reset-password', async (req, res) => {
    const { email, resetCode, newPassword } = req.body;

    // Weryfikowanie, czy kod resetu pasuje do zapisanego kodu w bazie
    const { data, error } = await supabase
        .from('users')
        .select('resetCode, password')
        .eq('email', email)
        .single(); // Pobieramy tylko jeden rekord

    if (error || !data) {
        return res.status(400).json({ message: 'Użytkownik nie istnieje.' });
    }

    // Sprawdzanie, czy kod resetu się zgadza
    if (data.resetCode !== resetCode) {
        return res.status(400).json({ message: 'Nieprawidłowy kod resetu.' });
    }

    // Szyfrowanie nowego hasła
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Aktualizowanie hasła i usuwanie resetCode z bazy
    const { error: updateError } = await supabase
        .from('users')
        .update({ password: hashedPassword, resetCode: null }) // Resetujemy kod po zmianie hasła
        .eq('email', email);

    if (updateError) {
        return res.status(500).json({ message: 'Błąd aktualizacji hasła.' });
    }

    res.status(200).json({ message: 'Hasło zostało zmienione pomyślnie.' });
});

//endpoint aktywacji konta (nie wymaga weryfikacji)
app.get('/activate', async (req, res) => {
    const { code, email } = req.query;

    if (!code || !email) {
        return res.status(400).json({ message: 'Brak kodu aktywacyjnego lub adresu e-mail.' });
    }

    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('activationCode, isActive, imie, nazwisko, activationExpires')
            .eq('email', email)
            .single();

        if (error || !user) {
            return res.status(404).json({ message: 'Użytkownik nie istnieje.' });
        }

        if (user.isActive) {
            return res.status(400).json({ message: 'Konto jest już aktywne.' });
        }

        if (user.activationCode !== code) {
            return res.status(400).json({ message: 'Nieprawidłowy kod aktywacyjny.' });
        }

        // Sprawdzenie daty wygaśnięcia
        const now = new Date();
        if (new Date(user.activationExpires) < now) {
            return res.status(400).json({ message: 'Link aktywacyjny wygasł.' });
        }

        const { error: updateError } = await supabase
            .from('users')
            .update({ isActive: true, activationCode: null, activationExpires: null })
            .eq('email', email);

        if (updateError) {
            return res.status(500).json({ message: 'Błąd aktywacji konta.' });
        }

        res.redirect(`http://localhost:3000/activate?status=success&imie=${user.imie}&nazwisko=${user.nazwisko}`);
    } catch (err) {
        console.error('Unhandled error:', err);
        res.status(500).json({ message: 'Wewnętrzny błąd serwera.' });
    }
});

//Userpanel? (wymaga weryfikacji)
app.get('/users',verifyAccessToken, async (req, res) => {
    const { data, error } = await supabase
        .from('users')
        .select('id, imie, nazwisko, isActive, opis');

    if (error) {
        console.error('Error fetching users:', error);
        return res.status(500).json({ message: 'Błąd serwera' });
    }

    res.status(200).json(data);
});
//Profil dane o użytkowniku (wymaga weryfikacji)
app.get('/user/:id',verifyAccessToken, async (req, res) => {
    const { id } = req.params;


    try {

        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            console.error('Error fetching user:', error || 'No user found');
            return res.status(404).json({ message: 'Użytkownik nie znaleziony' });
        }

        res.status(200).json(data);
    } catch (err) {
        console.error('Unexpected error:', err);
        res.status(500).json({ message: 'Wewnętrzny błąd serwera' });
    }
});
//Aktualizacja opisu (wymaga weryfikacji)
app.put('/user/:id',verifyAccessToken, async (req, res) => {
    const userId = req.params.id;
    const { opis } = req.body;
    if (String(req.user.userId) !== String(userId)) {
        return res.status(403).json({ message: 'Nieautoryzowany dostęp.' });
    }
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !user) {
            return res.status(404).json({ message: 'Użytkownik nie znaleziony' });
        }


        const { error: updateError } = await supabase
            .from('users')
            .update({ opis })
            .eq('id', userId);

        if (updateError) {
            console.error('Błąd podczas aktualizacji opisu:', updateError);
            return res.status(500).json({ message: 'Błąd serwera podczas aktualizacji opisu' });
        }


        res.status(200).json({ message: 'Opis został zaktualizowany pomyślnie', user });
    } catch (err) {
        console.error('Błąd podczas aktualizacji opisu:', err);
        res.status(500).json({ message: 'Wewnętrzny błąd serwera' });
    }
});

// Aktualizacja zdjęcia profilowego (wymaga weryfikacji)
app.post('/upload-profile-image/:userId',verifyAccessToken, upload.single('image'), async (req, res) => {
    const { userId } = req.params;
    const file = req.file;
    if (String(req.user.userId) !== String(userId)) {
        return res.status(403).json({ message: 'Nieautoryzowany dostęp.' });
    }

    if (!file) {
        return res.status(400).json({ message: 'Plik nie został przesłany.' });
    }

    const fileExtension = 'jpeg';
    const fileName = `${userId}.${fileExtension}`;

    try {

        const resizedImageBuffer = await sharp(file.buffer)
            .resize(300, 300, { fit: sharp.fit.cover })
            .toFormat(fileExtension)
            .toBuffer();


        const { data: existingFile, error: checkError } = await supabase
            .storage
            .from('profile-image')
            .list('', { search: fileName });

        if (checkError) {
            console.error('Error checking existing file in Supabase:', checkError);
            return res.status(500).json({ message: 'Error checking file existence in Supabase.' });
        }


        if (existingFile.length > 0) {
            const { error: deleteError } = await supabase
                .storage
                .from('profile-image')
                .remove([fileName]);

            if (deleteError) {
                console.error('Error deleting existing file in Supabase:', deleteError);
                return res.status(500).json({ message: 'Error deleting existing file in Supabase.' });
            }
        }


        const { data, error } = await supabase.storage
            .from('profile-image')
            .upload(fileName, resizedImageBuffer, { contentType: `image/${fileExtension}` });

        if (error) {
            console.error('Error uploading image to Supabase:', error);
            return res.status(500).json({ message: 'Błąd przesyłania obrazu do Supabase.' });
        }

        const imageUrl = `${supabaseUrl}/storage/v1/object/public/profile-image/${fileName}?${new Date().getTime()}`;


        const { error: updateError } = await supabase
            .from('users')
            .update({ image: imageUrl })
            .eq('id', userId);

        if (updateError) {
            console.error('Error updating user profile image:', updateError);
            return res.status(500).json({ message: 'Błąd aktualizacji profilu użytkownika.' });
        }

        res.status(200).json({ message: 'Zdjęcie profilowe zostało pomyślnie przesłane.', imageUrl });
    } catch (err) {
        console.error('Unexpected error:', err);
        res.status(500).json({ message: 'Nieoczekiwany błąd serwera.' });
    }
});

//endpoint wysyłania wiadomości (wymaga weryfikacji)
app.post('/messages',verifyAccessToken, async (req, res) => {
    const { senderId, receiverId, content } = req.body;

    try {
        const { data, error } = await supabase
            .from('messages')
            .insert([{ sender_id: senderId, receiver_id: receiverId, content }]);

        if (error) {
            console.error('Error inserting message:', error.message);
            return res.status(500).json({ message: 'Error inserting message', error: error.message });
        }

        // Broadcast the message to the receiver using WebSocket
        wss.clients.forEach(client => {
            if (client.readyState === client.OPEN) {
                client.send(JSON.stringify({ senderId, receiverId, content, timestamp: new Date().toISOString() }));
            }
        });

        res.status(201).json({ message: 'Message sent successfully', data });
    } catch (err) {
        console.error('Unexpected error:', err);
        res.status(500).json({ message: 'Unexpected error', error: err });
    }
});

// Endpoint do pobierania wiadomości (wymaga weryfikacji)
app.get('/messages/:userId/:receiverId',verifyAccessToken, async (req, res) => {
    let { userId, receiverId } = req.params;

    userId = parseInt(userId, 10);
    receiverId = parseInt(receiverId, 10);

    try {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .in('sender_id', [userId, receiverId])
            .in('receiver_id', [userId, receiverId]);

        if (error) {
            console.error('Error fetching messages:', error);
            return res.status(500).json({ message: 'Error fetching messages', error });
        }

        res.status(200).json({ messages: data });
    } catch (err) {
        console.error('Unexpected error:', err);
        res.status(500).json({ message: 'Unexpected error', error: err });
    }
});

app.get('/api/user',verifyAccessToken, async (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1]; // Pobierz token z nagłówka

    if (!token) {
        return res.status(401).json({ error: 'Brak tokenu' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET); // Weryfikacja tokenu
        const userId = decoded.id;

        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !user) {
            return res.status(404).json({ error: 'Nie znaleziono użytkownika' });
        }

        res.json(user);
    } catch (err) {
        console.error('Błąd weryfikacji tokenu:', err);
        res.status(500).json({ error: 'Błąd serwera' });
    }
});

// Endpoint do pobierania postów (wymaga weryfikacji)
app.get('/api/posts',verifyAccessToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('posts')
            .select(`
                id,
                content,
                created_at,
                users:users (
                    email,
                    imie,
                    nazwisko,
                    image
                ),
                comments:comments (
                    id,
                    content,
                    created_at,
                    user_id,
                    users:users (
                        imie,
                        nazwisko,
                        email,
                        image
                    )
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.log('Błąd podczas pobierania postów:', error);
            return res.status(500).json({ error: 'Błąd pobierania postów' });
        }


        const posts = data.map(post => ({
            id: post.id,
            content: post.content,
            created_at: post.created_at,
            user: post.users ? {
                email: post.users.email || 'Nieznany użytkownik',
                imie: post.users.imie || 'Nieznane imię',
                nazwisko: post.users.nazwisko || 'Nieznane nazwisko',
                image: post.users.image || 'default-avatar.jpg',
            } : null,
            comments: post.comments.map(comment => ({
                id: comment.id,
                content: comment.content,
                created_at: comment.created_at,
                user: comment.users ? {
                    imie: comment.users.imie || 'Anonim',
                    nazwisko: comment.users.nazwisko || 'Anonim',
                    email: comment.users.email || 'Nieznany użytkownik',
                    image: comment.users.image || 'default-avatar.jpg',
                } : null
            }))
        }));

        res.status(200).json(posts);
    } catch (error) {
        console.log('Błąd serwera:', error);
        res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
});

// Endpoint do pobierania postów konkretnego użytkownika na jego profilu (wymaga weryfikacji)
app.get('/api/posts/:userId',verifyAccessToken, async (req, res) => {
    const { userId } = req.params;

    try {
        const { data, error } = await supabase
            .from('posts')
            .select(`
                id,
                content,
                created_at,
                users:users (
                    email,
                    imie,
                    nazwisko,
                    image
                )
            `)
            .eq('users_id', userId) // Filtrowanie po userId
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Błąd podczas pobierania postów użytkownika:', error);
            return res.status(500).json({ error: 'Błąd pobierania postów użytkownika' });
        }

        const posts = data.map(post => ({
            id: post.id,
            content: post.content,
            created_at: post.created_at,
            user: post.users ? {
                email: post.users.email || 'Nieznany użytkownik',
                imie: post.users.imie || 'Nieznane imię',
                nazwisko: post.users.nazwisko || 'Nieznane nazwisko',
                image: post.users.image || 'default-avatar.jpg',
            } : null
        }));

        res.status(200).json(posts);
    } catch (error) {
        console.error('Błąd serwera podczas pobierania postów użytkownika:', error);
        res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
});


// Endpoint do dodawania postów (wymaga weryfikacji)
app.post('/api/posts',verifyAccessToken, async (req, res) => {
    const { users_id, content } = req.body;

    if (!users_id || !content) {
        console.log('Brak wymaganych pól:', { users_id, content });
        return res.status(400).json({ error: 'Brakuje wymaganych pól: users_id, content' });
    }

    try {
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', users_id)
            .single();

        if (userError || !user) {
            console.log('Nie znaleziono użytkownika:', userError || 'Brak użytkownika');
            return res.status(404).json({ error: 'Nie znaleziono użytkownika' });
        }

        const { data: newPost, error: postError } = await supabase
            .from('posts')
            .insert([{
                users_id,
                content,
                created_at: new Date().toISOString(),
            }])
            .select('*')
            .single();

        if (postError) {
            console.log('Błąd dodawania posta:', postError);
            return res.status(500).json({ error: 'Błąd zapisu posta do bazy danych' });
        }

        console.log('Zapisano post:', newPost);
        res.status(201).json(newPost);
    } catch (error) {
        console.error('Błąd serwera:', error);
        res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
});
// Endpoint do pobierania komentarzy do postów (wymaga weryfikacji)
app.get('/api/comments',verifyAccessToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('comments')
            .select(`
                id,
                content,
                created_at,
                post_id,
                users:users (
                    email,
                    imie,
                    nazwisko,
                    image
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.log('Błąd podczas pobierania komentarzy:', error);
            return res.status(500).json({ error: 'Błąd pobierania komentarzy' });
        }

        const comments = data.map(comment => ({
            id: comment.id,
            content: comment.content,
            created_at: comment.created_at,
            post_id: comment.post_id,
            user: comment.users ? {
                email: comment.users.email || 'Nieznany użytkownik',
                imie: comment.users.imie || 'Nieznane imię',
                nazwisko: comment.users.nazwisko || 'Nieznane nazwisko',
                image: comment.users.image || 'default-avatar.jpg',
            } : null
        }));

        res.status(200).json(comments);
    } catch (error) {
        console.log('Błąd serwera:', error);
        res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
});

// Endpoint do dodawania komentarzy (potrzebna weryfikacja)
app.post('/api/comments',verifyAccessToken, async (req, res) => {
    const { post_id, user_id, content } = req.body;

    if (!post_id || !user_id || !content) {
        console.log('Brak wymaganych pól:', { post_id, user_id, content });
        return res.status(400).json({ error: 'Brakuje wymaganych pól: post_id, user_id, content' });
    }

    try {

        const { data: newComment, error: commentError } = await supabase
            .from('comments')
            .insert([{
                post_id,
                user_id,
                content,
                created_at: new Date().toISOString(),
            }])
            .select('*')
            .single();

        if (commentError) {
            console.log('Błąd dodawania komentarza:', commentError);
            return res.status(500).json({ error: 'Błąd zapisu komentarza do bazy danych' });
        }

        console.log('Zapisano komentarz:', newComment);
        res.status(201).json(newComment); // Zwracamy zapisany komentarz
    } catch (error) {
        console.error('Błąd serwera:', error);
        res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
});

// Aktualizacja statusu online (nie wymaga weryfikacji)

app.post('/api/activity',async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ message: 'Brakuje identyfikatora użytkownika.' });
    }

    try {
        // Poprawka: nie dodawaj +3600000 (nie przesuwaj czasu o godzinę)
        const now = new Date().toISOString();
        await supabase
            .from('users')
            .update({ last_active: now })
            .eq('id', userId);

        res.status(200).json({ message: 'Status użytkownika został zaktualizowany.' });
    } catch (error) {
        console.error('Błąd podczas aktualizacji aktywności użytkownika:', error);
        res.status(500).json({ message: 'Błąd serwera.' });
    }
});

// Sprawdzanie użytkownika czy jest online (nie wymaga weryfikacji)
app.get('/api/isonline/:userId', async (req, res) => {
    const { userId } = req.params;

    if (!userId) {
        return res.status(400).json({ message: 'Brakuje identyfikatora użytkownika.' });
    }

    try {
        const { data, error } = await supabase
            .from('users')
            .select('last_active')
            .eq('id', userId)
            .single();

        console.log('Sprawdzanie online:', { userId, data, error, now: new Date().toISOString() }); // LOG

        if (error) {
            return res.status(500).json({ message: 'Błąd podczas pobierania danych.' });
        }

        if (!data || !data.last_active) {
            return res.status(200).json({ isOnline: false }); // Jeśli brak last_active, uznaj za offline
        }

        // Upewnij się, że last_active jest w UTC (z Z na końcu)
        let lastActiveStr = data.last_active;
        if (lastActiveStr && !lastActiveStr.endsWith('Z')) {
            lastActiveStr += 'Z';
        }
        const lastActiveUTC = new Date(lastActiveStr);
        const timeDiffSeconds = (new Date() - lastActiveUTC) / 1000;
        const isOnline = timeDiffSeconds < 60;
        res.status(200).json({ isOnline });
    } catch (error) {
        console.error('Błąd podczas sprawdzania statusu online użytkownika:', error);
        res.status(500).json({ message: 'Błąd serwera.' });
    }
});

app.post('/api/invitations/send',verifyAccessToken, async (req, res) => {
  const { sender_id, receiver_id } = req.body;

  try {
    const { data, error } = await supabase
      .from('invitations')
      .insert([{ sender_id, receiver_id }]);

    if (error) {
      throw error;
    }

    res.status(200).json({ message: 'Invitation sent successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send invitation' });
  }
});


app.get('/api/invitations/sent/:senderId',verifyAccessToken, async (req, res) => {
  const { senderId } = req.params;

  try {
    // Fetch sent invitations with user details
    const { data, error } = await supabase
      .from('invitations')
      .select('users:receiver_id(id, imie, nazwisko, image)')
      .eq('sender_id', senderId);

    if (error) {
      throw error;
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching sent invitations:", error);
    res.status(500).json({ error: 'Failed to fetch sent invitations' });
  }
});

// Endpoint to fetch received invitations
app.get('/api/invitations/received',verifyAccessToken, async (req, res) => {
  const { receiver_id } = req.query;

  try {
    // Fetch received invitations with user details
    const { data, error } = await supabase
      .from('invitations')
      .select('users:sender_id(id, imie, nazwisko, image)')
      .eq('receiver_id', receiver_id);

    if (error) {
      throw error;
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching received invitations:", error);
    res.status(500).json({ error: 'Failed to fetch received invitations' });
  }
});



app.get('/api/friends', verifyAccessToken, async (req, res) => {
  const { user_id } = req.query;

  try {
    // Fetch all friendships involving the logged-in user (user_id)
    const { data: friends, error: friendsError } = await supabase
      .from('friends')
      .select('user_id1, user_id2')
      .or(`user_id1.eq.${user_id}, user_id2.eq.${user_id}`); // Fetch friendships

    if (friendsError) {
      throw friendsError;
    }

    // If no friends are found, return an empty list
    if (friends.length === 0) {
      return res.status(200).json([]);
    }

    // Extract user IDs that are friends with the logged-in user, excluding the logged-in user itself
    const relatedUserIds = friends.map(friend => {
      // If user_id1 is the logged-in user, select user_id2, else select user_id1
      return friend.user_id1 == user_id ? friend.user_id2 : friend.user_id1;
    });

    // Fetch all related users in one query, ensuring the logged-in user is excluded
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, imie, nazwisko, image, email')
      .in('id', relatedUserIds);  // Use the IN operator to fetch all users in one go

    if (usersError) {
      throw usersError;
    }

    // Return the list of users (friends), excluding the logged-in user
    res.status(200).json(users);

  } catch (error) {
    console.error('Error fetching friends or users:', error);
    res.status(500).json({ error: 'Failed to fetch related users.' });
  }
});

app.get('/api/friends/check',verifyAccessToken, async (req, res) => {
  const { user_id_1, user_id_2 } = req.query;

  try {
    // Check if there's a friendship between user_id_1 and user_id_2
    const { data, error } = await supabase
      .from('friends')
      .select('user_id1, user_id2')
      .or(`user_id1.eq.${user_id_1}, user_id2.eq.${user_id_1}`)
      .or(`user_id1.eq.${user_id_2}, user_id2.eq.${user_id_2}`);

    if (error) {
      throw error;
    }

    // If there is a friendship between user_id_1 and user_id_2, return true
    const isFriend = data.some(friendship =>
      (friendship.user_id1 === user_id_1 && friendship.user_id2 === user_id_2) ||
      (friendship.user_id1 === user_id_2 && friendship.user_id2 === user_id_1)
    );

    res.status(200).json({ isFriend });

  } catch (error) {
    console.error('Error checking friendship:', error);
    res.status(500).json({ error: 'Failed to check friendship.' });
  }
});





app.delete('/api/friends/del/:id1/:id2',verifyAccessToken, async (req, res) => {
  let { id1, id2 } = req.params;

  // Ensure lower ID is always the first one
  if (parseInt(id1) > parseInt(id2)) {
    [id1, id2] = [id2, id1];
  }

  try {
    // Validate that both IDs are numbers
    if (isNaN(id1) || isNaN(id2)) {
      return res.status(400).json({ error: 'Invalid user IDs' });
    }

    // Delete the friendship record
    const { data, error } = await supabase
      .from('friends')
      .delete()
      .eq('user_id1', id1)
      .eq('user_id2', id2);

    if (error) {
      throw error;
    }

    // Handle cases where no friendship is found
    if (data.length > 0) {
      res.status(200).json({ message: 'Removed from friends successfully' });
    } else {
      res.status(404).json({ message: 'Friendship not found' });
    }
  } catch (error) {
    // Catch and report any errors
    res.status(500).json({ error: error.message || 'Failed to remove from friends' });
  }
});


app.post('/api/friends/add',verifyAccessToken, async (req, res) => {
  const { sender_id, receiver_id } = req.body;

  try {
    // Step 1: Check if the users are already friends
    const { data: existingFriendship, error: friendshipError } = await supabase
      .from('friends')
      .select('*')
      .or(`user_id1.eq.${sender_id},user_id2.eq.${sender_id}`)
      .or(`user_id1.eq.${receiver_id},user_id2.eq.${receiver_id}`);

    if (friendshipError) {
      throw friendshipError;
    }

    if (existingFriendship.length > 0) {
      return res.status(400).json({ error: 'Already friends' });
    }

    // Step 2: Add friendship record
    const { data: friendData, error: friendError } = await supabase
      .from('friends')
      .insert([{ user_id1: sender_id, user_id2: receiver_id }]);

    if (friendError) {
      throw friendError;
    }

    // Step 3: Delete the invitation in both orders after the friendship is added
    const { error: inviteError } = await supabase
      .from('invitations')
      .delete()
      .or(
        `and(sender_id.eq.${sender_id},receiver_id.eq.${receiver_id}),and(sender_id.eq.${receiver_id},receiver_id.eq.${sender_id})`
      );

    if (inviteError) {
      throw inviteError;
    }

    // Respond back with success message
    res.status(200).json({ message: 'Added to friends successfully' });
  } catch (error) {
    console.error(error); // Log error for debugging
    res.status(500).json({ error: 'Failed to add to friends' });
  }
});



app.delete('/api/invitations/del/:sender_id/:receiver_id',verifyAccessToken, async (req, res) => {
  const { sender_id, receiver_id } = req.params;

  try {
    // Perform the delete operation in Supabase without returning the deleted rows
    const { data, error, count } = await supabase
      .from('invitations')
      .delete()
      .eq('sender_id', sender_id)
      .eq('receiver_id', receiver_id);

    // If there is a database error, log it and send a 500 response
    if (error) {
      console.error('Supabase error:', error);  // Log the error for debugging
      return res.status(500).json({ error: 'Failed to delete invitation' });
    }

    // If no rows were affected (deleted), return a 404 response
    if (count === 0) {
      return res.status(404).json({ message: 'Invitation not found' });
    }

    // Successfully deleted the invitation, return a 200 response
    res.status(200).json({ message: 'Invitation deleted successfully' });
  } catch (error) {
    // Catch any unexpected errors and log them
    console.error('Internal Server Error:', error);  // Log the error for debugging
    res.status(500).json({ error: 'Failed to delete invitation' });
  }
});

// Endpoint: lista ID użytkowników online (ostatnia aktywność < 60s)
app.get('/api/online-users', async (req, res) => {
    try {
        const now = new Date();
        // Pobierz wszystkich użytkowników, których ostatnia aktywność była w ciągu ostatnich 60 sekund
        const { data, error } = await supabase
            .from('users')
            .select('id, last_active');

        if (error) {
            return res.status(500).json({ message: 'Błąd pobierania użytkowników.' });
        }

        const onlineIds = data
            .filter(user => user.last_active && (now - new Date(user.last_active)) / 1000 < 60)
            .map(user => user.id);

        res.status(200).json({ online: onlineIds });
    } catch (error) {
        console.error('Błąd podczas pobierania online users:', error);
        res.status(500).json({ message: 'Błąd serwera.' });
    }
});

// Dodaj reakcję do wiadomości
app.post('/api/message-reactions', verifyAccessToken, async (req, res) => {
    const { message_id, user_id, reaction } = req.body;
    if (!message_id || !user_id || !reaction) {
        return res.status(400).json({ error: 'Brak wymaganych pól.' });
    }
    try {
        // Najpierw usuń WSZYSTKIE reakcje tego użytkownika do tej wiadomości
        await supabase
            .from('message_reactions')
            .delete()
            .eq('message_id', message_id)
            .eq('user_id', user_id);
        
        // Następnie dodaj nową reakcję
        const { data, error } = await supabase
            .from('message_reactions')
            .insert([{ message_id, user_id, reaction, created_at: new Date().toISOString() }])
            .select('*')
            .single();
        
        if (error) {
            return res.status(500).json({ error: 'Błąd dodawania reakcji.' });
        }
        
        // Pobierz wszystkie reakcje do tej wiadomości po dodaniu nowej
        const { data: allReactions, error: fetchError } = await supabase
            .from('message_reactions')
            .select('id, user_id, reaction, created_at')
            .eq('message_id', message_id);
        
        if (fetchError) {
            return res.status(500).json({ error: 'Błąd pobierania reakcji.' });
        }
        
        // Wyślij aktualizację przez WebSocket do wszystkich połączonych użytkowników
        const updateMessage = {
            type: 'reaction_update',
            message_id: message_id,
            reactions: allReactions
        };
        
        // Wyślij przez WebSocket do wszystkich połączonych klientów
        wss.clients.forEach(client => {
            if (client.readyState === client.OPEN) {
                client.send(JSON.stringify(updateMessage));
            }
        });
        
        res.status(201).json(allReactions);
    } catch (err) {
        console.error('Błąd serwera:', err);
        res.status(500).json({ error: 'Błąd serwera.' });
    }
});

// Usuń reakcję użytkownika do wiadomości
app.delete('/api/message-reactions', verifyAccessToken, async (req, res) => {
    const { message_id, user_id, reaction } = req.body;
    if (!message_id || !user_id || !reaction) {
        return res.status(400).json({ error: 'Brak wymaganych pól.' });
    }
    try {
        const { error } = await supabase
            .from('message_reactions')
            .delete()
            .eq('message_id', message_id)
            .eq('user_id', user_id)
            .eq('reaction', reaction);
        
        if (error) {
            return res.status(500).json({ error: 'Błąd usuwania reakcji.' });
        }
        
        // Pobierz wszystkie pozostałe reakcje do tej wiadomości
        const { data: allReactions, error: fetchError } = await supabase
            .from('message_reactions')
            .select('id, user_id, reaction, created_at')
            .eq('message_id', message_id);
        
        if (fetchError) {
            return res.status(500).json({ error: 'Błąd pobierania reakcji.' });
        }
        
        // Wyślij aktualizację przez WebSocket
        const updateMessage = {
            type: 'reaction_update',
            message_id: message_id,
            reactions: allReactions || []
        };
        
        // Wyślij przez WebSocket do wszystkich połączonych klientów
        wss.clients.forEach(client => {
            if (client.readyState === client.OPEN) {
                client.send(JSON.stringify(updateMessage));
            }
        });
        
        res.status(200).json({ message: 'Reakcja usunięta.', reactions: allReactions || [] });
    } catch (err) {
        console.error('Błąd serwera:', err);
        res.status(500).json({ error: 'Błąd serwera.' });
    }
});

// Pobierz reakcje do wiadomości (wszystkie typy i użytkowników)
app.get('/api/message-reactions/:message_id', verifyAccessToken, async (req, res) => {
    const { message_id } = req.params;
    if (!message_id) {
        return res.status(400).json({ error: 'Brak message_id.' });
    }
    try {
        const { data, error } = await supabase
            .from('message_reactions')
            .select('id, user_id, reaction, created_at')
            .eq('message_id', message_id);
        
        if (error) {
            return res.status(500).json({ error: 'Błąd pobierania reakcji.' });
        }
        
        res.status(200).json(data || []);
    } catch (err) {
        console.error('Błąd serwera:', err);
        res.status(500).json({ error: 'Błąd serwera.' });
    }
});


// Starting server
server.listen(3080, () => {
    console.log('Server started on port 3080');
});