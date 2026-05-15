// board.js — Affichage du plateau et interactions
// Coordonnees : 0-5 (coin inferieur gauche = origine)

const canvas = document.getElementById("board-canvas");
const ctx = canvas.getContext("2d");
const infoPlayer = document.getElementById("current-player");
const infoPhase = document.getElementById("current-phase");
const messageBox = document.getElementById("message-box");
const directionButtons = document.getElementById("direction-buttons");

const PADDING = 50;
const CELL_SIZE = (canvas.width - 2 * PADDING) / (BOARD_SIZE - 1);
const DOT_RADIUS = 12;
const LUTIN_RADIUS = 16;
const BRIDGE_WIDTH = 4;

const COLOR_MAP = {green: "#27ae60", blue: "#2980b9", yellow: "#f1c40f", red: "#e74c3c"};
const COLOR_NAMES = {green: "Vert", blue: "Bleu", yellow: "Jaune", red: "Rouge"};

// Correspondance JS (0-5) <-> Prolog (0-5) — meme coordonnees !
const JS_TO_PROLOG_COLOR = {green: "vert", blue: "bleu", yellow: "jaune", red: "rouge"};
const JS_TO_PROLOG_PHASE = {placement: "placement", movement: "mouvement"};


// ============================================================
// WEBSOCKET VERS SWI-PROLOG
// ============================================================

let ws = null;
let wsConnected = false;
let wsPendingCallback = null;

function connectWebSocket() {
    try {
        ws = new WebSocket("ws://localhost:8080/ai");
        ws.onopen = function () {
            wsConnected = true;
            console.log("Connecte au serveur SWI-Prolog !");
        };
        ws.onclose = function () {
            wsConnected = false;
            console.warn("Serveur SWI-Prolog deconnecte. Reconnexion dans 3s...");
            setTimeout(connectWebSocket, 3000);
        };
        ws.onerror = function () {
            wsConnected = false;
        };
        ws.onmessage = function (event) {
            try {
                const data = JSON.parse(event.data);
                if (wsPendingCallback) {
                    wsPendingCallback(data);
                    wsPendingCallback = null;
                }
            } catch (e) {
                console.error("Erreur parsing reponse Prolog:", e);
                if (wsPendingCallback) {
                    wsPendingCallback(null);
                    wsPendingCallback = null;
                }
            }
        };
    } catch (e) {
        console.warn("Serveur Prolog non disponible - fallback aleatoire actif");
    }
}

connectWebSocket();


// ============================================================
// CONSTRUCTION DE L'ETAT PROLOG
// Coordonnees identiques JS et Prolog : 0-5
// ============================================================

function buildPrologState() {
    let joueur = JS_TO_PROLOG_COLOR[currentPlayer()];

    let lutinsList = [];
    for (let color of COLORS) {
        let pcolor = JS_TO_PROLOG_COLOR[color];
        for (let pos of lutins[color])
            lutinsList.push("lutin(" + pcolor + "," + pos[0] + "," + pos[1] + ")");
    }

    let pontsList = [];
    for (let key of bridges) {
        let parts = key.split("-");
        let c1 = parts[0].split(","), c2 = parts[1].split(",");
        pontsList.push("pont(" + c1[0] + "," + c1[1] + "," + c2[0] + "," + c2[1] + ")");
    }

    let elims = [];
    for (let color of COLORS)
        if (eliminated[color]) elims.push(JS_TO_PROLOG_COLOR[color]);

    return "etat(" + joueur
        + ",[" + lutinsList.join(",") + "]"
        + ",[" + pontsList.join(",") + "]"
        + ",[" + elims.join(",") + "]"
        + "," + JS_TO_PROLOG_PHASE[phase] + ")";
}


// ============================================================
// ETAT INTERACTION
// ============================================================

let selectedLutin = null;
let bridgePickMode = false;
let bridgePickBlockedOnly = false;
let selectedBridgeKey = null;
let rotationArrows = [];
let crossedBridgesList = [];
let currentCrossedIndex = 0;


// ============================================================
// DESSIN
// ============================================================

function toPixelX(x) {
    return PADDING + x * CELL_SIZE;
}

function toPixelY(y) {
    return canvas.height - PADDING - y * CELL_SIZE;
}

function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f5f0e1";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawBridges();
    drawDots();
    drawLutins();
    drawLabels();
    if (bridgePickMode) {
        if (bridgePickBlockedOnly) highlightAllBridges();
        else if (selectedBridgeKey) {
            highlightSelectedBridge(selectedBridgeKey);
            drawRotationArrows();
        }
    }
}

function drawBridges() {
    ctx.strokeStyle = "#8B4513";
    ctx.lineWidth = BRIDGE_WIDTH;
    ctx.lineCap = "round";
    for (let key of bridges) {
        let parts = key.split("-");
        let c1 = parts[0].split(","), c2 = parts[1].split(",");
        let x1 = parseInt(c1[0]), y1 = parseInt(c1[1]);
        let x2 = parseInt(c2[0]), y2 = parseInt(c2[1]);
        ctx.beginPath();
        ctx.moveTo(toPixelX(x1), toPixelY(y1));
        ctx.lineTo(toPixelX(x2), toPixelY(y2));
        ctx.stroke();
        let mx = (toPixelX(x1) + toPixelX(x2)) / 2;
        let my = (toPixelY(y1) + toPixelY(y2)) / 2;
        ctx.fillStyle = "#5a2d00";
        ctx.font = "bold 11px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText((x1 === x2) ? "↑" : "→", mx, my);
    }
    ctx.textBaseline = "alphabetic";
}

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

function drawLutins() {
    for (let color of COLORS) {
        for (let i = 0; i < lutins[color].length; i++) {
            let pos = lutins[color][i];
            let px = toPixelX(pos[0]), py = toPixelY(pos[1]);
            ctx.beginPath();
            ctx.arc(px, py, LUTIN_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = eliminated[color] ? "#888" : COLOR_MAP[color];
            ctx.fill();
            ctx.strokeStyle = eliminated[color] ? "#555" : "white";
            ctx.lineWidth = 2;
            ctx.stroke();
            if (eliminated[color]) {
                ctx.strokeStyle = "#333";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(px - 8, py - 8);
                ctx.lineTo(px + 8, py + 8);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(px + 8, py - 8);
                ctx.lineTo(px - 8, py + 8);
                ctx.stroke();
            }
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

function drawLabels() {
    ctx.fillStyle = "#333";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    for (let i = 0; i < BOARD_SIZE; i++) {
        ctx.fillText(i, toPixelX(i), canvas.height - 15);
        ctx.fillText(i, 15, toPixelY(i) + 5);
    }
}


// ============================================================
// HIGHLIGHT
// ============================================================

function highlightAllBridges() {
    ctx.strokeStyle = "#e74c3c";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    for (let key of bridges) {
        let parts = key.split("-");
        let c1 = parts[0].split(","), c2 = parts[1].split(",");
        ctx.beginPath();
        ctx.moveTo(toPixelX(parseInt(c1[0])), toPixelY(parseInt(c1[1])));
        ctx.lineTo(toPixelX(parseInt(c2[0])), toPixelY(parseInt(c2[1])));
        ctx.stroke();
    }
}

function highlightSelectedBridge(key) {
    let parts = key.split("-");
    let c1 = parts[0].split(","), c2 = parts[1].split(",");
    ctx.strokeStyle = "#f1c40f";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(toPixelX(parseInt(c1[0])), toPixelY(parseInt(c1[1])));
    ctx.lineTo(toPixelX(parseInt(c2[0])), toPixelY(parseInt(c2[1])));
    ctx.stroke();
}

function drawRotationArrows() {
    for (let arrow of rotationArrows) {
        let ax = toPixelX(arrow.ax), ay = toPixelY(arrow.ay);
        let nx = toPixelX(arrow.nx), ny = toPixelY(arrow.ny);
        let mx = (ax + nx) / 2, my = (ay + ny) / 2;
        ctx.strokeStyle = "rgba(46,204,113,0.6)";
        ctx.lineWidth = 6;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(nx, ny);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(mx, my, 14, 0, Math.PI * 2);
        ctx.fillStyle = "#2ecc71";
        ctx.fill();
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "white";
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(arrow.label, mx, my);
    }
    ctx.textBaseline = "alphabetic";
}

function pixelToArrow(mouseX, mouseY) {
    for (let arrow of rotationArrows) {
        let mx = (toPixelX(arrow.ax) + toPixelX(arrow.nx)) / 2;
        let my = (toPixelY(arrow.ay) + toPixelY(arrow.ny)) / 2;
        if (Math.sqrt((mouseX - mx) ** 2 + (mouseY - my) ** 2) < 18) return arrow;
    }
    return null;
}


// ============================================================
// DETECTION
// ============================================================

function pixelToCell(mouseX, mouseY) {
    let bestX = -1, bestY = -1, bestDist = Infinity;
    for (let x = 0; x < BOARD_SIZE; x++) {
        for (let y = 0; y < BOARD_SIZE; y++) {
            let dist = Math.sqrt((mouseX - toPixelX(x)) ** 2 + (mouseY - toPixelY(y)) ** 2);
            if (dist < bestDist && dist < CELL_SIZE / 2) {
                bestDist = dist;
                bestX = x;
                bestY = y;
            }
        }
    }
    return bestX === -1 ? null : {x: bestX, y: bestY};
}

function pixelToBridge(mouseX, mouseY) {
    let bestKey = null, bestDist = Infinity;
    for (let key of bridges) {
        let parts = key.split("-");
        let c1 = parts[0].split(","), c2 = parts[1].split(",");
        let px1 = toPixelX(parseInt(c1[0])), py1 = toPixelY(parseInt(c1[1]));
        let px2 = toPixelX(parseInt(c2[0])), py2 = toPixelY(parseInt(c2[1]));
        let dx = px2 - px1, dy = py2 - py1, lenSq = dx * dx + dy * dy;
        let t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((mouseX - px1) * dx + (mouseY - py1) * dy) / lenSq));
        let dist = Math.sqrt((mouseX - (px1 + t * dx)) ** 2 + (mouseY - (py1 + t * dy)) ** 2);
        if (dist < bestDist && dist < 12) {
            bestDist = dist;
            bestKey = key;
        }
    }
    return bestKey;
}


// ============================================================
// ROTATION
// ============================================================

function canRotate(ax, ay, x1, y1, x2, y2, direction) {
    let isVertical = (x1 === x2);
    let newDx = isVertical ? (direction === "right" ? 1 : -1) : 0;
    let newDy = isVertical ? 0 : (direction === "right" ? 1 : -1);
    let newX2 = ax + newDx, newY2 = ay + newDy;
    if (newX2 < 0 || newX2 >= BOARD_SIZE || newY2 < 0 || newY2 >= BOARD_SIZE) return false;
    let newKey = bridgeKey(ax, ay, newX2, newY2);
    if (newKey !== bridgeKey(x1, y1, x2, y2) && bridges.has(newKey)) return false;
    return true;
}

function showBridgePickActions(key) {
    let parts = key.split("-");
    let c1 = parts[0].split(","), c2 = parts[1].split(",");
    let x1 = parseInt(c1[0]), y1 = parseInt(c1[1]);
    let x2 = parseInt(c2[0]), y2 = parseInt(c2[1]);
    let isVertical = (x1 === x2);
    let info = bridgePickBlockedOnly ? "" : ` (${currentCrossedIndex + 1}/${crossedBridgesList.length})`;

    document.getElementById("bridge-pick-label").innerText =
        `Pont (${x1},${y1})-(${x2},${y2}) ${isVertical ? "vertical ↑" : "horizontal →"}${info}`;
    document.getElementById("btn-pick-remove").style.display = "inline-block";

    rotationArrows = [];
    if (!bridgePickBlockedOnly) {
        let labelLeft = isVertical ? "←" : "↓";
        let labelRight = isVertical ? "→" : "↑";
        let combos = [
            {ax: x1, ay: y1, dir: "left", action: "rotate1_left", label: labelLeft},
            {ax: x1, ay: y1, dir: "right", action: "rotate1_right", label: labelRight},
            {ax: x2, ay: y2, dir: "left", action: "rotate2_left", label: labelLeft},
            {ax: x2, ay: y2, dir: "right", action: "rotate2_right", label: labelRight},
        ];
        for (let c of combos) {
            if (canRotate(c.ax, c.ay, x1, y1, x2, y2, c.dir)) {
                let newDx = isVertical ? (c.dir === "right" ? 1 : -1) : 0;
                let newDy = isVertical ? 0 : (c.dir === "right" ? 1 : -1);
                rotationArrows.push({
                    ax: c.ax, ay: c.ay,
                    nx: c.ax + newDx, ny: c.ay + newDy,
                    action: c.action, label: c.label
                });
            }
        }
        let lbl = document.getElementById("bridge-pick-label");
        lbl.innerText += rotationArrows.length === 0 ? " — rotation impossible" : " — cliquez une fleche verte";
    }

    document.getElementById("btn-pick-rotate1-ccw").style.display = "none";
    document.getElementById("btn-pick-rotate1-cw").style.display = "none";
    document.getElementById("btn-pick-rotate2-ccw").style.display = "none";
    document.getElementById("btn-pick-rotate2-cw").style.display = "none";
    document.getElementById("bridge-pick-actions").style.display = "block";
    drawBoard();
}

function showBridgePickMode() {
    bridgePickBlockedOnly = true;
    bridgePickMode = true;
    selectedBridgeKey = null;
    rotationArrows = [];
    document.getElementById("bridge-pick-actions").style.display = "none";
    drawBoard();
    setMessage("Vous etes bloque. Cliquez sur un pont pour le supprimer.");
}

function showNextCrossedBridge() {
    if (currentCrossedIndex >= crossedBridgesList.length) {
        finishTurn();
        return;
    }
    let bridge = crossedBridgesList[currentCrossedIndex];
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
        finishTurn();
    } else {
        currentCrossedIndex++;
        showNextCrossedBridge();
    }
}


// ============================================================
// GESTIONNAIRE DE CLIC
// ============================================================

canvas.addEventListener("click", function (e) {
    let rect = canvas.getBoundingClientRect();
    let mouseX = e.clientX - rect.left, mouseY = e.clientY - rect.top;

    if (bridgePickMode) {
        if (bridgePickBlockedOnly) {
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
            if (selectedBridgeKey && rotationArrows.length > 0) {
                let arrow = pixelToArrow(mouseX, mouseY);
                if (arrow) {
                    applyBridgePick(arrow.action);
                    return;
                }
            }
        }
        return;
    }

    let cell = pixelToCell(mouseX, mouseY);
    if (!cell) return;
    let player = currentPlayer();
    if (player !== "green" && player !== "yellow") {
        setMessage("C'est au tour de l'IA (" + COLOR_NAMES[player] + "). Patientez...");
        return;
    }
    if (phase === "placement") handlePlacement(cell.x, cell.y);
    else if (phase === "movement") handleMovementClick(cell.x, cell.y);
});


// ============================================================
// PLACEMENT
// ============================================================

function handlePlacement(x, y) {
    if (isOccupied(x, y)) {
        setMessage("Case deja occupee !");
        return;
    }
    let ok = placeLutin(x, y);
    if (ok) {
        drawBoard();
        updateInfoBar();
        if (phase === "movement") {
            startPlayerTurn();
        } else {
            let next = currentPlayer();
            if (next === "green" || next === "yellow")
                setMessage("Cliquez sur une case pour placer un lutin " + COLOR_NAMES[next].toLowerCase() + ".");
            else handleAIPlacement();
        }
    }
}

function handleAIPlacement() {
    let player = currentPlayer();
    while (player === "blue" || player === "red") {
        let placed = false, attempts = 0;
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
        if (phase === "movement") {
            startPlayerTurn();
            return;
        }
    }
    setMessage("Cliquez sur une case pour placer un lutin " + COLOR_NAMES[currentPlayer()].toLowerCase() + ".");
}


// ============================================================
// MOUVEMENT
// ============================================================

function handleMovementClick(x, y) {
    let player = currentPlayer();
    for (let i = 0; i < lutins[player].length; i++) {
        let pos = lutins[player][i];
        if (pos[0] === x && pos[1] === y) {
            selectedLutin = {color: player, index: i, x, y};
            drawBoard();
            setMessage("Lutin selectionne en (" + x + "," + y + "). Choisissez une direction.");
            directionButtons.style.display = "block";
            return;
        }
    }
    setMessage("Cliquez sur un de vos lutins " + COLOR_NAMES[player].toLowerCase() + ".");
}

function chooseDirection(dir) {
    if (!selectedLutin) return;
    let result = moveLutin(selectedLutin.index, dir);
    if (result === null) {
        setMessage("Impossible d'aller dans cette direction !");
        return;
    }
    directionButtons.style.display = "none";
    selectedLutin = null;
    drawBoard();
    if (result.length === 0) {
        finishTurn();
        return;
    }
    crossedBridgesList = result;
    currentCrossedIndex = 0;
    showNextCrossedBridge();
}

function cancelSelection() {
    selectedLutin = null;
    directionButtons.style.display = "none";
    setMessage("Selection annulee. Cliquez sur un de vos lutins.");
    drawBoard();
}


// ============================================================
// FIN DE TOUR
// ============================================================

function finishTurn() {
    crossedBridgesList = [];
    currentCrossedIndex = 0;
    checkAllEliminations();
    if (isGameOver()) {
        let winner = getWinner();
        setMessage("Partie terminee ! Gagnant : " + COLOR_NAMES[winner] + " !");
        drawBoard();
        updateInfoBar();
        return;
    }
    nextPlayer();
    startPlayerTurn();
}

function startPlayerTurn() {
    let player = currentPlayer();
    updateInfoBar();
    drawBoard();
    if (player === "green" || player === "yellow") {
        if (!canPlayerMove(player)) {
            setMessage(COLOR_NAMES[player] + " est bloque. Cliquez sur un pont pour le supprimer.");
            showBridgePickMode();
        } else {
            setMessage("C'est a " + COLOR_NAMES[player] + " de jouer. Cliquez sur un lutin.");
        }
    } else {
        setMessage("C'est au tour de l'IA (" + COLOR_NAMES[player] + ")...");
        setTimeout(handleAIMove, 500);
    }
}


// ============================================================
// IA — WebSocket SWI-Prolog (intelligent) ou fallback aleatoire
// ============================================================

function jouerAleatoire(player) {
    let indices = [...Array(lutins[player].length).keys()].sort(() => Math.random() - 0.5);
    for (let i of indices) {
        let dirs = ["up", "down", "left", "right"].sort(() => Math.random() - 0.5);
        for (let dir of dirs) {
            let result = moveLutin(i, dir);
            if (result !== null) {
                for (let b of result){
                    if (bridgeExists(b[0], b[1], b[2], b[3])) {
                        removeBridge(b[0], b[1], b[2], b[3]);
                        
                    }
                }
                drawBoard();
                finishTurn();
                return;
            }
        }
    }
    drawBoard();
    finishTurn();
}

function appliquerCoupProlog(coupStr, player) {
    try {
        // Cas joueur bloqué
        let matchPont = coupStr.match(/retirer_pont_libre\(pont\((\d+),(\d+),(\d+),(\d+)\)\)/);
        if (matchPont) {
            let x1 = parseInt(matchPont[1]), y1 = parseInt(matchPont[2]);
            let x2 = parseInt(matchPont[3]), y2 = parseInt(matchPont[4]);
            removeBridge(x1, y1, x2, y2);
            checkAllEliminations();
            drawBoard();
            finishTurn();
            return true;
        }

        // Cas mouvement normal
        let match = coupStr.match(/mouvement\((\d+),(\d+),(\w+),/);
        if (!match) {
            console.warn("Format coup invalide:", coupStr);
            return false;
        }
        let jsX = parseInt(match[1]);
        let jsY = parseInt(match[2]);
        let dir = match[3];
        let idx = lutins[player].findIndex(p => p[0] === jsX && p[1] === jsY);
        if (idx === -1) {
            console.warn("Lutin introuvable en", jsX, jsY);
            return false;
        }
        let result = moveLutin(idx, dir);
        if (result === null) return false;
        for (let b of result){
            if (bridgeExists(b[0], b[1], b[2], b[3])) {
                removeBridge(b[0], b[1], b[2], b[3]);
                
            }
        }
        drawBoard();
        finishTurn();
        return true;
    } catch (e) {
        console.error("Erreur appliquerCoupProlog:", e);
        return false;
    }
}
function handleAIMove() {
    let player = currentPlayer();

    if (wsConnected && ws) {
        let heuristique = (player === "blue") ? "h1" : "h2";
        let msg = JSON.stringify({
            etat: buildPrologState(),
            profondeur: 2,
            heuristique: heuristique
        });
        let timeout = setTimeout(() => {
            wsPendingCallback = null;
            console.warn("Timeout SWI-Prolog -> fallback aleatoire");
            jouerAleatoire(player);
        }, 10000);
        wsPendingCallback = function (data) {
            clearTimeout(timeout);
            if (data && data.ok && data.coup && appliquerCoupProlog(data.coup, player)) return;
            jouerAleatoire(player);
        };
        ws.send(msg);
    } else {
        jouerAleatoire(player);
    }
}


// ============================================================
// UI
// ============================================================

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


// ============================================================
// SESSION IA — tau-Prolog (conseil uniquement)
// ============================================================

let aiSession = null;

function initAISession(prologCode) {
    aiSession = pl.create(1000000);
    let result = aiSession.consult(prologCode);
    if (result !== true) {
        console.error("Erreur chargement ai_bot:", pl.format_answer(result));
        aiSession = null;
    } else {
        console.log("Session IA tau-Prolog initialisee (conseil uniquement).");
    }
}

function prologListToArray(list) {
    let r = [], cur = list;
    while (cur && cur.args && cur.args.length === 2) {
        r.push(cur.args[0]);
        cur = cur.args[1];
    }
    return r;
}

// Formate le conseil IA en francais
// Affiche TOUS les ponts traverses avec conseil pour chacun
function formatCoupEnFrancais(coup) {
    if (!coup) return "Je n'ai pas pu calculer un conseil.";
    try {
        let startX = coup.args[0].value;
        let startY = coup.args[1].value;
        let dir = coup.args[2].id || coup.args[2].value;
        let pts = prologListToArray(coup.args[3]);

        if (pts.length === 0) return "Aucun coup valide trouve (le lutin ne peut pas bouger).";

        // Calculer la case d'arrivee selon la direction et les ponts traverses
        // Les ponts sont en ordre lexicographique, pas en ordre de traversee
        // On utilise la direction pour savoir quel bout du pont est l'arrivee
        let dx = 0, dy = 0;
        if (dir === "up") {
            dy = 1;
        }
        if (dir === "down") {
            dy = -1;
        }
        if (dir === "right") {
            dx = 1;
        }
        if (dir === "left") {
            dx = -1;
        }

        // Calculer la case d'arrivee en simulant la glissade
        let endX = startX, endY = startY;
        for (let p of pts) {
            endX += dx;
            endY += dy;
        }

        // Verifier que le lutin a vraiment bouge
        if (endX === startX && endY === startY) {
            return "Le conseil calcule ne produit pas de mouvement. Essayez de jouer d'abord quelques coups.";
        }

        let msg = "Le lutin sur la case (" + startX + "," + startY + ") vers la case (" + endX + "," + endY + ").\n";

        for (let i = 0; i < pts.length; i++) {
            let p = pts[i];
            let px1 = p.args[0].value, py1 = p.args[1].value;
            let px2 = p.args[2].value, py2 = p.args[3].value;
            msg += "Pont (" + px1 + "," + py1 + ")--(" + px2 + "," + py2 + ") : ";
            if (i === 0) {
                msg += "je vous conseille de le retirer.\n";
            } else {
                msg += "vous pouvez le retirer ou le tourner.\n";
            }
        }
        return msg;
    } catch (e) {
        console.error("Erreur formatCoupEnFrancais:", e);
        return "Impossible de formuler le conseil.";
    }
}

// Demande un conseil a l'IA et l'affiche dans le chat
function demanderConseilIA() {
    if (phase !== "movement") {
        afficherMessageBot("Nous sommes encore en phase de placement !");
        return;
    }
    if (currentPlayer() !== "green" && currentPlayer() !== "yellow") {
        afficherMessageBot("C'est au tour de l'IA. Je peux conseiller uniquement les joueurs humains.");
        return;
    }
    if (!aiSession) {
        afficherMessageBot("Session IA non disponible.");
        return;
    }
    let stateStr = buildPrologState();
    aiSession.query("choisir_coup_shallow(" + stateStr + ", 1, h1, Coup).");
    aiSession.answer(function (rep) {
        if (rep && rep !== false && typeof rep.lookup === "function") {
            afficherMessageBot(formatCoupEnFrancais(rep.lookup("Coup")));
        } else {
            afficherMessageBot("Je n'ai pas trouve de coup valide pour le moment.");
        }
    });
}

// Affiche un message dans le chat bot
function afficherMessageBot(texte) {
    const texts = document.getElementById("bot-texts");
    if (!texts) return;
    let p = document.createElement("p");
    p.classList.add("bot-msg");
    p.innerText = "PBot : " + texte;
    p.style.whiteSpace = "pre-line"; // pour les sauts de ligne
    texts.appendChild(p);
    texts.scrollTop = texts.scrollHeight;
}


// ============================================================
// LANCEMENT
// ============================================================

initGame();
drawBoard();
updateInfoBar();
setMessage("Cliquez sur une case pour placer un lutin vert.");