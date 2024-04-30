import { SettingBox } from "../../SettingBox";

export class NumericSettingBox extends SettingBox<number> {

    public createLeft(): string {
        return `
            <div class="left-component">
                <input type="number" style="width: 110px; text-align: center;"
                    id="${this.getSetting().getId()}" value='${this.getSetting().getValue()}'>
            </div>
        `
    }

    public getInteractiveIds(): string[] {
        return [this.getSetting().getId()];
    }





}