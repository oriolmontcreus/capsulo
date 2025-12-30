export interface ChangeItem {
    id: string;
    name: string;
}

export interface UndoFieldInfo {
    componentId: string;
    fieldName: string;
    locale?: string;
    oldValue: any;
    fieldType?: string;
}

export interface RecoverFieldInfo {
    componentId: string;
    fieldName: string;
    locale?: string;
    valueToRecover: any;
    fieldType?: string;
    pageName: string; // Used to determine which page/globals to update
}
