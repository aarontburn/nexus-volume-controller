import { Setting } from "../../../module_builder/settings/Setting";
import { Module } from "../../../module_builder/Module";
import { SettingBox } from "../../../module_builder/settings/SettingBox";
import { BooleanSettingBox } from "../ui_components/BooleanSettingBox";

export class BooleanSetting extends Setting<boolean> {

    public constructor(theModule: Module) {
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