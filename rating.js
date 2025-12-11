const DIFFICULTY_NAMES = {
  easy: 'Лёгкий',
  medium: 'Средний',
  hard: 'Сложный'
};

const DIFFICULTY_COLORS = {
  easy: '#a7f3d0',
  medium: '#fbbf24',
  hard: '#fca5a5'
};

const ratingBody = document.getElementById('rating-body');
const filterButtons = document.querySelectorAll('.filter-btn');
const noResults = document.getElementById('no-results');

let currentFilter = 'all';

function loadRating() {
  const results = getStoredResults();
  const filteredResults = filterResults(results, currentFilter);

  if (filteredResults.length === 0) {
    ratingBody.innerHTML = '';
    noResults.style.display = 'block';
    return;
  }

  noResults.style.display = 'none';
  displayResults(filteredResults);
}

function getStoredResults() {
  try {
    const stored = localStorage.getItem('gameResults');
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Ошибка загрузки результатов:', e);
    return [];
  }
}

function filterResults(results, filter) {
  if (filter === 'all') {
    return results.sort((a, b) => b.score - a.score);
  }

  return results
    .filter(result => result.difficulty === filter)
    .sort((a, b) => b.score - a.score);
}

function displayResults(results) {
  ratingBody.innerHTML = '';

  results.forEach((result, index) => {
    const row = createResultRow(result, index + 1);
    ratingBody.appendChild(row);
  });
}

function createResultRow(result, rank) {
  const row = document.createElement('div');
  row.className = `table-row ${rank <= 3 ? 'top-3' : ''}`;

  const rankCell = document.createElement('div');
  rankCell.className = 'col-rank';
  rankCell.textContent = rank;

  const nameCell = document.createElement('div');
  nameCell.className = 'col-name';
  nameCell.textContent = result.playerName;

  const scoreCell = document.createElement('div');
  scoreCell.className = 'col-score';
  scoreCell.textContent = result.score;

  const timeCell = document.createElement('div');
  timeCell.className = 'col-time';
  timeCell.textContent = `${result.time.toFixed(1)}с`;

  const difficultyCell = document.createElement('div');
  difficultyCell.className = 'col-difficulty';
  difficultyCell.textContent = DIFFICULTY_NAMES[result.difficulty] || result.difficulty;
  difficultyCell.style.color = DIFFICULTY_COLORS[result.difficulty] || '#e2e8f0';

  const dateCell = document.createElement('div');
  dateCell.className = 'col-date';
  const date = new Date(result.timestamp);
  dateCell.textContent = date.toLocaleDateString('ru-RU') + ' ' + date.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'});

  row.appendChild(rankCell);
  row.appendChild(nameCell);
  row.appendChild(scoreCell);
  row.appendChild(timeCell);
  row.appendChild(difficultyCell);
  row.appendChild(dateCell);

  return row;
}

filterButtons.forEach(button => {
  button.addEventListener('click', () => {
    filterButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    currentFilter = button.dataset.difficulty;
    loadRating();
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const backBtn = document.querySelector('.nav-btn:not(.primary)');
  if (backBtn) {
    backBtn.addEventListener('click', (e) => {
      e.preventDefault();
      history.back();
    });
  }

  const clearRatingBtn = document.getElementById('clear-rating-btn');
  if (clearRatingBtn) {
    clearRatingBtn.addEventListener('click', () => {
      if (confirm('Вы уверены, что хотите очистить весь рейтинг? Это действие нельзя отменить.')) {
        localStorage.removeItem('gameResults');
        loadRating();
        alert('Рейтинг очищен!');
      }
    });
  }
});

window.addEventListener('load', loadRating);
window.addEventListener('focus', loadRating);
