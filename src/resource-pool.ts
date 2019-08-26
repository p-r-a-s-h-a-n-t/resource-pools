
// Imports

import { EventEmitter } from "events";


// Auxilary declarations

function* idGenerator() {
    let id = 0;
    while (true) yield id++;
}

const idSym: unique symbol = Symbol('id'); // reference to resource 'id' property
const readyEventSym: unique symbol = Symbol('readyEventSym'); // reference to 'ready' event emitted by resource
const errorEventSym: unique symbol = Symbol('errorEventSym'); // reference to 'error' event emitted by resource
const closeMethodSym: unique symbol = Symbol('closeMethodSym'); // reference to resource method to be used to close/delete the resource

class ResourceClass extends EventEmitter {
    [idSym]?: number;
    [closeMethodSym]?: Function;
};

type ResourceRequest = {resolve: Function, reject: Function};


// Main

interface ResourceConstructor {
    new (...args: any[]): EventEmitter;
}

interface ResourcePoolConfig {
    constructor: ResourceConstructor;
    arguments: any[];
    maxCount: number;
    idleTimeout?: number;
    busyTimeout?: number
}

class ResourcePool {
    config: ResourcePoolConfig;
    idleObjects: Array<ResourceClass>;
    busyCount: number;
    allocRequests: Array<ResourceRequest>;
    idGen: IterableIterator<number>;

    constructor(config: ResourcePoolConfig) {
        this.config = config;
        this.idleObjects = [ ];
        this.busyCount = 0;
        this.allocRequests = [ ];
        this.idGen = idGenerator();
    }

    private addToIdle(obj: any) {
        //console.log('add object', obj.constructor.name, ':', obj[idSym], 'to idle pool');
        this.idleObjects.push(obj);
    }

    private deleteFromIdle(obj: ResourceClass) {
        //console.log('delete object', obj.constructor.name, ':', obj[idSym], 'from idle pool');
        const index = this.idleObjects.indexOf(obj);
        if (index >= 0) {
            this.idleObjects.splice(index, 1);
            return true;
        };
        return false;
    }

    private readyCallback(obj: ResourceClass) {
        //console.log('ready callback for object', obj.constructor.name, ':', obj[idSym]);
        this.busyCount--;
        this.addToIdle(obj);
        this.processRequests();
    }

    private errorCallback(obj: ResourceClass) {
        //console.log('error callback for object', obj.constructor.name, ':', obj[idSym]);
        try {
            obj[closeMethodSym]!();
        }
        catch (err) {
            //console.log('error calling resourse close method:', err);
        };
        if (!this.deleteFromIdle(obj)) this.busyCount--; // if the object was not found in the idle list, it is busy
    }

    private addObject() {
        return new Promise((resolve, reject) => {
            const obj = new this.config.constructor(...this.config.arguments);
            obj[idSym] = this.idGen.next().value; // add id to the object
            //console.log('new resource object', obj.constructor.name, ':', obj[idSym]);

            this.busyCount++;

            obj.once(errorEventSym, (err) => { // only once to reject initial promise
                this.errorCallback(obj);
                reject(err);
            });
            obj.once(readyEventSym, () => {  // only once to resolve initial promise and set callbacks for further allocations
                obj.once(errorEventSym, () => this.errorCallback(obj));
                obj.on(readyEventSym, () => this.readyCallback(obj));
                resolve(obj);
            });
        });
    }

    private processRequests() {
        //console.log('started request processing');
        
        // assign pending requests to idle resources if possible
        while ((this.allocRequests.length > 0) && (this.idleObjects.length > 0)) {
            const allocateRequest: ResourceRequest = this.allocRequests.shift();
            const obj = this.idleObjects.shift();
            this.busyCount++;
            allocateRequest.resolve(obj);
            //console.log('allocated request to idle resource', obj.constructor.name, ':', obj[idSym]);
        };

        // create new resources if possible for unprocessed requests
        while ((this.allocRequests.length > 0) && (this.busyCount < this.config.maxCount)) {
            //console.log('creating new object');
            const allocateRequest = this.allocRequests.shift();
            this.addObject()
                .catch( err => allocateRequest.reject(err))
                .then( obj => {
                    //console.log('allocated request to new resource', obj.constructor.name, ':', obj[idSym]);
                    allocateRequest.resolve(obj);
                });
        };
        //console.log('ended request processing');
    }

    public allocate() {
        //console.log('allocating new resource request');
        return new Promise((resolve, reject) => {
            this.allocRequests.push({resolve, reject});
            this.processRequests();
        });
    }
}


// Exports

export {ResourcePool, idSym, readyEventSym, errorEventSym, closeMethodSym};
