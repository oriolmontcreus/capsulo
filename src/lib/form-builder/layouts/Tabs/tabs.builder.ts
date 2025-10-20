import type { TabsLayout, TabItem } from './tabs.types';
import type { Field } from '../../core/types';
import type { ReactNode } from 'react';

interface FieldBuilder {
    build(): Field;
}

export class TabItemBuilder {
    private config: TabItem;

    constructor(label: string, fields: (Field | FieldBuilder)[]) {
        const builtFields = fields.map(field =>
            'build' in field ? field.build() : field
        );

        this.config = {
            label,
            fields: builtFields
        };
    }

    /**
     * Add a prefix element (icon, badge, etc.) before the label
     * @param value - React element to show before the label
     * @example
     * Tab('Settings', [...]).prefix(<Icon name="gear" />)
     */
    prefix(value: ReactNode): this {
        this.config.prefix = value;
        return this;
    }

    /**
     * Add a suffix element (badge, count, etc.) after the label
     * @param value - React element to show after the label
     * @example
     * Tab('Pro Features', [...]).suffix(<Badge>New</Badge>)
     */
    suffix(value: ReactNode): this {
        this.config.suffix = value;
        return this;
    }

    build(): TabItem {
        return this.config;
    }
}

export class TabsBuilder {
    private config: TabsLayout;

    constructor() {
        this.config = {
            type: 'tabs',
            tabs: []
        };
    }

    /**
     * Add a tab with fields (simple API - no prefix/suffix)
     * @param label - The tab label text
     * @param fields - Fields to show in this tab
     * 
     * @example
     * Tabs()
     *   .tab('Basic Info', [Input('name'), Input('email')])
     *   .tab('Advanced', [Input('apiKey')])
     */
    tab(label: string, fields: (Field | FieldBuilder)[]): this {
        const builtFields = fields.map(field =>
            'build' in field ? field.build() : field
        );

        this.config.tabs.push({
            label,
            fields: builtFields
        });

        return this;
    }

    /**
     * Add a tab with builder API for prefix/suffix
     * @param tabBuilder - TabItemBuilder with optional prefix/suffix
     * 
     * @example
     * Tabs()
     *   .addTab(Tab('Settings', [...]).prefix(<Icon name="gear" />))
     *   .addTab(Tab('Pro', [...]).suffix(<Badge>New</Badge>))
     */
    addTab(tabBuilder: TabItemBuilder): this {
        this.config.tabs.push(tabBuilder.build());
        return this;
    }

    build(): TabsLayout {
        return this.config;
    }
}

/**
 * Creates a tabs layout to organize fields into separate tabs
 * 
 * @example
 * // Simple tabs (no prefix/suffix)
 * Tabs()
 *   .tab('Profile', [Input('name'), Input('email')])
 *   .tab('Settings', [Input('theme')])
 * 
 * @example
 * // With prefix/suffix using Tab builder
 * Tabs()
 *   .addTab(Tab('Basic', [...]).prefix(<Icon name="user" />))
 *   .addTab(Tab('Pro', [...]).suffix(<Badge>Premium</Badge>))
 */
export const Tabs = () => {
    return new TabsBuilder();
};

/**
 * Creates a tab item with optional prefix/suffix
 * 
 * @example
 * Tab('Settings', [...]).prefix(<Icon />).suffix(<Badge />)
 */
export const Tab = (label: string, fields: (Field | FieldBuilder)[]) => {
    return new TabItemBuilder(label, fields);
};
