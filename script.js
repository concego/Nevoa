// script.js para Névoa da Ruína

// Estado do jogo
let gameState = {
    nodesVisited: 0,
    enemiesDefeated: 0,
    corruption: 0,
    blackScales: 0,
    relicsObtained: [],
    corneliusBattles: 0,
    deck: ['Ataque', 'Defesa', 'Ataque'],
    hand: [],
    relics: [],
    status: [],
    currentNode: null
};

// Inicializar localStorage
function loadGame() {
    const savedState = JSON.parse(localStorage.getItem('gameState'));
    if (savedState) {
        gameState = { ...gameState, ...savedState };
    }
    updateUI();
}

function saveGame() {
    localStorage.setItem('gameState', JSON.stringify(gameState));
}

// Sistema de Cartas
const cards = {
    Ataque: { effect: () => dealDamage(2), cost: 1 },
    Defesa: { effect: () => gainBlock(3), cost: 1 },
    Fogo: { effect: () => applyStatus('queimando', 2), cost: 2 },
    Gelo: { effect: () => applyStatus('congelado', 1), cost: 2 },
    Veneno: { effect: () => applyStatus('envenenado', 3), cost: 2 }
};

function drawHand() {
    gameState.hand = [];
    const deckCopy = [...gameState.deck];
    for (let i = 0; i < Math.min(5, deckCopy.length); i++) {
        const randomIndex = Math.floor(Math.random() * deckCopy.length);
        gameState.hand.push(deckCopy.splice(randomIndex, 1)[0]);
    }
    saveGame();
    updateUI();
}

function playCard(cardName) {
    const card = cards[cardName];
    if (gameState.energy >= card.cost) {
        card.effect();
        gameState.energy -= card.cost;
        gameState.hand = gameState.hand.filter(c => c !== cardName);
        saveGame();
        updateUI();
    }
}

// Sistema de Status
function applyStatus(status, duration) {
    gameState.status.push({ type: status, duration });
    resolveStatusEffects();
}

function resolveStatusEffects() {
    gameState.status.forEach(s => {
        if (s.type === 'queimando') takeDamage(s.duration);
        if (s.type === 'envenenado') takeDamage(1);
        if (s.type === 'congelado') skipAction();
        s.duration--;
    });
    gameState.status = gameState.status.filter(s => s.duration > 0);
    saveGame();
    updateUI();
}

// Sistema de Combate
let player = { hp: 20, block: 0, energy: 3 };
let enemy = { hp: 10, intent: 'attack' };

function dealDamage(amount) {
    enemy.hp -= amount;
    if (enemy.hp <= 0) {
        gameState.enemiesDefeated++;
        gameState.corruption += 1;
        endCombat();
    }
    saveGame();
    updateUI();
}

function takeDamage(amount) {
    if (player.block >= amount) {
        player.block -= amount;
    } else {
        player.hp -= amount - player.block;
        player.block = 0;
    }
    if (player.hp <= 0) showDeathModal();
    saveGame();
    updateUI();
}

function gainBlock(amount) {
    player.block += amount;
    saveGame();
    updateUI();
}

function skipAction() {
    // Lógica para pular ação do jogador ou inimigo
}

// Modal de Morte
function showDeathModal() {
    const modal = document.createElement('div');
    modal.id = 'deathModal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-label', 'Tela de Morte');
    modal.innerHTML = `
        <h2>Você Morreu!</h2>
        <p>Nós Visitados: ${gameState.nodesVisited}</p>
        <p>Inimigos Derrotados: ${gameState.enemiesDefeated}</p>
        <p>Corrupção Acumulada: ${gameState.corruption}</p>
        <p>Escamas Negras: ${gameState.blackScales}</p>
        <p>Relíquias Obtidas: ${gameState.relicsObtained.join(', ') || 'Nenhuma'}</p>
        <p>Combates com Cornelius: ${gameState.corneliusBattles}</p>
        <button onclick="restartGame()" aria-label="Reiniciar Jogo">Reiniciar</button>
    `;
    document.body.appendChild(modal);
}

// Sistema de Nó
function visitNode(type) {
    gameState.nodesVisited++;
    gameState.currentNode = type;
    if (type === 'combat') startCombat();
    if (type === 'merchant') showMerchant();
    if (type === 'shelter') showShelter();
    saveGame();
    updateUI();
}

function startCombat() {
    enemy = { hp: 10 + gameState.nodesVisited, intent: 'attack' };
    if (Math.random() < 0.1) {
        enemy = { hp: 20, intent: 'attack' };
        gameState.corneliusBattles++;
    }
    player.energy = 3;
    drawHand();
}

function endCombat() {
    if (Math.random() < 0.2) {
        gameState.relicsObtained.push('Relíquia ' + (gameState.relicsObtained.length + 1));
    }
    gameState.currentNode = null;
    saveGame();
    updateUI();
}

// Sistema de Mercador
function showMerchant() {
    const merchantDiv = document.getElementById('merchant');
    merchantDiv.innerHTML = `
        <h2>Mercador</h2>
        <p>Escamas Negras: ${gameState.blackScales}</p>
        <button onclick="buyCard('Fogo')" ${gameState.blackScales < 2 ? 'disabled' : ''}>Comprar Fogo (2 Escamas)</button>
        <button onclick="buyCard('Gelo')" ${gameState.blackScales < 2 ? 'disabled' : ''}>Comprar Gelo (2 Escamas)</button>
        <button onclick="buyCard('Veneno')" ${gameState.blackScales < 2 ? 'disabled' : ''}>Comprar Veneno (2 Escamas)</button>
    `;
}

function buyCard(cardName) {
    if (gameState.blackScales >= 2) {
        gameState.deck.push(cardName);
        gameState.blackScales -= 2;
        saveGame();
        updateUI();
    }
}

// Sistema de Abrigo
function showShelter() {
    const shelterDiv = document.getElementById('shelter');
    shelterDiv.innerHTML = `
        <h2>Abrigo</h2>
        <button onclick="showMechanics()">Ver Mecânicas de Combate</button>
        <div id="mechanics" style="display: none;">
            <h3>Mecânicas de Combate</h3>
            <p>Cartas: ${Object.keys(cards).join(', ')}</p>
            <p>Relíquias: ${gameState.relicsObtained.join(', ') || 'Nenhuma'}</p>
            <p>Efeitos: Congelado (pula ação), Queimando (dano por turno), Envenenado (dano por turno)</p>
        </div>
    `;
}

function showMechanics() {
    const mechanicsDiv = document.getElementById('mechanics');
    mechanicsDiv.style.display = mechanicsDiv.style.display === 'none' ? 'block' : 'none';
}

// Reiniciar Jogo
function restartGame() {
    gameState = {
        nodesVisited: 0,
        enemiesDefeated: 0,
        corruption: 0,
        blackScales: 0,
        relicsObtained: [],
        corneliusBattles: 0,
        deck: ['Ataque', 'Defesa', 'Ataque'],
        hand: [],
        relics: [],
        status: [],
        currentNode: null
    };
    player = { hp: 20, block: 0, energy: 3 };
    document.getElementById('deathModal').remove();
    saveGame();
    updateUI();
}

// Atualizar Interface
function updateUI() {
    document.getElementById('playerHP').textContent = `HP: ${player.hp}`;
    document.getElementById('playerBlock').textContent = `Bloqueio: ${player.block}`;
    document.getElementById('playerEnergy').textContent = `Energia: ${player.energy}`;
    document.getElementById('hand').innerHTML = gameState.hand.map(card => `
        <button onclick="playCard('${card}')" ${player.energy < cards[card].cost ? 'disabled' : ''}>${card}</button>
    `).join('');
    if (gameState.currentNode === 'combat') {
        document.getElementById('enemyHP').textContent = `Inimigo HP: ${enemy.hp}`;
    }
}

// Inicializar eventos
document.addEventListener('DOMContentLoaded', () => {
    loadGame();
    document.getElementById('visitCombat').addEventListener('click', () => visitNode('combat'));
    document.getElementById('visitMerchant').addEventListener('click', () => visitNode('merchant'));
    document.getElementById('visitShelter').addEventListener('click', () => visitNode('shelter'));
});
