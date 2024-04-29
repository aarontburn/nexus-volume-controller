import { SettingBox } from "../../../module_builder/settings/SettingBox";
import { Setting } from "../../../module_builder/settings/Setting";
import { Module } from "../../../module_builder/Module";
import { HexColorSettingBox } from "../ui_components/HexColorSettingBox";


export class HexColorSetting extends Setting<string> {

    public constructor(theModule: Module) {
        super(theModule);
    }


    public validateInput(theInput: any): string | null {
        if (theInput == null) {
            return null;
        }

        const s: string = theInput.toString();
        return s.match("^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$") ? s : null;

    }
    public setUIComponent(): SettingBox<string> {
        return new HexColorSettingBox(this);
    }


}