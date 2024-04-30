import { Process } from "./Process";
import { SettingBox } from "./SettingBox";

export abstract class Setting<T> {

    public parentModule: Process;
    public settingName: string;
    public settingDescription: string;
    public settingId: string = this.generateRandomId()

    public inputValidator: (theInput: any) => T;

    public defaultValue: T;
    public currentValue: T;

    public settingBox: SettingBox<T>;


    /**
     * Creates a new setting with the module that this setting belongs to.
     * <p>
     * Use the following methods to set the state of the setting:
     * <ul>
     *     <li>{@link setName(string)} Sets the name of the setting (REQUIRED).</li>
     *     <li>{@link setDefault(T)}} Sets the default value of the setting (REQUIRED).</li>
     *     <li>{@link setDescription(string)} Sets the description of the setting.</li>
     *     <li>{@link setBoundNodeId(string)} Sets bound node ID.</li>
     * </ul>
     *
     * @param theParentModule The module that this setting belongs to.
     */
    public constructor(theParentModule: Process) {
        this.parentModule = theParentModule;

        this.settingBox = this.setUIComponent();


    }


    /**
     * Checks if the required fields are set before data can be accessed or set.
     * <p>
     * The required fields are {@link settingName} and {@link defaultValue}.
     *
     * @throws Error if the required fields were NOT set.
     */
    public checkRequiredFields(): void {
        if (this.settingName == undefined || this.defaultValue == undefined) {
            throw new Error(
                "Attempted to access '" + this.settingName + "' before all values were set. Missing:"
                + (this.settingName == null ? "NAME" : "")
                + (this.defaultValue == null ? "DEFAULT" : ""));
        }
    }


    /**
     * Sets the name of this setting. This is a required field.
     *
     * @param theName The name of the setting.
     * @return This setting.
     * @throws Error if the name of the setting is already set.
     */
    public setName(theName: string): Setting<T> {
        if (this.settingName != undefined) {
            throw new Error("Cannot reassign setting name for " + this.settingName);
        }
        this.settingName = theName;
        return this;
    }

    /**
     * Sets the default value of this setting. This is a required field.
     *
     * @param theDefaultValue The default value of the setting.
     * @return This setting.
     * @throws UnsupportedOperationException if the default value of the setting is already set.
     */
    public setDefault(theDefaultValue: T): Setting<T> {
        if (this.defaultValue != undefined) {
            throw new Error("Cannot reassign default value for " + this.settingName);
        }
        this.defaultValue = theDefaultValue;
        this.currentValue = theDefaultValue;
        return this;
    }


    /**
     * Sets the description of this setting. This is NOT a required field.
     *
     * @param theDescription The description of this setting.
     * @return This setting.
     * @throws Error if the description of the setting is already set.
     */
    public setDescription(theDescription: string): Setting<T> {
        if (this.settingDescription != undefined) {
            throw new Error("Cannot reassign description for " + this.settingName);
        }
        this.settingDescription = theDescription;
        return this;
    }



    /**
     * Returns the name of this setting.
     *
     * @return The name of this setting.
     */
    public getSettingName(): string {
        return this.settingName;
    }


    /**
     * Returns the description of this setting.
     *
     * @return The description of this setting, or undefined if it hasn't been set.
     */
    public getDescription(): string {
        return this.settingDescription == undefined ? "" : this.settingDescription;
    }



    /**
     * Returns the value of this setting.
     *
     * @return The value of this setting, or null if
     * @throws Error if an attempt was made to access the value of this setting before all
     *                               appropriate fields were set.
     */
    public getValue(): T {
        this.checkRequiredFields();
        return this.currentValue;
    }


    /**
     * Changes the value of this setting.
     * <p>
     * It passes the value into {@link #parseInput(Object)}, which returns either
     * a value of type that matches this settings type, or null indicating that it could
     * not properly parse the input.
     * <p>
     * If the input is null, the current value will remain the same. Otherwise, it will update
     * its value to the new one.
     * <p>
     * Once the GUI is initialized (via a call to {@link GUIHandler#isGuiInitialized()}), it will:
     * <ul>
     *     <li>Refresh the GUI counterpart with the updated value</li>
     *     <li>Call for a refresh in the parent module</li>
     *     <li>Re-write the settings for this module</li>
     * </ul>
     *
     * @param theValue The new value, not null.
     * @throws Error if an attempt was made to set the value before all
     *                               appropriate fields were set.
     */
    public setValue(theValue: any): void {
        this.checkRequiredFields();

        const value: T = this.parseInput(theValue);
        this.currentValue = value != null ? value : this.currentValue;


        

    }


    /**
     * Converts an Object input into a {@link T} type input.
     * <p>
     * If an {@link inputValidator} is specified, it will use it to parse the input.
     * <p>
     * Otherwise, it will use {@link validateInput(any)} to parse the input.
     *
     * @param theInput The input to parse.
     * @return A {@link T} type valid input, or null if the input couldn't be parsed.
     */
    public parseInput(theInput: any): T {
        if (this.inputValidator != undefined) {
            return this.inputValidator(theInput);
        }

        return this.validateInput(theInput);
    }


    /**
     * Child-overridden method to parse inputs IF a {@link inputValidator} is
     * not specified.
     * <p>
     * If the input is valid, it should return a {@link T} as the input.
     * <p>
     * Otherwise, it should send null. If null is not sent, it will attempt to assign potentially
     * invalid inputs to this setting.
     *
     * @param theInput The input to parse.
     * @return A {@link T} valid input, or null if the input could not be parsed.
     */
    public abstract validateInput(theInput: any): T | null;


    /**
     * Resets the setting to default.
     */
    public resetToDefault(): void {
        this.setValue(this.defaultValue);
    }

    /**
     * Sets the input validator for this setting.
     * <p>
     * {@link parseInput(Object)} will use the specified input validator instead of
     * the {@link validateInput(Object)} to parse input.
     *
     * @param theInputValidator The input validator to use over {@link parseInput(Object)}.
     * @return This setting.
     */
    public setValidator(theInputValidator: (theInput: any) => T): Setting<T> {
        if (this.inputValidator != undefined) {
            throw new Error("Cannot redefine input validator for " + this.settingName);
        }
        this.inputValidator = theInputValidator;
        return this;
    }


    public abstract setUIComponent(): SettingBox<T>;

    public getUIComponent(): SettingBox<T> {
        return this.settingBox;
    }

    public generateRandomId(): string {
        return "settingid_" + Math.random().toString(36).replace('0.', '');
    }

    public getId(): string {
        return this.settingId;
    }

    public getParentModule(): Process {
        return this.parentModule;
    }


}


export interface InputValidator<T> {
    parseInput(theInput: any): T;
}