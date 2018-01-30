import { Room, RoomMember, MatrixEvent, MatrixClient } from "matrix-js-sdk";
import { Log } from "./Log";
import {UserConsentMap} from "./UserConsentMap";
import {GithubConnector} from "./GithubConnector";
let log = new Log("BotConversationConnector");

const CMD_CONNECT_GIST = "connect gist";
const CMD_CONNECT_ID = "connect auto";
const CMD_REVOKE = "revoke";

export class BotConversationConnector {
    private client: MatrixClient;
    private userConsentMap: UserConsentMap;
    private githubConnector: GithubConnector;
    constructor(
        client: MatrixClient,
        userConsentMap: UserConsentMap,
        githubConnector: GithubConnector,
    ) {
        this.client = client;
        this.userConsentMap = userConsentMap;
        this.githubConnector = githubConnector;
    }

    Connect() {
        this.client.startClient();
        this.client.on("Room",this.OnRoom.bind(this));
        this.client.on("RoomMember.membership",this.OnRoomMembership.bind(this));
        this.client.on("event", this.OnEvent.bind(this));
    }

    private OnRoom(room: Room) {
        //log.info("Got Room:" + room.roomId);
    }

    private OnEvent(event: MatrixEvent) {
        log.info("Got Event:" + event.getRoomId());
        if(event.getType() !== "m.room.message"){
            return;
        }
        const content = event.getContent();
        const body = content.body.toLowerCase();

        if (body === "help") {
            this.client.sendNotice( event.getRoomId(),
                "Type 'connect gist' to connect your github account via gist" +
                ",or 'connect auto' to use an identity server." +
                "You can also type 'revoke' to stop being invited to groups.");
            return;
        }

        if(body === CMD_REVOKE) {
            this.userConsentMap.RevokeUser(event.getSender());
            this.client.sendNotice( event.getRoomId(),
                "Revoked subscription to github groups."
            );
            return;
        }

        if(body === CMD_CONNECT_GIST) {
            log.info(`${event.getSender()} is requesting gist auth. Awaiting gist url.`);
            this.userConsentMap.SetUserStatus(event.getSender(), "awaiting_gist");
            return;
        }

        if(body === CMD_CONNECT_ID) {
            this.userConsentMap.SetUserStatus(event.getSender(), "identity");
            return;
        }


        if(this.userConsentMap.IsUserAwaitingGist(event.getSender())) {
            // DON'T LOOK AT ME I'M HIDEOUS
            try {
                const gistUrl = new URL(body);
                if (gistUrl.host === 'gist.github.com') {
                    let pathBits = gistUrl.pathname.split('/');
                    this.githubConnector.ValidateGist(pathBits[1], pathBits[2]).then(
                        (passed) => {
                        if (passed) {
                            this.userConsentMap.SetUserStatus(event.getSender(), "gist");
                        }
                    });
                }
            } catch {
                // Expected, means we didn't match it. Oh well :(
            }
        }
    }

    private OnRoomMembership(event: MatrixEvent, member: RoomMember) {
        log.debug("Got RoomMembership:" + event);
        //console.log(event);
        //console.log(member);

        if (event.getContent().membership !== "invite") {
            return;
        }

        log.debug(`Got invited to ${event.getRoomId()} by ${event.getSender()}`);
        this.client.joinRoom(event.getRoomId(), {
            syncRoom: false,
        }).then(() => {
            log.debug(`Successfully joined ${event.getRoomId()}`);
        }).catch((err) => {
            log.warn(`Couldn't join ${event.getRoomId()}. ${err}`);
        });
    }
}