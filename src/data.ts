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

var hasUpdated = false;

function getDefaultPatch() {
    if (!defaultPatch)
        throw new Error("Patch parameter not provided and no default patch was selected.")

    return defaultPatch;
}

function getDefaultOptions(): Hasagi.Data.Options {
    return {
        language: defaultLanguage,
        patch: getDefaultPatch()
    }
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
            hasUpdated = true;
        })
    },

    /**
     * Indicates if there has been a change to the stored data object, which you get by calling Data.getDataObject()
     */
    hasUpdated() {
        return hasUpdated;
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

    getAllChampions,
    getChampion,

    getAllSummonerSpells,

    getAllRunes,
    getRune,
    getRuneTree,
    getRuneTreeByRune,

    getAllQueues,
    getQueue,
    getQueuesByMap,

    getAllMaps,
    getMap,

    getAllGameModes,

    getAllGameTypes,
}

export default Data;

function getAllChampions(options: Hasagi.Data.Options & { fromStorage: true }): Hasagi.Champion[];
function getAllChampions(options?: Hasagi.Data.Options): Promise<Hasagi.Champion[]>
function getAllChampions(options?: Hasagi.Data.Options) {
    if (!options)
        options = getDefaultOptions();

    options.patch = options.patch ?? getDefaultPatch();
    options.language = options.language ?? defaultLanguage;

    if (options.fromStorage) {
        const champions = getData(options.patch, options.language).Champions
        if (champions === undefined)
            throw new Error(`Champion data is not stored. (${options.patch}/${options.language})`);

        return champions;
    } else {
        const requestedData = getData(options.patch, options.language).Champions;
        if (requestedData)
            return Promise.resolve(requestedData);

        return httpGet<Hasagi.Champion[]>(Data.getDataDragonURL(options.patch, options.language, "championFull.json"), res => Object.values(JSON.parse(res).data))
            .then(champions => {
                DataStorage[options!.patch!][options!.language!].Champions = champions;
                hasUpdated = true;
                return champions;
            }, err => {
                throw new DataDownloadError("Unable to load champions.", err)
            })
    }
}

function getChampion(identifier: string | number, champions: Hasagi.Champion[]): Hasagi.Champion | null;
function getChampion(identifier: string | number, options: Hasagi.Data.Options & { fromStorage: true }): Hasagi.Champion | null;
function getChampion(identifier: string | number, options?: Hasagi.Data.Options): Promise<Hasagi.Champion | null>;
function getChampion(identifier: string | number, options?: Hasagi.Data.Options | Hasagi.Champion[]) {
    if (Array.isArray(options)) {
        if (!isNaN(identifier as any)) {
            return options.find(champion => champion.key == identifier) ?? null;
        } else {
            return options.find(champion => champion.id === identifier || champion.name === identifier) ?? null;
        }
    }

    if (!options)
        options = getDefaultOptions();

    options.patch = options.patch ?? getDefaultPatch();
    options.language = options.language ?? defaultLanguage;

    if (options.fromStorage) {
        const champions = getAllChampions({ ...options, fromStorage: true });

        if (!isNaN(identifier as any)) {
            return champions.find(champion => champion.key == identifier) ?? null;
        } else {
            return champions.find(champion => champion.id === identifier || champion.name === identifier) ?? null;
        }
    } else {
        return Data.getAllChampions(options).then(champions => {
            if (!isNaN(identifier as any)) {
                return champions.find(champion => champion.key == identifier) ?? null;
            } else {
                return champions.find(champion => champion.id === identifier || champion.name === identifier) ?? null;
            }
        })
    }
}

function getAllSummonerSpells(options: Hasagi.Data.Options & { fromStorage: true }): Hasagi.SummonerSpell[];
function getAllSummonerSpells(options?: Hasagi.Data.Options): Promise<Hasagi.SummonerSpell[]>
function getAllSummonerSpells(options?: Hasagi.Data.Options) {
    if (!options)
        options = getDefaultOptions();

    options.patch = options.patch ?? getDefaultPatch();
    options.language = options.language ?? defaultLanguage;

    if (options.fromStorage) {
        const summonerSpells = getData(options.patch, options.language).SummonerSpells
        if (summonerSpells === undefined)
            throw new Error(`Summoner spell data is not stored. (${options.patch}/${options.language})`);

        return summonerSpells;
    } else {
        const requestedData = getData(options.patch, options.language).SummonerSpells;
        if (requestedData)
            return Promise.resolve(requestedData);

        return httpGet<Hasagi.SummonerSpell[]>(Data.getDataDragonURL(options.patch, options.language, "summoner.json"), res => Object.values(JSON.parse(res).data))
            .then(summonerSpells => {
                DataStorage[options!.patch!][options!.language!].SummonerSpells = summonerSpells;
                hasUpdated = true;
                return summonerSpells;
            }, err => {
                throw new DataDownloadError("Unable to load summoner spells.", err)
            })
    }
}

function getAllRunes(options: Hasagi.Data.Options & { fromStorage: true }): Hasagi.RuneTree[];
function getAllRunes(options?: Hasagi.Data.Options): Promise<Hasagi.RuneTree[]>
function getAllRunes(options?: Hasagi.Data.Options) {
    if (!options)
        options = getDefaultOptions();

    options.patch = options.patch ?? getDefaultPatch();
    options.language = options.language ?? defaultLanguage;

    if (options.fromStorage) {
        const runes = getData(options.patch, options.language).Runes
        if (runes === undefined)
            throw new Error(`Rune data is not stored. (${options.patch}/${options.language})`);

        return runes;
    } else {
        const requestedData = getData(options.patch, options.language).Runes;
        if (requestedData)
            return Promise.resolve(requestedData);

        return httpGet<Hasagi.RuneTree[]>(Data.getDataDragonURL(options.patch, options.language, "runesReforged.json"))
            .then(runes => {
                DataStorage[options!.patch!][options!.language!].Runes = runes;
                hasUpdated = true;
                return runes;
            }, err => {
                throw new DataDownloadError("Unable to load runes.", err)
            })
    }
}

/**
 * @param identifier Name or id
 */
function getRune(identifier: string | number, runes: Hasagi.RuneTree[]): Hasagi.Rune | null;
function getRune(identifier: string | number, options: Hasagi.Data.Options & { fromStorage: true }): Hasagi.Rune | null;
function getRune(identifier: string | number, options?: Hasagi.Data.Options): Promise<Hasagi.Rune | null>;
function getRune(identifier: string | number, options?: Hasagi.Data.Options | Hasagi.RuneTree[]) {
    if (Array.isArray(options)) {
        const runes = options;
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

    if (!options)
        options = getDefaultOptions();

    options.patch = options.patch ?? getDefaultPatch();
    options.language = options.language ?? defaultLanguage;

    if (options.fromStorage) {
        const runes = getAllRunes({ ...options, fromStorage: true })
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
    } else {
        return Data.getAllRunes(options).then(runes => {
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
        })
    }
}

/**
 * @param identifier Name or id
 */
function getRuneTree(identifier: string | number, runes: Hasagi.RuneTree[]): Hasagi.RuneTree | null;
function getRuneTree(identifier: string | number, options?: Hasagi.Data.Options & { fromStorage: true }): Hasagi.RuneTree | null;
function getRuneTree(identifier: string | number, options: Hasagi.Data.Options): Promise<Hasagi.RuneTree | null>;
function getRuneTree(identifier: string | number, options?: Hasagi.Data.Options | Hasagi.RuneTree[]) {
    if (Array.isArray(options)) {
        const runes = options;
        var predicate: (runeTree: Hasagi.RuneTree) => boolean;

        if (!isNaN(identifier as any)) {
            predicate = runeTree => runeTree.id == identifier;
        } else {
            predicate = runeTree => runeTree.key == identifier || runeTree.name == identifier;
        }

        return runes.find(predicate) ?? null;
    }

    if (!options)
        options = getDefaultOptions();

    options.language = options.language ?? defaultLanguage;
    options.patch = options.patch ?? getDefaultPatch();

    if (options.fromStorage) {
        const runes = getAllRunes({ ...options, fromStorage: true })
        var predicate: (runeTree: Hasagi.RuneTree) => boolean;

        if (!isNaN(identifier as any)) {
            predicate = runeTree => runeTree.id == identifier;
        } else {
            predicate = runeTree => runeTree.key == identifier || runeTree.name == identifier;
        }

        return runes.find(predicate) ?? null;
    } else {
        return Data.getAllRunes(options).then(runes => {
            var predicate: (runeTree: Hasagi.RuneTree) => boolean;

            if (!isNaN(identifier as any)) {
                predicate = runeTree => runeTree.id == identifier;
            } else {
                predicate = runeTree => runeTree.key == identifier || runeTree.name == identifier;
            }

            return runes.find(predicate) ?? null;
        })
    }
}

/**
 * @param rune Hasagi.Rune, name or id
 */
function getRuneTreeByRune(rune: Hasagi.Rune | string | number, runes: Hasagi.RuneTree[]): Hasagi.RuneTree | null;
function getRuneTreeByRune(rune: Hasagi.Rune | string | number, options: Hasagi.Data.Options & { fromStorage: true }): Hasagi.RuneTree | null;
function getRuneTreeByRune(rune: Hasagi.Rune | string | number, options?: Hasagi.Data.Options): Promise<Hasagi.RuneTree | null>;
function getRuneTreeByRune(rune: Hasagi.Rune | string | number, options?: Hasagi.Data.Options | Hasagi.RuneTree[]) {
    if (Array.isArray(options)) {
        if (typeof rune === "string" || typeof rune === "number") {
            let r = getRune(rune, options)
            if (r === null)
                return null;

            rune = r;
        }

        for (let runeTree of getAllRunes({ ...options, fromStorage: true })) {
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

    if (!options)
        options = getDefaultOptions();

    options.patch = options.patch ?? getDefaultPatch();
    options.language = options.language ?? defaultLanguage;

    if (options.fromStorage) {
        if (typeof rune === "string" || typeof rune === "number") {
            let r = getRune(rune, { ...options, fromStorage: true })
            if (r === null)
                return null;

            rune = r;
        }

        for (let runeTree of getAllRunes({ ...options, fromStorage: true })) {
            for (let runeSlot of runeTree.slots) {
                for (let r of runeSlot.runes) {
                    if (r.id === rune.id) {
                        return runeTree;
                    }
                }
            }
        }

        return null;
    } else {
        return Data.getAllRunes(options).then(async runes => {
            if (typeof rune === "string" || typeof rune === "number") {
                let r = await getRune(rune, options as Hasagi.Data.Options);
                if (r === null)
                    return null;

                rune = r;
            }

            for (let runeTree of await getAllRunes(options as Hasagi.Data.Options)) {
                for (let runeSlot of runeTree.slots) {
                    for (let r of runeSlot.runes) {
                        if (r.id === rune.id) {
                            return runeTree;
                        }
                    }
                }
            }

            return null;
        })
    }
}

function getAllQueues(options: Hasagi.Data.Options & { fromStorage: true }): Hasagi.GameQueue[];
function getAllQueues(options?: Hasagi.Data.Options): Promise<Hasagi.GameQueue[]>
function getAllQueues(options?: Hasagi.Data.Options) {
    if (!options)
        options = getDefaultOptions();

    options.patch = options.patch ?? getDefaultPatch();
    options.language = options.language ?? defaultLanguage;

    if (options.fromStorage) {
        const queues = getData(options.patch, options.language).Queues;
        if (queues === undefined)
            throw new Error(`Queue data is not stored. (${options.patch}/${options.language})`);

        return queues;
    } else {
        const requestedData = getData(options.patch, options.language).Queues;
        if (requestedData)
            return Promise.resolve(requestedData);

        return httpGet<Hasagi.GameQueue[]>(Data.getDataDragonURL(options.patch, options.language, "runesReforged.json"))
            .then(queues => {
                DataStorage[options!.patch!][options!.language!].Queues = queues;
                hasUpdated = true;
                return queues;
            }, err => {
                throw new DataDownloadError("Unable to load queues.", err)
            })
    }
}

function getQueue(identifier: string | number, queues: Hasagi.GameQueue[]): Hasagi.GameQueue | null
function getQueue(identifier: string | number, options: Hasagi.Data.Options & { fromStorage: true }): Hasagi.GameQueue | null
function getQueue(identifier: string | number, options?: Hasagi.Data.Options): Promise<Hasagi.GameQueue | null>
function getQueue(identifier: string | number, options?: Hasagi.Data.Options | Hasagi.GameQueue[]) {
    if (Array.isArray(options)) {
        return options.find(queue => queue.queueId == identifier) ?? null;
    }

    if (!options)
        options = getDefaultOptions();

    options.language = options.language ?? defaultLanguage;
    options.patch = options.patch ?? getDefaultPatch();

    if (options.fromStorage) {
        const queues = getAllQueues({ ...options, fromStorage: true })
        return queues.find(queue => queue.queueId == identifier) ?? null;
    } else {
        return getAllQueues(options).then(queues => queues.find(queue => queue.queueId == identifier) ?? null);
    }
}

function getQueuesByMap(name: string, queues: Hasagi.GameQueue[]): Hasagi.GameQueue[]
function getQueuesByMap(name: string, options: Hasagi.Data.Options & { fromStorage: true }): Hasagi.GameQueue[]
function getQueuesByMap(name: string, options?: Hasagi.Data.Options): Promise<Hasagi.GameQueue[]>
function getQueuesByMap(name: string, options?: Hasagi.Data.Options | Hasagi.GameQueue[]) {
    if (Array.isArray(options)) {
        return options.filter(queue => queue.map === name);
    }
    if (!options)
        options = getDefaultOptions();

    options.language = options.language ?? defaultLanguage;
    options.patch = options.patch ?? getDefaultPatch();

    if (options.fromStorage) {
        const queues = getAllQueues({ ...options, fromStorage: true })
        return queues.filter(queue => queue.map === name);
    } else {
        return getAllQueues(options).then(queues => queues.filter(queue => queue.map === name));
    }
}

function getAllMaps(options: Hasagi.Data.Options & { fromStorage: true }): Hasagi.GameMap[];
function getAllMaps(options?: Hasagi.Data.Options): Promise<Hasagi.GameMap[]>
function getAllMaps(options?: Hasagi.Data.Options) {
    if (!options)
        options = getDefaultOptions();

    options.patch = options.patch ?? getDefaultPatch();
    options.language = options.language ?? defaultLanguage;

    if (options.fromStorage) {
        const maps = getData(options.patch, options.language).Maps;
        if (maps === undefined)
            throw new Error(`Map data is not stored. (${options.patch}/${options.language})`);

        return maps;
    } else {
        const requestedData = getData(options.patch, options.language).Maps;
        if (requestedData)
            return Promise.resolve(requestedData);

        return httpGet<Hasagi.GameMap[]>(Data.getDataDragonURL(options.patch, options.language, "maps.json"))
            .then(maps => {
                DataStorage[options!.patch!][options!.language!].Maps = maps;
                hasUpdated = true;
                return maps;
            }, err => {
                throw new DataDownloadError("Unable to load maps.", err)
            })
    }
}

/**
 * @param identifier Name or id
 */
function getMap(identifier: string | number, maps: Hasagi.GameMap[]): Hasagi.GameMap | null;
function getMap(identifier: string | number, options: Hasagi.Data.Options & { fromStorage: true }): Hasagi.GameMap | null;
function getMap(identifier: string | number, options?: Hasagi.Data.Options): Promise<Hasagi.GameMap | null>;
function getMap(identifier: string | number, options?: Hasagi.Data.Options | Hasagi.GameMap[]) {
    if (Array.isArray(options)) {
        return options.find(map => map.mapId == identifier || map.mapName == identifier) ?? null;
    }

    if (!options)
        options = getDefaultOptions();

    options.language = options.language ?? defaultLanguage;
    options.patch = options.patch ?? getDefaultPatch();

    if (options.fromStorage) {
        const maps = getAllMaps({ ...options, fromStorage: true })
        return maps.find(map => map.mapId == identifier || map.mapName == identifier) ?? null;
    } else {
        return getAllMaps(options).then(maps => {
            return maps.find(map => map.mapId == identifier || map.mapName == identifier) ?? null;
        })
    }
}

function getAllGameModes(options: Hasagi.Data.Options & { fromStorage: true }): Hasagi.GameMode[];
function getAllGameModes(options?: Hasagi.Data.Options): Promise<Hasagi.GameMode[]>
function getAllGameModes(options?: Hasagi.Data.Options) {
    if (!options)
        options = getDefaultOptions();

    options.patch = options.patch ?? getDefaultPatch();
    options.language = options.language ?? defaultLanguage;

    if (options.fromStorage) {
        const gameModes = getData(options.patch, options.language).GameModes;
        if (gameModes === undefined)
            throw new Error(`Game mode data is not stored. (${options.patch}/${options.language})`);

        return gameModes;
    } else {
        const requestedData = getData(options.patch, options.language).GameModes;
        if (requestedData)
            return Promise.resolve(requestedData);

        return httpGet<Hasagi.GameMode[]>(Data.getDataDragonURL(options.patch, options.language, "gameModes.json"))
            .then(gameModes => {
                DataStorage[options!.patch!][options!.language!].GameModes = gameModes;
                hasUpdated = true;
                return gameModes;
            }, err => {
                throw new DataDownloadError("Unable to load game modes.", err)
            })
    }
}

function getAllGameTypes(options: Hasagi.Data.Options & { fromStorage: true }): Hasagi.GameType[];
function getAllGameTypes(options?: Hasagi.Data.Options): Promise<Hasagi.GameType[]>
function getAllGameTypes(options?: Hasagi.Data.Options) {
    if (!options)
        options = getDefaultOptions();

    options.patch = options.patch ?? getDefaultPatch();
    options.language = options.language ?? defaultLanguage;

    if (options.fromStorage) {
        const gameTypes = getData(options.patch, options.language).GameTypes;
        if (gameTypes === undefined)
            throw new Error(`Game type data is not stored. (${options.patch}/${options.language})`);

        return gameTypes;
    } else {
        const requestedData = getData(options.patch, options.language).GameTypes;
        if (requestedData)
            return Promise.resolve(requestedData);

        return httpGet<Hasagi.GameType[]>(Data.getDataDragonURL(options.patch, options.language, "gameTypes.json"))
            .then(gameTypes => {
                DataStorage[options!.patch!][options!.language!].GameTypes = gameTypes;
                hasUpdated = true;
                return gameTypes;
            }, err => {
                throw new DataDownloadError("Unable to load game types.", err)
            })
    }
}

Data.getLatestPatch("euw").then(latest => Data.setDefaultPatch(latest)).catch();