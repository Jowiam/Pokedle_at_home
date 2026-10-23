const API_ROOT = "https://pokeapi.co/api/v2/pokemon";
const MAX_POKEMON = 386;
const state = {
  allNames: [],
  allPokemon: [],
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
  winBanner: document.querySelector("#win-banner"),
  winMessage: document.querySelector("#win-message"),
  winNewGame: document.querySelector("#win-new-game"),
  generationOptions: document.querySelector("#generation-options"),
};

function titleCase(name) {
  return name.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function showWinBanner() {
  elements.winMessage.textContent = `Du fant ${titleCase(state.target.name)} på ${state.guesses.length} ${state.guesses.length === 1 ? "forsøk" : "forsøk"}!`;
  elements.winBanner.hidden = false;
  elements.winBanner.classList.remove("celebrate");
  requestAnimationFrame(() => elements.winBanner.classList.add("celebrate"));
}

function setStatus(message, kind = "") {
  elements.status.textContent = message;
  elements.status.className = `status ${kind}`.trim();
}

function selectedGenerations() {
  return [...elements.generationOptions.querySelectorAll("input:checked")]
    .map((input) => Number(input.value));
}

function updatePokemonPool() {
  const selected = selectedGenerations();
  state.names = state.allNames.filter((name) => selected.includes(generationFromName(name)));
  elements.list.innerHTML = state.names
    .map((name) => `<option value="${titleCase(name)}"></option>`)
    .join("");
  return selected.length > 0;
}

function generationFromName(name) {
  const pokemon = state.allPokemon.find((entry) => entry.name === name);
  if (!pokemon) return 0;
  const id = Number(pokemon.url.split("/").filter(Boolean).pop());
  return generation(id);
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

async function getPokemon(name) {
  const cached = sessionStorage.getItem(`pokemon:${name}`);
  if (cached) return JSON.parse(cached);
  const response = await fetch(`${API_ROOT}/${name}`);
  if (!response.ok) throw new Error("Fant ikke denne Pokémonen.");
  const pokemon = await response.json();
  sessionStorage.setItem(`pokemon:${name}`, JSON.stringify(pokemon));
  return pokemon;
}

async function getSpecies(name) {
  const cacheKey = `species:${name}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) return JSON.parse(cached);
  const response = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${name}`);
  if (!response.ok) throw new Error("Fant ikke habitatet til denne Pokémonen.");
  const species = await response.json();
  sessionStorage.setItem(cacheKey, JSON.stringify(species));
  return species;
}

async function getEvolutionChain(url) {
  const cacheKey = `evolution-chain:${url}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) return JSON.parse(cached);
  const response = await fetch(url);
  if (!response.ok) throw new Error("Fant ikke evolusjonsdataene.");
  const chain = await response.json();
  sessionStorage.setItem(cacheKey, JSON.stringify(chain));
  return chain;
}

const habitatNames = {
  cave: "Cave",
  forest: "Forest",
  grassland: "Grassland",
  mountain: "Mountain",
  rare: "Rare",
  "rough-terrain": "Rough-terrain",
  sea: "Sea",
  urban: "Urban",
  "waters-edge": "Waters-edge",
};

function habitatName(species) {
  return habitatNames[species.habitat?.name] || "Unknown";
}

function evolutionStage(chain, pokemonName, stage = 1) {
  if (chain.species.name === pokemonName) return Math.min(stage, 3);
  for (const evolution of chain.evolves_to) {
    const result = evolutionStage(evolution, pokemonName, stage + 1);
    if (result) return result;
  }
  return 0;
}

function compareNumber(value, target, tolerance) {
  const kind = value === target
    ? "exact"
    : Math.abs(value - target) <= tolerance
      ? "close"
      : "miss";
  const direction = value < target ? "up" : value > target ? "down" : "";
  return { kind, direction };
}

function compareType(type, targetTypes, position) {
  if (type === targetTypes[position]) return "exact";
  if (type && targetTypes.includes(type)) return "close";
  return "miss";
}

function clue(value, kind) {
  return `<span class="clue ${kind}">${value}</span>`;
}

function numberClue(displayValue, comparisonValue, target, tolerance, label) {
  const comparison = compareNumber(comparisonValue, target, tolerance);
  const arrow = comparison.direction === "up" ? "↑" : comparison.direction === "down" ? "↓" : "";
  const directionText = comparison.direction === "up" ? "høyere" : "lavere";
  const direction = arrow ? ` aria-label="${label}; ${directionText}"` : "";
  return `<span class="clue ${comparison.kind}"${direction}>${displayValue}${arrow ? `<span class="direction" aria-hidden="true">${arrow}</span>` : ""}</span>`;
}

function generationClue(value, target) {
  const comparison = compareNumber(value, target, 0);
  const arrow = comparison.direction === "up" ? "↑" : comparison.direction === "down" ? "↓" : "";
  const directionText = comparison.direction === "up" ? "tidligere" : "senere";
  const direction = arrow ? ` aria-label="Generasjon ${value}; ${directionText} enn målet"` : "";
  return `<span class="clue ${comparison.kind}"${direction}>Gen. ${value}${arrow ? `<span class="direction" aria-hidden="true">${arrow}</span>` : ""}</span>`;
}

async function addGuess(pokemon) {
  const [guessSpecies, targetSpecies] = await Promise.all([
    getSpecies(pokemon.name),
    getSpecies(state.target.name),
  ]);
  const [guessChain, targetChain] = await Promise.all([
    getEvolutionChain(guessSpecies.evolution_chain.url),
    getEvolutionChain(targetSpecies.evolution_chain.url),
  ]);
  const targetTypes = state.target.types.map((entry) => entry.type.name);
  const types = pokemon.types.map((entry) => entry.type.name);
  const firstType = types[0] || "none";
  const secondType = types[1] || "none";
  const habitat = habitatName(guessSpecies);
  const targetHabitat = habitatName(targetSpecies);
  const stage = evolutionStage(guessChain.chain, pokemon.name);
  const targetStage = evolutionStage(targetChain.chain, state.target.name);
  const stageComparison = compareNumber(stage, targetStage, 0);
  const stageArrow = stageComparison.direction === "up" ? "↑" : stageComparison.direction === "down" ? "↓" : "";
  const stageDirection = stageArrow
    ? ` aria-label="Utviklingsstadium ${stage}; ${stageComparison.direction === "up" ? "tidligere" : "senere"} enn målet"`
    : "";
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${titleCase(pokemon.name)}</td>
    <td><img class="guess-sprite" src="${pokemon.sprites.front_default || ""}" alt="${titleCase(pokemon.name)}" /></td>
    <td>${generationClue(generation(pokemon.id), generation(state.target.id))}</td>
    <td>${clue(titleCase(firstType), compareType(types[0], targetTypes, 0))}</td>
    <td>${clue(titleCase(secondType), compareType(types[1], targetTypes, 1))}</td>
    <td>${numberClue(`${pokemon.height / 10} m`, pokemon.height, state.target.height, 3, "Høyde")}</td>
    <td>${numberClue(`${pokemon.weight / 10} kg`, pokemon.weight, state.target.weight, 30, "Vekt")}</td>
    <td>${clue(habitat, habitat === targetHabitat ? "exact" : "miss")}</td>
    <td><span class="clue ${stageComparison.kind}"${stageDirection}>Stage ${stage}${stageArrow ? `<span class="direction" aria-hidden="true">${stageArrow}</span>` : ""}</span></td>`;
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
  elements.rounds.textContent = `${state.played} ${state.played === 1 ? "runde" : "runder"} spilt`;
}

async function submitGuess(event) {
  event.preventDefault();
  if (state.locked) return;
  const name = elements.input.value.trim().toLowerCase().replaceAll(" ", "-");
  if (!name || state.guesses.includes(name)) {
    setStatus(name ? "Du har allerede prøvd denne Pokémonen." : "Skriv inn et Pokémon-navn først.", "error");
    return;
  }
  if (!state.names.includes(name)) {
    setStatus("Denne Pokémonen er ikke med i de valgte generasjonene.", "error");
    return;
  }
  elements.button.disabled = true;
  try {
    const pokemon = await getPokemon(name);
    state.guesses.push(name);
    await addGuess(pokemon);
    elements.input.value = "";
    if (pokemon.name === state.target.name) {
      setStatus(`Riktig! Det var ${titleCase(state.target.name)}. Start en ny runde når du vil.`, "success");
      finish(true);
      showWinBanner();
    } else {
      setStatus("Ikke helt. Bruk ledetrådene for å finne riktig Pokémon.");
      elements.button.disabled = false;
    }
  } catch (error) {
    setStatus(error.message, "error");
    elements.button.disabled = false;
  }
}

async function newGame() {
  if (!state.names.length) {
    setStatus("Velg minst én generasjon for å starte en runde.", "error");
    return;
  }
  elements.input.disabled = true;
  elements.button.disabled = true;
  setStatus("Gjør klar en ny Pokémon ...");
  try {
    const targetName = state.names[Math.floor(Math.random() * state.names.length)];
    state.target = await getPokemon(targetName);
    state.guesses = [];
    state.locked = false;
    state.round += 1;
    localStorage.setItem("pokeguess-round", state.round);
    elements.round.textContent = state.round;
    elements.guesses.innerHTML = '<tr id="empty-state"><td colspan="9">Forslagene dine vises her.</td></tr>';
    elements.winBanner.hidden = true;
    elements.winBanner.classList.remove("celebrate");
    elements.input.value = "";
    elements.input.disabled = false;
    elements.button.disabled = false;
    setStatus("En ny Pokémon er klar. Lykke til!");
    elements.input.focus();
  } catch (error) {
    setStatus(`Kunne ikke gjøre klar en ny runde: ${error.message}`, "error");
  }
}

async function start() {
  elements.round.textContent = state.round;
  elements.streak.textContent = state.streak;
  elements.rounds.textContent = `${state.played} ${state.played === 1 ? "runde" : "runder"} spilt`;
  try {
    const response = await fetch(`${API_ROOT}?limit=${MAX_POKEMON}`);
    if (!response.ok) throw new Error("PokéAPI er ikke tilgjengelig akkurat nå.");
    const data = await response.json();
    state.allPokemon = data.results;
    state.allNames = data.results.map((pokemon) => pokemon.name);
    updatePokemonPool();
    await newGame();
  } catch (error) {
    setStatus(`${error.message} Sjekk internettilkoblingen og last inn siden på nytt.`, "error");
  }
}

elements.form.addEventListener("submit", submitGuess);
elements.newGame.addEventListener("click", newGame);
elements.winNewGame.addEventListener("click", newGame);
elements.generationOptions.addEventListener("change", async () => {
  if (updatePokemonPool()) {
    await newGame();
  } else {
    elements.input.disabled = true;
    elements.button.disabled = true;
    setStatus("Velg minst én generasjon for å starte en runde.", "error");
  }
});
start();
