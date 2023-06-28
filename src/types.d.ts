export namespace Hasagi {
    export namespace DataDragon {
        export type Champion = {
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

        export type ChampionAbility = {
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

        export type SkinData = {
            id: string,
            num: number,
            name: string,
            chromas: boolean
        }

        export type ChampionInfo = {
            attack: number;
            defense: number;
            magic: number;
            difficulty: number;
        };

        export type ChampionPartype = "None" | "Mana" | "Energy" | "Blood Well" | "Fury" | "Ferocity" | "Heat" | "Grit" | "Crimson Rush" | "Flow" | "Shield";

        export type ChampionStats = {
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

        export type ChampionTag = "Fighter" | "Tank" | "Mage" | "Assassin" | "Support" | "Marksman";

        export type Item = {
            name: string;
            description: string;
            colloq: string;
            plaintext: string;
            into: string[];
            image: ImageData;
            gold: {
                base: number;
                purchasable: boolean;
                total: number;
                sell: number;
            };
            tags: string[];
            maps: {
                [key: string]: boolean;
            };
            stats: {
                FlatMovementSpeedMod: number;
            };
        };

        export type SummonerSpell = {
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

        export type Rune = {
            id: number;
            key: string;
            icon: string;
            name: string;
            shortDesc: string;
            longDesc: string;
        };

        export type RuneTree = {
            id: number;
            key: string;
            icon: string;
            name: string;
            slots: RuneSlot[];
        };

        export type RuneSlot = {
            runes: Rune[];
        };

        export type LoadOptions = {
            language?: LanguageCode,
            patch?: string
        }

        export type DataStorage = {
            [patch: string]:
            {
                [language: string]: {
                    Champions?: Hasagi.DataDragon.Champion[],
                    SummonerSpells?: Hasagi.DataDragon.SummonerSpell[],
                    Runes?: Hasagi.DataDragon.RuneTree[],
                }
            }
        }
    }

    export namespace GameConstants {
        export type GameMap = {
            mapId: number;
            mapName: string;
            notes: string;
        };

        export type GameMode = {
            gameMode: string;
            description: string;
        };

        export type GameQueue = {
            queueId: number;
            map: string;
            description: string;
            notes: string;
        };

        export type GameType = {
            gameType: string;
            description: string;
        };
    }

    export namespace LiveClientAPI {
        export type LiveClientActivePlayerAbilities = {
            Passive: LiveClientPassiveAbility,
            Q: LiveClientAbility,
            W: LiveClientAbility,
            E: LiveClientAbility,
            R: LiveClientAbility,
        }

        export type LiveClientActivePlayer = {
            abilities: LiveClientActivePlayerAbilities;
            championStats: LiveClientChampionStats;
            currentGold: number;
            fullRunes: LiveClientActivePlayerRunes;
            level: number;
            summonerName: string;
        }

        export type LiveClientActivePlayerRunes = {
            keystone: LiveClientKeystone;
            primaryRuneTree: LiveClientRuneTree;
            secondaryRuneTree: LiveClientRuneTree;
            generalRunes: LiveClientRuneTree[];
            statRunes: LiveClientStatRune[];
        }

        export type LiveClientStatRune = {
            id: number;
            rawDescription: string;
        }


        export type LiveClientChampionStats = {
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

        export type LiveClientRuneTree = {
            displayName: string;
            id: number;
            rawDescription: string;
            rawDisplayName: string;
        }

        export type LiveClientKeystone = {
            displayName: string;
            id: number;
            rawDescription: string;
            rawDisplayName: string;
        }

        export type LiveClientGameData = {
            gameMode: string;
            gameTime: number;
            mapName: string;
            mapNumber: number;
            mapTerrain: string;
        }

        export type LiveClientPlayer = {
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

        export type LiveClientMainRunes = {
            keystone: LiveClientKeystone;
            primaryRuneTree: LiveClientRuneTree;
            secondaryRuneTree: LiveClientRuneTree;
        }

        export type LiveClientSummonerSpells = {
            summonerSpellOne: LiveClientSummonerSpell;
            summonerSpellTwo: LiveClientSummonerSpell;
        }

        export type LiveClientPlayerItem = {
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

        export type LiveClientPassiveAbility = {
            displayName: string;
            id: string;
            rawDescription: string;
            rawDisplayName: string;
        }

        export type LiveClientAbility = {
            abilityLevel: number;
            displayName: string;
            id: string;
            rawDescription: string;
            rawDisplayName: string;
        }

        export type LiveClientScore = {
            assists: number;
            creepScore: number;
            deaths: number;
            kills: number;
            wardScore: number;
        }

        export type LiveClientSummonerSpell = {
            displayName: string;
            rawDescription: string;
            rawDisplayName: string;
        }

        export type LiveClientData = {
            activePlayer: LiveClientActivePlayer,
            allPlayers: LiveClientPlayer[],
            events: {
                Events: LiveClientEvent[]
            },
            gameData: LiveClientGameData
        }

        export type LiveClientEvent = LiveClientGameStartEvent | LiveClientMinionsSpawningEvent | LiveClientFirstBrickEvent | LiveClientTurretKilledEvent | LiveClientInhibKilledEvent | LiveClientDragonKillEvent | LiveClientHeraldKillEvent | LiveClientBaronKillEvent | LiveClientChampionKillEvent | LiveClientMultikillEvent | LiveClientAceEvent | LiveClientEventBase & { EventName: string, [key: string]: string | number }

        export type LiveClientEventBase = {
            EventID: number;
            EventTime: number;
        }

        export type LiveClientGameStartEvent = {
            EventName: "GameStart"
        } & LiveClientEventBase

        export type LiveClientMinionsSpawningEvent = {
            EventName: "MinionsSpawning"
        } & LiveClientEventBase

        export type LiveClientFirstBrickEvent = {
            EventName: "FirstBrick",
            KillerName: string
        } & LiveClientEventBase

        export type LiveClientTurretKilledEvent = {
            EventName: "TurretKilled"
            TurretKilled: string,
            KillerName: string,
            Assisters: string[]
        } & LiveClientEventBase

        export type LiveClientInhibKilledEvent = {
            EventName: "InhibKilled",
            InhibKilled: string,
            KillerName: string,
            Assisters: string[]
        } & LiveClientEventBase

        export type LiveClientDragonKillEvent = {
            EventName: "DragonKill",
            DragonType: string,
            Stolen: "False" | "True",
            KillerName: string,
            Assisters: string[]
        } & LiveClientEventBase

        export type LiveClientHeraldKillEvent = {
            EventName: "HeraldKill",
            Stolen: "False" | "True",
            KillerName: string,
            Assisters: string[]
        } & LiveClientEventBase

        export type LiveClientBaronKillEvent = {
            EventName: "BaronKill",
            Stolen: "False" | "True",
            KillerName: string,
            Assisters: string[]
        } & LiveClientEventBase

        export type LiveClientChampionKillEvent = {
            EventName: "ChampionKill",
            KillerName: string,
            VictimName: string,
            Assisters: string[]
        } & LiveClientEventBase

        export type LiveClientMultikillEvent = {
            EventName: "Multikill",
            KillerName: string,
            KillStreak: number
        } & LiveClientEventBase

        export type LiveClientAceEvent = {
            EventName: "Ace",
            Acer: string,
            AcingTeam: string
        } & LiveClientEventBase
    }

    export namespace GameflowSession {
        export type GameClient = {
            observerServerIp: string;
            observerServerPort: number;
            running: boolean;
            serverIp: string;
            serverPort: number;
            visible: boolean;
        }

        export type PlayerChampionSelection = {
            championId: number;
            selectedSkinIndex: number;
            spell1Id: number;
            spell2Id: number;
            summonerInternalName: string;
        }

        export type GameTypeConfig = {
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

        export type Queue = {
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

        export type GameCustomization = {
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

        export type ChampSelectParticipant = {
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

        export type GameData = {
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

        export type GameDodgeData = {
            dodgeIds: any[];
            phase: string;
            state: string;
        }

        export type Map = {
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

        export type SessionData = {
            gameClient: GameClient;
            gameData: GameData;
            gameDodge: GameDodgeData;
            map: Map;
            phase: Phase;
        }

        export type Phase = "None" | "Lobby" | "Matchmaking" | "CheckedIntoTournament" | "ReadyCheck" | "ChampSelect" | "GameStart" | "FailedToLaunch" | "InProgress" | "Reconnect" | "WaitingForStats" | "PreEndOfGame" | "EndOfGame" | "TerminatedInError"
    }

    export namespace ChampSelect {
        export interface Session {
            actions: Action[][];
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
            myTeam: TeamMember[];
            recoveryCounter: number;
            rerollsRemaining: number;
            skipChampionSelect: boolean;
            theirTeam: TeamMember[];
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

        export type Phase = null | 'PLANNING' | 'BAN_PICK' | 'FINALIZATION';

        export type Action = {
            actorCellId: number;
            championId: number;
            completed: boolean;
            id: number;
            isAllyAction: boolean;
            isInProgress: boolean;
            type: "ban" | "pick" | "ten_bans_reveal";
        }

        export type TeamMember = {
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
    }

    export interface ClientEvents {
        "connection-state-change": (state: boolean) => void;
        "lcu-event": (event: [opcode: number, name: string, data: { eventType: string; uri: string; data: any; }]) => void;
        "champ-select-session-update": (oldSessionData: ChampSelect.Session | null, newSessionData: ChampSelect.Session | null) => void;
        "champ-select-phase-change": (previousPhase: Hasagi.ChampSelect.Phase, phase: Hasagi.ChampSelect.Phase) => void;
        "champ-select-local-player-ban": () => void;
        "champ-select-local-player-pick": () => void;
        "champ-select-local-player-pick-completed": (championKey: string) => void;
        "rune-pages-updated": () => void;
        "gameflow-session-update": (oldSessionData: Hasagi.GameflowSession.SessionData | null, newSessionData: Hasagi.GameflowSession.SessionData | null) => void;
        "gameflow-session-phase-update": (prevPhase: Hasagi.GameflowSession.Phase, newPhase: Hasagi.GameflowSession.Phase) => void;
        "champ-select-champion-intent-change": (summonerId: number, previousChampionIntent: number, championIntent: number) => void;
        //"champ-select-summoner-order-change": (order: string[]) => void;
    }

    export type LanguageCode = typeof import("./constants.js")["LANGUAGE_CODES"][number]
    export type ServerRegion = typeof import("./constants.js")["SERVER_REGIONS"][number]

    export type ImageData = {
        full: string;
        sprite: string;
        group: string;
        x: number;
        y: number;
        w: number;
        h: number;
    };

    export type MatchmakingData = {
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

    export interface RunePage {
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

    export type RankedEntry = {
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

    export type SeasonData = {
        currentSeasonEnd: number;
        currentSeasonId: number;
        nextSeasonStart: number;
    }

    export type CurrentRankData = {
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

    export type Summoner = {
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

    export type LoadoutEntry = {
        id: string;
        itemId?: any;
        loadout: Loadout;
        name: string;
        refreshTime: string;
        scope: string;
    }

    export type Loadout = {
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

    export namespace LoLChampionsV1 {
        export interface Ownership {
            loyaltyReward: boolean;
            owned: boolean;
            rental: {
                endDate: number;
                purchaseDate: number;
                rented: boolean;
                winCountRemaining: number;
            };
            xboxGPReward: boolean;
        }

        export interface SkinMinimal {
            championId: number;
            chromaPath: string | null;
            disabled: boolean;
            id: number;
            isBase: boolean;
            lastSelected: boolean;
            name: string;
            ownership: Ownership;
            splashPath: string;
            stillObtainable: boolean;
            tilePath: string;
        }

        export interface ChampionMinimal {
            active: boolean;
            alias: string;
            banVoPath: string;
            baseLoadScreenPath: string;
            baseSplashPath: string;
            botEnabled: boolean;
            chooseVoPath: string;
            disabledQueues: string[];
            freeToPlay: boolean;
            id: number;
            name: string;
            ownership: Ownership;
            purchased: number;
            rankedPlayEnabled: boolean;
            roles: string[];
            squarePortraitPath: string;
            stingerSfxPath: string;
            title: string;
        }
    }

    export namespace RiotClient {
        export interface RegionLocale {
            locale: string;
            region: string;
            webLanguage: string;
            webRegion: string;
        }
    }
}