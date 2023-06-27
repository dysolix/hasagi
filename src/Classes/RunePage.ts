import { HasagiClient, DataDragon } from "../index.js";

export default class RunePage implements Hasagi.RunePage {
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

    constructor(data: Hasagi.RunePage | any = {}) {
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
    public static async Create(name: string, runes: number[], primaryRuneTree?: Hasagi.DataDragon.RuneTree | number, secondaryRuneTree?: Hasagi.DataDragon.RuneTree | number) {
        if (primaryRuneTree === undefined) {
            try {
                const primaryTreeId = DataDragon.getRuneTreeByRune(runes[0])?.id;
                if (primaryTreeId === undefined)
                    throw new Error(`Unable to fetch primaryStyleId for runes ${runes}.`);

                primaryRuneTree = primaryTreeId;
            } catch (e) {
                throw new Error(`Unable to fetch primaryStyleId for runes ${runes}.`);
            }
        }

        if (secondaryRuneTree === undefined) {
            try {
                const secondaryTreeId = DataDragon.getRuneTreeByRune(runes[4])?.id;
                if (secondaryTreeId === undefined)
                    throw new Error(`Unable to fetch subStyleId for runes ${runes}.`);

                secondaryRuneTree = secondaryTreeId;
            } catch (e) {
                throw new Error(`Unable to fetch subStyleId for runes ${runes}.`);
            }
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