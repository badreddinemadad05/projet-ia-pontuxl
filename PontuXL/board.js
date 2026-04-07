
// board.js — Affichage du plateau et interactions


//Références  HTML
const canvas = document.getElementById("board-canvas");
const ctx = canvas.getContext("2d");
const infoPlayer = document.getElementById("current-player");
const infoPhase = document.getElementById("current-phase");
const messageBox = document.getElementById("message-box");
const directionButtons = document.getElementById("direction-buttons");
const bridgeActionsDiv = document.getElementById("bridge-actions");
const bridgeActionLabel = document.getElementById("bridge-action-label");

// Dimensions du dessin
const PADDING = 50;         // marge autour du plateau
const CELL_SIZE = (canvas.width - 2 * PADDING) / (BOARD_SIZE - 1);
const DOT_RADIUS = 12;      // rayon des cases
const LUTIN_RADIUS = 16;    // rayon des lutins
const BRIDGE_WIDTH = 4;     // épaisseur des ponts

// Couleur
const COLOR_MAP = {
    green: "#27ae60",
    blue: "#2980b9",
    yellow: "#f1c40f",
    red: "#e74c3c"
};

const COLOR_NAMES = {
    green: "Vert",
    blue: "Bleu",
    yellow: "Jaune",
    red: "Rouge"
};

// État de la interaction
let selectedLutin = null;      // { color, index, x, y } du lutin sélectionné
let pendingBridges = [];       // ponts à traiter après un déplacement
let currentBridgeIndex = 0;    // quel pont on est en train de traiter



// DESSIN DU PLATEAU


// convertit coordonnées jeu (x,y) en pixels sur le canvas
function toPixelX(x) {
    return PADDING + x * CELL_SIZE;
}

function toPixelY(y) {
    // inversement Y pour que (0,0) soit en bas à gauche
    return canvas.height - PADDING - y * CELL_SIZE;
}

// dessin tout le plateau
function drawBoard() {
    // effacer le canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // fond du plateau
    ctx.fillStyle = "#f5f0e1";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // dessiner les ponts
    drawBridges();

    // dessiner les cases (points)
    drawDots();

    // dessiner les lutins
    drawLutins();

    // dessiner les numéros des axes
    drawLabels();
}

// dessine les ponts existants
function drawBridges() {
    ctx.strokeStyle = "#8B4513"; // marron
    ctx.lineWidth = BRIDGE_WIDTH;
    ctx.lineCap = "round";

    for (let key of bridges) {
        let parts = key.split("-");
        let coords1 = parts[0].split(",");
        let coords2 = parts[1].split(",");

        let x1 = parseInt(coords1[0]);
        let y1 = parseInt(coords1[1]);
        let x2 = parseInt(coords2[0]);
        let y2 = parseInt(coords2[1]);

        ctx.beginPath();
        ctx.moveTo(toPixelX(x1), toPixelY(y1));
        ctx.lineTo(toPixelX(x2), toPixelY(y2));
        ctx.stroke();
    }
}

// dessine les points des cases
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

// dessine les lutins sur le plateau
function drawLutins() {
    for (let color of COLORS) {
        for (let i = 0; i < lutins[color].length; i++) {
            let pos = lutins[color][i];
            let px = toPixelX(pos[0]);
            let py = toPixelY(pos[1]);

            // Cercle du lutin
            ctx.beginPath();
            ctx.arc(px, py, LUTIN_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = COLOR_MAP[color];
            ctx.fill();
            ctx.strokeStyle = "white";
            ctx.lineWidth = 2;
            ctx.stroke();

            // Si c'est le lutin sélectionné, dessiner un contour
            if (selectedLutin && selectedLutin.color === color && selectedLutin.index === i) {
                ctx.beginPath();
                ctx.arc(px, py, LUTIN_RADIUS + 4, 0, Math.PI * 2);
                ctx.strokeStyle = "white";
                ctx.lineWidth = 3;
                ctx.setLineDash([5, 3]);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }
    }
}

// dessine les numéros des axes
function drawLabels() {
    ctx.fillStyle = "#333";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";

    for (let i = 0; i < BOARD_SIZE; i++) {
        // Axe X (en bas)
        ctx.fillText(i, toPixelX(i), canvas.height - 15);
        // Axe Y (à gauche)
        ctx.fillText(i, 15, toPixelY(i) + 5);
    }
}



// INTERACTIONS


// donvertit un clic en coordonnées de case
function pixelToCell(mouseX, mouseY) {
    let bestX = -1;
    let bestY = -1;
    let bestDist = Infinity;

    for (let x = 0; x < BOARD_SIZE; x++) {
        for (let y = 0; y < BOARD_SIZE; y++) {
            let px = toPixelX(x);
            let py = toPixelY(y);
            let dist = Math.sqrt((mouseX - px) ** 2 + (mouseY - py) ** 2);
            if (dist < bestDist && dist < CELL_SIZE / 2) {
                bestDist = dist;
                bestX = x;
                bestY = y;
            }
        }
    }

    if (bestX === -1) return null;
    return { x: bestX, y: bestY };
}

// quand on clique sur le canvas
canvas.addEventListener("click", function (e) {
    let rect = canvas.getBoundingClientRect();
    let mouseX = e.clientX - rect.left;
    let mouseY = e.clientY - rect.top;

    let cell = pixelToCell(mouseX, mouseY);
    if (!cell) return;

    let player = currentPlayer();

    // Vérifier si c'est un joueur humain (vert ou jaune)
    if (player !== "green" && player !== "yellow") {
        setMessage("C'est au tour de l'IA (" + COLOR_NAMES[player] + "). Patientez...");
        return;
    }

    if (phase === "placement") {
        handlePlacement(cell.x, cell.y);
    } else if (phase === "movement") {
        handleMovementClick(cell.x, cell.y);
    }
});

//  phase de placement
function handlePlacement(x, y) {
    let player = currentPlayer();

    if (isOccupied(x, y)) {
        setMessage("Case déjà occupée ! Choisissez une autre case.");
        return;
    }

    let ok = placeLutin(x, y);
    if (ok) {
        drawBoard();
        updateInfoBar();

        // si on est passé en phase mouvement
        if (phase === "movement") {
            setMessage("Tous les lutins sont placés ! Phase de mouvement. Cliquez sur un de vos lutins.");
        } else {
            let next = currentPlayer();
            if (next === "green" || next === "yellow") {
                setMessage("Cliquez sur une case pour placer un lutin " + COLOR_NAMES[next].toLowerCase() + ".");
            } else {
                // C'est au tour de l'IA — pour l'instant on place automatiquement
                handleAIPlacement();
            }
        }
    }
}

// placement automatique (simple) pour l'IA en attendant le vrai module
function handleAIPlacement() {
    let player = currentPlayer();
    while (player === "blue" || player === "red") {
        // Trouver une case libre au hasard
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 100) {
            let rx = Math.floor(Math.random() * BOARD_SIZE);
            let ry = Math.floor(Math.random() * BOARD_SIZE);
            if (!isOccupied(rx, ry)) {
                placeLutin(rx, ry);
                placed = true;
            }
            attempts++;
        }

        drawBoard();
        updateInfoBar();

        player = currentPlayer();

        // si on est passé en phase mouvement, arrêter
        if (phase === "movement") {
            setMessage("Tous les lutins sont placés ! Phase de mouvement. Cliquez sur un de vos lutins.");
            return;
        }
    }

    setMessage("Cliquez sur une case pour placer un lutin " + COLOR_NAMES[currentPlayer()].toLowerCase() + ".");
}

//phase de mouvement
function handleMovementClick(x, y) {
    let player = currentPlayer();

    // chercher si le clic correspond à un lutin du joueur actuel
    for (let i = 0; i < lutins[player].length; i++) {
        let pos = lutins[player][i];
        if (pos[0] === x && pos[1] === y) {
            // Sélectionner ce lutin
            selectedLutin = { color: player, index: i, x: x, y: y };
            drawBoard();
            setMessage("Lutin sélectionné en (" + x + "," + y + "). Choisissez une direction.");
            directionButtons.style.display = "block";
            return;
        }
    }

    setMessage("Cliquez sur un de vos lutins " + COLOR_NAMES[player].toLowerCase() + ".");
}

// quand le joueur choisit une direction
function chooseDirection(dir) {
    if (!selectedLutin) return;

    let result = moveLutin(selectedLutin.index, dir);

    if (result === null) {
        setMessage("Impossible d'aller dans cette direction ! Essayez une autre.");
        return;
    }

    // Cacher les boutons de direction
    directionButtons.style.display = "none";
    selectedLutin = null;

    drawBoard();

    // Gérer les ponts traversés
    if (result.length > 0) {
        pendingBridges = result;
        currentBridgeIndex = 0;
        showBridgeAction();
    } else {
        finishTurn();
    }
}

// annuler la sélection d'un lutin
function cancelSelection() {
    selectedLutin = null;
    directionButtons.style.display = "none";
    setMessage("Sélection annulée. Cliquez sur un de vos lutins.");
    drawBoard();
}

// afficher les boutons pour retirer/tourner un pont
function showBridgeAction() {
    let bridge = pendingBridges[currentBridgeIndex];
    let label = "Pont (" + bridge[0] + "," + bridge[1] + ")–(" + bridge[2] + "," + bridge[3] + ")";
    label += " — Pont " + (currentBridgeIndex + 1) + "/" + pendingBridges.length;
    bridgeActionLabel.innerText = label;
    bridgeActionsDiv.style.display = "block";
    setMessage("Que faire avec ce pont ?");
}

// quand le joueur choisit retirer ou tourner
function bridgeAction(action) {
    let bridge = pendingBridges[currentBridgeIndex];
    handleBridgeAction(bridge[0], bridge[1], bridge[2], bridge[3], action);

    currentBridgeIndex++;
    drawBoard();

    if (currentBridgeIndex < pendingBridges.length) {
        // Encore des ponts à traiter
        showBridgeAction();
    } else {
        // Plus de ponts, fin du tour
        bridgeActionsDiv.style.display = "none";
        finishTurn();
    }
}

// fin d'un tour
function finishTurn() {
    // Vérifier les éliminations
    checkAllEliminations();

    // Vérifier si le jeu est fini
    if (isGameOver()) {
        let winner = getWinner();
        setMessage("Partie terminée ! Le gagnant est : " + COLOR_NAMES[winner] + " !");
        drawBoard();
        updateInfoBar();
        return;
    }

    // Passer au joueur suivant
    nextPlayer();

    let player = currentPlayer();

    // vérifier si le joueur peut bouger
    if (!canPlayerMove(player)) {
        setMessage(COLOR_NAMES[player] + " ne peut pas bouger. Il peut retirer un pont.");
        // Pour simplifier, on saute son tour pour l'instant
        // TODO: permettre de retirer un pont au choix
        nextPlayer();
        player = currentPlayer();
    }

    updateInfoBar();
    drawBoard();

    if (player === "green" || player === "yellow") {
        setMessage("C'est à " + COLOR_NAMES[player] + " de jouer. Cliquez sur un de vos lutins.");
    } else {
        setMessage("C'est au tour de l'IA (" + COLOR_NAMES[player] + ")...");
        // TODO: brancher l'IA Prolog ici
        // Pour l'instant, on fait un coup aléatoire après un petit délai
        setTimeout(handleAIMove, 500);
    }
}

// mouvement aléatoire de l'IA (temporaire, en attendant le vrai module Prolog)
function handleAIMove() {
    let player = currentPlayer();

    // si l'IA ne peut pas bouger, on saute son tour
    if (!canPlayerMove(player)) {
        nextPlayer();
        updateInfoBar();
        drawBoard();
        let next = currentPlayer();
        if (next === "green" || next === "yellow") {
            setMessage("C'est à " + COLOR_NAMES[next] + " de jouer. Cliquez sur un de vos lutins.");
        } else {
            setTimeout(handleAIMove, 500);
        }
        return;
    }

    let moved = false;
    for (let i = 0; i < lutins[player].length && !moved; i++) {
        let dirs = ["up", "down", "left", "right"];
        dirs.sort(() => Math.random() - 0.5);
        for (let dir of dirs) {
            let result = moveLutin(i, dir);
            if (result !== null) {
                for (let bridge of result) {
                    handleBridgeAction(bridge[0], bridge[1], bridge[2], bridge[3], "remove");
                }
                moved = true;
                break;
            }
        }
    }

    checkAllEliminations();
    if (isGameOver()) {
        let winner = getWinner();
        setMessage("Partie terminée ! Le gagnant est : " + COLOR_NAMES[winner] + " !");
        drawBoard();
        updateInfoBar();
        return;
    }

    nextPlayer();
    drawBoard();
    updateInfoBar();

    let next = currentPlayer();
    if (next === "green" || next === "yellow") {
        setMessage("C'est à " + COLOR_NAMES[next] + " de jouer. Cliquez sur un de vos lutins.");
    } else {
        setTimeout(handleAIMove, 500);
    }
}



// MISE À JOUR DE L'INTERFACE

function setMessage(msg) {
    messageBox.innerText = msg;
}

function updateInfoBar() {
    let player = currentPlayer();
    infoPlayer.innerText = COLOR_NAMES[player];
    infoPlayer.style.backgroundColor = COLOR_MAP[player];
    infoPlayer.style.color = (player === "yellow") ? "#333" : "white";

    infoPhase.innerText = (phase === "placement") ? "Placement" : "Mouvement";
}


// LANCEMENT

initGame();
drawBoard();
updateInfoBar();
setMessage("Cliquez sur une case pour placer un lutin vert.");