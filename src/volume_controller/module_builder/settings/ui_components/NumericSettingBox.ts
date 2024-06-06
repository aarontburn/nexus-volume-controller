import { ChangeEvent, InputElement, SettingBox } from "../../SettingBox";

export class NumericSettingBox extends SettingBox<number> {

    public createLeft(): string {
        return `
            <div class="left-component">
                <input type="number" style="width: 110px; text-align: center;"
                    id="${this.getSetting().getId()}" value='${this.getSetting().getValue()}'>
            </div>
        `
    }

    public getInputIdAndType(): InputElement[] {
        return [{ id: this.getSetting().getId(), inputType: 'number', attribute: 'value' }];
    }

    public onChange(newValue: any): ChangeEvent[] {
        return [{ id: this.getSetting().getId(), attribute: 'value', value: newValue }];
    }





}