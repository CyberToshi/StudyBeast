# 🔐 Authentifizierungs-Modul - Integrations-Anleitung

## 📋 Inhaltsverzeichnis
1. [Firebase-Setup](#firebase-setup)
2. [Integration in Ihr HTML](#integration)
3. [API-Referenz](#api)
4. [Sicherheit](#sicherheit)
5. [Verwendungsbeispiele](#beispiele)

---

## 🔧 Firebase-Setup

### Schritt 1: Firebase-Projekt erstellen
1. Gehen Sie zu [firebase.google.com](https://firebase.google.com)
2. Klicken Sie auf "Zum Konsole gehen"
3. Erstellen Sie ein neues Projekt: `SQL-Quiz` (oder ähnlich)

### Schritt 2: Firestore Database erstellen
1. Gehen Sie zu "Firestore Database"
2. Klicken Sie "Datenbank erstellen"
3. Wählen Sie "Produktionsmodus"
4. Wählen Sie Ihre Region (z.B. `europe-west1` für Europa)

### Schritt 3: Firestore Security Rules
Ersetzen Sie die Standard-Rules mit dieser Sicherheitskonfiguration:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      // Nur der Benutzer kann sein Dokument lesen/schreiben
      allow read, write: if request.auth.uid == userId;
      // Query erlaubt
      allow read: if true;
    }
  }
}
```

### Schritt 4: Web App registrieren
1. Gehen Sie zu "Projekteinstellungen"
2. Gehen Sie zur Registerkarte "Apps"
3. Klicken Sie auf "</>" (Web App)
4. Kopieren Sie die **firebaseConfig**

### Schritt 5: Konfiguration in Ihrem Code
Ersetzen Sie in `auth-module.html` diese Zeilen:

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyDEXAMPLE",           // ← Ihre apiKey
    authDomain: "projekt.firebaseapp.com",
    projectId: "projekt-12345",        // ← Ihre projectId
    storageBucket: "projekt.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcd1234"
};
```

---

## 📝 Integration in Ihr HTML

### Option 1: Separates Modul (Empfohlen)

Kopieren Sie einfach **alles** aus `auth-module.html` und fügen Sie es **vor dem schließenden `</body>` Tag** ein:

```html
<!-- ... Ihr bestehender HTML Code ... -->

<!-- ===== AUTHENTIFIZIERUNG MODUL EINFÜGEN ===== -->
<!-- Kopieren Sie ALLES aus auth-module.html hier ein -->

</body>
</html>
```

### Option 2: Inline-Integration

Wenn Sie nur Teile benötigen:

**In `<head>` einfügen:**
```html
<!-- Firebase & bcryptjs -->
<script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/bcryptjs/2.4.3/bcrypt.min.js"></script>

<!-- Styles aus auth-module.html kopieren -->
<style>
    /* ... */
</style>
```

**Im `<body>` einfügen:**
```html
<!-- HTML-Struktur aus auth-module.html -->
<div id="auth-section">
    <!-- ... -->
</div>
```

**Vor `</body>` einfügen:**
```html
<script>
    // JavaScript-Code aus auth-module.html
</script>
```

---

## 🔌 API-Referenz

### Verfügbare Funktionen

#### 1. **Aktuellen Benutzer abrufen**
```javascript
const user = window.Auth.getCurrentUser();
// Gibt zurück: {id, username, score, level, ...}
```

#### 2. **Überprüfen ob angemeldet**
```javascript
if (window.Auth.isLoggedIn()) {
    console.log('Benutzer ist angemeldet');
}
```

#### 3. **Beliebige Daten speichern**
```javascript
await window.Auth.updateUserData({
    score: 150,
    level: 5,
    customField: 'value'
});
```

#### 4. **Score erhöhen**
```javascript
await window.Auth.addScore(10);  // +10 Punkte
```

#### 5. **Level setzen**
```javascript
await window.Auth.setLevel(3);
```

#### 6. **Fortschritt setzen (0-100)**
```javascript
await window.Auth.setProgress(75);  // 75%
```

---

## 📊 Datenstruktur in Firestore

Jeder Benutzer wird so gespeichert:

```json
{
  "username": "max_mustermann",          // Lowercase, eindeutig
  "usernameDisplay": "Max Mustermann",   // Anzeigename
  "passwordHash": "$2a$10$...",          // Gehashtes Passwort (bcrypt)
  "score": 0,                            // Punkte
  "level": 1,                            // Level
  "progress": 0,                         // Fortschritt 0-100
  "createdAt": "2024-01-11T10:30:00Z",  // Registrierungsdatum
  "lastLogin": "2024-01-11T15:45:00Z",  // Letzter Login
  "stats": {                             // Statistiken
    "quizzesCompleted": 5,
    "correctAnswers": 42,
    "totalAnswers": 50
  }
}
```

---

## 🔒 Sicherheit

### ✅ Implementiert

- ✅ **Passwort-Hashing** mit bcrypt (10 Salt-Runden)
- ✅ **Eindeutige Benutzernamen** (Datenbank-Abfrage)
- ✅ **Session-Management** mit localStorage
- ✅ **Niemals unverschlüsselte Passwörter**
- ✅ **Validierung** auf Client und Server

### ⚠️ Wichtig zu wissen

1. **Passwörter** werden mit bcrypt gehashed → auch Admin kann das Passwort nicht sehen
2. **Session speichert NUR** Benutzer-ID und Name (kein Passwort)
3. **localStorage** wird beim Logout gelöscht
4. **Firestore Rules** sollten aktiviert sein!

### 🔐 Best Practices

```javascript
// ❌ FALSCH
if (user.password === inputPassword) { }

// ✅ RICHTIG (wird automatisch gemacht)
const isValid = await comparePassword(inputPassword, user.passwordHash);
```

---

## 💡 Verwendungsbeispiele

### Beispiel 1: Quiz nach Login einblenden

```html
<div id="quiz-section" class="hidden">
    <!-- Ihr Quiz hier -->
</div>

<script>
    // Wenn Seite lädt
    if (window.Auth.isLoggedIn()) {
        document.getElementById('quiz-section').classList.remove('hidden');
    }
</script>
```

### Beispiel 2: Score beim Antwort speichern

```javascript
// Benutzer beantwortet eine Frage richtig
if (isAnswerCorrect) {
    await window.Auth.addScore(10);
    console.log('✅ 10 Punkte hinzugefügt!');
}
```

### Beispiel 3: Fortschritt speichern

```javascript
// Nach jedem Quiz
const progressPercent = (completedQuizzes / totalQuizzes) * 100;
await window.Auth.setProgress(Math.round(progressPercent));
```

### Beispiel 4: Benutzer-Daten auslesen

```javascript
const user = window.Auth.getCurrentUser();

if (user) {
    console.log(`Willkommen ${user.usernameDisplay}!`);
    console.log(`Dein Score: ${user.score}`);
    console.log(`Dein Level: ${user.level}`);
}
```

### Beispiel 5: Komplexe Daten speichern

```javascript
await window.Auth.updateUserData({
    stats: {
        quizzesCompleted: 10,
        correctAnswers: 85,
        totalAnswers: 100,
        avgTime: 45.5
    }
});
```

---

## 🐛 Debugging

### Console Logs anschalten

```javascript
// Am Anfang des Moduls ist bereits eingebaut:
console.log('✅ Authentifizierungs-Modul geladen');
```

### Aktuelle Session prüfen

```javascript
// In der Browser-Konsole:
console.log(localStorage.getItem('currentSession'));
console.log(window.Auth.getCurrentUser());
```

### Firestore prüfen

1. Öffnen Sie Firebase Console
2. Gehen Sie zu "Firestore Database"
3. Sie sollten eine Collection `users` sehen mit Ihren Dokumenten

---

## 📞 Häufige Probleme

| Problem | Lösung |
|---------|--------|
| `firebase is not defined` | Firebase CDN-Links prüfen, Internet-Verbindung prüfen |
| `bcrypt is not defined` | bcryptjs CDN korrekt eingebunden? |
| `Benutzer oder Passwort falsch` | Überprüfen Sie, ob Benutzer in Firestore existiert |
| Session wird nicht gespeichert | localStorage muss aktiviert sein |
| CORS-Fehler | Firebase Project-Einstellungen überprüfen |

---

## 📚 Zusätzliche Ressourcen

- [Firebase Dokumentation](https://firebase.google.com/docs)
- [Firestore Sicherheit](https://firebase.google.com/docs/firestore/security)
- [bcryptjs](https://github.com/dcodeIO/bcrypt.js)

---

**Version:** 1.0  
**Zuletzt aktualisiert:** Januar 2026
