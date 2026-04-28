// ============================================================
// CHATBOT TEXTUEL — INTERFACE UTILISATEUR (main.js)
//
// Ce fichier gere le chatbot "PBot" qui repond aux questions
// sur les regles du jeu PontuXL.
//
// Il s'appuie sur plSession (instance de PrologSession) pour
// interroger le moteur Prolog. La reponse Prolog est convertie
// en texte lisible et affichee dans la zone de chat de la page.
//
// Fonctionnalites gerees ici :
//   - Envoi et affichage des messages (texte ou voix)
//   - Reconnaissance vocale (micro du navigateur)
//   - Synthese vocale (le bot peut lire sa reponse a voix haute)
//   - Touche Entree pour envoyer un message
// ============================================================


// ============================================================
// CONVERSION TEXTE <-> CODES PROLOG
//
// Tau-Prolog represente les chaines de caracteres comme des
// listes de codes numeriques (codes ASCII de chaque lettre).
// Ces trois fonctions font le lien entre le texte JavaScript
// et ce format interne de Prolog.
// ============================================================

// Convertit une chaine JavaScript en tableau de codes de caracteres.
// On ajoute le code 10 (retour a la ligne) a la fin, comme Prolog le fait.
// Exemple : "hi" → [104, 105, 10]
//
// str : la chaine a convertir
//
// Retourne : un tableau de nombres (codes ASCII)
function toArray(str) {
  const array = [];
  for (let i = 0; i < str.length; ++i) {
    array.push(str.charCodeAt(i));
  }
  array.push(10); // code ASCII du retour a la ligne
  return array;
}

// Convertit un tableau de codes de caracteres en chaine JavaScript.
// C'est l'operation inverse de toArray().
// Exemple : [104, 101, 108, 108, 111] → "hello"
//
// arr : tableau de codes ASCII
//
// Retourne : la chaine correspondante
function fromArrayCodeToString(arr) {
  const res = [];
  for (let i = 0; i < arr.length; i++) {
    res.push(String.fromCharCode(arr[i]));
  }
  return res.join("");
}

// Parcourt la structure interne d'une liste Tau-Prolog et
// en extrait les valeurs numeriques sous forme de tableau JS.
// Tau-Prolog represente une liste comme une serie de noeuds imbriques :
//   chaque noeud a args[0] = la tete (premier element)
//               et args[1] = la queue (reste de la liste)
// Cette fonction parcourt recursivement ces noeuds jusqu'a la fin.
//
// parr : un noeud de liste Tau-Prolog (objet interne de tau-prolog.js)
//
// Retourne : un tableau de nombres (les codes de caracteres de la liste)
function jmjCodeToString(parr) {
  if (!parr || !parr.args) return [];
  if (parr.args.length === 0) return [];
  const arr = jmjCodeToString(parr.args[1]);
  arr.unshift(parr.args[0].value);
  return arr;
}


// ============================================================
// INITIALISATION DE LA SESSION PROLOG ET DE L'ETAT DU BOT
// ============================================================

// On cree une seule instance du moteur Prolog pour toute la page.
// Elle charge les regles du chatbot (chat_bot.js) et repond
// aux requetes de sendMessage() et handleAIMove() (dans board.js).
const plSession = new PrologSession();

// On garde en memoire la derniere reponse du bot pour pouvoir
// la relire a voix haute via speakLastBotMessage().
let lastBotResponse = "";


// ============================================================
// FONCTIONS D'AFFICHAGE DANS LA ZONE DE CHAT
// ============================================================

// Nettoie le texte de l'utilisateur pour que Prolog puisse
// le comparer correctement a ses mots-cles.
// On met tout en minuscules, on enleve les accents, et on
// remplace apostrophes et tirets par des espaces.
// Exemple : "Qu'est-ce que c'est ?" → "qu est ce que c est "
//
// text : le texte brut tape par l'utilisateur
//
// Retourne : le texte normalise, sans accents ni majuscules
function normalizeFrenchText(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // enleve les accents (plage Unicode des diacritiques)
    .replace(/[''\-]/g, " ");        // apostrophes et tirets → espaces
}

// Ajoute un message de l'utilisateur dans la zone de chat (bulle a droite).
// Cree un element <p> avec la classe CSS "user-msg".
//
// text : le texte que l'utilisateur a envoye
function appendUserMessage(text) {
  const texts = document.getElementById("bot-texts");
  const pUser = document.createElement("p");
  pUser.classList.add("user-msg");
  pUser.innerText = "Vous : " + text;
  texts.appendChild(pUser);
  texts.scrollTop = texts.scrollHeight; // on fait defiler vers le bas automatiquement
}

// Ajoute une reponse du bot dans la zone de chat (bulle a gauche).
// Cree un element <p> avec la classe CSS "bot-msg".
// Sauvegarde aussi la reponse pour la synthese vocale.
//
// text : la reponse que PBot affiche
function appendBotMessage(text) {
  const texts = document.getElementById("bot-texts");
  const pBot = document.createElement("p");
  pBot.classList.add("bot-msg");
  pBot.innerText = "PBot : " + text;
  texts.appendChild(pBot);
  texts.scrollTop = texts.scrollHeight; // on fait defiler vers le bas automatiquement
  lastBotResponse = text; // on garde la reponse pour pouvoir la lire a voix haute
}


// ============================================================
// ENVOI D'UN MESSAGE AU CHATBOT
// ============================================================

// Envoie le message de l'utilisateur a PBot et affiche la reponse.
// Appelee quand l'utilisateur clique "Envoyer", appuie sur Entree,
// ou termine une dictee vocale.
//
// La fonction est "async" parce qu'elle utilise "await" pour attendre
// la reponse de Prolog. Pendant ce temps, la page reste interactive.
//
// customText : texte a envoyer directement (utile pour la reconnaissance
//              vocale). Si null, on lit le contenu du champ de saisie.
async function sendMessage(customText = null) {
  const input = document.getElementById("bot-input");
  const text = customText !== null ? customText.trim() : input.value.trim();
  if (!text) return; // rien a faire si le champ est vide

  appendUserMessage(text);

  // On nettoie le texte et on le convertit en codes Prolog
  const normalizedText = normalizeFrenchText(text);
  const question = toArray(normalizedText);

  let realResponse = "Je ne sais pas."; // reponse par defaut si Prolog ne trouve rien

  try {
    // On interroge Prolog avec la question de l'utilisateur.
    // La requete demande a Prolog de :
    //   1. Lire la question (la convertir en liste de mots)
    //   2. Trouver la reponse adaptee selon les regles du chatbot
    //   3. Mettre la reponse dans la variable "Message" (chaine de caracteres)
    // On attend la reponse avec "await" : Prolog peut prendre un moment.
    const response = await plSession.query(`
      lire_question([${question}], L_Mots),
      produire_reponse(L_Mots, L_reponse),
      transformer_reponse_en_string(L_reponse, Message).
    `);

    // Si Prolog a trouve une reponse, on la convertit de codes Prolog en texte JS
    if (response) {
      const decoded = fromArrayCodeToString(jmjCodeToString(response));
      if (decoded && decoded.trim() !== "") {
        realResponse = decoded;
      }
    }
  } catch (err) {
    console.error("Erreur lors du decodage de la reponse Prolog :", err);
  }

  appendBotMessage(realResponse);

  // On efface le champ de saisie seulement si l'utilisateur a tape lui-meme
  // (pas en cas de dictee vocale passee via customText)
  if (customText === null) {
    input.value = "";
  }
}


// ============================================================
// RECONNAISSANCE VOCALE
// ============================================================

// Lance la reconnaissance vocale du navigateur (micro).
// L'utilisateur parle en francais ; le texte reconnu est envoye
// au chatbot comme si l'utilisateur l'avait tape.
// Fonctionne sur Chrome et Edge, mais pas sur tous les navigateurs.
function startVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("La reconnaissance vocale n'est pas supportee sur ce navigateur. Utilisez Chrome ou Edge.");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "fr-FR";           // on ecoute en francais
  recognition.interimResults = false;   // on veut le resultat final seulement
  recognition.maxAlternatives = 1;      // on garde uniquement la meilleure interpretation

  // On desactive le bouton micro pendant l'ecoute pour eviter les doubles clics
  const voiceButton = document.getElementById("bot-voice");
  if (voiceButton) {
    voiceButton.disabled = true;
    voiceButton.innerText = "🎤 Ecoute...";
  }

  // Quand la reconnaissance reussit, on recupere le texte reconnu
  // et on l'envoie directement au chatbot
  recognition.onresult = function (event) {
    const transcript = event.results[0][0].transcript;
    const input = document.getElementById("bot-input");
    if (input) input.value = transcript; // on affiche aussi le texte dans le champ
    sendMessage(transcript);
  };

  recognition.onerror = function (event) {
    console.error("Erreur reconnaissance vocale :", event.error);
    alert("Erreur micro / reconnaissance vocale : " + event.error);
  };

  // Quand l'ecoute se termine (avec ou sans resultat), on remet le bouton normal
  recognition.onend = function () {
    if (voiceButton) {
      voiceButton.disabled = false;
      voiceButton.innerText = "🎤 Parler";
    }
  };

  recognition.start();
}


// ============================================================
// SYNTHESE VOCALE
// ============================================================

// Lit a voix haute la derniere reponse du bot en utilisant
// la synthese vocale du navigateur (Web Speech API).
// Cherche une voix en francais si le systeme en propose une.
function speakLastBotMessage() {
  if (!lastBotResponse) {
    alert("Aucune reponse a lire.");
    return;
  }

  if (!("speechSynthesis" in window)) {
    alert("La synthese vocale n'est pas supportee sur ce navigateur.");
    return;
  }

  // On arrete toute lecture vocale en cours avant d'en lancer une nouvelle
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(lastBotResponse);
  utterance.lang = "fr-FR";
  utterance.rate = 1;   // vitesse de lecture normale
  utterance.pitch = 1;  // tonalite normale
  utterance.volume = 1; // volume maximum

  // On cherche une voix en francais parmi celles disponibles sur le systeme.
  // S'il n'y en a pas, le navigateur utilisera sa voix par defaut.
  const voices = window.speechSynthesis.getVoices();
  const frenchVoice = voices.find(v => v.lang && v.lang.toLowerCase().startsWith("fr"));
  if (frenchVoice) {
    utterance.voice = frenchVoice;
  }

  window.speechSynthesis.speak(utterance);
}

// Pre-charge la liste des voix disponibles au demarrage.
// Sur Chrome, cette liste se charge de maniere asynchrone.
// On l'appelle en avance pour qu'elle soit prete quand l'utilisateur
// clique sur "Lire la reponse".
if ("speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}


// ============================================================
// TOUCHE ENTREE DANS LE CHAMP DE SAISIE
// ============================================================

// Une fois la page entierement chargee, on ajoute un ecouteur
// sur le champ texte pour permettre d'envoyer un message
// en appuyant sur Entree (en plus du bouton "Envoyer").
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
