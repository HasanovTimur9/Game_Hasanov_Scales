const loginForm = document.getElementById('login-form');
const playerNameInput = document.getElementById('player-name');

window.addEventListener('load', () => {
  const savedName = localStorage.getItem('playerName');
  if (savedName) {
    playerNameInput.value = savedName;
  }
});

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const playerName = playerNameInput.value.trim();

  if (playerName.length === 0) {
    showMessage('Пожалуйста, введите ваше имя', 'error');
    return;
  }

  if (playerName.length > 20) {
    showMessage('Имя не должно превышать 20 символов', 'error');
    return;
  }

  localStorage.setItem('playerName', playerName);
  window.location.href = 'index.html';
});

function showMessage(text, type) {
  const existingMessage = document.querySelector('.message');
  if (existingMessage) {
    existingMessage.remove();
  }

  const message = document.createElement('div');
  message.className = `message ${type}`;
  message.textContent = text;

  loginForm.appendChild(message);
  message.style.display = 'block';

  setTimeout(() => {
    message.style.display = 'none';
  }, 3000);
}
