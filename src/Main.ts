import { Configuration } from "./Config";
import { GithubConnector } from "./GithubConnector";
import {MatrixConnector} from "./MatrixConnector";
import { Log } from "./Log";
let log = new Log("main");

class Program {
    static config: Configuration;
    static githubConnector: GithubConnector;
    static matrixConnector: MatrixConnector;
    static Main(args: string[]) {
        const CONFIG_FILE: string = args.length > 2 ? args[2] : "config.yaml";
        Log.CreateLogger();
        log.debug("Starting up...");
        this.config = new Configuration();
        this.config.parseConfiguration(CONFIG_FILE);
        Log.UpdateIgnoredModules(this.config.LoggingIgnoredModules);
        Log.UpdateLoggingLevel(this.config.LoggingLevel);
        this.StartMatrixConnector().then(() => {
            this.StartGithubConnector();
        });
    }

    static StartGithubConnector() {
        log.debug("Creating new instance of GithubConnector");
        this.githubConnector = new GithubConnector();
        log.debug("Adding groups to connector.");
        for (let group of this.config.Groups) {
            this.githubConnector.addGroup(group);
        }
        this.githubConnector.Start(30000, true);
    }

    static DummyGithubToMatrixIdMapper(ghid: string): Promise<string> {
        if(ghid === "Half-Shot") {
            return Promise.resolve("@Half-Shot:half-shot.uk");
        } else if(ghid === "turt2live") {
            return Promise.resolve("@travis:t2l.io");
        } else {
            return Promise.resolve("");
        }
    }

    static StartMatrixConnector() : Promise<void> {
        log.debug("Creating new instance of MatrixConnector");
        this.matrixConnector = new MatrixConnector(this.config.MatrixConfig,
            () => {return this.githubConnector.UsersToProcess();},
            Program.DummyGithubToMatrixIdMapper,
        );
        return this.matrixConnector.ConnectClient().then(() => {
            this.matrixConnector.Start(10000);
        }).catch(() =>{
            log.error("Couldn't connect to matrix. Crashing hard.");
            process.exit(1);
        });
    }
}

Program.Main(process.argv);
