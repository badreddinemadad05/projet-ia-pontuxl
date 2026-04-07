/* From https://www.youtube.com/watch?v=-k-PgvbktX4
   and https://codepen.io/Web_Cifar/pen/jOqBEjE
*/


function annonceOut() {

    document.getElementById("annonce").style.display = "none";

    const mess_annonce = "Bienvenue ! Je suis le bot de PontuXL. Puis-je vous aider ?";
    p = document.createElement("p");
    p.classList.add("replay");
    p.innerText = mess_annonce;
    texts.appendChild(p);
    p = document.createElement("p");
    speech.text = mess_annonce;
    window.speechSynthesis.speak(speech);
    
} 



function toArray (str) {
  const array = []
  for (let i = 0; i < str.length; ++i) {
    array.push(str.charCodeAt(i))
  }

  array.push(10) // newline character
  return array
}

function fromArrayCodeToString (arr) {
  var res = [];
  for (var i = 0; i < arr.length; i++) {
    res.push(String.fromCharCode(arr[i]));
  }
  return res.join("");
}

function jmjCodeToString (parr) {
   if (parr.args.length == 0) { return [] }
   else { 
     const arr = jmjCodeToString(parr.args[1])
     arr.unshift(parr.args[0].value)
     return arr
   }
}

const texts = document.querySelector(".texts");

window.SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

const recognition = new SpeechRecognition();
recognition.interimResults = true;
recognition.lang = 'fr-FR';

const speech = new SpeechSynthesisUtterance();
speech.lang = "fr-FR";
speech.volume = 1;
speech.rate = 1;
speech.pitch = 1;

const plSession = new PrologSession();
var question = '';
var response = '';
var realresponse = '';

var msg;

let p = document.createElement("p");

recognition.addEventListener("result", (e) => {

  texts.appendChild(p);
  const text = Array.from(e.results)
    .map((result) => result[0])
    .map((result) => result.transcript)
    .join("");

  p.innerText = text;
  console.log(text)
    if (e.results[0].isFinal) {
      console.log("text prefix")
      console.log(text.slice(0,20))
	if (text.slice(0,15).includes("bot") || text.slice(0,20).includes("pontu")) {
      question = toArray(text.toLowerCase());
      plSession.query(`
                    lire_question([${question}], L_Mots), 
                    produire_reponse(L_Mots,L_reponse),
                    transformer_reponse_en_string(L_reponse,Message).
		 `);
      response = plSession.get_response();
      console.log("final response")
      real_response = fromArrayCodeToString(jmjCodeToString(response))
      console.log(real_response)
      p = document.createElement("p");
      p.classList.add("replay");
      p.innerText = real_response;
      texts.appendChild(p);
      p = document.createElement("p");
      speech.text = real_response;
      window.speechSynthesis.speak(speech);
    }}

});

recognition.addEventListener("end", () => {
  recognition.start();
});

recognition.start();
