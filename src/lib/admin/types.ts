export interface PageInfo {
    id: string;
    name: string;
    path: string;
}

export interface ComponentData {
    id: string;
    schemaName: string;
    data: Record<string, { type: any; value: any }>;
}

export interface PageData {
    components: ComponentData[];
}

export interface GlobalVariable {
    id: string;
    name: string;
    data: any;
}

export interface GlobalData {
    variables: GlobalVariable[];
}
