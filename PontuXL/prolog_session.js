class PrologSession {

  session = pl.create(100000);

  constructor () {
    this.response = '';
    const resultParsing = this.session.consult(CHATBOT);
    if (resultParsing !== true) {
      console.error(pl.format_answer(resultParsing));
    }
    this.session.set_current_output(new pl.type.Stream(
      {
        put (text, _) { this.response += text; return true; },
        flush: () => true
      },
      'write', 'html_output', 'text', false, 'eof_code'
    ));
  }

  query (code) {
    console.log(`?- ${code}`);
    this.session.query(code);
    this.session.answer(rep => {
      console.log(pl.format_answer(rep));
      if (rep && rep !== false && typeof rep.lookup === "function") {
        this.response = rep.lookup("Message");
      } else {
        this.response = null;
      }
    });
  }

  reset_response() { this.response = ''; }
  get_response() { return this.response; }
}

// initAISession est appelée dans board.js au lancement