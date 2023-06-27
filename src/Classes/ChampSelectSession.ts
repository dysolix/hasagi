export default class ChampSelectSession implements Hasagi.ChampSelect.Session {
    ownBanActionId: number;
    ownPickActionId: number;
    inProgressActionIds: number[];
    actions: Hasagi.ChampSelect.Action[][];
    allowBattleBoost: boolean;
    allowDuplicatePicks: boolean;
    allowLockedEvents: boolean;
    allowRerolling: boolean;
    allowSkinSelection: boolean;
    benchChampionIds: number[];
    benchEnabled: boolean;
    boostableSkinCount: number;
    chatDetails: { chatRoomName: string; chatRoomPassword: string; };
    counter: number;
    entitledFeatureState: { additionalRerolls: number; unlockedSkinIds: number[]; };
    gameId: number;
    hasSimultaneousBans: boolean;
    hasSimultaneousPicks: boolean;
    isSpectating: boolean;
    localPlayerCellId: number;
    lockedEventIndex: number;
    myTeam: Hasagi.ChampSelect.TeamMember[];
    recoveryCounter: number;
    rerollsRemaining: number;
    skipChampionSelect: boolean;
    theirTeam: Hasagi.ChampSelect.TeamMember[];
    timer: { adjustedTimeLeftInPhase: number; internalNowInEpochMs: number; isInfinite: true; phase: string; totalTimeInPhase: number; };
    trades: { cellId: number; id: number; state: string; }[];

    constructor(data: Hasagi.ChampSelect.Session) {
        this.ownBanActionId = -1;
        this.ownPickActionId = -1;
        this.inProgressActionIds = [];

        this.actions = data.actions;
        this.allowBattleBoost = data.allowBattleBoost;
        this.allowDuplicatePicks = data.allowDuplicatePicks;
        this.allowLockedEvents = data.allowLockedEvents;
        this.allowRerolling = data.allowRerolling;
        this.allowSkinSelection = data.allowSkinSelection;
        this.benchChampionIds = data.benchChampionIds;
        this.benchEnabled = data.benchEnabled;
        this.boostableSkinCount = data.boostableSkinCount;
        this.chatDetails = data.chatDetails;
        this.counter = data.counter;
        this.entitledFeatureState = data.entitledFeatureState;
        this.gameId = data.gameId;
        this.hasSimultaneousBans = data.hasSimultaneousBans;
        this.hasSimultaneousPicks = data.hasSimultaneousPicks;
        this.isSpectating = data.isSpectating;
        this.localPlayerCellId = data.localPlayerCellId;
        this.lockedEventIndex = data.lockedEventIndex;
        this.myTeam = data.myTeam;
        this.recoveryCounter = data.recoveryCounter;
        this.rerollsRemaining = data.rerollsRemaining;
        this.skipChampionSelect = data.skipChampionSelect;
        this.theirTeam = data.theirTeam;
        this.timer = data.timer;
        this.trades = data.trades;

        for (let actionGroup of this.actions)
            for (let action of actionGroup) {
                if (action.isInProgress)
                    this.inProgressActionIds.push(action.id);
                if (action.actorCellId === data.localPlayerCellId) {
                    if (action.type === "ban") {
                        this.ownBanActionId = action.id;
                    } else if (action.type === "pick") {
                        this.ownPickActionId = action.id;
                    }
                }
            }
    }

    getPickedChampionIds(): number[] {
        let picked: number[] = [];

        for (let actionGroup of this.actions)
            for (let action of actionGroup)
                if (action.type === "pick" && !picked.includes(action.championId)) {
                    picked.push(Number(action.championId));
                }

        return picked;
    }

    getBannedChampionIds(): number[] {
        let banned: number[] = [];

        for (let actionGroup of this.actions)
            for (let action of actionGroup)
                if (action.type === "ban" && !banned.includes(action.championId)) {
                    banned.push(Number(action.championId));
                }

        return banned;
    }

    getPhase(): Hasagi.ChampSelect.Phase {
        return this.timer.phase as any;
    }

    isBanPhase(){
        for(let actionId of this.inProgressActionIds){
            let action = this.getActionById(actionId);
            if(action?.isInProgress && action?.type === "ban" && !action?.completed)
                return true;
        }

        return false;
    }

    isPickPhase(){
        for(let actionId of this.inProgressActionIds){
            let action = this.getActionById(actionId);
            if(action?.isInProgress && action?.type === "pick" && !action?.completed)
                return true;
        }

        return false;
    }

    isDraft(){
        return this.hasSimultaneousPicks;
    }

    getActionById(id: number) {
        for (let actionGroup of this.actions)
            for (let action of actionGroup)
                if (action.id == id)
                    return action;

        return null;
    }

    getTenBansRevealActionId(): number | null {
        for (let actionGroup of this.actions)
            for (let action of actionGroup)
                if (action.type === "ten_bans_reveal")
                    return action.id;

        return null;
    }

    getTeamMemberByPosition(position: 'top' | 'jungle' | 'middle' | 'bottom' | 'utility' | string) {
        position = position.trim().toLowerCase();
        if (position === "support")
            position = "utility";
        if (position === "mid")
            position = "middle";
        if (position === "adc")
            position = "bottom";

        for (let teamMember of this.myTeam) {
            if (teamMember.assignedPosition === position)
                return teamMember;
        }

        return null;
    }
}