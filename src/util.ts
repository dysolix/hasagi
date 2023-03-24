import axios from "axios";

export async function httpGet<T = any>(url: string, transform?: (response: any) => T) {
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
export function isPatchNewerOrEqual(firstPatch: string, secondPatch: string): boolean {
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

export const delay = (delay: number) => new Promise(resolve => setTimeout(resolve, delay)) as Promise<void>;

export function throwNotConnectedError(): never {
    throw new Error("Hasagi is not connected to the League of Legends client.");
}

export function throwCurrentlyNotPossibleError(reason: string): never {
    throw new Error(`This action is currently not possible. (${reason})`)
}