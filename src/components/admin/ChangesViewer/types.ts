export interface ChangeItem {
    id: string;
    name: string;
}

export interface UndoFieldInfo {
    componentId: string;
    fieldName: string;
    locale?: string;
    oldValue: any;
}
