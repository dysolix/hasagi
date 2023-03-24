import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { exec } from "child_process";
import { Agent } from "https";
import { TypedEmitter } from "tiny-typed-emitter";
import ChampSelectSession from "./Classes/ChampSelectSession.js";
import RunePage from "./Classes/RunePage.js";
import { WebSocket } from "ws";
import { delay, throwCurrentlyNotPossibleError, throwNotConnectedError } from "./util.js";

export default class Client extends TypedEmitter<Hasagi.ClientEvents> {
    static Instance: Client | null = null;

    public isConnected: boolean = false;

    public port: number | null = null;
    public authToken: string | null = null;

    private webSocket: WebSocket | null = null;
    private httpClient: AxiosInstance | null = null;
    private liveClientDataHttpClient = axios.create({
        baseURL: "https://127.0.0.1:2999",
        httpsAgent: new Agent({
            rejectUnauthorized: false
        }),
        adapter: "http"
    }); //new HttpsClient("127.0.0.1", 2999);

    public champSelectSession: ChampSelectSession | null = null;

    /** Some properties may be empty, null or undefined depending on gameFlowSession.phase. Value is null until the client first creates or joins a lobby.
    */
    public gameflowSession: Hasagi.GameFlowSession | null = null;

    public runePages: RunePage[] = [];

    private autoReconnect: boolean;

    /**
     * @param autoReconnect Determines if the client should automatically try to reconnect if the connection closes. Defaults to true.
     */
    constructor(autoReconnect = true) {
        super();

        this.autoReconnect = autoReconnect;
        Client.Instance = this;

        (window as any).axios = axios;
    }

    //#region Connection
    /**
     * Asynchronously connects to the League of Legends client
     */
    async connect() {
        if (this.isConnected) return;

        this.webSocket = null;
        this.port = null;
        this.authToken = null;
        this.httpClient = null;

        await new Promise(
            (resolve, reject) => {
                const child = exec('wmic PROCESS WHERE name=\'LeagueClientUx.exe\' GET commandline', (error, stdout, stderr) => {
                    let portArr = stdout.match("--app-port=([0-9]*)");
                    let passArr = stdout.match("--remoting-auth-token=([\\w-]*)");

                    child.kill();

                    if (portArr !== null && passArr !== null && (portArr?.length ?? 0) === 2 && (passArr?.length ?? 0) === 2) {
                        resolve({ port: Number(portArr[1]), authToken: String(passArr[1]) });
                    } else {
                        reject();
                    }
                });
            }
        ).then((data: any) => {
            let port = data.port;
            let authToken = Buffer.from(("riot:" + data.authToken)).toString("base64");

            let ws = new WebSocket(("wss://127.0.0.1:" + port), undefined, { headers: { Authorization: "Basic " + authToken }, rejectUnauthorized: false });

            ws.onopen = (ev: any) => {
                this.webSocket = ws;
                this.port = port;
                this.authToken = authToken;

                this.httpClient = axios.create({
                    baseURL: "https://127.0.0.1:" + port,
                    httpsAgent: new Agent({ rejectUnauthorized: false }),
                    auth: {
                        username: "riot",
                        password: data.authToken
                    },
                    adapter: "http"
                });

                // EVENTS
                delay(5000).then(async () => {
                    await Promise.allSettled([
                        this.getRunePagesFromClient().then(runePages => {
                            this.runePages = runePages;
                            this.emit("rune-pages-updated");
                        }),
                        this.getGameflowSession().then(gameflowSession => {
                            this.gameflowSession = gameflowSession
                            this.emit("gameflow-session-update")
                        }).catch() // Throws expected exception if gameFlowSession is not yet initialized in the League of Legends client.
                    ]);

                    this.subscribeEvent("OnJsonApiEvent");
                    this.isConnected = true;
                    this.emit("connection-state-change", true);
                })
            }
            ws.onclose = async (ev: any) => {
                this.isConnected = false;
                this.emit("connection-state-change", false);

                await delay(2500);
                if (this.autoReconnect)
                    this.connect()
            }
            ws.onerror = (ev: any) => {
                //SUPRESSES CONSOLE ERRORS
            }
            ws.onmessage = (ev) => {
                try {
                    let data = JSON.parse(ev.data.toString('utf8'));
                    if (data.length == 3) this.onSubscribedEvent(data);
                } catch (ex) { }
            }
        }, async err => {
            await delay(2500);
            if (this.autoReconnect)
                await this.connect()
            else
                throw new Error("Unable to connect to the League of Legends client.")
        });
    }

    /** For internal use only */
    private subscribeEvent(eventName: string) {
        if (this.webSocket !== null && this.webSocket.readyState === 1) {
            this.webSocket.send(JSON.stringify([5, eventName]));
        }
    }

    /** For internal use only */
    private unsubscribeEvent(eventName: string) {
        if (this.webSocket !== null && this.webSocket.readyState === 1) {
            this.webSocket.send(JSON.stringify([6, eventName]));
        }
    }

    private onSubscribedEvent(event: [opcode: number, name: string, data: { eventType: string; uri: string; data: any; }]) {
        let value = event[2];
        let eventType = value.eventType;
        let uri = value.uri;
        let data = value.data;

        switch (uri) {
            case this.LCUEndpoints.LobbyTeamBuilder.ChampSelect.Session.path: {
                this.onTeamBuilderChampSelectSessionUpdate(eventType, data);
                break;
            }

            case this.LCUEndpoints.Perks.Pages.path: {
                this.onPerksPagesUpdate(eventType, data);
                break;
            }

            case this.LCUEndpoints.Perks.CurrentPage.path: {
                this.onPerksCurrentPageUpdate(eventType, data);
                break;
            }

            case this.LCUEndpoints.Gameflow.Session.path: {
                this.onGameflowSessionUpdate(eventType, data);
                break;
            }

            case this.LCUEndpoints.LobbyTeamBuilder.ChampSelect.CurrentChampion.path: {
                this.onTeamBuilderChampSelectCurrentChampionUpdate(eventType, data);
                break;
            }

            case this.LCUEndpoints.LobbyTeamBuilder.ChampSelect.PickableSkinIds.path: {
                this.onTeamBuilderChampSelectPickableSkinIdsUpdate(eventType, data);
                break;
            }

            default:
                break;

        }

        this.emit("lcu-event", event);
    }
    //#endregion

    private async getGameflowSession(): Promise<Hasagi.GameFlowSession> {
        if (this.httpClient === null)
            throwNotConnectedError();

        return await this.LCUEndpoints.Gameflow.Session.get();
    }

    //#region Ready Check
    /**
     * Accepts a ready check
     */
    acceptMatch() {
        if (this.httpClient === null)
            throwNotConnectedError();

        return this.httpClient.post("/lol-lobby-team-builder/v1/ready-check/accept");
    }

    /**
     * Declines a ready check
     */
    declineMatch() {
        if (this.httpClient === null)
            throwNotConnectedError();

        return this.httpClient.post("/lol-lobby-team-builder/v1/ready-check/decline");
    }
    //#endregion

    //#region Champ Select
    declarePickIntent(championId: number | string) {
        if (this.httpClient === null)
            throwNotConnectedError();

        if (this.champSelectSession === null)
            throwCurrentlyNotPossibleError("Not in champ select");

        return this.httpClient.patch("/lol-lobby-team-builder/champ-select/v1/session/actions/" + this.champSelectSession.ownPickActionId, { championId: Number(championId) })
    }

    declareBanIntent(championId: number | string) {
        if (this.httpClient === null)
            throwNotConnectedError();

        if (this.champSelectSession === null)
            throwCurrentlyNotPossibleError("Not in champ select");

        return this.httpClient.patch("/lol-lobby-team-builder/champ-select/v1/session/actions/" + this.champSelectSession.ownBanActionId, { championId: Number(championId) })
    }

    lockPick() {
        if (this.httpClient === null)
            throwNotConnectedError();

        if (this.champSelectSession === null)
            throwCurrentlyNotPossibleError("Not in champ select");

        return this.httpClient.post("/lol-lobby-team-builder/champ-select/v1/session/actions/" + this.champSelectSession.ownPickActionId + "/complete")
    }

    lockBan() {
        if (this.httpClient === null)
            throwNotConnectedError();

        if (this.champSelectSession === null)
            throwCurrentlyNotPossibleError("Not in champ select");

        return this.httpClient.post("/lol-lobby-team-builder/champ-select/v1/session/actions/" + this.champSelectSession.ownBanActionId + "/complete")
    }
    //#endregion

    //#region Runes
    /**
     * @returns The currently active rune page or null, if not found
     */
    getActiveRunePage(): RunePage | null {
        return this.runePages.find(page => page.current) ?? null;
    }

    getRunePagesFromClient() {
        if (this.httpClient === null)
            throwNotConnectedError();

        return this.LCUEndpoints.Perks.Pages.get();
    }

    /**
     * @returns An array of editable rune pages
     */
    getEditableRunePages(): RunePage[] {
        return this.runePages.filter(page => page.isEditable);
    }

    /**  
     * Sets a rune page as the active rune page
     * @param id The rune page's id
     */
    setActiveRunePage(id: number | string) {
        return this.LCUEndpoints.Perks.CurrentPage.put(Number(id));
    }

    /**  
     * Deletes a rune page
     * @param id The rune page's id
     */
    deleteRunePage(id: number | string) {
        return this.LCUEndpoints.Perks.Pages.WithId.delete(Number(id));
    }

    async replaceRunePage(id: number, runePage: RunePage) {
        let targetPage = this.runePages.find(rp => rp.id === id);
        if (targetPage === undefined)
            return;

        runePage.order = targetPage.order;

        console.log(runePage instanceof RunePage);

        await this.deleteRunePage(targetPage.id);
        await this.createRunePage(runePage);
    }

    /**
     * Creates a rune page in the client
     * @param page The rune page
     */
    async createRunePage(page: RunePage | { name: string, runes: number[], primaryRuneTree?: number, secondaryRuneTree?: number }) {
        if (this.httpClient === null)
            throwNotConnectedError();

        if (!(page instanceof RunePage))
            page = await RunePage.Create(page.name, page.runes, page.primaryRuneTree, page.secondaryRuneTree);

        await this.LCUEndpoints.Perks.Pages.post(page);
    }

    /**
     * Searches for a rune page with a certain id
     * @param id The id to search for 
     */
    getRunePageById(id: number | string): RunePage | null {
        return this.runePages.find(page => page.id == id) ?? null;
    }
    //#endregion

    //#region Live Client Data

    /**
     * @param timeout Timeout in milliseconds; defaults to 15 seconds
     * @returns true, when live client data is available
     */
    async waitForLiveClientAvailability(timeout = 15000) {
        let elapsedTime = 0;
        while (elapsedTime < timeout) {
            let summonerName = await this.getLiveClientActivePlayerSummonerName();
            if (summonerName !== null)
                return true;

            await delay(1000);
            elapsedTime += 1000;
        }

        return false;
    }

    async getLiveClientActivePlayerSummonerName() {
        try {
            return await this.liveClientDataHttpClient.get("/liveclientdata/activeplayername").then(res => res.data) as string;
        } catch {
            // NOT INGAME
            return null;
        }
    }

    async getLiveClientData(): Promise<Hasagi.LiveClientData | null> {
        try {
            return await this.liveClientDataHttpClient.get("/liveclientdata/allgamedata").then(res => res.data)
        } catch {
            // NOT INGAME
            return null;
        }
    }

    async getLiveClientActivePlayer(): Promise<Hasagi.LiveClientActivePlayer | null> {
        try {
            return await this.liveClientDataHttpClient.get("/liveclientdata/activeplayer").then(res => res.data)
        } catch {
            // NOT INGAME
            return null;
        }
    }

    async getLiveClientActivePlayerAbilities(): Promise<Hasagi.LiveClientActivePlayerAbilities | null> {
        try {
            return await this.liveClientDataHttpClient.get("/liveclientdata/activeplayerabilities").then(res => res.data)
        } catch {
            // NOT INGAME
            return null;
        }
    }

    async getLiveClientActivePlayerRunes(): Promise<Hasagi.LiveClientActivePlayerRunes | null> {
        try {
            return await this.liveClientDataHttpClient.get("/liveclientdata/activeplayerrunes").then(res => res.data)
        } catch {
            // NOT INGAME
            return null;
        }
    }

    async getLiveClientPlayerList(): Promise<Hasagi.LiveClientPlayer[] | null> {
        try {
            return await this.liveClientDataHttpClient.get("/liveclientdata/playerlist").then(res => res.data)
        } catch {
            // NOT INGAME
            return null;
        }
    }

    async getLiveClientPlayerScore(summonerName: string): Promise<Hasagi.LiveClientScore | null> {
        try {
            return await this.liveClientDataHttpClient.get("/liveclientdata/playerscores?summonerName=" + summonerName).then(res => res.data)
        } catch {
            // NOT INGAME
            return null;
        }
    }

    async getLiveClientPlayerSummonerSpells(summonerName: string): Promise<Hasagi.LiveClientSummonerSpells | null> {
        try {
            return await this.liveClientDataHttpClient.get("/liveclientdata/playersummonerspells?summonerName=" + summonerName).then(res => res.data)
        } catch {
            // NOT INGAME
            return null;
        }
    }

    async getLiveClientPlayerMainRunes(summonerName: string): Promise<Hasagi.LiveClientMainRunes | null> {
        try {
            return await this.liveClientDataHttpClient.get("/liveclientdata/playermainrunes?summonerName=" + summonerName).then(res => res.data)
        } catch {
            // NOT INGAME
            return null;
        }
    }

    async getLiveClientPlayerItems(summonerName: string): Promise<Hasagi.LiveClientPlayerItem[] | null> {
        try {
            return await this.liveClientDataHttpClient.get("/liveclientdata/playeritems?summonerName=" + summonerName).then(res => res.data)
        } catch {
            // NOT INGAME
            return null;
        }
    }

    async getLiveClientEvents(): Promise<{ Events: Hasagi.LiveClientEvent[] } | null> {
        try {
            return await this.liveClientDataHttpClient.get("/liveclientdata/eventdata").then(res => res.data)
        } catch {
            // NOT INGAME
            return null;
        }
    }

    async getLiveClientGameStats(): Promise<Hasagi.LiveClientGameData | null> {
        try {
            return await this.liveClientDataHttpClient.get("/liveclientdata/gamestats").then(res => res.data)
        } catch {
            // NOT INGAME
            return null;
        }
    }
    //#endregion

    //#region EventHandler

    private onTeamBuilderChampSelectSessionUpdate(eventType: string, data: any) {
        if (eventType === "Delete") {
            this.champSelectSession = null;
            this.emit("champ-select-session-update");
            return;
        }

        let oldSessionData = this.champSelectSession;
        let newSessionData = new ChampSelectSession(data);
        this.champSelectSession = newSessionData;
        this.emit("champ-select-session-update");

        if (oldSessionData !== null) {
            if (newSessionData.getPhase() !== oldSessionData.getPhase()) {
                this.emit("champ-select-phase-change", oldSessionData.getPhase(), newSessionData.getPhase());
            }
            if (newSessionData.isBanPhase() && oldSessionData.getPhase() === "PLANNING") {
                this.emit("champ-select-local-player-ban");
            }
            if (newSessionData.inProgressActionIds.includes(newSessionData.ownPickActionId) && !oldSessionData.inProgressActionIds.includes(newSessionData.ownPickActionId)) {
                this.emit("champ-select-local-player-pick")
            }

            //TODO PICK INTENT CHANGE
            const changedPickIntents: { summonerId: number, previousPickIntent: number, pickIntent: number }[] = [];
            newSessionData.myTeam.forEach((p, index) => {
                const previousPickIntent = oldSessionData!.myTeam[index].championPickIntent;
                const pickIntent = p.championPickIntent;

                if (previousPickIntent !== pickIntent || p.championId !== 0 && oldSessionData?.myTeam[index].championId === 0) {
                    changedPickIntents.push({
                        summonerId: p.summonerId,
                        previousPickIntent,
                        pickIntent: p.championId !== 0 ? p.championId : pickIntent
                    })
                }
            })

            changedPickIntents.forEach(changedPickIntent => this.emit("champ-select-champion-intent-change", changedPickIntent.summonerId, changedPickIntent.previousPickIntent, changedPickIntent.pickIntent))

        } else {
            this.emit("champ-select-phase-change", null, newSessionData.getPhase());
        }
    }

    private onPerksPagesUpdate(eventType: string, data: any) {
        if (eventType === "Update") {
            let runes: any[] = data;
            this.runePages = runes.map(rune => new RunePage(rune));
            this.emit("rune-pages-updated");
        }
    }

    private onPerksCurrentPageUpdate(eventType: string, data: any) {
        let updatedRunePage = data;
        let index = this.runePages.findIndex(rp => rp.id === updatedRunePage.id);
        let currentIndex = this.runePages.findIndex(rp => rp.current);
        if (currentIndex !== -1) this.runePages[currentIndex].current = false;
        if (index === -1) return;
        this.runePages[index] = updatedRunePage;
        this.emit("rune-pages-updated");
    }

    public currentQueue: Hasagi.Queue | null = null;
    public currentMapId: number | null = null;

    private onGameflowSessionUpdate(eventType: string, data: any) {
        switch (eventType) {
            case "Delete": {
                break;
            }

            default: {
                let previousPhase = this.gameflowSession?.phase ?? "None";
                let currentPhase = data.phase ?? "None";
                if (previousPhase !== currentPhase)
                    this.emit("gameflow-session-phase-update", previousPhase, currentPhase);
                this.gameflowSession = data;
                this.currentQueue = this.gameflowSession?.gameData.queue ?? null;
                this.currentMapId = this.gameflowSession?.map.id ?? null;
                this.emit("gameflow-session-update");
                break;
            }
        }
    }

    private onTeamBuilderChampSelectCurrentChampionUpdate(eventType: string, data: any) {
        switch (eventType) {
            case "Delete":
                break;

            default:
                this.emit("champ-select-local-player-pick-completed", String(data));
                break;
        }
    }

    /**
     * This only gets updated in champ select
     */
    pickableSkinIds: number[] = [];
    private onTeamBuilderChampSelectPickableSkinIdsUpdate(eventType: string, data: any) {
        if (eventType === "Delete")
            return;

        this.pickableSkinIds = data;
    }

    //#endregion

    /**
     * Endpoints from http://www.mingweisamuel.com/lcu-schema/tool/. All response and body types can be found there.
     */
    LCUEndpoints = {
        LobbyTeamBuilder: {
            ChampSelect: {
                Session: {
                    path: "/lol-lobby-team-builder/champ-select/v1/session",
                    async get(): Promise<Hasagi.IChampSelectSession> {
                        if (Client.Instance!.httpClient === null)
                            throwNotConnectedError();

                        return await Client.Instance!.httpClient.get(this.path).then(res => res.data);
                    },
                    Timer: {
                        path: "/lol-lobby-team-builder/champ-select/v1/session/timer",
                        async get() {
                            if (Client.Instance!.httpClient === null)
                                throwNotConnectedError();

                            return await Client.Instance!.httpClient.get(this.path).then(res => res.data);
                        }
                    },
                    Trades: {
                        path: "/lol-lobby-team-builder/champ-select/v1/session/trades",
                        async get() {
                            if (Client.Instance!.httpClient === null)
                                throwNotConnectedError();

                            return await Client.Instance!.httpClient.get(this.path).then(res => res.data);
                        },
                    },
                    TradesWithId: {
                        getPath: (id: string | number) => `/lol-lobby-team-builder/champ-select/v1/session/trades/${id}`,
                        async get(id: string | number): Promise<any> {
                            if (Client.Instance!.httpClient === null)
                                throwNotConnectedError();

                            return await Client.Instance!.httpClient.get(this.getPath(id)).then(res => res.data);
                        }
                    }
                },
                BannableChampionIds: {
                    path: "/lol-lobby-team-builder/champ-select/v1/bannable-champion-ids",
                    async get() {
                        if (Client.Instance!.httpClient === null)
                            throwNotConnectedError();

                        return await Client.Instance!.httpClient.get(this.path).then(res => res.data);
                    }
                },
                CurrentChampion: {
                    path: "/lol-lobby-team-builder/champ-select/v1/current-champion",
                    async get() {
                        if (Client.Instance!.httpClient === null)
                            throwNotConnectedError();

                        return await Client.Instance!.httpClient.get(this.path).then(res => res.data);
                    }
                },
                DisabledChampionIds: {
                    path: "/lol-lobby-team-builder/champ-select/v1/disabled-champion-ids",
                    async get() {
                        if (Client.Instance!.httpClient === null)
                            throwNotConnectedError();

                        return await Client.Instance!.httpClient.get(this.path).then(res => res.data);
                    }
                },
                HasAutoAssignedSmite: {
                    path: "/lol-lobby-team-builder/champ-select/v1/has-auto-assigned-smite",
                    async get() {
                        if (Client.Instance!.httpClient === null)
                            throwNotConnectedError();

                        return await Client.Instance!.httpClient.get(this.path).then(res => res.data);
                    }
                },
                ImplementationActive: {
                    path: "/lol-lobby-team-builder/champ-select/v1/implementation-active",
                    async get() {
                        if (Client.Instance!.httpClient === null)
                            throwNotConnectedError();

                        return await Client.Instance!.httpClient.get(this.path).then(res => res.data);
                    }
                },
                MatchToken: {
                    path: "/lol-lobby-team-builder/champ-select/v1/match-token",
                    async get() {
                        if (Client.Instance!.httpClient === null)
                            throwNotConnectedError();

                        return await Client.Instance!.httpClient.get(this.path).then(res => res.data);
                    }
                },
                PickableChampionIds: {
                    path: "/lol-lobby-team-builder/champ-select/v1/pickable-champion-ids",
                    async get() {
                        if (Client.Instance!.httpClient === null)
                            throwNotConnectedError();

                        return await Client.Instance!.httpClient.get(this.path).then(res => res.data);
                    }
                },
                PickableSkinIds: {
                    path: "/lol-lobby-team-builder/champ-select/v1/pickable-skin-ids",
                    async get() {
                        if (Client.Instance!.httpClient === null)
                            throwNotConnectedError();

                        return await Client.Instance!.httpClient.get(this.path).then(res => res.data);
                    }
                },
                Preferences: {
                    path: "/lol-lobby-team-builder/champ-select/v1/preferences",
                    async get() {
                        if (Client.Instance!.httpClient === null)
                            throwNotConnectedError();

                        return await Client.Instance!.httpClient.get(this.path).then(res => res.data);
                    }
                },
                SendingLoadoutsGcosEnabled: {
                    path: "/lol-lobby-team-builder/champ-select/v1/sending-loadouts-gcos-enabled",
                    async get() {
                        if (Client.Instance!.httpClient === null)
                            throwNotConnectedError();

                        return await Client.Instance!.httpClient.get(this.path).then(res => res.data);
                    }
                },
                TeamBoost: {
                    path: "/lol-lobby-team-builder/champ-select/v1/team-boost",
                    async get() {
                        if (Client.Instance!.httpClient === null)
                            throwNotConnectedError();

                        return await Client.Instance!.httpClient.get(this.path).then(res => res.data);
                    }
                },
                Matchmaking: {
                    path: "/lol-lobby-team-builder/v1/matchmaking",
                    async get() {
                        if (Client.Instance!.httpClient === null)
                            throwNotConnectedError();

                        return await Client.Instance!.httpClient.get(this.path).then(res => res.data);
                    }
                }
            }
        },
        Perks: {
            CurrentPage: {
                path: "/lol-perks/v1/currentpage",
                async get() {
                    if (Client.Instance!.httpClient === null)
                        throwNotConnectedError();

                    return await Client.Instance!.httpClient.get(this.path).then(res => res.data);
                },
                async put(id: number) {
                    if (Client.Instance!.httpClient === null)
                        throwNotConnectedError();

                    await Client.Instance!.httpClient.put(this.path, id);
                }
            },
            CustomizationLimits: {
                path: "/lol-perks/v1/customizationlimits",
                async get() {
                    if (Client.Instance!.httpClient === null)
                        throwNotConnectedError();

                    return await Client.Instance!.httpClient.get(this.path).then(res => res.data);
                }
            },
            Inventory: {
                path: "/lol-perks/v1/inventory",
                async get() {
                    if (Client.Instance!.httpClient === null)
                        throwNotConnectedError();

                    return await Client.Instance!.httpClient.get(this.path).then(res => res.data);
                }
            },
            Pages: {
                path: "/lol-perks/v1/pages",
                async get(): Promise<RunePage[]> {
                    if (Client.Instance!.httpClient === null)
                        throwNotConnectedError();

                    return await Client.Instance!.httpClient.get(this.path, { transformResponse: res => JSON.parse(res).map((entry: any) => new RunePage(entry)) }).then(res => res.data);
                },
                async post(runePage: RunePage) {
                    if (Client.Instance!.httpClient === null)
                        throwNotConnectedError();

                    await Client.Instance!.httpClient.post(this.path, runePage);
                },

                WithId: {
                    getPath: (id: string | number) => `/lol-perks/v1/pages/${id}`,
                    async get(id: string | number): Promise<any> {
                        if (Client.Instance!.httpClient === null)
                            throwNotConnectedError();

                        return (await Client.Instance!.httpClient.get(this.getPath(id))).data;
                    },
                    async delete(id: number) {
                        if (Client.Instance!.httpClient === null)
                            throwNotConnectedError();

                        await Client.Instance!.httpClient.delete(this.getPath(id));
                    }
                }
            },
            Perks: {
                path: "/lol-perks/v1/perks",
                async get(): Promise<Hasagi.Rune[]> {
                    if (Client.Instance!.httpClient === null)
                        throwNotConnectedError();

                    return await Client.Instance!.httpClient.get(this.path).then(res => res.data);
                },
                Disabled: {
                    path: "/lol-perks/v1/perks/disabled",
                    async get() {
                        if (Client.Instance!.httpClient === null)
                            throwNotConnectedError();

                        return await Client.Instance!.httpClient.get(this.path).then(res => res.data);
                    }
                },
                GameplayUpdated: {
                    path: "/lol-perks/v1/perks/gameplay-updated",
                    async get() {
                        if (Client.Instance!.httpClient === null)
                            throwNotConnectedError();

                        return await Client.Instance!.httpClient.get(this.path).then(res => res.data);
                    }
                }
            },
            SchemaVersion: {
                path: "/lol-perks/v1/schema-version",
                async get() {
                    if (Client.Instance!.httpClient === null)
                        throwNotConnectedError();

                    return await Client.Instance!.httpClient.get(this.path).then(res => res.data);
                }
            },
            ServiceSettings: {
                path: "/lol-perks/v1/servicesettings",
                async get() {
                    if (Client.Instance!.httpClient === null)
                        throwNotConnectedError();

                    return await Client.Instance!.httpClient.get(this.path).then(res => res.data);
                }
            },
            Settings: {
                path: "/lol-perks/v1/settings",
                async get() {
                    if (Client.Instance!.httpClient === null)
                        throwNotConnectedError();

                    return await Client.Instance!.httpClient.get(this.path).then(res => res.data);
                }
            },
            ShowAutoModifiedPagesNotification: {
                path: "/lol-perks/v1/show-auto-modified-pages-notification",
                async get() {
                    if (Client.Instance!.httpClient === null)
                        throwNotConnectedError();

                    return await Client.Instance!.httpClient.get(this.path).then(res => res.data);
                }
            },
            Styles: {
                path: "/lol-perks/v1/styles",
                async get() {
                    if (Client.Instance!.httpClient === null)
                        throwNotConnectedError();

                    return await Client.Instance!.httpClient.get(this.path).then(res => res.data);
                }
            }
        },
        Gameflow: {
            ActivePatcherLock: {
                path: "/lol-gameflow/v1/active-patcher-lock",
                async get() {
                    if (Client.Instance!.httpClient === null)
                        throwNotConnectedError();

                    return await Client.Instance!.httpClient.get(this.path).then(res => res.data);
                }
            },
            Availability: {
                path: "/lol-gameflow/v1/availability",
                async get() {
                    if (Client.Instance!.httpClient === null)
                        throwNotConnectedError();

                    return await Client.Instance!.httpClient.get(this.path).then(res => res.data);
                }
            },
            BasicTutorial: {
                path: "/lol-gameflow/v1/basic-tutorial",
                async get() {
                    if (Client.Instance!.httpClient === null)
                        throwNotConnectedError();

                    return await Client.Instance!.httpClient.get(this.path).then(res => res.data);
                }
            },
            BattleTraining: {
                path: "/lol-gameflow/v1/battle-training",
                async get() {
                    if (Client.Instance!.httpClient === null)
                        throwNotConnectedError();

                    return await Client.Instance!.httpClient.get(this.path).then(res => res.data);
                }
            },
            EarlyExitNotification: {
                Eog: {
                    path: "/lol-gameflow/v1/early-exit-notifications/eog",
                    async get() {
                        if (Client.Instance!.httpClient === null)
                            throwNotConnectedError();

                        return await Client.Instance!.httpClient.get(this.path).then(res => res.data);
                    }
                },
                Missions: {
                    path: "/lol-gameflow/v1/early-exit-notifications/missions",
                    async get() {
                        if (Client.Instance!.httpClient === null)
                            throwNotConnectedError();

                        return await Client.Instance!.httpClient.get(this.path).then(res => res.data);
                    }
                }
            },
            ExtraGameClientArgs: {
                path: "/lol-gameflow/v1/extra-game-client-args",
                async get() {
                    if (Client.Instance!.httpClient === null)
                        throwNotConnectedError();

                    return await Client.Instance!.httpClient.get(this.path).then(res => res.data);
                }
            },
            GameflowMetadata: {
                PlayerStatus: {
                    path: "/lol-gameflow/v1/gameflow-metadata/player-status",
                    async get() {
                        if (Client.Instance!.httpClient === null)
                            throwNotConnectedError();

                        return await Client.Instance!.httpClient.get(this.path).then(res => res.data);
                    }
                },
                RegistrationStatus: {
                    path: "/lol-gameflow/v1/gameflow-metadata/registration-status",
                    async get() {
                        if (Client.Instance!.httpClient === null)
                            throwNotConnectedError();

                        return await Client.Instance!.httpClient.get(this.path).then(res => res.data);
                    }
                }
            },
            GameflowPhase: {
                path: "/lol-gameflow/v1/gameflow-phase",
                async get(): Promise<Hasagi.GameFlowPhase> {
                    if (Client.Instance!.httpClient === null)
                        throwNotConnectedError();

                    return await Client.Instance!.httpClient.get(this.path).then(res => res.data);
                }
            },
            Session: {
                path: "/lol-gameflow/v1/session",
                async get(): Promise<Hasagi.GameFlowSession> {
                    if (Client.Instance!.httpClient === null)
                        throwNotConnectedError();

                    return await Client.Instance!.httpClient.get(this.path).then(res => res.data);
                },
                PerPositionSummonerSpells: {
                    Disallowed: {
                        path: "/lol-gameflow/v1/session/per-position-summoner-spells/disallowed",
                        async get() {
                            if (Client.Instance!.httpClient === null)
                                throwNotConnectedError();

                            return await Client.Instance!.httpClient.get(this.path).then(res => res.data);
                        },
                        AsString: { path: "/lol-gameflow/v1/session/per-position-summoner-spells/disallowed/as-string" }
                    },
                    Required: {
                        path: "/lol-gameflow/v1/session/per-position-summoner-spells/required",
                        async get() {
                            if (Client.Instance!.httpClient === null)
                                throwNotConnectedError();

                            return await Client.Instance!.httpClient.get(this.path).then(res => res.data);
                        },
                        AsString: {
                            path: "/lol-gameflow/v1/session/per-position-summoner-spells/required/as-string",
                            async get() {
                                if (Client.Instance!.httpClient === null)
                                    throwNotConnectedError();

                                return await Client.Instance!.httpClient.get(this.path).then(res => res.data);
                            }
                        }
                    }
                }
            },
            Spectate: {
                path: "/lol-gameflow/v1/spectate",
                async get() {
                    if (Client.Instance!.httpClient === null)
                        throwNotConnectedError();

                    return await Client.Instance!.httpClient.get(this.path).then(res => res.data);
                },
                DelayedLaunch: {
                    path: "/lol-gameflow/v1/spectate/delayed-launch",
                    async get() {
                        if (Client.Instance!.httpClient === null)
                            throwNotConnectedError();

                        return await Client.Instance!.httpClient.get(this.path).then(res => res.data);
                    }
                }
            },
            Watch: {
                path: "/lol-gameflow/v1/watch",
                async get() {
                    if (Client.Instance!.httpClient === null)
                        throwNotConnectedError();

                    return await Client.Instance!.httpClient.get(this.path).then(res => res.data);
                }
            }
        },
        Ranked: {
            CurrentRankedStats: {
                path: "/lol-ranked/v1/current-ranked-stats",
                async get(): Promise<Hasagi.CurrentRankData> {
                    if (Client.Instance!.httpClient === null)
                        throwNotConnectedError();

                    return await Client.Instance!.httpClient.get(this.path).then(res => res.data);
                }
            }
        },
        Summoner: {
            CurrentSummoner: {
                path: "/lol-summoner/v1/current-summoner",
                async get() {
                    if (Client.Instance!.httpClient === null)
                        throwNotConnectedError();

                    return await Client.Instance!.httpClient.get(this.path).then(res => res.data as Hasagi.Summoner);
                }
            },
            Summoners: {
                WithId: {
                    getPath: (id: number) => `/lol-summoner/v1/summoners/${id}`,
                    async get(id: number) {
                        if (Client.Instance!.httpClient === null)
                            throwNotConnectedError();

                        return await Client.Instance!.httpClient.get(this.getPath(id)).then(res => res.data as Hasagi.Summoner);
                    }
                }
            }
        },
        Loadouts: {
            LoadoutsReady: {
                path: "/lol-loadouts/v1/loadouts-ready",

            },
            Loadouts: {
                path: "/lol-loadouts/v4/loadouts",
                WithId: {
                    getPath: (id: string) => `/lol-loadouts/v4/loadouts/${id}`,
                    async get(id: string) {
                        if (Client.Instance!.httpClient === null)
                            throwNotConnectedError();

                        return await Client.Instance!.httpClient.get(this.getPath(id)).then(res => res.data);
                    },
                    async put(id: string, body: any) {
                        if (Client.Instance!.httpClient === null)
                            throwNotConnectedError();

                        await Client.Instance!.httpClient.put(this.getPath(id), body);
                    },
                    async delete(id: string) {
                        if (Client.Instance!.httpClient === null)
                            throwNotConnectedError();

                        await Client.Instance!.httpClient.delete(this.getPath(id));
                    },
                    async patch(id: string, body: any) {
                        if (Client.Instance!.httpClient === null)
                            throwNotConnectedError();

                        await Client.Instance!.httpClient.patch(this.getPath(id), body);
                    }
                },
                Scope: {
                    Account: {
                        path: "/lol-loadouts/v4/loadouts/scope/account",
                        async get() {
                            if (Client.Instance!.httpClient === null)
                                throwNotConnectedError();

                            return await Client.Instance!.httpClient.get(this.path).then(res => res.data as Hasagi.LoadoutEntry[]);
                        }
                    }
                }
            }
        },
        Cosmetics: {
            Selection: {
                Companion: {
                    path: "/lol-cosmetics/v1/selection/companion",
                    async put(id: number) {
                        if (Client.Instance!.httpClient === null)
                            throwNotConnectedError();

                        return await Client.Instance!.httpClient.put(this.path, id, { headers: { "content-type": "application/json" } });
                    }
                },
                TftDamageSkin: {
                    path: "/lol-cosmetics/v1/selection/tft-damage-skin",
                    async put(id: number) {
                        if (Client.Instance!.httpClient === null)
                            throwNotConnectedError();

                        return await Client.Instance!.httpClient.put(this.path, id, { headers: { "content-type": "application/json" } });
                    }
                },
                TftMapSkin: {
                    path: "/lol-cosmetics/v1/selection/tft-map-skin",
                    async put(id: number) {
                        if (Client.Instance!.httpClient === null)
                            throwNotConnectedError();

                        return await Client.Instance!.httpClient.put(this.path, id, { headers: { "content-type": "application/json" } });
                    }
                }
            }
        }
    }

    /**
     * Send a request to the League of Legends client. Authentication is automatically included and the base url is already set.
     */
    request<ResponseDataType = any, ResponseType = AxiosResponse<ResponseDataType, any>, BodyType = any>(config: AxiosRequestConfig<BodyType>) {
        if (this.httpClient === null)
            throwNotConnectedError();

        return this.httpClient.request<ResponseDataType, ResponseType, BodyType>(config);
    }
}