import { Setting } from "./Setting";

export abstract class SettingBox<T> {

    public setting: Setting<T>;

    public constructor(theSetting: Setting<T>) {
        this.setting = theSetting;
    }

    public getUI(): string {
        const html: string = `
            <div class="setting">
                ${this.createLeft()}
                <div class="spacer"></div>
                ${this.createRight()}
            </div>
        `;
        return html;
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
                <h1>${this.setting.getSettingName()}</h1>
                <p>${this.setting.getDescription()}</p>
            </div>
        `;

    }

    public getSetting(): Setting<T> {
        return this.setting;
    }

    public getInteractiveIds(): string[] {
        return [this.setting.getId()];
    }

    /**
     * Overridable method to determine when the setting updates.
     * This is triggered by element.addEventListener(<eventType> () => ...)
     * 
     * @returns The event to update the setting.
     */
    public getEventType(): string {
        return "blur";
    }

    /**
     * Overrideable method to add custom CSS to a setting component.
     * 
     * @returns A valid CSS style string.
     */
    public getStyle(): string {
        return "";
    }

    /**
     * Overrideable method to determine what value of the HTML holds the value.
     * For example, the data stored in <input type="text"> is stored in the "value"
     * property, while a checkbox is stored in "checked".
     * 
     * @returns 
     */
    public getAttribute(): string {
        return "value";
    }


}