import * as fs from "fs";
import { Log } from "./Log";
let log = new Log("UserConsentMap");

export class UserConsentMap {
    private users: {[userId:string ]: string} = {};
    private fileName: string;
    constructor(fileName: string) {
        this.fileName = fileName;
    }

    LoadFromFile(){
        log.info(`Reading users consent from ${this.fileName}`);
        var data = fs.readFileSync(this.fileName, {encoding: "utf-8"});
        this.users = JSON.parse(data);
    }

    SaveToFile() {
        log.debug(`Saving users consent from ${this.fileName}`);
        fs.writeFileSync(this.fileName, JSON.stringify(this.users), {encoding: "utf-8"});
    }

    HasUserConsented(userId: string) {
        return (this.users[userId] === "identity" || this.users[userId] === "gist");
    }

    IsUserAwaitingGist(userId: string) {
        return (this.users[userId] === "awaiting_gist")
    }

    SetUserStatus(userId: string, status:string) {
        this.users[userId] = status;
        this.SaveToFile();
    }

    RevokeUser(userId: string) {
        delete this.users[userId];
        this.SaveToFile();
    }
}