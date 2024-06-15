import { Setting } from "../../Setting";
import { Process } from "../../Process";
import { SettingBox } from "../../SettingBox";
import { NumberSettingBox } from "../ui_components/NumberSettingBox";

/**
 *  Setting to receive number input.
 * 
 *  Without specifying a min and max, the user may enter any number they want.
 * 
 *  @author aarontburn
 */
export class NumberSetting extends Setting<number> {

    /**
     *  The minimum possible value. By default, it is unrestrained.
     */
    private min: number = undefined;

    /**
     *  The maximum possible value. By default, it is unrestrained.
     */
    private max: number = undefined;


    
    public constructor(module: Process, defer: boolean = false) {
        super(module, defer);
    }

    /**
     *  Sets a minimum value. If the user inputs a number less than
     *      the specified minimum, it will default to the minimum. 
     * 
     *  @param min The lowest possible value for this setting.
     *  @returns itself.
     */
    public setMin(min: number): NumberSetting {
        if (this.max !== undefined && min > this.max) {
            throw new Error(`Attempted to set a greater min than max. Min: ${min} | Max: ${this.max}`);
        }

        this.min = min;
        return this;
    }

    /**
     *  Sets a maximum value. If the user inputs a number greater than the
     *      specified maximum, it will default to the maximum.
     *  
     *  @param max The maximum possible value.
     *  @returns itself.
     */
    public setMax(max: number): NumberSetting {
        if (this.min !== undefined && max < this.min) {
            throw new Error(`Attempted to set a lower max than min. Min: ${this.min} | Max: ${max}`);
        }

        this.max = max;
        return this;
    }

    /**
     *  Sets the minimum and maximum possible values. If the
     *      user enters a number outside of the bounds, it will
     *      default to the minimum or the maximum, depending
     *      on which bound was exceeded. 
     * 
     *  @param min The minimum possible value.
     *  @param max The maximum possible value.
     *  @returns itself.
     */
    public setRange(min: number, max: number): NumberSetting {
        if (min > max) {
            throw new Error(`Attempted to set a greater min than max. Min: ${min} | Max: ${max}`);
        }

        this.min = min;
        this.max = max;
        return this;
    }


    /**
     *  Returns the range. If both the minimum and maximum are
     *      undefined, it will return undefined. Otherwise,
     *      it will return an object, where the minimum and maximum could
     *      either be a number or undefined.
     * 
     *  @returns An object with the specified minimum and maximum.
     */
    public getRange(): { min: number | undefined, max: number | undefined } {
        if (this.min === undefined && this.max === undefined) {
            return undefined;
        }
        return { min: this.min, max: this.max };
    }


    public validateInput(theInput: any): number | null {
        let value: number;

        if (typeof theInput === 'number') {
            value = Number(theInput);
        }

        try {
            const parsedValue: number = parseFloat(String(theInput));
            if (!isNaN(parsedValue)) {
                value = Number(parsedValue)
            }
        } catch (err) {
            return null; // could not 
        }


        const roundedValue = (value: number) => Number(value.toFixed(1));

        if (this.min === undefined && this.max === undefined) {
            return roundedValue(value);
        }

        if (this.min !== undefined) {
            value = Math.max(this.min, value);
        }

        if (this.max !== undefined) {
            value = Math.min(this.max, value);
        }

        return roundedValue(value);

    }


    public setUIComponent(): SettingBox<number> {
        return new NumberSettingBox(this);

    }



}