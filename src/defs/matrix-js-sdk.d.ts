declare module "matrix-js-sdk" {
    export type Room = {
        roomId: string,
        name: string,
        tags: any,
        accountData: any,
        summary: RoomSummary
    }

    export type RoomState = any;
    export type RoomSummary = any;

    export type RoomMember = {
        roomId: string;
        userId: string;
        typing: boolean;
        name: string;
    }

    export class MatrixEvent {
        //event: any;
        sender: RoomMember;
        target: RoomMember;
        //status: EventStatus;
        error: Error;
        forwardLooking: boolean;

        getContent(): any;
        getId(): string;
        getRoomId(): string;
        getSender(): string;
        getType(): string;
    }



    export class MatrixClient {
        constructor(opts: any);
        startClient(): void;
        on(eventType: string, callback: any): void;
        joinRoom(roomIdOrAlias: string, opts: any): Promise<Error>;
        sendNotice(roomId: string, body: string): Promise<Error>;
    }
}