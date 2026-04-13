// board.js — Affichage du plateau et interactions

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

const COLOR_MAP = { green: "#27ae60", blue: "#2980b9", yellow: "#f1c40f", red: "#e74c3c" };
const COLOR_NAMES = { green: "Vert", blue: "Bleu", yellow: "Jaune", red: "Rouge" };

// État interaction
let selectedLutin = null;

// Mode sélection de pont
let bridgePickMode = false;
let bridgePickBlockedOnly = false; // true = bloqué (n'importe quel pont), false = ponts traversés
let selectedBridgeKey = null;
let rotationArrows = [];

// Ponts traversés pendant la glissade
let crossedBridgesList = [];
let currentCrossedIndex = 0;


// ============================================================
// DESSIN
// ============================================================

function toPixelX(x) { return PADDING + x * CELL_SIZE; }
function toPixelY(y) { return canvas.height - PADDING - y * CELL_SIZE; }

function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f5f0e1";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawBridges();
    drawDots();
    drawLutins();
    drawLabels();
    if (bridgePickMode) {
        if (bridgePickBlockedOnly) {
            highlightAllBridges();
        } else if (selectedBridgeKey) {
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
        // Flèche directionnelle
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
                ctx.strokeStyle = "#333"; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(px-8,py-8); ctx.lineTo(px+8,py+8); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(px+8,py-8); ctx.lineTo(px-8,py+8); ctx.stroke();
            }
            if (selectedLutin && selectedLutin.color === color && selectedLutin.index === i) {
                ctx.beginPath();
                ctx.arc(px, py, LUTIN_RADIUS + 4, 0, Math.PI * 2);
                ctx.strokeStyle = "white"; ctx.lineWidth = 3;
                ctx.setLineDash([5, 3]); ctx.stroke(); ctx.setLineDash([]);
            }
        }
    }
}

function drawLabels() {
    ctx.fillStyle = "#333"; ctx.font = "14px Arial"; ctx.textAlign = "center";
    for (let i = 0; i < BOARD_SIZE; i++) {
        ctx.fillText(i, toPixelX(i), canvas.height - 15);
        ctx.fillText(i, 15, toPixelY(i) + 5);
    }
}


// ============================================================
// HIGHLIGHT
// ============================================================

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

function highlightSelectedBridge(key) {
    let parts = key.split("-");
    let c1 = parts[0].split(","), c2 = parts[1].split(",");
    ctx.strokeStyle = "#f1c40f"; ctx.lineWidth = 8; ctx.lineCap = "round";
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
        ctx.strokeStyle = "rgba(46,204,113,0.6)"; ctx.lineWidth = 6;
        ctx.setLineDash([6, 4]);
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(nx, ny); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(mx, my, 14, 0, Math.PI * 2);
        ctx.fillStyle = "#2ecc71"; ctx.fill();
        ctx.strokeStyle = "white"; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = "white"; ctx.font = "bold 14px Arial";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(arrow.label, mx, my);
    }
    ctx.textBaseline = "alphabetic";
}

function pixelToArrow(mouseX, mouseY) {
    for (let arrow of rotationArrows) {
        let mx = (toPixelX(arrow.ax) + toPixelX(arrow.nx)) / 2;
        let my = (toPixelY(arrow.ay) + toPixelY(arrow.ny)) / 2;
        if (Math.sqrt((mouseX-mx)**2 + (mouseY-my)**2) < 18) return arrow;
    }
    return null;
}


// ============================================================
// DÉTECTION
// ============================================================

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

function pixelToBridge(mouseX, mouseY) {
    let bestKey = null, bestDist = Infinity;
    for (let key of bridges) {
        let parts = key.split("-");
        let c1 = parts[0].split(","), c2 = parts[1].split(",");
        let px1 = toPixelX(parseInt(c1[0])), py1 = toPixelY(parseInt(c1[1]));
        let px2 = toPixelX(parseInt(c2[0])), py2 = toPixelY(parseInt(c2[1]));
        let dx = px2-px1, dy = py2-py1, lenSq = dx*dx + dy*dy;
        let t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((mouseX-px1)*dx + (mouseY-py1)*dy)/lenSq));
        let dist = Math.sqrt((mouseX-(px1+t*dx))**2 + (mouseY-(py1+t*dy))**2);
        if (dist < bestDist && dist < 12) { bestDist = dist; bestKey = key; }
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
    let currentKey = bridgeKey(x1, y1, x2, y2);
    let newKey = bridgeKey(ax, ay, newX2, newY2);
    if (newKey !== currentKey && bridges.has(newKey)) return false;
    return true;
}

function showBridgePickActions(key) {
    let parts = key.split("-");
    let c1 = parts[0].split(","), c2 = parts[1].split(",");
    let x1 = parseInt(c1[0]), y1 = parseInt(c1[1]), x2 = parseInt(c2[0]), y2 = parseInt(c2[1]);
    let isVertical = (x1 === x2);
    let total = crossedBridgesList.length;
    let current = currentCrossedIndex + 1;

    let info = bridgePickBlockedOnly ? "" : ` (${current}/${total})`;
    document.getElementById("bridge-pick-label").innerText =
        `Pont (${x1},${y1})–(${x2},${y2}) ${isVertical ? "vertical ↑" : "horizontal →"}${info}`;
    document.getElementById("btn-pick-remove").style.display = "inline-block";

    rotationArrows = [];

    if (!bridgePickBlockedOnly) {
        function rotDest(ax, ay, dir) {
            let newDx = isVertical ? (dir === "right" ? 1 : -1) : 0;
            let newDy = isVertical ? 0 : (dir === "right" ? 1 : -1);
            return { nx: ax + newDx, ny: ay + newDy };
        }
        let labelLeft = isVertical ? "←" : "↓";
        let labelRight = isVertical ? "→" : "↑";
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
        if (rotationArrows.length === 0) {
            document.getElementById("bridge-pick-label").innerText += " — rotation impossible";
        } else {
            document.getElementById("bridge-pick-label").innerText += " — cliquez une flèche verte";
        }
    }

    document.getElementById("btn-pick-rotate1-ccw").style.display = "none";
    document.getElementById("btn-pick-rotate1-cw").style.display  = "none";
    document.getElementById("btn-pick-rotate2-ccw").style.display = "none";
    document.getElementById("btn-pick-rotate2-cw").style.display  = "none";
    document.getElementById("bridge-pick-actions").style.display = "block";
    drawBoard();
}

// Mode bloqué → n'importe quel pont, suppression seulement
function showBridgePickMode() {
    bridgePickBlockedOnly = true;
    bridgePickMode = true;
    selectedBridgeKey = null;
    rotationArrows = [];
    document.getElementById("bridge-pick-actions").style.display = "none";
    drawBoard();
    setMessage("Vous êtes bloqué. Cliquez sur un pont pour le supprimer.");
}

// Après mouvement → traiter les ponts traversés un par un
function showNextCrossedBridge() {
    if (currentCrossedIndex >= crossedBridgesList.length) {
        finishTurn();
        return;
    }
    let bridge = crossedBridgesList[currentCrossedIndex];
    // Si le pont n'existe plus (déjà supprimé/tourné), passer au suivant
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

// Applique l'action sur le pont sélectionné
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
            // Mode bloqué : cliquer sur n'importe quel pont
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
            // Mode pont traversé : cliquer sur une flèche de rotation
            if (selectedBridgeKey && rotationArrows.length > 0) {
                let arrow = pixelToArrow(mouseX, mouseY);
                if (arrow) { applyBridgePick(arrow.action); return; }
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
    if (isOccupied(x, y)) { setMessage("Case déjà occupée !"); return; }
    let ok = placeLutin(x, y);
    if (ok) {
        drawBoard(); updateInfoBar();
        if (phase === "movement") {
            startPlayerTurn();
        } else {
            let next = currentPlayer();
            if (next === "green" || next === "yellow") {
                setMessage("Cliquez sur une case pour placer un lutin " + COLOR_NAMES[next].toLowerCase() + ".");
            } else {
                handleAIPlacement();
            }
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
// MOUVEMENT
// ============================================================

function handleMovementClick(x, y) {
    let player = currentPlayer();
    for (let i = 0; i < lutins[player].length; i++) {
        let pos = lutins[player][i];
        if (pos[0] === x && pos[1] === y) {
            selectedLutin = { color: player, index: i, x, y };
            drawBoard();
            setMessage("Lutin sélectionné en (" + x + "," + y + "). Choisissez une direction.");
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
        setMessage("Impossible d'aller dans cette direction ! Essayez une autre.");
        return;
    }
    directionButtons.style.display = "none";
    selectedLutin = null;
    drawBoard();

    if (result.length === 0) {
        // Aucun pont traversé → fin du tour directement
        finishTurn();
        return;
    }

    // Traiter les ponts traversés un par un
    crossedBridgesList = result;
    currentCrossedIndex = 0;
    showNextCrossedBridge();
}

function cancelSelection() {
    selectedLutin = null;
    directionButtons.style.display = "none";
    setMessage("Sélection annulée. Cliquez sur un de vos lutins.");
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
        setMessage("Partie terminée ! Le gagnant est : " + COLOR_NAMES[winner] + " !");
        drawBoard(); updateInfoBar(); return;
    }
    nextPlayer();
    startPlayerTurn();
}

function startPlayerTurn() {
    let player = currentPlayer();
    updateInfoBar(); drawBoard();
    if (player === "green" || player === "yellow") {
        if (!canPlayerMove(player)) {
            setMessage(COLOR_NAMES[player] + " ne peut bouger aucun lutin. Cliquez sur un pont pour le supprimer.");
            showBridgePickMode();
        } else {
            setMessage("C'est à " + COLOR_NAMES[player] + " de jouer. Cliquez sur un de vos lutins.");
        }
    } else {
        setMessage("C'est au tour de l'IA (" + COLOR_NAMES[player] + ")...");
        setTimeout(handleAIMove, 500);
    }
}


// ============================================================
// IA TEMPORAIRE
// ============================================================

function handleAIMove() {
    let player = currentPlayer();
    if (!canPlayerMove(player)) {
        let allB = getAllBridges();
        if (allB.length > 0) {
            let b = allB[Math.floor(Math.random() * allB.length)];
            removeBridge(b[0], b[1], b[2], b[3]);
        }
        drawBoard(); finishTurn(); return;
    }
    for (let i = 0; i < lutins[player].length; i++) {
        let dirs = ["up", "down", "left", "right"];
        dirs.sort(() => Math.random() - 0.5);
        for (let dir of dirs) {
            let result = moveLutin(i, dir);
            if (result !== null) {
                // IA retire un pont traversé au hasard
                for (let bridge of result) {
                    if (bridgeExists(bridge[0], bridge[1], bridge[2], bridge[3])) {
                        removeBridge(bridge[0], bridge[1], bridge[2], bridge[3]);
                        break;
                    }
                }
                drawBoard(); finishTurn(); return;
            }
        }
    }
    drawBoard(); finishTurn();
}


// ============================================================
// UI
// ============================================================

function setMessage(msg) { messageBox.innerText = msg; }

function updateInfoBar() {
    let player = currentPlayer();
    infoPlayer.innerText = COLOR_NAMES[player];
    infoPlayer.style.backgroundColor = COLOR_MAP[player];
    infoPlayer.style.color = (player === "yellow") ? "#333" : "white";
    infoPhase.innerText = (phase === "placement") ? "Placement" : "Mouvement";
}


// ============================================================
// LANCEMENT
// ============================================================

initGame();
drawBoard();
updateInfoBar();
setMessage("Cliquez sur une case pour placer un lutin vert.");