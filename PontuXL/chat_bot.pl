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
/*        NB Par défaut le predicat retourne dans tous les cas           */
/*            [  "Je ne sais pas.", "Les étudiants",                     */
/*               "vont m'aider, vous le verrez !" ]                      */
/*                                                                       */
/*        Je ne doute pas que ce sera le cas ! Et vous souhaite autant   */
/*        d'amusement a coder le predicat que j'ai eu a ecrire           */
/*        cet enonce et ce squelette de solution !                       */
/*                                                                       */
/* --------------------------------------------------------------------- */


produire_reponse([fin],L1) :-
    L1 = [merci, de, m, '\'', avoir, consulte], !.

produire_reponse(L,Rep) :-
    mclef(M,_), member(M,L),
    clause(regle_rep(M,_,Pattern,Rep),Body),
    match_pattern(Pattern,L), 
    call(Body), !.

produire_reponse(_,[S1,S2]) :-
    S1 = "Je ne sais pas. ",
    S2 = "Les étudiants vont m'aider, vous le verrez".

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
    N > 1, Naux is N-1,
    within_dist(Naux,Pattern,Lmots,Lmots_rem).

sublist(SL,L) :-
    prefix(SL,L), !.
sublist(SL,[_|T]) :- sublist(SL,T).

sublistrem(SL,L,Lr) :-
    prefixrem(SL,L,Lr), !.
sublistrem(SL,[_|T],Lr) :- sublistrem(SL,T,Lr).

prefixrem([],L,L).
prefixrem([H|T],[H|L],Lr) :- prefixrem(T,L,Lr).


% Donnees generales du jeu

nb_lutins(6).
nb_equipes(4).


% Mots-cles principaux

mclef(conseil,20).
mclef(conseillez,20).
mclef(conseillezvous,20).

mclef(commence,10).
mclef(combien,5).
mclef(equipe,5).
mclef(quipe,5).

mclef(occupee,5).
mclef(occupe,5).
mclef(occup,5).
mclef(deplacer,5).

mclef(pont,5).
mclef(retirer,5).
mclef(enlever,5).

% Mots-cles supplementaires

mclef(elimine,5).
mclef(gagne,5).
mclef(ordre,5).
mclef(phase,5).
mclef(glisse,5).
mclef(plateau,5).
mclef(joueur,5).
mclef(bloqu,5).


% QUESTION 1 : Qui commence le jeu ?

regle_rep(commence,10,
  [ [ qui ], 5, [ commence ], 5, [ jeu ] ],
  [ "Par convention, c'est au joueur en charge des lutins verts de commencer la partie." ] ).


% QUESTION 2 : Combien de lutins compte chaque equipe ?

regle_rep(combien,5,
  [ [ combien ], 5, [ lutins ] ],
  [ "6" ] ).

regle_rep(equipe,5,
  [ [ combien ], 5, [ lutins ], 10, [ equipe ] ],
  [ "6" ] ).

regle_rep(quipe,5,
  [ [ combien ], 5, [ lutins ], 10, [ quipe ] ],
  [ "6" ] ).

% QUESTION 3 : Puis-je deplacer un lutin sur une case occupee ?

regle_rep(deplacer,5,
  [ [ deplacer ], 10, [ case ], 10, [ occupee ] ],
  [ "Non." ] ).

regle_rep(occupee,5,
  [ [ occupee ] ],
  [ "Non." ] ).

regle_rep(occupe,5,
  [ [ occupe ] ],
  [ "Non." ] ).

regle_rep(occup,5,
  [ [ occup ] ],
  [ "Non." ] ).


% QUESTION 4 : Quel pont puis-je retirer apres avoir deplace un lutin ?

regle_rep(pont,5,
  [ [ pont ] ],
  [ "Il est permis de retirer le pont emprunte ou tout autre pont." ] ).

regle_rep(retirer,5,
  [ [ retirer ] ],
  [ "Il est permis de retirer le pont emprunte ou tout autre pont." ] ).

regle_rep(enlever,5,
  [ [ enlever ] ],
  [ "Il est permis de retirer le pont emprunte ou tout autre pont." ] ).


% QUESTION 5 : Conseil IA

regle_rep(conseil,20,
  [ [ conseil ] ],
  [ "CONSEIL_IA" ] ).

regle_rep(conseillez,20,
  [ [ conseillez ], 5, [ vous ] ],
  [ "CONSEIL_IA" ] ).

regle_rep(conseillezvous,20,
  [ [ conseillezvous ] ],
  [ "CONSEIL_IA" ] ).


% dialogue imaginé

regle_rep(elimine,5,
  [ [ elimin ] ],
  [ "Un joueur est elimine lorsque tous ses lutins n'ont plus aucun pont autour d'eux." ] ).

regle_rep(gagne,5,
  [ [ gagne ] ],
  [ "Le dernier joueur non elimine gagne la partie." ] ).

regle_rep(ordre,5,
  [ [ ordre ] ],
  [ "L'ordre de jeu est : verts, puis bleus, puis jaunes, puis rouges." ] ).

regle_rep(phase,5,
  [ [ phase ] ],
  [ "Le jeu comporte deux phases : le placement des lutins sur le plateau, puis la phase de mouvement." ] ).

regle_rep(glisse,5,
  [ [ glisse ] ],
  [ "Un lutin glisse en ligne droite jusqu'a rencontrer un bord, un trou ou un autre lutin." ] ).

regle_rep(plateau,5,
  [ [ plateau ] ],
  [ "Le plateau est de taille 6 sur 6. Le coin inferieur gauche est l'origine (0,0)." ] ).

regle_rep(joueur,5,
  [ [ joueur ] ],
  [ "Le jeu se joue a 4 joueurs : verts et jaunes sont humains, bleus et rouges sont des robots." ] ).

regle_rep(bloqu,5,
  [ [ bloqu ] ],
  [ "Si aucun de vos lutins ne peut bouger, vous devez retirer un pont de votre choix." ] ).


% lire_question(L_Mots)

% Pour tau-Prolog avec Javascript
lire_question(LMots) :- read_atomics(LMots).

% Pour bot en ligne


% my_char_type(+Char,?Type)


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


% lower_case(+C,?L)

lower_case(X,Y) :-
    X >= 65,
    X =< 90,
    Y is X + 32, !.

lower_case(X,X).


% read_lc_string(-String)


read_lc_string(String) :-
    get0(FirstChar),
    lower_case(FirstChar,LChar),
    read_lc_string_aux(LChar,String).

    read_lc_string_aux(10,[]) :- !.  % end of line

read_lc_string_aux(-1,[]) :- !.  % end of file

read_lc_string_aux(LChar,[LChar|Rest]) :- read_lc_string(Rest).


% extract_word(+String,-Rest,-Word) (final version)


extract_word([C|Chars],Rest,[C|RestOfWord]) :-
    my_char_type(C,Type),
    extract_word_aux(Type,Chars,Rest,RestOfWord).

    extract_word_aux(special,Rest,Rest,[]) :- !.


extract_word_aux(Type,[C|Chars],Rest,[C|RestOfWord]) :-
    my_char_type(C,Type), !,
extract_word_aux(Type,Chars,Rest,RestOfWord).

extract_word_aux(_,Rest,Rest,[]).   % if previous clause did not succeed.




remove_initial_blanks([C|Chars],Result) :-
    my_char_type(C,whitespace), !,
remove_initial_blanks(Chars,Result).

remove_initial_blanks(X,X).   


% digit_value(?D,?V)


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



% string_to_number(+S,-N)

string_to_number(S,N) :-
    string_to_number_aux(S,0,N).

    string_to_number_aux([D|Digits],ValueSoFar,Result) :-
    digit_value(D,V),
    NewValueSoFar is 10*ValueSoFar + V,
string_to_number_aux(Digits,NewValueSoFar,Result).

string_to_number_aux([],Result,Result).


% string_to_atomic(+String,-Atomic)


string_to_atomic([C|Chars],Number) :-
    string_to_number([C|Chars],Number), !.

string_to_atomic(String,Atom) :- atom_codes(Atom,String).




% extract_atomics(+String,-ListOfAtomics) 2nd version

extract_atomics(String,ListOfAtomics) :-
    remove_initial_blanks(String,NewString),
    extract_atomics_aux(NewString,ListOfAtomics).

    extract_atomics_aux([C|Chars],[A|Atomics]) :-
    extract_word([C|Chars],Rest,Word),
    string_to_atomic(Word,A),       % <- this is the only change
extract_atomics(Rest,Atomics).

extract_atomics_aux([],[]).



% clean_string(+String,-Cleanstring)


clean_string([C|Chars],L) :-
    my_char_type(C,punctuation),
    clean_string(Chars,L), !.
clean_string([C|Chars],[C|L]) :-
    clean_string(Chars,L), !.
clean_string([C|[]],[]) :-
    my_char_type(C,punctuation), !.
clean_string([C|[]],[C]).



% read_atomics(-ListOfAtomics)


read_atomics(ListOfAtomics) :-
    read_lc_string(String),
    clean_string(String,Cleanstring),
    extract_atomics(Cleanstring,ListOfAtomics).




transformer_reponse_en_string(Li,Lo) :- flatten_strings_in_sentences(Li,Lo).

flatten_strings_in_sentences([],[]).
flatten_strings_in_sentences([W|T],S) :-
    string_as_list(W,L1),
    flatten_strings_in_sentences(T,L2),
    append(L1,L2,S).

% Pour SWI-Prolog
string_as_list(W,L) :- string_to_list(W,L).


% Pour tau-Prolog
% string_as_list(W,W).




ecrire_reponse(L) :-
   nl, write('PBot :'),
   ecrire_ligne(L,1,1,Mf).

% ecrire_ligne(Li,Mi,Ei,Mf)
% input : Li, liste de mots a ecrire
%         Mi, indique si le premier caractere du premier mot 
%         doit etre mis en majuscule (1 si oui, 0 si non)
%         Ei, indique le nombre d'espaces avant ce premier mot 
% output : Mf, booleen tel que decrit ci-dessus a appliquer 
%          a la ligne suivante, si elle existe

ecrire_ligne([],M,_,M) :- 
   nl.

ecrire_ligne([M|L],Mi,Ei,Mf) :-
   ecrire_mot(M,Mi,Maux,Ei,Eaux),
   ecrire_ligne(L,Maux,Eaux,Mf).

% ecrire_mot(M,B1,B2,E1,E2)
% input : M, le mot a ecrire
%         B1, indique s'il faut une majuscule (1 si oui, 0 si non)
%         E1, indique s'il faut un espace avant le mot (1 si oui, 0 si non)
% output : B2, indique si le mot suivant prend une majuscule
%          E2, indique si le mot suivant doit etre precede d'un espace

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
espace(N) :- N>0, Nn is N-1, write(' '), espace(Nn).





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
   

/* --------------------------------------------------------------------- */
/*                                                                       */
/*             ACTIVATION DU PROGRAMME APRES COMPILATION                 */
/*                                                                       */
/* --------------------------------------------------------------------- */

:- pontuXL.




