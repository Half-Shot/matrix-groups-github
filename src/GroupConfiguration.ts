export class GroupConfiguration {

    readonly Name: string;
    readonly Owner: string;
    readonly Group: string;

    constructor(config: any) {
        this.Name = config.name;
        this.Owner = config.owner;
        this.Group = config.group;
    }

    get ProperName() {
        return `${this.Owner}/${this.Name}`;
    }
}