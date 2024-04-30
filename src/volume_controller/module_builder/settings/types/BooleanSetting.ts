import { Setting } from "../../Setting";
import { Process } from "../../Process";
import { SettingBox } from "../../SettingBox";
import { BooleanSettingBox } from "../ui_components/BooleanSettingBox";

export class BooleanSetting extends Setting<boolean> {

    public constructor(theModule: Process) {
        super(theModule);
    }


    public validateInput(theInput: any): boolean | null {
        if (theInput == null) {
            return null;
        }

        if (typeof theInput == "boolean") {
            return theInput;
        }

        const s: string = theInput.toString().toLocaleLowerCase();

        if (s == "true") {
            return true;
        } else if (s == "false") {
            return false;
        }
        return null;

    }

    public setUIComponent(): SettingBox<boolean> {
        return new BooleanSettingBox(this);
    }

}