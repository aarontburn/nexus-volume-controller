import { StringSettingBox } from "./StringSettingBox";

export class HexColorSettingBox extends StringSettingBox {



    public createLeft(): string {
        return `
            <div class="left-component">
                <div style="width: 115px; height: 48px; background-color: ${super.getSetting().getValue()}; 
                    border: 1px solid var(--off-white); border-radius: 5px">
                </div>
            </div>
        
        `;
    }
    
}