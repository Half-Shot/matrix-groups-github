import {MatrixConfiguration} from "./MatrixConfiguration";
import Timer = NodeJS.Timer;
import {UserGroupMapping} from "./UserGroupMapping";
import { Log } from "./Log";
import * as matrix from "matrix-js-sdk";
import * as request from "request";
let log = new Log("MatrixConnector");

export type GetToProcessDelegate = () => UserGroupMapping[];
export type MapGithubToMatrix = (githubUserName: string) => Promise<string>;
type GroupMemberRow = {members:string[], lastModified: Date};
type GroupMembersResponseMember = {
    displayname: string,
    is_privileged: boolean,
    attestation: any,
    avatar_url: string,
    is_public: true,
    user_id: string,
};
type GroupMembersResponse = {
    chunk: GroupMembersResponseMember[],
    total_user_count_estimate: number
};

const CacheGroupForMS = 120000;

export class MatrixConnector {
    private client: any;
    private config: MatrixConfiguration;
    private getToProcess: GetToProcessDelegate;
    private mapGithubToMatrix: MapGithubToMatrix;
    private groupMembers: { [groupId: string] : GroupMemberRow} = {};
    private joinedGroups: string[] = [];
    private intervalPtr: Timer;

    constructor(config: MatrixConfiguration,
                getToProcess: GetToProcessDelegate,
                mapGithubToMatrix: MapGithubToMatrix) {
        this.config = config;
        this.getToProcess = getToProcess;
        this.mapGithubToMatrix = mapGithubToMatrix;
    }

    GetUsersInGroup(groupId: any): Promise<string[]> {
        log.verbose(`Getting users in ${groupId}`);
        if(this.groupMembers[groupId] != undefined) {
            if( Math.abs(new Date().getTime()  - this.groupMembers[groupId].lastModified.getTime()) < CacheGroupForMS){
                return Promise.resolve(this.groupMembers[groupId].members);
            }
            log.debug(`Cache for ${groupId} is out of date`);
        } else {
            log.debug(`Cache for ${groupId} does not exist.`);
        }

        return this.client.getGroupUsers(groupId).then((res: GroupMembersResponse) => {
            if (res.chunk.length != res.total_user_count_estimate) {
                log.warn("Returned user count was less than the estimated group size. This is because the api is still crap.");
            }
            this.groupMembers[groupId] = {
                members: res.chunk.map(member => member.user_id),
                lastModified: new Date()
            };
            return this.client.getGroupInvitedUsers(groupId);
        }).then((res: GroupMembersResponse) => {
            if (res.chunk.length != res.total_user_count_estimate) {
                log.warn("Returned user count was less than the estimated group size. This is because the api is still crap.");
            }
            // Add invited users too.
            this.groupMembers[groupId].members = this.groupMembers[groupId].members.concat(res.chunk.map(member => member.user_id));
            return this.groupMembers[groupId].members;
        }).catch((err: any) => {
            log.error(`Could not get members for ${groupId}. ${err}.`);
        });
    }

    IsUserInGroup(userid: string, groupId: string): Promise<boolean> {
        return this.GetUsersInGroup(groupId).then((users) => {
            return users.includes(userid);
        })
    }

    ProcessUser(mapping: UserGroupMapping) {
        log.debug(`Processing`, mapping.GithubUsername);
        this.mapGithubToMatrix(mapping.GithubUsername).then((matrixid) => {
            if(matrixid === "") {
                log.verbose("Could not find matrixid for user.", mapping.GithubUsername);
                return;
            } else {
                //Check if the user is in the group.
                mapping.MatrixGroups.forEach(async(groupId) => {
                    if (!this.joinedGroups.includes(groupId)) {
                        await this.client.acceptGroupInvite(groupId).then(() =>{
                            log.info(`Joined ${groupId}`);
                            this.joinedGroups.push(groupId);
                        }).catch(() => {
                            log.info(`Not in ${groupId} but no invite is pending either. Please restart the bot.`);
                        });
                    }
                    log.debug(`Checking to see if ${matrixid} is in ${groupId}`, mapping.GithubUsername);
                    await this.IsUserInGroup(matrixid, groupId).then( (isInGroup) => {
                        if(isInGroup){
                            log.debug("Ignoring because the user is in the group already!", mapping.GithubUsername);
                            return;
                        }
                        this.client.inviteUserToGroup(groupId, matrixid).then(() => {
                            log.info(`Added ${matrixid} to ${groupId}!`, mapping.GithubUsername);
                            this.groupMembers[groupId].members.push(matrixid);
                        }).catch((err: any) => {
                            log.error(`Failure trying to add ${matrixid} to ${groupId}! ${err}`, mapping.GithubUsername);
                        })
                    }).catch(() => {
                        log.error("Failed to determine if user was in group. Ignoring this time around.", mapping.GithubUsername);
                    })
                });
            }
        }).catch((err: any) => {
            log.error(`Failure trying to get matrixid for github username! ${err}`);
        });
    }

    ConnectClient(): Promise<string> {
        this.client = new (matrix.MatrixClient)({
            baseUrl: this.config.Url,
            request: request,
            userId: this.config.UserId,
            accessToken: this.config.AccessToken
        });
        return this.client._http.authedRequest(undefined, "GET", "/account/whoami").then((result: any) => {
            if (result.user_id !== this.config.UserId) {
                log.error("Got the wrong userid back from whoami! Review config/token!");
                throw new Error("Unexpected userid from matrix.");
            }
            log.info(`Connected matrix client!`);
            // Just get a list of groups we are in.
            return this.client.getJoinedGroups();
        }).then((res:any ) =>{
            this.joinedGroups = res.groups;
        }).catch((err: any) => {
            log.error(`Failed to setup matrix client. ${err}`);
            throw new Error("Failed to setup matrix.");
        });

    }

    Start (interval: number) {
        if (this.intervalPtr != null) {
            log.error("Could not start MatrixConnector, already running.");
        }
        log.debug("Starting MatrixConnector");


        this.intervalPtr = setInterval(() => {
            log.debug("Checking processing queue...");
            let itemsToProcess = this.getToProcess();
            if(itemsToProcess.length > 0) {
                log.debug(`Got ${itemsToProcess.length} users to process`);
                itemsToProcess.forEach((item) => {
                    this.ProcessUser(item);
                } )
            }
        }, interval);
    }

    Stop () {
        if (this.intervalPtr == null) {
            log.error("Could not stop MatrixConnector, not running.");
            return;
        }
        clearInterval(this.intervalPtr);
        log.debug("Stopped MatrixConnector");
    }
}