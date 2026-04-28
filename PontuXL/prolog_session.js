// ============================================================
// SESSION PROLOG (prolog_session.js)
//
// Ce fichier gere la communication avec Tau-Prolog, le moteur
// Prolog qui tourne directement dans le navigateur.
//
// Il definit une classe PrologSession qui :
//   1. Cree une session Tau-Prolog et charge les regles du chatbot
//   2. Expose une methode query() pour poser des questions a Prolog
//
// Pourquoi une Promise dans query() ?
//   Tau-Prolog repond de maniere asynchrone : il ne donne pas la
//   reponse immediatement mais rappelle notre code quand il a fini.
//   Une Promise permet d'attendre ce rappel avec "await" sans
//   bloquer la page ni utiliser un delai arbitraire (setTimeout).
// ============================================================

class PrologSession {

  // On cree une session Tau-Prolog avec une limite de 100 000 cellules memoire.
  // Cette limite empeche Prolog de consommer trop de ressources
  // si une requete devient trop complexe.
  session = pl.create(100000);

  // Constructeur : prepare la session au moment ou on cree l'objet.
  constructor() {

    // On stocke ici la derniere reponse Prolog recue.
    // Sert de sauvegarde ; dans la pratique on utilise plutot
    // le resultat retourne directement par query().
    this.response = '';

    // On charge les regles du chatbot ecrites en Prolog.
    // La constante CHATBOT est definie dans chat_bot.js (charge avant ce fichier).
    // consult() lit et compile le code Prolog. Si ca echoue, on affiche l'erreur.
    const resultParsing = this.session.consult(CHATBOT);
    if (resultParsing !== true) {
      console.error("Erreur au chargement des regles Prolog :", pl.format_answer(resultParsing));
    }

    // On configure la sortie standard de Prolog (l'equivalent de print() en Prolog).
    // Dans un navigateur il n'y a pas de terminal, donc on redirige
    // ce flux vers une variable interne plutot que de planter.
    // Note : dans ce projet, la reponse du bot passe par la variable
    // "Message" et non par write(), donc ce flux n'est pas utilise activement.
    this.session.set_current_output(new pl.type.Stream(
      {
        put(text, _) {
          this.response += text;
          return true;
        },
        flush: () => true
      },
      'write', 'html_output', 'text', false, 'eof_code'
    ));
  }

  // Envoie une requete Prolog et attend la reponse.
  //
  // Le mot-cle "await" dans le code appelant permet d'attendre
  // que cette Promise se resolve avant de continuer :
  //   const reponse = await plSession.query("...");
  //
  // code : une chaine contenant la requete Prolog a executer.
  //        Exemple : "produire_reponse([bonjour], Message)."
  //
  // Retourne : une Promise qui se resout avec la valeur liee
  //            a la variable "Message" dans la requete Prolog,
  //            ou null si Prolog n'a trouve aucune solution.
  query(code) {
    console.log("Requete Prolog envoyee : " + code);
    this.session.query(code);
    return new Promise((resolve) => {
      this.session.answer(rep => {
        // rep === false ou null = Prolog n'a pas trouve de solution
        if (rep === false || rep === null) {
          resolve(null);
        } else {
          // On recupere la valeur liee a "Message" dans la reponse Prolog
          const message = rep.lookup ? rep.lookup("Message") : null;
          this.response = message;
          resolve(message);
        }
      });
    });
  }

  // Remet la reponse sauvegardee a vide.
  // Peut etre appele avant une nouvelle requete pour eviter
  // de lire par erreur le resultat d'une requete precedente.
  reset_response() {
    this.response = '';
  }

  // Retourne la derniere reponse Prolog sauvegardee.
  // Preferer l'utilisation de query() avec await, qui est plus sure
  // car elle attend vraiment la fin du calcul Prolog.
  get_response() {
    console.log("Lecture de la reponse Prolog sauvegardee :");
    console.log(this.response);
    return this.response;
  }
}
