import { Setting } from "./Setting";



export class InputElement {
    id: string;
    inputType: string;
    attribute: string;
}

export interface ChangeEvent {
    id: string,
    attribute: string,
    value: any
}

export abstract class SettingBox<T> {

    protected static UNDO_ID: string = 'undo-button';

    public setting: Setting<T>;

    public constructor(theSetting: Setting<T>) {
        this.setting = theSetting;
    }

    public getUI(): string {
        return `
            <div class="setting">
                ${this.createLeft()}
                <div class="spacer"></div>
                ${this.createRight()}
            </div>
        `;
    }

    /**
     * Any class that overrides this should also override @link #getInteractiveIds() 
     */
    public createLeft(): string {
        return `
            <div class="left-component" style="display: inline-block;">
                <input id="${this.setting.getId()}" type="text" value='${this.setting.getValue()}'>
            </div>
        `;
    }

    public createRight(): string {
        return `
            <div class="right-component" style="display: inline-block;">
                <h1><span id='${SettingBox.UNDO_ID + "_" + this.setting.getId()}'>↩</span> ${this.setting.getSettingName()}</h1>
                <p>${this.setting.getDescription()}</p>
            </div>
        `;

    }

    public getSetting(): Setting<T> {
        return this.setting;
    }

    public getInputIdAndType(): InputElement[] {
        return [
            { id: this.setting.getId(), inputType: "text", attribute: 'value' }
        ];
    }

    public onChange(newValue: any): ChangeEvent[] {
        return [
            { id: this.setting.getId(), attribute: 'value', value: newValue }
        ]
    }

    /**
     * Overridable method to add custom CSS to a setting component.
     * 
     * @returns A valid CSS style string.
     */
    public getStyle(): string {
        return '';
    }








}