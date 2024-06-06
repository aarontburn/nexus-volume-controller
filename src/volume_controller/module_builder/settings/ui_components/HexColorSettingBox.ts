import { ChangeEvent, InputElement } from "../../SettingBox";
import { StringSettingBox } from "./StringSettingBox";

export class HexColorSettingBox extends StringSettingBox {


    public createLeft(): string {
        return `
            <div class="left-component">
                <input id='${this.getSetting().getId() + "_color-picker"}' style='width: 115px; height: 48px' type="color" value="${super.getSetting().getValue()}" />
            </div>
        `;
    }

    public getInputIdAndType(): InputElement[] {
        return [
            { id: this.getSetting().getId(), inputType: 'text', attribute: 'value' },
            { id: this.getSetting().getId() + "_color-picker", inputType: 'input', attribute: 'value' }
        ];
    }
    public onChange(newValue: any): ChangeEvent[] {
        return [
            { id: this.getSetting().getId(), attribute: 'value', value: newValue },
            { id: this.getSetting().getId() + "_color-picker", attribute: 'value', value: newValue }
        ];
    }

}
