export class MatrixConfiguration {
    readonly Url: string;
    readonly Domain: string;
    readonly UserId: string;
    readonly AccessToken: string;
    readonly IsUrl: string;

    constructor(config: any) {
        this.Url = config.url;
        this.IsUrl = config.isUrl != null ? config.isUrl: "";
        this.Domain = config.domain;
        this.UserId = config.userId;
        this.AccessToken = config.accessToken;
    }
}