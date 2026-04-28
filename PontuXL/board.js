// ============================================================
// AFFICHAGE DU PLATEAU ET INTERACTIONS (board.js)
//
// Ce fichier s'occupe de tout ce que l'utilisateur voit et fait :
//   - Dessiner le plateau, les lutins, les ponts et les fleches
//   - Reagir aux clics de la souris (choisir un lutin, une direction,
//     un pont a supprimer ou a faire tourner)
//   - Gerer le mode "selection de pont" apres chaque deplacement
//   - Declencher le tour de l'IA (bleu et rouge) via Prolog
//
// Ce fichier lit les donnees definies dans game.js (lutins, ponts,
// joueur courant...) mais ne les modifie que via les fonctions
// de game.js (moveLutin, handleBridgeAction, etc.).
// ============================================================


// ============================================================
// REFERENCES AUX ELEMENTS HTML ET CONSTANTES D'AFFICHAGE
// ============================================================

// On recupere les elements HTML dont on a besoin pour dessiner et afficher
const canvas = document.getElementById("board-canvas");
const ctx = canvas.getContext("2d");           // contexte 2D pour dessiner sur le canvas
const infoPlayer = document.getElementById("current-player");
const infoPhase = document.getElementById("current-phase");
const messageBox = document.getElementById("message-box");
const directionButtons = document.getElementById("direction-buttons");

// Marges autour du plateau en pixels (pour ne pas dessiner sur les bords du canvas)
const PADDING = 50;

// Distance en pixels entre deux cases adjacentes
const CELL_SIZE = (canvas.width - 2 * PADDING) / (BOARD_SIZE - 1);

// Rayon des cercles representant les cases et les lutins
const DOT_RADIUS = 12;
const LUTIN_RADIUS = 16;

// Epaisseur des traits representant les ponts
const BRIDGE_WIDTH = 4;

// Correspondance entre les noms de couleur JS et les couleurs CSS d'affichage
const COLOR_MAP = { green: "#27ae60", blue: "#2980b9", yellow: "#f1c40f", red: "#e74c3c" };

// Noms francais des couleurs pour les messages affiches a l'utilisateur
const COLOR_NAMES = { green: "Vert", blue: "Bleu", yellow: "Jaune", red: "Rouge" };


// ============================================================
// VARIABLES D'ETAT DE L'INTERFACE
// ============================================================

// Le lutin actuellement selectionne par le joueur (null si aucun).
// Quand un joueur clique sur un de ses lutins, on stocke ici
// sa couleur, son index et sa position, pour pouvoir le deplacer
// quand il choisira ensuite une direction.
let selectedLutin = null;

// Indique si on est en mode "selection de pont".
// Ce mode s'active apres qu'un lutin a traverse des ponts :
// le joueur doit choisir quoi faire de chaque pont traverse.
let bridgePickMode = false;

// Variante du mode pont : true = joueur bloque (il choisit n'importe quel pont),
// false = ponts traverses (uniquement ceux que le lutin vient de traverser).
let bridgePickBlockedOnly = false;

// Cle du pont actuellement selectionne dans le mode "selection de pont".
let selectedBridgeKey = null;

// Liste des fleches de rotation disponibles pour le pont selectionne.
// Chaque fleche est un objet { ax, ay, nx, ny, action, label }
// ou (ax, ay) est le pivot et (nx, ny) est la nouvelle extremite.
let rotationArrows = [];

// Liste de tous les ponts que le lutin vient de traverser pendant sa glissade.
// Le joueur doit traiter ces ponts un par un apres le deplacement.
let crossedBridgesList = [];

// Index du prochain pont a traiter dans crossedBridgesList.
let currentCrossedIndex = 0;


// ============================================================
// DESSIN DU PLATEAU
// ============================================================

// Convertit une coordonnee de case (x) en position pixel horizontale sur le canvas.
function toPixelX(x) { return PADDING + x * CELL_SIZE; }

// Convertit une coordonnee de case (y) en position pixel verticale sur le canvas.
// L'axe y est inverse : y=0 est en bas du plateau, y=5 est en haut.
function toPixelY(y) { return canvas.height - PADDING - y * CELL_SIZE; }

// Redessine tout le plateau a partir de zero.
// Appele a chaque fois que l'etat du jeu change (deplacement, suppression de pont, etc.).
// L'ordre de dessin est important : les ponts d'abord, puis les cases, puis les lutins,
// et enfin les surbrillances et fleches par-dessus tout.
function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f5f0e1";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawBridges();
    drawDots();
    drawLutins();
    drawLabels();
    // En mode selection de pont, on ajoute des surbrillances par-dessus
    if (bridgePickMode) {
        if (bridgePickBlockedOnly) {
            highlightAllBridges();     // tous les ponts en rouge (joueur bloque)
        } else if (selectedBridgeKey) {
            highlightSelectedBridge(selectedBridgeKey); // pont selectionne en jaune
            drawRotationArrows();      // fleches de rotation en vert
        }
    }
}

// Dessine tous les ponts existants sous forme de traits bruns.
// Ajoute aussi une petite fleche directionnelle au milieu de chaque pont
// pour indiquer son orientation (horizontal → ou vertical ↑).
function drawBridges() {
    ctx.strokeStyle = "#8B4513";
    ctx.lineWidth = BRIDGE_WIDTH;
    ctx.lineCap = "round";
    for (let key of bridges) {
        let parts = key.split("-");
        let c1 = parts[0].split(",");
        let c2 = parts[1].split(",");
        let x1 = parseInt(c1[0]), y1 = parseInt(c1[1]);
        let x2 = parseInt(c2[0]), y2 = parseInt(c2[1]);
        let px1 = toPixelX(x1), py1 = toPixelY(y1);
        let px2 = toPixelX(x2), py2 = toPixelY(y2);
        ctx.beginPath();
        ctx.moveTo(px1, py1);
        ctx.lineTo(px2, py2);
        ctx.stroke();
        // Petite fleche au milieu du pont pour indiquer son orientation
        let mx = (px1 + px2) / 2, my = (py1 + py2) / 2;
        let isVertical = (x1 === x2);
        ctx.fillStyle = "#5a2d00";
        ctx.font = "bold 11px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(isVertical ? "↑" : "→", mx, my);
    }
    ctx.textBaseline = "alphabetic";
}

// Dessine toutes les cases du plateau sous forme de petits cercles beiges.
// Chaque case est un noeud du plateau ou les lutins peuvent se poser.
function drawDots() {
    for (let x = 0; x < BOARD_SIZE; x++) {
        for (let y = 0; y < BOARD_SIZE; y++) {
            ctx.beginPath();
            ctx.arc(toPixelX(x), toPixelY(y), DOT_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = "#d4c5a0";
            ctx.fill();
            ctx.strokeStyle = "#999";
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }
}

// Dessine tous les lutins de toutes les equipes.
// Un lutin elimine est affiche en gris avec une croix pour le distinguer.
// Le lutin actuellement selectionne est entoure d'un cercle en pointilles blanc.
function drawLutins() {
    for (let color of COLORS) {
        for (let i = 0; i < lutins[color].length; i++) {
            let pos = lutins[color][i];
            let px = toPixelX(pos[0]), py = toPixelY(pos[1]);

            // Corps du lutin : colore si en jeu, gris si elimine
            ctx.beginPath();
            ctx.arc(px, py, LUTIN_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = eliminated[color] ? "#888" : COLOR_MAP[color];
            ctx.fill();
            ctx.strokeStyle = eliminated[color] ? "#555" : "white";
            ctx.lineWidth = 2;
            ctx.stroke();

            // Croix sur les lutins elimines
            if (eliminated[color]) {
                ctx.strokeStyle = "#333"; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(px-8,py-8); ctx.lineTo(px+8,py+8); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(px+8,py-8); ctx.lineTo(px-8,py+8); ctx.stroke();
            }

            // Cercle en pointilles blanc autour du lutin selectionne
            if (selectedLutin && selectedLutin.color === color && selectedLutin.index === i) {
                ctx.beginPath();
                ctx.arc(px, py, LUTIN_RADIUS + 4, 0, Math.PI * 2);
                ctx.strokeStyle = "white"; ctx.lineWidth = 3;
                ctx.setLineDash([5, 3]); ctx.stroke(); ctx.setLineDash([]);
            }
        }
    }
}

// Dessine les numeros de colonnes (en bas) et de lignes (a gauche)
// pour que les joueurs puissent reperer facilement les coordonnees.
function drawLabels() {
    ctx.fillStyle = "#333"; ctx.font = "14px Arial"; ctx.textAlign = "center";
    for (let i = 0; i < BOARD_SIZE; i++) {
        ctx.fillText(i, toPixelX(i), canvas.height - 15);  // numeros de colonnes
        ctx.fillText(i, 15, toPixelY(i) + 5);              // numeros de lignes
    }
}


// ============================================================
// SURBRILLANCES ET FLECHES DE ROTATION
// ============================================================

// Met en evidence tous les ponts en rouge.
// Utilise en mode "joueur bloque" pour montrer au joueur
// quels ponts il peut supprimer.
function highlightAllBridges() {
    ctx.strokeStyle = "#e74c3c"; ctx.lineWidth = 6; ctx.lineCap = "round";
    for (let key of bridges) {
        let parts = key.split("-");
        let c1 = parts[0].split(","), c2 = parts[1].split(",");
        ctx.beginPath();
        ctx.moveTo(toPixelX(parseInt(c1[0])), toPixelY(parseInt(c1[1])));
        ctx.lineTo(toPixelX(parseInt(c2[0])), toPixelY(parseInt(c2[1])));
        ctx.stroke();
    }
}

// Met en evidence un seul pont en jaune epais.
// Utilise pour montrer au joueur quel pont il a selectionne.
//
// key : la cle du pont a mettre en evidence (ex: "2,3-3,3")
function highlightSelectedBridge(key) {
    let parts = key.split("-");
    let c1 = parts[0].split(","), c2 = parts[1].split(",");
    ctx.strokeStyle = "#f1c40f"; ctx.lineWidth = 8; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(toPixelX(parseInt(c1[0])), toPixelY(parseInt(c1[1])));
    ctx.lineTo(toPixelX(parseInt(c2[0])), toPixelY(parseInt(c2[1])));
    ctx.stroke();
}

// Dessine les fleches de rotation vertes sur le plateau.
// Chaque fleche montre une rotation possible pour le pont selectionne.
// Le joueur clique sur une fleche verte pour faire tourner le pont.
// La fleche va de l'extremite pivot (ax, ay) vers la nouvelle
// extremite (nx, ny), avec un cercle vert au milieu indiquant la direction.
function drawRotationArrows() {
    for (let arrow of rotationArrows) {
        let ax = toPixelX(arrow.ax), ay = toPixelY(arrow.ay);
        let nx = toPixelX(arrow.nx), ny = toPixelY(arrow.ny);
        let mx = (ax + nx) / 2, my = (ay + ny) / 2;

        // Ligne en pointilles verts semi-transparente
        ctx.strokeStyle = "rgba(46,204,113,0.6)"; ctx.lineWidth = 6;
        ctx.setLineDash([6, 4]);
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(nx, ny); ctx.stroke();
        ctx.setLineDash([]);

        // Cercle vert solide au milieu avec la lettre de direction
        ctx.beginPath(); ctx.arc(mx, my, 14, 0, Math.PI * 2);
        ctx.fillStyle = "#2ecc71"; ctx.fill();
        ctx.strokeStyle = "white"; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = "white"; ctx.font = "bold 14px Arial";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(arrow.label, mx, my);
    }
    ctx.textBaseline = "alphabetic";
}

// Verifie si les coordonnees pixel (mouseX, mouseY) correspondent
// au centre d'une des fleches de rotation affichees.
// Le rayon de detection est de 18 pixels autour du centre.
//
// mouseX, mouseY : position du clic de la souris
//
// Retourne : l'objet fleche si le clic est dessus, null sinon
function pixelToArrow(mouseX, mouseY) {
    for (let arrow of rotationArrows) {
        let mx = (toPixelX(arrow.ax) + toPixelX(arrow.nx)) / 2;
        let my = (toPixelY(arrow.ay) + toPixelY(arrow.ny)) / 2;
        if (Math.sqrt((mouseX-mx)**2 + (mouseY-my)**2) < 18) return arrow;
    }
    return null;
}


// ============================================================
// DETECTION DE CLIC SUR LE PLATEAU
// ============================================================

// Convertit des coordonnees pixel (clic souris) en coordonnees de case.
// On cherche la case la plus proche du clic, dans un rayon de CELL_SIZE/2.
// Si aucune case n'est assez proche, on retourne null.
//
// mouseX, mouseY : position du clic de la souris sur le canvas
//
// Retourne : { x, y } les coordonnees de la case la plus proche,
//            ou null si le clic n'est pas sur une case
function pixelToCell(mouseX, mouseY) {
    let bestX = -1, bestY = -1, bestDist = Infinity;
    for (let x = 0; x < BOARD_SIZE; x++) {
        for (let y = 0; y < BOARD_SIZE; y++) {
            let dist = Math.sqrt((mouseX-toPixelX(x))**2 + (mouseY-toPixelY(y))**2);
            if (dist < bestDist && dist < CELL_SIZE/2) { bestDist = dist; bestX = x; bestY = y; }
        }
    }
    return bestX === -1 ? null : { x: bestX, y: bestY };
}

// Convertit des coordonnees pixel (clic souris) en cle de pont.
// On cherche le pont dont le segment est le plus proche du clic,
// dans un rayon de 12 pixels. La distance se calcule par rapport
// au segment entier (pas seulement les extremites).
//
// mouseX, mouseY : position du clic de la souris sur le canvas
//
// Retourne : la cle du pont le plus proche, ou null si aucun pont n'est assez pres
function pixelToBridge(mouseX, mouseY) {
    let bestKey = null, bestDist = Infinity;
    for (let key of bridges) {
        let parts = key.split("-");
        let c1 = parts[0].split(","), c2 = parts[1].split(",");
        let px1 = toPixelX(parseInt(c1[0])), py1 = toPixelY(parseInt(c1[1]));
        let px2 = toPixelX(parseInt(c2[0])), py2 = toPixelY(parseInt(c2[1]));
        // Calcul de la distance du point au segment (formule mathematique classique)
        let dx = px2-px1, dy = py2-py1, lenSq = dx*dx + dy*dy;
        let t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((mouseX-px1)*dx + (mouseY-py1)*dy)/lenSq));
        let dist = Math.sqrt((mouseX-(px1+t*dx))**2 + (mouseY-(py1+t*dy))**2);
        if (dist < bestDist && dist < 12) { bestDist = dist; bestKey = key; }
    }
    return bestKey;
}


// ============================================================
// LOGIQUE DE ROTATION (verification de validite)
// ============================================================

// Verifie si on peut faire tourner un pont dans une direction.
// La rotation est impossible si :
//   - La nouvelle extremite serait hors du plateau
//   - Un autre pont occupe deja cet emplacement
//
// ax, ay     : le pivot (extremite autour de laquelle on tourne)
// x1,y1,x2,y2 : les deux extremites actuelles du pont
// direction  : "left" ou "right"
//
// Retourne : true si la rotation est possible, false sinon
function canRotate(ax, ay, x1, y1, x2, y2, direction) {
    let isVertical = (x1 === x2);
    let newDx = isVertical ? (direction === "right" ? 1 : -1) : 0;
    let newDy = isVertical ? 0 : (direction === "right" ? 1 : -1);
    let newX2 = ax + newDx, newY2 = ay + newDy;

    // Hors du plateau : rotation impossible
    if (newX2 < 0 || newX2 >= BOARD_SIZE || newY2 < 0 || newY2 >= BOARD_SIZE) return false;

    // Un autre pont est deja la : rotation impossible
    let currentKey = bridgeKey(x1, y1, x2, y2);
    let newKey = bridgeKey(ax, ay, newX2, newY2);
    if (newKey !== currentKey && bridges.has(newKey)) return false;

    return true;
}


// ============================================================
// MODE SELECTION DE PONT
// ============================================================

// Affiche le panneau d'action pour un pont selectionne.
// Met a jour le libelle du pont et calcule quelles rotations sont possibles.
// Les fleches de rotation disponibles sont stockees dans rotationArrows
// et seront dessinee sur le canvas par drawRotationArrows().
//
// key : la cle du pont selectionne (ex: "2,3-3,3")
function showBridgePickActions(key) {
    let parts = key.split("-");
    let c1 = parts[0].split(","), c2 = parts[1].split(",");
    let x1 = parseInt(c1[0]), y1 = parseInt(c1[1]), x2 = parseInt(c2[0]), y2 = parseInt(c2[1]);
    let isVertical = (x1 === x2);
    let total = crossedBridgesList.length;
    let current = currentCrossedIndex + 1;

    // Affichage du libelle du pont avec sa position et son orientation
    let info = bridgePickBlockedOnly ? "" : ` (${current}/${total})`;
    document.getElementById("bridge-pick-label").innerText =
        `Pont (${x1},${y1})–(${x2},${y2}) ${isVertical ? "vertical ↑" : "horizontal →"}${info}`;
    document.getElementById("btn-pick-remove").style.display = "inline-block";

    rotationArrows = [];

    // En mode "ponts traverses" (pas "joueur bloque"), on calcule
    // les rotations possibles et on les ajoute a rotationArrows.
    if (!bridgePickBlockedOnly) {
        // Calcule la nouvelle extremite si on tourne autour de (ax, ay) dans dir
        function rotDest(ax, ay, dir) {
            let newDx = isVertical ? (dir === "right" ? 1 : -1) : 0;
            let newDy = isVertical ? 0 : (dir === "right" ? 1 : -1);
            return { nx: ax + newDx, ny: ay + newDy };
        }

        // Symboles affiches dans les cercles verts des fleches
        let labelLeft = isVertical ? "←" : "↓";
        let labelRight = isVertical ? "→" : "↑";

        // Les 4 rotations possibles : autour de chaque extremite, dans chaque sens
        let combos = [
            { ax: x1, ay: y1, dir: "left",  action: "rotate1_left",  label: labelLeft  },
            { ax: x1, ay: y1, dir: "right", action: "rotate1_right", label: labelRight },
            { ax: x2, ay: y2, dir: "left",  action: "rotate2_left",  label: labelLeft  },
            { ax: x2, ay: y2, dir: "right", action: "rotate2_right", label: labelRight },
        ];

        for (let c of combos) {
            if (canRotate(c.ax, c.ay, x1, y1, x2, y2, c.dir)) {
                let dest = rotDest(c.ax, c.ay, c.dir);
                rotationArrows.push({ ax: c.ax, ay: c.ay, nx: dest.nx, ny: dest.ny, action: c.action, label: c.label });
            }
        }

        // Si aucune rotation n'est possible, on le precise dans le libelle
        if (rotationArrows.length === 0) {
            document.getElementById("bridge-pick-label").innerText += " — rotation impossible";
        } else {
            document.getElementById("bridge-pick-label").innerText += " — cliquez une fleche verte";
        }
    }

    // Les boutons de rotation HTML sont toujours caches (les rotations
    // se font en cliquant sur les fleches vertes du canvas, pas sur des boutons)
    document.getElementById("btn-pick-rotate1-left").style.display  = "none";
    document.getElementById("btn-pick-rotate1-right").style.display = "none";
    document.getElementById("btn-pick-rotate2-left").style.display  = "none";
    document.getElementById("btn-pick-rotate2-right").style.display = "none";
    document.getElementById("bridge-pick-actions").style.display = "block";
    drawBoard();
}

// Active le mode "joueur bloque" : le joueur ne peut pas deplacer
// de lutin et doit supprimer un pont de son choix.
// On met en evidence tous les ponts en rouge pour indiquer les choix.
function showBridgePickMode() {
    bridgePickBlockedOnly = true;
    bridgePickMode = true;
    selectedBridgeKey = null;
    rotationArrows = [];
    document.getElementById("bridge-pick-actions").style.display = "none";
    drawBoard();
    setMessage("Vous etes bloque. Cliquez sur un pont pour le supprimer.");
}

// Passe au pont suivant dans la liste des ponts traverses.
// Appele apres que le joueur a traite le pont precedent (supprime ou tourne).
// Si tous les ponts ont ete traites, on passe la fin du tour.
function showNextCrossedBridge() {
    if (currentCrossedIndex >= crossedBridgesList.length) {
        finishTurn();
        return;
    }
    let bridge = crossedBridgesList[currentCrossedIndex];
    // Si ce pont n'existe plus (supprime ou tourne avant), on passe au suivant
    if (!bridgeExists(bridge[0], bridge[1], bridge[2], bridge[3])) {
        currentCrossedIndex++;
        showNextCrossedBridge();
        return;
    }
    let key = bridgeKey(bridge[0], bridge[1], bridge[2], bridge[3]);
    selectedBridgeKey = key;
    bridgePickMode = true;
    bridgePickBlockedOnly = false;
    rotationArrows = [];
    document.getElementById("bridge-pick-actions").style.display = "none";
    drawBoard();
    showBridgePickActions(key);
}

// Applique l'action choisie par le joueur sur le pont selectionne
// (supprimer ou tourner), puis passe au pont suivant ou termine le tour.
//
// action : "remove", "rotate1_left", "rotate1_right", "rotate2_left" ou "rotate2_right"
function applyBridgePick(action) {
    if (!selectedBridgeKey) return;
    let parts = selectedBridgeKey.split("-");
    let c1 = parts[0].split(","), c2 = parts[1].split(",");
    handleBridgeAction(parseInt(c1[0]), parseInt(c1[1]), parseInt(c2[0]), parseInt(c2[1]), action);
    bridgePickMode = false;
    selectedBridgeKey = null;
    rotationArrows = [];
    document.getElementById("bridge-pick-actions").style.display = "none";
    drawBoard();

    if (bridgePickBlockedOnly) {
        // Mode bloque : un seul pont a traiter, on passe directement a la fin du tour
        finishTurn();
    } else {
        // Mode ponts traverses : on passe au pont suivant de la liste
        currentCrossedIndex++;
        showNextCrossedBridge();
    }
}


// ============================================================
// GESTIONNAIRE DE CLIC SUR LE CANVAS
// ============================================================

// Ecoute tous les clics de la souris sur le canvas et les traite
// selon la phase de jeu et le mode actif.
canvas.addEventListener("click", function (e) {
    let rect = canvas.getBoundingClientRect();
    let mouseX = e.clientX - rect.left, mouseY = e.clientY - rect.top;

    if (bridgePickMode) {
        if (bridgePickBlockedOnly) {
            // Mode bloque : on clique sur n'importe quel pont pour le selectionner
            let key = pixelToBridge(mouseX, mouseY);
            if (key) {
                selectedBridgeKey = key;
                rotationArrows = [];
                drawBoard();
                showBridgePickActions(key);
            } else {
                setMessage("Cliquez sur un pont pour le supprimer.");
            }
        } else {
            // Mode ponts traverses : on clique sur une fleche verte pour tourner le pont
            if (selectedBridgeKey && rotationArrows.length > 0) {
                let arrow = pixelToArrow(mouseX, mouseY);
                if (arrow) { applyBridgePick(arrow.action); return; }
            }
        }
        return;
    }

    // Hors mode pont : on clique sur une case du plateau
    let cell = pixelToCell(mouseX, mouseY);
    if (!cell) return;

    let player = currentPlayer();

    // Les joueurs humains sont vert et jaune ; bleu et rouge sont l'IA
    if (player !== "green" && player !== "yellow") {
        setMessage("C'est au tour de l'IA (" + COLOR_NAMES[player] + "). Patientez...");
        return;
    }

    if (phase === "placement") handlePlacement(cell.x, cell.y);
    else if (phase === "movement") handleMovementClick(cell.x, cell.y);
});


// ============================================================
// PLACEMENT DES LUTINS
// ============================================================

// Gere le clic du joueur humain pendant la phase de placement.
// Si le placement reussit, on verifie si c'est maintenant au tour de l'IA.
//
// x, y : coordonnees de la case cliquee
function handlePlacement(x, y) {
    if (isOccupied(x, y)) { setMessage("Case deja occupee !"); return; }
    let ok = placeLutin(x, y);
    if (ok) {
        drawBoard(); updateInfoBar();
        if (phase === "movement") {
            // Tous les lutins sont places, la partie commence
            startPlayerTurn();
        } else {
            let next = currentPlayer();
            if (next === "green" || next === "yellow") {
                setMessage("Cliquez sur une case pour placer un lutin " + COLOR_NAMES[next].toLowerCase() + ".");
            } else {
                // C'est au tour d'un joueur IA de placer ses lutins
                handleAIPlacement();
            }
        }
    }
}

// Gere le placement des lutins de l'IA (bleu et rouge).
// L'IA place ses lutins aleatoirement sur des cases libres.
// On continue tant que c'est au tour d'un joueur IA.
function handleAIPlacement() {
    let player = currentPlayer();
    while (player === "blue" || player === "red") {
        let placed = false, attempts = 0;
        while (!placed && attempts < 100) {
            let rx = Math.floor(Math.random() * BOARD_SIZE);
            let ry = Math.floor(Math.random() * BOARD_SIZE);
            if (!isOccupied(rx, ry)) { placeLutin(rx, ry); placed = true; }
            attempts++;
        }
        drawBoard(); updateInfoBar();
        player = currentPlayer();
        if (phase === "movement") { startPlayerTurn(); return; }
    }
    setMessage("Cliquez sur une case pour placer un lutin " + COLOR_NAMES[currentPlayer()].toLowerCase() + ".");
}


// ============================================================
// DEPLACEMENT DES LUTINS
// ============================================================

// Gere le clic du joueur humain pendant la phase de deplacement.
// Deux etapes : d'abord cliquer sur un lutin pour le selectionner,
// puis cliquer sur une direction (via les boutons fleches).
//
// x, y : coordonnees de la case cliquee
function handleMovementClick(x, y) {
    let player = currentPlayer();
    for (let i = 0; i < lutins[player].length; i++) {
        let pos = lutins[player][i];
        if (pos[0] === x && pos[1] === y) {
            selectedLutin = { color: player, index: i, x, y };
            drawBoard();
            setMessage("Lutin selectionne en (" + x + "," + y + "). Choisissez une direction.");
            directionButtons.style.display = "block"; // on affiche les boutons de direction
            return;
        }
    }
    setMessage("Cliquez sur un de vos lutins " + COLOR_NAMES[player].toLowerCase() + ".");
}

// Applique le deplacement du lutin selectionne dans la direction choisie.
// Si le deplacement est impossible (pas de pont dans cette direction),
// on le signale et on laisse le joueur choisir une autre direction.
// Si des ponts ont ete traverses, on entre en mode selection de pont.
//
// dir : "up", "down", "left" ou "right"
function chooseDirection(dir) {
    if (!selectedLutin) return;
    let result = moveLutin(selectedLutin.index, dir);
    if (result === null) {
        setMessage("Impossible d'aller dans cette direction ! Essayez une autre.");
        return;
    }
    directionButtons.style.display = "none";
    selectedLutin = null;
    drawBoard();

    if (result.length === 0) {
        // Aucun pont traverse : fin de tour directe sans selection de pont
        finishTurn();
        return;
    }

    // Des ponts ont ete traverses : le joueur doit les traiter un par un
    crossedBridgesList = result;
    currentCrossedIndex = 0;
    showNextCrossedBridge();
}

// Annule la selection du lutin et remet l'interface dans l'etat initial.
function cancelSelection() {
    selectedLutin = null;
    directionButtons.style.display = "none";
    setMessage("Selection annulee. Cliquez sur un de vos lutins.");
    drawBoard();
}


// ============================================================
// FIN DE TOUR ET ENCHAINEMENT DES TOURS
// ============================================================

// Termine le tour du joueur courant.
// Verifie les eliminations, detecte la fin de partie,
// puis passe au joueur suivant et demarre son tour.
function finishTurn() {
    crossedBridgesList = [];
    currentCrossedIndex = 0;
    checkAllEliminations();

    if (isGameOver()) {
        let winner = getWinner();
        setMessage("Partie terminee ! Le gagnant est : " + COLOR_NAMES[winner] + " !");
        drawBoard(); updateInfoBar(); return;
    }

    nextPlayer();
    startPlayerTurn();
}

// Demarre le tour du joueur courant.
// Si c'est un joueur humain (vert ou jaune) : on verifie s'il est bloque.
// Si c'est l'IA (bleu ou rouge) : on declenche handleAIMove() apres
// un court delai (500 ms) pour que le joueur puisse voir ce qui se passe.
function startPlayerTurn() {
    let player = currentPlayer();
    updateInfoBar(); drawBoard();
    if (player === "green" || player === "yellow") {
        if (!canPlayerMove(player)) {
            setMessage(COLOR_NAMES[player] + " ne peut bouger aucun lutin. Cliquez sur un pont pour le supprimer.");
            showBridgePickMode();
        } else {
            setMessage("C'est a " + COLOR_NAMES[player] + " de jouer. Cliquez sur un de vos lutins.");
        }
    } else {
        setMessage("C'est au tour de l'IA (" + COLOR_NAMES[player] + ")...");
        setTimeout(handleAIMove, 500); // petit delai pour que le joueur voie le changement de tour
    }
}


// ============================================================
// TOUR DE L'IA (bleu et rouge)
// ============================================================

// Construit une chaine de caracteres representant l'etat actuel du jeu.
// Ce format est concu pour etre envoye au moteur Prolog qui prend la decision.
// Format : "couleur|lutins|ponts"
//   - couleur  : le joueur courant ("blue" ou "red")
//   - lutins   : "couleur:x:y," pour chaque lutin de chaque equipe
//   - ponts    : "x1:y1:x2:y2," pour chaque pont present
function buildPrologState() {
    let state = currentPlayer() + "|";

    for (let color of COLORS) {
        for (let pos of lutins[color]) {
            state += `${color}:${pos[0]}:${pos[1]},`;
        }
    }

    state += "|";

    for (let b of getAllBridges()) {
        state += `${b[0]}:${b[1]}:${b[2]}:${b[3]},`;
    }

    return state;
}

// Joue le tour de l'IA en interrogeant le moteur Prolog.
// La fonction est "async" car elle attend la reponse de Prolog avec "await".
// Prolog retourne un mouvement encode sous la forme :
//   "lutinIndex,direction,action"
//   Exemple : "2,right,remove" = deplacement du lutin 2 vers la droite,
//             puis suppression du pont traverse.
async function handleAIMove() {
    let player = currentPlayer();

    let response = null;

    try {
        // On interroge Prolog pour qu'il choisisse le meilleur coup.
        // "decide_move" est une regle Prolog definie dans ai_bot.pl.
        // La reponse est mise dans la variable "Message" sous forme de chaine.
        response = await plSession.query(`
            decide_move(_, Move),
            transformer_reponse_en_string([Move], Message).
        `);
    } catch (err) {
        console.error("Erreur lors de la requete Prolog pour l'IA :", err);
    }

    console.log("Reponse brute de l'IA :", response);

    if (!response) {
        // Prolog n'a pas trouve de mouvement : on passe le tour
        console.log("L'IA n'a pas trouve de coup, on passe le tour.");
        finishTurn();
        return;
    }

    // On decode la reponse Prolog (liste de codes) en texte JavaScript
    let decoded = fromArrayCodeToString(jmjCodeToString(response)).trim();
    console.log("Coup de l'IA decode :", decoded);

    // Le format attendu est "lutinIndex,direction,action"
    let parts = decoded.split(",");
    let lutinIndex = parseInt(parts[0]);
    let direction = parts[1];
    let action = parts[2];

    console.log("L'IA joue : lutin " + lutinIndex + " vers " + direction);

    // On effectue le deplacement du lutin de l'IA
    let crossedBridges = moveLutin(lutinIndex, direction);

    if (crossedBridges === null) {
        // Le coup de Prolog est invalide (ne devrait pas arriver normalement)
        console.log("Coup de l'IA invalide, on passe le tour.");
        finishTurn();
        return;
    }

    // Pour chaque pont traverse, on applique l'action choisie par l'IA
    for (let b of crossedBridges) {
        handleBridgeAction(b[0], b[1], b[2], b[3], action);
    }

    drawBoard();
    finishTurn();
}


// ============================================================
// FONCTIONS D'INTERFACE (barre d'info et messages)
// ============================================================

// Affiche un message dans la zone de texte sous le plateau.
// Utilise pour guider le joueur : "C'est votre tour", "Case deja occupee", etc.
//
// msg : le texte a afficher
function setMessage(msg) { messageBox.innerText = msg; }

// Met a jour la barre d'information (joueur courant et phase de jeu).
// La couleur de fond du nom du joueur change selon son equipe.
function updateInfoBar() {
    let player = currentPlayer();
    infoPlayer.innerText = COLOR_NAMES[player];
    infoPlayer.style.backgroundColor = COLOR_MAP[player];
    infoPlayer.style.color = (player === "yellow") ? "#333" : "white"; // texte sombre sur fond jaune
    infoPhase.innerText = (phase === "placement") ? "Placement" : "Mouvement";
}


// ============================================================
// DEMARRAGE DE LA PAGE
// ============================================================

// On dessine le plateau initial et on affiche les informations de depart.
// initGame() a deja ete appele dans game.js, donc les donnees sont pretes.
initGame();
drawBoard();
updateInfoBar();
setMessage("Cliquez sur une case pour placer un lutin vert.");

// On charge le programme Prolog de l'IA depuis le fichier ai_bot.pl.
// Ce chargement est asynchrone (fetch) : l'IA ne sera operationnelle
// qu'apres que le fichier soit telecharge et compile par Tau-Prolog.
// Pour les phases de placement et les premiers tours, ca n'est pas un probleme
// car l'IA ne joue qu'a partir de la phase de mouvement.
fetch("ai_bot.pl")
  .then(res => res.text())
  .then(program => {
      plSession.session.consult(program);
      console.log("Programme Prolog de l'IA charge et pret !");
  });
