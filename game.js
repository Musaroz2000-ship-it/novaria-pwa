"use strict";

const SAVE_KEY = "novaria-save-v1";
const FOOD_PRICE = 12;
const WORK_PAY = 28;

function newGame() {
  return {
    version: 1,
    day: 1,
    hour: 8,
    player: {
      name: "Алексей Новарин",
      money: 40,
      debt: 0,
      health: 100,
      energy: 75,
      hunger: 70,
      reputation: 0
    },
    log: [{
      day: 1,
      hour: 8,
      text: "Вы приехали в Новарию и нашли комнату в Пристанском районе."
    }]
  };
}

function loadGame() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));

    if (
      saved &&
      saved.version === 1 &&
      saved.player &&
      Array.isArray(saved.log) &&
      Number.isFinite(saved.day)
    ) {
      return saved;
    }
  } catch (error) {
    console.warn("Сохранение не прочитано; начинается новая игра.", error);
  }

  return newGame();
}

let game = loadGame();

const byId = (id) => document.getElementById(id);
const clamp = (n) => Math.max(0, Math.min(100, n));
const cash = (n) => `${Math.round(n).toLocaleString("ru-RU")} ₵`;

function record(text) {
  game.log.unshift({
    day: game.day,
    hour: game.hour,
    text
  });

  game.log = game.log.slice(0, 40);
}

function passTime(hours) {
  for (let i = 0; i < hours; i++) {
    game.hour += 1;
    game.player.hunger = clamp(game.player.hunger - 2);

    if (game.hour >= 24) {
      game.hour = 0;
      game.day += 1;
      record("Наступил новый день.");
    }

    if (game.player.hunger === 0) {
      game.player.health = clamp(game.player.health - 2);
    }
  }
}

function render() {
  const p = game.player;

  byId("day").textContent = game.day;
  byId("money").textContent = cash(p.money);
  byId("net-worth").textContent = cash(p.money - p.debt);

  byId("health-label").textContent = `${p.health}%`;
  byId("energy-label").textContent = `${p.energy}%`;
  byId("hunger-label").textContent = `${p.hunger}%`;

  byId("health-meter").style.width = `${p.health}%`;
  byId("energy-meter").style.width = `${p.energy}%`;
  byId("hunger-meter").style.width = `${p.hunger}%`;

  byId("reputation").textContent = p.reputation;

  const list = byId("log");
  list.replaceChildren();

  for (const entry of game.log.slice(0, 8)) {
    const li = document.createElement("li");
    const time = document.createElement("time");
    const text = document.createElement("span");

    time.textContent =
      `День ${entry.day}, ${String(entry.hour).padStart(2, "0")}:00`;

    text.textContent = entry.text;

    li.append(time, text);
    list.append(li);
  }

  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(game));
  } catch (error) {
    console.error("Не удалось сохранить игру.", error);
    notify("Браузер не смог сохранить прогресс на устройстве.");
  }
}

function notify(message) {
  byId("notice").textContent = message;
}

function act(action) {
  const p = game.player;

  if (action === "work") {
    if (p.energy < 15) {
      notify("Слишком мало энергии для смены. Сначала отдохните.");
      return;
    }

    p.money += WORK_PAY;
    p.energy = clamp(p.energy - 25);

    passTime(4);

    record(`Вы отработали смену и получили ${cash(WORK_PAY)}.`);
    notify(`Смена завершена. Получено ${cash(WORK_PAY)}.`);
  }

  else if (action === "food") {
    if (p.money < FOOD_PRICE) {
      notify("Не хватает денег на еду. Попробуйте сначала подработать.");
      return;
    }

    p.money -= FOOD_PRICE;
    p.hunger = clamp(p.hunger + 38);

    passTime(1);

    record(`Вы купили еду за ${cash(FOOD_PRICE)}.`);
    notify("Вы поели. Сытость восстановлена.");
  }

  else if (action === "rest") {
    passTime(8);

    p.energy = clamp(p.energy + 55);
    p.health = clamp(p.health + 5);

    record("Вы отдохнули и восстановили силы.");
    notify("После отдыха стало легче.");
  }

  render();
}

document.querySelectorAll("[data-action]").forEach((button) => {
  button.addEventListener("click", () => {
    act(button.dataset.action);
  });
});

byId("reset-button").addEventListener("click", () => {
  if (!window.confirm("Удалить текущее сохранение и начать заново?")) {
    return;
  }

  game = newGame();
  notify("Новая игра началась.");
  render();
});

function updateConnection() {
  byId("connection").textContent = navigator.onLine
    ? "Онлайн"
    : "Офлайн · прогресс сохранён";
}

window.addEventListener("online", updateConnection);
window.addEventListener("offline", updateConnection);

let deferredInstallPrompt = null;

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  byId("install-button").hidden = false;
});

byId("install-button").addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;

  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;

  deferredInstallPrompt = null;
  byId("install-button").hidden = true;
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch((error) => {
    console.error(
      "Не удалось зарегистрировать офлайн-режим:",
      error
    );
  });
}

updateConnection();
render();