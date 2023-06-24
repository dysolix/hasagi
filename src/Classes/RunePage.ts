import { HasagiClient, Data } from "../index.js";

export default class RunePage {
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

    constructor(data: Hasagi.ClientRunePage | any = {}) {
        this.autoModifiedSelections = data?.autoModifiedSelections ?? [];
        this.current = data?.current ?? true;
        this.id = data?.id ?? 0;
        this.isActive = data?.isActive ?? false;
        this.isDeletable = data?.isDeletable ?? true;
        this.isEditable = data?.isEditable ?? true;
        this.isValid = data?.isValid ?? true;
        this.lastModified = data?.lastModified ?? 0;
        this.name = data?.name ?? 'Unnamed Rune Page';
        this.order = data?.order ?? 0;
        this.selectedPerkIds = data?.selectedPerkIds ?? [];
        this.primaryStyleId = data?.primaryStyleId ?? 0;
        this.subStyleId = data?.subStyleId ?? 0;
    }

    /**
     * 
     * @param primaryRuneTree If not provided, an attempt will be made to get the value from 'Data'
     * @param secondaryRuneTree If not provided, an attempt will be made to get the value from 'Data'
     */
    public static async Create(name: string, runes: number[], primaryRuneTree?: Hasagi.RuneTree | number, secondaryRuneTree?: Hasagi.RuneTree | number) {
        console.log({ name, runes, primaryRuneTree, secondaryRuneTree })
        if (primaryRuneTree === undefined) {
            const primaryTreeId = await Data.getRuneTreeByRune(runes[0]).then(tree => tree?.id).catch();
            if (primaryTreeId === undefined)
                throw new Error(`Unable to fetch primaryStyleId for runes ${runes}.`);

            primaryRuneTree = primaryTreeId;
        }

        if (secondaryRuneTree === undefined) {
            const secondaryTreeId = await Data.getRuneTreeByRune(runes[4]).then(tree => tree?.id).catch();
            if (secondaryTreeId === undefined)
                throw new Error(`Unable to fetch subStyleId for runes ${runes}.`);

            secondaryRuneTree = secondaryTreeId;
        }

        return new RunePage({
            name: name,
            selectedPerkIds: runes,
            primaryStyleId: typeof primaryRuneTree === "number" ? primaryRuneTree : primaryRuneTree?.id,
            subStyleId: typeof secondaryRuneTree === "number" ? secondaryRuneTree : secondaryRuneTree?.id,
        });
    }

    /**
     * Updates the rune page in the client
     */
    update() {
        if (this.existsInClient())
            HasagiClient.Instance!.replaceRunePage(this.id, this);
    }

    /**
     * @returns true, if a rune page with the same id exists in the client
     */
    existsInClient() {
        return HasagiClient.Instance?.runePages.some(rp => rp.id === this.id) ?? false;
    }
}

let x: Hasagi.RunePage = {
    autoModifiedSelections: [],
    current: false,
    id: 0,
    isActive: false,
    isDeletable: false,
    isEditable: false,
    isValid: false,
    lastModified: 0,
    name: "",
    order: 0,
    selectedPerkIds: [],
    primaryStyleId: 0,
    subStyleId: 0,
    update: function (): void {
        throw new Error("Function not implemented.");
    },
    existsInClient: function (): boolean {
        throw new Error("Function not implemented.");
    }
}