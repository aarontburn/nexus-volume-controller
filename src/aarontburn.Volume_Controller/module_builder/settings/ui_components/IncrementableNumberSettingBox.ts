import { Setting } from "../../Setting";
import { InputElement } from "../../SettingBox";
import { NumberSetting } from "../types/NumberSetting";
import { NumberSettingBox } from "./NumberSettingBox";


/**
 *  Similar to NumberSettingBox, but has buttons to increment. 
 *  
 *  @author aarontburn
 */
export class IncrementableNumberSettingBox extends NumberSettingBox {

    private min: number = 0;
    private max: number = 100;
    private step: number = 1;


    public constructor(setting: Setting<number>) {
        super(setting);
    }

    public createLeft(): string {
        const setting: NumberSetting = this.getSetting() as NumberSetting;
        const range: { min: number, max: number } = setting.getRange();


        let rangeText: string;
        if (range !== undefined) {
            if (range.min === undefined && range.max !== undefined) {
                rangeText = '≤ ' + range.max
            } else if (range.min !== undefined && range.max === undefined) {
                rangeText = '≥ ' + range.min
            } else if (range.min !== undefined && range.max !== undefined) {
                rangeText = `${range.min} - ${range.max}`
            }
        }

        return `
            <div class="left-component">
                <div style='display: flex; align-items: center'>
                    <p class='spinner' id='${setting.getID() + "_decrease"}'>–</p>

                        <input type="number" 
                            style="width: 70px; text-align: center; margin: 0px 5px;"
                            id="${setting.getID()}" value='${setting.getValue()}'>

                    <p class='spinner' id='${setting.getID() + "_increase"}'>+</p>
                </div>
                ${rangeText !== undefined
                ? `<p style='line-height: 21px; text-align: center'>${rangeText}</p>`
                : ''
            }
            </div>
        `
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
            { id: this.getSetting().getID() + "_decrease", inputType: 'click', returnValue: 'decrease' },
            { id: this.getSetting().getID() + '_increase', inputType: 'click', returnValue: "increase" }
        ];
    }

    public getStyle(): string {
        return `
            .spinner.spinner {
                font-size: 25px;
                width: 0.7em;
            }

            .spinner:hover {
                color: var(--accent-color);
                transition: 0.2s; 
            }
        `    
    }


}