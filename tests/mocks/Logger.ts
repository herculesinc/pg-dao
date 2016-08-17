// IMPORTS
// =================================================================================================
import { Logger } from 'pg-io';

// LOGGER CLASS
// =================================================================================================
export class MockLogger implements Logger {

    debug(message: string) { console.log(message); }
    info (message: string) { console.info(message); }
    warn(message: string) { console.warn(message); }

    error(error: Error) { console.error(error); };

    log(event: string, properties?: { [key: string]: any }) {
         console.info(`${event}: ${JSON.stringify(properties)}`);
    }

    track(metric: string, value: number) {
        console.log(`[${metric}=${value}]`);
    }

    trace(service: string, command: string, time: number, success?: boolean) {
        if (success) {
            console.log(`[${service}]: executed {${command}} in ${time} ms`);
        }
        else {
            console.log(`[${service}]: failed to execute {${command}} in ${time} ms`);
        }
    }
}