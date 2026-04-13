//  état et logique du jeu

// constantes du jeu
const BOARD_SIZE = 6;
const COLORS = ["green", "blue", "yellow", "red"];
const LUTINS_PER_PLAYER = 6;

//  État du jeu

// qui joue : on commence par vert (index 0)
let currentPlayerIndex = 0;

// phase du jeu : "placement" ou "movement"
let phase = "placement";

// compteur de lutins placés par chaque joueur
let lutinsPlaced = {
    green: 0,
    blue: 0,
    yellow: 0,
    red: 0
};

// Position des lutins de chaque joueur
// Chaque entrée est un tableau de [x, y]
// Exemple après placement : green: [[0,0], [1,2], ...]
let lutins = {
    green: [],
    blue: [],
    yellow: [],
    red: []
};

// Les ponts existants
// On utilise un Set de strings
// Format horizontal : "x1,y1-x2,y1" avec x2 = x1+1
// Format vertical   : "x1,y1-x1,y2" avec y2 = y1+1
// Exemple : "2,3-3,3" = pont horizontal entre case (2,3) et (3,3)
//           "2,3-2,4" = pont vertical entre case (2,3) et (2,4)
let bridges = new Set();

// Joueurs éliminés
let eliminated = {
    green: false,
    blue: false,
    yellow: false,
    red: false
};


// initialisation

function initBridges() {
    bridges.clear();

    for (let x = 0; x < BOARD_SIZE; x++) {
        for (let y = 0; y < BOARD_SIZE; y++) {
            // pont horizontal vers la droite
            if (x + 1 < BOARD_SIZE) {
                bridges.add(x + "," + y + "-" + (x + 1) + "," + y);
            }
            // pont vertical vers le haut
            if (y + 1 < BOARD_SIZE) {
                bridges.add(x + "," + y + "-" + x + "," + (y + 1));
            }
        }
    }
}

function initGame() {
    currentPlayerIndex = 0;
    phase = "placement";
    eliminated = { green: false, blue: false, yellow: false, red: false };
    lutinsPlaced = { green: 0, blue: 0, yellow: 0, red: 0 };
    lutins = { green: [], blue: [], yellow: [], red: [] };
    initBridges();
}


// fonctions utilitaires

// retourne la couleur du joueur actuel
function currentPlayer() {
    return COLORS[currentPlayerIndex];
}

// passe au joueur suivant (en sautant les éliminés)
function nextPlayer() {
    let attempts = 0;
    do {
        currentPlayerIndex = (currentPlayerIndex + 1) % 4;
        attempts++;
    } while (eliminated[currentPlayer()] && attempts < 4);
}
// vérifie si une case est occupée par un lutin
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

// retourne la clé du pont entre deux cases adjacentes
// toujours dans l'ordre lexicographique (petit d'abord)
function bridgeKey(x1, y1, x2, y2) {
    // On met la coordonnée la plus petite en premier
    if (x1 < x2 || (x1 === x2 && y1 < y2)) {
        return x1 + "," + y1 + "-" + x2 + "," + y2;
    } else {
        return x2 + "," + y2 + "-" + x1 + "," + y1;
    }
}

// vérifie si un pont existe entre deux cases adjacentes
function bridgeExists(x1, y1, x2, y2) {
    return bridges.has(bridgeKey(x1, y1, x2, y2));
}

// supprime un pont
function removeBridge(x1, y1, x2, y2) {
    bridges.delete(bridgeKey(x1, y1, x2, y2));
}


//Logique de glissade (terrain glissant)

// directions possibles : haut, bas, gauche, droite
const DIRECTIONS = {
    up:    [0, 1],
    down:  [0, -1],
    left:  [-1, 0],
    right: [1, 0]
};

// fait glisser un lutin depuis (startX, startY) dans une direction
// retourne : { endX, endY, bridgesCrossed: [[x1,y1,x2,y2], ...] }
function slide(startX, startY, direction) {
    let dx = DIRECTIONS[direction][0];
    let dy = DIRECTIONS[direction][1];

    let currentX = startX;
    let currentY = startY;
    let crossedBridges = [];

    while (true) {
        let nextX = currentX + dx;
        let nextY = currentY + dy;

        // vérifier les limites du plateau
        if (nextX < 0 || nextX >= BOARD_SIZE || nextY < 0 || nextY >= BOARD_SIZE) {
            break;
        }

        // vérifier si le pont existe
        if (!bridgeExists(currentX, currentY, nextX, nextY)) {
            break;
        }

        // vérifier si la case suivante est occupée
        if (isOccupied(nextX, nextY)) {
            break;
        }

        // On peut avancer : on enregistre le pont traversé
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


//  Placement d'un lutin

function placeLutin(x, y) {
    let player = currentPlayer();

    // Vérifications
    if (phase !== "placement") {
        console.log("On n'est plus en phase de placement !");
        return false;
    }
    if (isOccupied(x, y)) {
        console.log("Case déjà occupée !");
        return false;
    }
    if (lutinsPlaced[player] >= LUTINS_PER_PLAYER) {
        console.log("Tous les lutins sont déjà placés !");
        return false;
    }

    // placer le lutin
    lutins[player].push([x, y]);
    lutinsPlaced[player]++;

    // vérifier si tous les lutins de tous les joueurs sont placés
    let totalPlaced = 0;
    for (let color of COLORS) {
        totalPlaced += lutinsPlaced[color];
    }
    if (totalPlaced >= COLORS.length * LUTINS_PER_PLAYER) {
        phase = "movement";
        console.log("Phase de placement terminée ! On passe au mouvement.");
    }

    nextPlayer();
    return true;
}


//  déplacement d'un lutin

// déplace un lutin du joueur courant
// lutinIndex = quel lutin (0 à 5)
// direction = "up", "down", "left", "right"
// retourne les ponts traversés pour que l'interface demande quoi en faire
function moveLutin(lutinIndex, direction) {
    let player = currentPlayer();

    if (phase !== "movement") {
        console.log("On est encore en phase de placement !");
        return null;
    }

    let pos = lutins[player][lutinIndex];
    if (!pos) {
        console.log("Lutin invalide !");
        return null;
    }

    let result = slide(pos[0], pos[1], direction);

    // vérifier que le lutin a bougé
    if (result.endX === pos[0] && result.endY === pos[1]) {
        console.log("Le lutin ne peut pas bouger dans cette direction !");
        return null;
    }

    // déplacer le lutin
    lutins[player][lutinIndex] = [result.endX, result.endY];

    return result.bridgesCrossed;
}


//  gestion des ponts après déplacement

// pour chaque pont traversé, le joueur choisit : retirer ou tourner
// actions possibles :
// "remove"
// "rotate1_left"  : axe case 1, pont vertical → gauche / pont horizontal → bas
// "rotate1_right" : axe case 1, pont vertical → droite / pont horizontal → haut
// "rotate2_left"  : axe case 2, pont vertical → gauche / pont horizontal → bas
// "rotate2_right" : axe case 2, pont vertical → droite / pont horizontal → haut
function handleBridgeAction(x1, y1, x2, y2, action) {
    if (action === "remove") {
        removeBridge(x1, y1, x2, y2);
        return;
    }

    if (!action.startsWith("rotate")) return;

    // Déterminer l'axe
    let ax, ay, bx, by;
    if (action.startsWith("rotate1")) {
        ax = x1; ay = y1; bx = x2; by = y2;
    } else {
        ax = x2; ay = y2; bx = x1; by = y1;
    }

    let isVertical = (x1 === x2); // même x = pont vertical
    let goRight = action.endsWith("right");

    // Pont vertical (↑) : tourne vers gauche (-1,0) ou droite (+1,0)
    // Pont horizontal (→) : tourne vers haut (0,+1) ou bas (0,-1)
    let newDx, newDy;
    if (isVertical) {
        newDx = goRight ? 1 : -1;
        newDy = 0;
    } else {
        newDx = 0;
        newDy = goRight ? 1 : -1;
    }

    let newX2 = ax + newDx;
    let newY2 = ay + newDy;

    removeBridge(x1, y1, x2, y2);

    if (newX2 >= 0 && newX2 < BOARD_SIZE && newY2 >= 0 && newY2 < BOARD_SIZE) {
        let newKey = bridgeKey(ax, ay, newX2, newY2);
        if (!bridges.has(newKey)) {
            bridges.add(newKey);
        }
    }
    // sinon le pont disparaît simplement
}


//  vérification d'élimination

// un joueur est éliminé si aucun de ses lutins n'a de pont autour
function checkElimination(color) {
    for (let pos of lutins[color]) {
        let x = pos[0];
        let y = pos[1];

        // Vérifier les 4 directions
        if (x > 0 && bridgeExists(x, y, x - 1, y)) return false;
        if (x < BOARD_SIZE - 1 && bridgeExists(x, y, x + 1, y)) return false;
        if (y > 0 && bridgeExists(x, y, x, y - 1)) return false;
        if (y < BOARD_SIZE - 1 && bridgeExists(x, y, x, y + 1)) return false;
    }
    return true;
}

// vérifie si un joueur peut bouger au moins un lutin
function canPlayerMove(color) {
    for (let i = 0; i < lutins[color].length; i++) {
        let pos = lutins[color][i];
        for (let dir in DIRECTIONS) {
            let result = slide(pos[0], pos[1], dir);
            if (result.endX !== pos[0] || result.endY !== pos[1]) {
                return true;
            }
        }
    }
    return false;
}

// vérifie les éliminations après chaque tour
function checkAllEliminations() {
    for (let color of COLORS) {
        if (!eliminated[color] && checkElimination(color)) {
            eliminated[color] = true;
            console.log(color + " est éliminé !");
        }
    }
}

// compte combien de joueurs sont encore en jeu
function playersRemaining() {
    let count = 0;
    for (let color of COLORS) {
        if (!eliminated[color]) count++;
    }
    return count;
}

// vérifie si le jeu est terminé
function isGameOver() {
    return playersRemaining() <= 1;
}

// retourne la liste de tous les ponts existants sous forme [[x1,y1,x2,y2], ...]
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

// retourne le gagnant
function getWinner() {
    for (let color of COLORS) {
        if (!eliminated[color]) return color;
    }
    return null;
}


//  lancement
initGame();
console.log("Jeu initialisé ! " + bridges.size + " ponts créés.");
console.log("C'est au tour de : " + currentPlayer());
