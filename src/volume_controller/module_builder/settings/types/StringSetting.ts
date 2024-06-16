import { Setting } from "../../Setting";
import { Process } from "../../Process";
import { SettingBox } from "../../SettingBox";
import { StringSettingBox } from "../ui_components/StringSettingBox";

/**
 *  Setting to hold string input.
 * 
 *  @author aarontburn 
 */
export class StringSetting extends Setting<string> {

    public constructor(theModule: Process) {
        super(theModule);
    }


    public _validateInput(theInput: any): string | null {
        const s: string = theInput.toString();
        return s == "" ? null : s;

    }

    public setUIComponent(): SettingBox<string> {
        return new StringSettingBox(this);
    }


}
