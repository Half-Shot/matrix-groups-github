import {UserRepoInfo} from "./UserRepoInfo";
import { Log } from "./Log";
let log = new Log("UserGroupMapping");

export class UserGroupMapping {
    GithubUsername: string;
    Repositories: UserRepoInfo[] = [];
    MatrixUserId: string;
    MatrixGroups: Set<string> = new Set();

    UpsertRepo(name: string, owner: string, repoData: any): boolean {
        let repo = this.Repositories.find(
            (item) => item.Name === name && item.Owner === owner
        );
        if(repo === undefined) {
            repo = new UserRepoInfo();
            log.debug(`Adding repo ${owner}/${name}.`, this.GithubUsername);
            repo.Name = name;
            repo.Owner = owner;
            repo.Contributions = repoData["contributions"];
            this.Repositories.push(repo);
            return true;
        }
        repo.Contributions = repoData["contributions"];
        return false;
    }
}