import {GroupConfiguration} from "./GroupConfiguration";
import * as request from "request-promise-native";

const CONTRIB_URL = "https://api.github.com/repos/{0}/{1}/contributors";
import Timer = NodeJS.Timer;
import {UserGroupMapping} from "./UserGroupMapping";
import { Log } from "./Log";
let log = new Log("GithubConnector");

export class GithubConnector {
    private groups: GroupConfiguration[] = [];
    private groupPtr: number;
    private intervalPtr: Timer;
    private Users: UserGroupMapping[] = [];
    private usersToProcess: UserGroupMapping[] = [];

    addGroup(group: GroupConfiguration) {
        log.info(`Adding ${group.ProperName}`);
        this.groups.push(group);

    }

    UsersToProcess(): UserGroupMapping[] {
        let users = this.usersToProcess.slice();
        this.usersToProcess = [];
        return users;
    }

    Start(interval: number, startImmediately: boolean = false) {
        if (this.intervalPtr != null) {
            log.error("Could not start GithubConnector, already running.");
        }
        log.debug("Starting GithubConnector");
        this.groupPtr = 0;
        if (startImmediately) {
            this.processGroup(this.groups[this.groupPtr]);
            this.groupPtr++
        }
        this.intervalPtr = setInterval(() => {
            if(this.groups.length == 0) {
                log.info("No groups added to connector. Ignoring.");
                return;
            }
            if(this.groupPtr == this.groups.length ) {
                log.debug("Got to end of group queue. Restarting over..");
                this.groupPtr = 0;
            }
            this.processGroup(this.groups[this.groupPtr]);
            this.groupPtr++;
        }, interval);
    }

    Stop() {
        if (this.intervalPtr == null) {
            log.error("Could not stop GithubConnector, not running.");
            return;
        }
        clearInterval(this.intervalPtr);
        log.debug("Stopped GithubConnector");
    }

    private processGroup(group: GroupConfiguration) {
        const url = CONTRIB_URL.replace("{0}", group.Owner)
            .replace("{1}", group.Name);

        log.debug(`Processing ${group.ProperName}`);

        request.get(url, {
            headers : {"User-Agent":"Half-Shot/matrix-groups-github"}
        }).then((datas) => {
            JSON.parse(datas).forEach((userData: any) => {this.UpsertUser(userData, group)});
        }).catch((reason) => {
            log.error(`Could not fetch data from ${url} due to ${reason}. Bailing on this one.`);
        })
    }

    private UpsertUser(userData: any, group: GroupConfiguration) {
        const userName = userData.login;
        log.debug(`Processing`, userName);
        let mapping = this.Users.find((item) => item.GithubUsername === userName);
        if(mapping === undefined) {
            log.debug(`Adding to cache`, userName);
            mapping = new UserGroupMapping();
            mapping.GithubUsername = userName;
        }
        mapping.MatrixGroups.add(group.Group);
        this.Users.push(mapping);
        if(mapping.UpsertRepo(group.Name, group.Owner, userData)) {
            log.debug(`adding to processing queue.`, userName);
            this.usersToProcess.push(mapping);
        }
    }

    ValidateGist(githubUsername: string, gistId: string): Promise<boolean> {

    }
}