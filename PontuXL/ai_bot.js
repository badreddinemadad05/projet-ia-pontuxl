const AI_BOT = String.raw`
/* =====================================================================
   ai_bot.pl  —  Intelligence Artificielle pour PontuXL
   =====================================================================

   REPRÉSENTATION D'UN ÉTAT : etat/5
   ----------------------------------
   Un état du jeu est représenté par le terme :

       etat(JoueurCourant, Lutins, Ponts, Elimines, Phase)

   Détail de chaque champ :

   1. JoueurCourant : atom
         Le joueur qui doit jouer ce tour.
         Valeurs possibles : vert, bleu, jaune, rouge
         Ordre du jeu : vert -> bleu -> jaune -> rouge -> vert -> ...

   2. Lutins : liste de termes lutin(Couleur, X, Y)
         Couleur : vert, bleu, jaune, rouge
         X, Y    : coordonnées entières dans [0..5]
         Origine : coin inférieur gauche = (0,0)
         Exemple  : lutin(vert, 3, 4)  =>  lutin vert en colonne 3, ligne 4
         Chaque joueur a 6 lutins. Deux lutins ne peuvent pas partager
         une même case.

   3. Ponts : liste de termes pont(X1,Y1,X2,Y2)
         Un pont relie deux cases ADJACENTES (horizontalement ou
         verticalement). Par convention du prof, on écrit TOUJOURS
         les coordonnées les plus petites EN PREMIER selon l'ordre
         lexicographique :
           - pont horizontal : pont(X,Y, X+1,Y)  avec X < X+1
           - pont vertical   : pont(X,Y, X,Y+1)  avec Y < Y+1
         Exemples valides   : pont(2,3,2,4)  pont(3,1,4,1)
         Exemples INVALIDES : pont(2,4,2,3)  pont(4,1,3,1)
         Au départ il y a 2*(6*5) = 60 ponts (30 horiz. + 30 vert.).

   4. Elimines : liste d'atoms
         Liste des couleurs des joueurs déjà éliminés.
         Un joueur est éliminé quand TOUS ses lutins n'ont plus aucun
         pont autour d'eux.
         Exemple : [bleu, jaune]

   5. Phase : atom
         placement  => les joueurs placent encore leurs lutins
                        (chacun place 1 lutin par tour, 6 tours chacun)
         mouvement  => tous les lutins sont placés, on joue normalement

   ===================================================================== */


:- use_module(library(lists)).

/* Prédicats utilitaires */

somme_liste([], 0).
somme_liste([H|T], S) :-
    somme_liste(T, S1),
    S is S1 + H.

minimum_liste([X], X).
minimum_liste([H|T], Min) :-
    minimum_liste(T, MinT),
    (H < MinT -> Min = H ; Min = MinT).

retirer_element(_, [], []).
retirer_element(E, [E|T], Out) :- !, retirer_element(E, T, Out).
retirer_element(E, [H|T], [H|Out]) :- retirer_element(E, T, Out).


/* =====================================================================
   UTILITAIRES DE BASE
   ===================================================================== */

partie_finie(etat(_,_,_,Elimines,_)) :-
    tous_les_joueurs(Tous),
    include(non_elimine(Elimines), Tous, Restants),
    length(Restants, N),
    N =< 1.

non_elimine(Elimines, J) :- \+ member(J, Elimines).

tous_les_joueurs([vert, bleu, jaune, rouge]).

joueur_suivant(Courant, Elimines, Suivant) :-
    tous_les_joueurs(Ordre),
    next_in_cycle(Courant, Ordre, Candidat),
    (   member(Candidat, Elimines)
    ->  joueur_suivant(Candidat, Elimines, Suivant)
    ;   Suivant = Candidat
    ).


next_in_cycle(X, Liste, Y) :-
    next_in_cycle_aux(X, Liste, Liste, Y).

next_in_cycle_aux(X, [X, Y | _], _, Y) :- !.
next_in_cycle_aux(X, [X], [Y | _], Y) :- !.
next_in_cycle_aux(X, [_ | Rest], ListeComplete, Y) :-
    next_in_cycle_aux(X, Rest, ListeComplete, Y).

/* ---------------------------------------------------------------------
   case_valide(+X, +Y)
   Vrai si (X,Y) est une case du plateau 6x6.
   --------------------------------------------------------------------- */

case_valide(X, Y) :-
    integer(X), integer(Y),
    X >= 0, X =< 5,
    Y >= 0, Y =< 5.

case_libre(X, Y, Lutins) :-
    \+ member(lutin(_, X, Y), Lutins).

pont_existe(X1, Y1, X2, Y2, Ponts) :-
    normaliser_pont(X1, Y1, X2, Y2, Xa, Ya, Xb, Yb),
    member(pont(Xa, Ya, Xb, Yb), Ponts).

normaliser_pont(X1, Y1, X2, Y2, X1, Y1, X2, Y2) :-
    (X1 < X2 ; (X1 =:= X2, Y1 =< Y2)), !.
normaliser_pont(X1, Y1, X2, Y2, X2, Y2, X1, Y1).

retirer_pont(X1, Y1, X2, Y2, PontsIn, PontsOut) :-
    normaliser_pont(X1, Y1, X2, Y2, Xa, Ya, Xb, Yb),
    retirer_element(pont(Xa, Ya, Xb, Yb), PontsIn, PontsOut).

ponts_autour(X, Y, Ponts, PontsAutour) :-
    include(pont_touche(X, Y), Ponts, PontsAutour).

pont_touche(X, Y, pont(X, Y, _, _)).
pont_touche(X, Y, pont(_, _, X, Y)).

nb_ponts_autour(X, Y, Ponts, N) :-
    ponts_autour(X, Y, Ponts, PontsAutour),
    length(PontsAutour, N).

joueur_est_elimine(Couleur, Lutins, Ponts) :-
    include(lutin_de_couleur(Couleur), Lutins, LutinsJoueur),
    LutinsJoueur \= [],
    maplist(lutin_isole(Ponts), LutinsJoueur).

lutin_de_couleur(C, lutin(C, _, _)).

lutin_isole(Ponts, lutin(_, X, Y)) :-
    nb_ponts_autour(X, Y, Ponts, 0).

mettre_a_jour_elimines(Lutins, Ponts, EliminiesActuels, NouveauxElimines) :-
    tous_les_joueurs(Tous),
    include(joueur_actif(EliminiesActuels), Tous, Actifs),
    include(joueur_est_elimine_check(Lutins, Ponts), Actifs, NouvellesVictimes),
    append(EliminiesActuels, NouvellesVictimes, NouveauxElimines).

joueur_actif(Elimines, J) :- \+ member(J, Elimines).
joueur_est_elimine_check(Lutins, Ponts, J) :- joueur_est_elimine(J, Lutins, Ponts).


/* =====================================================================
   INITIALISATION
   ===================================================================== */

ponts_initiaux(Ponts) :-
    findall(pont(X,Y,X2,Y), (
        between(0,5,Y), between(0,4,X), X2 is X+1
    ), PontsH),
    findall(pont(X,Y,X,Y2), (
        between(0,4,Y), between(0,5,X), Y2 is Y+1
    ), PontsV),
    append(PontsH, PontsV, Ponts).

etat_initial(etat(vert, [], Ponts, [], placement)) :-
    ponts_initiaux(Ponts).


/* =====================================================================
   GÉNÉRATION DES COUPS POSSIBLES
   ===================================================================== */

actions_possibles(etat(_, Lutins, _, _, placement), _, placer(X, Y)) :-
    between(0, 5, X),
    between(0, 5, Y),
    case_libre(X, Y, Lutins).

actions_possibles(etat(_, Lutins, Ponts, _, mouvement), Joueur,
                  mouvement(X, Y, Dir, PontsTraverses)) :-
    member(lutin(Joueur, X, Y), Lutins),
    member(Dir, [up, down, left, right]),
    direction_delta(Dir, Dx, Dy),
    glisser(X, Y, Dx, Dy, Lutins, Ponts, _, _, PontsTraverses),
    PontsTraverses \= [].
/* ---------------------------------------------------------------------
   CAS 3 : joueur bloque mais pas elimine
   Si le joueur ne peut deplacer aucun lutin, il peut retirer un pont
   de son choix.
   --------------------------------------------------------------------- */

actions_possibles(etat(_, Lutins, Ponts, Elimines, mouvement), Joueur,
                  retirer_pont_libre(pont(X1, Y1, X2, Y2))) :-
    \+ member(Joueur, Elimines),
    \+ mouvement_possible(Joueur, Lutins, Ponts),
    member(pont(X1, Y1, X2, Y2), Ponts).
/* ---------------------------------------------------------------------
   mouvement_possible(+Joueur, +Lutins, +Ponts)
   Vrai si au moins un lutin du joueur peut glisser dans une direction.
   --------------------------------------------------------------------- */

mouvement_possible(Joueur, Lutins, Ponts) :-
    member(lutin(Joueur, X, Y), Lutins),
    member(Dir, [up, down, left, right]),
    direction_delta(Dir, Dx, Dy),
    glisser(X, Y, Dx, Dy, Lutins, Ponts, _, _, PontsTraverses),
    PontsTraverses \= [],
    !.
direction_delta(up,    0,  1).
direction_delta(down,  0, -1).
direction_delta(left, -1,  0).
direction_delta(right, 1,  0).

glisser(X, Y, Dx, Dy, Lutins, Ponts, EndX, EndY, PontsTraverses) :-
    NX is X + Dx,
    NY is Y + Dy,
    case_valide(NX, NY),
    pont_existe(X, Y, NX, NY, Ponts),
    case_libre(NX, NY, Lutins),
    !,
    normaliser_pont(X, Y, NX, NY, Xa, Ya, Xb, Yb),
    glisser(NX, NY, Dx, Dy, Lutins, Ponts, EndX, EndY, RestePonts),
    PontsTraverses = [pont(Xa, Ya, Xb, Yb) | RestePonts].

glisser(X, Y, _, _, _, _, X, Y, []).

/* =====================================================================
   POINT D'ENTRÉE SIMPLE / SECOURS POUR JAVASCRIPT
   =====================================================================

   choisir_coup(+Etat, -Coup)
   --------------------------
   Cette version simple retourne un premier coup possible.
   Elle est conservée comme solution de secours et pour compatibilité
   avec les anciennes versions du projet.

   La version principale de l'IA utilisée par le serveur Prolog est :
       choisir_coup_shallow(+Etat, +Profondeur, +Heuristique, -Action)

   Cette version principale utilise MaxN et un élagage shallow adapté
   au cas multi-joueurs.
   ===================================================================== */

choisir_coup(Etat, Coup) :-
    Etat = etat(Joueur, Lutins, _Ponts, _Elimines, mouvement),
    premier_coup_valide(Joueur, Lutins, Coup), !.

choisir_coup(_, coup(1, right, remove)).

premier_coup_valide(Joueur, Lutins, coup(Index, Direction, remove)) :-
    nth1(Index, Lutins, lutin(Joueur, _, _)),
    member(Direction, [up, down, left, right]),
    !.


/* =====================================================================
   FONCTION DE TRANSITION
   ===================================================================== */

appliquer(etat(Joueur, Lutins, Ponts, Elimines, placement),
          placer(X, Y),
          etat(Suivant, NouveauxLutins, Ponts, Elimines, NouvellePhase)) :-
    append(Lutins, [lutin(Joueur, X, Y)], NouveauxLutins),
    length(NouveauxLutins, NbLutins),
    (   NbLutins >= 24
    ->  NouvellePhase = mouvement
    ;   NouvellePhase = placement
    ),
    joueur_suivant(Joueur, Elimines, Suivant).

appliquer(etat(Joueur, Lutins, Ponts, Elimines, mouvement),
          mouvement(X, Y, Dir, _PontsTraverses),
          etat(Suivant, LutinsMaj, PontsMaj, NouveauxElimines, mouvement)) :-
    direction_delta(Dir, Dx, Dy),
    glisser(X, Y, Dx, Dy, Lutins, Ponts, EndX, EndY, PontsTraverses),
    select(lutin(Joueur, X, Y), Lutins, LutinsSansOld),
    append(LutinsSansOld, [lutin(Joueur, EndX, EndY)], LutinsMaj),
    supprimer_ponts(PontsTraverses, Ponts, PontsMaj),
    mettre_a_jour_elimines(LutinsMaj, PontsMaj, Elimines, NouveauxElimines),
    joueur_suivant(Joueur, NouveauxElimines, Suivant).

appliquer(etat(Joueur, Lutins, Ponts, Elimines, mouvement),
          retirer_pont_libre(pont(X1, Y1, X2, Y2)),
          etat(Suivant, Lutins, PontsMaj, NouveauxElimines, mouvement)) :-
    retirer_pont(X1, Y1, X2, Y2, Ponts, PontsMaj),
    mettre_a_jour_elimines(Lutins, PontsMaj, Elimines, NouveauxElimines),
    joueur_suivant(Joueur, NouveauxElimines, Suivant).

supprimer_ponts([], Ponts, Ponts).
supprimer_ponts([pont(X1,Y1,X2,Y2) | Reste], PontsIn, PontsOut) :-
    retirer_pont(X1, Y1, X2, Y2, PontsIn, PontsTmp),
    supprimer_ponts(Reste, PontsTmp, PontsOut).

/* =====================================================================
   HEURISTIQUE 1 : mobilité totale
   Score = somme des ponts autour de chaque lutin du joueur.
   ===================================================================== */

eval_h1(etat(_, Lutins, Ponts, Elimines, _), Joueur, Score) :-
    (   member(Joueur, Elimines)
    ->  Score = 0
    ;   include(lutin_de_couleur(Joueur), Lutins, LutinsJoueur),
        maplist(score_lutin(Ponts), LutinsJoueur, Scores),
        somme_liste(Scores, Score)
    ).

score_lutin(Ponts, lutin(_, X, Y), N) :-
    nb_ponts_autour(X, Y, Ponts, N).

evaluer_vecteur_h1(Etat, [Sv, Sb, Sj, Sr]) :-
    eval_h1(Etat, vert,  Sv),
    eval_h1(Etat, bleu,  Sb),
    eval_h1(Etat, jaune, Sj),
    eval_h1(Etat, rouge, Sr).


/* =====================================================================
   HEURISTIQUE 2 : maillon faible
   Score = minimum des ponts autour de chaque lutin du joueur.
   H1 = richesse globale, H2 = robustesse du lutin le plus vulnérable.
   ===================================================================== */

eval_h2(etat(_, Lutins, Ponts, Elimines, _), Joueur, Score) :-
    (   member(Joueur, Elimines)
    ->  Score = 0
    ;   include(lutin_de_couleur(Joueur), Lutins, LutinsJoueur),
        (   LutinsJoueur = []
        ->  Score = 0
        ;   maplist(score_lutin(Ponts), LutinsJoueur, Scores),
            minimum_liste(Scores, Score)
        )
    ).

evaluer_vecteur_h2(Etat, [Sv, Sb, Sj, Sr]) :-
    eval_h2(Etat, vert,  Sv),
    eval_h2(Etat, bleu,  Sb),
    eval_h2(Etat, jaune, Sj),
    eval_h2(Etat, rouge, Sr).


/* =====================================================================
   ALGORITHME MAXN (Minimax généralisé à 4 joueurs)
   Chaque joueur maximise SA composante dans le vecteur [Sv,Sb,Sj,Sr].
   ===================================================================== */

maxn(Etat, 0, h1, Vecteur, aucune) :- !, evaluer_vecteur_h1(Etat, Vecteur).
maxn(Etat, 0, h2, Vecteur, aucune) :- !, evaluer_vecteur_h2(Etat, Vecteur).

maxn(Etat, _, h1, Vecteur, aucune) :-
    partie_finie(Etat), !, evaluer_vecteur_h1(Etat, Vecteur).
maxn(Etat, _, h2, Vecteur, aucune) :-
    partie_finie(Etat), !, evaluer_vecteur_h2(Etat, Vecteur).

maxn(Etat, Profondeur, Heuristique, MeilleurVecteur, MeilleureAction) :-
    Profondeur > 0,
    Etat = etat(Joueur, _, _, _, _),
    findall(Action, actions_possibles(Etat, Joueur, Action), Actions),
    Actions \= [],
    ProfondeurSuivante is Profondeur - 1,
    meilleur_coup(Actions, Etat, Joueur, ProfondeurSuivante,
                  Heuristique, MeilleurVecteur, MeilleureAction).

meilleur_coup([Action], Etat, _Joueur, Prof, Heur, Vecteur, Action) :-
    !,
    appliquer(Etat, Action, EtatSuivant),
    maxn(EtatSuivant, Prof, Heur, Vecteur, _).

meilleur_coup([Action|Reste], Etat, Joueur, Prof, Heur, MeilVecteur, MeilAction) :-
    appliquer(Etat, Action, EtatSuivant),
    maxn(EtatSuivant, Prof, Heur, VecteurAction, _),
    meilleur_coup(Reste, Etat, Joueur, Prof, Heur, VecteurReste, ActionReste),
    composante(Joueur, VecteurAction, ScoreAction),
    composante(Joueur, VecteurReste,  ScoreReste),
    (   ScoreAction >= ScoreReste
    ->  MeilVecteur = VecteurAction, MeilAction = Action
    ;   MeilVecteur = VecteurReste,  MeilAction = ActionReste
    ).

composante(vert,  [S,_,_,_], S).
composante(bleu,  [_,S,_,_], S).
composante(jaune, [_,_,S,_], S).
composante(rouge, [_,_,_,S], S).

choisir_coup_maxn(Etat, Profondeur, Heuristique, Action) :-
    maxn(Etat, Profondeur, Heuristique, _, Action),
    Action \= aucune.


/* ---------------------------------------------------------------------
   Point d'entrée MaxN
   -------------------
   Cette partie calcule un coup avec MaxN.
   Elle est utilisée comme base de l'IA multi-joueurs avant l'ajout
   de l'élagage shallow.
   --------------------------------------------------------------------- */

choisir_coup_intelligent(Etat, Coup) :-
    choisir_coup_maxn(Etat, 2, h1, Coup), !.

choisir_coup_intelligent(Etat, Coup) :-
    Etat = etat(Joueur, _, _, _, _),
    actions_possibles(Etat, Joueur, Coup), !.


/* =====================================================================
   SHALLOW PRUNING (Korf 1991, section 3.2)
   
   Pourquoi pas deep pruning : impossible à 4 joueurs (Korf, section 3.4).
   Un nœud pruné peut quand même influencer la racine via d'autres joueurs.
   
   Shallow pruning valide sous deux conditions (Theorem 1) :
   1. Borne inférieure >= 0 sur chaque composante (nb ponts >= 0) ✅
   2. Borne supérieure sur la SOMME : 4 × 6 × 4 = 96 ✅
   ===================================================================== */

sum_max(96).

joueur_index(vert,  1).
joueur_index(bleu,  2).
joueur_index(jaune, 3).
joueur_index(rouge, 4).

shallow(Etat, 0, h1, _, Vecteur, aucune) :- !, evaluer_vecteur_h1(Etat, Vecteur).
shallow(Etat, 0, h2, _, Vecteur, aucune) :- !, evaluer_vecteur_h2(Etat, Vecteur).

shallow(Etat, _, h1, _, Vecteur, aucune) :-
    partie_finie(Etat), !, evaluer_vecteur_h1(Etat, Vecteur).
shallow(Etat, _, h2, _, Vecteur, aucune) :-
    partie_finie(Etat), !, evaluer_vecteur_h2(Etat, Vecteur).

shallow(Etat, Prof, Heur, Bound, MeilVecteur, MeilAction) :-
    Prof > 0,
    Etat = etat(Joueur, _, _, _, _),
    findall(A, actions_possibles(Etat, Joueur, A), Actions),
    Actions \= [], !,
    ProfSuiv is Prof - 1,
    sum_max(Sum),
    Actions = [PremAction | Reste],
    appliquer(Etat, PremAction, EtatSuiv1),
    shallow(EtatSuiv1, ProfSuiv, Heur, Sum, VectPrem, _),
    shallow_loop(Reste, Etat, Joueur, ProfSuiv, Heur, Bound, Sum,
                 VectPrem, PremAction, MeilVecteur, MeilAction).

shallow_loop([], _, _, _, _, _, _, BestV, BestA, BestV, BestA) :- !.

shallow_loop(_, _, Joueur, _, _, Bound, _, BestV, BestA, BestV, BestA) :-
    composante(Joueur, BestV, Score),
    Score >= Bound, !.

shallow_loop([Action|Reste], Etat, Joueur, Prof, Heur, Bound, Sum,
             BestV, BestA, MeilV, MeilA) :-
    composante(Joueur, BestV, BestScore),
    NewBound is Sum - BestScore,
    appliquer(Etat, Action, EtatSuiv),
    shallow(EtatSuiv, Prof, Heur, NewBound, CurrV, _),
    composante(Joueur, CurrV, CurrScore),
    (   CurrScore > BestScore
    ->  NouveauBestV = CurrV, NouveauBestA = Action
    ;   NouveauBestV = BestV, NouveauBestA = BestA
    ), !,
    shallow_loop(Reste, Etat, Joueur, Prof, Heur, Bound, Sum,
                 NouveauBestV, NouveauBestA, MeilV, MeilA).

choisir_coup_shallow(Etat, Prof, Heur, Action) :-
    sum_max(Sum),
    shallow(Etat, Prof, Heur, Sum, _, Action),
    Action \= aucune.
    `;