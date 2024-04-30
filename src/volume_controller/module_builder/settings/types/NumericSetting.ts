import { Setting } from "../../Setting";
import { Process } from "../../Process";
import { SettingBox } from "../../SettingBox";
import { NumericSettingBox } from "../ui_components/NumericSettingBox";



export class NumericSetting extends Setting<number> {


    public constructor(theModule: Process) {
        super(theModule);
    }


    public validateInput(theInput: any): number | null {
        if (typeof theInput === 'number') {
            return theInput as number;
        }

        try {
            const parsedValue = parseFloat(String(theInput));
            if (!isNaN(parsedValue)) {
                return Number(parsedValue.toFixed(1));
            }
        } catch (ignored) {
        }
        return null;
    }

    public setUIComponent(): SettingBox<number> {
        return new NumericSettingBox(this);
    }



}