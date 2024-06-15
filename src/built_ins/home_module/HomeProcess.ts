import * as path from "path";
import { IPCCallback } from "../../volume_controller/module_builder/IPCObjects";
import { Process } from "../../volume_controller/module_builder/Process";
import { Setting } from "../../volume_controller/module_builder/Setting";
import { NumberSetting } from "../../volume_controller/module_builder/settings/types/NumberSetting";
import { StringSetting } from "../../volume_controller/module_builder/settings/types/StringSetting";



export class HomeProcess extends Process {
	public static MODULE_NAME: string = "Home";

	private static HTML_PATH: string = path.join(__dirname, "./HomeHTML.html").replace("dist", 'src');


	private static LOCALE: string = "en-US";
	private static STANDARD_TIME_FORMAT: Intl.DateTimeFormatOptions =
		{ hour: "numeric", minute: "numeric", second: "numeric", hour12: true, };

	private static MILITARY_TIME_FORMAT: Intl.DateTimeFormatOptions =
		{ hour: "numeric", minute: "numeric", second: "numeric", hour12: false, };

	private static FULL_DATE_FORMAT: Intl.DateTimeFormatOptions =
		{ weekday: "long", month: "long", day: "numeric", year: "numeric", };

	private static ABBREVIATED_DATE_FORMAT: Intl.DateTimeFormatOptions =
		{ month: "numeric", day: "numeric", year: "numeric", };

	private clockTimeout: NodeJS.Timeout;

	public constructor(ipcCallback: IPCCallback) {
		super(
			HomeProcess.MODULE_NAME,
			HomeProcess.HTML_PATH,
			ipcCallback);

		this.setModuleInfo({
			moduleName: "Home",
			author: "aarontburn",
			version: "1.0.0",
			description: "A home screen that displays time and date.",
			buildVersion: 1,
			platforms: [],
			link: 'https://github.com/aarontburn/modules'
		});
	}

	public initialize(): void {
		super.initialize();

		// Start clock
		this.updateDateAndTime(false);

		this.clockTimeout = setTimeout(() => this.updateDateAndTime(true), 1000 - new Date().getMilliseconds());
	}

	public stop(): void {
		super.stop();
		clearTimeout(this.clockTimeout);
	}

	private createSpan(text: string) {
		return `<span style='color: var(--accent-color)'>${text}</span>`;
	}

	public updateDateAndTime(repeat: boolean): void {
		const date: Date = new Date();
		const standardTime: string = date.toLocaleString(HomeProcess.LOCALE, HomeProcess.STANDARD_TIME_FORMAT);
		const militaryTime: string = date.toLocaleString(HomeProcess.LOCALE, HomeProcess.MILITARY_TIME_FORMAT);
		const fullDate: string = date.toLocaleString(HomeProcess.LOCALE, HomeProcess.FULL_DATE_FORMAT);
		const abbreviatedDate: string = date.toLocaleString(HomeProcess.LOCALE, HomeProcess.ABBREVIATED_DATE_FORMAT);

		const formattedStandardTime: string = standardTime.replace(/:/g, this.createSpan(":"));
		const formattedAbbreviatedDate: string = abbreviatedDate.replace(/\//g, this.createSpan('.'));
		const formattedFullDate: string = fullDate.replace(/,/g, this.createSpan(','));
		const formattedMilitaryTime: string = militaryTime.replace(/:/g, this.createSpan(":"))

		this.sendToRenderer("update-clock", formattedFullDate, formattedAbbreviatedDate, formattedStandardTime, formattedMilitaryTime);

		if (repeat) {
			this.clockTimeout = setTimeout(() => this.updateDateAndTime(true), 1000);
		}
	}

	public registerSettings(): Setting<unknown>[] {
		return [
			new NumberSetting(this)
				.setMin(0)
				.setName("Full Date Font Size (1)")
				.setDescription(
					"Adjusts the font size of the full date display (e.g. Sunday, January 1st, 2023)."
				)
				.setAccessID("full_date_fs")
				.setDefault(40.0),

			new NumberSetting(this)
				.setMin(0)
				.setName("Abbreviated Date Font Size (2)")
				.setDescription(
					"Adjusts the font size of the abbreviated date display (e.g. 1/01/2023)."
				)
				.setAccessID("abbr_date_fs")
				.setDefault(30.0),

			new NumberSetting(this)
				.setMin(0)
				.setName("Standard Time Font Size (3)")
				.setDescription(
					"Adjusts the font size of the standard time display (e.g. 11:59:59 PM)."
				)
				.setAccessID('standard_time_fs')
				.setDefault(90.0),

			new NumberSetting(this)
				.setMin(0)
				.setName("Military Time Font Size (4)")
				.setDescription(
					"Adjusts the font size of the military time display (e.g. 23:59:49)."
				)
				.setAccessID('military_time_fs')
				.setDefault(30.0),

			new StringSetting(this)
				.setName("Display Order")
				.setDescription("Adjusts the order of the time/date displays.")
				.setDefault("12 34")
				.setAccessID("display_order")
				.setValidator((o) => {
					const s: string = o.toString();
					return s === "" || s.match("^(?!.*(\\d).*\\1)[1-4\\s]+$") ? s : null;
				})

		];
	}


	public refreshSettings(): void {
		const sizes: object = {
			fullDate: this.getSettings().getSetting('full_date_fs').getValue(),
			abbrDate: this.getSettings().getSetting('abbr_date_fs').getValue(),
			standardTime: this.getSettings().getSetting('standard_time_fs').getValue(),
			militaryTime: this.getSettings().getSetting('military_time_fs').getValue()
		}


		const order: string = this.getSettings().getSetting("display_order").getValue() as string


		this.sendToRenderer('font-sizes', sizes);
		this.sendToRenderer('display-order', order);

	}

	public handleEvent(eventType: string, data: any[]): void {
		switch (eventType) {
			case "init": {
				this.initialize();
				break;
			}

		}
	}
}
