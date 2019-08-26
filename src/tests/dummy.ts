
import { readyEventSym, errorEventSym, closeMethodSym } from "../resource-pool";
import { EventEmitter } from "events";

type ResourceEvent = typeof readyEventSym | typeof errorEventSym;
type PlannedEvent = [ResourceEvent, number];
type EventSequence = Array<PlannedEvent>;

interface DummyConfig {
    constructorError: boolean,
    initialEventSequence: EventSequence,
    doEventSequence: EventSequence,
    closeMethodError: boolean
}

class Dummy extends EventEmitter {
    initSeq: EventSequence;
    doSeq: EventSequence;
    closeMethodError: boolean;

    constructor(config: DummyConfig) {
        super();
        if (config.constructorError) throw "Constructor error";
        this.closeMethodError = config.closeMethodError;
        this.initSeq = config.initialEventSequence;
        this.doSeq = config.doEventSequence;
        this.runEventSequence(this.initSeq);
    }

    public do() {
        this.runEventSequence(this.doSeq);
    }

    private runEventSequence(eventSeq: EventSequence) {
        if (eventSeq.length > 0) {
            const [event, timeout] = eventSeq.shift();
            setTimeout( () => {
                this.emit(event);
                this.runEventSequence(eventSeq);
            }, timeout);
        }
    }
}

Dummy.prototype[closeMethodSym] = function() {
    if (this.closeMethodError) throw "Close method error";
}

export { ResourceEvent, PlannedEvent, EventSequence, DummyConfig, Dummy };
