import axios from "axios";
import fs from "fs/promises";

const queues = await axios.get("https://static.developer.riotgames.com/docs/lol/queues.json").then(res => res.data);
const maps = await axios.get("https://static.developer.riotgames.com/docs/lol/maps.json").then(res => res.data);
const gameModes = await axios.get("https://static.developer.riotgames.com/docs/lol/gameModes.json").then(res => res.data);
const gameTypes = await axios.get("https://static.developer.riotgames.com/docs/lol/gameTypes.json").then(res => res.data);
const now = new Date();

const output = 
`/*
    Generated on ${now.toISOString()}
*/

export const LAST_UPDATED = ${+now};
export const QUEUES = ${JSON.stringify(queues)} as const;
export const MAPS = ${JSON.stringify(maps)} as const;
export const GAME_MODES = ${JSON.stringify(gameModes)} as const;
export const GAME_TYPES = ${JSON.stringify(gameTypes)} as const;`;

await fs.writeFile("./src/game-constants.ts", output);