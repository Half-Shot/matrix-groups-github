import * as jsyaml from "js-yaml";
import * as fs from "fs";
import {MatrixConfiguration} from "./MatrixConfiguration";
import {GroupConfiguration} from "./GroupConfiguration";
import { Log } from "./Log";
let log = new Log("Configuration");

export class Configuration {

    get LoggingLevel(): string {
        return this.rawConfig.logging.level;
    }

    get LoggingIgnoredModules(): string[] {
        return this.rawConfig.logging.ignoreLoggingFor;
    }

    get MatrixConfig(): MatrixConfiguration {
        return new MatrixConfiguration(this.rawConfig.matrix);
    }

    get Groups(): GroupConfiguration[] {
        return this.rawConfig.groups.map((config: any) => {
            return new GroupConfiguration(config)
        });
    }


    rawConfig: any = null;
    parseConfiguration(fileName: string) {
        log.info(`Reading config values from ${fileName}`);
        let contents = fs.readFileSync(fileName, {encoding: "utf-8"});
        log.debug("Read config. Processing...");
        this.rawConfig = jsyaml.load(contents);
        log.debug("Processed.");
    }
}