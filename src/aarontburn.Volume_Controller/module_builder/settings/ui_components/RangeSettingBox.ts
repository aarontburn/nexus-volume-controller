import { Setting } from "../../Setting";
import { ChangeEvent, InputElement } from "../../SettingBox";
import { NumberSettingBox } from "./NumberSettingBox";

/**
 *  Range setting UI. Will render as a slider.
 * 
 *  @author aarontburn 
 */
export class RangeSettingBox extends NumberSettingBox {

    private min: number = 0;
    private max: number = 100;
    private step: number = 1;

    public constructor(setting: Setting<number>) {
        super(setting);
    }

    public createRight(): string {
        return `
            <div class="right-component">
                <div style="display: flex; flex-wrap: wrap">
                    <h1><span id='${this.resetID}'>↩</span> ${this.getSetting().getName()}</h1>
                    <p style="align-self: flex-end; padding-left: 24px;">${this.getSetting().getDescription()}</p>
                </div>

                <input type="range" 
                    style='width: 500px;'
                    min="${this.min}" max="${this.max}" step='${this.step}' 
                    id="${this.getSetting().getID()}_slider" value='${this.getSetting().getValue()}'>
            </div>
        `;
    }

    public setInputRange(min: number = 0, max: number = 100): void {
        if (min > max) {
            throw new Error(`Attempted to set a greater min than max. Min: ${min} | Max: ${max}`);
        }

        this.min = min;
        this.max = max;
    }

    public setInputStep(step: number): void {
        this.step = step;
    }

    public getInputIdAndType(): InputElement[] {
        return [
            { id: this.getSetting().getID(), inputType: 'number' },
            { id: this.getSetting().getID() + "_slider", inputType: "range" }
        ];
    }

    public onChange(newValue: any): ChangeEvent[] {
        return [
            { id: this.getSetting().getID(), attribute: 'value', value: newValue },
            { id: this.getSetting().getID() + "_slider", attribute: 'value', value: newValue }
        ];
    }

}