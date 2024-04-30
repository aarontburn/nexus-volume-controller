import { SettingBox } from "../../SettingBox";

export class StringSettingBox extends SettingBox<string> {

    public createLeft(): string {
        return `
            <div class="left-component" style="display: flex;"></div>
        `;
    }

    public createRight(): string {
        return `
            <div class="right-component">
                <div style="display: flex;">
                    <h1>${this.getSetting().getSettingName()}</h1>
                    <p style="align-self: flex-end; padding-left: 24px;">${this.getSetting().getDescription()}</p>
                </div>

                <input type="text" style="width: 100%;" 
                    value="${this.getSetting().getValue()}" id="${this.getSetting().getId()}">
            </div>
        `;
    }

    public getInteractiveIds(): string[] {
        return [this.getSetting().getId()];
    }



}