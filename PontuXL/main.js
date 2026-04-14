function toArray(str) {
  const array = [];
  for (let i = 0; i < str.length; ++i) {
    array.push(str.charCodeAt(i));
  }
  array.push(10); // newline
  return array;
}

function fromArrayCodeToString(arr) {
  const res = [];
  for (let i = 0; i < arr.length; i++) {
    res.push(String.fromCharCode(arr[i]));
  }
  return res.join("");
}

function jmjCodeToString(parr) {
  if (!parr || !parr.args) return [];
  if (parr.args.length === 0) return [];
  const arr = jmjCodeToString(parr.args[1]);
  arr.unshift(parr.args[0].value);
  return arr;
}

const plSession = new PrologSession();
let lastBotResponse = "";

/* ============================================================
   OUTILS
============================================================ */

function normalizeFrenchText(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // enlève les accents
    .replace(/['’\-]/g, " ");        // apostrophes et tirets -> espaces
}

function appendUserMessage(text) {
  const texts = document.getElementById("bot-texts");
  const pUser = document.createElement("p");
  pUser.classList.add("user-msg");
  pUser.innerText = "Vous : " + text;
  texts.appendChild(pUser);
  texts.scrollTop = texts.scrollHeight;
}

function appendBotMessage(text) {
  const texts = document.getElementById("bot-texts");
  const pBot = document.createElement("p");
  pBot.classList.add("bot-msg");
  pBot.innerText = "PBot : " + text;
  texts.appendChild(pBot);
  texts.scrollTop = texts.scrollHeight;
  lastBotResponse = text;
}

/* ============================================================
   ENVOI MESSAGE
============================================================ */

function sendMessage(customText = null) {
  const input = document.getElementById("bot-input");
  const text = customText !== null ? customText.trim() : input.value.trim();
  if (!text) return;

  appendUserMessage(text);

  const normalizedText = normalizeFrenchText(text);
  const question = toArray(normalizedText);

  plSession.reset_response();
  plSession.query(`
    lire_question([${question}], L_Mots),
    produire_reponse(L_Mots, L_reponse),
    transformer_reponse_en_string(L_reponse, Message).
  `);

  // Petit délai pour laisser Tau-Prolog répondre
  setTimeout(() => {
    let realResponse = "Je ne sais pas.";

    try {
      const response = plSession.get_response();
      if (response) {
        const decoded = fromArrayCodeToString(jmjCodeToString(response));
        if (decoded && decoded.trim() !== "") {
          realResponse = decoded;
        }
      }
    } catch (err) {
      console.error("Erreur lors du décodage de la réponse Prolog :", err);
    }

    appendBotMessage(realResponse);

    if (customText === null) {
      input.value = "";
    }
  }, 100);
}

/* ============================================================
   RECONNAISSANCE VOCALE
============================================================ */

function startVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("La reconnaissance vocale n'est pas supportee sur ce navigateur. Utilisez Chrome ou Edge.");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "fr-FR";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  const voiceButton = document.getElementById("bot-voice");
  if (voiceButton) {
    voiceButton.disabled = true;
    voiceButton.innerText = "🎤 Ecoute...";
  }

  recognition.onresult = function (event) {
    const transcript = event.results[0][0].transcript;
    const input = document.getElementById("bot-input");
    if (input) input.value = transcript;
    sendMessage(transcript);
  };

  recognition.onerror = function (event) {
    console.error("Erreur reconnaissance vocale :", event.error);
    alert("Erreur micro / reconnaissance vocale : " + event.error);
  };

  recognition.onend = function () {
    if (voiceButton) {
      voiceButton.disabled = false;
      voiceButton.innerText = "🎤 Parler";
    }
  };

  recognition.start();
}

/* ============================================================
   SYNTHÈSE VOCALE
============================================================ */

function speakLastBotMessage() {
  if (!lastBotResponse) {
    alert("Aucune reponse a lire.");
    return;
  }

  if (!("speechSynthesis" in window)) {
    alert("La synthese vocale n'est pas supportee sur ce navigateur.");
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(lastBotResponse);
  utterance.lang = "fr-FR";
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;

  const voices = window.speechSynthesis.getVoices();
  const frenchVoice = voices.find(v => v.lang && v.lang.toLowerCase().startsWith("fr"));
  if (frenchVoice) {
    utterance.voice = frenchVoice;
  }

  window.speechSynthesis.speak(utterance);
}

// Précharge les voix
if ("speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}

/* ============================================================
   TOUCHE ENTRÉE
============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("bot-input");
  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        sendMessage();
      }
    });
  }
});