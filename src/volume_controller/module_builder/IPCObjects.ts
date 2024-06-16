/**
 *  Interface for all classes that use IPC communication. 
 */
export interface IPCSource {
    getIPCSource(): string;
}

/**
 *  Interface to store the IPC callback function.
 */
export interface IPCCallback {
    notifyRenderer(target: IPCSource, eventType: string, ...data: any[]): void;

    
}