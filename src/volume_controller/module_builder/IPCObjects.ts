export interface IPCSource {
    getIPCSource(): string;
}

export interface IPCCallback {
    notifyRenderer(target: IPCSource, eventType: string, ...data: any[]): void;
}