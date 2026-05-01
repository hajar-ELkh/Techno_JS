// ============================================================
// POKÉMON MINI GAME - Node.js avec inquirer
// ============================================================
// Pour lancer : node index.js
// Pour installer : npm install inquirer@8 axios
// ============================================================

// ============================================================
// POKÉMON MINI GAME - Node.js avec inquirer + pokeapi.co
// Lance avec : node index.js
// Installe   : npm install inquirer@8 axios
// ============================================================

const inquirer = require("inquirer");
const axios    = require("axios");

const BASE_URL = "https://pokeapi.co/api/v2";

// ============================================================
// UTILITAIRES
// ============================================================

// sleep : pause X millisecondes (pour rendre le combat lisible)
// new Promise + setTimeout : crée une Promise qui se résout après X ms
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// APPELS API
// ============================================================

// Récupère la liste des 151 premiers Pokémon depuis l'API
async function fetchPokemonList() {
  console.log("\n⏳ Chargement de la liste des Pokémon depuis pokeapi.co...");
  // axios.get : requête HTTP GET
  // await     : attend la réponse avant de continuer
  const response = await axios.get(`${BASE_URL}/pokemon?limit=151`);
  // response.data.results = [{name:"bulbasaur", url:"..."}, ...]
  return response.data.results.map((p) => p.name);
}

// Récupère les détails d'un Pokémon : ses 5 moves avec puissance
async function fetchPokemonData(name) {
  console.log(`   • Chargement de ${name}...`);

  // 1) Infos générales du Pokémon
  const pokeRes = await axios.get(`${BASE_URL}/pokemon/${name}`);
  const pokeData = pokeRes.data;

  // pokeData.moves = tableau de TOUS les moves du Pokémon (souvent 50+)
  // On va chercher dans les 30 premiers ceux qui ont une puissance définie
  const movesWithPower = [];
  const movesToCheck = pokeData.moves.slice(0, 30);

  // for...of : boucle sur chaque move jusqu'à en avoir 5 avec puissance
  for (const moveEntry of movesToCheck) {
    if (movesWithPower.length >= 5) break;

    // Chaque move a une URL pour ses détails (puissance, précision, pp)
    const moveRes  = await axios.get(moveEntry.move.url);
    const moveData = moveRes.data;

    // On ne garde que les moves offensifs (power !== null)
    if (moveData.power !== null) {
      movesWithPower.push({
        name    : moveData.name,
        power   : moveData.power,
        accuracy: moveData.accuracy ?? 100, // ?? = si null/undefined → 100
        pp      : moveData.pp,
      });
    }
  }

  // Si malgré les 30 moves on n'en a pas 5, on complète avec tackle
  while (movesWithPower.length < 5) {
    movesWithPower.push({
      name    : `tackle-${movesWithPower.length + 1}`,
      power   : 40,
      accuracy: 100,
      pp      : 35,
    });
  }

  return {
    name : pokeData.name,
    moves: movesWithPower,
    hp   : 300,   // les deux joueurs commencent à 300 HP (règle du TP)
  };
}

// ============================================================
// LOGIQUE DE COMBAT
// ============================================================

// Calcule les dégâts d'une attaque en respectant les règles du TP :
//   1. Si move.pp < enemyPP  → attaque bloquée
//   2. Précision             → chance de rater
//   3. Dégâts                → power × facteur aléatoire ±20%
function calculateDamage(move, enemyPP) {
  // RÈGLE TP : pp du move < pp du move ennemi → pas d'attaque
  if (move.pp < enemyPP) {
    return { damage: 0, blocked: true, missed: false };
  }

  // PRÉCISION : Math.random()*100 donne un nombre entre 0 et 100
  // Si ce nombre > accuracy → l'attaque rate
  const roll = Math.random() * 100;
  if (roll > move.accuracy) {
    return { damage: 0, blocked: false, missed: true };
  }

  // DÉGÂTS : power * facteur entre 0.8 et 1.2
  // Math.floor : arrondit à l'entier inférieur
  const damage = Math.floor(move.power * (0.8 + Math.random() * 0.4));
  return { damage, blocked: false, missed: false };
}

// Le bot choisit un move au hasard parmi ses 5
function botChooseMove(pokemon) {
  const idx = Math.floor(Math.random() * pokemon.moves.length);
  return pokemon.moves[idx];
}

// ============================================================
// AFFICHAGE
// ============================================================

// Barre de vie visuelle : [████████████░░░░░░░░] 150/300
function makeHpBar(current, max) {
  const filled = Math.round((current / max) * 20);
  const empty  = 20 - filled;
  return "█".repeat(Math.max(0, filled)) + "░".repeat(Math.max(0, empty));
}

function displayStatus(player, bot) {
  console.log("\n" + "─".repeat(56));
  console.log(`🧑 ${player.name.toUpperCase().padEnd(12)} [${makeHpBar(player.hp, 300)}] ${String(player.hp).padStart(3)}/300`);
  console.log(`🤖 ${bot.name.toUpperCase().padEnd(12)} [${makeHpBar(bot.hp, 300)}] ${String(bot.hp).padStart(3)}/300`);
  console.log("─".repeat(56));
}

// ============================================================
// UN TOUR DE COMBAT
// ============================================================

async function playTurn(playerPokemon, botPokemon) {
  // --- Le joueur choisit son move avec inquirer ---
  // type:"list"  → liste navigable avec les flèches ↑↓ + Entrée
  // name         → clé de la réponse dans l'objet retourné
  // choices      → tableau d'options { name: affiché, value: retourné }
  const { moveIndex } = await inquirer.prompt([
    {
      type   : "list",
      name   : "moveIndex",
      message: "⚔️  Choisis ton attaque :",
      choices: playerPokemon.moves.map((move, i) => ({
        name : `${move.name.toUpperCase().padEnd(22)} | 💥 ${String(move.power).padStart(3)}  | 🎯 ${String(move.accuracy).padStart(3)}%  | PP: ${move.pp}`,
        value: i,
      })),
    },
  ]);

  const playerMove = playerPokemon.moves[moveIndex];   // move choisi par le joueur
  const botMove    = botChooseMove(botPokemon);         // move aléatoire du bot

  console.log(`\n🤖 Le bot choisit : ${botMove.name.toUpperCase()}`);
  await sleep(700);

  // --- Attaque du joueur sur le bot ---
  console.log(`\n🧑 ${playerPokemon.name.toUpperCase()} utilise ${playerMove.name.toUpperCase()} !`);
  // On passe botMove.pp comme "enemyPP" pour la règle des PP
  const pResult = calculateDamage(playerMove, botMove.pp);

  if (pResult.blocked)      console.log("   🚫 Attaque bloquée ! (PP du move < PP de l'ennemi)");
  else if (pResult.missed)  console.log("   💨 Attaque ratée !");
  else {
    console.log(`   💥 Dégâts infligés : ${pResult.damage} HP`);
    botPokemon.hp = Math.max(0, botPokemon.hp - pResult.damage);
  }

  await sleep(500);
  if (botPokemon.hp <= 0) return; // le bot est déjà KO, il n'attaque pas

  // --- Attaque du bot sur le joueur ---
  console.log(`\n🤖 ${botPokemon.name.toUpperCase()} utilise ${botMove.name.toUpperCase()} !`);
  const bResult = calculateDamage(botMove, playerMove.pp);

  if (bResult.blocked)      console.log("   🚫 Attaque bloquée ! (PP du move < PP de l'ennemi)");
  else if (bResult.missed)  console.log("   💨 Attaque ratée !");
  else {
    console.log(`   💥 Dégâts subis : ${bResult.damage} HP`);
    playerPokemon.hp = Math.max(0, playerPokemon.hp - bResult.damage);
  }

  await sleep(500);
}

// ============================================================
// FONCTION PRINCIPALE
// ============================================================

async function main() {
  console.clear();
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║      🎮  POKÉMON MINI GAME  —  NODE.JS        ║");
  console.log("║      Flèches ↑↓ pour naviguer, Entrée pour    ║");
  console.log("║      confirmer.                                ║");
  console.log("╚══════════════════════════════════════════════╝");

  // --- ÉTAPE 1 : Charger la liste des 151 Pokémon ---
  let pokemonList;
  try {
    pokemonList = await fetchPokemonList();
  } catch (err) {
    console.error("\n❌ Impossible de joindre pokeapi.co :", err.message);
    console.error("   Vérifie ta connexion internet et relance le jeu.");
    process.exit(1);
  }

  // --- ÉTAPE 2 : Le joueur choisit son Pokémon ---
  // inquirer retourne une Promise → await attend le choix du joueur
  const { chosenName } = await inquirer.prompt([
    {
      type    : "list",
      name    : "chosenName",
      message : "🎯 Choisis ton Pokémon :",
      choices : pokemonList,
      pageSize: 15,   // affiche 15 lignes à la fois (scrollable)
    },
  ]);

  // --- ÉTAPE 3 : Le bot choisit un Pokémon différent au hasard ---
  let botName;
  do {
    botName = pokemonList[Math.floor(Math.random() * pokemonList.length)];
  } while (botName === chosenName);

  console.log(`\n🤖 Le bot a choisi : ${botName.toUpperCase()}`);
  console.log("\n⏳ Chargement des moves depuis l'API (quelques secondes)...");

  // --- ÉTAPE 4 : Charger les données des deux Pokémon en parallèle ---
  // Promise.all : lance les deux requêtes EN MÊME TEMPS (plus rapide)
  let playerPokemon, botPokemon;
  try {
    [playerPokemon, botPokemon] = await Promise.all([
      fetchPokemonData(chosenName),
      fetchPokemonData(botName),
    ]);
  } catch (err) {
    console.error("\n❌ Erreur lors du chargement des moves :", err.message);
    process.exit(1);
  }

  // --- Affiche les moves du joueur ---
  console.log(`\n📋 TES MOVES (${playerPokemon.name.toUpperCase()}) :`);
  playerPokemon.moves.forEach((move, i) => {
    console.log(
      `   ${i + 1}. ${move.name.toUpperCase().padEnd(22)} | 💥 ${String(move.power).padStart(3)}  | 🎯 ${String(move.accuracy).padStart(3)}%  | PP: ${move.pp}`
    );
  });

  // --- ÉTAPE 5 : Confirmation avant de commencer ---
  // type:"confirm" = question Oui/Non, retourne un booléen
  const { ready } = await inquirer.prompt([
    {
      type   : "confirm",
      name   : "ready",
      message: "\nPrêt à commencer le combat ?",
      default: true,
    },
  ]);

  if (!ready) {
    console.log("👋 À bientôt !");
    return;
  }

  // --- ÉTAPE 6 : BOUCLE DE COMBAT ---
  // while : répète tant que les deux Pokémon ont encore des HP
  let turn = 1;
  while (playerPokemon.hp > 0 && botPokemon.hp > 0) {
    console.log(`\n\n🔄 ══════════ TOUR ${turn} ══════════`);
    displayStatus(playerPokemon, botPokemon);
    await playTurn(playerPokemon, botPokemon);
    turn++;
  }

  // --- ÉTAPE 7 : RÉSULTAT FINAL ---
  console.log("\n\n" + "═".repeat(56));
  if (playerPokemon.hp <= 0 && botPokemon.hp <= 0) {
    console.log("🤝 MATCH NUL ! Les deux Pokémon sont KO en même temps !");
  } else if (playerPokemon.hp <= 0) {
    console.log(`💀 ${playerPokemon.name.toUpperCase()} est KO... TU AS PERDU !`);
    console.log(`🏆 ${botPokemon.name.toUpperCase()} gagne avec ${botPokemon.hp} HP restants.`);
  } else {
    console.log(`🏆 ${playerPokemon.name.toUpperCase()} GAGNE ! Tu as battu le bot !`);
    console.log(`❤️  HP restants : ${playerPokemon.hp}/300`);
  }
  console.log("═".repeat(56));

  // --- ÉTAPE 8 : Rejouer ? ---
  const { playAgain } = await inquirer.prompt([
    {
      type   : "confirm",
      name   : "playAgain",
      message: "Veux-tu rejouer ?",
      default: true,
    },
  ]);

  if (playAgain) {
    await main(); // appel récursif = on recommence depuis le début
  } else {
    console.log("\n👋 Merci d'avoir joué ! À bientôt !\n");
    process.exit(0); // arrête proprement le programme
  }
}

// --- LANCEMENT ---
// .catch() attrape toute erreur non gérée dans main()
main().catch((err) => {
  console.error("\n❌ Erreur fatale :", err.message);
  process.exit(1);
});

 /**const inquirer = require("inquirer");
const axios = require("axios");

// ============================================================
// DONNÉES LOCALES (mock) — simule ce que retourne pokeapi.co
// ============================================================

const MOCK_POKEMON = {
  pikachu: {
    name: "pikachu",
    moves: [
      { name: "thunderbolt", power: 90, accuracy: 100, pp: 15 },
      { name: "quick-attack", power: 40, accuracy: 100, pp: 30 },
      { name: "iron-tail", power: 100, accuracy: 75, pp: 15 },
      { name: "electro-ball", power: 60, accuracy: 100, pp: 10 },
      { name: "thunder", power: 110, accuracy: 70, pp: 10 },
    ],
    hp: 300,
  },
  charmander: {
    name: "charmander",
    moves: [
      { name: "ember", power: 40, accuracy: 100, pp: 25 },
      { name: "flamethrower", power: 90, accuracy: 100, pp: 15 },
      { name: "scratch", power: 40, accuracy: 100, pp: 35 },
      { name: "fire-fang", power: 65, accuracy: 95, pp: 15 },
      { name: "dragon-rage", power: 80, accuracy: 100, pp: 10 },
    ],
    hp: 300,
  },
  bulbasaur: {
    name: "bulbasaur",
    moves: [
      { name: "vine-whip", power: 45, accuracy: 100, pp: 25 },
      { name: "razor-leaf", power: 55, accuracy: 95, pp: 25 },
      { name: "tackle", power: 40, accuracy: 100, pp: 35 },
      { name: "seed-bomb", power: 80, accuracy: 100, pp: 15 },
      { name: "solar-beam", power: 120, accuracy: 100, pp: 10 },
    ],
    hp: 300,
  },
  squirtle: {
    name: "squirtle",
    moves: [
      { name: "water-gun", power: 40, accuracy: 100, pp: 25 },
      { name: "bubble-beam", power: 65, accuracy: 100, pp: 20 },
      { name: "tackle", power: 40, accuracy: 100, pp: 35 },
      { name: "hydro-pump", power: 110, accuracy: 80, pp: 5 },
      { name: "aqua-tail", power: 90, accuracy: 90, pp: 10 },
    ],
    hp: 300,
  },
  gengar: {
    name: "gengar",
    moves: [
      { name: "shadow-ball", power: 80, accuracy: 100, pp: 15 },
      { name: "sludge-bomb", power: 90, accuracy: 100, pp: 10 },
      { name: "dark-pulse", power: 80, accuracy: 100, pp: 15 },
      { name: "psychic", power: 90, accuracy: 100, pp: 10 },
      { name: "hex", power: 65, accuracy: 100, pp: 10 },
    ],
    hp: 300,
  },
  mewtwo: {
    name: "mewtwo",
    moves: [
      { name: "psychic", power: 90, accuracy: 100, pp: 10 },
      { name: "psystrike", power: 100, accuracy: 100, pp: 10 },
      { name: "aura-sphere", power: 80, accuracy: 100, pp: 20 },
      { name: "ice-beam", power: 90, accuracy: 100, pp: 10 },
      { name: "hyper-beam", power: 150, accuracy: 90, pp: 5 },
    ],
    hp: 300,
  },
  eevee: {
    name: "eevee",
    moves: [
      { name: "tackle", power: 40, accuracy: 100, pp: 35 },
      { name: "quick-attack", power: 40, accuracy: 100, pp: 30 },
      { name: "bite", power: 60, accuracy: 100, pp: 25 },
      { name: "swift", power: 60, accuracy: 100, pp: 20 },
      { name: "last-resort", power: 140, accuracy: 100, pp: 5 },
    ],
    hp: 300,
  },
  snorlax: {
    name: "snorlax",
    moves: [
      { name: "body-slam", power: 85, accuracy: 100, pp: 15 },
      { name: "hyper-beam", power: 150, accuracy: 90, pp: 5 },
      { name: "earthquake", power: 100, accuracy: 100, pp: 10 },
      { name: "crunch", power: 80, accuracy: 100, pp: 15 },
      { name: "giga-impact", power: 150, accuracy: 90, pp: 5 },
    ],
    hp: 300,
  },
};

const POKEMON_LIST = Object.keys(MOCK_POKEMON);

// ============================================================
// UTILITAIRES
// ============================================================

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// ============================================================
// RÉCUPÉRATION DES DONNÉES
// ============================================================

async function fetchPokemonData(name) {
  if (MOCK_POKEMON[name]) {
    return deepCopy(MOCK_POKEMON[name]);
  }
  try {
    console.log(`\n⏳ Chargement de ${name} depuis l'API...`);
    const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${name}`);
    const data = response.data;
    const movesWithPower = [];
    const movesToCheck = data.moves.slice(0, 20);
    for (const moveEntry of movesToCheck) {
      if (movesWithPower.length >= 5) break;
      const moveResponse = await axios.get(moveEntry.move.url);
      const moveData = moveResponse.data;
      if (moveData.power !== null) {
        movesWithPower.push({
          name: moveData.name,
          power: moveData.power,
          accuracy: moveData.accuracy || 100,
          pp: moveData.pp,
        });
      }
    }
    while (movesWithPower.length < 5) {
      movesWithPower.push({ name: `tackle-${movesWithPower.length + 1}`, power: 40, accuracy: 100, pp: 35 });
    }
    return { name: data.name, moves: movesWithPower, hp: 300 };
  } catch (error) {
    console.log(`   ⚠️  API indisponible, données par défaut utilisées.`);
    return deepCopy(MOCK_POKEMON["pikachu"]);
  }
}

// ============================================================
// LOGIQUE DE COMBAT
// ============================================================

function calculateDamage(move, enemyPP) {
  if (move.pp < enemyPP) {
    return { damage: 0, missed: false, blocked: true };
  }
  const roll = Math.random() * 100;
  if (roll > move.accuracy) {
    return { damage: 0, missed: true, blocked: false };
  }
  const damage = Math.floor(move.power * (0.8 + Math.random() * 0.4));
  return { damage, missed: false, blocked: false };
}

function botChooseMove(pokemon) {
  const randomIndex = Math.floor(Math.random() * pokemon.moves.length);
  return pokemon.moves[randomIndex];
}

// ============================================================
// AFFICHAGE
// ============================================================

function makeHpBar(current, max) {
  const filled = Math.round((current / max) * 20);
  const empty = 20 - filled;
  return "█".repeat(Math.max(0, filled)) + "░".repeat(Math.max(0, empty));
}

function displayStatus(player, bot) {
  const playerBar = makeHpBar(player.hp, 300);
  const botBar = makeHpBar(bot.hp, 300);
  console.log("\n" + "─".repeat(54));
  console.log(`🧑 ${player.name.toUpperCase().padEnd(12)} HP: [${playerBar}] ${String(player.hp).padStart(3)}/300`);
  console.log(`🤖 ${bot.name.toUpperCase().padEnd(12)} HP: [${botBar}] ${String(bot.hp).padStart(3)}/300`);
  console.log("─".repeat(54));
}

// ============================================================
// UN TOUR
// ============================================================

async function playTurn(playerPokemon, botPokemon) {
  const { moveIndex } = await inquirer.prompt([
    {
      type: "list",
      name: "moveIndex",
      message: "⚔️  Choisis ton attaque :",
      choices: playerPokemon.moves.map((move, index) => ({
        name: `${move.name.toUpperCase().padEnd(20)} | 💥 ${String(move.power).padStart(3)}  | 🎯 ${String(move.accuracy).padStart(3)}%  | PP: ${move.pp}`,
        value: index,
      })),
    },
  ]);

  const playerMove = playerPokemon.moves[moveIndex];
  const botMove = botChooseMove(botPokemon);

  console.log(`\n🤖 Le bot choisit : ${botMove.name.toUpperCase()}`);
  await sleep(700);

  console.log(`\n🧑 ${playerPokemon.name.toUpperCase()} utilise ${playerMove.name.toUpperCase()} !`);
  const playerResult = calculateDamage(playerMove, botMove.pp);

  if (playerResult.blocked) {
    console.log("   🚫 Attaque bloquée ! (PP trop faibles vs l'ennemi)");
  } else if (playerResult.missed) {
    console.log("   💨 Attaque ratée !");
  } else {
    console.log(`   💥 Dégâts infligés : ${playerResult.damage} HP`);
    botPokemon.hp = Math.max(0, botPokemon.hp - playerResult.damage);
  }

  await sleep(500);
  if (botPokemon.hp <= 0) return;

  console.log(`\n🤖 ${botPokemon.name.toUpperCase()} utilise ${botMove.name.toUpperCase()} !`);
  const botResult = calculateDamage(botMove, playerMove.pp);

  if (botResult.blocked) {
    console.log("   🚫 Attaque bloquée ! (PP trop faibles vs l'ennemi)");
  } else if (botResult.missed) {
    console.log("   💨 Attaque ratée !");
  } else {
    console.log(`   💥 Dégâts subis : ${botResult.damage} HP`);
    playerPokemon.hp = Math.max(0, playerPokemon.hp - botResult.damage);
  }

  await sleep(500);
}

// ============================================================
// FONCTION PRINCIPALE
// ============================================================

async function main() {
  console.clear();
  console.log("╔════════════════════════════════════════════╗");
  console.log("║       🎮  POKÉMON MINI GAME  NODE.JS        ║");
  console.log("║       Flèches ↑↓ pour naviguer + Entrée     ║");
  console.log("╚════════════════════════════════════════════╝\n");

  const { chosenPokemonName } = await inquirer.prompt([
    {
      type: "list",
      name: "chosenPokemonName",
      message: "🎯 Choisis ton Pokémon :",
      choices: POKEMON_LIST.map((name) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: name,
      })),
    },
  ]);

  let botPokemonName;
  do {
    botPokemonName = POKEMON_LIST[Math.floor(Math.random() * POKEMON_LIST.length)];
  } while (botPokemonName === chosenPokemonName);

  console.log(`\n🤖 Le bot a choisi : ${botPokemonName.toUpperCase()}`);

  const [playerPokemon, botPokemon] = await Promise.all([
    fetchPokemonData(chosenPokemonName),
    fetchPokemonData(botPokemonName),
  ]);

  console.log(`\n📋 TES MOVES (${playerPokemon.name.toUpperCase()}) :`);
  playerPokemon.moves.forEach((move, i) => {
    console.log(`   ${i + 1}. ${move.name.toUpperCase().padEnd(20)} | 💥 ${String(move.power).padStart(3)}  | 🎯 ${String(move.accuracy).padStart(3)}%  | PP: ${move.pp}`);
  });

  const { ready } = await inquirer.prompt([
    {
      type: "confirm",
      name: "ready",
      message: "\nPrêt à commencer le combat ?",
      default: true,
    },
  ]);

  if (!ready) {
    console.log("👋 À bientôt !");
    return;
  }

  let turn = 1;
  while (playerPokemon.hp > 0 && botPokemon.hp > 0) {
    console.log(`\n\n🔄 ══════════ TOUR ${turn} ══════════`);
    displayStatus(playerPokemon, botPokemon);
    await playTurn(playerPokemon, botPokemon);
    turn++;
  }

  console.log("\n\n" + "═".repeat(54));
  if (playerPokemon.hp <= 0 && botPokemon.hp <= 0) {
    console.log("🤝 MATCH NUL ! Les deux Pokémon sont KO !");
  } else if (playerPokemon.hp <= 0) {
    console.log(`💀 ${playerPokemon.name.toUpperCase()} est KO... TU AS PERDU !`);
    console.log(`🏆 ${botPokemon.name.toUpperCase()} gagne avec ${botPokemon.hp} HP restants.`);
  } else {
    console.log(`🏆 ${playerPokemon.name.toUpperCase()} GAGNE ! Tu as battu le bot !`);
    console.log(`❤️  HP restants : ${playerPokemon.hp}/300`);
  }
  console.log("═".repeat(54));

  const { playAgain } = await inquirer.prompt([
    {
      type: "confirm",
      name: "playAgain",
      message: "Veux-tu rejouer ?",
      default: true,
    },
  ]);

  if (playAgain) {
    await main();
  } else {
    console.log("\n👋 Merci d'avoir joué ! À bientôt !\n");
    process.exit(0);
  }
}

main().catch((error) => {
  console.error("\n❌ Erreur :", error.message);
  process.exit(1);
}); */