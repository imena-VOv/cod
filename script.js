let correctAnswerTimes = {}; // команда → общее время
let teams = [];
let currentTeamIndex = 0;
let teamScores = {};
let gameTimer;
let questionTimer;
let questionInterval; // 🔁 Глобальная переменная для контроля таймера вопроса
let globalTime = 0;
let questionTimeLimit = 0;

document.addEventListener("DOMContentLoaded", () => {
  const teamCountSelect = document.getElementById("teamCount");
  const teamNamesContainer = document.getElementById("teamNames");

  teamCountSelect.addEventListener("change", () => {
    const count = parseInt(teamCountSelect.value, 10);
    teamNamesContainer.innerHTML = "";

    for (let i = 1; i <= count; i++) {
      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = `Имя команды ${i}`;
      input.id = `teamName${i}`;
      input.required = true;
      input.style.margin = "5px 0";
      teamNamesContainer.appendChild(input);
    }
  });

  teamCountSelect.dispatchEvent(new Event("change"));
  
  const savedTeams = JSON.parse(localStorage.getItem("teams"));
  const savedScores = JSON.parse(localStorage.getItem("teamScores"));

  const hasValidProgress = savedTeams && savedTeams.length > 0 && savedScores;

  if (hasValidProgress) {
    // Прогресс есть — показываем блок продолжения
    document.getElementById("newGameBlock").classList.add("hidden");
    document.getElementById("continueBlock").classList.remove("hidden");
  } else {
    // Прогресса нет — прячем кнопку сброса
    document.getElementById("continueBlock").classList.add("hidden");
  }
});

function startGame() {
  
  const teamCount = parseInt(document.getElementById("teamCount").value, 10);
  const gameTimeMin = parseInt(document.getElementById("gameTime").value, 10);
  questionTimeLimit = parseInt(document.getElementById("questionTime").value, 10);
  
    if (gameTimeMin <= 0) {
  alert("Введите корректное время игры.");
  return;
  }

  const savedTeams = JSON.parse(localStorage.getItem("teams"));
  const savedScores = JSON.parse(localStorage.getItem("teamScores"));

  if (savedTeams && savedScores) {
    teams = savedTeams;
    teamScores = savedScores;
    renderScoreboard();
    globalTime = gameTimeMin * 60;
    startGlobalTimer();
    document.getElementById("setup").classList.add("hidden");
    document.getElementById("gameArea").classList.remove("hidden");
    renderThemes();
    return;
  }

  teams = [];
  teamScores = {};
  currentTeamIndex = 0;

  for (let i = 1; i <= teamCount; i++) {
    const name = document.getElementById(`teamName${i}`).value.trim() || `Команда ${i}`;
    teams.push(name);
    teamScores[name] = 0;
  }

  // ✅ Сохраняем только после заполнения
  localStorage.setItem("teams", JSON.stringify(teams));
  localStorage.setItem("teamScores", JSON.stringify(teamScores));

  renderScoreboard();
  globalTime = gameTimeMin * 60;
  startGlobalTimer();
  document.getElementById("setup").classList.add("hidden");
  document.getElementById("gameArea").classList.remove("hidden");
  renderThemes();
}

function startGlobalTimer() {
  const timerEl = document.getElementById("globalTimer");

  gameTimer = setInterval(() => {
    globalTime--;
    const min = Math.floor(globalTime / 60);
    const sec = globalTime % 60;
    timerEl.textContent = `Время игры: ${min}:${sec.toString().padStart(2, "0")}`;

    if (globalTime <= 0) {
  clearInterval(gameTimer);
  showStatsModal();
  }
  }, 1000);
}

function renderScoreboard() {
  const scoreboard = document.getElementById("scoreboard") || (() => {
    const sb = document.createElement("div");
    sb.id = "scoreboard";
    document.getElementById("gameArea").prepend(sb);
    return sb;
  })();

  // ✅ сохраняем имя текущей команды до сортировки
  const currentTeamName = teams[currentTeamIndex];

  // 📊 сортировка по очкам
  const sortedTeams = [...teams].sort((a, b) => teamScores[b] - teamScores[a]);

  // 🔁 сохраняем старые DOM-позиции (FLIP)
  const oldRects = {};
  scoreboard.querySelectorAll(".team-score").forEach(el => {
    oldRects[el.dataset.team] = el.getBoundingClientRect();
  });

  // 📌 Очищать DOM пока не будем — сначала пересортируем
  teams = [...sortedTeams];
  currentTeamIndex = teams.indexOf(currentTeamName);
  localStorage.setItem("teams", JSON.stringify(teams));
  localStorage.setItem("currentTeamIndex", currentTeamIndex);

  // 🔁 создаём новые DOM-элементы, но пока не анимируем
  const newElements = {};
  const fragment = document.createDocumentFragment();
  teams.forEach(team => {
    const el = document.createElement("div");
    el.className = "team-score" + (team === teams[currentTeamIndex] ? " current-turn-bg" : "");
    el.dataset.team = team;
    el.innerHTML = `${team}: ${teamScores[team]} очков`;
    newElements[team] = el;
    fragment.appendChild(el);
  });

  // 📌 добавляем новые элементы временно, чтобы получить их новые координаты
  scoreboard.innerHTML = ''; // теперь очищаем
  scoreboard.appendChild(fragment);

  // ▶️ запускаем FLIP-анимацию
  Object.entries(newElements).forEach(([team, el]) => {
    const newRect = el.getBoundingClientRect();
    const oldRect = oldRects[team];
    if (!oldRect) return;

    const dx = oldRect.left - newRect.left;
    const dy = oldRect.top - newRect.top;

    el.style.transform = `translate(${dx}px, ${dy}px)`;
    el.style.opacity = "0.5";

    requestAnimationFrame(() => {
      anime({
        targets: el,
        translateX: 0,
        translateY: 0,
        opacity: 1,
        duration: 600,
        easing: "easeOutCubic"
      });
    });
  });

  // 🔔 показать сообщение, если порядок изменился
  const prevOrder = scoreboard.dataset.prevOrder?.split(",") || [];
  scoreboard.dataset.prevOrder = teams.join(",");
  if (prevOrder.length && prevOrder.join(",") !== teams.join(",")) {
    const movedTeam = teams.find((t, i) => t !== prevOrder[i]);
    if (movedTeam) showRankChangePopup(movedTeam);
  }
}

function resetProgress() {
  localStorage.clear();
  location.reload();
}

const themes = Array.from({ length: 25 }, (_, i) => `Тема ${i + 1}`);
const difficulties = Array.from({ length: 25 }, (_, i) => (i + 1) * 10);
let usedQuestions = JSON.parse(localStorage.getItem("usedQuestions")) || {};

const themesDiv = document.getElementById("themes");
const difficultiesDiv = document.getElementById("difficulties");
const questionDiv = document.getElementById("question");

let currentThemeIndex = null;
let currentDifficulty = null;

function renderThemes() {
  themesDiv.innerHTML = '';
  themes.forEach((theme, index) => {
    const isDisabled = usedQuestions[`T${index}`]?.length >= difficulties.length;
    const cell = document.createElement('div');
    cell.className = 'cell';
    const span = document.createElement('span');
    span.textContent = theme;
    span.style.color = '#cb7205';
    span.style.fontFamily = 'Arial';
    span.style.fontSize = '40px';
    cell.appendChild(span);
    if (isDisabled) {
      cell.style.backgroundColor = '#aaa';
      cell.style.cursor = 'not-allowed';
    } else {
      cell.onclick = () => {
        currentThemeIndex = index;
        showDifficulties();
      };
    }
    themesDiv.appendChild(cell);
  });

  themesDiv.classList.remove('hidden');
  questionDiv.classList.remove('visible');
  questionDiv.classList.add('hidden');
  difficultiesDiv.classList.add('hidden');
  renderScoreboard();
}

function showDifficulties() {
  themesDiv.classList.add('hidden');
  difficultiesDiv.classList.remove('hidden');
  difficultiesDiv.innerHTML = '';

  const used = usedQuestions[`T${currentThemeIndex}`] || [];

  difficulties.forEach((level) => {
    const cell = document.createElement('div');
    cell.className = 'cell';
    const span = document.createElement('span');
    span.textContent = level;
    span.style.color = '#FF0000';
    span.style.fontFamily = 'Arial';
	span.style.fontSize = '70px';
    span.style.fontWeight = 'bold';
    cell.appendChild(span);
    if (used.includes(level)) {
      cell.classList.add('used');
      } else {
      cell.onclick = () => {
        currentDifficulty = level;
        showQuestion();
      };
    }

    difficultiesDiv.appendChild(cell);
  });
}

function showQuestion() {
  if (questionInterval) {
  clearInterval(questionInterval);
  questionInterval = null;
  }
  difficultiesDiv.classList.add('hidden');
  questionDiv.classList.remove('hidden');
  questionDiv.classList.add('visible');
  questionDiv.innerHTML = '';
  const teamTitle = document.createElement('div');
  teamTitle.textContent = `Ход команды: ${teams[currentTeamIndex]}`;
  const currentTeamName = teams[currentTeamIndex]; // зафиксировать команду
  const thisTeamIndex = currentTeamIndex; // (опционально, если нужен индекс)
  teamTitle.style.fontSize = '22px';
  teamTitle.style.fontWeight = 'bold';
  teamTitle.style.marginBottom = '20px';
  teamTitle.style.color = '#003366';
  localStorage.setItem("currentTeamIndex", currentTeamIndex);
  questionDiv.appendChild(teamTitle);


  const key = `T${currentThemeIndex}_D${currentDifficulty}`;
  const q = questions[key];

  const text = document.createElement('div');
  text.style.marginBottom = '20px';

  const span = document.createElement('span');
  span.textContent = q?.question || 'Вопрос не найден.';
  span.style.color = '#ad3434';
  span.style.fontFamily = 'Arial';
  span.style.fontSize = '40px';

  text.appendChild(span);
  questionDiv.appendChild(text);

  // Отрисовка изображения (если есть)
  const img = document.createElement('img');
img.style.maxWidth = '700x';
img.style.marginBottom = '20px';
img.style.border = '2px solid #ccc';
img.style.borderRadius = '8px';
img.style.display = 'none'; // по умолчанию скрыта

// Показать изображение вопроса, если оно есть
if (q?.image) {
  img.src = q.image;
  img.style.display = 'block';
  img.onerror = () => {
    img.style.display = 'none';
  };
}
questionDiv.appendChild(img);

  const questionTimerEl = document.getElementById("questionTimer");
questionTimerEl.classList.remove("hidden");

let timeLeft = questionTimeLimit;
const saved = JSON.parse(localStorage.getItem("activeQuestion"));

if (saved && saved.theme === currentThemeIndex && saved.difficulty === currentDifficulty) {
  const elapsed = Math.floor((Date.now() - saved.startTime) / 1000);
  timeLeft = Math.max(questionTimeLimit - elapsed, 0);
}

let questionStartTimestamp = Date.now(); // фиксируем старт

  if (questionInterval) {
  clearInterval(questionInterval);
  }

  if (timeLeft <= 0) {
  document.getElementById("questionTimer").textContent = 'Время вышло!';
  } else {
  document.getElementById("questionTimer").textContent = `Осталось на вопрос: ${timeLeft} сек.`;
  questionInterval = setInterval(() => {
    timeLeft--;
    if (timeLeft < 0) {
      clearInterval(questionInterval);
      document.getElementById("questionTimer").textContent = 'Время вышло!';
    } else {
      document.getElementById("questionTimer").textContent = `Осталось на вопрос: ${timeLeft} сек.`;
    }
  }, 1000);
  }

  const showAnswerButton = document.createElement('button');
  showAnswerButton.textContent = 'Узнать ответ';
  showAnswerButton.style.display = 'block';
  showAnswerButton.style.margin = '20px auto 0 auto';
  showAnswerButton.onclick = () => {
  text.innerHTML = '';
  const answerSpan = document.createElement('span');
  answerSpan.textContent = q?.answer || 'Ответ не найден.';
  answerSpan.style.color = '#ad3434';
  answerSpan.style.fontFamily = 'Arial';
  answerSpan.style.fontSize = '40px';
  text.appendChild(answerSpan);

  showAnswerButton.remove();
  questionTimerEl.classList.add("hidden");
  questionTimerEl.textContent = '';

  const btnCorrect = document.createElement('button');
  btnCorrect.textContent = 'Верно';
  btnCorrect.onclick = () => {
  teamScores[currentTeamName] += currentDifficulty;
  localStorage.setItem("teamScores", JSON.stringify(teamScores));

  const answerTime = Date.now() - questionStartTimestamp;
  if (!correctAnswerTimes[currentTeamName]) correctAnswerTimes[currentTeamName] = 0;
  correctAnswerTimes[currentTeamName] += answerTime;

  finishQuestion();
  };

  const btnWrong = document.createElement('button');
  btnWrong.textContent = 'Не верно';
  btnWrong.onclick = () => {
  teamScores[currentTeamName] -= currentDifficulty;
  localStorage.setItem("teamScores", JSON.stringify(teamScores));
  finishQuestion();
  };

  [btnCorrect, btnWrong].forEach(btn => {
    btn.style.padding = '10px 20px';
    btn.style.margin = '5px';
    btn.style.fontSize = '16px';
    btn.style.cursor = 'pointer';
    questionDiv.appendChild(btn);
  });
  
  // Заменить изображение, если есть картинка ответа
  if (q?.answerImage) {
  img.src = q.answerImage;
  img.style.display = 'block';
  img.onerror = () => {
    // если картинка ответа не загрузилась — остаётся картинка вопроса
    if (q.image) {
      img.src = q.image;
    } else {
      img.style.display = 'none';
    }
  };
  } else {
  // если нет картинки ответа, ничего не трогаем — остаётся картинка вопроса
  // если и её нет — скрываем
  if (!q.image) {
    img.style.display = 'none';
  }
 }
};

  questionDiv.appendChild(text);
  questionDiv.appendChild(showAnswerButton);
  
  const existingActive = JSON.parse(localStorage.getItem("activeQuestion"));
  if (
  !existingActive ||
  existingActive.theme !== currentThemeIndex ||
  existingActive.difficulty !== currentDifficulty
  ) {
  localStorage.setItem("activeQuestion", JSON.stringify({
    theme: currentThemeIndex,
    difficulty: currentDifficulty,
    startTime: Date.now()
  }));
  }


  if (!usedQuestions[`T${currentThemeIndex}`]) {
    usedQuestions[`T${currentThemeIndex}`] = [];
  }
}

function finishQuestion() {
  if (!usedQuestions[`T${currentThemeIndex}`].includes(currentDifficulty)) {
    usedQuestions[`T${currentThemeIndex}`].push(currentDifficulty);
    localStorage.setItem("usedQuestions", JSON.stringify(usedQuestions));
  }
  if (questionInterval) {
  clearInterval(questionInterval);
  questionInterval = null;
  }
  currentTeamIndex = (currentTeamIndex + 1) % teams.length;
  localStorage.setItem("currentTeamIndex", currentTeamIndex);
  localStorage.removeItem("activeQuestion");
  questionTimeLimit = parseInt(document.getElementById("questionTime").value, 10); // сброс лимита на случай, если он сбился
  document.getElementById("questionTimer").textContent = '';
  document.getElementById("questionTimer").classList.add("hidden");
  renderThemes();
}

function continueGame() {
  const savedTeams = JSON.parse(localStorage.getItem("teams"));
  const savedScores = JSON.parse(localStorage.getItem("teamScores"));
  
  const savedIndex = parseInt(localStorage.getItem("currentTeamIndex"), 10);
  if (!isNaN(savedIndex)) {
    currentTeamIndex = savedIndex;
  } else {
    currentTeamIndex = 0;
  }

  if (savedTeams && savedScores) {
    teams = savedTeams;
    teamScores = savedScores;
    renderScoreboard();
    globalTime = parseInt(document.getElementById("gameTime").value, 10) * 60;
    startGlobalTimer();
    document.getElementById("setup").classList.add("hidden");
    document.getElementById("gameArea").classList.remove("hidden");
    renderThemes();

    // 🔁 Восстановить текущий вопрос, если был
    const activeQuestion = JSON.parse(localStorage.getItem("activeQuestion"));
    if (activeQuestion) {
      currentThemeIndex = activeQuestion.theme;
      currentDifficulty = activeQuestion.difficulty;
    }

    renderThemes();

    if (activeQuestion) {
      showQuestion();
    }
  }
}

function showStatsModal() {
  const modal = document.getElementById("modal");
  const winnerEl = document.getElementById("winner");
  const scoreStatsEl = document.getElementById("scoreStats");
  const fastestEl = document.getElementById("fastestTeam");

  // 1. Победитель
  const winner = teams.reduce((a, b) =>
    teamScores[a] > teamScores[b] ? a : b
  );
  winnerEl.innerHTML = `🏆 Победитель:<br><strong style="color: #d48b43; font-size: 30px;">${winner}</strong>`;

  // 2. Очки всех команд
  const scoreList = teams.map(t => `${t}: ${teamScores[t]} очков`);
  scoreStatsEl.innerHTML = `<strong>Результаты:</strong><br>${scoreList.join("<br>")}`;

  // 3. Быстрейший игрок + статистика всех по времени
  if (Object.keys(correctAnswerTimes).length > 0) {
    const fastest = Object.entries(correctAnswerTimes).reduce((a, b) =>
      a[1] < b[1] ? a : b
    );

    const fastestMin = Math.floor(fastest[1] / 60000);
    const fastestSec = Math.floor((fastest[1] % 60000) / 1000);

    let timeStats = `<br><br><strong>⏱ Время команд на правильные ответы:</strong><br>`;
    teams.forEach(team => {
      const time = correctAnswerTimes[team] || 0;
      const min = Math.floor(time / 60000);
      const sec = Math.floor((time % 60000) / 1000);
      timeStats += `${team}: ${min} мин ${sec} сек<br>`;
    });

    fastestEl.innerHTML = `⚡ Быстрее всех отвечала команда:<br><strong>${fastest[0]}</strong> — <em>${fastestMin} мин ${fastestSec} сек</em> суммарно.${timeStats}`;
  } else {
    fastestEl.textContent = 'Никто не ответил правильно.';
  }

  modal.classList.remove("hidden");
}

