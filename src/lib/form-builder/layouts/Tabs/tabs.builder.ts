import type { TabsLayout, TabItem, TabsVariant } from './tabs.types';
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

    prefix(value: ReactNode): this {
        this.config.prefix = value;
        return this;
    }

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
            tabs: [],
            variant: 'default'
        };
    }

    /**
     * Set the variant style for the tabs
     * @param variant - The variant to use ('default' or 'vertical')
     * 
     * @example
     * Tabs()
     *   .variant('vertical')
     *   .tab('Overview', [...])
     */
    variant(variant: TabsVariant): this {
        this.config.variant = variant;
        return this;
    }

    /**
     * Set custom className for the tabs container
     * @param className - Custom classes to apply
     * 
     * @example
     * Tabs()
     *   .className('w-full')
     *   .tab('Profile', [...])
     * 
     * @example
     * Tabs()
     *   .className('w-full max-w-2xl mx-auto')
     *   .tab('Settings', [...])
     */
    className(className: string): this {
        this.config.className = className;
        return this;
    }

    /**
     * Add a tab with fields (supports optional prefix/suffix)
     * @param label - The tab label text
     * @param fields - Fields to show in this tab
     * @param options - Optional prefix and suffix
     * 
     * @example
     * Tabs()
     *   .tab('Basic Info', [Input('name'), Input('email')])
     *   .tab('Advanced', [Input('apiKey')])
     * 
     * @example
     * // With prefix/suffix
     * Tabs()
     *   .tab('Settings', [...], { prefix: <Icon /> })
     *   .tab('Pro', [...], { prefix: <Icon />, suffix: <Badge>New</Badge> })
     */
    tab(
        label: string,
        fields: (Field | FieldBuilder)[],
        options?: { prefix?: ReactNode; suffix?: ReactNode }
    ): this {
        const builtFields = fields.map(field =>
            'build' in field ? field.build() : field
        );

        this.config.tabs.push({
            label,
            fields: builtFields,
            ...(options?.prefix && { prefix: options.prefix }),
            ...(options?.suffix && { suffix: options.suffix })
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
