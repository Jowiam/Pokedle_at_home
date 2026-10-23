const API_ROOT = "https://pokeapi.co/api/v2/pokemon";
const MAX_POKEMON = 1025;
const state = {
  names: [],
  target: null,
  guesses: [],
  round: Number(localStorage.getItem("pokeguess-round") || 1),
  streak: Number(localStorage.getItem("pokeguess-streak") || 0),
  played: Number(localStorage.getItem("pokeguess-played") || 0),
  locked: false,
};

const elements = {
  form: document.querySelector("#guess-form"),
  input: document.querySelector("#guess-input"),
  button: document.querySelector("#guess-button"),
  list: document.querySelector("#pokemon-list"),
  guesses: document.querySelector("#guesses"),
  empty: document.querySelector("#empty-state"),
  status: document.querySelector("#status"),
  round: document.querySelector("#round-number"),
  streak: document.querySelector("#streak"),
  rounds: document.querySelector("#round-count"),
  newGame: document.querySelector("#new-game"),
};

function titleCase(name) {
  return name.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function setStatus(message, kind = "") {
  elements.status.textContent = message;
  elements.status.className = `status ${kind}`.trim();
}

function generation(id) {
  if (id <= 151) return 1;
  if (id <= 251) return 2;
  if (id <= 386) return 3;
  if (id <= 493) return 4;
  if (id <= 649) return 5;
  if (id <= 721) return 6;
  if (id <= 809) return 7;
  if (id <= 905) return 8;
  return 9;
}

function statTotal(pokemon) {
  return pokemon.stats.reduce((sum, stat) => sum + stat.base_stat, 0);
}

async function getPokemon(name) {
  const cached = sessionStorage.getItem(`pokemon:${name}`);
  if (cached) return JSON.parse(cached);
  const response = await fetch(`${API_ROOT}/${name}`);
  if (!response.ok) throw new Error("Pokémon could not be found.");
  const pokemon = await response.json();
  sessionStorage.setItem(`pokemon:${name}`, JSON.stringify(pokemon));
  return pokemon;
}

function compareNumber(value, target, tolerance) {
  if (value === target) return "exact";
  return Math.abs(value - target) <= tolerance ? "close" : "miss";
}

function compareTypes(types, targetTypes) {
  const matches = types.filter((type) => targetTypes.includes(type)).length;
  if (matches === targetTypes.length && types.length === targetTypes.length) return "exact";
  return matches ? "close" : "miss";
}

function clue(value, kind) {
  return `<span class="clue ${kind}">${value}</span>`;
}

function addGuess(pokemon) {
  const targetTypes = state.target.types.map((entry) => entry.type.name);
  const types = pokemon.types.map((entry) => entry.type.name);
  const total = statTotal(pokemon);
  const targetTotal = statTotal(state.target);
  const row = document.createElement("tr");
  row.innerHTML = `
    <td><span class="pokemon-cell"><img src="${pokemon.sprites.front_default || ""}" alt="" />${titleCase(pokemon.name)}</span></td>
    <td>${clue(`Gen ${generation(pokemon.id)}`, generation(pokemon.id) === generation(state.target.id) ? "exact" : "miss")}</td>
    <td>${clue(types.join(" / "), compareTypes(types, targetTypes))}</td>
    <td>${clue(`${pokemon.height / 10} m`, compareNumber(pokemon.height, state.target.height, 3))}</td>
    <td>${clue(`${pokemon.weight / 10} kg`, compareNumber(pokemon.weight, state.target.weight, 30))}</td>
    <td>${clue(total, compareNumber(total, targetTotal, 40))}</td>`;
  elements.empty?.remove();
  elements.guesses.prepend(row);
}

function finish(won) {
  state.locked = true;
  state.played += 1;
  state.streak = won ? state.streak + 1 : 0;
  localStorage.setItem("pokeguess-played", state.played);
  localStorage.setItem("pokeguess-streak", state.streak);
  elements.input.disabled = true;
  elements.button.disabled = true;
  elements.streak.textContent = state.streak;
  elements.rounds.textContent = `${state.played} ${state.played === 1 ? "round" : "rounds"} played`;
}

async function submitGuess(event) {
  event.preventDefault();
  if (state.locked) return;
  const name = elements.input.value.trim().toLowerCase().replaceAll(" ", "-");
  if (!name || state.guesses.includes(name)) {
    setStatus(name ? "You already tried that Pokémon." : "Enter a Pokémon name first.", "error");
    return;
  }
  elements.button.disabled = true;
  try {
    const pokemon = await getPokemon(name);
    state.guesses.push(name);
    addGuess(pokemon);
    elements.input.value = "";
    if (pokemon.name === state.target.name) {
      setStatus(`Correct! It was ${titleCase(state.target.name)}. Start another round whenever you like.`, "success");
      finish(true);
    } else {
      setStatus("Not quite. Use the clues to narrow it down.");
      elements.button.disabled = false;
    }
  } catch (error) {
    setStatus(error.message, "error");
    elements.button.disabled = false;
  }
}

function newGame() {
  if (!state.names.length) return;
  state.target = state.names[Math.floor(Math.random() * state.names.length)];
  state.guesses = [];
  state.locked = false;
  state.round += 1;
  localStorage.setItem("pokeguess-round", state.round);
  elements.round.textContent = state.round;
  elements.guesses.innerHTML = '<tr id="empty-state"><td colspan="6">Your guesses will appear here.</td></tr>';
  elements.input.value = "";
  elements.input.disabled = false;
  elements.button.disabled = false;
  setStatus("A fresh Pokémon is ready. Good luck!");
  elements.input.focus();
}

async function start() {
  elements.round.textContent = state.round;
  elements.streak.textContent = state.streak;
  elements.rounds.textContent = `${state.played} ${state.played === 1 ? "round" : "rounds"} played`;
  try {
    const response = await fetch(`${API_ROOT}?limit=${MAX_POKEMON}`);
    if (!response.ok) throw new Error("PokéAPI is unavailable right now.");
    const data = await response.json();
    state.names = data.results.map((pokemon) => pokemon.name);
    elements.list.innerHTML = state.names.map((name) => `<option value="${titleCase(name)}"></option>`).join("");
    newGame();
  } catch (error) {
    setStatus(`${error.message} Check your connection and refresh the page.`, "error");
  }
}

elements.form.addEventListener("submit", submitGuess);
elements.newGame.addEventListener("click", newGame);
start();
