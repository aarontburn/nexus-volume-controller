export interface IPCSource {
    getIpcSource(): string;
}

export interface IPCCallback {
    notifyRenderer(target: IPCSource, eventType: string, ...data: any[]): void;
}