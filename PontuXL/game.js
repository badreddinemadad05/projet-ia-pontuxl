// ============================================================
// ETAT ET LOGIQUE DU JEU (game.js)
//
// Ce fichier contient toutes les regles et donnees du jeu PontuXL :
//   - les variables qui decrivent l'etat courant (lutins, ponts, tour)
//   - le placement des lutins en debut de partie
//   - le deplacement des lutins (glissade sur le plateau)
//   - la gestion des ponts (suppression ou rotation)
//   - la detection des eliminations et de la fin de partie
//
// Ce fichier ne s'occupe PAS de l'affichage graphique :
// c'est le role de board.js, qui lit les donnees definies ici.
// ============================================================


// ============================================================
// CONSTANTES DU JEU
// (ces valeurs ne changent jamais pendant une partie)
// ============================================================

// Le plateau est une grille de 6x6 cases (colonnes et lignes de 0 a 5)
const BOARD_SIZE = 6;

// Les 4 equipes, dans l'ordre de jeu : vert commence, puis bleu, jaune, rouge
const COLORS = ["green", "blue", "yellow", "red"];

// Chaque equipe possede 6 lutins qu'elle place en debut de partie
const LUTINS_PER_PLAYER = 6;


// ============================================================
// VARIABLES D'ETAT DU JEU
// (ces variables changent a chaque tour)
// ============================================================

// Numero du joueur qui doit jouer en ce moment.
// 0 = vert, 1 = bleu, 2 = jaune, 3 = rouge.
// On utilise un index plutot que le nom directement pour pouvoir
// passer au joueur suivant avec un simple +1 modulo 4.
let currentPlayerIndex = 0;

// Phase actuelle du jeu.
// "placement" : les joueurs posent leurs lutins un par un sur le plateau.
// "movement"  : les joueurs font glisser leurs lutins et agissent sur les ponts.
let phase = "placement";

// Compte combien de lutins chaque joueur a deja places.
// Quand tous les joueurs ont atteint LUTINS_PER_PLAYER, la phase change.
let lutinsPlaced = {
    green: 0,
    blue: 0,
    yellow: 0,
    red: 0
};

// Positions de tous les lutins sur le plateau.
// Chaque entree est un tableau de paires de coordonnees [x, y].
// Exemple apres placement : lutins["green"] = [[0,0], [1,2], [3,5], ...]
let lutins = {
    green: [],
    blue: [],
    yellow: [],
    red: []
};

// Liste de tous les ponts presents sur le plateau.
// On utilise un Set (une collection sans doublons) de chaines de caracteres.
// Chaque pont est represente par une cle unique basee sur ses deux extremites :
//   Pont horizontal : "x1,y1-x2,y1"   avec x2 = x1+1 (meme ligne, case adjacente a droite)
//   Pont vertical   : "x1,y1-x1,y2"   avec y2 = y1+1 (meme colonne, case adjacente au-dessus)
// Exemple :
//   "2,3-3,3" = pont horizontal entre (2,3) et (3,3)
//   "2,3-2,4" = pont vertical   entre (2,3) et (2,4)
// Le Set permet de verifier rapidement si un pont existe (bridges.has(key))
// et de le supprimer proprement (bridges.delete(key)).
let bridges = new Set();

// Indique quels joueurs ont ete elimines.
// Un joueur est elimine quand aucun de ses lutins n'a de pont adjacent.
let eliminated = {
    green: false,
    blue: false,
    yellow: false,
    red: false
};


// ============================================================
// INITIALISATION
// ============================================================

// Cree tous les ponts de depart sur le plateau.
// Au debut de la partie, chaque paire de cases adjacentes est reliee
// par un pont (horizontal ou vertical), soit 60 ponts au total.
function initBridges() {
    bridges.clear();

    for (let x = 0; x < BOARD_SIZE; x++) {
        for (let y = 0; y < BOARD_SIZE; y++) {
            // Pont horizontal : relie (x,y) a la case a sa droite (x+1,y)
            if (x + 1 < BOARD_SIZE) {
                bridges.add(x + "," + y + "-" + (x + 1) + "," + y);
            }
            // Pont vertical : relie (x,y) a la case au-dessus (x,y+1)
            if (y + 1 < BOARD_SIZE) {
                bridges.add(x + "," + y + "-" + x + "," + (y + 1));
            }
        }
    }
}

// Remet le jeu completement a zero pour lancer ou relancer une partie.
// Reinitialise le joueur courant, la phase, les positions des lutins
// et tous les ponts du plateau.
function initGame() {
    currentPlayerIndex = 0;
    phase = "placement";
    eliminated = { green: false, blue: false, yellow: false, red: false };
    lutinsPlaced = { green: 0, blue: 0, yellow: 0, red: 0 };
    lutins = { green: [], blue: [], yellow: [], red: [] };
    initBridges();
}


// ============================================================
// FONCTIONS UTILITAIRES
// ============================================================

// Retourne la couleur (identifiant) du joueur qui doit jouer maintenant.
// Exemple de valeur retournee : "green", "blue", "yellow" ou "red".
function currentPlayer() {
    return COLORS[currentPlayerIndex];
}

// Passe au joueur suivant dans l'ordre de jeu (vert → bleu → jaune → rouge → vert...).
// Si le joueur suivant est elimine, on continue a avancer jusqu'a
// trouver un joueur encore en jeu. La limite de 4 tentatives empeche
// une boucle infinie si tous les joueurs etaient elimines en meme temps.
function nextPlayer() {
    let attempts = 0;
    do {
        currentPlayerIndex = (currentPlayerIndex + 1) % 4;
        attempts++;
    } while (eliminated[currentPlayer()] && attempts < 4);
}

// Verifie si une case (x, y) est deja occupee par un lutin (quelle que soit l'equipe).
// On parcourt les lutins de toutes les equipes et on compare leurs positions.
// Utile avant de placer ou de faire glisser un lutin : deux lutins
// ne peuvent jamais etre sur la meme case en meme temps.
//
// x, y : coordonnees de la case a tester
//
// Retourne : true si un lutin s'y trouve, false si la case est libre
function isOccupied(x, y) {
    for (let color of COLORS) {
        for (let pos of lutins[color]) {
            if (pos[0] === x && pos[1] === y) {
                return true;
            }
        }
    }
    return false;
}

// Calcule la cle unique qui identifie le pont entre deux cases adjacentes.
// On range toujours la case la plus "petite" en premier (d'abord par x,
// puis par y a egalite) pour obtenir toujours la meme cle pour le meme pont,
// peu importe l'ordre dans lequel on passe les deux cases.
// Exemple : bridgeKey(3,3, 2,3) et bridgeKey(2,3, 3,3) donnent tous
// les deux la cle "2,3-3,3".
//
// x1,y1 : coordonnees de la premiere case
// x2,y2 : coordonnees de la deuxieme case
//
// Retourne : une chaine comme "2,3-3,3"
function bridgeKey(x1, y1, x2, y2) {
    if (x1 < x2 || (x1 === x2 && y1 < y2)) {
        return x1 + "," + y1 + "-" + x2 + "," + y2;
    } else {
        return x2 + "," + y2 + "-" + x1 + "," + y1;
    }
}

// Verifie si un pont existe entre deux cases adjacentes.
//
// x1,y1 : premiere case
// x2,y2 : deuxieme case
//
// Retourne : true si le pont est present sur le plateau, false s'il a ete retire
function bridgeExists(x1, y1, x2, y2) {
    return bridges.has(bridgeKey(x1, y1, x2, y2));
}

// Supprime le pont entre deux cases adjacentes.
// Appele quand le joueur choisit de retirer un pont apres un deplacement,
// ou quand un pont disparait apres une rotation hors limites.
//
// x1,y1 : premiere case du pont
// x2,y2 : deuxieme case du pont
function removeBridge(x1, y1, x2, y2) {
    bridges.delete(bridgeKey(x1, y1, x2, y2));
}


// ============================================================
// GLISSADE DES LUTINS
// ============================================================

// Les 4 directions de deplacement possibles.
// Chaque direction est representee par son effet sur les coordonnees (dx, dy).
// Exemple : "up" = on monte, donc y augmente de 1.
const DIRECTIONS = {
    up:    [0, 1],
    down:  [0, -1],
    left:  [-1, 0],
    right: [1, 0]
};

// Fait glisser un lutin depuis (startX, startY) dans la direction donnee.
// Le lutin avance case par case tant que ces trois conditions sont reunies :
//   1. La case suivante est dans les limites du plateau
//   2. Il y a un pont entre la case actuelle et la case suivante
//   3. La case suivante est libre (pas d'autre lutin dessus)
// Des qu'une condition echoue, le lutin s'arrete sur la case actuelle.
//
// startX, startY : position de depart du lutin
// direction      : "up", "down", "left" ou "right"
//
// Retourne un objet avec :
//   endX, endY       : position finale du lutin apres la glissade
//   bridgesCrossed   : liste des ponts traverses pendant la glissade,
//                      chacun sous la forme [x1, y1, x2, y2]
function slide(startX, startY, direction) {
    let dx = DIRECTIONS[direction][0];
    let dy = DIRECTIONS[direction][1];

    let currentX = startX;
    let currentY = startY;
    let crossedBridges = [];

    while (true) {
        let nextX = currentX + dx;
        let nextY = currentY + dy;

        // Condition 1 : la case suivante ne doit pas depasser les bords du plateau
        if (nextX < 0 || nextX >= BOARD_SIZE || nextY < 0 || nextY >= BOARD_SIZE) {
            break;
        }

        // Condition 2 : il faut un pont pour passer a la case suivante
        if (!bridgeExists(currentX, currentY, nextX, nextY)) {
            break;
        }

        // Condition 3 : la case suivante ne doit pas etre deja occupee
        if (isOccupied(nextX, nextY)) {
            break;
        }

        // Toutes les conditions sont ok : le lutin avance d'une case
        crossedBridges.push([currentX, currentY, nextX, nextY]);
        currentX = nextX;
        currentY = nextY;
    }

    return {
        endX: currentX,
        endY: currentY,
        bridgesCrossed: crossedBridges
    };
}


// ============================================================
// PLACEMENT DES LUTINS (debut de partie)
// ============================================================

// Place un lutin du joueur courant sur la case (x, y).
// Les joueurs placent leurs lutins un par un, en alternance.
// Quand chaque joueur a place ses 6 lutins, la phase
// passe automatiquement de "placement" a "movement".
//
// x, y : coordonnees de la case ou poser le lutin
//
// Retourne : true si le placement est reussi,
//            false si la case est deja prise, hors phase, ou quota atteint
function placeLutin(x, y) {
    let player = currentPlayer();

    // On verifie les conditions avant de placer
    if (phase !== "placement") {
        console.log("Erreur : on n'est plus en phase de placement !");
        return false;
    }
    if (isOccupied(x, y)) {
        console.log("Erreur : la case (" + x + "," + y + ") est deja occupee !");
        return false;
    }
    if (lutinsPlaced[player] >= LUTINS_PER_PLAYER) {
        console.log("Erreur : " + player + " a deja place tous ses lutins !");
        return false;
    }

    // On ajoute le lutin a la liste des positions du joueur
    lutins[player].push([x, y]);
    lutinsPlaced[player]++;

    // On compte le total de lutins places par tous les joueurs.
    // Des que tous ont place leurs 6 lutins, la phase de mouvement commence.
    let totalPlaced = 0;
    for (let color of COLORS) {
        totalPlaced += lutinsPlaced[color];
    }
    if (totalPlaced >= COLORS.length * LUTINS_PER_PLAYER) {
        phase = "movement";
        console.log("Tous les lutins sont places ! La phase de mouvement commence.");
    }

    nextPlayer();
    return true;
}


// ============================================================
// DEPLACEMENT DES LUTINS (phase de mouvement)
// ============================================================

// Deplace un lutin du joueur courant dans une direction.
// Le lutin glisse selon les regles de la fonction slide() :
// il avance jusqu'a ce qu'il soit bloque par un bord, un trou ou un autre lutin.
// Si le lutin ne peut pas avancer d'une seule case dans cette direction,
// le deplacement est refuse (retourne null).
//
// lutinIndex : quel lutin deplacer (de 0 a 5)
// direction  : "up", "down", "left" ou "right"
//
// Retourne : la liste des ponts traverses si le deplacement est valide,
//            null si le deplacement est impossible
function moveLutin(lutinIndex, direction) {
    let player = currentPlayer();

    if (phase !== "movement") {
        console.log("Erreur : on est encore en phase de placement !");
        return null;
    }

    let pos = lutins[player][lutinIndex];
    if (!pos) {
        console.log("Erreur : le lutin numero " + lutinIndex + " n'existe pas !");
        return null;
    }

    let result = slide(pos[0], pos[1], direction);

    // Si le lutin n'a pas bouge du tout, le deplacement est invalide
    if (result.endX === pos[0] && result.endY === pos[1]) {
        console.log("Deplacement impossible : aucun pont dans la direction " + direction);
        return null;
    }

    // On met a jour la position du lutin dans le tableau
    lutins[player][lutinIndex] = [result.endX, result.endY];

    // On retourne la liste des ponts traverses : board.js demandera
    // ensuite au joueur ce qu'il veut faire de chaque pont (supprimer ou tourner).
    return result.bridgesCrossed;
}


// ============================================================
// GESTION DES PONTS (actions apres deplacement)
// ============================================================

// Applique l'action choisie par le joueur sur un pont qu'il vient de traverser.
// Deux possibilites : supprimer le pont ou le faire pivoter d'un quart de tour.
//
// Quand on tourne un pont autour d'une extremite (ax, ay) :
//   - Un pont vertical (pointe vers le haut) peut tourner a gauche ou a droite,
//     ce qui le rend horizontal dans la nouvelle direction.
//   - Un pont horizontal (pointe vers la droite) peut tourner vers le haut ou le bas.
// Si la nouvelle position du pont sort des limites du plateau, il disparait.
//
// x1, y1 : premiere case du pont traverse
// x2, y2 : deuxieme case du pont traverse
// action  : une des chaines suivantes :
//   "remove"        → on supprime le pont definitivement
//   "rotate1_left"  → rotation autour de (x1,y1), vers gauche (vertical) ou bas (horizontal)
//   "rotate1_right" → rotation autour de (x1,y1), vers droite (vertical) ou haut (horizontal)
//   "rotate2_left"  → rotation autour de (x2,y2), vers gauche ou bas
//   "rotate2_right" → rotation autour de (x2,y2), vers droite ou haut
function handleBridgeAction(x1, y1, x2, y2, action) {
    // Cas simple : on supprime le pont
    if (action === "remove") {
        removeBridge(x1, y1, x2, y2);
        return;
    }

    // Si l'action n'est pas une rotation, on ignore
    if (!action.startsWith("rotate")) return;

    // On determine autour de quelle extremite le pont va pivoter.
    // "rotate1" = autour de la premiere case (x1, y1)
    // "rotate2" = autour de la deuxieme case (x2, y2)
    let ax, ay;
    if (action.startsWith("rotate1")) {
        ax = x1; ay = y1;
    } else {
        ax = x2; ay = y2;
    }

    // On detecte l'orientation actuelle du pont.
    // Un pont vertical a ses deux cases sur la meme colonne (x1 === x2).
    // Un pont horizontal a ses deux cases sur la meme ligne (y1 === y2).
    let isVertical = (x1 === x2);
    let goRight = action.endsWith("right");

    // Calcul du deplacement de la nouvelle extremite apres rotation :
    //   Pont vertical : la nouvelle extremite se deplace lateralement (gauche ou droite)
    //   Pont horizontal : la nouvelle extremite se deplace verticalement (haut ou bas)
    let newDx, newDy;
    if (isVertical) {
        newDx = goRight ? 1 : -1;
        newDy = 0;
    } else {
        newDx = 0;
        newDy = goRight ? 1 : -1;
    }

    // Coordonnees de la nouvelle extremite apres rotation
    let newX2 = ax + newDx;
    let newY2 = ay + newDy;

    // On supprime l'ancien pont, puis on essaie de placer le nouveau.
    // Si la nouvelle extremite est hors du plateau, le pont disparait simplement.
    // Si l'emplacement cible est deja occupe par un autre pont, on ne l'ajoute pas.
    removeBridge(x1, y1, x2, y2);

    if (newX2 >= 0 && newX2 < BOARD_SIZE && newY2 >= 0 && newY2 < BOARD_SIZE) {
        let newKey = bridgeKey(ax, ay, newX2, newY2);
        if (!bridges.has(newKey)) {
            bridges.add(newKey);
        }
    }
    // Si newX2 ou newY2 est hors du plateau, le pont disparait (aucun ajout)
}


// ============================================================
// ELIMINATION ET FIN DE PARTIE
// ============================================================

// Verifie si un joueur est elimine.
// Un joueur est elimine quand AUCUN de ses lutins n'a de pont adjacent
// dans aucune des 4 directions. Il est completement coupe du reste du plateau.
// On verifie chaque lutin un par un : si au moins un lutin a encore
// un pont accessible, le joueur n'est pas encore elimine.
//
// color : la couleur du joueur a tester ("green", "blue", "yellow" ou "red")
//
// Retourne : true si le joueur est elimine, false s'il peut encore jouer
function checkElimination(color) {
    for (let pos of lutins[color]) {
        let x = pos[0];
        let y = pos[1];

        // On teste les 4 directions autour du lutin.
        // Des qu'on trouve un pont, le joueur n'est pas elimine.
        if (x > 0 && bridgeExists(x, y, x - 1, y)) return false;              // gauche
        if (x < BOARD_SIZE - 1 && bridgeExists(x, y, x + 1, y)) return false; // droite
        if (y > 0 && bridgeExists(x, y, x, y - 1)) return false;              // bas
        if (y < BOARD_SIZE - 1 && bridgeExists(x, y, x, y + 1)) return false; // haut
    }
    // On a parcouru tous les lutins sans trouver de pont : joueur elimine
    return true;
}

// Verifie si un joueur peut deplacer au moins un de ses lutins.
// On simule la glissade de chaque lutin dans chaque direction.
// Si au moins un lutin bouge, le joueur n'est pas bloque.
// Si aucun lutin ne peut bouger, le joueur est bloque et doit
// supprimer un pont de son choix au lieu de deplacer un lutin.
//
// color : la couleur du joueur a tester
//
// Retourne : true si au moins un mouvement est possible, false si le joueur est bloque
function canPlayerMove(color) {
    for (let i = 0; i < lutins[color].length; i++) {
        let pos = lutins[color][i];
        for (let dir in DIRECTIONS) {
            let result = slide(pos[0], pos[1], dir);
            // Si le lutin a bouge (position finale differente de la position de depart)
            if (result.endX !== pos[0] || result.endY !== pos[1]) {
                return true;
            }
        }
    }
    return false;
}

// Verifie les eliminations pour tous les joueurs apres chaque tour.
// Appele apres que les ponts ont ete modifies (suppression ou rotation).
// Met a jour le tableau "eliminated" pour les joueurs nouvellement isoles.
function checkAllEliminations() {
    for (let color of COLORS) {
        if (!eliminated[color] && checkElimination(color)) {
            eliminated[color] = true;
            console.log(color + " est elimine !");
        }
    }
}

// Compte le nombre de joueurs encore en jeu (non elimines).
//
// Retourne : un nombre entre 0 et 4
function playersRemaining() {
    let count = 0;
    for (let color of COLORS) {
        if (!eliminated[color]) count++;
    }
    return count;
}

// Verifie si la partie est terminee.
// La partie se termine quand il ne reste au plus qu'un seul joueur en jeu.
//
// Retourne : true si la partie est finie, false si elle continue
function isGameOver() {
    return playersRemaining() <= 1;
}

// Retourne la liste de tous les ponts encore presents sur le plateau,
// sous la forme d'un tableau de tableaux : [[x1,y1,x2,y2], ...]
// Utilise par l'IA Prolog (board.js) pour connaitre l'etat du plateau.
function getAllBridges() {
    let result = [];
    for (let key of bridges) {
        let parts = key.split("-");
        let c1 = parts[0].split(",");
        let c2 = parts[1].split(",");
        result.push([parseInt(c1[0]), parseInt(c1[1]), parseInt(c2[0]), parseInt(c2[1])]);
    }
    return result;
}

// Retourne la couleur du gagnant.
// On cherche le premier joueur qui n'est pas elimine.
// Cette fonction ne doit etre appelee que quand isGameOver() est true.
//
// Retourne : la couleur du gagnant, ou null s'il n'y a pas de gagnant
function getWinner() {
    for (let color of COLORS) {
        if (!eliminated[color]) return color;
    }
    return null;
}


// ============================================================
// LANCEMENT DU JEU
// ============================================================

// On initialise la partie des le chargement du fichier.
// board.js s'occupera d'afficher le plateau et la barre d'info.
initGame();
console.log("Jeu initialise ! " + bridges.size + " ponts crees.");
console.log("Premier joueur : " + currentPlayer());
