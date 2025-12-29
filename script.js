const DIFFICULTIES = {
  easy: [
    {
      targetMin: 15,
      targetMax: 25,
      fallSpeed: 170,
      spawnInterval: [1300, 1900],
      smallWeightChance: 0.95,
      tableCapacityFraction: 0.6,
    },
    {
      targetMin: 25,
      targetMax: 40,
      fallSpeed: 160,
      spawnInterval: [1200, 1700],
      smallWeightChance: 0.9,
      tableCapacityFraction: 0.55,
    },
    {
      targetMin: 40,
      targetMax: 55,
      fallSpeed: 150,
      spawnInterval: [1100, 1500],
      smallWeightChance: 0.85,
      tableCapacityFraction: 0.5,
    }
  ],
  medium: [
    {
      targetMin: 60,
      targetMax: 75,
      fallSpeed: 110,
      spawnInterval: [1000, 1500],
      smallWeightChance: 0.35,
      tableCapacityFraction: 0.4,
    },
    {
      targetMin: 75,
      targetMax: 90,
      fallSpeed: 105,
      spawnInterval: [900, 1400],
      smallWeightChance: 0.3,
      tableCapacityFraction: 0.35,
    },
    {
      targetMin: 90,
      targetMax: 105,
      fallSpeed: 100,
      spawnInterval: [800, 1300],
      smallWeightChance: 0.25,
      tableCapacityFraction: 0.3,
    }
  ],
  hard: [
    {
      targetMin: 110,
      targetMax: 120,
      fallSpeed: 170,
      spawnInterval: [700, 1150],
      smallWeightChance: 0.2,
      tableCapacityFraction: 0.25,
    },
    {
      targetMin: 120,
      targetMax: 135,
      fallSpeed: 165,
      spawnInterval: [650, 1050],
      smallWeightChance: 0.15,
      tableCapacityFraction: 0.22,
    },
    {
      targetMin: 135,
      targetMax: 145,
      fallSpeed: 160,
      spawnInterval: [600, 950],
      smallWeightChance: 0.1,
      tableCapacityFraction: 0.2,
    }
  ],
};
let currentDifficultyKey = "easy";
let currentDifficultyIndex = 0;
let playerName = "";
let gameProgress = { easy: 1, medium: 0, hard: 0 };
let difficultyStartTime = null;
let totalDifficultyTime = 0;
let targetWeight = 0;
let leftWeight = 0;
let rightWeight = 0;
let tableWeight = 0;
let tableCapacity = 0;

let running = false;
let totalTimeLimit = 60;
let timeLeft = totalTimeLimit;
let gameTimerId = null;
let fallLoopId = null;
let lastFrameTime = null;
let spawnGeneration = 0;

let fallingWeights = new Map();
let nextWeightId = 1;
let capturedWeight = null;
let isEasyMode = false;
let isMediumMode = false;

const timeLeftSpan = document.getElementById("time-left");
const currentLevelDisplay = document.getElementById("current-level");
const startBtn = document.getElementById("start-btn");
const playerNameDisplay = document.getElementById("player-name-display");
const leftWeightLabel = document.getElementById("left-weight-label");
const rightWeightLabel = document.getElementById("right-weight-label");
const tableEl = document.getElementById("table");
const tableCapacityText = document.getElementById("table-capacity-text");
const tableCapacityEl = document.querySelector(".table-capacity");
const fallArea = document.getElementById("fall-area");
const leftPan = document.getElementById("left-pan");
const rightPan = document.getElementById("right-pan");
const scaleArm = document.getElementById("scale-arm");
const messageEl = document.getElementById("message");
const restartBtn = document.getElementById("restart-btn");
const diffButtons = document.querySelectorAll(".diff-btn");
const levelButtons = document.querySelectorAll(".level-btn");
const rulesBtn = document.getElementById("rules-btn");
const rulesModal = document.getElementById("rules-modal");
const rulesTitle = document.getElementById("rules-title");
const rulesContent = document.getElementById("rules-content");

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function updateLevelDisplay() {
  const levelNames = {
    easy: 'Легкий',
    medium: 'Средний',
    hard: 'Сложный'
  };

  const levelName = levelNames[currentDifficultyKey];
  const subLevel = currentDifficultyIndex + 1;

  currentLevelDisplay.textContent = `${levelName} ${subLevel}`;
}

function chooseWeightValue(difficulty) {
  const small = Math.random() < difficulty.smallWeightChance;
  if (small) {
    return randomInt(1, 5);
  }
  return randomInt(6, 15);
}
function calculateScore(time, difficulty) {
  const difficultyMultipliers = {
    easy: 1,
    medium: 1.5,
    hard: 2
  };

  const baseScore = 1000;
  const difficultyMultiplier = difficultyMultipliers[difficulty] || 1;
  const timeBonus = Math.max(0, Math.min(500, (60 - time) * (500 / 50)));

  const totalScore = Math.round((baseScore + timeBonus) * difficultyMultiplier);

  return totalScore;
}
function saveGameResult(score, time, difficulty) {
  const result = {
    playerName: playerName,
    score: score,
    time: time,
    difficulty: difficulty,
    timestamp: new Date().toISOString()
  };

  const storedResults = JSON.parse(localStorage.getItem('gameResults') || '[]');
  storedResults.push(result);

  const sortedResults = storedResults.sort((a, b) => b.score - a.score);
  const topResults = sortedResults.slice(0, 100);

  localStorage.setItem('gameResults', JSON.stringify(topResults));
}

function loadGameProgress() {
  gameProgress = { easy: 0, medium: 0, hard: 0 };

  const savedProgress = localStorage.getItem(`gameProgress_${playerName}`);
  if (savedProgress) {
    gameProgress = JSON.parse(savedProgress);
  } else {
    gameProgress = { easy: 1, medium: 0, hard: 0 };
  }
}

function saveGameProgress() {
  localStorage.setItem(`gameProgress_${playerName}`, JSON.stringify(gameProgress));
}

function unlockNextLevel() {
  const newProgress = Math.max(gameProgress[currentDifficultyKey] || 0, currentDifficultyIndex + 2);
  gameProgress[currentDifficultyKey] = newProgress;

  if (gameProgress[currentDifficultyKey] >= 4) {
    if (currentDifficultyKey === 'easy' && gameProgress.medium === 0) {
      gameProgress.medium = 1;
    } else if (currentDifficultyKey === 'medium' && gameProgress.hard === 0) {
      gameProgress.hard = 1;
    }
  }

  saveGameProgress();
}

function getNextLevel() {
  let nextDifficultyKey = currentDifficultyKey;
  let nextDifficultyIndex = currentDifficultyIndex + 1;

  if (nextDifficultyIndex >= 3) {
    if (currentDifficultyKey === 'easy') {
      nextDifficultyKey = 'medium';
      nextDifficultyIndex = 0;
    } else if (currentDifficultyKey === 'medium') {
      nextDifficultyKey = 'hard';
      nextDifficultyIndex = 0;
    } else {
      return null;
    }
  }

  return { difficultyKey: nextDifficultyKey, difficultyIndex: nextDifficultyIndex };
}

function updateLevelButtons() {
  levelButtons.forEach((btn, index) => {
    const levelUnlocked = gameProgress[currentDifficultyKey] > index || gameProgress[currentDifficultyKey] >= 4;
    btn.disabled = !levelUnlocked;
    if (levelUnlocked) {
      btn.classList.remove('locked');
    } else {
      btn.classList.add('locked');
    }
  });
}

function showRules() {
  const difficultyNames = {
    easy: 'Лёгкая',
    medium: 'Средняя',
    hard: 'Сложная'
  };

  const levelName = difficultyNames[currentDifficultyKey];
  rulesTitle.textContent = `Правила: ${levelName} сложность`;

  let rulesHTML = '';

  if (currentDifficultyKey === 'easy') {
    rulesHTML = `
      <h3>Цель игры</h3>
      <p>Уравновесьте весы, разместив гири на чашах так, чтобы вес левой и правой чаши стал равным.</p>

      <h3>Управление</h3>
      <ul>
        <li><span class="highlight">ПРОБЕЛ</span> - захватить падающую гирю</li>
        <li><span class="highlight">Q</span> - разместить гирю на левую чашу</li>
        <li><span class="highlight">E</span> - разместить гирю на правую чашу</li>
        <li><span class="highlight">BACKSPACE</span> - пропустить гирю</li>
      </ul>

      <h3>Особенности</h3>
      <p>В легком режиме одновременно присутствует только одна гиря. Стол недоступен.</p>
    `;
  } else if (currentDifficultyKey === 'medium') {
    rulesHTML = `
      <h3>Цель игры</h3>
      <p>Уравновесьте весы, разместив гири на чашах так, чтобы вес левой и правой чаши стал равным.</p>

      <h3>Управление</h3>
      <ul>
        <li><span class="highlight">Клик по гире</span> - захватить гирю (падающую или уже размещенную)</li>
        <li><span class="highlight">Клик по столу</span> - разместить гирю на стол</li>
        <li><span class="highlight">Клик по чаше</span> - разместить гирю на левую/правую чашу</li>
        <li><span class="highlight">Клик в пустое место</span> - выбросить гирю</li>
      </ul>

      <h3>Особенности</h3>
      <p>В среднем режиме несколько гирек падают одновременно. При захвате одной гири остальные останавливаются.</p>
    `;
  } else if (currentDifficultyKey === 'hard') {
    rulesHTML = `
      <h3>Цель игры</h3>
      <p>Уравновесьте весы, разместив гири на чашах так, чтобы вес левой и правой чаши стал равным.</p>

      <h3>Управление</h3>
      <ul>
        <li><span class="highlight">Зажать ЛКМ на гире</span> - захватить и перетащить гирю</li>
        <li><span class="highlight">Отпустить над зоной</span> - разместить гирю</li>
        <li><span class="highlight">Отпустить в пустом месте</span> - выбросить гирю</li>
      </ul>

      <h3>Особенности</h3>
      <p>В сложном режиме гири падают со всех сторон экрана. Доступен стол для временного хранения гирек.</p>
    `;
  }

  rulesContent.innerHTML = rulesHTML;
  rulesModal.style.display = 'block';
}

function hideRules() {
  rulesModal.style.display = 'none';
}

function updateDifficultyButtons() {
  diffButtons.forEach((btn) => {
    const key = btn.dataset.diff;
    const isUnlocked = (key === 'easy') ||
                      (key === 'medium' && gameProgress.medium >= 1) ||
                      (key === 'hard' && gameProgress.hard >= 1) ||
                      (gameProgress[key] >= 4);

    btn.disabled = !isUnlocked;
    if (isUnlocked) {
      btn.classList.remove('locked');
    } else {
      btn.classList.add('locked');
    }
  });
}

function resetAllWeights() {
  fallingWeights.forEach(({ el }) => el.remove());
  fallingWeights.clear();
  nextWeightId = 1;

  [leftPan, rightPan, tableEl].forEach((zone) => {
    Array.from(zone.querySelectorAll(".weight")).forEach((w) => {
      if (!w.classList.contains("target")) w.remove();
    });
  });

  tableEl.classList.remove("has-weights");
  leftWeight = 0;
  rightWeight = 0;
  tableWeight = 0;
}

function initGame(difficultyKey, difficultyIndex = 0) {
  spawnGeneration += 1;
  currentDifficultyKey = difficultyKey;
  currentDifficultyIndex = difficultyIndex;
  isEasyMode = difficultyKey === 'easy';
  isMediumMode = difficultyKey === 'medium';
  const diff = DIFFICULTIES[difficultyKey][difficultyIndex];

  if (difficultyIndex === 0) {
    totalDifficultyTime = 0;
  }

  running = false;
  timeLeft = totalTimeLimit;
  lastFrameTime = null;
  stopTimers();
  resetAllWeights();
  messageEl.textContent = "";
  messageEl.classList.remove("error");

  startBtn.style.display = "inline-block";
  restartBtn.style.display = "none";

  targetWeight = randomInt(diff.targetMin, diff.targetMax);
  tableCapacity = Math.round(targetWeight * diff.tableCapacityFraction);

  messageEl.textContent = "";
  messageEl.classList.remove("error");

  timeLeftSpan.textContent = timeLeft.toFixed(1);
  timeLeftSpan.classList.remove('time-warning', 'time-critical');

  updateLevelDisplay();

  if (isEasyMode) {
    tableEl.style.display = 'none';
    tableCapacityEl.style.display = 'none';
  } else {
    tableEl.style.display = 'block';
    tableCapacityEl.style.display = 'none';
  }

  rightPan.innerHTML = "";
  const targetEl = document.createElement("div");
  targetEl.className = "weight target big";
  targetEl.textContent = targetWeight;
  targetEl.dataset.value = String(targetWeight);
  targetEl.style.position = "absolute";
  targetEl.style.left = "50%";
  targetEl.style.top = "3px";
  targetEl.style.transform = "translateX(-50%)";
  rightPan.appendChild(targetEl);
  
  rightWeight = targetWeight;
  
  leftWeightLabel.textContent = leftWeight;
  rightWeightLabel.textContent = rightWeight;

  updateScaleTilt();
}

function startGameLoops() {
  running = true;
  const currentGen = spawnGeneration;

  if (isEasyMode) {
    tableEl.style.display = 'none';
    tableCapacityEl.style.display = 'none';
  } else {
    tableEl.style.display = 'block';
    tableCapacityEl.style.display = 'block';
    tableCapacityText.textContent = tableCapacity;
  }

  if (!gameTimerId) {
    gameTimerId = setInterval(() => {
      if (!running) return;
      timeLeft -= 0.1;
      timeLeftSpan.textContent = Math.max(0, timeLeft).toFixed(1);

      timeLeftSpan.classList.remove('time-warning', 'time-critical');
      if (timeLeft <= 10 && timeLeft > 5) {
        timeLeftSpan.classList.add('time-warning');
      } else if (timeLeft <= 5) {
        timeLeftSpan.classList.add('time-critical');
      }

      if (timeLeft <= 0) {
        running = false;
        timeLeftSpan.classList.remove('time-warning', 'time-critical');
        messageEl.textContent = "Время вышло! Попробуйте ещё раз.";
        messageEl.classList.add("error");
        stopTimers();
      }
    }, 100);
  }

  if (!fallLoopId) {
    lastFrameTime = performance.now();
    fallLoopId = requestAnimationFrame(fallStep);
  }

  if (isEasyMode) {
    if (fallingWeights.size === 0) {
      spawnWeight();
    }
    messageEl.textContent = "ПРОБЕЛ - захватить гирю, Q - левая чаша, E - правая чаша, BACKSPACE - пропустить";
    messageEl.classList.remove("error");
  } else if (isMediumMode) {
    messageEl.textContent = "Кликайте на гирьки для захвата, затем выбирайте место размещения";
    messageEl.classList.remove("error");
    scheduleNextSpawn(currentGen);
  } else {
    scheduleNextSpawn(currentGen);
  }
}

function stopTimers() {
  if (gameTimerId) {
    clearInterval(gameTimerId);
    gameTimerId = null;
  }
  if (fallLoopId) {
    cancelAnimationFrame(fallLoopId);
    fallLoopId = null;
  }
}

function fallStep(timestamp) {
  if (!running) return;

  const diff = DIFFICULTIES[currentDifficultyKey][currentDifficultyIndex];
  const dt = (timestamp - lastFrameTime) / 1000;
  lastFrameTime = timestamp;

  const fallHeight = fallArea.clientHeight;
  const areaWidth = fallArea.clientWidth;

  fallingWeights.forEach((obj, id) => {
    if ((isEasyMode || isMediumMode) && capturedWeight) {
      return;
    }

    if (obj.el.parentElement !== fallArea) {
      return;
    }

    if (obj.direction === 'down') {
      obj.y += diff.fallSpeed * dt;
    } else if (obj.direction === 'up') {
      obj.y -= diff.fallSpeed * dt;
    } else if (obj.direction === 'right') {
      obj.x += diff.fallSpeed * dt;
    } else if (obj.direction === 'left') {
      obj.x -= diff.fallSpeed * dt;
    }

    obj.el.style.left = `${obj.x}px`;
    obj.el.style.top = `${obj.y}px`;

    const outOfBounds =
      (obj.direction === 'down' && obj.y > fallHeight) ||
      (obj.direction === 'up' && obj.y < -40) ||
      (obj.direction === 'right' && obj.x > areaWidth) ||
      (obj.direction === 'left' && obj.x < -40);

    if (outOfBounds && !((isEasyMode || isMediumMode) && capturedWeight && capturedWeight.id === id)) {
      obj.el.remove();
      fallingWeights.delete(id);

      if (isEasyMode && fallingWeights.size === 0 && !capturedWeight) {
        setTimeout(() => spawnWeight(), 100);
      }
    }
  });

  fallLoopId = requestAnimationFrame(fallStep);
}

function spawnWeight() {
  if (!running) return;

  if (isEasyMode && fallingWeights.size > 0 && !capturedWeight) {
    return;
  }
  if (isMediumMode && (fallingWeights.size >= 3 || capturedWeight)) {
    return;
  }

  const diff = DIFFICULTIES[currentDifficultyKey][currentDifficultyIndex];

  const value = chooseWeightValue(diff);
  const weightEl = document.createElement("div");
  weightEl.className = "weight falling";
  weightEl.textContent = value;
  weightEl.dataset.value = String(value);
  weightEl.dataset.id = String(nextWeightId);

  if (value <= 3) {
    weightEl.classList.add("small");
  } else if (value >= 10) {
    weightEl.classList.add("big");
  }

  if (isEasyMode || isMediumMode) {
    weightEl.style.cursor = "pointer";
  }

  const areaWidth = fallArea.clientWidth;
  const areaHeight = fallArea.clientHeight;

  let spawnSide, x, y, direction;

  if (currentDifficultyKey === 'easy') {
    spawnSide = 'top';
    x = randomInt(10, areaWidth - 44);
    y = -40;
    direction = 'down';
  } else if (currentDifficultyKey === 'medium') {
    spawnSide = 'top';
    x = randomInt(10, areaWidth - 44);
    y = -40;
    direction = 'down';
  } else if (currentDifficultyKey === 'hard') {
    const side = Math.floor(Math.random() * 4);
    if (side === 0) {
      spawnSide = 'top';
      x = randomInt(10, areaWidth - 44);
      y = -40;
      direction = 'down';
    } else if (side === 1) {
      spawnSide = 'bottom';
      x = randomInt(10, areaWidth - 44);
      y = areaHeight + 40;
      direction = 'up';
    } else if (side === 2) {
      spawnSide = 'left';
      x = -40;
      y = randomInt(10, areaHeight - 44);
      direction = 'right';
    } else {
      spawnSide = 'right';
      x = areaWidth + 40;
      y = randomInt(10, areaHeight - 44);
      direction = 'left';
    }
  }

  weightEl.style.left = `${x}px`;
  weightEl.style.top = `${y}px`;

  fallArea.appendChild(weightEl);

  fallingWeights.set(nextWeightId, {
    el: weightEl,
    value,
    x,
    y,
    direction,
  });

  makeDraggable(weightEl);

  if (isMediumMode) {
    weightEl.addEventListener("click", (e) => {
      if (!running) return;
      if (weightEl.classList.contains("target")) return;
      e.preventDefault();
      e.stopPropagation();

      if (capturedWeight) return;

      const weightId = Number(weightEl.dataset.id);
      if (fallingWeights.has(weightId)) {
        captureWeightMedium(weightId);
      } else {
        capturePlacedWeightMedium(weightEl, e.clientX, e.clientY);
      }
    });
  }

  nextWeightId += 1;
}

function scheduleNextSpawn(gen) {
  if (!running) return;
  if (gen !== spawnGeneration) return;
  const diff = DIFFICULTIES[currentDifficultyKey][currentDifficultyIndex];
  const [min, max] = diff.spawnInterval;
  const delay = randomInt(min, max);
  setTimeout(() => {
    if (!running) return;
    if (gen !== spawnGeneration) return;
    spawnWeight();
    scheduleNextSpawn(gen);
  }, delay);
}

function makeDraggable(el) {
  let offsetX = 0;
  let offsetY = 0;
  let startParent = null;
  let dragging = false;

  el.addEventListener("mousedown", (e) => {
    if (!running) return;
    if (el.classList.contains("target")) return;
    if (isEasyMode || isMediumMode) return;

    e.preventDefault();
    e.stopPropagation();
    dragging = true;
    el.style.cursor = "grabbing";

    const rect = el.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;

    startParent = el.parentElement;

    const currentLeft = el.style.left;
    const currentTop = el.style.top;

    if (el.classList.contains("falling")) {
      const id = Number(el.dataset.id);
      if (fallingWeights.has(id)) {
        fallingWeights.delete(id);
      }
      el.classList.remove("falling");
    }
    
    el.classList.add("dragging");
    el.style.position = "fixed";
    el.style.left = `${e.clientX - offsetX}px`;
    el.style.top = `${e.clientY - offsetY}px`;
    el.style.zIndex = "1000";
    document.body.appendChild(el);

    highlightDropZones(true);

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });

  function onMove(e) {
    if (!dragging) return;
    el.style.left = `${e.clientX - offsetX}px`;
    el.style.top = `${e.clientY - offsetY}px`;
  }

  function onUp(e) {
    if (!dragging) return;
    dragging = false;
    el.style.cursor = "grab";
    el.classList.remove("dragging");
    highlightDropZones(false);

    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);

    const dropZone = getDropZoneUnderCursor(e.clientX, e.clientY);
    if (dropZone) {
      handleDrop(el, dropZone, startParent, e);
    } else {
      el.remove();
      updateWeightsForZones();
    }
  }
}

function highlightDropZones(on) {
  document.querySelectorAll(".drop-zone").forEach((z) => {
    if (on) z.classList.add("highlight");
    else z.classList.remove("highlight");
  });
}

function getDropZoneUnderCursor(x, y) {
  const zones = Array.from(document.querySelectorAll(".drop-zone"));
  for (let i = zones.length - 1; i >= 0; i--) {
    const zone = zones[i];
    const rect = zone.getBoundingClientRect();
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      return zone;
    }
  }
  return null;
}

function handleDrop(weightEl, dropZone, fromParent, event) {
  const value = Number(weightEl.dataset.value || "0");
  const zoneName = dropZone.dataset.zone;

  messageEl.textContent = "";
  messageEl.classList.remove("error");

  if (zoneName === "table") {
    if (isEasyMode) {
      messageEl.textContent = "В легком режиме стол недоступен!";
      messageEl.classList.add("error");
      weightEl.remove();
      updateWeightsForZones();
      return;
    }

    const wasOnTable = fromParent === tableEl;
    if (!wasOnTable && tableWeight + value > tableCapacity) {
      messageEl.textContent = "Стол переполнен! Освободите место.";
      messageEl.classList.add("error");
      weightEl.remove();
      updateWeightsForZones();
      return;
    }
  }

  placeWeightInZone(weightEl, dropZone, event);
  updateWeightsForZones();
}

function placeWeightInZone(weightEl, zone, event) {
  weightEl.style.position = '';
  weightEl.style.left = '';
  weightEl.style.top = '';
  weightEl.style.transform = '';
  weightEl.style.zIndex = '';

  zone.appendChild(weightEl);
  weightEl.setAttribute('data-zone', zone.getAttribute('data-zone'));

  var zoneRect = zone.getBoundingClientRect();
  var x, y;

  if (event && event.clientX !== undefined && event.clientY !== undefined) {
    var chipRect = weightEl.getBoundingClientRect();
    x = event.clientX - zoneRect.left - chipRect.width / 2;
    y = event.clientY - zoneRect.top - chipRect.height / 2;
  } else {
    x = zoneRect.width / 2 - 20;
    y = zoneRect.height / 2 - 20;
  }

  if (x < 0) x = 0;
  if (y < 0) y = 0;
  if (x > zoneRect.width - 40) x = zoneRect.width - 40;
  if (y > zoneRect.height - 40) y = zoneRect.height - 40;

  weightEl.style.position = 'absolute';
  weightEl.style.left = x + 'px';
  weightEl.style.top = y + 'px';

  if (zone === tableEl) {
    tableEl.classList.add("has-weights");
  }

  if (isMediumMode && !weightEl.hasAttribute('data-medium-click-handler')) {
    weightEl.setAttribute('data-medium-click-handler', 'true');
    weightEl.addEventListener("click", (e) => {
      if (!running) return;
      if (weightEl.classList.contains("target")) return;
      e.preventDefault();
      e.stopPropagation();

      if (capturedWeight) return;

      capturePlacedWeightMedium(weightEl, e.clientX, e.clientY);
    });

    // Двойной клик для удаления гири на среднем уровне
    weightEl.addEventListener("dblclick", (e) => {
      if (!running || !isMediumMode) return;
      if (weightEl.classList.contains("target")) return;
      e.preventDefault();
      e.stopPropagation();

      // Получить позицию гири для эффекта частиц
      const rect = weightEl.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Создать эффект частиц
      createParticleEffect(centerX, centerY);

      // Если эта гиря была захвачена, очистить capturedWeight
      if (capturedWeight && capturedWeight.el === weightEl) {
        capturedWeight = null;
        highlightDropZones(false);
        messageEl.textContent = "";
      }

      weightEl.remove();
      fallingWeights.delete(Number(weightEl.dataset.id));
      updateWeightsForZones();
    });
  }
}

function updateWeightsForZones() {
  const oldLeft = leftWeight;
  const oldTable = tableWeight;

  leftWeight = sumWeightsInZone(leftPan);
  rightWeight = Array.from(rightPan.querySelectorAll(".weight"))
    .reduce((sum, w) => sum + Number(w.dataset.value || w.textContent || "0"), 0);
  tableWeight = sumWeightsInZone(tableEl);

  if (tableWeight <= 0) {
    tableEl.classList.remove("has-weights");
  }
  
  leftWeightLabel.textContent = leftWeight;
  rightWeightLabel.textContent = rightWeight;

  updateScaleTilt();

  if (leftWeight === rightWeight && leftWeight > 0 && running) {
    running = false;

    const levelTime = totalTimeLimit - timeLeft;
    totalDifficultyTime += levelTime;

    unlockNextLevel();
    updateDifficultyButtons();
    updateLevelButtons();
    const nextLevel = getNextLevel();

    if (nextLevel) {
      setTimeout(() => {
        currentDifficultyKey = nextLevel.difficultyKey;
        currentDifficultyIndex = nextLevel.difficultyIndex;

        diffButtons.forEach((b) => {
          if (b.dataset.diff === currentDifficultyKey) {
            b.classList.add("active");
          } else {
            b.classList.remove("active");
          }
        });

        levelButtons.forEach((b, index) => {
          if (index === currentDifficultyIndex) {
            b.classList.add("active");
          } else {
            b.classList.remove("active");
          }
        });

        updateLevelButtons();
        updateDifficultyButtons();
        initGame(currentDifficultyKey, currentDifficultyIndex);
      }, 2000);

      messageEl.textContent = `Отлично! Переход на следующий уровень...`;
    } else {
      const score = calculateScore(totalDifficultyTime, currentDifficultyKey);
      saveGameResult(score, totalDifficultyTime, currentDifficultyKey);

      totalDifficultyTime = 0;

      messageEl.textContent = `Поздравляем! Вы прошли все уровни сложности! Счет: ${score} очков за ${totalDifficultyTime.toFixed(1)} c.`;
    }

    messageEl.classList.remove("error");
    stopTimers();
  }
}

function sumWeightsInZone(zone) {
  return Array.from(zone.querySelectorAll(".weight"))
    .filter((w) => !w.classList.contains("target"))
    .reduce((sum, w) => sum + Number(w.dataset.value || "0"), 0);
}

function updateScaleTilt() {
  const diff = rightWeight - leftWeight;
  const totalWeight = Math.max(leftWeight, rightWeight, 1);
  
  if (!Number.isFinite(diff)) {
    scaleArm.style.transform = "rotate(0deg)";
    return;
  }

  const ratio = diff / totalWeight;
  const maxAngle = 18;
  let angle = ratio * maxAngle;
  if (angle > maxAngle) angle = maxAngle;
  if (angle < -maxAngle) angle = -maxAngle;

  scaleArm.style.transform = `rotate(${angle}deg)`;
}

startBtn.addEventListener("click", () => {
  startBtn.style.display = "none";
  restartBtn.style.display = "inline-block";
  startGameLoops();
});

restartBtn.addEventListener("click", () => {
  initGame(currentDifficultyKey, currentDifficultyIndex);
});

document.addEventListener('DOMContentLoaded', () => {
  if (rulesBtn) {
    rulesBtn.addEventListener("click", () => {
      showRules();
    });
  }

  if (rulesModal) {
    rulesModal.addEventListener("click", (e) => {
      if (e.target === rulesModal || e.target.classList.contains('modal-close')) {
        hideRules();
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && rulesModal && rulesModal.style.display === "block") {
      hideRules();
    }
  });
});

const unlockAllBtn = document.getElementById("unlock-all-btn");
unlockAllBtn.addEventListener("click", () => {
  gameProgress = { easy: 4, medium: 4, hard: 4 };
  saveGameProgress();

  updateDifficultyButtons();
  updateLevelButtons();

  messageEl.textContent = "Все уровни разблокированы!";
  messageEl.classList.remove("error");

  setTimeout(() => {
    messageEl.textContent = "";
  }, 2000);
});


diffButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const key = btn.dataset.diff;
    if (!key || !DIFFICULTIES[key]) return;

    if ((key === 'medium' && gameProgress.medium < 1) ||
        (key === 'hard' && gameProgress.hard < 1)) {
      return;
    }

    diffButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    currentDifficultyKey = key;
    currentDifficultyIndex = 0;
    levelButtons.forEach((b, index) => {
      if (index === 0) {
        b.classList.add("active");
      } else {
        b.classList.remove("active");
      }
    });

    updateLevelButtons();
    initGame(key, 0);
  });
});

levelButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const level = parseInt(btn.dataset.level);
    if (isNaN(level) || level < 0 || level > 2 || btn.disabled) return;

    levelButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    currentDifficultyIndex = level;
    initGame(currentDifficultyKey, level);
  });
});

document.addEventListener('keydown', (e) => {
  if (!isEasyMode || !running) return;

  switch (e.code) {
    case 'Space':
      e.preventDefault();
      captureWeight();
      break;
    case 'KeyQ':
      e.preventDefault();
      placeCapturedWeight('left-pan');
      break;
    case 'KeyE':
      e.preventDefault();
      placeCapturedWeight('right-pan');
      break;
    case 'Backspace':
      e.preventDefault();
      skipWeight();
      break;
  }
});

function captureWeight() {
  if (!capturedWeight && fallingWeights.size > 0) {
    const firstWeight = fallingWeights.values().next().value;
    capturedWeight = {
      id: Array.from(fallingWeights.keys())[0],
      el: firstWeight.el,
      value: firstWeight.value
    };

    firstWeight.el.classList.add('captured');
    messageEl.textContent = `Q - левая чаша, E - правая чаша, Backspace - пропустить`;
    messageEl.classList.remove('error');
  }
}

function placeCapturedWeight(zoneName) {
  if (!capturedWeight) return;

  const zone = zoneName === 'left-pan' ? leftPan : rightPan;
  if (!zone) return;

  const fakeEvent = {
    clientX: zone.getBoundingClientRect().left + zone.clientWidth / 2,
    clientY: zone.getBoundingClientRect().top + zone.clientHeight / 2
  };

  capturedWeight.el.classList.remove('captured');
  placeWeightInZone(capturedWeight.el, zone, fakeEvent);

  fallingWeights.delete(capturedWeight.id);
  capturedWeight = null;

  updateWeightsForZones();

  setTimeout(() => {
    spawnWeight();
    messageEl.textContent = "";
  }, 200);
}

function skipWeight() {
  if (capturedWeight) {
    capturedWeight.el.classList.remove('captured');
    capturedWeight.el.remove();
    fallingWeights.delete(capturedWeight.id);
    capturedWeight = null;
  } else if (fallingWeights.size > 0) {
    const firstWeight = fallingWeights.values().next().value;
    firstWeight.el.remove();
    fallingWeights.delete(Array.from(fallingWeights.keys())[0]);
  }

  setTimeout(() => {
    spawnWeight();
    messageEl.textContent = "";
  }, 200);
}

function captureWeightMedium(weightId) {
  if (!running || !isMediumMode) return;

  if (capturedWeight) return;

  const weightObj = fallingWeights.get(weightId);
  if (!weightObj) return;

  capturedWeight = {
    id: weightId,
    el: weightObj.el,
    value: weightObj.value,
    originalZone: null
  };

  const parent = weightObj.el.parentElement;
  if (parent === tableEl) {
    capturedWeight.originalZone = 'table';
  } else if (parent === leftPan) {
    capturedWeight.originalZone = 'left';
  } else if (parent === rightPan) {
    capturedWeight.originalZone = 'right';
  }

  weightObj.el.classList.add('captured');
  weightObj.el.classList.add('medium-captured');

  messageEl.textContent = "Кликните на стол, левую чашу или правую чашу для размещения. Кликните в пустое место для выброса.";
  messageEl.classList.remove('error');

  highlightDropZones(true);

  document.addEventListener('click', handleMediumPlacement, { once: true });
}

function handleMediumPlacement(e) {
  if (!capturedWeight || !isMediumMode) return;

  const target = e.target;
  let placed = false;

  if (target.closest('#table') && target.closest('#table') === tableEl) {
    placeCapturedWeightMedium('table', e.clientX, e.clientY);
    placed = true;
  } else if (target.closest('#left-pan') && target.closest('#left-pan') === leftPan) {
    placeCapturedWeightMedium('left-pan', e.clientX, e.clientY);
    placed = true;
  } else if (target.closest('#right-pan') && target.closest('#right-pan') === rightPan) {
    placeCapturedWeightMedium('right-pan', e.clientX, e.clientY);
    placed = true;
  }

  highlightDropZones(false);

  if (!placed) {
    capturedWeight.el.classList.remove('captured', 'medium-captured');
    capturedWeight.el.remove();
    fallingWeights.delete(capturedWeight.id);
    capturedWeight = null;
    messageEl.textContent = "";
  }
}

function capturePlacedWeightMedium(weightEl, clientX, clientY) {
  if (!running || !isMediumMode || capturedWeight) return;
  if (weightEl.classList.contains("target")) return;

  const tempId = nextWeightId++;
  weightEl.dataset.id = String(tempId);

  capturedWeight = {
    id: tempId,
    el: weightEl,
    value: Number(weightEl.dataset.value || weightEl.textContent),
    originalZone: weightEl.parentElement === tableEl ? 'table' :
                 weightEl.parentElement === leftPan ? 'left' : 'right'
  };

  weightEl.classList.add('captured', 'medium-captured');

  const rect = weightEl.getBoundingClientRect();
  const offsetX = clientX - rect.left;
  const offsetY = clientY - rect.top;

  weightEl.style.position = 'fixed';
  weightEl.style.left = `${clientX - offsetX}px`;
  weightEl.style.top = `${clientY - offsetY}px`;
  weightEl.style.transform = 'none';
  weightEl.style.zIndex = '1000';
  document.body.appendChild(weightEl);

  updateWeightsForZones();

  messageEl.textContent = "Кликните на стол, левую чашу или правую чашу для размещения. Кликните в пустое место для выброса.";
  messageEl.classList.remove('error');

  highlightDropZones(true);

  document.addEventListener('click', handleMediumPlacement, { once: true });
}

function createParticleEffect(x, y, color = '#f1f5f9') {
  const particleCount = 10;
  const particles = [];
  let lastTime = performance.now();

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');

    Object.assign(particle.style, {
      position: 'fixed',
      left: `${x}px`,
      top: `${y}px`,
      width: '4px',
      height: '4px',
      backgroundColor: color,
      borderRadius: '50%',
      pointerEvents: 'none',
      zIndex: '9999',
      transform: 'translate(0, 0)',
      opacity: '1' // ← сразу видим
    });

    const angle = Math.random() * Math.PI * 2;
    const speed = 35 + Math.random() * 55; // быстрее

    particle.vx = Math.cos(angle) * speed;
    particle.vy = Math.sin(angle) * speed - 30;

    particle.x = 0;
    particle.y = 0;
    particle.life = 1.5; // ← живут дольше

    document.body.appendChild(particle);
    particles.push(particle);
  }

  function animate(time) {
    const delta = (time - lastTime) / 1000;
    lastTime = time;

    let alive = false;

    particles.forEach(p => {
      if (p.life > 0) {
        alive = true;

        // физика
        p.vy += 90 * delta;        // мягкая гравитация
        p.x += p.vx * delta;
        p.y += p.vy * delta;

        // медленное затухание
        p.life -= delta * 0.6;
        p.style.opacity = Math.max(0, p.life / 1.5);

        p.style.transform = `translate(${p.x}px, ${p.y}px)`;
      } else {
        p.remove();
      }
    });

    if (alive) requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

function placeCapturedWeightMedium(zoneName, clientX, clientY) {
  if (!capturedWeight || !isMediumMode) return;

  let zone;
  if (zoneName === 'table') {
    zone = tableEl;
  } else if (zoneName === 'left-pan') {
    zone = leftPan;
  } else if (zoneName === 'right-pan') {
    zone = rightPan;
  }

  if (!zone) return;

  if (zone === tableEl) {
    const wasOnTable = capturedWeight.originalZone === 'table';
    if (!wasOnTable && tableWeight + capturedWeight.value > tableCapacity) {
      messageEl.textContent = "Стол переполнен! Освободите место.";
      messageEl.classList.add("error");
      capturedWeight.el.classList.remove('captured', 'medium-captured');
      capturedWeight = null;
      return;
    }
  }

  const clickEvent = clientX !== undefined && clientY !== undefined ? {
    clientX: clientX,
    clientY: clientY
  } : null;

  capturedWeight.el.classList.remove('captured', 'medium-captured');
  capturedWeight.el.classList.remove('falling');

  placeWeightInZone(capturedWeight.el, zone, clickEvent);

  fallingWeights.delete(capturedWeight.id);

  capturedWeight = null;

  updateWeightsForZones();
  messageEl.textContent = "";

  highlightDropZones(false);
}

window.addEventListener("load", () => {
  const savedName = localStorage.getItem('playerName');
  if (!savedName) {
    window.location.href = 'login.html';
    return;
  }

  playerName = savedName;
  playerNameDisplay.textContent = playerName;

  loadGameProgress();

  if (gameProgress.hard >= 3) {
    currentDifficultyKey = 'hard';
    currentDifficultyIndex = 2;
  } else if (gameProgress.hard >= 1) {
    currentDifficultyKey = 'hard';
    currentDifficultyIndex = 0;
  } else if (gameProgress.medium >= 3) {
    currentDifficultyKey = 'medium';
    currentDifficultyIndex = 2;
  } else if (gameProgress.medium >= 1) {
    currentDifficultyKey = 'medium';
    currentDifficultyIndex = 0;
  } else if (gameProgress.easy >= 3) {
    currentDifficultyKey = 'easy';
    currentDifficultyIndex = 2;
  } else if (gameProgress.easy >= 2) {
    currentDifficultyKey = 'easy';
    currentDifficultyIndex = 1;
  } else {
    currentDifficultyKey = 'easy';
    currentDifficultyIndex = 0;
  }

  diffButtons.forEach((btn) => {
    if (btn.dataset.diff === currentDifficultyKey) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  levelButtons.forEach((btn, index) => {
    if (index === currentDifficultyIndex) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  updateLevelButtons();
  updateDifficultyButtons();
  initGame(currentDifficultyKey, currentDifficultyIndex);
});


