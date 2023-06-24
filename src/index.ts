import Data from "./data.js";
import HasagiClient from "./client.js";
import RunePage from "./Classes/RunePage";
import ChampSelectSession from "./Classes/ChampSelectSession";
import * as Constants from "./constants.js"

export default HasagiClient;
export { HasagiClient, Data, RunePage, ChampSelectSession, Constants }

declare global {
    namespace Hasagi {
        namespace Data {
            type LoadOptions = {
                language?: LanguageCode,
                patch?: string
            }

            type DataStorage = {
                [patch: string]:
                {
                    [language: string]: {
                        Champions?: Hasagi.Champion[],
                        SummonerSpells?: Hasagi.SummonerSpell[],
                        Runes?: Hasagi.RuneTree[],
                        Queues?: Hasagi.GameQueue[],
                        Maps?: Hasagi.GameMap[],
                        GameModes?: Hasagi.GameMode[],
                        GameTypes?: Hasagi.GameType[]
                    }
                }
            }
        }

        interface ClientEvents {
            "connection-state-change": (state: boolean) => void;
            "lcu-event": (event: [opcode: number, name: string, data: { eventType: string; uri: string; data: any; }]) => void;
            "champ-select-session-update": () => void;
            "champ-select-phase-change": (previousPhase: Hasagi.ChampSelectPhase, phase: Hasagi.ChampSelectPhase) => void;
            "champ-select-local-player-ban": () => void;
            "champ-select-local-player-pick": () => void;
            "champ-select-local-player-pick-completed": (championKey: string) => void;
            "rune-pages-updated": () => void;
            "gameflow-session-update": (oldSessionData: Hasagi.GameFlowSession | null, newSessionData: Hasagi.GameFlowSession | null) => void;
            "gameflow-session-phase-update": (prevPhase: Hasagi.GameFlowPhase, newPhase: Hasagi.GameFlowPhase) => void;
            "champ-select-champion-intent-change": (summonerId: number, previousChampionIntent: number, championIntent: number) => void;
            /**
             * 
             * @param order 187
             * @returns 
             */
            "champ-select-summoner-order-change": (order: string[]) => void;
        }


        type RunePage = import("./Classes/RunePage").default;

        interface ClientRunePage {
            autoModifiedSelections: any[];
            current: boolean;
            id: number;
            isActive: boolean;
            isDeletable: boolean;
            isEditable: boolean;
            isValid: boolean;
            lastModified: number;
            name: string;
            order: number;
            selectedPerkIds: number[];
            primaryStyleId: number;
            subStyleId: number;
        }

        type ChampSelectSession = import("./Classes/ChampSelectSession").default;

        type ChampSelectPhase = null | 'PLANNING' | 'BAN_PICK' | 'FINALIZATION';

        type Champion = {
            version: string;
            id: string;
            /** Number-like string */
            key: string;
            name: string;
            title: string;
            blurb: string;
            info: ChampionInfo;
            image: ImageData;
            tags: ChampionTag[];
            partype: ChampionPartype;
            stats: ChampionStats;
            skins: SkinData[];
            lore: string;
            allytips: string[];
            enemytips: string[];
            spells: ChampionAbility[];
            passive: {
                name: string,
                description: string,
                image: ImageData
            };
            recommended: unknown[];
        };

        type ChampionAbility = {
            id: string;
            name: string;
            description: string;
            tooltip: string;
            leveltip: {
                label: string[],
                effect: string[]
            };
            maxrank: number;
            cooldown: number[];
            cooldownBurn: string;
            cost: number[];
            costBurn: string;
            datavalues: unknown;
            effect: (number[] | null)[];
            effectBurn: (string | null)[];
            vars: unknown[];
            costType: string;
            maxammo: string;
            range: number[];
            rangeBurn: string;
            image: ImageData;
            resource: string;
        }

        type SkinData = {
            id: string,
            num: number,
            name: string,
            chromas: boolean
        }

        type ChampionInfo = {
            attack: number;
            defense: number;
            magic: number;
            difficulty: number;
        };

        type ChampionPartype = "None" | "Mana" | "Energy" | "Blood Well" | "Fury" | "Ferocity" | "Heat" | "Grit" | "Crimson Rush" | "Flow" | "Shield";

        type ChampionStats = {
            hp: number;
            hpperlevel: number;
            mp: number;
            mpperlevel: number;
            movespeed: number;
            armor: number;
            armorperlevel: number;
            spellblock: number;
            spellblockperlevel: number;
            attackrange: number;
            hpregen: number;
            hpregenperlevel: number;
            mpregen: number;
            mpregenperlevel: number;
            crit: number;
            critperlevel: number;
            attackdamage: number;
            attackdamageperlevel: number;
            attackspeedperlevel: number;
            attackspeed: number;
        };

        type ChampionTag = "Fighter" | "Tank" | "Mage" | "Assassin" | "Support" | "Marksman";

        type GameMap = {
            mapId: number;
            mapName: string;
            notes: string;
        };

        type GameMode = {
            gameMode: string;
            description: string;
        };

        type GameQueue = {
            queueId: number;
            map: string;
            description: string;
            notes: string;
        };

        type GameType = {
            gameType: string;
            description: string;
        };

        type ImageData = {
            full: string;
            sprite: string;
            group: string;
            x: number;
            y: number;
            w: number;
            h: number;
        };

        type LanguageCode = "en_US" | "cs_CZ" | "de_DE" | "el_GR" | "en_AU" | "en_GB" | "en_PH" | "en_SG" | "es_AR" | "es_ES" | "es_MX" | "fr_FR" | "hu_HU" | "id_ID" | "it_IT" | "ja_JP" | "ko_KR" | "pl_PL" | "pt_BR" | "ro_RO" | "ru_RU" | "th_TH" | "tr_TR" | "vn_VN" | "zh_CN" | "zh_MY" | "zh_TW";

        type Rune = {
            id: number;
            key: string;
            icon: string;
            name: string;
            shortDesc: string;
            longDesc: string;
        };

        type RuneTree = {
            id: number;
            key: string;
            icon: string;
            name: string;
            slots: RuneSlot[];
        };

        type RuneSlot = {
            runes: Rune[];
        };

        type ServerRegion = "euw" | "eune" | "br" | "lan" | "las" | "na" | "oce" | "ru" | "jp" | "tr" | "kr" | "pbe";

        type SummonerSpell = {
            id: string;
            name: string;
            description: string;
            tooltip: string;
            maxrank: number;
            cooldown: number[];
            cooldownBurn: string;
            cost: number[];
            costBurn: string;
            datavalues: {};
            effect: number[][];
            effectBurn: string[];
            vars: any[];
            key: string;
            summonerLevel: number;
            modes: string[];
            costType: string;
            maxammo: string;
            range: number[];
            rangeBurn: string;
            image: ImageData;
            resource: string;
        };

        interface IChampSelectSession {
            actions: ChampSelectAction[][];
            allowBattleBoost: boolean;
            allowDuplicatePicks: boolean;
            allowLockedEvents: boolean;
            allowRerolling: boolean;
            allowSkinSelection: boolean;
            benchChampionIds: number[];
            benchEnabled: boolean;
            boostableSkinCount: number;
            chatDetails: {
                chatRoomName: string,
                chatRoomPassword: string
            };
            counter: number;
            entitledFeatureState: {
                additionalRerolls: number,
                unlockedSkinIds: number[]
            };
            gameId: number;
            hasSimultaneousBans: boolean;
            hasSimultaneousPicks: boolean;
            isSpectating: boolean;
            localPlayerCellId: number;
            lockedEventIndex: number;
            myTeam: ChampSelectTeamMember[];
            recoveryCounter: number;
            rerollsRemaining: number;
            skipChampionSelect: boolean;
            theirTeam: ChampSelectTeamMember[];
            timer: {
                adjustedTimeLeftInPhase: number,
                internalNowInEpochMs: number,
                isInfinite: true,
                phase: string,
                totalTimeInPhase: number
            };
            trades: {
                cellId: number,
                id: number,
                state: string
            }[];
        }

        type ChampSelectAction = {
            actorCellId: number;
            championId: number;
            completed: boolean;
            id: number;
            isAllyAction: boolean;
            isInProgress: boolean;
            type: "ban" | "pick" | "ten_bans_reveal";
        }

        type ChampSelectTeamMember = {
            assignedPosition: string,
            cellId: number,
            championId: number,
            championPickIntent: number,
            entitledFeatureType: string,
            playerType: string,
            selectedSkinId: number,
            spell1Id: number,
            spell2Id: number,
            summonerId: number,
            team: number,
            wardSkinId: number
        }

        type MatchmakingData = {
            dodgeData: {
                dodgerId: number;
                state: string;
            };
            errors: any[];
            estimatedQueueTime: number;
            isCurrentlyInQueue: boolean;
            lobbyId: string;
            lowPriorityData: {
                bustedLeaverAccessToken: string;
                penalizedSummonerIds: any[];
                penaltyTime: number;
                penaltyTimeRemaining: number;
            };
            queueId: number;
            readyCheck: {
                declinerIds: number[];
                dodgeWarning: string;
                playerResponse: string;
                state: string;
                timer: number;
            };
            searchState: string;
            timeInQueue: number;
        }

        type GameClient = {
            observerServerIp: string;
            observerServerPort: number;
            running: boolean;
            serverIp: string;
            serverPort: number;
            visible: boolean;
        }

        type PlayerChampionSelection = {
            championId: number;
            selectedSkinIndex: number;
            spell1Id: number;
            spell2Id: number;
            summonerInternalName: string;
        }

        type GameTypeConfig = {
            advancedLearningQuests: boolean;
            allowTrades: boolean;
            banMode: string;
            banTimerDuration: number;
            battleBoost: boolean;
            crossTeamChampionPool: boolean;
            deathMatch: boolean;
            doNotRemove: boolean;
            duplicatePick: boolean;
            exclusivePick: boolean;
            id: number;
            learningQuests: boolean;
            mainPickTimerDuration: number;
            maxAllowableBans: number;
            name: string;
            onboardCoopBeginner: boolean;
            pickMode: string;
            postPickTimerDuration: number;
            reroll: boolean;
            teamChampionPool: boolean;
        }

        type Queue = {
            allowablePremadeSizes: number[];
            areFreeChampionsAllowed: boolean;
            assetMutator: string;
            category: string;
            championsRequiredToPlay: number;
            description: string;
            detailedDescription: string;
            gameMode: string;
            gameTypeConfig: GameTypeConfig;
            id: number;
            isRanked: boolean;
            isTeamBuilderManaged: boolean;
            isTeamOnly: boolean;
            lastToggledOffTime: number;
            lastToggledOnTime: number;
            mapId: number;
            maxLevel: number;
            maxSummonerLevelForFirstWinOfTheDay: number;
            maximumParticipantListSize: number;
            minLevel: number;
            minimumParticipantListSize: number;
            name: string;
            numPlayersPerTeam: number;
            queueAvailability: string;
            queueRewards: {
                isChampionPointsEnabled: boolean;
                isIpEnabled: boolean;
                isXpEnabled: boolean;
                partySizeIpRewards: any[];
            };
            removalFromGameAllowed: boolean;
            removalFromGameDelayMinutes: number;
            shortName: string;
            showPositionSelector: boolean;
            spectatorEnabled: boolean;
            type: string;
        }

        type GameCustomization = {
            GoldenSpatulaClub: string;
            Regalia: string;
            challenges: string;
            championOwned: string;
            perks: string;
            ranked: string;
            statstones: string;
            summonerEmotes: string;
            summonerTrophy: string;
            vintageSkin: string;
            wardSkin: string;
            summonerBanner: string;
        }

        type ChampSelectParticipant = {
            accountId: number;
            adjustmentFlags: number;
            botDifficulty: string;
            clientInSynch: boolean;
            gameCustomization: GameCustomization;
            index: number;
            lastSelectedSkinIndex: number;
            locale?: any;
            minor: boolean;
            originalAccountNumber: number;
            originalPlatformId?: any;
            partnerId: string;
            pickMode: number;
            pickTurn: number;
            profileIconId: number;
            puuid: string;
            queueRating: number;
            rankedTeamGuest: boolean;
            selectedPosition: string;
            selectedRole: string;
            summonerId: number;
            summonerInternalName: string;
            summonerName: string;
            teamOwner: boolean;
            teamParticipantId: number;
            teamRating: number;
            timeAddedToQueue: number;
            timeChampionSelectStart: number;
            timeGameCreated: number;
            timeMatchmakingStart: number;
            voterRating: number;
        }

        type GameData = {
            gameId: number;
            gameName: string;
            isCustomGame: boolean;
            password: string;
            playerChampionSelections: PlayerChampionSelection[];
            queue: Queue;
            spectatorsAllowed: boolean;
            teamOne: ChampSelectParticipant[];
            teamTwo: ChampSelectParticipant[];
        }

        type GameDodgeData = {
            dodgeIds: any[];
            phase: string;
            state: string;
        }

        type Map = {
            assets: any;
            categorizedContentBundles: any;
            description: string;
            gameMode: string;
            gameModeName: string;
            gameModeShortName: string;
            gameMutator: string;
            id: number;
            isRGM: boolean;
            mapStringId: string;
            name: string;
            perPositionDisallowedSummonerSpells: any;
            perPositionRequiredSummonerSpells: any;
            platformId: string;
            platformName: string;
            properties: any;
        }

        type GameFlowSession = {
            gameClient: GameClient;
            gameData: GameData;
            gameDodge: GameDodgeData;
            map: Map;
            phase: GameFlowPhase;
        }

        type GameFlowPhase = "None" | "Lobby" | "Matchmaking" | "CheckedIntoTournament" | "ReadyCheck" | "ChampSelect" | "GameStart" | "FailedToLaunch" | "InProgress" | "Reconnect" | "WaitingForStats" | "PreEndOfGame" | "EndOfGame" | "TerminatedInError"

        type LiveClientActivePlayerAbilities = {
            Passive: LiveClientPassiveAbility,
            Q: LiveClientAbility,
            W: LiveClientAbility,
            E: LiveClientAbility,
            R: LiveClientAbility,
        }

        type LiveClientActivePlayer = {
            abilities: LiveClientActivePlayerAbilities;
            championStats: LiveClientChampionStats;
            currentGold: number;
            fullRunes: LiveClientActivePlayerRunes;
            level: number;
            summonerName: string;
        }

        type LiveClientActivePlayerRunes = {
            keystone: LiveClientKeystone;
            primaryRuneTree: LiveClientRuneTree;
            secondaryRuneTree: LiveClientRuneTree;
            generalRunes: LiveClientRuneTree[];
            statRunes: LiveClientStatRune[];
        }

        type LiveClientStatRune = {
            id: number;
            rawDescription: string;
        }


        type LiveClientChampionStats = {
            abilityHaste: number;
            abilityPower: number;
            armor: number;
            armorPenetrationFlat: number;
            armorPenetrationPercent: number;
            attackDamage: number;
            attackRange: number;
            attackSpeed: number;
            bonusArmorPenetrationPercent: number;
            bonusMagicPenetrationPercent: number;
            cooldownReduction: number;
            critChance: number;
            critDamage: number;
            currentHealth: number;
            healthRegenRate: number;
            lifeSteal: number;
            magicLethality: number;
            magicPenetrationFlat: number;
            magicPenetrationPercent: number;
            magicResist: number;
            maxHealth: number;
            moveSpeed: number;
            physicalLethality: number;
            resourceMax: number;
            resourceRegenRate: number;
            resourceType: string;
            resourceValue: number;
            spellVamp: number;
            tenacity: number;
        }

        type LiveClientRuneTree = {
            displayName: string;
            id: number;
            rawDescription: string;
            rawDisplayName: string;
        }

        type LiveClientKeystone = {
            displayName: string;
            id: number;
            rawDescription: string;
            rawDisplayName: string;
        }

        type LiveClientGameData = {
            gameMode: string;
            gameTime: number;
            mapName: string;
            mapNumber: number;
            mapTerrain: string;
        }

        type LiveClientPlayer = {
            championName: string;
            isBot: boolean;
            isDead: boolean;
            items: LiveClientPlayerItem[];
            level: number;
            position: string;
            rawChampionName: string;
            respawnTimer: number;
            runes: LiveClientMainRunes;
            scores: LiveClientScore;
            skinID: number;
            summonerName: string;
            summonerSpells: LiveClientSummonerSpells;
            team: string;
        }

        type LiveClientMainRunes = {
            keystone: LiveClientKeystone;
            primaryRuneTree: LiveClientRuneTree;
            secondaryRuneTree: LiveClientRuneTree;
        }

        type LiveClientSummonerSpells = {
            summonerSpellOne: LiveClientSummonerSpell;
            summonerSpellTwo: LiveClientSummonerSpell;
        }

        type LiveClientPlayerItem = {
            canUse: boolean;
            consumable: boolean;
            count: number;
            displayName: string;
            itemID: number;
            price: number;
            rawDescription: string;
            rawDisplayName: string;
            slot: number;
        }


        type LiveClientPassiveAbility = {
            displayName: string;
            id: string;
            rawDescription: string;
            rawDisplayName: string;
        }

        type LiveClientAbility = {
            abilityLevel: number;
            displayName: string;
            id: string;
            rawDescription: string;
            rawDisplayName: string;
        }

        type LiveClientScore = {
            assists: number;
            creepScore: number;
            deaths: number;
            kills: number;
            wardScore: number;
        }

        type LiveClientSummonerSpell = {
            displayName: string;
            rawDescription: string;
            rawDisplayName: string;
        }

        type LiveClientData = {
            activePlayer: LiveClientActivePlayer,
            allPlayers: LiveClientPlayer[],
            events: {
                Events: LiveClientEvent[]
            },
            gameData: LiveClientGameData
        }

        type LiveClientEvent = LiveClientGameStartEvent | LiveClientMinionsSpawningEvent | LiveClientFirstBrickEvent | LiveClientTurretKilledEvent | LiveClientInhibKilledEvent | LiveClientDragonKillEvent | LiveClientHeraldKillEvent | LiveClientBaronKillEvent | LiveClientChampionKillEvent | LiveClientMultikillEvent | LiveClientAceEvent | LiveClientEventBase & { EventName: string, [key: string]: string | number }

        type LiveClientEventBase = {
            EventID: number;
            EventTime: number;
        }

        type LiveClientGameStartEvent = {
            EventName: "GameStart"
        } & LiveClientEventBase

        type LiveClientMinionsSpawningEvent = {
            EventName: "MinionsSpawning"
        } & LiveClientEventBase

        type LiveClientFirstBrickEvent = {
            EventName: "FirstBrick",
            KillerName: string
        } & LiveClientEventBase

        type LiveClientTurretKilledEvent = {
            EventName: "TurretKilled"
            TurretKilled: string,
            KillerName: "Riot Tuxedo",
            Assisters: string[]
        } & LiveClientEventBase

        type LiveClientInhibKilledEvent = {
            EventName: "InhibKilled",
            InhibKilled: string,
            KillerName: string,
            Assisters: string[]
        } & LiveClientEventBase

        type LiveClientDragonKillEvent = {
            EventName: "DragonKill",
            DragonType: string,
            Stolen: "False" | "True",
            KillerName: string,
            Assisters: string[]
        } & LiveClientEventBase

        type LiveClientHeraldKillEvent = {
            EventName: "HeraldKill",
            Stolen: "False" | "True",
            KillerName: string,
            Assisters: string[]
        } & LiveClientEventBase

        type LiveClientBaronKillEvent = {
            EventName: "BaronKill",
            Stolen: "False" | "True",
            KillerName: string,
            Assisters: string[]
        } & LiveClientEventBase

        type LiveClientChampionKillEvent = {
            EventName: "ChampionKill",
            KillerName: string,
            VictimName: string,
            Assisters: string[]
        } & LiveClientEventBase

        type LiveClientMultikillEvent = {
            EventName: "Multikill",
            KillerName: string,
            KillStreak: number
        } & LiveClientEventBase

        type LiveClientAceEvent = {
            EventName: "Ace",
            Acer: string,
            AcingTeam: string
        } & LiveClientEventBase

        type RankedEntry = {
            division: string;
            isProvisional: boolean;
            leaguePoints: number;
            losses: number;
            miniSeriesProgress: string;
            previousSeasonAchievedDivision: string;
            previousSeasonAchievedTier: string;
            previousSeasonEndDivision: string;
            previousSeasonEndTier: string;
            provisionalGameThreshold: number;
            provisionalGamesRemaining: number;
            queueType: string;
            ratedRating: number;
            ratedTier: string;
            tier: string;
            warnings?: any;
            wins: number;
        }

        type SeasonData = {
            currentSeasonEnd: number;
            currentSeasonId: number;
            nextSeasonStart: number;
        }

        type CurrentRankData = {
            earnedRegaliaRewardIds: any[];
            highestPreviousSeasonAchievedDivision: string;
            highestPreviousSeasonAchievedTier: string;
            highestPreviousSeasonEndDivision: string;
            highestPreviousSeasonEndTier: string;
            highestRankedEntry: RankedEntry;
            highestRankedEntrySR: RankedEntry;
            queueMap: {
                RANKED_FLEX_SR: RankedEntry;
                RANKED_SOLO_5x5: RankedEntry;
                RANKED_TFT: RankedEntry;
                RANKED_TFT_DOUBLE_UP: RankedEntry;
                RANKED_TFT_PAIRS: RankedEntry;
                RANKED_TFT_TURBO: RankedEntry;
            };
            queues: RankedEntry[];
            rankedRegaliaLevel: number;
            seasons: {
                RANKED_FLEX_SR: SeasonData;
                RANKED_SOLO_5x5: SeasonData;
                RANKED_TFT: SeasonData;
                RANKED_TFT_DOUBLE_UP: SeasonData;
                RANKED_TFT_PAIRS: SeasonData;
                RANKED_TFT_TURBO: SeasonData;
            };
            splitsProgress: {
                1: number;
                2: number;
                3: number;
            };
        }

        type Summoner = {
            accountId: number;
            displayName: string;
            internalName: string;
            nameChangeFlag: boolean;
            percentCompleteForNextLevel: number;
            privacy: string;
            profileIconId: number;
            puuid: string;
            rerollPoints: {
                currentPoints: number;
                maxRolls: number;
                numberOfRolls: number;
                pointsCostToRoll: number;
                pointsToReroll: number;
            };
            summonerId: number;
            summonerLevel: number;
            unnamed: boolean;
            xpSinceLastLevel: number;
            xpUntilNextLevel: number;
        }

        type LoadoutEntry = {
            id: string;
            itemId?: any;
            loadout: Loadout;
            name: string;
            refreshTime: string;
            scope: string;
        }

        type Loadout = {
            COMPANION_SLOT: {
                contentId: string,
                inventoryType: "COMPANION",
                itemId: number
            };
            EMOTES_ACE: {
                contentId: string,
                inventoryType: "EMOTE",
                itemId: number
            };
            EMOTES_FIRST_BLOOD: {
                contentId: string,
                inventoryType: "EMOTE",
                itemId: number
            };
            EMOTES_START: {
                contentId: string,
                inventoryType: "EMOTE",
                itemId: number
            };
            EMOTES_VICTORY: {
                contentId: string,
                inventoryType: "EMOTE",
                itemId: number
            };
            EMOTES_WHEEL_CENTER: {
                contentId: string,
                inventoryType: "EMOTE",
                itemId: number
            };
            EMOTES_WHEEL_LOWER_LEFT: {
                contentId: string,
                inventoryType: "EMOTE",
                itemId: number
            };
            EMOTES_WHEEL_LOWER_RIGHT: {
                contentId: string,
                inventoryType: "EMOTE",
                itemId: number
            };
            EMOTES_WHEEL_UPPER_LEFT: {
                contentId: string,
                inventoryType: "EMOTE",
                itemId: number
            };
            EMOTES_WHEEL_UPPER_RIGHT: {
                contentId: string,
                inventoryType: "EMOTE",
                itemId: number
            };
            EMOTES_WHEEL_LEFT: {
                contentId: string,
                inventoryType: "EMOTE",
                itemId: number
            };
            EMOTES_WHEEL_LOWER: {
                contentId: string,
                inventoryType: "EMOTE",
                itemId: number
            };
            EMOTES_WHEEL_RIGHT: {
                contentId: string,
                inventoryType: "EMOTE",
                itemId: number
            };
            EMOTES_WHEEL_UPPER: {
                contentId: string,
                inventoryType: "EMOTE",
                itemId: number
            };
            REGALIA_BANNER_SLOT: {
                contentId: string,
                inventoryType: "REGALIA_BANNER",
                itemId: number
            };
            REGALIA_CREST_SLOT: {
                contentId: string,
                inventoryType: "REGALIA_CREST",
                itemId: number
            };
            TFT_DAMAGE_SKIN_SLOT: {
                contentId: string,
                inventoryType: "TFT_DAMAGE_SKIN",
                itemId: number
            };
            TFT_MAP_SKIN_SLOT: {
                contentId: string,
                inventoryType: "TFT_MAP_SKIN",
                itemId: number
            };
            TOURNAMENT_TROPHY: {
                contentId: string,
                inventoryType: "TOURNAMENT_TROPHY",
                itemId: number
            };
            WARD_SKIN_SLOT: {
                contentId: string,
                inventoryType: "WARD_SKIN",
                itemId: number
            };
        }
    }
}