const CHATBOT = String.raw`
:- use_module(library(lists)).

/* --------------------------------------------------------------------- */
/*                                                                       */
/*        PRODUIRE_REPONSE(L_Mots,L_strings) :                           */
/*                                                                       */
/*        Input : une liste de mots L_Mots representant la question      */
/*                de l'utilisateur                                       */
/*        Output : une liste de strings donnant la                       */
/*                 reponse fournie par le bot                            */
/*                                                                       */
/* --------------------------------------------------------------------- */

produire_reponse([fin], ["Merci de m'avoir consulte."]) :- !.

produire_reponse(L,Rep) :-
    mclef(M,_),
    member(M,L),
    clause(regle_rep(M,_,Pattern,Rep),Body),
    match_pattern(Pattern,L),
    call(Body), !.

produire_reponse(_,["Je ne sais pas."]).

match_pattern(Pattern,Lmots) :-
    sublist(Pattern,Lmots).

match_pattern(LPatterns,Lmots) :-
    match_pattern_dist([100|LPatterns],Lmots).

match_pattern_dist([],_).
match_pattern_dist([N,Pattern|Lpatterns],Lmots) :-
    within_dist(N,Pattern,Lmots,Lmots_rem),
    match_pattern_dist(Lpatterns,Lmots_rem).

within_dist(_,Pattern,Lmots,Lmots_rem) :-
    prefixrem(Pattern,Lmots,Lmots_rem).
within_dist(N,Pattern,[_|Lmots],Lmots_rem) :-
    N > 1,
    Naux is N - 1,
    within_dist(Naux,Pattern,Lmots,Lmots_rem).

sublist(SL,L) :-
    prefix(SL,L), !.
sublist(SL,[_|T]) :-
    sublist(SL,T).

sublistrem(SL,L,Lr) :-
    prefixrem(SL,L,Lr), !.
sublistrem(SL,[_|T],Lr) :-
    sublistrem(SL,T,Lr).

prefixrem([],L,L).
prefixrem([H|T],[H|L],Lr) :-
    prefixrem(T,L,Lr).


/* --------------------------------------------------------------------- */
/*                                                                       */
/*                            FAITS DE BASE                              */
/*                                                                       */
/* --------------------------------------------------------------------- */

nb_lutins(6).
nb_equipes(4).


/* --------------------------------------------------------------------- */
/*                                                                       */
/*                              MOTS-CLEFS                               */
/*                                                                       */
/* --------------------------------------------------------------------- */

mclef(commence,10).
mclef(combien,9).
mclef(lutin,9).
mclef(lutins,9).
mclef(equipe,8).
mclef(quipe,8).
mclef(deplacer,8).
mclef(case,8).
mclef(occupee,8).
mclef(pont,8).
mclef(ponts,8).
mclef(retirer,8).
mclef(tourner,8).
mclef(glisse,8).
mclef(glisser,8).
mclef(glissetil,8).
mclef(arrete,8).
mclef(sarrete,8).
mclef(direction,8).
mclef(directions,8).
mclef(aller,8).
mclef(bloque,8).
mclef(bouger,8).
mclef(elimine,8).
mclef(gagne,8).
mclef(gagner,8).
mclef(gagneton,8).
mclef(joueur,8).
mclef(joueurs,8).
mclef(jeu,8).
mclef(comment,8).
mclef(quand,8).
mclef(ou,8).
mclef(quel,8).
mclef(joue,8).
mclef(vert,8).
mclef(verts,8).
mclef(conseil,8).
mclef(conseillez,8).
mclef(coup,8).
mclef(dois,8).
mclef(faire,8).
mclef(peux,8).
mclef(puis,8).


/* --------------------------------------------------------------------- */
/*                                                                       */
/*                           REGLES DE REPONSE                           */
/*                                                                       */
/* --------------------------------------------------------------------- */

/* ---- qui commence ---- */

regle_rep(commence,1,
 [ qui, commence, le, jeu ],
 [ "Par convention, c'est au joueur en charge des lutins verts de commencer la partie." ] ).

regle_rep(commence,1,
 [ [ qui ], 3, [ commence ] ],
 [ "Par convention, c'est au joueur en charge des lutins verts de commencer la partie." ] ).


/* ---- combien de lutins ---- */

regle_rep(equipe,5,
  [ [ combien ], 3, [ lutins ], 5, [ equipe ] ],
  [ "Chaque equipe compte 6 lutins." ]) :-
       nb_lutins(6).

regle_rep(quipe,5,
  [ [ combien ], 3, [ lutin ], 5, [ quipe ] ],
  [ "Chaque equipe compte 6 lutins." ]) :-
       nb_lutins(6).

regle_rep(combien,5,
  [ [ combien ], 3, [ lutins ] ],
  [ "Chaque equipe compte 6 lutins." ]) :-
       nb_lutins(6).


/* ---- case occupee ---- */

regle_rep(case,8,
  [[ case ], 5, [ occupee ]],
  [ "Non, un lutin ne peut pas etre deplace sur une case occupee." ]).

regle_rep(case,8,
  [[ lutin ], 5, [ case ], 5, [ occupee ]],
  [ "Non, un lutin ne peut pas etre deplace sur une case occupee." ]).

regle_rep(deplacer,8,
  [[ deplacer ], 5, [ case ], 5, [ occupee ]],
  [ "Non, un lutin ne peut pas etre deplace sur une case occupee." ]).

regle_rep(aller,8,
  [[ aller ], 5, [ case ], 5, [ occupee ]],
  [ "Non, un lutin ne peut pas etre deplace sur une case occupee." ]).


/* ---- ponts ---- */

regle_rep(pont,8,
  [[ quel ], 3, [ pont ], 3, [ retirer ]],
  [ "Apres avoir deplace un lutin, chaque pont traverse doit etre soit retire, soit tourne. Aucun autre pont ne peut etre touche." ]).

regle_rep(retirer,8,
  [[ pont ], 3, [ retirer ]],
  [ "Apres avoir deplace un lutin, chaque pont traverse doit etre soit retire, soit tourne. Aucun autre pont ne peut etre touche." ]).

regle_rep(tourner,8,
  [[ pont ], 3, [ tourner ]],
  [ "Un pont traverse peut etre tourne d'un quart de tour autour d'une de ses deux extremites." ]).


/* ---- glissade ---- */

regle_rep(glisse,8,
  [[ glisse ]],
  [ "Dans cette version du projet, un lutin glisse en ligne droite jusqu'a rencontrer un bord, un trou ou un autre lutin." ]).

regle_rep(glisse,8,
  [[ lutin ], 3, [ glisse ]],
  [ "Dans cette version du projet, un lutin glisse en ligne droite jusqu'a rencontrer un bord, un trou ou un autre lutin." ]).

regle_rep(glisser,8,
  [[ comment ], 3, [ glisser ]],
  [ "Dans cette version du projet, un lutin glisse en ligne droite jusqu'a rencontrer un bord, un trou ou un autre lutin." ]).

regle_rep(glissetil,8,
  [[ comment ], 3, [ lutin ], 3, [ glissetil ]],
  [ "Dans cette version du projet, un lutin glisse en ligne droite jusqu'a rencontrer un bord, un trou ou un autre lutin." ]).

regle_rep(comment,8,
  [[ comment ], 5, [ glisse ]],
  [ "Dans cette version du projet, un lutin glisse en ligne droite jusqu'a rencontrer un bord, un trou ou un autre lutin." ]).


/* ---- arret ---- */

regle_rep(arrete,8,
  [[ arrete ]],
  [ "Le lutin s'arrete lorsqu'il rencontre un bord, un trou ou un autre lutin." ]).

regle_rep(arrete,8,
  [[ lutin ], 3, [ arrete ]],
  [ "Le lutin s'arrete lorsqu'il rencontre un bord, un trou ou un autre lutin." ]).

regle_rep(sarrete,8,
  [[ sarrete ]],
  [ "Le lutin s'arrete lorsqu'il rencontre un bord, un trou ou un autre lutin." ]).

regle_rep(sarrete,8,
  [[ quand ], 5, [ sarrete ]],
  [ "Le lutin s'arrete lorsqu'il rencontre un bord, un trou ou un autre lutin." ]).

regle_rep(sarrete,8,
  [[ ou ], 5, [ sarrete ]],
  [ "Le lutin s'arrete lorsqu'il rencontre un bord, un trou ou un autre lutin." ]).


/* ---- directions ---- */

regle_rep(direction,8,
  [[ direction ]],
  [ "Un lutin se deplace en ligne droite, vers le haut, le bas, la gauche ou la droite." ]).

regle_rep(directions,8,
  [[ directions ]],
  [ "Un lutin se deplace en ligne droite, vers le haut, le bas, la gauche ou la droite." ]).

regle_rep(directions,8,
  [[ quelles ], 3, [ directions ]],
  [ "Un lutin se deplace en ligne droite, vers le haut, le bas, la gauche ou la droite." ]).

regle_rep(direction,8,
  [[ lutin ], 3, [ aller ]],
  [ "Un lutin se deplace en ligne droite, vers le haut, le bas, la gauche ou la droite." ]).

regle_rep(direction,8,
  [[ directions ], 3, [ lutin ]],
  [ "Un lutin se deplace en ligne droite, vers le haut, le bas, la gauche ou la droite." ]).


/* ---- joueur bloque ---- */

regle_rep(bloque,8,
  [[ bloque ]],
  [ "Si un joueur est bloque sans etre elimine, il ne deplace aucun lutin mais peut supprimer un pont de son choix." ]).

regle_rep(bloque,8,
  [[ joueur ], 3, [ bloque ]],
  [ "Si un joueur est bloque sans etre elimine, il ne deplace aucun lutin mais peut supprimer un pont de son choix." ]).

regle_rep(bloque,8,
  [[ joueur ], 5, [ bloque ], 5, [ faire ]],
  [ "Si un joueur est bloque sans etre elimine, il ne deplace aucun lutin mais peut supprimer un pont de son choix." ]).

regle_rep(bouger,8,
  [[ joueur ], 5, [ bouger ]],
  [ "Si un joueur est bloque sans etre elimine, il ne deplace aucun lutin mais peut supprimer un pont de son choix." ]).


/* ---- elimination ---- */

regle_rep(elimine,8,
  [[ elimine ]],
  [ "Un joueur est elimine lorsque tous ses lutins se retrouvent sans pont autour d'eux." ]).

regle_rep(elimine,8,
  [[ joueur ], 3, [ elimine ]],
  [ "Un joueur est elimine lorsque tous ses lutins se retrouvent sans pont autour d'eux." ]).

regle_rep(elimine,8,
  [[ quand ], 5, [ joueur ], 5, [ elimine ]],
  [ "Un joueur est elimine lorsque tous ses lutins se retrouvent sans pont autour d'eux." ]).

regle_rep(comment,8,
  [[ comment ], 5, [ joueur ], 5, [ elimine ]],
  [ "Un joueur est elimine lorsque tous ses lutins se retrouvent sans pont autour d'eux." ]).


/* ---- victoire ---- */

regle_rep(gagne,8,
  [[ qui ], 3, [ gagne ]],
  [ "Le dernier joueur non elimine gagne la partie." ]).

regle_rep(gagner,8,
  [[ gagner ]],
  [ "Le dernier joueur non elimine gagne la partie." ]).

regle_rep(gagner,8,
  [[ quand ], 3, [ gagner ]],
  [ "Le dernier joueur non elimine gagne la partie." ]).

regle_rep(gagner,8,
  [[ comment ], 3, [ gagner ]],
  [ "Le dernier joueur non elimine gagne la partie." ]).

regle_rep(gagner,8,
  [[ gagneton ]],
  [ "Le dernier joueur non elimine gagne la partie." ]).

regle_rep(gagner,8,
  [[ quand ], 5, [ gagneton ]],
  [ "Le dernier joueur non elimine gagne la partie." ]).

regle_rep(gagner,8,
  [[ comment ], 5, [ gagneton ]],
  [ "Le dernier joueur non elimine gagne la partie." ]).


/* ---- nombre de joueurs ---- */

regle_rep(joueurs,8,
  [[ combien ], 3, [ joueurs ]],
  [ "La partie se joue a quatre joueurs : vert, bleu, jaune et rouge." ]).

regle_rep(joueur,8,
  [[ combien ], 3, [ joueur ]],
  [ "La partie se joue a quatre joueurs : vert, bleu, jaune et rouge." ]).

regle_rep(jeu,8,
  [[ jeu ], 5, [ combien ]],
  [ "La partie se joue a quatre joueurs : vert, bleu, jaune et rouge." ]).


/* ---- conseil : provisoire ---- */

regle_rep(conseillez,8,
  [[ me ], 3, [ conseillez ]],
  [ "La fonction de conseil n'est pas encore implementee." ]).

regle_rep(conseil,8,
  [[ conseil ]],
  [ "La fonction de conseil n'est pas encore implementee." ]).

regle_rep(coup,8,
  [[ quel ], 5, [ coup ]],
  [ "La fonction de conseil n'est pas encore implementee." ]).

regle_rep(quel,8,
  [[ quel ], 3, [ lutin ], 3, [ deplacer ]],
  [ "La fonction de conseil n'est pas encore implementee." ]).

regle_rep(dois,8,
  [[ dois ], 5, [ deplacer ]],
  [ "La fonction de conseil n'est pas encore implementee." ]).

regle_rep(joue,8,
  [[ joue ], 5, [ vert ]],
  [ "La fonction de conseil n'est pas encore implementee." ]).

regle_rep(faire,8,
  [[ joue ], 5, [ vert ], 5, [ faire ]],
  [ "La fonction de conseil n'est pas encore implementee." ]).

regle_rep(gagne,8,
  [[ quand ], 5, [ gagne ]],
  [ "Le dernier joueur non elimine gagne la partie." ]).

regle_rep(gagne,8,
  [[ comment ], 5, [ gagne ]],
  [ "Le dernier joueur non elimine gagne la partie." ]).

regle_rep(gagne,8,
  [[ gagne ]],
  [ "Le dernier joueur non elimine gagne la partie." ]).
/* --------------------------------------------------------------------- */
/*                                                                       */
/*          CONVERSION D'UNE QUESTION DE L'UTILISATEUR EN                */
/*                        LISTE DE MOTS                                  */
/*                                                                       */
/* --------------------------------------------------------------------- */

lire_question(Input, LMots) :-
    read_atomics(Input, LMots).

/*****************************************************************************/
/* my_char_type(+Char,?Type) */

my_char_type(46,period) :- !.
my_char_type(X,alphanumeric) :- X >= 65, X =< 90, !.
my_char_type(X,alphanumeric) :- X >= 97, X =< 123, !.
my_char_type(X,alphanumeric) :- X >= 48, X =< 57, !.
my_char_type(X,whitespace) :- X =< 32, !.
my_char_type(X,punctuation) :- X >= 33, X =< 47, !.
my_char_type(X,punctuation) :- X >= 58, X =< 64, !.
my_char_type(X,punctuation) :- X >= 91, X =< 96, !.
my_char_type(X,punctuation) :- X >= 123, X =< 126, !.
my_char_type(_,special).

/*****************************************************************************/
/* lower_case(+C,?L) */

lower_case(X,Y) :-
    X >= 65,
    X =< 90,
    Y is X + 32, !.

lower_case(X,X).

/*****************************************************************************/
/* read_lc_string(-String) */

read_lc_string(String) :-
    get0(FirstChar),
    lower_case(FirstChar,LChar),
    read_lc_string_aux(LChar,String).

read_lc_string_aux(10,[]) :- !.
read_lc_string_aux(-1,[]) :- !.
read_lc_string_aux(LChar,[LChar|Rest]) :-
    read_lc_string(Rest).

/*****************************************************************************/
/* extract_word(+String,-Rest,-Word) */

extract_word([C|Chars],Rest,[C|RestOfWord]) :-
    my_char_type(C,Type),
    extract_word_aux(Type,Chars,Rest,RestOfWord).

extract_word_aux(special,Rest,Rest,[]) :- !.
extract_word_aux(Type,[C|Chars],Rest,[C|RestOfWord]) :-
    my_char_type(C,Type), !,
    extract_word_aux(Type,Chars,Rest,RestOfWord).
extract_word_aux(_,Rest,Rest,[]).

/*****************************************************************************/
/* remove_initial_blanks(+X,?Y) */

remove_initial_blanks([C|Chars],Result) :-
    my_char_type(C,whitespace), !,
    remove_initial_blanks(Chars,Result).
remove_initial_blanks(X,X).

/*****************************************************************************/
/* digit_value(?D,?V) */

digit_value(48,0).
digit_value(49,1).
digit_value(50,2).
digit_value(51,3).
digit_value(52,4).
digit_value(53,5).
digit_value(54,6).
digit_value(55,7).
digit_value(56,8).
digit_value(57,9).

/*****************************************************************************/
/* string_to_number(+S,-N) */

string_to_number(S,N) :-
    string_to_number_aux(S,0,N).

string_to_number_aux([D|Digits],ValueSoFar,Result) :-
    digit_value(D,V),
    NewValueSoFar is 10 * ValueSoFar + V,
    string_to_number_aux(Digits,NewValueSoFar,Result).
string_to_number_aux([],Result,Result).

/*****************************************************************************/
/* string_to_atomic(+String,-Atomic) */

string_to_atomic([C|Chars],Number) :-
    string_to_number([C|Chars],Number), !.
string_to_atomic(String,Atom) :-
    atom_codes(Atom,String).

/*****************************************************************************/
/* extract_atomics(+String,-ListOfAtomics) */

extract_atomics(String,ListOfAtomics) :-
    remove_initial_blanks(String,NewString),
    extract_atomics_aux(NewString,ListOfAtomics).

extract_atomics_aux([C|Chars],[A|Atomics]) :-
    extract_word([C|Chars],Rest,Word),
    string_to_atomic(Word,A),
    extract_atomics(Rest,Atomics).
extract_atomics_aux([],[]).

/*****************************************************************************/
/* clean_string(+String,-Cleanstring) */

clean_string([C|Chars],L) :-
    my_char_type(C,punctuation),
    clean_string(Chars,L), !.
clean_string([C|Chars],[C|L]) :-
    clean_string(Chars,L), !.
clean_string([C|[]],[]) :-
    my_char_type(C,punctuation), !.
clean_string([C|[]],[C]).

/*****************************************************************************/
/* read_atomics(-ListOfAtomics) */

read_atomics(Input, ListOfAtomics) :-
    clean_string(Input,Cleanstring),
    extract_atomics(Cleanstring,ListOfAtomics).


/* --------------------------------------------------------------------- */
/*                                                                       */
/*        PRODUIRE_REPONSE : ecrit la liste de strings                   */
/*                                                                       */
/* --------------------------------------------------------------------- */

transformer_reponse_en_string(Li,Lo) :-
    flatten_strings_in_sentences(Li,Lo).

flatten_strings_in_sentences([],[]).
flatten_strings_in_sentences([W|T],S) :-
    string_as_list(W,L1),
    flatten_strings_in_sentences(T,L2),
    append(L1,L2,S).

/* Pour tau-Prolog */
string_as_list(W,W).

/* --------------------------------------------------------------------- */
/*                                                                       */
/*  La boucle console du prof est conservee en commentaire pour garder   */
/*  la structure, mais elle ne doit pas etre lancee dans la version web. */
/*                                                                       */
/* --------------------------------------------------------------------- */

/*
ecrire_reponse(L) :-
   nl, write('PBot :'),
   ecrire_ligne(L,1,1,Mf).

ecrire_ligne([],M,_,M) :-
   nl.

ecrire_ligne([M|L],Mi,Ei,Mf) :-
   ecrire_mot(M,Mi,Maux,Ei,Eaux),
   ecrire_ligne(L,Maux,Eaux,Mf).

ecrire_mot('.',_,1,_,1) :-
   write('. '), !.
ecrire_mot('\'',X,X,_,0) :-
   write('\''), !.
ecrire_mot(',',X,X,E,1) :-
   espace(E), write(','), !.
ecrire_mot(M,0,0,E,1) :-
   espace(E), write(M).
ecrire_mot(M,1,0,E,1) :-
   name(M,[C|L]),
   D is C - 32,
   name(N,[D|L]),
   espace(E), write(N).

espace(0).
espace(N) :-
   N > 0, Nn is N - 1, write(' '), espace(Nn).

fin(L) :- member(fin,L).

pontuXL :-
   nl, nl, nl,
   write('Bonjour, je suis PBot, le bot explicateur du jeu PontuXL.'), nl,
   write('En quoi puis-je vous etre utile ?'),
   nl, nl,
   repeat,
      write('Vous : '), ttyflush,
      lire_question(L_Mots),
      produire_reponse(L_Mots,L_reponse),
      ecrire_reponse(L_reponse), nl,
   fin(L_Mots), !.

:- pontuXL.
*/
`;