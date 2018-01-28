import {LoggerInstance, Logger, transports, config} from 'winston';
import * as dateformat from 'dateformat';

const DATE_FORMAT = "yymmdd HH:MM:ss,l";

export class Log {
    private static winstonLogger: LoggerInstance;
    private static ignoredModules: string[] = [];
    private module: string;
    constructor(module: string){
        this.module = module;
    }

    static CreateLogger() {
        this.winstonLogger = new Logger({
            level: 'debug',
            transports: [
                new (transports.Console)({
                    colorize: true,
                    formatter: this.LogFormat,
                })
            ]
        });
    }


    static UpdateIgnoredModules(ignoredModules: string[]) {

        Log.ignoredModules = ignoredModules;

    }

    static UpdateLoggingLevel(loggingLevel: string) {
        Log.winstonLogger.transports.console.level = loggingLevel;
    }

    static LogFormat(info: any): string {
        let user = info.meta.user != null ? `[${info.meta.user}]` : "";
        let formatted_pre = `${dateformat(info.meta.timestamp, DATE_FORMAT)} - ${info.meta.module} - `;
        let formatted_post = ` ${user} - ${info.message}`;
        return formatted_pre + config.colorize(info.level, info.level) + formatted_post;
    }

    Log(type: string, message: string, user: string = '') {
        let meta: any = {module: this.module};
        if(Log.ignoredModules.includes(this.module)){
            return;
        }
        if (user != "") {
            meta.user = user;
            meta.timestamp = new Date();
        }
        Log.winstonLogger.log(type, message, meta);
    }

    debug(message: string, user: string = '') { this.Log('debug', message, user) };

    error(message: string, user: string = '') { this.Log('error', message, user) };

    warn(message: string, user: string = '') { this.Log('warn', message, user) };

    info(message: string, user: string = '') { this.Log('info', message, user) };

    verbose(message: string, user: string = '') { this.Log('verbose', message, user) };
}