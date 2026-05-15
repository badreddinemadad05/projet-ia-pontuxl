// gestion du chat PBot (texte + vocal)


// utilitaires

function toArray(str) {
    const array = [];
    for (let i = 0; i < str.length; ++i)
        array.push(str.charCodeAt(i));
    array.push(10);
    return array;
}

function fromArrayCodeToString(arr) {
    var res = [];
    for (var i = 0; i < arr.length; i++)
        res.push(String.fromCharCode(arr[i]));
    return res.join("");
}

function jmjCodeToString(parr) {
    if (!parr || parr.args.length == 0) return [];
    const arr = jmjCodeToString(parr.args[1]);
    arr.unshift(parr.args[0].value);
    return arr;
}


// session prolog pourle bot

const plSession = new PrologSession();

// synthese vocal

const speech = new SpeechSynthesisUtterance();
speech.lang = "fr-FR";
speech.volume = 1;
speech.rate = 1;
speech.pitch = 1;

function parler(texte) {
    speech.text = texte;
    window.speechSynthesis.speak(speech);
}

// affichage dans le chat

function afficherUtilisateur(texte) {
    const texts = document.getElementById("bot-texts");
    const p = document.createElement("p");
    p.classList.add("user-msg");
    p.innerText = "Vous : " + texte;
    texts.appendChild(p);
    texts.scrollTop = texts.scrollHeight;
}

function afficherBot(texte) {
    const texts = document.getElementById("bot-texts");
    const p = document.createElement("p");
    p.classList.add("bot-msg");
    p.style.whiteSpace = "pre-line";
    p.innerText = "PBot : " + texte;
    texts.appendChild(p);
    texts.scrollTop = texts.scrollHeight;
    parler(texte);
}

// traitement de question

function traiterQuestion(texte) {
    if (!texte || texte.trim() === "") return;

    afficherUtilisateur(texte);

    const question = toArray(texte.toLowerCase());
    plSession.query(`
        lire_question([${question}], L_Mots),
        produire_reponse(L_Mots, L_reponse),
        transformer_reponse_en_string(L_reponse, Message).
    `);

    const response = plSession.get_response();
    const realResponse = fromArrayCodeToString(jmjCodeToString(response));

    if (realResponse.includes("CONSEIL_IA")) {
        // Le conseil est géré par board.js (asynchrone)
        demanderConseilIA();
    } else {
        const reponseFinale = realResponse || "Je ne sais pas.";
        afficherBot(reponseFinale);
    }
}


// envou

function sendMessage() {
    const input = document.getElementById("bot-input");
    const texte = input.value.trim();
    if (!texte) return;
    input.value = "";
    traiterQuestion(texte);
}

document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("bot-input");
    if (input) {
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") sendMessage();
        });
    }
});


// reconnaissance vocal

window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition = null;
let micActif = false;

function initVocal() {
    if (!window.SpeechRecognition) {
        console.warn("SpeechRecognition non supporté dans ce navigateur.");
        const btn = document.getElementById("btn-mic");
        if (btn) {
            btn.style.display = "none";
        }
        return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.addEventListener("result", (e) => {
        const texte = Array.from(e.results)
            .map(r => r[0].transcript)
            .join("");
        console.log("Vocal reconnu:", texte);

        
        traiterQuestion(texte);
        arreterMic();
    });

    recognition.addEventListener("error", (e) => {
        console.warn("Erreur reconnaissance vocale:", e.error);
        arreterMic();
    });

    recognition.addEventListener("end", () => {
        if (micActif) arreterMic();
    });
}

function demarrerMic() {
    if (!recognition) {
        initVocal();
    }
    if (!recognition) return;

    micActif = true;
    const btn = document.getElementById("btn-mic");
    if (btn) {
        btn.style.backgroundColor = "#e74c3c";
        btn.innerText = "🔴 En écoute...";
    }
    afficherBot("Je vous écoute, parlez maintenant...");
    try {
        recognition.start();
    } catch (e) {
        console.warn("Reconnaissance vocale déjà active");
    }
}

function arreterMic() {
    micActif = false;
    const btn = document.getElementById("btn-mic");
    if (btn) {
        btn.style.backgroundColor = "#8e44ad";
        btn.innerText = "🎤 Parler";
    }
    if (recognition) {
        try {
            recognition.stop();
        } catch (e) {
        }
    }
}

function toggleMic() {
    if (micActif) arreterMic();
    else demarrerMic();
}

// Initialiser le vocal au chargement
document.addEventListener("DOMContentLoaded", () => {
    initVocal();
});