import { AxiosError } from "axios";
import { httpGet, isPatchNewerOrEqual } from "./util.js";

var DataStorage: Hasagi.Data.DataStorage = {}

function getData(patch: string, language: string) {
    if (!DataStorage[patch])
        DataStorage[patch] = {}

    if (!DataStorage[patch][language])
        DataStorage[patch][language] = {}

    return DataStorage[patch][language];
}

class DataDownloadError extends Error {
    constructor(message: string, public requestError: Error | AxiosError) {
        super(message);
    }
}

var defaultLanguage: Hasagi.LanguageCode = "en_US";
var defaultPatch: string | null = null;

function getDefaultPatch() {
    if (!defaultPatch)
        throw new Error("Patch parameter not provided and no default patch was selected.")

    return defaultPatch;
}

const Data = {
    getDataDragonURL: (patch: string, language: Hasagi.LanguageCode, file = "") => `https://ddragon.leagueoflegends.com/cdn/${patch}/data/${language}/${file}`,
    getImageURL: (patch: string, file = "") => `https://ddragon.leagueoflegends.com/cdn/${patch}/img/${file}`,
    getGameConstantsURL: (file: string = "") => `https://static.developer.riotgames.com/docs/lol/${file}`,

    setDefaultLanguage(language: Hasagi.LanguageCode) {
        defaultLanguage = language;
    },
    setDefaultPatch(patch: string) {
        defaultPatch = patch;
    },

    getDataObject(): Hasagi.Data.DataStorage {
        return DataStorage;
    },
    loadData(data: Hasagi.Data.DataStorage) {
        DataStorage = data;
    },

    /**
     * @param patch All data from BEFORE this patch will be deleted
     */
    deleteOldData(patch: string) {
        Object.keys(DataStorage).forEach(key => {
            if (isPatchNewerOrEqual(key, patch))
                return;

            delete DataStorage[key];
        })
    },

    async getLatestPatch(region: Hasagi.ServerRegion) {
        let latest: string;
        try {
            latest = await httpGet<string>(`https://ddragon.leagueoflegends.com/realms/${region}.json`, res => JSON.parse(res).dd);
        } catch (err: any) {
            throw new DataDownloadError("Unable to get latest patch.", err);
        }

        return latest;
    },

    async loadAllData(options: Hasagi.Data.LoadOptions){
        await Promise.all([
            loadAllChampions(options),
            loadAllSummonerSpells(options),
            loadAllRunes(options),
            loadAllQueues(options),
            loadAllMaps(options),
            loadAllGameModes(options),
            loadAllGameTypes(options)
        ]);
    },

    loadAllChampions,
    getAllChampions,
    getChampion,

    loadAllSummonerSpells,
    getAllSummonerSpells,

    loadAllRunes,
    getAllRunes,
    getRune,
    getRuneTree,
    getRuneTreeByRune,

    loadAllQueues,
    getAllQueues,
    getQueue,
    getQueuesByMap,

    loadAllMaps,
    getAllMaps,
    getMap,

    loadAllGameModes,
    getAllGameModes,

    loadAllGameTypes,
    getAllGameTypes,
}

export default Data;

/**
 * Gets all champions
 * @throws {Error} if champion data was not loaded for the specified patch and language
 */
function getAllChampions(options?: Hasagi.Data.LoadOptions) {
    const patch = options?.patch ?? getDefaultPatch();
    const language = options?.language ?? defaultLanguage;

    const champions = getData(patch, language).Champions
    if (champions === undefined)
        throw new Error(`Champion data is not stored. (${patch}/${language})`);

    return champions;
}

/**
 * Load the data of all champions for the specified patch and language
 * @param data If provided, loads this data instead of downloading it
 */
async function loadAllChampions(options: Hasagi.Data.LoadOptions = {}, data?: Hasagi.Champion[]) {
    const patch = options?.patch ?? getDefaultPatch();
    const language = options?.language ?? defaultLanguage;

    if (data) {
        DataStorage[patch][language].Champions = data;
        return;
    }

    const champions = await httpGet<Hasagi.Champion[]>(Data.getDataDragonURL(patch, language, "championFull.json"), res => Object.values(JSON.parse(res).data))
        .then(champions => { return champions }, err => {
            throw new DataDownloadError("Unable to load champions.", err)
        })

    DataStorage[patch][language].Champions = champions;
}
/**
 * @param identifier Can be the name, key or id
 * @throws {Error} if champion data was not loaded for the specified patch and language
 */
function getChampion(identifier: string | number, options?: Hasagi.Data.LoadOptions) {
    const champions = getAllChampions(options);

    if (!isNaN(identifier as any)) {
        return champions.find(champion => champion.key == identifier) ?? null;
    } else {
        return champions.find(champion => champion.id === identifier || champion.name === identifier) ?? null;
    }
}

/**
 * Gets all summoner spells
 * @throws {Error} if summoner spell data was not loaded for the specified patch and language
 */
function getAllSummonerSpells(options?: Hasagi.Data.LoadOptions) {
    const patch = options?.patch ?? getDefaultPatch();
    const language = options?.language ?? defaultLanguage;

    const summonerSpells = getData(patch, language).SummonerSpells
    if (summonerSpells === undefined)
        throw new Error(`Summoner spell data is not stored. (${patch}/${language})`);

    return summonerSpells;
}
/**
 * Load the data of all summoner spells for the specified patch and language
 * @param data If provided, loads this data instead of downloading it
 */
async function loadAllSummonerSpells(options?: Hasagi.Data.LoadOptions, data?: Hasagi.SummonerSpell[]) {
    const patch = options?.patch ?? getDefaultPatch();
    const language = options?.language ?? defaultLanguage;

    if (data) {
        DataStorage[patch][language].SummonerSpells = data;
        return;
    }

    const summonerSpells = await httpGet<Hasagi.SummonerSpell[]>(Data.getDataDragonURL(patch, language, "summoner.json"), res => Object.values(JSON.parse(res).data))
        .then(summonerSpells => { return summonerSpells; }, err => {
            throw new DataDownloadError("Unable to load summoner spells.", err)
        })

    DataStorage[patch][language].SummonerSpells = summonerSpells;
}

/**
 * Gets all runes
 * @throws {Error} if rune data was not loaded for the specified patch and language
 */
function getAllRunes(options?: Hasagi.Data.LoadOptions) {
    const patch = options?.patch ?? getDefaultPatch();
    const language = options?.language ?? defaultLanguage;

    const runes = getData(patch, language).Runes
    if (runes === undefined)
        throw new Error(`Rune data is not stored. (${patch}/${language})`);

    return runes;
}
/**
 * Load the data of all runes for the specified patch and language
 * @param data If provided, loads this data instead of downloading it
 */
async function loadAllRunes(options?: Hasagi.Data.LoadOptions, data?: Hasagi.RuneTree[]) {
    const patch = options?.patch ?? getDefaultPatch();
    const language = options?.language ?? defaultLanguage;

    if (data) {
        DataStorage[patch][language].Runes = data;
        return;
    }

    const runes = await httpGet<Hasagi.RuneTree[]>(Data.getDataDragonURL(patch, language, "runesReforged.json"))
        .then(runes => { return runes; }, err => {
            throw new DataDownloadError("Unable to load runes.", err)
        })

    DataStorage[patch][language].Runes = runes;
}
/**
 * @param identifier Name or id
 * @throws {Error} if rune data was not loaded for the specified patch and language
 */
function getRune(identifier: string | number, options?: Hasagi.Data.LoadOptions) {
    const runes = getAllRunes(options);
    var predicate: (rune: Hasagi.Rune) => boolean;

    if (!isNaN(identifier as any)) {
        predicate = rune => rune.id == identifier;
    } else {
        predicate = rune => rune.key == identifier || rune.name == identifier;
    }

    for (const runeTree of runes) {
        for (const runeSlot of runeTree.slots) {
            let rune = runeSlot.runes.find(predicate);
            if (rune !== undefined) return rune;
        }
    }

    return null;
}
/**
 * @param identifier Name, id or key
 * @throws {Error} if rune data was not loaded for the specified patch and language
 */
function getRuneTree(identifier: string | number, options?: Hasagi.Data.LoadOptions) {
    const runes = getAllRunes(options)
    var predicate: (runeTree: Hasagi.RuneTree) => boolean;

    if (!isNaN(identifier as any)) {
        predicate = runeTree => runeTree.id == identifier;
    } else {
        predicate = runeTree => runeTree.key == identifier || runeTree.name == identifier;
    }

    return runes.find(predicate) ?? null;
}
/**
 * @param rune Hasagi.Rune, name, id or key
 * @throws {Error} if rune data was not loaded for the specified patch and language
 */
function getRuneTreeByRune(rune: Hasagi.Rune | string | number, options?: Hasagi.Data.LoadOptions) {
    if (typeof rune === "string" || typeof rune === "number") {
        let r = getRune(rune, options)
        if (r === null)
            return null;

        rune = r;
    }

    for (let runeTree of getAllRunes(options)) {
        for (let runeSlot of runeTree.slots) {
            for (let r of runeSlot.runes) {
                if (r.id === rune.id) {
                    return runeTree;
                }
            }
        }
    }

    return null;
}

/**
 * Gets all queues
 * @throws {Error} if queue data was not loaded for the specified patch and language
 */
function getAllQueues(options?: Hasagi.Data.LoadOptions) {
    const patch = options?.patch ?? getDefaultPatch();
    const language = options?.language ?? defaultLanguage;

    const queues = getData(patch, language).Queues;
    if (queues === undefined)
        throw new Error(`Queue data is not stored. (${patch}/${language})`);

    return queues;
}
/**
 * Load the data of all queues for the specified patch and language
 * @param data If provided, loads this data instead of downloading it
 */
async function loadAllQueues(options?: Hasagi.Data.LoadOptions, data?: Hasagi.GameQueue[]) {
    const patch = options?.patch ?? getDefaultPatch();
    const language = options?.language ?? defaultLanguage;

    if (data) {
        DataStorage[patch][language].Queues = data;
        return;
    }

    const queues = await httpGet<Hasagi.GameQueue[]>(Data.getDataDragonURL(patch, language, "runesReforged.json"))
        .then(queues => { return queues; }, err => {
            throw new DataDownloadError("Unable to load queues.", err)
        })

    DataStorage[patch][language].Queues = queues;
}
/**
 * @param identifier The queue's id
 * @throws {Error} if queue data was not loaded for the specified patch and language
 */
function getQueue(identifier: string | number, options?: Hasagi.Data.LoadOptions) {
    const queues = getAllQueues(options);
    return queues.find(queue => queue.queueId == identifier) ?? null;
}
/**
 * @param name The map's name
 * @throws {Error} if queue data was not loaded for the specified patch and language
 */
function getQueuesByMap(name: string, options?: Hasagi.Data.LoadOptions) {
    const queues = getAllQueues(options);
    return queues.filter(queue => queue.map === name);
}

/**
 * Gets all maps
 * @throws {Error} if map data was not loaded for the specified patch and language
 */
function getAllMaps(options?: Hasagi.Data.LoadOptions) {
    const patch = options?.patch ?? getDefaultPatch();
    const language = options?.language ?? defaultLanguage;

    const maps = getData(patch, language).Maps;
    if (maps === undefined)
        throw new Error(`Map data is not stored. (${patch}/${language})`);

    return maps;
}
/**
 * Load the data of all maps for the specified patch and language
 * @param data If provided, loads this data instead of downloading it
 */
async function loadAllMaps(options?: Hasagi.Data.LoadOptions, data?: Hasagi.GameMap[]) {
    const patch = options?.patch ?? getDefaultPatch();
    const language = options?.language ?? defaultLanguage;

    if (data) {
        DataStorage[patch][language].Maps = data;
        return;
    }

    const maps = await httpGet<Hasagi.GameMap[]>(Data.getDataDragonURL(patch, language, "maps.json"))
        .then(maps => { return maps; }, err => {
            throw new DataDownloadError("Unable to load maps.", err)
        })

    DataStorage[patch][language].Maps = maps;
}
/**
 * @param identifier Name or id
 * @throws {Error} if map data was not loaded for the specified patch and language
 */
function getMap(identifier: string | number, options?: Hasagi.Data.LoadOptions) {
    const maps = getAllMaps(options)
    return maps.find(map => map.mapId == identifier || map.mapName == identifier) ?? null;
}

/**
 * Gets all game modes
 * @throws {Error} if game mode data was not loaded for the specified patch and language
 */
function getAllGameModes(options?: Hasagi.Data.LoadOptions) {
    const patch = options?.patch ?? getDefaultPatch();
    const language = options?.language ?? defaultLanguage;

    const gameModes = getData(patch, language).GameModes;
    if (gameModes === undefined)
        throw new Error(`Game mode data is not stored. (${patch}/${language})`);

    return gameModes;
}
/**
 * Load the data of all game modes for the specified patch and language
 * @param data If provided, loads this data instead of downloading it
 */
async function loadAllGameModes(options?: Hasagi.Data.LoadOptions, data?: Hasagi.GameMode[]) {
    const patch = options?.patch ?? getDefaultPatch();
    const language = options?.language ?? defaultLanguage;

    if (data) {
        DataStorage[patch][language].GameModes = data;
        return;
    }

    const gameModes = await httpGet<Hasagi.GameMode[]>(Data.getDataDragonURL(patch, language, "gameModes.json"))
        .then(gameModes => { return gameModes; }, err => {
            throw new DataDownloadError("Unable to load game modes.", err)
        });

    DataStorage[patch][language].GameModes = gameModes;
}

/**
 * Gets all game types
 * @throws {Error} if game type data was not loaded for the specified patch and language
 */
function getAllGameTypes(options?: Hasagi.Data.LoadOptions) {
    const patch = options?.patch ?? getDefaultPatch();
    const language = options?.language ?? defaultLanguage;
    const gameTypes = getData(patch, language).GameTypes;
    if (gameTypes === undefined)
        throw new Error(`Game type data is not stored. (${patch}/${language})`);

    return gameTypes;
}
/**
 * Load the data of all game types for the specified patch and language
 * @param data If provided, loads this data instead of downloading it
 */
async function loadAllGameTypes(options?: Hasagi.Data.LoadOptions, data?: Hasagi.GameType[]) {
    const patch = options?.patch ?? getDefaultPatch();
    const language = options?.language ?? defaultLanguage;

    if (data) {
        DataStorage[patch][language].GameTypes = data;
        return;
    }

    const gameTypes = await httpGet<Hasagi.GameType[]>(Data.getDataDragonURL(patch, language, "gameTypes.json"))
        .then(gameTypes => { return gameTypes; }, err => {
            throw new DataDownloadError("Unable to load game types.", err)
        })

    DataStorage[patch][language].GameTypes = gameTypes;
}

await Data.getLatestPatch("euw").then(latest => Data.setDefaultPatch(latest), err => { });