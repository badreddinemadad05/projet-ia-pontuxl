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
         X, Y    : coordonnées entières dans [1..6]
         Origine : coin inférieur gauche = (1,1)
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

   ---------------------------------------------------------------------
   EXEMPLE D'ÉTAT COMPLET (début de partie, phase placement)
   ---------------------------------------------------------------------

   etat(
     vert,                          % c'est au vert de jouer
     [ lutin(vert,1,1),             % un seul lutin vert placé
       lutin(bleu,6,6) ],           % un seul lutin bleu placé
     [                              % tous les ponts existent encore
       pont(1,1,1,2), pont(1,1,2,1),
       pont(1,2,1,3), pont(1,2,2,2),
       % ... (60 ponts au total)
     ],
     [],                            % personne n'est éliminé
     placement                      % on est encore en phase placement
   )

   ===================================================================== */


:- use_module(library(lists)).

/* Prédicats utilitaires compatibles tau-Prolog */

% somme_liste(+Liste, -Somme)
somme_liste([], 0).
somme_liste([H|T], S) :-
    somme_liste(T, S1),
    S is S1 + H.

% minimum_liste(+Liste, -Min)
minimum_liste([X], X).
minimum_liste([H|T], Min) :-
    minimum_liste(T, MinT),
    (H < MinT -> Min = H ; Min = MinT).

% retirer_element(+Elem, +ListeIn, -ListeOut)
retirer_element(_, [], []).
retirer_element(E, [E|T], Out) :- !, retirer_element(E, T, Out).
retirer_element(E, [H|T], [H|Out]) :- retirer_element(E, T, Out).



/* =====================================================================
   UTILITAIRES DE BASE
   ===================================================================== */


/* ---------------------------------------------------------------------
   partie_finie(+Etat)
   Vrai si la partie est terminée, c'est-à-dire s'il reste au plus
   un joueur non éliminé (il est le gagnant).
   --------------------------------------------------------------------- */

partie_finie(etat(_,_,_,Elimines,_)) :-
    tous_les_joueurs(Tous),
    include(non_elimine(Elimines), Tous, Restants),
    length(Restants, N),
    N =< 1.

non_elimine(Elimines, J) :- \+ member(J, Elimines).

tous_les_joueurs([vert, bleu, jaune, rouge]).


/* ---------------------------------------------------------------------
   joueur_suivant(+JoueurCourant, +Elimines, -Suivant)
   Donne le prochain joueur actif (non éliminé) dans l'ordre
   vert -> bleu -> jaune -> rouge -> vert -> ...
   --------------------------------------------------------------------- */

joueur_suivant(Courant, Elimines, Suivant) :-
    tous_les_joueurs(Ordre),
    next_in_cycle(Courant, Ordre, Candidat),
    (   member(Candidat, Elimines)
    ->  joueur_suivant(Candidat, Elimines, Suivant)
    ;   Suivant = Candidat
    ).

next_in_cycle(X, [X, Y | _], Y) :- !.
next_in_cycle(X, [_ | Rest], Y) :- next_in_cycle(X, Rest, Y).
next_in_cycle(_, [Y], Y) :- !.   % boucle : dernier -> premier
next_in_cycle(_, [First|_], First).  % fallback


/* ---------------------------------------------------------------------
   case_valide(+X, +Y)
   Vrai si (X,Y) est une case du plateau 6x6.
   --------------------------------------------------------------------- */

case_valide(X, Y) :-
    integer(X), integer(Y),
    X >= 1, X =< 6,
    Y >= 1, Y =< 6.


/* ---------------------------------------------------------------------
   case_libre(+X, +Y, +Lutins)
   Vrai si aucun lutin n'occupe la case (X,Y).
   --------------------------------------------------------------------- */

case_libre(X, Y, Lutins) :-
    \+ member(lutin(_, X, Y), Lutins).


/* ---------------------------------------------------------------------
   pont_existe(+X1, +Y1, +X2, +Y2, +Ponts)
   Vrai si le pont entre (X1,Y1) et (X2,Y2) existe dans la liste.
   Normalise automatiquement l'ordre pour respecter la convention.
   --------------------------------------------------------------------- */

pont_existe(X1, Y1, X2, Y2, Ponts) :-
    normaliser_pont(X1, Y1, X2, Y2, Xa, Ya, Xb, Yb),
    member(pont(Xa, Ya, Xb, Yb), Ponts).

/* normaliser_pont : s'assure que (X1,Y1) < (X2,Y2) lexicographiquement */
normaliser_pont(X1, Y1, X2, Y2, X1, Y1, X2, Y2) :-
    (X1 < X2 ; (X1 =:= X2, Y1 =< Y2)), !.
normaliser_pont(X1, Y1, X2, Y2, X2, Y2, X1, Y1).


/* ---------------------------------------------------------------------
   retirer_pont(+X1, +Y1, +X2, +Y2, +PontsIn, -PontsOut)
   Retire un pont de la liste (en normalisant l'ordre).
   --------------------------------------------------------------------- */

retirer_pont(X1, Y1, X2, Y2, PontsIn, PontsOut) :-
    normaliser_pont(X1, Y1, X2, Y2, Xa, Ya, Xb, Yb),
    retirer_element(pont(Xa, Ya, Xb, Yb), PontsIn, PontsOut).


/* ---------------------------------------------------------------------
   ponts_autour(+X, +Y, +Ponts, -PontsAutour)
   Donne la liste des ponts qui touchent la case (X,Y).
   Utilisé intensivement par les heuristiques.
   --------------------------------------------------------------------- */

ponts_autour(X, Y, Ponts, PontsAutour) :-
    include(pont_touche(X, Y), Ponts, PontsAutour).

pont_touche(X, Y, pont(X,  Y,  _, _)).
pont_touche(X, Y, pont(_,  _,  X, Y)).


/* ---------------------------------------------------------------------
   nb_ponts_autour(+X, +Y, +Ponts, -N)
   Compte le nombre de ponts autour de la case (X,Y).
   --------------------------------------------------------------------- */

nb_ponts_autour(X, Y, Ponts, N) :-
    ponts_autour(X, Y, Ponts, PontsAutour),
    length(PontsAutour, N).


/* ---------------------------------------------------------------------
   joueur_est_elimine(+Couleur, +Lutins, +Ponts)
   Vrai si tous les lutins du joueur Couleur sont isolés (0 pont autour).
   --------------------------------------------------------------------- */

joueur_est_elimine(Couleur, Lutins, Ponts) :-
    include(lutin_de_couleur(Couleur), Lutins, LutinsJoueur),
    LutinsJoueur \= [],                  % le joueur a bien des lutins
    maplist(lutin_isole(Ponts), LutinsJoueur).

lutin_de_couleur(C, lutin(C, _, _)).

lutin_isole(Ponts, lutin(_, X, Y)) :-
    nb_ponts_autour(X, Y, Ponts, 0).


/* ---------------------------------------------------------------------
   mettre_a_jour_elimines(+Lutins, +Ponts, +EliminiesActuels, -NouveauxElimines)
   Recalcule la liste des éliminés après un coup.
   --------------------------------------------------------------------- */

mettre_a_jour_elimines(Lutins, Ponts, EliminiesActuels, NouveauxElimines) :-
    tous_les_joueurs(Tous),
    include(joueur_actif(EliminiesActuels), Tous, Actifs),
    include(joueur_est_elimine_check(Lutins, Ponts), Actifs, NouvellesVictimes),
    append(EliminiesActuels, NouvellesVictimes, NouveauxElimines).

joueur_actif(Elimines, J) :- \+ member(J, Elimines).
joueur_est_elimine_check(Lutins, Ponts, J) :- joueur_est_elimine(J, Lutins, Ponts).


/* =====================================================================
   INITIALISATION DU PLATEAU
   ===================================================================== */

/* ---------------------------------------------------------------------
   ponts_initiaux(-Ponts)
   Génère les 60 ponts du plateau 6x6 (30 horiz. + 30 vert.).
   --------------------------------------------------------------------- */

ponts_initiaux(Ponts) :-
    findall(pont(X,Y,X2,Y), (
        between(0,5,Y), between(0,4,X), X2 is X+1
    ), PontsH),
    findall(pont(X,Y,X,Y2), (
        between(0,4,Y), between(0,5,X), Y2 is Y+1
    ), PontsV),
    append(PontsH, PontsV, Ponts).


/* ---------------------------------------------------------------------
   etat_initial(-Etat)
   Crée l'état initial du jeu : plateau vide, tous les ponts, phase placement.
   --------------------------------------------------------------------- */

etat_initial(etat(vert, [], Ponts, [], placement)) :-
    ponts_initiaux(Ponts).

/* =====================================================================
   ÉTAPE 3 — GÉNÉRATION DES COUPS POSSIBLES
   =====================================================================

   actions_possibles(+Etat, +Joueur, -Action)
   -------------------------------------------
   Correspond à la fonction Actions(s,p) du cours (chapitre 6, slide 404).
   Énumère par backtracking toutes les actions légales du joueur Joueur
   dans l'état Etat.

   Deux cas selon la phase :

   CAS 1 — placement : Action = placer(X,Y)
       Le joueur pose un lutin sur une case libre du plateau.

   CAS 2 — mouvement : Action = mouvement(X,Y,Dir,PontsTraverses)
       Le joueur fait glisser le lutin en (X,Y) dans la direction Dir.
       PontsTraverses = liste des ponts traversés pendant la glissade.
       Le lutin doit effectivement bouger (liste non vide).
   ===================================================================== */

/* --------------------------------------------------------------------- */
/* CAS 1 : phase placement                                               */
/* --------------------------------------------------------------------- */

actions_possibles(etat(_, Lutins, _, _, placement), _, placer(X, Y)) :-
    between(0, 5, X),
    between(0, 5, Y),
    case_libre(X, Y, Lutins).

/* --------------------------------------------------------------------- */
/* CAS 2 : phase mouvement                                               */
/* --------------------------------------------------------------------- */

actions_possibles(etat(_, Lutins, Ponts, _, mouvement), Joueur,
                  mouvement(X, Y, Dir, PontsTraverses)) :-
    % Choisir un lutin du joueur
    member(lutin(Joueur, X, Y), Lutins),
    % Choisir une direction
    member(Dir, [up, down, left, right]),
    % Calculer la glissade
    direction_delta(Dir, Dx, Dy),
    glisser(X, Y, Dx, Dy, Lutins, Ponts, _, _, PontsTraverses),
    % Le lutin doit avoir bougé (au moins un pont traversé)
    PontsTraverses \= [].


/* --------------------------------------------------------------------- */
/*   direction_delta(+Dir, -Dx, -Dy)                                     */
/*   Donne le vecteur unitaire correspondant à une direction.            */
/* --------------------------------------------------------------------- */

direction_delta(up,    0,  1).
direction_delta(down,  0, -1).
direction_delta(left, -1,  0).
direction_delta(right, 1,  0).


/* --------------------------------------------------------------------- */
/*   glisser(+X, +Y, +Dx, +Dy, +Lutins, +Ponts,                         */
/*           -EndX, -EndY, -PontsTraverses)                              */
/*                                                                       */
/*   Simule la glissade d'un lutin depuis (X,Y) dans la direction        */
/*   (Dx,Dy). Le lutin avance case par case tant que :                   */
/*     1. la case suivante est dans le plateau (case_valide)             */
/*     2. un pont existe entre la case courante et la suivante           */
/*     3. la case suivante est libre (pas d'autre lutin)                 */
/*   Retourne la case d'arrivée (EndX,EndY) et la liste des ponts        */
/*   traversés PontsTraverses (dans l'ordre du trajet).                 */
/* --------------------------------------------------------------------- */

% Clause récursive : on peut avancer vers (NX,NY)
glisser(X, Y, Dx, Dy, Lutins, Ponts, EndX, EndY, PontsTraverses) :-
    NX is X + Dx,
    NY is Y + Dy,
    case_valide(NX, NY),
    pont_existe(X, Y, NX, NY, Ponts),
    case_libre(NX, NY, Lutins),
    !,  % cut : si on peut avancer, on avance toujours (pas de position intermédiaire)
    normaliser_pont(X, Y, NX, NY, Xa, Ya, Xb, Yb),
    glisser(NX, NY, Dx, Dy, Lutins, Ponts, EndX, EndY, RestePonts),
    PontsTraverses = [pont(Xa, Ya, Xb, Yb) | RestePonts].

% Cas d'arrêt : on ne peut plus avancer
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

choisir_coup(_, coup(1, right, remove)).   % fallback ultime

% Trouve le premier lutin du joueur qui peut bouger dans au moins une direction
premier_coup_valide(Joueur, Lutins, coup(Index, Direction, remove)) :-
    nth1(Index, Lutins, lutin(Joueur, _, _)),
    member(Direction, [up, down, left, right]),
    !.


/* =====================================================================
   ÉTAPE 4 — FONCTION DE TRANSITION : appliquer/3
   =====================================================================

   appliquer(+Etat, +Action, -NouvelEtat)
   ---------------------------------------
   Correspond à la fonction Trans(s,a) du cours (chapitre 6, slide 404).
   Prend un état et une action légale, retourne le nouvel état après
   avoir appliqué cette action.

   Deux cas selon la phase :
     - placer(X,Y)              : phase placement
     - mouvement(X,Y,Dir,Ponts) : phase mouvement
   ===================================================================== */


/* ---------------------------------------------------------------------
   CAS 1 : placement
   On ajoute le lutin à la liste, on passe au joueur suivant,
   et on vérifie si tous les lutins sont placés (24 = 4×6).
   --------------------------------------------------------------------- */

appliquer(etat(Joueur, Lutins, Ponts, Elimines, placement),
          placer(X, Y),
          etat(Suivant, NouveauxLutins, Ponts, Elimines, NouvellePhase)) :-

    % Ajouter le lutin du joueur courant
    append(Lutins, [lutin(Joueur, X, Y)], NouveauxLutins),

    % Vérifier si tous les lutins sont placés (4 joueurs × 6 lutins = 24)
    length(NouveauxLutins, NbLutins),
    (   NbLutins >= 24
    ->  NouvellePhase = mouvement
    ;   NouvellePhase = placement
    ),

    % Passer au joueur suivant
    joueur_suivant(Joueur, Elimines, Suivant).


/* ---------------------------------------------------------------------
   CAS 2 : mouvement
   On fait glisser le lutin, on met à jour sa position, on traite
   les ponts traversés (suppression), on recalcule les éliminés,
   et on passe au joueur suivant.
   --------------------------------------------------------------------- */

appliquer(etat(Joueur, Lutins, Ponts, Elimines, mouvement),
          mouvement(X, Y, Dir, _PontsTraverses),
          etat(Suivant, LutinsMaj, PontsMaj, NouveauxElimines, mouvement)) :-

    % 1. Calculer la position finale par glissade
    direction_delta(Dir, Dx, Dy),
    glisser(X, Y, Dx, Dy, Lutins, Ponts, EndX, EndY, PontsTraverses),

    % 2. Mettre à jour la position du lutin
    select(lutin(Joueur, X, Y), Lutins, LufinsSansOld),
    append(LufinsSansOld, [lutin(Joueur, EndX, EndY)], LutinsMaj),

    % 3. Supprimer tous les ponts traversés
    supprimer_ponts(PontsTraverses, Ponts, PontsMaj),

    % 4. Recalculer les éliminés
    mettre_a_jour_elimines(LutinsMaj, PontsMaj, Elimines, NouveauxElimines),

    % 5. Passer au joueur suivant
    joueur_suivant(Joueur, NouveauxElimines, Suivant).


/* ---------------------------------------------------------------------
   supprimer_ponts(+PontsASupprimer, +PontsIn, -PontsOut)
   Retire de PontsIn tous les ponts de la liste PontsASupprimer.
   --------------------------------------------------------------------- */

supprimer_ponts([], Ponts, Ponts).
supprimer_ponts([pont(X1,Y1,X2,Y2) | Reste], PontsIn, PontsOut) :-
    retirer_pont(X1, Y1, X2, Y2, PontsIn, PontsTmp),
    supprimer_ponts(Reste, PontsTmp, PontsOut).



/* =====================================================================
   ÉTAPE 5 — HEURISTIQUE 1 : mobilité totale
   =====================================================================

   Correspond à la fonction Util(s,p) du cours (chapitre 6, slide 404).
   
   Idée : plus un joueur a de ponts autour de ses lutins, plus il est
   en sécurité et a d'options. On additionne les ponts autour de chaque
   lutin du joueur pour obtenir son score.

   eval_h1(+Etat, +Joueur, -Score)
   --------------------------------
   Score = somme des ponts autour de chaque lutin du joueur.
   Ex: joueur avec 6 lutins ayant chacun 4 ponts → Score = 24.
   Un joueur éliminé a un score de 0.
   ===================================================================== */

eval_h1(etat(_, Lutins, Ponts, Elimines, _), Joueur, Score) :-
    % Si le joueur est éliminé, score = 0
    (   member(Joueur, Elimines)
    ->  Score = 0
    ;   % Récupérer les lutins du joueur
        include(lutin_de_couleur(Joueur), Lutins, LutinsJoueur),
        % Sommer les ponts autour de chaque lutin
        maplist(score_lutin(Ponts), LutinsJoueur, Scores),
        somme_liste(Scores, Score)
    ).

% score_lutin(+Ponts, +Lutin, -N)
% Compte les ponts autour d'un lutin donné
score_lutin(Ponts, lutin(_, X, Y), N) :-
    nb_ponts_autour(X, Y, Ponts, N).


/* ---------------------------------------------------------------------
   evaluer_vecteur_h1(+Etat, -Vecteur)
   Calcule le vecteur [ScoreVert, ScoreBleu, ScoreJaune, ScoreRouge].
   Nécessaire pour l'algorithme MaxN qui travaille avec 4 valeurs.
   --------------------------------------------------------------------- */

evaluer_vecteur_h1(Etat, [Sv, Sb, Sj, Sr]) :-
    eval_h1(Etat, vert,  Sv),
    eval_h1(Etat, bleu,  Sb),
    eval_h1(Etat, jaune, Sj),
    eval_h1(Etat, rouge, Sr).



/* =====================================================================
   ÉTAPE 6 — HEURISTIQUE 2 : maillon faible
   =====================================================================

   Idée : au lieu de sommer tous les ponts (H1), on prend le MINIMUM
   des ponts autour de chaque lutin. Si le minimum est élevé, même le
   lutin le plus vulnérable est bien protégé. Si le minimum est 0,
   un lutin est déjà isolé → danger immédiat.

   H1 = richesse globale en ponts
   H2 = robustesse du maillon faible  ← cette étape

   eval_h2(+Etat, +Joueur, -Score)
   ================================
   Score = minimum des ponts autour de chaque lutin du joueur.
   Un joueur éliminé a un score de 0.
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


/* ---------------------------------------------------------------------
   evaluer_vecteur_h2(+Etat, -Vecteur)
   Calcule [ScoreVert, ScoreBleu, ScoreJaune, ScoreRouge] avec H2.
   --------------------------------------------------------------------- */

evaluer_vecteur_h2(Etat, [Sv, Sb, Sj, Sr]) :-
    eval_h2(Etat, vert,  Sv),
    eval_h2(Etat, bleu,  Sb),
    eval_h2(Etat, jaune, Sj),
    eval_h2(Etat, rouge, Sr).



/* =====================================================================
   ÉTAPE 7 — ALGORITHME MAXN (Minimax généralisé à 4 joueurs)
   =====================================================================

   Référence cours : chapitre 6, slide 425 + papier Korf 1991.

   IDÉE FONDAMENTALE :
   -------------------
   Le Minimax classique fonctionne avec 2 joueurs (MAX et MIN).
   Ici on a 4 joueurs, chacun jouant pour lui-même (égoïste).
   Solution : MaxN retourne un VECTEUR de 4 valeurs [Sv,Sb,Sj,Sr],
   une par joueur. Chaque joueur choisit le coup qui maximise
   SA composante dans le vecteur, sans se soucier des autres.

   maxn(+Etat, +Profondeur, +Heuristique, -Vecteur, -MeilleureAction)
   -------------------------------------------------------------------
   Etat        : état actuel du jeu (etat/5)
   Profondeur  : nombre de coups à explorer dans le futur
   Heuristique : h1 ou h2 (choix de la fonction d'évaluation)
   Vecteur     : [ScoreVert, ScoreBleu, ScoreJaune, ScoreRouge]
   MeilleureAction : le coup à jouer

   LOGIQUE RÉCURSIVE :
   -------------------
   Cas de base 1 : profondeur = 0 → on évalue avec l'heuristique
   Cas de base 2 : partie finie  → on évalue avec l'heuristique
   Cas récursif  : on explore tous les coups possibles,
                   on garde celui qui maximise la composante
                   du joueur courant dans le vecteur
   ===================================================================== */


/* ---------------------------------------------------------------------
   Cas de base 1 : profondeur 0 → évaluer l'état actuel
   --------------------------------------------------------------------- */

maxn(Etat, 0, h1, Vecteur, aucune) :-
    !,
    evaluer_vecteur_h1(Etat, Vecteur).

maxn(Etat, 0, h2, Vecteur, aucune) :-
    !,
    evaluer_vecteur_h2(Etat, Vecteur).


/* ---------------------------------------------------------------------
   Cas de base 2 : partie terminée → évaluer l'état terminal
   --------------------------------------------------------------------- */

maxn(Etat, _, h1, Vecteur, aucune) :-
    partie_finie(Etat), !,
    evaluer_vecteur_h1(Etat, Vecteur).

maxn(Etat, _, h2, Vecteur, aucune) :-
    partie_finie(Etat), !,
    evaluer_vecteur_h2(Etat, Vecteur).


/* ---------------------------------------------------------------------
   Cas récursif : explorer tous les coups possibles
   --------------------------------------------------------------------- */

maxn(Etat, Profondeur, Heuristique, MeilleurVecteur, MeilleureAction) :-
    Profondeur > 0,
    Etat = etat(Joueur, _, _, _, _),

    % Générer tous les coups possibles (étape 3)
    findall(Action, actions_possibles(Etat, Joueur, Action), Actions),
    Actions \= [],

    % Profondeur suivante
    ProfondeurSuivante is Profondeur - 1,

    % Explorer chaque coup et trouver le meilleur
    meilleur_coup(Actions, Etat, Joueur, ProfondeurSuivante,
                  Heuristique, MeilleurVecteur, MeilleureAction).


/* ---------------------------------------------------------------------
   meilleur_coup(+Actions, +Etat, +Joueur, +Prof, +Heur, -MeilVect, -MeilAction)
   Parcourt la liste des actions et garde celle qui maximise
   la composante du joueur courant dans le vecteur.
   --------------------------------------------------------------------- */

% Un seul coup disponible → c'est forcément le meilleur
meilleur_coup([Action], Etat, Joueur, Prof, Heur, Vecteur, Action) :-
    !,
    appliquer(Etat, Action, EtatSuivant),
    maxn(EtatSuivant, Prof, Heur, Vecteur, _).

% Plusieurs coups : on compare récursivement
meilleur_coup([Action|Reste], Etat, Joueur, Prof, Heur, MeilVecteur, MeilAction) :-
    % Évaluer ce coup
    appliquer(Etat, Action, EtatSuivant),
    maxn(EtatSuivant, Prof, Heur, VecteurAction, _),

    % Évaluer le meilleur parmi le reste
    meilleur_coup(Reste, Etat, Joueur, Prof, Heur, VecteurReste, ActionReste),

    % Comparer : qui maximise la composante du joueur courant ?
    composante(Joueur, VecteurAction, ScoreAction),
    composante(Joueur, VecteurReste,  ScoreReste),

    (   ScoreAction >= ScoreReste
    ->  MeilVecteur = VecteurAction, MeilAction = Action
    ;   MeilVecteur = VecteurReste,  MeilAction = ActionReste
    ).


/* ---------------------------------------------------------------------
   composante(+Joueur, +Vecteur, -Score)
   Extrait la composante du joueur dans le vecteur [Sv,Sb,Sj,Sr].
   --------------------------------------------------------------------- */

composante(vert,  [S,_,_,_], S).
composante(bleu,  [_,S,_,_], S).
composante(jaune, [_,_,S,_], S).
composante(rouge, [_,_,_,S], S).


/* ---------------------------------------------------------------------
   choisir_coup_maxn(+Etat, +Profondeur, +Heuristique, -Action)
   Point d'entrée principal : donne le meilleur coup à jouer.
   --------------------------------------------------------------------- */

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
    % Fallback : premier coup valide si MaxN échoue
    Etat = etat(Joueur, _, _, _, _),
    actions_possibles(Etat, Joueur, Coup), !.



/* =====================================================================
   ÉTAPE 8 — SHALLOW PRUNING (Alpha-Beta pour 4 joueurs)
   =====================================================================

   Référence : Korf 1991, section 3.2, procédure "Shallow".

   POURQUOI PAS LE DEEP PRUNING ?
   --------------------------------
   Le deep pruning (Alpha-Beta classique) ne fonctionne pas pour plus
   de 2 joueurs (prouvé par Korf, section 3.4). Un nœud qu'on voudrait
   couper peut quand même influencer la valeur de la racine via d'autres
   joueurs.

   POURQUOI SHALLOW PRUNING FONCTIONNE ?
   ---------------------------------------
   Sous deux conditions (Korf, Theorem 1) :
   1. Borne inférieure >= 0 sur chaque composante (nb ponts >= 0 ✅)
   2. Borne supérieure sur la SOMME des composantes (= Sum) ✅
      Pour PontuXL : Sum = nb max de ponts autour de tous les lutins
      = 4 joueurs × 6 lutins × 4 ponts max = 96

   PSEUDOCODE KORF (section 3.2) :
   ---------------------------------
   Shallow(Node, Player, Bound)
     IF terminal → RETURN static value
     Best = Shallow(first child, next player, Sum)
     FOR each remaining child
       IF Best[Player] >= Bound → RETURN Best  (élagage !)
       Current = Shallow(child, next player, Sum - Best[Player])
       IF Current[Player] > Best[Player] → Best = Current
     RETURN Best

   shallow(+Etat, +Profondeur, +Heuristique, +Bound, -Vecteur, -Action)
   ----------------------------------------------------------------------
   Bound : borne supérieure sur la composante du joueur courant.
           Initialement = Sum (somme max de toutes les composantes).
   Sum   : borne supérieure globale sur la somme de toutes composantes.
   ===================================================================== */

% Borne supérieure globale : 4 joueurs × 6 lutins × 4 ponts = 96
sum_max(96).

% Index du joueur dans le vecteur (1-based)
joueur_index(vert,  1).
joueur_index(bleu,  2).
joueur_index(jaune, 3).
joueur_index(rouge, 4).


/* ---------------------------------------------------------------------
   Cas de base 1 : profondeur 0
   --------------------------------------------------------------------- */

shallow(Etat, 0, h1, _, Vecteur, aucune) :-
    !, evaluer_vecteur_h1(Etat, Vecteur).

shallow(Etat, 0, h2, _, Vecteur, aucune) :-
    !, evaluer_vecteur_h2(Etat, Vecteur).


/* ---------------------------------------------------------------------
   Cas de base 2 : partie terminée
   --------------------------------------------------------------------- */

shallow(Etat, _, h1, _, Vecteur, aucune) :-
    partie_finie(Etat), !,
    evaluer_vecteur_h1(Etat, Vecteur).

shallow(Etat, _, h2, _, Vecteur, aucune) :-
    partie_finie(Etat), !,
    evaluer_vecteur_h2(Etat, Vecteur).


/* ---------------------------------------------------------------------
   Cas récursif : explorer les coups avec élagage shallow
   Implémentation directe du pseudocode Korf section 3.2
   --------------------------------------------------------------------- */

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


/* ---------------------------------------------------------------------
   shallow_loop : parcourt les actions restantes avec élagage
   --------------------------------------------------------------------- */

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


/* ---------------------------------------------------------------------
   choisir_coup_shallow(+Etat, +Profondeur, +Heuristique, -Action)
   Point d'entrée : utilise shallow pruning pour choisir le meilleur coup.
   --------------------------------------------------------------------- */

choisir_coup_shallow(Etat, Prof, Heur, Action) :-
    sum_max(Sum),
    shallow(Etat, Prof, Heur, Sum, _, Action),
    Action \= aucune.`