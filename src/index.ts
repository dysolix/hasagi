import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { exec } from "child_process";
import ChampSelectSession from "./Classes/ChampSelectSession.js";
import RunePage from "./Classes/RunePage.js";
import { TypedEmitter } from 'tiny-typed-emitter';
import * as WebSocket from "ws";
import { Agent } from 'https';

//#region Client
export class Client extends TypedEmitter<Hasagi.ClientEvents> {
    static Instance: Client | null = null;

    public isConnected: boolean = false;

    public port: number | null = null;
    public authToken: string | null = null;

    private webSocket: WebSocket | null = null;
    private httpClient: AxiosInstance | null = null;
    private liveClientDataHttpClient = axios.create({
        url: "https://127.0.0.1:2999",
        httpsAgent: new Agent({
            rejectUnauthorized: false
        })
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
                exec('wmic PROCESS WHERE name=\'LeagueClientUx.exe\' GET commandline', (error, stdout, stderr) => {
                    let portArr = stdout.match("--app-port=([0-9]*)");
                    let passArr = stdout.match("--remoting-auth-token=([\\w-]*)");

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
                this.emit("connection-state-change", true);

                this.httpClient = axios.create({
                    baseURL: "https://127.0.0.1:" + port,
                    headers: {
                        'Authorization': "Basic " + authToken
                    },
                    httpsAgent: new Agent({ rejectUnauthorized: false })
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

        const response = await this.httpClient.get(this.LCUEndpoints.Gameflow.Session.path);
        if (response.status !== 200)
            throw new RequestError(response.status, response.statusText);

        return response.data;
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

        let session = new ChampSelectSession(data);

        if (this.champSelectSession !== null) {
            if (session.getPhase() !== this.champSelectSession.getPhase()) {
                this.emit("champ-select-phase-change", this.champSelectSession.getPhase(), session.getPhase());
            }
            if (session.isBanPhase() && this.champSelectSession.getPhase() === "PLANNING") {
                this.emit("champ-select-local-player-ban");
            }
            if (session.inProgressActionIds.includes(session.ownPickActionId) && !this.champSelectSession.inProgressActionIds.includes(session.ownPickActionId)) {
                this.emit("champ-select-local-player-pick")
            }
        } else {
            this.emit("champ-select-phase-change", null, session.getPhase());
        }

        this.champSelectSession = session;
        this.emit("champ-select-session-update");
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
                this.emit("champ-select-local-player-pick-completed", data);
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

                    return await Client.Instance!.httpClient.get(this.path, { transformResponse: res => res.map((entry: any) => new RunePage(entry)) }).then(res => res.data);
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

                    return await Client.Instance!.httpClient.get(this.path).then(res => res.data);
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
//#endregion

//#region Data
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

export const Data = {
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
            if (isPatchNewer(key, patch))
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
            latest = await httpGet<string>(`https://ddragon.leagueoflegends.com/realms/${region}.json`, res => res.dd);
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
        return httpGet<Hasagi.Champion[]>(Data.getDataDragonURL(options.patch, options.language, "championFull.json"), res => Object.values(res.data))
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
        return httpGet<Hasagi.SummonerSpell[]>(Data.getDataDragonURL(options.patch, options.language, "summoner.json"), res => res.data)
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
    if(Array.isArray(options)){
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

//#endregion

//#region Util
async function httpGet<T = any>(url: string, transform?: (response: any) => T) {
    const res = await axios.request({
        method: "GET",
        url,
        transformResponse: transform
    });

    return res.data as T;
}

/**
 * @returns true, if firstPatch is newer than or as new as secondPatch
 */
function isPatchNewer(firstPatch: string, secondPatch: string): boolean {
    let firstPatchArr = firstPatch.split(".").map(n => Number(n));
    let secondPatchArr = secondPatch.split(".").map(n => Number(n));

    for (let i = 0; i < firstPatchArr.length; i++) {
        if (firstPatchArr[i] > secondPatchArr[i])
            return true;
        if (firstPatchArr[i] < secondPatchArr[i])
            return false;
    }

    return true;
}

const delay = (delay: number) => new Promise(resolve => setTimeout(resolve, delay)) as Promise<void>;
//#endregion

//#region Errors
class RequestError extends Error {
    public additionalInformation: any;
    constructor(statusCode: number, statusText: string, additionalInformation?: any) {
        super(`Received status code '${statusCode} ${statusText}'.`)
        this.additionalInformation = additionalInformation;
    }
}

function throwNotConnectedError(): never {
    throw new Error("Hasagi is not connected to the League of Legends client.");
}

function throwCurrentlyNotPossibleError(reason: string): never {
    throw new Error(`This action is currently not possible. (${reason})`)
}
//#endregion