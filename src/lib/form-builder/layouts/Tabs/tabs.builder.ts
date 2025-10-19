import type { TabsLayout, TabItem } from './tabs.types';
import type { Field } from '../../core/types';
import type { ReactNode } from 'react';

interface FieldBuilder {
    build(): Field;
}

interface TabConfig {
    label: string;
    icon?: ReactNode;
    fields: (Field | FieldBuilder)[];
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
     * Add a tab with fields
     * @param label - The tab label text
     * @param fields - Fields to show in this tab
     * @param icon - Optional icon/badge/image to show next to label
     * 
     * @example
     * Tabs()
     *   .tab('Basic Info', [Input('name'), Input('email')])
     *   .tab('Advanced', [Input('apiKey')], <Badge>Pro</Badge>)
     */
    tab(label: string, fields: (Field | FieldBuilder)[], icon?: ReactNode) {
        const builtFields = fields.map(field =>
            'build' in field ? field.build() : field
        );

        this.config.tabs.push({
            label,
            icon,
            fields: builtFields
        });

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
 * // Simple tabs
 * Tabs()
 *   .tab('Profile', [Input('name'), Input('email')])
 *   .tab('Settings', [Input('theme')])
 * 
 * @example
 * // With icons/badges
 * Tabs()
 *   .tab('Basic', [Input('title')], <Icon name="user" />)
 *   .tab('Advanced', [Input('seo')], <Badge>Pro</Badge>)
 */
export const Tabs = () => {
    return new TabsBuilder();
};
