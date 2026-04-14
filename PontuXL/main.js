function toArray(str) {
  const array = [];
  for (let i = 0; i < str.length; ++i) {
    array.push(str.charCodeAt(i));
  }
  array.push(10); // newline
  return array;
}

function fromArrayCodeToString(arr) {
  var res = [];
  for (var i = 0; i < arr.length; i++) {
    res.push(String.fromCharCode(arr[i]));
  }
  return res.join("");
}

function jmjCodeToString(parr) {
  if (parr.args.length == 0) { return []; }
  else {
    const arr = jmjCodeToString(parr.args[1]);
    arr.unshift(parr.args[0].value);
    return arr;
  }
}

const plSession = new PrologSession();

function sendMessage() {
  const input = document.getElementById("bot-input");
  const texts = document.getElementById("bot-texts");
  const text = input.value.trim();
  if (!text) return;

  // Afficher la question de l'utilisateur
  const pUser = document.createElement("p");
  pUser.classList.add("user-msg");
  pUser.innerText = "Vous : " + text;
  texts.appendChild(pUser);

  // Envoyer à Prolog
  const normalizedText = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // enlève les accents
    .replace(/['’\-]/g, " ");          // remplace apostrophes et tirets par des espaces

  const question = toArray(normalizedText);
  plSession.query(`
    lire_question([${question}], L_Mots),
    produire_reponse(L_Mots, L_reponse),
    transformer_reponse_en_string(L_reponse, Message).
  `);

  const response = plSession.get_response();
  const realResponse = fromArrayCodeToString(jmjCodeToString(response));

  // Afficher la réponse du bot
  const pBot = document.createElement("p");
  pBot.classList.add("bot-msg");
  pBot.innerText = "PBot : " + (realResponse || "Je ne sais pas.");
  texts.appendChild(pBot);

  // Scroll vers le bas
  texts.scrollTop = texts.scrollHeight;

  input.value = "";
}

// Envoyer avec la touche Entrée
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("bot-input");
  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendMessage();
    });
  }
});