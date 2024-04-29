export class Dimension {
    private width: number;
    private height: number;


    public constructor(theWidth: number, theHeight: number) {
        this.width = theWidth;
        this.height = theHeight;
    }

    public getWidth(): number {
        return this.width;
    }

    public getHeight(): number {
        return this.height;
    }
}