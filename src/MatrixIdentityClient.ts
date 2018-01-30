import {MatrixConfiguration} from "./MatrixConfiguration";
import * as request from "request-promise-native";
import { URL } from "url";
import {RequestError} from "request-promise-native/errors";

export type MatrixIdentityResult = {
    address: string;
    medium: string;
    mxid: string;
    not_before: number;
    not_after: number;
    ts: number;
    signatures: any;
}

export class MatrixIdentityClient {
    private config: MatrixConfiguration;
    constructor(config: MatrixConfiguration) {
        this.config = config;
    }

    LookupUser(medium: string, address:string): Promise<MatrixIdentityResult|Error> {
        return request.get(
            new URL("/_matrix/identity/api/v1/lookup", this.config.IsUrl).toString()
        ).then((jsdoc) => {
            return JSON.parse(jsdoc);
        }).then((res: MatrixIdentityResult) => {
            console.log(res);
            return res;
        }).catch((err : Error) => {
            console.log(err);
            return err;
        });
    }
}