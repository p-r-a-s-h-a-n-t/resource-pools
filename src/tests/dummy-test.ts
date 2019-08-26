
import { ResourcePool, idSym, readyEventSym, errorEventSym, closeMethodSym } from "../resource-pool";
import { ResourceEvent, PlannedEvent, EventSequence, DummyConfig, Dummy } from "./dummy";

const readyPlannedEvent: PlannedEvent = [readyEventSym, 100];
const errorPlannedEvent: PlannedEvent = [errorEventSym, 100];

const singleReadySequence: EventSequence = [readyPlannedEvent];
const singleErrorSequence: EventSequence = [errorPlannedEvent];
const multipleReadySequence: EventSequence = Array(3).fill(readyPlannedEvent);
const multipleErrorSequence: EventSequence = Array(3).fill(errorPlannedEvent);

const testSequence1: EventSequence = [
    errorPlannedEvent, errorPlannedEvent, readyPlannedEvent, errorPlannedEvent, readyPlannedEvent, readyPlannedEvent
];

const testSequence2: EventSequence = [
    readyPlannedEvent, errorPlannedEvent, errorPlannedEvent, readyPlannedEvent, readyPlannedEvent, errorPlannedEvent
];

const correctConfig: DummyConfig = {
    constructorError: false,
    initialEventSequence: testSequence1,
    doEventSequence: testSequence2,
    closeMethodError: false
}

function* sequenceFeed(seq: ResourceEvent[]) {
    for (const elem of seq) yield elem;
}

const checkSequence: ResourceEvent[] = testSequence1.concat(testSequence2).map( ([event, ]) => event );

const checkFeed = sequenceFeed(checkSequence);

function checkEvent(event: ResourceEvent) {
    const feed = checkFeed.next();
    if (event == feed.value) {
        console.log(`Event check successful: ${event.toString()} matches ${feed.value.toString()}`);
    } else throw `Event ${event.toString()} doesn't match ${feed.value.toString()}`;
};

const testDummy = new Dummy(correctConfig);

testDummy.on(readyEventSym, () => checkEvent(readyEventSym));
testDummy.on(errorEventSym, () => checkEvent(errorEventSym));
